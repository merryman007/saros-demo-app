# Add liquidity

## Oveview

This walkthrough demonstrates how to inject liquidity into a Saros DLMM liquidity pool through your frontend integration. The two primary flows are:

* **Opening a new position** when none exists
* **Augmenting an existing position**

Key steps in both flows:

1. Compute token amounts to deposit
2. Invoke the relevant on‑chain instruction

## Creating a New Position

To create a new liquidity position, you'll need to:

1. Determine the bin range for the position by specifying relative bin IDs from the active bin:
   * `relative_bin_id_left`: The leftmost bin ID relative to the active bin
   * `relative_bin_id_right`: The rightmost bin ID relative to the active bin
2. Call the `create_position` instruction with these parameters
3. After creating the position, you can add liquidity using the `increase_position` instruction

### Example Implementation

```
import { createMint } from "@solana/spl-token";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { BN } from "@project-serum/anchor";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";

// Create a new position
const relativeBinIdLeft = -5;  // 5 bins to the left of active bin
const relativeBinIdRight = 5;  // 5 bins to the right of active bin

// Create position mint first
const positionMint = await createMint(
  connection,
  wallet.payer,
  wallet.publicKey,
  null,
  0,
  undefined,
  undefined,
  TOKEN_2022_PROGRAM_ID
);

// Derive PDAs
const [positionPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("position"), positionMint.toBuffer()],
  program.programId
);

const [positionTokenAccount] = PublicKey.findProgramAddressSync(
  [
    wallet.publicKey.toBuffer(),
    TOKEN_2022_PROGRAM_ID.toBuffer(),
    positionMint.toBuffer(),
  ],
  ASSOCIATED_TOKEN_PROGRAM_ID
);

await program.methods
  .createPosition(new BN(relativeBinIdLeft), new BN(relativeBinIdRight))
  .accounts({
    pair: pairPda,
    position: positionPda,
    positionMint: positionMint,
    positionTokenAccount: positionTokenAccount,
    user: wallet.publicKey,
    systemProgram: SystemProgram.programId,
    tokenProgram: TOKEN_2022_PROGRAM_ID,
    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
  })
  .signers([positionMint])
  .rpc();

// Add liquidity to the position
const amountX = new BN(1000000); // Amount of token X
const amountY = new BN(1000000); // Amount of token Y

// Define liquidity distribution across bins
const liquidityDistribution = [
  { relativeBinId: -5, distributionX: 1000, distributionY: 0 },
  { relativeBinId: -4, distributionX: 2000, distributionY: 0 },
  { relativeBinId: -3, distributionX: 3000, distributionY: 0 },
  { relativeBinId: -2, distributionX: 2000, distributionY: 0 },
  { relativeBinId: -1, distributionX: 1000, distributionY: 0 },
  { relativeBinId: 0, distributionX: 500, distributionY: 500 },
  { relativeBinId: 1, distributionX: 0, distributionY: 1000 },
  { relativeBinId: 2, distributionX: 0, distributionY: 2000 },
  { relativeBinId: 3, distributionX: 0, distributionY: 3000 },
  { relativeBinId: 4, distributionX: 0, distributionY: 2000 },
  { relativeBinId: 5, distributionX: 0, distributionY: 1000 },
];

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
  .increasePosition(amountX, amountY, liquidityDistribution)
  .accounts({
    pair: pairPda,
    position: positionPda,
    binArrayLower: binArrayLowerPda,
    binArrayUpper: binArrayUpperPda,
    tokenMintX: tokenMintX,
    tokenMintY: tokenMintY,
    tokenVaultX: tokenVaultXPda,
    tokenVaultY: tokenVaultYPda,
    userVaultX: userVaultXPda,
    userVaultY: userVaultYPda,
    positionTokenAccount: positionTokenAccount,
    tokenProgramX: TOKEN_2022_PROGRAM_ID,
    tokenProgramY: TOKEN_2022_PROGRAM_ID,
    positionTokenProgram: TOKEN_2022_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
    memoProgram: MEMO_PROGRAM_ID,
  })
  .remainingAccounts([
    { pubkey: pairPda, isWritable: false, isSigner: false },
    { pubkey: binArrayLowerPda, isWritable: false, isSigner: false },
    { pubkey: binArrayUpperPda, isWritable: false, isSigner: false },
  ])
  .rpc();
​
```

### Increasing an Existing Position

To add more liquidity to an existing position:

1. Calculate the amounts of tokens X and Y to add
2. Define the liquidity distribution across bins
3. Call the `increase_position` instruction with:
   * `amountX`: Amount of token X to add
   * `amountY`: Amount of token Y to add
   * `liquidityDistribution`: Array of `BinLiquidityDistribution` objects specifying how to distribute liquidity across bins

### Liquidity Distribution Format

The `liquidityDistribution` parameter is an array of objects with the following structure:

```
interface BinLiquidityDistribution {
  relativeBinId: number;    // Relative bin ID from active bin
  distributionX: number;    // Distribution of token X (0-10000)
  distributionY: number;    // Distribution of token Y (0-10000)
}
```

Notes:

* The distribution values are in basis points (0-10000)
* For bins with negative relative IDs, only token X can be distributed
* For bins with positive relative IDs, only token Y can be distributed
* The active bin (relativeBinId = 0) can receive both tokens
* The sum of distributions should equal 10000 (100%)
