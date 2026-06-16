# ZKGRM CPU Miner

CPU proof-of-work miner for ZKGRM giver contracts. It is based on the old GRM mining flow, but updated for the new ZKGRM contract interface.

## Proof Of Concept Notice

This repository is a Proof of Concept. It may contain bugs, edge cases, outdated assumptions, or platform-specific issues. Contributions are welcome: fixes, tests, docs, safer defaults, and platform notes help the whole community.

## Compatibility

- `get_pow_params` is read in the GRM-compatible format: `(seed, pow_complexity, amount, target_delta)`.
- The old `pow-miner` binary is still used.
- If `TARGET_ADDRESS` is set, the script appends the optional recipient ref expected by the new ZKGRM Miner contract without changing the legacy PoW hash.

## Setup

1. Install Node.js.
2. Put a compatible `pow-miner` binary in this directory.
3. Install dependencies: `yarn install` or `npm install`.
4. Create `.env`:

```env
MNEMONIC='word1 word2 ... word24'
ZKGRM_GIVERS='EQ_GIVER_1:100000000000,EQ_GIVER_2:1000000000000'
TARGET_ADDRESS=''
```

`ZKGRM_GIVERS` is required and must be a comma-separated list of `address:amount` pairs.

## Run

```bash
yarn start
```

## Production Notes

- Use a dedicated wallet with limited TON balance.
- Do not mine with a wallet that stores significant funds.
- Use multiple givers for better throughput; one giver processes messages sequentially.
- Every giver must be pre-funded with ZKGRM and marked as a `protocol` wallet by the ZKGRM minter.

## Russian Docs

See [INSTRUCTIONS_RU.md](INSTRUCTIONS_RU.md).
