/**
 * Step 03 — Deploy Uniswap V2 Factory (DEX)
 *
 * npx hardhat run scripts/03-deploy-dex-factory.ts --network monadTestnet
 */
import { connect, saveDeployment, logAddresses } from "./lib/deployment.js";

async function main() {
  const { ethers, deployer, networkName } = await connect();
  console.log(`Step 03: Deploy UniswapV2Factory`);
  console.log(`Network: ${networkName}`);
  console.log(`Deployer: ${deployer.address}`);

  const Factory = await ethers.getContractFactory("UniswapV2Factory");
  const factory = await Factory.deploy(deployer.address);
  await factory.waitForDeployment();
  const address = await factory.getAddress();
  console.log(`UniswapV2Factory: ${address}`);

  const d = saveDeployment(networkName, {
    deployer: deployer.address,
    dexFactory: address,
  });
  logAddresses(d);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
