# Reflow — Liquidity-Recycling Launchpad (Uniswap V2)

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

3. Run each step in order on Monad testnet. Addresses are saved to `deployments/monadTestnet.json`.

| Step | Command | What it deploys / does |
|------|---------|------------------------|
| 01 | `npx hardhat run scripts/01-deploy-wnative.ts --network monadTestnet` | WNative |
| 02 | `npx hardhat run scripts/02-deploy-fee-vault.ts --network monadTestnet` | FeeVault |
| 03 | `npx hardhat run scripts/03-deploy-dex-factory.ts --network monadTestnet` | UniswapV2Factory |
| 04 | `npx hardhat run scripts/04-deploy-core.ts --network monadTestnet` | Core |
| 05 | `npx hardhat run scripts/05-deploy-bonding-curve-factory.ts --network monadTestnet` | BondingCurveFactory + Core.initialize |
| 06 | `npx hardhat run scripts/06-deploy-dex-router.ts --network monadTestnet` | DexRouter |
| 07 | `npx hardhat run scripts/07-deploy-lp-vault.ts --network monadTestnet` | LPRecyclingVault |
| 08 | `npx hardhat run scripts/08-deploy-activity-monitor.ts --network monadTestnet` | ActivityMonitor |
| 09 | `npx hardhat run scripts/09-deploy-governor.ts --network monadTestnet` | RecyclingGovernor |
| 10 | `npx hardhat run scripts/10-configure-factory.ts --network monadTestnet` | Factory params + setLpVault |
| 11 | `npx hardhat run scripts/11-wire-recycle.ts --network monadTestnet` | Wire vault / monitor / governor / router |

Copy-paste all steps:

```shell
npx hardhat run scripts/01-deploy-wnative.ts --network monadTestnet
npx hardhat run scripts/02-deploy-fee-vault.ts --network monadTestnet
npx hardhat run scripts/03-deploy-dex-factory.ts --network monadTestnet
npx hardhat run scripts/04-deploy-core.ts --network monadTestnet
npx hardhat run scripts/05-deploy-bonding-curve-factory.ts --network monadTestnet
npx hardhat run scripts/06-deploy-dex-router.ts --network monadTestnet
npx hardhat run scripts/07-deploy-lp-vault.ts --network monadTestnet
npx hardhat run scripts/08-deploy-activity-monitor.ts --network monadTestnet
npx hardhat run scripts/09-deploy-governor.ts --network monadTestnet
npx hardhat run scripts/10-configure-factory.ts --network monadTestnet
npx hardhat run scripts/11-wire-recycle.ts --network monadTestnet
```

Inspect saved addresses:

```shell
npx hardhat run scripts/00-print-deployment.ts --network monadTestnet
```

For mainnet, replace `--network monadTestnet` with `--network monadMainnet`.

### One-shot alternative

Deploys everything in one go via `ReflowV2Deployer`:

```shell
npx hardhat run scripts/deploy-reflow.ts --network monadTestnet
```

### Foundry

```shell
forge build
forge test --match-contract ReflowV2RecyclingTest -vv
```

### Monad testnet addresses (current)

| Contract | Address |
|---|---|
| Deployer | `0xdAF0182De86F904918Db8d07c7340A1EfcDF8244` |
| WNative | `0x01a8309857D5B5b74498EB55f6Fe80d7186842A0` |
| FeeVault | `0x070299400A86822D298A7565Cf2aeeb599ec9201` |
| UniswapV2Factory | `0x02a9b3dd27C38497F97FdE5279220F403eF2F5d2` |
| Core | `0x002b3C2fe3442bb1Cef409C9dd1830A3E01C03f6` |
| BondingCurveFactory | `0x54eE35d85740CbB12B5cAB18A179ff6F5C7b28FF` |
| DexRouter | `0x200bbaD68ECAD4D64ff8B6Aa36C60A7a6d5374E1` |
| LPRecyclingVault | `0xEc6247Ea7698ACaC1343Db972d3d3484c6555163` |
| ActivityMonitor | `0x295D9dc3Ba2b47C5a6f6872f1DFf52ab5273609B` |
| RecyclingGovernor | `0x0B30672ef6e1F89938a9d0cc078F0ce5b5Ace098` |

## Usage

1. `core.createCurve{value:…}(…)` then buy until curve locks
2. `bondingCurve.listing()` — LP locked in vault
3. Trade via `dexRouter.buy` / `sell`
4. `lpVault.markInactive(token)` after inactivity window
5. `governor.propose(dead, [activeCandidates])` → `vote{value}` → `execute`
6. Winner receives recycled WNATIVE as new locked LP
