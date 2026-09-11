/**
 * Step 05 — Deploy BondingCurveFactory + initialize Core
 *
 * Requires: steps 01, 04 (wNative, core)
 * npx hardhat run scripts/05-deploy-bonding-curve-factory.ts --network arcTestnet
 */
import { connect, loadDeployment, requireAddress, saveDeployment, logAddresses } from "./lib/deployment.js";

async function main() {
  const { ethers, deployer, networkName } = await connect();
  console.log(`Step 05: Deploy BondingCurveFactory + Core.initialize`);
  console.log(`Network: ${networkName}`);
  console.log(`Deployer: ${deployer.address}`);

  const prev = loadDeployment(networkName);
  const wNative = requireAddress(prev, "wNative");
  const coreAddr = requireAddress(prev, "core");

  const BondingCurveFactory = await ethers.getContractFactory("BondingCurveFactory");
  const bcFactory = await BondingCurveFactory.deploy(deployer.address, coreAddr, wNative);
  await bcFactory.waitForDeployment();
  const bcAddress = await bcFactory.getAddress();
  console.log(`BondingCurveFactory: ${bcAddress}`);

  const core = await ethers.getContractAt("Core", coreAddr);
  const tx = await core.initialize(bcAddress);
  await tx.wait();
  console.log(`Core.initialize → BondingCurveFactory`);

  const d = saveDeployment(networkName, { bondingCurveFactory: bcAddress });
  logAddresses(d);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
