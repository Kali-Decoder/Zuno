// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.20;

interface ILPRecyclingVault {
    enum PositionStatus {
        None,
        Locked,
        Inactive,
        Recycling,
        Recycled
    }

    struct LockedLP {
        address token;
        address pair;
        address creator;
        uint256 liquidity;
        uint256 lockedAt;
        PositionStatus status;
    }

    function registerLock(address token, address pair, uint256 liquidity, address creator) external;

    function markInactive(address token) external;

    function recycleToWinner(address deadToken, address winnerToken)
        external
        returns (uint256 nativeRecycled, uint256 newLiquidity);

    function getPosition(address token) external view returns (LockedLP memory);

    function isLocked(address token) external view returns (bool);
}
