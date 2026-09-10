/**
 * Step 01 — Deploy WNative (wrapped native MON)
 *
 * npx hardhat run scripts/01-deploy-wnative.ts --network monadTestnet
 */
import { connect, saveDeployment, logAddresses } from "./lib/deployment.js";

async function main() {
  const { ethers, deployer, networkName } = await connect();
  console.log(`Step 01: Deploy WNative`);
  console.log(`Network: ${networkName}`);
  console.log(`Deployer: ${deployer.address}`);

  const WNative = await ethers.getContractFactory("WNative");
  const wNative = await WNative.deploy();
  await wNative.waitForDeployment();
  const address = await wNative.getAddress();
  console.log(`WNative: ${address}`);

  const d = saveDeployment(networkName, {
    deployer: deployer.address,
    wNative: address,
  });
  logAddresses(d);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
