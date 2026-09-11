/**
 * Step 00 — Print current deployment addresses for this network
 *
 * npx hardhat run scripts/00-print-deployment.ts --network arcTestnet
 */
import { connect, loadDeployment, logAddresses } from "./lib/deployment.js";

async function main() {
  const { networkName, deployer } = await connect();
  console.log(`Network: ${networkName}`);
  console.log(`Deployer: ${deployer.address}`);
  const d = loadDeployment(networkName);
  logAddresses(d);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
