/**
 * Step 08 — Deploy ActivityMonitor
 *
 * npx hardhat run scripts/08-deploy-activity-monitor.ts --network monadTestnet
 */
import { connect, saveDeployment, logAddresses } from "./lib/deployment.js";

async function main() {
  const { ethers, deployer, networkName } = await connect();
  console.log(`Step 08: Deploy ActivityMonitor`);
  console.log(`Network: ${networkName}`);
  console.log(`Deployer: ${deployer.address}`);

  const ActivityMonitor = await ethers.getContractFactory("ActivityMonitor");
  const monitor = await ActivityMonitor.deploy();
  await monitor.waitForDeployment();
  const address = await monitor.getAddress();
  console.log(`ActivityMonitor: ${address}`);

  const d = saveDeployment(networkName, {
    deployer: deployer.address,
    activityMonitor: address,
  });
  logAddresses(d);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
