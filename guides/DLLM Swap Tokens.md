# Swap tokens

### Overview

This guide walks through how to exchange tokens in a Saros DLMM pool from your frontend interface. The steps are:

1. Define swap parameters
2. Invoke the on-chain `swap` instruction

### Swap Types

There are two types of swaps available:

1. **Exact Input**: You specify the exact amount of tokens you want to swap in, and receive the corresponding amount of tokens out
2. **Exact Output**: You specify the exact amount of tokens you want to receive, and provide the corresponding amount of tokens in

### Swap Direction

Swaps can be performed in two directions:

1. **Swap for Y**: Swap token X for token Y
2. **Swap for X**: Swap token Y for token X

### Example Code <a href="#exact-input-swap" id="exact-input-swap"></a>

#### Exact Input Swap <a href="#exact-input-swap" id="exact-input-swap"></a>

```
import { PublicKey } from "@solana/web3.js";
import { BN } from "@project-serum/anchor";
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";

// Define the amount of tokens to swap in
const amountIn = new BN(1000000); // Amount of token X or Y to swap in

// Define the minimum amount of tokens to receive (0 for no minimum)
const otherAmountThreshold = new BN(0);

// Set the swap direction (true for X to Y, false for Y to X)
const swapForY = true;

// Derive bin array PDAs
const [binArrayLowerPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("bin_array"), pairPda.toBuffer(), Buffer.from([0])],
  program.programId
);

const [binArrayUpperPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("bin_array"), pairPda.toBuffer(), Buffer.from([1])],
  program.programId
);

await program.methods
  .swap(amountIn, otherAmountThreshold, swapForY, { exactInput: {} })
  .accounts({
    pair: pairPda,
    binArrayLower: binArrayLowerPda,
    binArrayUpper: binArrayUpperPda,
    tokenMintX: tokenMintX,
    tokenMintY: tokenMintY,
    tokenVaultX: tokenVaultXPda,
    tokenVaultY: tokenVaultYPda,
    userVaultX: userVaultXPda,
    userVaultY: userVaultYPda,
    tokenProgramX: TOKEN_PROGRAM_ID,
    tokenProgramY: TOKEN_PROGRAM_ID,
    user: wallet.publicKey,
  })
  .signers([wallet.payer])
  .rpc();

```

#### Exact Output Swap

```
import { PublicKey } from "@solana/web3.js";
import { BN } from "@project-serum/anchor";
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";

// Define the amount of tokens to receive
const amountOut = new BN(1000000); // Amount of token to receive

// Define the maximum amount of tokens to provide
const otherAmountThreshold = new BN(2000000); // Maximum amount of token provide

// Set the swap direction (true for X to Y, false for Y to X)
const swapForY = false;

// Derive bin array PDAs
const [binArrayLowerPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("bin_array"), pairPda.toBuffer(), Buffer.from([0])],
  program.programId
);

const [binArrayUpperPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("bin_array"), pairPda.toBuffer(), Buffer.from([1])],
  program.programId
);

await program.methods
  .swap(amountOut, otherAmountThreshold, swapForY, { exactOutput: {} })
  .accounts({
    pair: pairPda,
    binArrayLower: binArrayLowerPda,
    binArrayUpper: binArrayUpperPda,
    tokenMintX: tokenMintX,
    tokenMintY: tokenMintY,
    tokenVaultX: tokenVaultXPda,
    tokenVaultY: tokenVaultYPda,
    userVaultX: userVaultXPda,
    userVaultY: userVaultYPda,
    tokenProgramX: TOKEN_PROGRAM_ID,
    tokenProgramY: TOKEN_PROGRAM_ID,
    user: wallet.publicKey,
  })
  .signers([wallet.payer])
  .rpc();

```

### How the Swap Executes

When you perform a swap, the following happens:

1. Tokens are transferred from user to the pool's vault
2. The swap is executed across one or more bins, starting from the active bin
3. If the swap cannot be completed in a single bin, the active bin is moved and the swap continues
4. Tokens are transferred from the pool's vault to user
5. Protocol fees are collected and stored in the pair account
