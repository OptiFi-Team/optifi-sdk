# Optifi SDK

TypeScript interfaces for working with the on-chain Optifi system

## Configuration

Configuration variables can be specified either through environment variables,
or provided to `initializeContext` at runtime

**Optional Environment Variables**:

- `OPTIFI_WALLET`: the filepath of a Solana wallet
- `OPTIFI_PROGRAM_ID`: The ID of the on chain Optifi program to interact with