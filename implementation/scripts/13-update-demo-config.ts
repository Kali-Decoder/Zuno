/**
 * Update system configuration for demo mode:
 * 1. ActivityMonitor.setDefaultConfig -> 300s (5 minutes), minVolume: 1 USDC, minTx: 5
 * 2. Deploy updated LPRecyclingVault (uses activityMonitor.defaultConfig() instead of hardcoded 7 days)
 * 3. Rewire LPRecyclingVault with factory, governor, and monitor
 * 4. RecyclingGovernor.setVotingPeriod -> 300s (5 minutes)
 * 5. Update arcTestnet.json deployments in implementation & ui-frontend
 *
 * Usage:
 *   npx hardhat run scripts/13-update-demo-config.ts --network arcTestnet
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { connect, loadDeployment, requireAddress, saveDeployment } from "./lib/deployment.js";

async function main() {
  const { ethers, deployer, networkName } = await connect();
  console.log(`=== Updating Configuration for Demo Mode ===`);
  console.log(`Network: ${networkName}`);
  console.log(`Deployer: ${deployer.address}`);

  const prev = loadDeployment(networkName);
  const wNative = requireAddress(prev, "wNative");
  const bcFactoryAddr = requireAddress(prev, "bondingCurveFactory");
  const monitorAddr = requireAddress(prev, "activityMonitor");
  const governorAddr = requireAddress(prev, "governor");

  const monitor = await ethers.getContractAt("ActivityMonitor", monitorAddr);
  const governor = await ethers.getContractAt("RecyclingGovernor", governorAddr);
  const bcFactory = await ethers.getContractAt("BondingCurveFactory", bcFactoryAddr);

  // 1. Set default config on ActivityMonitor (5 mins = 300s, 1 USDC, 5 txs)
  console.log("\n1. Setting ActivityMonitor.setDefaultConfig (300s / 5 min)...");
  const demoActivityConfig = {
    inactivityPeriod: 300n, // 5 minutes
    minVolumeNative: ethers.parseEther("1"), // 1 USDC
    minTxCount: 5n,
  };
  const setDefTx = await monitor.setDefaultConfig(demoActivityConfig);
  await setDefTx.wait();
  console.log("  ✓ ActivityMonitor.setDefaultConfig updated");

  // 2. Deploy updated LPRecyclingVault
  console.log("\n2. Deploying updated LPRecyclingVault...");
  const LPRecyclingVault = await ethers.getContractFactory("LPRecyclingVault");
  const newVault = await LPRecyclingVault.deploy(wNative);
  await newVault.waitForDeployment();
  const newVaultAddr = await newVault.getAddress();
  console.log(`  ✓ New LPRecyclingVault deployed at: ${newVaultAddr}`);

  // 3. Rewire new LPRecyclingVault
  console.log("\n3. Rewiring new vault...");
  const tx1 = await newVault.setBondingCurveFactory(bcFactoryAddr);
  await tx1.wait();
  console.log("  ✓ newVault.setBondingCurveFactory");

  const tx2 = await newVault.setGovernor(governorAddr);
  await tx2.wait();
  console.log("  ✓ newVault.setGovernor");

  const tx3 = await newVault.setActivityMonitor(monitorAddr);
  await tx3.wait();
  console.log("  ✓ newVault.setActivityMonitor");

  const tx4 = await bcFactory.setLpVault(newVaultAddr);
  await tx4.wait();
  console.log("  ✓ bcFactory.setLpVault");

  const tx5 = await monitor.setVault(newVaultAddr);
  await tx5.wait();
  console.log("  ✓ monitor.setVault");

  const tx6 = await governor.setVault(newVaultAddr);
  await tx6.wait();
  console.log("  ✓ governor.setVault");

  // 4. Set RecyclingGovernor voting period to 300s (5 minutes)
  console.log("\n4. Updating RecyclingGovernor voting period to 300s (5 min)...");
  const tx7 = await governor.setVotingPeriod(300n);
  await tx7.wait();
  console.log("  ✓ governor.setVotingPeriod(300s)");

  // 5. Save updated deployment
  console.log("\n5. Saving deployment records...");
  const d = saveDeployment(networkName, {
    lpVault: newVaultAddr,
    configuredAt: new Date().toISOString(),
  });

  // Also update ui-frontend deployment
  const uiDeploymentPath = resolve(
    new URL(".", import.meta.url).pathname,
    "../../ui-frontend/config/deployments/arcTestnet.json"
  );
  writeFileSync(uiDeploymentPath, JSON.stringify(d, null, 2) + "\n");
  console.log(`  ✓ Synced ${uiDeploymentPath}`);

  // 6. Verify on-chain state
  console.log("\n=== On-Chain Verification ===");
  const currentDefConfig = await monitor.defaultConfig();
  console.log(
    `ActivityMonitor.defaultConfig: inactivityPeriod=${currentDefConfig[0]}s (${Number(currentDefConfig[0]) / 60}m), minVolumeNative=${ethers.formatEther(currentDefConfig[1])} USDC, minTxCount=${currentDefConfig[2]}`
  );
  const currentVotingPeriod = await governor.votingPeriod();
  console.log(
    `RecyclingGovernor.votingPeriod: ${currentVotingPeriod}s (${Number(currentVotingPeriod) / 60}m)`
  );
  const factoryVault = await bcFactory.getLpVault();
  console.log(`BondingCurveFactory.lpVault: ${factoryVault}`);
  const monitorVault = await monitor.vault();
  console.log(`ActivityMonitor.vault: ${monitorVault}`);
  const govVault = await governor.vault();
  console.log(`RecyclingGovernor.vault: ${govVault}`);

  console.log("\n✓ All configuration updated successfully for demo mode!");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
