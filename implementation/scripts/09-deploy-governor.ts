/**
 * Step 09 — Deploy RecyclingGovernor
 *
 * npx hardhat run scripts/09-deploy-governor.ts --network arcTestnet
 */
import { connect, saveDeployment, logAddresses } from "./lib/deployment.js";

async function main() {
  const { ethers, deployer, networkName } = await connect();
  console.log(`Step 09: Deploy RecyclingGovernor`);
  console.log(`Network: ${networkName}`);
  console.log(`Deployer: ${deployer.address}`);

  const RecyclingGovernor = await ethers.getContractFactory("RecyclingGovernor");
  const governor = await RecyclingGovernor.deploy();
  await governor.waitForDeployment();
  const address = await governor.getAddress();
  console.log(`RecyclingGovernor: ${address}`);

  const d = saveDeployment(networkName, {
    deployer: deployer.address,
    governor: address,
  });
  logAddresses(d);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
