// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {ReflowV2Deployer} from "../src/recycle/ReflowV2Deployer.sol";
import {Core} from "../src/Core.sol";
import {BondingCurve} from "../src/BondingCurve.sol";
import {BondingCurveFactory} from "../src/BondingCurveFactory.sol";
import {LPRecyclingVault} from "../src/recycle/LPRecyclingVault.sol";
import {ActivityMonitor} from "../src/recycle/ActivityMonitor.sol";
import {RecyclingGovernor} from "../src/recycle/RecyclingGovernor.sol";
import {IActivityMonitor} from "../src/recycle/interfaces/IActivityMonitor.sol";
import {ILPRecyclingVault} from "../src/recycle/interfaces/ILPRecyclingVault.sol";
import {BondingCurveLibrary} from "../src/utils/BondingCurveLibrary.sol";
import {IWNative} from "../src/interfaces/IWNative.sol";

contract ReflowV2RecyclingTest is Test {
    ReflowV2Deployer internal deployer;
    Core internal core;
    BondingCurveFactory internal bcFactory;
    LPRecyclingVault internal lpVault;
    ActivityMonitor internal monitor;
    RecyclingGovernor internal governor;
    address internal wNative;

    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    address internal carol = makeAddr("carol");

    function setUp() public {
        vm.deal(alice, 500 ether);
        vm.deal(bob, 500 ether);
        vm.deal(carol, 100 ether);

        deployer = new ReflowV2Deployer();
        ReflowV2Deployer.Deployment memory d = deployer.deployAll(address(this));

        core = Core(payable(d.core));
        bcFactory = BondingCurveFactory(d.bondingCurveFactory);
        lpVault = LPRecyclingVault(d.lpVault);
        monitor = ActivityMonitor(d.activityMonitor);
        governor = RecyclingGovernor(payable(d.governor));
        wNative = d.wNative;

        // Short windows for tests
        monitor.setDefaultConfig(
            IActivityMonitor.ActivityConfig({inactivityPeriod: 1 days, minVolumeNative: 100 ether, minTxCount: 50})
        );
        governor.setVotingPeriod(1 days);
        governor.setMinVoteStake(0.01 ether);
    }

    function _graduate(address creator, string memory name, string memory symbol)
        internal
        returns (address curve, address token)
    {
        // Create curve with zero first buy
        vm.prank(creator);
        (curve, token,,,) = core.createCurve{value: 0}(creator, name, symbol, "ipfs://x", 0, 0);

        // Buy enough tokens to hit targetToken and lock
        // Need amountOut such that realTokenReserves == targetToken
        uint256 target = BondingCurve(curve).getTargetToken();
        (, uint256 realToken) = BondingCurve(curve).getReserves();
        uint256 tokensToBuy = realToken - target;

        (uint256 vNative, uint256 vToken) = BondingCurve(curve).getVirtualReserves();
        uint256 k = BondingCurve(curve).getK();
        uint256 amountIn = BondingCurveLibrary.getAmountIn(tokensToBuy, k, vNative, vToken);
        uint256 fee = amountIn / 100;
        if (fee == 0) fee = 1;
        uint256 amountInMax = amountIn + fee + 1 ether;

        vm.prank(creator);
        core.exactOutBuy{value: amountInMax}(amountInMax, tokensToBuy, token, creator, block.timestamp + 1 hours);

        assertTrue(BondingCurve(curve).getLock());

        // Listing locks LP into vault
        BondingCurve(curve).listing();
        assertTrue(BondingCurve(curve).getIsListing());
        assertTrue(lpVault.isLocked(token));
    }

    function testLaunchListDetectVoteRecycle() public {
        (address deadCurve, address deadToken) = _graduate(alice, "Dead", "DEAD");
        (address liveCurve, address liveToken) = _graduate(bob, "Live", "LIVE");
        deadCurve;
        liveCurve;

        // Force inactive on dead with high thresholds + time
        monitor.configure(
            deadToken,
            IActivityMonitor.ActivityConfig({inactivityPeriod: 1 days, minVolumeNative: 100 ether, minTxCount: 50})
        );

        skip(1 days + 1);
        lpVault.markInactive(deadToken);
        assertTrue(monitor.isRecyclingEligible(deadToken));

        address[] memory candidates = new address[](1);
        candidates[0] = liveToken;
        uint256 proposalId = governor.propose(deadToken, candidates);

        vm.prank(carol);
        governor.vote{value: 1 ether}(proposalId, liveToken);

        skip(1 days + 1);

        uint256 winnerLpBefore = lpVault.getPosition(liveToken).liquidity;
        governor.execute(proposalId);
        uint256 winnerLpAfter = lpVault.getPosition(liveToken).liquidity;

        assertGt(winnerLpAfter, winnerLpBefore);
        assertEq(uint8(lpVault.getPosition(deadToken).status), uint8(ILPRecyclingVault.PositionStatus.Recycled));
        assertEq(lpVault.getPosition(deadToken).liquidity, 0);
    }
}
