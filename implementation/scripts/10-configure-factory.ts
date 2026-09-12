/**
 * Step 10 — Configure BondingCurveFactory + set LP vault
 *
 * Requires: steps 03, 05, 07 (dexFactory, bondingCurveFactory, lpVault)
 * npx hardhat run scripts/10-configure-factory.ts --network arcTestnet
 */
import { connect, loadDeployment, requireAddress, saveDeployment, logAddresses } from "./lib/deployment.js";

async function main() {
  const { ethers, deployer, networkName } = await connect();
  console.log(`Step 10: Configure BondingCurveFactory`);
  console.log(`Network: ${networkName}`);
  console.log(`Deployer: ${deployer.address}`);

  const prev = loadDeployment(networkName);
  const bcAddr = requireAddress(prev, "bondingCurveFactory");
  const dexFactory = requireAddress(prev, "dexFactory");
  const lpVault = requireAddress(prev, "lpVault");

  const factory = await ethers.getContractAt("BondingCurveFactory", bcAddr);

  const params = {
    deployFee: 0n,
    listingFee: 0n,
    tokenTotalSupply: 10n ** 27n,
    virtualNative: 60n * 10n ** 18n,
    virtualToken: 1_800_000_000n * 10n ** 18n,
    targetToken: 400_000_000n * 10n ** 18n,
    feeNumerator: 100,
    feeDenominator: 1,
    dexFactory,
  };

  const initTx = await factory.initialize(params);
  await initTx.wait();
  console.log("BondingCurveFactory.initialize ✓");

  const vaultTx = await factory.setLpVault(lpVault);
  await vaultTx.wait();
  console.log(`BondingCurveFactory.setLpVault(${lpVault}) ✓`);

  const d = saveDeployment(networkName, {
    configuredAt: new Date().toISOString(),
  });
  logAddresses(d);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
