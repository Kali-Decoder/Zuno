# ZUNO — Liquidity-Recycling Launchpad (Uniswap V2)

Where liquidity finds its next home.

Dead liquidity shouldn't stay dead. Projects launch on a bonding curve, graduate to Uniswap V2 with **locked LP**, and if a pool goes inactive the community votes to recycle that liquidity into an active project.

## Cycle

```
Core.createCurve / buy
        ↓
BondingCurve (target reached → lock)
        ↓
listing() → UniswapV2Pair + LP → LPRecyclingVault
        ↓
DexRouter trades → ActivityMonitor
        ↓
inactive X days → RecyclingGovernor vote
        ↓
remove dead LP → redeploy into winner pair → lock again
```

## Contracts (`src/`)

| Contract | Role |
|---|---|
| `Core` | Create curve + buy/sell on bonding curve |
| `BondingCurve` / `BondingCurveFactory` | Price discovery; graduate to V2 |
| `DexRouter` | Post-listing V2 swaps (records activity) |
| `Token` / `WNative` | Project ERC20 + wrapped native |
| `Lock` / `MintParty*` | MintParty token locks (unchanged) |
| `FeeVault` | Protocol fee sink |
| `uniswap/*` | Local Uniswap V2 factory/pair/router |
| `recycle/LPRecyclingVault` | Holds graduated LP; executes recycle |
| `recycle/ActivityMonitor` | Volume / tx / time inactivity |
| `recycle/RecyclingGovernor` | Native-weighted propose / vote / execute |
| `recycle/ReflowV2Deployer` | One-shot deploy + wiring |

## Key change vs stock launchpad

`BondingCurve.listing()` no longer burns LP to `address(0)`. It transfers LP to `LPRecyclingVault` and calls `registerLock`.

## Deploy (step-by-step)

1. Put your key in `.env`:

```shell
PRIVATE_KEY=0xyour_private_key
```

2. Compile:

```shell
npx hardhat compile
```

3. Run each step in order on Arc testnet. Addresses are saved to `deployments/arcTestnet.json`.

| Step | Command | What it deploys / does |
|------|---------|------------------------|
| 01 | `npx hardhat run scripts/01-deploy-wnative.ts --network arcTestnet` | WNative |
| 02 | `npx hardhat run scripts/02-deploy-fee-vault.ts --network arcTestnet` | FeeVault |
| 03 | `npx hardhat run scripts/03-deploy-dex-factory.ts --network arcTestnet` | UniswapV2Factory |
| 04 | `npx hardhat run scripts/04-deploy-core.ts --network arcTestnet` | Core |
| 05 | `npx hardhat run scripts/05-deploy-bonding-curve-factory.ts --network arcTestnet` | BondingCurveFactory + Core.initialize |
| 06 | `npx hardhat run scripts/06-deploy-dex-router.ts --network arcTestnet` | DexRouter |
| 07 | `npx hardhat run scripts/07-deploy-lp-vault.ts --network arcTestnet` | LPRecyclingVault |
| 08 | `npx hardhat run scripts/08-deploy-activity-monitor.ts --network arcTestnet` | ActivityMonitor |
| 09 | `npx hardhat run scripts/09-deploy-governor.ts --network arcTestnet` | RecyclingGovernor |
| 10 | `npx hardhat run scripts/10-configure-factory.ts --network arcTestnet` | Factory params + setLpVault |
| 11 | `npx hardhat run scripts/11-wire-recycle.ts --network arcTestnet` | Wire vault / monitor / governor / router |

Copy-paste all steps:

```shell
npx hardhat run scripts/01-deploy-wnative.ts --network arcTestnet
npx hardhat run scripts/02-deploy-fee-vault.ts --network arcTestnet
npx hardhat run scripts/03-deploy-dex-factory.ts --network arcTestnet
npx hardhat run scripts/04-deploy-core.ts --network arcTestnet
npx hardhat run scripts/05-deploy-bonding-curve-factory.ts --network arcTestnet
npx hardhat run scripts/06-deploy-dex-router.ts --network arcTestnet
npx hardhat run scripts/07-deploy-lp-vault.ts --network arcTestnet
npx hardhat run scripts/08-deploy-activity-monitor.ts --network arcTestnet
npx hardhat run scripts/09-deploy-governor.ts --network arcTestnet
npx hardhat run scripts/10-configure-factory.ts --network arcTestnet
npx hardhat run scripts/11-wire-recycle.ts --network arcTestnet
```

Inspect saved addresses:

```shell
npx hardhat run scripts/00-print-deployment.ts --network arcTestnet
```

For mainnet, replace `--network arcTestnet` with `--network arcTestnet`.

### One-shot alternative

Deploys everything in one go via `ReflowV2Deployer`:

```shell
npx hardhat run scripts/deploy-reflow.ts --network arcTestnet
```

### Foundry

```shell
forge build
forge test --match-contract ReflowV2RecyclingTest -vv
```

### Arc testnet addresses (current)

| Contract | Address |
|---|---|
| Deployer | `0xdAF0182De86F904918Db8d07c7340A1EfcDF8244` |
| WNative | `0x0B42F31369Ffaa20b1Bd154C0cd50c77989Fb238` |
| FeeVault | `0x32c06719d2CAb4c1a18b818aaC35e4a081732BC6` |
| UniswapV2Factory | `0xd72e78e189Cd261f14e5249cF33Fe38B1DE3cCB2` |
| Core | `0xD03883879422b20daEaE68f116771f2f36131Cfe` |
| BondingCurveFactory | `0x8133D59B8b59C1210cf6B28e7833810aA691A33a` |
| DexRouter | `0x4Cdf69D2a6D119bEEeD9B692A8aa60313A6415B0` |
| LPRecyclingVault | `0x8EC409A9197BF4CF1b42462206dCfD9002f3059B` |
| ActivityMonitor | `0xC78111BACB105433473496c232E6AD9595F80DCC` |
| RecyclingGovernor | `0xEcA274eb83E2d28cdDaCbE654d62E4B4014cd897` |

## Usage

1. `core.createCurve{value:…}(…)` then buy until curve locks
2. `bondingCurve.listing()` — LP locked in vault
3. Trade via `dexRouter.buy` / `sell`
4. `lpVault.markInactive(token)` after inactivity window
5. `governor.propose(dead, [activeCandidates])` → `vote{value}` → `execute`
6. Winner receives recycled WNATIVE as new locked LP
