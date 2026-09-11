/**
 * Launch N random tokens on the bonding curve and upsert them into MongoDB.
 *
 * Env (implementation/.env or shell):
 *   PRIVATE_KEY          — deployer/signer
 *   MONGODB_URI          — Atlas / local Mongo connection string
 *   MONGODB_DB           — database name (default: reflow)
 *   LAUNCH_COUNT         — how many tokens (default: number of public/coins images)
 *   SEED_BUY_USDC        — optional fixed seed buy in USDC (default: random 0–0.05)
 *
 * Usage:
 *   npx hardhat run scripts/12-launch-random-tokens.ts --network arcTestnet
 */
import "dotenv/config";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import { connect, loadDeployment, requireAddress } from "./lib/deployment.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const MONGODB_URI = process.env.MONGODB_URI || "";
const MONGODB_DB = process.env.MONGODB_DB || "reflow";

const ADJECTIVES = [
  "Neon",
  "Quantum",
  "Cosmic",
  "Turbo",
  "Pixel",
  "Hyper",
  "Solar",
  "Lunar",
  "Swift",
  "Lucky",
  "Golden",
  "Silent",
  "Rapid",
  "Bright",
  "Funky",
  "Wild",
  "Crystal",
  "Nova",
  "Prime",
  "Echo",
];

const NOUNS = [
  "Fox",
  "Wave",
  "Orb",
  "Dragon",
  "Kitty",
  "Rocket",
  "Bean",
  "Pulse",
  "Spark",
  "Mango",
  "Panda",
  "Glider",
  "Bolt",
  "Reef",
  "Comet",
  "Otter",
  "Jade",
  "Blaze",
  "Nimbus",
  "Voxel",
];

/** Coin art from ui-frontend/public/coins */
const IMAGES = [
  "/coins/token1.webp",
  "/coins/token2.jpeg",
  "/coins/token3.png",
  "/coins/token4.jpeg",
  "/coins/token5.avif",
];

const COUNT = Math.max(1, Number(process.env.LAUNCH_COUNT || IMAGES.length));

const CORE_ABI = [
  "function createCurve(address creator, string name, string symbol, string tokenURI, uint256 amountIn, uint256 fee) payable returns (address curve, address token, uint256 virtualNative, uint256 virtualToken, uint256 amountOut)",
] as const;

const FACTORY_ABI = [
  "function getDelpyFee() view returns (uint256)",
  "function getConfig() view returns (tuple(uint256 deployFee, uint256 listingFee, uint256 tokenTotalSupply, uint256 virtualNative, uint256 virtualToken, uint256 k, uint256 targetToken, uint16 feeNumerator, uint8 feeDenominator))",
  "event Create(address indexed owner, address indexed curve, address indexed token, string tokenURI, string name, string symbol, uint256 virtualNative, uint256 virtualToken)",
] as const;

