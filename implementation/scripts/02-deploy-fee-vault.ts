/**
 * Step 02 — Deploy FeeVault
 *
 * Requires: step 01 (wNative)
 * npx hardhat run scripts/02-deploy-fee-vault.ts --network monadTestnet
 */
import { connect, loadDeployment, requireAddress, saveDeployment, logAddresses } from "./lib/deployment.js";

async function main() {
  const { ethers, deployer, networkName } = await connect();
  console.log(`Step 02: Deploy FeeVault`);
  console.log(`Network: ${networkName}`);
  console.log(`Deployer: ${deployer.address}`);

  const prev = loadDeployment(networkName);
  const wNative = requireAddress(prev, "wNative");

  const FeeVault = await ethers.getContractFactory("FeeVault");
  const feeVault = await FeeVault.deploy(wNative, [deployer.address], 1);
  await feeVault.waitForDeployment();
  const address = await feeVault.getAddress();
  console.log(`FeeVault: ${address}`);

  const d = saveDeployment(networkName, { feeVault: address });
  logAddresses(d);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
