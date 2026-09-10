// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IActivityMonitor} from "./interfaces/IActivityMonitor.sol";

/// @notice Tracks post-listing DEX activity and marks dormant projects eligible for LP recycling.
contract ActivityMonitor is Ownable, ReentrancyGuard, IActivityMonitor {
    address public vault;
    address public governor;
    address public dexRouter;

    mapping(address => ActivityConfig) private _configs;
    mapping(address => PoolActivity) private _activity;

    ActivityConfig public defaultConfig;

    error Unauthorized();

    event ActivityRecorded(address indexed token, uint256 volumeNative, uint256 txCount);
    event MarkedInactive(address indexed token, uint256 at);
    event RecyclingEligible(address indexed token);
    event ConfigUpdated(address indexed token, ActivityConfig config);

    modifier onlyRecorder() {
        if (msg.sender != dexRouter && msg.sender != vault && msg.sender != owner()) revert Unauthorized();
        _;
    }

    modifier onlyAdminOrGov() {
        if (msg.sender != governor && msg.sender != vault && msg.sender != owner()) revert Unauthorized();
        _;
    }

    constructor() Ownable(msg.sender) {
        defaultConfig = ActivityConfig({inactivityPeriod: 7 days, minVolumeNative: 1 ether, minTxCount: 10});
    }

    function setVault(address v) external onlyOwner {
        vault = v;
    }

    function setGovernor(address g) external onlyOwner {
        governor = g;
    }

    function setDexRouter(address r) external onlyOwner {
        dexRouter = r;
    }

    function setDefaultConfig(ActivityConfig calldata config) external onlyOwner {
        defaultConfig = config;
    }

    function configure(address token, ActivityConfig calldata config) external onlyAdminOrGov {
        _configs[token] = config;
        PoolActivity storage a = _activity[token];
        if (a.windowStartedAt == 0) {
            a.windowStartedAt = block.timestamp;
            a.lastSwapAt = block.timestamp;
        }
        emit ConfigUpdated(token, config);
    }

    function recordSwap(address token, uint256 volumeNative) external onlyRecorder {
        PoolActivity storage a = _activity[token];
        ActivityConfig memory cfg = _configOf(token);

        if (a.windowStartedAt == 0) {
            a.windowStartedAt = block.timestamp;
        }

        if (block.timestamp >= a.windowStartedAt + cfg.inactivityPeriod && !_isBelowThreshold(a, cfg)) {
            a.windowStartedAt = block.timestamp;
            a.volumeNativeInWindow = 0;
            a.txCountInWindow = 0;
            a.inactive = false;
            a.recyclingEligible = false;
        }

        a.lastSwapAt = block.timestamp;
        a.volumeNativeInWindow += volumeNative;
        a.txCountInWindow += 1;

        emit ActivityRecorded(token, volumeNative, a.txCountInWindow);
    }

    function evaluateInactivity(address token) external nonReentrant returns (bool becameInactive) {
        PoolActivity storage a = _activity[token];
        ActivityConfig memory cfg = _configOf(token);

        if (a.inactive) return true;

        if (a.windowStartedAt == 0) {
            a.windowStartedAt = block.timestamp;
            a.lastSwapAt = block.timestamp;
            return false;
        }

        if (block.timestamp < a.windowStartedAt + cfg.inactivityPeriod) {
            return false;
        }

        if (!_isBelowThreshold(a, cfg)) {
            a.windowStartedAt = block.timestamp;
            a.volumeNativeInWindow = 0;
            a.txCountInWindow = 0;
            return false;
        }

        a.inactive = true;
        a.recyclingEligible = true;
        emit MarkedInactive(token, block.timestamp);
        emit RecyclingEligible(token);
        return true;
    }

    function clearInactive(address token) external onlyAdminOrGov {
        PoolActivity storage a = _activity[token];
        a.inactive = false;
        a.recyclingEligible = false;
        a.windowStartedAt = block.timestamp;
        a.volumeNativeInWindow = 0;
        a.txCountInWindow = 0;
        a.lastSwapAt = block.timestamp;
    }

    function getActivity(address token) external view returns (PoolActivity memory) {
        return _activity[token];
    }

    function isRecyclingEligible(address token) external view returns (bool) {
        return _activity[token].recyclingEligible;
    }

    function _configOf(address token) internal view returns (ActivityConfig memory) {
        ActivityConfig memory c = _configs[token];
        if (c.inactivityPeriod == 0) return defaultConfig;
        return c;
    }

    function _isBelowThreshold(PoolActivity storage a, ActivityConfig memory cfg) internal view returns (bool) {
        if (a.volumeNativeInWindow < cfg.minVolumeNative) return true;
        if (a.txCountInWindow < cfg.minTxCount) return true;
        return false;
    }
}
