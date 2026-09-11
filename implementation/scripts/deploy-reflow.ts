/**
 * One-shot deploy via ReflowV2Deployer, then save addresses for the UI.
 *
 * npx hardhat run scripts/deploy-reflow.ts --network arcTestnet
 */
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { connect, saveDeployment, logAddresses } from "./lib/deployment.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const { ethers, deployer, networkName } = await connect();

  console.log("Deployer:", deployer.address);
  console.log("Network:", networkName);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "USDC");

  const ReflowV2Deployer = await ethers.getContractFactory("ReflowV2Deployer");
  const reflowDeployer = await ReflowV2Deployer.deploy();
  await reflowDeployer.waitForDeployment();
  console.log("ReflowV2Deployer:", await reflowDeployer.getAddress());

  const tx = await reflowDeployer.deployAll(deployer.address);
  const receipt = await tx.wait();
  console.log("deployAll tx:", receipt?.hash);

  const d = await reflowDeployer.deployment();
  const saved = saveDeployment(networkName, {
    deployer: deployer.address,
    wNative: d.wNative,
    feeVault: d.feeVault,
    dexFactory: d.dexFactory,
    core: d.core,
    bondingCurveFactory: d.bondingCurveFactory,
    dexRouter: d.dexRouter,
    lpVault: d.lpVault,
    activityMonitor: d.activityMonitor,
    governor: d.governor,
    configuredAt: new Date().toISOString(),
  });
  logAddresses(saved);

  const uiDir = join(__dirname, "..", "..", "ui-frontend", "config", "deployments");
  mkdirSync(uiDir, { recursive: true });
  const src = join(__dirname, "..", "deployments", `${networkName}.json`);
  const dest = join(uiDir, `${networkName}.json`);
  copyFileSync(src, dest);
  console.log("Copied to", dest);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
