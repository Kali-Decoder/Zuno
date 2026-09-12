// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.20;

import {WNative} from "../WNative.sol";
import {FeeVault} from "../FeeVault.sol";
import {Core} from "../Core.sol";
import {BondingCurveFactory} from "../BondingCurveFactory.sol";
import {DexRouter} from "../DexRouter.sol";
import {UniswapV2Factory} from "../uniswap/UniswapV2Factory.sol";
import {IBondingCurveFactory} from "../interfaces/IBondingCurveFactory.sol";
import {ActivityMonitor} from "./ActivityMonitor.sol";
import {LPRecyclingVault} from "./LPRecyclingVault.sol";
import {RecyclingGovernor} from "./RecyclingGovernor.sol";
import {Lock} from "../Lock.sol";

/// @notice One-shot deployer for the V2 launchpad + LP recycling stack.
contract ReflowV2Deployer {
    struct Deployment {
        address wNative;
        address feeVault;
        address dexFactory;
        address core;
        address bondingCurveFactory;
        address dexRouter;
        address lpVault;
        address activityMonitor;
        address governor;
        address lock;
    }

    Deployment public deployment;

    event Deployed(Deployment d);

    function deployAll(address admin) external returns (Deployment memory d) {
        WNative wNative = new WNative();

        address[] memory owners = new address[](1);
        owners[0] = admin;
        FeeVault feeVault = new FeeVault(address(wNative), owners, 1);

        UniswapV2Factory dexFactory = new UniswapV2Factory(admin);

        // Core needs factory later via initialize; BondingCurveFactory needs core address at construct
        // Deploy Core with placeholder factory wiring after factory exists.
        Core core = new Core(address(wNative), address(feeVault));
        BondingCurveFactory bcFactory = new BondingCurveFactory(address(this), address(core), address(wNative));
        core.initialize(address(bcFactory));

        // fee: 1% => denominator=1, numerator=100 (fee >= amount * den / num)
        DexRouter dexRouter = new DexRouter(address(dexFactory), address(wNative), address(feeVault), 1, 100);

        Lock lockContract = new Lock(address(bcFactory), 14 days);
        core.setLock(address(lockContract));

        LPRecyclingVault lpVault = new LPRecyclingVault(address(wNative));
        ActivityMonitor monitor = new ActivityMonitor();
        RecyclingGovernor governor = new RecyclingGovernor();

        // Factory config — 60% sold on curve, 40% reserved for Uniswap V2 LP
        bcFactory.initialize(
            IBondingCurveFactory.InitializeParams({
                deployFee: 0,
                listingFee: 0, // keep 0 in local tests; set >0 in production deploy
                tokenTotalSupply: 1e27,
                virtualNative: 60 ether,
                virtualToken: 1_800_000_000 ether,
                // Sell 600M tokens (60%) before lock, 400M (40%) to DEX LP
                targetToken: 400_000_000 ether,
                feeNumerator: 100,
                feeDenominator: 1,
                dexFactory: address(dexFactory)
            })
        );
        bcFactory.setLpVault(address(lpVault));
        bcFactory.setOwner(admin);

        lpVault.setBondingCurveFactory(address(bcFactory));
        lpVault.setGovernor(address(governor));
        lpVault.setActivityMonitor(address(monitor));

        monitor.setVault(address(lpVault));
        monitor.setGovernor(address(governor));
        monitor.setDexRouter(address(dexRouter));

        governor.setActivityMonitor(address(monitor));
        governor.setVault(address(lpVault));

        dexRouter.setActivityMonitor(address(monitor));

        // Transfer ownership to admin
        lockContract.transferOwnership(admin);
        lpVault.transferOwnership(admin);
        monitor.transferOwnership(admin);
        governor.transferOwnership(admin);
        dexRouter.setOwner(admin);

        d = Deployment({
            wNative: address(wNative),
            feeVault: address(feeVault),
            dexFactory: address(dexFactory),
            core: address(core),
            bondingCurveFactory: address(bcFactory),
            dexRouter: address(dexRouter),
            lpVault: address(lpVault),
            activityMonitor: address(monitor),
            governor: address(governor),
            lock: address(lockContract)
        });
        deployment = d;
        emit Deployed(d);
    }
}
