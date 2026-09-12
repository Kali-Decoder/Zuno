/**
 * Deploy the entire ZUNO Reflow stack to Arc Testnet contract-by-contract,
 * configure 60% sold / 40% LP parameters, wire the creator seed lock,
 * and copy the final deployment addresses to the UI.
 *
 * npx hardhat run scripts/deploy-reflow.ts --network arcTestnet
 */
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { connect, saveDeployment, logAddresses } from "./lib/deployment.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const { ethers, deployer, networkName } = await connect();

  console.log("=========================================");
  console.log(`Deploying ZUNO Reflow Stack to: ${networkName}`);
  console.log(`Deployer: ${deployer.address}`);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance: ${ethers.formatEther(balance)} USDC`);
  console.log("=========================================\n");

  // 1. WNative
  console.log("[1/12] Deploying WNative...");
  const WNative = await ethers.getContractFactory("WNative");
  const wNative = await WNative.deploy();
  await wNative.waitForDeployment();
  const wNativeAddr = await wNative.getAddress();
  console.log(`  WNative: ${wNativeAddr}`);

  // 2. FeeVault
  console.log("[2/12] Deploying FeeVault...");
  const FeeVault = await ethers.getContractFactory("FeeVault");
  const feeVault = await FeeVault.deploy(wNativeAddr, [deployer.address], 1);
  await feeVault.waitForDeployment();
  const feeVaultAddr = await feeVault.getAddress();
  console.log(`  FeeVault: ${feeVaultAddr}`);

  // 3. UniswapV2Factory
  console.log("[3/12] Deploying UniswapV2Factory...");
  const UniswapV2Factory = await ethers.getContractFactory("UniswapV2Factory");
  const dexFactory = await UniswapV2Factory.deploy(deployer.address);
  await dexFactory.waitForDeployment();
  const dexFactoryAddr = await dexFactory.getAddress();
  console.log(`  UniswapV2Factory: ${dexFactoryAddr}`);

  // 4. Core
  console.log("[4/12] Deploying Core...");
  const Core = await ethers.getContractFactory("Core");
  const core = await Core.deploy(wNativeAddr, feeVaultAddr);
  await core.waitForDeployment();
  const coreAddr = await core.getAddress();
  console.log(`  Core: ${coreAddr}`);

  // 5. BondingCurveFactory
  console.log("[5/12] Deploying BondingCurveFactory...");
  const BondingCurveFactory = await ethers.getContractFactory("BondingCurveFactory");
  const bcFactory = await BondingCurveFactory.deploy(deployer.address, coreAddr, wNativeAddr);
  await bcFactory.waitForDeployment();
  const bcFactoryAddr = await bcFactory.getAddress();
  console.log(`  BondingCurveFactory: ${bcFactoryAddr}`);

  // Initialize Core with BondingCurveFactory
  console.log("  Initializing Core with Factory...");
  const initCoreTx = await core.initialize(bcFactoryAddr);
  await initCoreTx.wait();
  console.log("  Core initialized ✓");

  // 6. DexRouter
  console.log("[6/12] Deploying DexRouter...");
  const DexRouter = await ethers.getContractFactory("DexRouter");
  const dexRouter = await DexRouter.deploy(dexFactoryAddr, wNativeAddr, feeVaultAddr, 1n, 100n);
  await dexRouter.waitForDeployment();
  const dexRouterAddr = await dexRouter.getAddress();
  console.log(`  DexRouter: ${dexRouterAddr}`);

  // 7. Lock (14-day timelock for creator seed tokens)
  console.log("[7/12] Deploying Lock...");
  const Lock = await ethers.getContractFactory("Lock");
  const lock = await Lock.deploy(bcFactoryAddr, 14n * 86400n);
  await lock.waitForDeployment();
  const lockAddr = await lock.getAddress();
  console.log(`  Lock: ${lockAddr}`);

  // Wire Lock into Core
  console.log("  Setting Lock on Core...");
  const setLockTx = await core.setLock(lockAddr);
  await setLockTx.wait();
  console.log("  Core lock set ✓");

  // 8. LPRecyclingVault
  console.log("[8/12] Deploying LPRecyclingVault...");
  const LPRecyclingVault = await ethers.getContractFactory("LPRecyclingVault");
  const lpVault = await LPRecyclingVault.deploy(wNativeAddr);
  await lpVault.waitForDeployment();
  const lpVaultAddr = await lpVault.getAddress();
  console.log(`  LPRecyclingVault: ${lpVaultAddr}`);

  // 9. ActivityMonitor
  console.log("[9/12] Deploying ActivityMonitor...");
  const ActivityMonitor = await ethers.getContractFactory("ActivityMonitor");
  const monitor = await ActivityMonitor.deploy();
  await monitor.waitForDeployment();
  const monitorAddr = await monitor.getAddress();
  console.log(`  ActivityMonitor: ${monitorAddr}`);

  // 10. RecyclingGovernor
  console.log("[10/12] Deploying RecyclingGovernor...");
  const RecyclingGovernor = await ethers.getContractFactory("RecyclingGovernor");
  const governor = await RecyclingGovernor.deploy();
  await governor.waitForDeployment();
  const governorAddr = await governor.getAddress();
  console.log(`  RecyclingGovernor: ${governorAddr}`);

  // 11. Configure Factory with 60% Sold / 40% LP
  console.log("[11/12] Configuring BondingCurveFactory (60% Sold / 40% LP)...");
  const params = {
    deployFee: 0n,
    listingFee: 0n,
    tokenTotalSupply: 10n ** 27n,
    virtualNative: 60n * 10n ** 18n,
    virtualToken: 1_800_000_000n * 10n ** 18n,
    targetToken: 400_000_000n * 10n ** 18n, // 40% reserved for Uniswap V2 LP
    feeNumerator: 100,
    feeDenominator: 1,
    dexFactory: dexFactoryAddr,
  };
  const initFactoryTx = await bcFactory.initialize(params);
  await initFactoryTx.wait();
  console.log("  Factory initialized with 60/40 parameters ✓");

  const setLpVaultTx = await bcFactory.setLpVault(lpVaultAddr);
  await setLpVaultTx.wait();
  console.log("  Factory LP vault linked ✓");

  // 12. Wire LP Recycling Stack
  console.log("[12/12] Wiring LP Recycling Stack...");
  const wireSteps: Array<[string, () => Promise<any>]> = [
    ["lpVault.setBondingCurveFactory", () => lpVault.setBondingCurveFactory(bcFactoryAddr)],
    ["lpVault.setGovernor", () => lpVault.setGovernor(governorAddr)],
    ["lpVault.setActivityMonitor", () => lpVault.setActivityMonitor(monitorAddr)],
    ["monitor.setVault", () => monitor.setVault(lpVaultAddr)],
    ["monitor.setGovernor", () => monitor.setGovernor(governorAddr)],
    ["monitor.setDexRouter", () => monitor.setDexRouter(dexRouterAddr)],
    ["governor.setActivityMonitor", () => governor.setActivityMonitor(monitorAddr)],
    ["governor.setVault", () => governor.setVault(lpVaultAddr)],
    ["dexRouter.setActivityMonitor", () => dexRouter.setActivityMonitor(monitorAddr)],
  ];
  for (const [name, fn] of wireSteps) {
    const tx = await fn();
    await tx.wait();
    console.log(`  ${name} ✓`);
  }
  console.log("  All recycling modules cross-wired ✓\n");

  // Save deployment file
  const saved = saveDeployment(networkName, {
    deployer: deployer.address,
    wNative: wNativeAddr,
    feeVault: feeVaultAddr,
    dexFactory: dexFactoryAddr,
    core: coreAddr,
    bondingCurveFactory: bcFactoryAddr,
    dexRouter: dexRouterAddr,
    lock: lockAddr,
    lpVault: lpVaultAddr,
    activityMonitor: monitorAddr,
    governor: governorAddr,
    configuredAt: new Date().toISOString(),
  });
  logAddresses(saved);

  // Copy to ui-frontend
  const uiDir = join(__dirname, "..", "..", "ui-frontend", "config", "deployments");
  mkdirSync(uiDir, { recursive: true });
  const src = join(__dirname, "..", "deployments", `${networkName}.json`);
  const dest = join(uiDir, `${networkName}.json`);
  copyFileSync(src, dest);
  console.log(`\nCopied deployment to ${dest} ✓`);
  console.log("Deployment completed successfully!");
}

main().catch((err) => {
  console.error("Deployment failed:", err);
  process.exitCode = 1;
});
