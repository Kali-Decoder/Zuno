# Reflow Frontend

Next.js client for the Reflow liquidity-recycling launchpad on Monad Testnet.

## Network
- Chain: Monad Testnet
- Chain ID: `10143`
- RPC: `https://testnet-rpc.monad.xyz`
- Explorer: `https://testnet.monadvision.com`

## Protocol steps

1. **Launch** — `Core.createCurve` (optional seed buy)
2. **Bonding curve** — `Core.buy` / `sell` until the curve locks
3. **Graduate** — `BondingCurve.listing()` mints Uniswap V2 LP into `LPRecyclingVault`
4. **DEX trade** — `DexRouter.buy` / `sell` (records activity)
5. **Recycle** — `markInactive` → `Governor.propose` → `vote` → `execute`

## Configure addresses

After deploying, addresses are read from `implementation/deployments/monadTestnet.json` (copied into `app/config/addresses.json`). Current Monad Testnet deployment:

- Core: `0x002b3C2fe3442bb1Cef409C9dd1830A3E01C03f6`
- BondingCurveFactory: `0x54eE35d85740CbB12B5cAB18A179ff6F5C7b28FF`
- DexRouter: `0x200bbaD68ECAD4D64ff8B6Aa36C60A7a6d5374E1`
- LPRecyclingVault: `0xEc6247Ea7698ACaC1343Db972d3d3484c6555163`
- ActivityMonitor: `0x295D9dc3Ba2b47C5a6f6872f1DFf52ab5273609B`
- Governor: `0x0B30672ef6e1F89938a9d0cc078F0ce5b5Ace098`

Override with env vars if needed:

```
NEXT_PUBLIC_RPC_URL=https://testnet-rpc.monad.xyz
NEXT_PUBLIC_CORE=0x002b3C2fe3442bb1Cef409C9dd1830A3E01C03f6
NEXT_PUBLIC_BONDING_CURVE_FACTORY=0x54eE35d85740CbB12B5cAB18A179ff6F5C7b28FF
NEXT_PUBLIC_DEX_ROUTER=0x200bbaD68ECAD4D64ff8B6Aa36C60A7a6d5374E1
NEXT_PUBLIC_LP_VAULT=0xEc6247Ea7698ACaC1343Db972d3d3484c6555163
NEXT_PUBLIC_ACTIVITY_MONITOR=0x295D9dc3Ba2b47C5a6f6872f1DFf52ab5273609B
NEXT_PUBLIC_GOVERNOR=0x0B30672ef6e1F89938a9d0cc078F0ce5b5Ace098
NEXT_PUBLIC_WNATIVE=0x01a8309857D5B5b74498EB55f6Fe80d7186842A0
NEXT_PUBLIC_FEE_VAULT=0x070299400A86822D298A7565Cf2aeeb599ec9201
NEXT_PUBLIC_DEX_FACTORY=0x02a9b3dd27C38497F97FdE5279220F403eF2F5d2
```

## Run

```bash
pnpm install
pnpm dev
```
