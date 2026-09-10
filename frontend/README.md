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

After deploying (`implementation/scripts/01-…` through `11-…`, or `deploy-reflow.ts`), copy addresses into `app/config/addresses.json` or set:

```
NEXT_PUBLIC_CORE=
NEXT_PUBLIC_BONDING_CURVE_FACTORY=
NEXT_PUBLIC_DEX_ROUTER=
NEXT_PUBLIC_LP_VAULT=
NEXT_PUBLIC_ACTIVITY_MONITOR=
NEXT_PUBLIC_GOVERNOR=
NEXT_PUBLIC_WNATIVE=
NEXT_PUBLIC_FEE_VAULT=
NEXT_PUBLIC_DEX_FACTORY=
```

## Run

```bash
pnpm install
pnpm dev
```
