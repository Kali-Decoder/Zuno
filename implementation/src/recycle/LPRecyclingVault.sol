// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ILPRecyclingVault} from "./interfaces/ILPRecyclingVault.sol";
import {IActivityMonitor} from "./interfaces/IActivityMonitor.sol";
import {IBondingCurveFactory} from "../interfaces/IBondingCurveFactory.sol";
import {IBondingCurve} from "../interfaces/IBondingCurve.sol";
import {IUniswapV2Pair} from "../uniswap/interfaces/IUniswapV2Pair.sol";
import {IUniswapV2ERC20} from "../uniswap/interfaces/IUniswapV2ERC20.sol";
import {UniswapV2Library} from "../uniswap/libraries/UniswapV2Library.sol";

/// @notice Holds graduated Uniswap V2 LP and recycles dead-project liquidity into active winners.
contract LPRecyclingVault is Ownable, ReentrancyGuard, ILPRecyclingVault {
    using SafeERC20 for IERC20;

    address public immutable wNative;
    address public bondingCurveFactory;
    address public governor;
    IActivityMonitor public activityMonitor;

    mapping(address => LockedLP) private _positions;
    address[] public allTokens;

    error Unauthorized();
    error AlreadyRegistered();
    error NotLocked();
    error NotInactive();
    error NotEligible();
    error InvalidWinner();
    error ZeroLiquidity();

    event LPRegistered(address indexed token, address indexed pair, uint256 liquidity, address creator);
    event LPInactive(address indexed token);
    event LPRecycled(
        address indexed deadToken,
        address indexed winnerToken,
        uint256 nativeAmount,
        uint256 newLiquidity
    );

    modifier onlyGovernor() {
        if (msg.sender != governor && msg.sender != owner()) revert Unauthorized();
        _;
    }

    constructor(address _wNative) Ownable(msg.sender) {
        wNative = _wNative;
    }

    function setBondingCurveFactory(address f) external onlyOwner {
        bondingCurveFactory = f;
    }

    function setGovernor(address g) external onlyOwner {
        governor = g;
    }

    function setActivityMonitor(address m) external onlyOwner {
        activityMonitor = IActivityMonitor(m);
    }

    /// @notice Called by BondingCurve.listing after minting LP to the curve then transferring here.
    function registerLock(address token, address pair, uint256 liquidity, address creator) external {
        if (bondingCurveFactory == address(0) || IBondingCurveFactory(bondingCurveFactory).getCurve(token) != msg.sender) {
            revert Unauthorized();
        }

        uint256 bal = IUniswapV2ERC20(pair).balanceOf(address(this));
        if (liquidity == 0 || bal < liquidity) revert ZeroLiquidity();

        if (_positions[token].status == PositionStatus.Locked) revert AlreadyRegistered();

        bool isNew = _positions[token].token == address(0);
        _positions[token] = LockedLP({
            token: token,
            pair: pair,
            creator: creator,
            liquidity: liquidity,
            lockedAt: block.timestamp,
            status: PositionStatus.Locked
        });
        if (isNew) allTokens.push(token);

        if (address(activityMonitor) != address(0)) {
            activityMonitor.configure(
                token,
                IActivityMonitor.ActivityConfig({inactivityPeriod: 7 days, minVolumeNative: 1 ether, minTxCount: 10})
            );
        }

        emit LPRegistered(token, pair, liquidity, creator);
    }

    /// @notice Permissionless: sync inactivity from ActivityMonitor onto the LP position.
    function markInactive(address token) external nonReentrant {
        LockedLP storage pos = _positions[token];
        if (pos.status != PositionStatus.Locked) revert NotLocked();

        bool became = activityMonitor.evaluateInactivity(token);
        if (!became && !activityMonitor.isRecyclingEligible(token)) revert NotEligible();

        pos.status = PositionStatus.Inactive;
        emit LPInactive(token);
    }

    /// @notice Governor-only: remove dead LP, redeploy recovered WNATIVE into winner pair, re-lock.
    function recycleToWinner(address deadToken, address winnerToken)
        external
        onlyGovernor
        nonReentrant
        returns (uint256 nativeRecycled, uint256 newLiquidity)
    {
        LockedLP storage dead = _positions[deadToken];
        if (dead.status != PositionStatus.Inactive) revert NotInactive();
        if (!activityMonitor.isRecyclingEligible(deadToken)) revert NotEligible();

        LockedLP storage winner = _positions[winnerToken];
        if (winner.status != PositionStatus.Locked) revert InvalidWinner();
        if (winnerToken == deadToken) revert InvalidWinner();

        // Confirm winner still listed
        address winnerCurve = IBondingCurveFactory(bondingCurveFactory).getCurve(winnerToken);
        if (winnerCurve == address(0) || !IBondingCurve(winnerCurve).getIsListing()) revert InvalidWinner();

        dead.status = PositionStatus.Recycling;
        uint256 lpAmount = dead.liquidity;
        dead.liquidity = 0;

        address deadPair = dead.pair;
        // Transfer LP into pair and burn to this vault
        require(IUniswapV2ERC20(deadPair).transfer(deadPair, lpAmount), "LP_TRANSFER");
        (uint256 amount0, uint256 amount1) = IUniswapV2Pair(deadPair).burn(address(this));

        address token0 = IUniswapV2Pair(deadPair).token0();
        uint256 nativeOut = token0 == wNative ? amount0 : amount1;
        uint256 deadTokenOut = token0 == wNative ? amount1 : amount0;

        // Burn / sink dead project tokens
        if (deadTokenOut > 0) {
            IERC20(deadToken).safeTransfer(address(0xdead), deadTokenOut);
        }

        nativeRecycled = nativeOut;
        if (nativeRecycled == 0) {
            dead.status = PositionStatus.Recycled;
            activityMonitor.clearInactive(deadToken);
            emit LPRecycled(deadToken, winnerToken, 0, 0);
            return (0, 0);
        }

        // Split: half swap for winner tokens, half keep as WNATIVE leg
        uint256 nativeForSwap = nativeRecycled / 2;
        uint256 nativeForLp = nativeRecycled - nativeForSwap;

        address winnerPair = winner.pair;
        uint256 tokensBought;
        if (nativeForSwap > 0) {
            tokensBought = _swapExactNativeForToken(winnerPair, winnerToken, nativeForSwap);
        }

        // Match LP amounts to current reserves
        (uint256 reserveNative, uint256 reserveToken) = _reserves(winnerPair, winnerToken);
        uint256 tokensNeeded =
            reserveNative == 0 ? tokensBought : (nativeForLp * reserveToken) / reserveNative;
        if (tokensNeeded > tokensBought) {
            tokensNeeded = tokensBought;
            if (reserveToken > 0) {
                nativeForLp = (tokensNeeded * reserveNative) / reserveToken;
            }
        }

        // Dust leftover native stays in vault as protocol reserve
        newLiquidity = _addLiquidity(winnerPair, winnerToken, nativeForLp, tokensNeeded);

        winner.liquidity += newLiquidity;
        winner.lockedAt = block.timestamp;

        dead.status = PositionStatus.Recycled;
        activityMonitor.clearInactive(deadToken);

        emit LPRecycled(deadToken, winnerToken, nativeForLp, newLiquidity);
    }

    function getPosition(address token) external view returns (LockedLP memory) {
        return _positions[token];
    }

    function isLocked(address token) external view returns (bool) {
        return _positions[token].status == PositionStatus.Locked;
    }

    function tokenCount() external view returns (uint256) {
        return allTokens.length;
    }

    function _reserves(address pair, address token) internal view returns (uint256 reserveNative, uint256 reserveToken) {
        (uint112 r0, uint112 r1,) = IUniswapV2Pair(pair).getReserves();
        address token0 = IUniswapV2Pair(pair).token0();
        if (token0 == wNative) {
            reserveNative = r0;
            reserveToken = r1;
        } else {
            reserveNative = r1;
            reserveToken = r0;
        }
        // silence unused when token != token1 edge (pair is always wNative/token)
        token;
    }

    function _swapExactNativeForToken(address pair, address token, uint256 nativeIn) internal returns (uint256 amountOut) {
        (uint256 reserveNative, uint256 reserveToken) = _reserves(pair, token);
        amountOut = UniswapV2Library.getAmountOut(nativeIn, reserveNative, reserveToken);

        IERC20(wNative).safeTransfer(pair, nativeIn);

        address token0 = IUniswapV2Pair(pair).token0();
        (uint256 amount0Out, uint256 amount1Out) =
            token0 == wNative ? (uint256(0), amountOut) : (amountOut, uint256(0));
        IUniswapV2Pair(pair).swap(amount0Out, amount1Out, address(this), new bytes(0));
    }

    function _addLiquidity(address pair, address token, uint256 nativeAmount, uint256 tokenAmount)
        internal
        returns (uint256 liquidity)
    {
        if (nativeAmount == 0 || tokenAmount == 0) return 0;
        IERC20(wNative).safeTransfer(pair, nativeAmount);
        IERC20(token).safeTransfer(pair, tokenAmount);
        liquidity = IUniswapV2Pair(pair).mint(address(this));
    }
}
