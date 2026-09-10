/**
 * Step 11 — Wire recycle modules + DexRouter activity monitor
 *
 * Requires: steps 05–09 (bondingCurveFactory, dexRouter, lpVault, activityMonitor, governor)
 * npx hardhat run scripts/11-wire-recycle.ts --network monadTestnet
 */
import { connect, loadDeployment, requireAddress, saveDeployment, logAddresses } from "./lib/deployment.js";

async function main() {
  const { ethers, deployer, networkName } = await connect();
  console.log(`Step 11: Wire recycle stack`);
  console.log(`Network: ${networkName}`);
  console.log(`Deployer: ${deployer.address}`);

  const prev = loadDeployment(networkName);
  const bcFactory = requireAddress(prev, "bondingCurveFactory");
  const dexRouterAddr = requireAddress(prev, "dexRouter");
  const lpVaultAddr = requireAddress(prev, "lpVault");
  const monitorAddr = requireAddress(prev, "activityMonitor");
  const governorAddr = requireAddress(prev, "governor");

  const lpVault = await ethers.getContractAt("LPRecyclingVault", lpVaultAddr);
  const monitor = await ethers.getContractAt("ActivityMonitor", monitorAddr);
  const governor = await ethers.getContractAt("RecyclingGovernor", governorAddr);
  const dexRouter = await ethers.getContractAt("DexRouter", dexRouterAddr);

  const steps: Array<[string, () => Promise<unknown>]> = [
    ["lpVault.setBondingCurveFactory", () => lpVault.setBondingCurveFactory(bcFactory)],
    ["lpVault.setGovernor", () => lpVault.setGovernor(governorAddr)],
    ["lpVault.setActivityMonitor", () => lpVault.setActivityMonitor(monitorAddr)],
    ["monitor.setVault", () => monitor.setVault(lpVaultAddr)],
    ["monitor.setGovernor", () => monitor.setGovernor(governorAddr)],
    ["monitor.setDexRouter", () => monitor.setDexRouter(dexRouterAddr)],
    ["governor.setActivityMonitor", () => governor.setActivityMonitor(monitorAddr)],
    ["governor.setVault", () => governor.setVault(lpVaultAddr)],
    ["dexRouter.setActivityMonitor", () => dexRouter.setActivityMonitor(monitorAddr)],
  ];

  for (const [label, fn] of steps) {
    const tx = await fn();
    // ethers v6 ContractTransactionResponse
    if (tx && typeof (tx as { wait?: () => Promise<unknown> }).wait === "function") {
      await (tx as { wait: () => Promise<unknown> }).wait();
    }
    console.log(`  ✓ ${label}`);
  }

  const d = saveDeployment(networkName, {
    configuredAt: new Date().toISOString(),
  });
  console.log("\nWiring complete — launchpad is ready.");
  logAddresses(d);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