type Launched = {
  address: string;
  name: string;
  symbol: string;
  curve: string;
  imageUrl: string;
  creator: string;
  txHash: string;
  seedBuy: string;
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function randomTokenMeta(i: number) {
  const name = `${pick(ADJECTIVES)}${pick(NOUNS)}${i + 1}`;
  const symbol = name
    .replace(/[^a-zA-Z]/g, "")
    .slice(0, 6)
    .toUpperCase();
  // Cycle through public coin images so each launch uses the artwork set
  const imageUrl = IMAGES[i % IMAGES.length]!;
  const description = `${name} — ZUNO bonding-curve launch #${i + 1}`;
  return { name, symbol, imageUrl, description };
}

function calcFee(amountIn: bigint, feeDenominator: bigint, feeNumerator: bigint) {
  if (amountIn <= 0n || feeNumerator === 0n) return 0n;
  return (amountIn * feeDenominator) / feeNumerator;
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function upsertMongo(doc: {
  address: string;
  name: string;
  symbol: string;
  curve: string;
  imageUrl: string;
  description: string;
  creator: string;
  tokenURI: string;
  txHash: string;
  phase: string;
  graduated: boolean;
  isListing: boolean;
  curveLocked: boolean;
  vaultStatus: string;
  inactive: boolean;
  recyclingEligible: boolean;
  progress: number;
  lastBuyAt?: Date;
  lifecycleSyncedAt: Date;
}) {
  const col = mongoose.connection.collection("tokens");
  const address = doc.address.toLowerCase();
  await col.updateOne(
    { address },
    {
      $set: {
        address,
        name: doc.name,
        symbol: doc.symbol,
        curve: doc.curve.toLowerCase(),
        imageUrl: doc.imageUrl,
        description: doc.description,
        creator: doc.creator.toLowerCase(),
        tokenURI: doc.tokenURI,
        txHash: doc.txHash,
        phase: doc.phase,
        graduated: doc.graduated,
        isListing: doc.isListing,
        curveLocked: doc.curveLocked,
        vaultStatus: doc.vaultStatus,
        inactive: doc.inactive,
        recyclingEligible: doc.recyclingEligible,
        progress: doc.progress,
        lastBuyAt: doc.lastBuyAt,
        lifecycleSyncedAt: doc.lifecycleSyncedAt,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        createdAt: new Date(),
        decimals: 18,
        chainId: 5042002,
      },
    },
    { upsert: true },
  );
}

async function main() {
  if (!MONGODB_URI) {
    throw new Error("Set MONGODB_URI in implementation/.env (same Atlas URI as ui-frontend is fine)");
  }

  const { ethers, deployer, networkName } = await connect();
  const d = loadDeployment(networkName);
  const coreAddr = requireAddress(d, "core");
  const factoryAddr = requireAddress(d, "bondingCurveFactory");

  console.log(`Network:  ${networkName}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Core:     ${coreAddr}`);
  console.log(`Factory:  ${factoryAddr}`);
  console.log(`Launching ${COUNT} random tokens…\n`);

  await mongoose.connect(MONGODB_URI, { dbName: MONGODB_DB });
  console.log(`Mongo connected (${MONGODB_DB})\n`);

  const factory = new ethers.Contract(factoryAddr, FACTORY_ABI, deployer);
  const core = new ethers.Contract(coreAddr, CORE_ABI, deployer);

  const deployFee = (await factory.getDelpyFee()) as bigint;
  let feeNum = 100n;
  let feeDen = 1n;
  try {
    const cfg = await factory.getConfig();
    feeNum = BigInt(cfg.feeNumerator);
    feeDen = BigInt(cfg.feeDenominator);
  } catch {
    /* defaults 1% style (amount * 1) / 100 */
  }

  const launched: Launched[] = [];
  const failed: { index: number; error: string }[] = [];

  for (let i = 0; i < COUNT; i++) {
    const meta = randomTokenMeta(i);
    const fixedSeed = process.env.SEED_BUY_USDC;
    const seedMon =
      fixedSeed != null && fixedSeed !== ""
        ? fixedSeed
        : (Math.random() * 0.05).toFixed(4); // 0–0.05 USDC
    const amountIn = Number(seedMon) > 0 ? ethers.parseEther(seedMon) : 0n;
    let fee = calcFee(amountIn, feeDen, feeNum);
    if (amountIn > 0n && fee === 0n) fee = 1n;
    const value = amountIn + fee + deployFee;

    process.stdout.write(
      `[${i + 1}/${COUNT}] ${meta.name} ($${meta.symbol}) seed=${seedMon} USDC … `,
    );

    try {
      const tx = await core.createCurve(
        deployer.address,
        meta.name,
        meta.symbol,
        meta.imageUrl || "ipfs://zuno",
        amountIn,
        fee,
        { value, gasLimit: 5_000_000n },
      );
      const receipt = await tx.wait();
      if (!receipt) throw new Error("No receipt");

      let token = "";
      let curve = "";
      for (const log of receipt.logs as { topics: string[]; data: string }[]) {
        try {
          const parsed = factory.interface.parseLog({ topics: log.topics, data: log.data });
          if (parsed?.name === "Create") {
            token = parsed.args.token as string;
            curve = parsed.args.curve as string;
            break;
          }
        } catch {
          /* not Create */
        }
      }
      if (!token || !curve) throw new Error("Create event not found");

      const progress = amountIn > 0n ? 1 : 0;
      await upsertMongo({
        address: token,
        name: meta.name,
        symbol: meta.symbol,
        curve,
        imageUrl: meta.imageUrl,
        description: meta.description,
        creator: deployer.address,
        tokenURI: meta.imageUrl,
        txHash: receipt.hash,
        phase: "bonding",
        graduated: false,
        isListing: false,
        curveLocked: false,
        vaultStatus: "None",
        inactive: false,
        recyclingEligible: false,
        progress,
        lastBuyAt: amountIn > 0n ? new Date() : undefined,
        lifecycleSyncedAt: new Date(),
      });

      launched.push({
        address: token,
        name: meta.name,
        symbol: meta.symbol,
        curve,
        imageUrl: meta.imageUrl,
        creator: deployer.address,
        txHash: receipt.hash,
        seedBuy: seedMon,
      });
      console.log(`ok ${token}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      failed.push({ index: i + 1, error: message });
      console.log(`FAIL ${message.slice(0, 120)}`);
    }

    // Pace txs — Arc / wallet RPC friendliness
    if (i < COUNT - 1) await sleep(2500);
  }

  const outPath = join(__dirname, "..", "deployments", `launched-${networkName}-${Date.now()}.json`);
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        network: networkName,
        createdAt: new Date().toISOString(),
        deployer: deployer.address,
        launched,
        failed,
      },
      null,
      2,
    ) + "\n",
  );

  console.log(`\nDone. Launched ${launched.length}/${COUNT}. Failed ${failed.length}.`);
  console.log(`Mongo DB: ${MONGODB_DB}.tokens`);
  console.log(`Backup:   ${outPath}`);

  await mongoose.disconnect();
}

main().catch(async err => {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exitCode = 1;
});
