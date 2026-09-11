/**
 * Step 06 — Deploy DexRouter (post-listing trading)
 *
 * Requires: steps 01–03 (wNative, feeVault, dexFactory)
 * npx hardhat run scripts/06-deploy-dex-router.ts --network arcTestnet
 *
 * Fee: 1% (denominator=1, numerator=100)
 */
import { connect, loadDeployment, requireAddress, saveDeployment, logAddresses } from "./lib/deployment.js";

async function main() {
  const { ethers, deployer, networkName } = await connect();
  console.log(`Step 06: Deploy DexRouter`);
  console.log(`Network: ${networkName}`);
  console.log(`Deployer: ${deployer.address}`);

  const prev = loadDeployment(networkName);
  const wNative = requireAddress(prev, "wNative");
  const feeVault = requireAddress(prev, "feeVault");
  const dexFactory = requireAddress(prev, "dexFactory");

  const feeDenominator = 1n;
  const feeNumerator = 100n;

  const DexRouter = await ethers.getContractFactory("DexRouter");
  const router = await DexRouter.deploy(dexFactory, wNative, feeVault, feeDenominator, feeNumerator);
  await router.waitForDeployment();
  const address = await router.getAddress();
  console.log(`DexRouter: ${address}`);

  const d = saveDeployment(networkName, { dexRouter: address });
  logAddresses(d);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
