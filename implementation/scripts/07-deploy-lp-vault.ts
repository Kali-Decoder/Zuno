/**
 * Step 07 — Deploy LPRecyclingVault
 *
 * Requires: step 01 (wNative)
 * npx hardhat run scripts/07-deploy-lp-vault.ts --network arcTestnet
 */
import { connect, loadDeployment, requireAddress, saveDeployment, logAddresses } from "./lib/deployment.js";

async function main() {
  const { ethers, deployer, networkName } = await connect();
  console.log(`Step 07: Deploy LPRecyclingVault`);
  console.log(`Network: ${networkName}`);
  console.log(`Deployer: ${deployer.address}`);

  const prev = loadDeployment(networkName);
  const wNative = requireAddress(prev, "wNative");

  const LPRecyclingVault = await ethers.getContractFactory("LPRecyclingVault");
  const vault = await LPRecyclingVault.deploy(wNative);
  await vault.waitForDeployment();
  const address = await vault.getAddress();
  console.log(`LPRecyclingVault: ${address}`);

  const d = saveDeployment(networkName, { lpVault: address });
  logAddresses(d);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
