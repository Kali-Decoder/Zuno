import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { network } from "hardhat";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..", "deployments");

export type DeploymentAddresses = {
  network: string;
  deployer?: string;
  wNative?: string;
  feeVault?: string;
  dexFactory?: string;
  core?: string;
  bondingCurveFactory?: string;
  dexRouter?: string;
  lpVault?: string;
  activityMonitor?: string;
  governor?: string;
  configuredAt?: string;
};

export async function connect() {
  const connection = await network.connect();
  const { ethers, networkName } = connection;
  const [deployer] = await ethers.getSigners();
  if (!networkName) {
    throw new Error("Could not resolve Hardhat network name from connection");
  }
  return { ethers, deployer, networkName: networkName as string, connection };
}

export function deploymentPath(networkName: string) {
  return join(ROOT, `${networkName}.json`);
}

export function loadDeployment(networkName: string): DeploymentAddresses {
  const path = deploymentPath(networkName);
  if (!existsSync(path)) {
    return { network: networkName };
  }
  return JSON.parse(readFileSync(path, "utf8")) as DeploymentAddresses;
}

export function saveDeployment(networkName: string, patch: Partial<DeploymentAddresses>) {
  mkdirSync(ROOT, { recursive: true });
  const current = loadDeployment(networkName);
  const next: DeploymentAddresses = {
    ...current,
    ...patch,
    network: networkName,
  };
  writeFileSync(deploymentPath(networkName), JSON.stringify(next, null, 2) + "\n");
  return next;
}

export function requireAddress(d: DeploymentAddresses, key: keyof DeploymentAddresses): string {
  const value = d[key];
  if (!value || typeof value !== "string") {
    throw new Error(`Missing ${String(key)} in deployments/${d.network}.json — run earlier steps first`);
  }
  return value;
}

export function logAddresses(d: DeploymentAddresses) {
  console.log("\nSaved deployment:");
  for (const [k, v] of Object.entries(d)) {
    if (k === "network") continue;
    console.log(`  ${k}: ${v}`);
  }
  console.log(`File: deployments/${d.network}.json\n`);
}
