/**
 * Step 04 — Deploy Core
 *
 * Requires: steps 01–02 (wNative, feeVault)
 * npx hardhat run scripts/04-deploy-core.ts --network arcTestnet
 */
import { connect, loadDeployment, requireAddress, saveDeployment, logAddresses } from "./lib/deployment.js";

async function main() {
  const { ethers, deployer, networkName } = await connect();
  console.log(`Step 04: Deploy Core`);
  console.log(`Network: ${networkName}`);
  console.log(`Deployer: ${deployer.address}`);

  const prev = loadDeployment(networkName);
  const wNative = requireAddress(prev, "wNative");
  const feeVault = requireAddress(prev, "feeVault");

  const Core = await ethers.getContractFactory("Core");
  const core = await Core.deploy(wNative, feeVault);
  await core.waitForDeployment();
  const address = await core.getAddress();
  console.log(`Core: ${address}`);

  const d = saveDeployment(networkName, { core: address });
  logAddresses(d);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
