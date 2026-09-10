// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.20;

interface IActivityMonitor {
    struct ActivityConfig {
        uint256 inactivityPeriod;
        uint256 minVolumeNative;
        uint256 minTxCount;
    }

    struct PoolActivity {
        uint256 lastSwapAt;
        uint256 windowStartedAt;
        uint256 volumeNativeInWindow;
        uint256 txCountInWindow;
        bool inactive;
        bool recyclingEligible;
    }

    function configure(address token, ActivityConfig calldata config) external;

    function recordSwap(address token, uint256 volumeNative) external;

    function evaluateInactivity(address token) external returns (bool becameInactive);

    function clearInactive(address token) external;

    function getActivity(address token) external view returns (PoolActivity memory);

    function isRecyclingEligible(address token) external view returns (bool);
}
