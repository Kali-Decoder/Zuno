import { network } from "hardhat";

async function main() {
  const { ethers } = await network.connect();
  const [deployer] = await ethers.getSigners();

  console.log("Deployer:", deployer.address);
  console.log("Network:", network.name);

  const ReflowV2Deployer = await ethers.getContractFactory("ReflowV2Deployer");
  const reflowDeployer = await ReflowV2Deployer.deploy();
  await reflowDeployer.waitForDeployment();
  console.log("ReflowV2Deployer:", await reflowDeployer.getAddress());

  const tx = await reflowDeployer.deployAll(deployer.address);
  const receipt = await tx.wait();
  console.log("deployAll tx:", receipt?.hash);

  const d = await reflowDeployer.deployment();
  console.log("Reflow V2 + recycle deployment:");
  console.log("  wNative:", d.wNative);
  console.log("  feeVault:", d.feeVault);
  console.log("  dexFactory:", d.dexFactory);
  console.log("  core:", d.core);
  console.log("  bondingCurveFactory:", d.bondingCurveFactory);
  console.log("  dexRouter:", d.dexRouter);
  console.log("  lpVault:", d.lpVault);
  console.log("  activityMonitor:", d.activityMonitor);
  console.log("  governor:", d.governor);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
