# Create a pair

### Overview

This guide outlines how to establish a new token pair on a Saros DLMM pool via your frontend. The workflow is encapsulated in a single user transaction and includes:

1. **Deriving required PDAs** (Program Derived Addresses)
2. **Creating the quote asset badge**
3. **Initializing the pool pair**
4. **Setting up the bin arrays**

### Deriving PDAs

Before creating a pair, you need to derive several PDAs:

```
import { PublicKey } from "@solana/web3.js";
import { BN } from "@project-serum/anchor";
import { utils } from "@coral-xyz/anchor";

// Configuration PDA
const config = new PublicKey("address");

// Token mints
const tokenX = new PublicKey("address");
const tokenY = new PublicKey("address");

const BIN_STEP = 20;

const BIN_ARRAY_INDEX = 0; // Example value

const ACTIVE_ID = 8388608; // Example value (2^23)

// Derive bin step config PDA
const [binStepConfig] = PublicKey.findProgramAddressSync(
  [
    Buffer.from(utils.bytes.utf8.encode("bin_step_config")),
    config.toBuffer(),
    new Uint8Array([BIN_STEP]),
  ],
  program.programId
);

// Derive quote asset badge PDA
const [quoteAssetBadge] = PublicKey.findProgramAddressSync(
  [
    Buffer.from(utils.bytes.utf8.encode("quote_asset_badge")),
    config.toBuffer(),
    tokenY.toBuffer(),
  ],
  program.programId
);

// Derive pair PDA
const [pair] = PublicKey.findProgramAddressSync(
  [
    Buffer.from(utils.bytes.utf8.encode("pair")),
    config.toBuffer(),
    tokenX.toBuffer(),
    tokenY.toBuffer(),
    new Uint8Array([BIN_STEP]),
  ],
  program.programId
);

// Derive bin array PDAs
const [binArrayLower] = PublicKey.findProgramAddressSync(
  [
    Buffer.from(utils.bytes.utf8.encode("bin_array")),
    pair.toBuffer(),
    new BN(BIN_ARRAY_INDEX).toArrayLike(Buffer, "le", 4),
  ],
  program.programId
);

const [binArrayUpper] = PublicKey.findProgramAddressSync(
  [
    Buffer.from(utils.bytes.utf8.encode("bin_array")),
    pair.toBuffer(),
    new BN(BIN_ARRAY_INDEX + 1).toArrayLike(Buffer, "le", 4),
  ],
  program.programId
);

```

### Creating Token Vaults

For the pair to function, you need to create token vaults for both tokens:

```
import { getOrCreateAssociatedTokenAccount } from "@solana/spl-token";

// Create token vaults for the pair
const pairVaultX = await getOrCreateAssociatedTokenAccount(
  connection,
  wallet.payer,
  tokenX,
  pair,
  true
);

const pairVaultY = await getOrCreateAssociatedTokenAccount(
  connection,
  wallet.payer,
  tokenY,
  pair,
  true
);

```

### Initializing the Quote Asset Badge

The quote asset badge identifies which token is the quote asset (token Y):

```
// Initialize quote asset badge
await program.methods
  .initializeQuoteAssetBadge()
  .accounts({
    quoteAssetBadge: quoteAssetBadge,
    liquidityBookConfig: config,
    tokenMint: tokenY,
    presetAuthority: wallet.publicKey,
  })
  .signers([wallet.payer])
  .rpc();
```

### Initializing the Pair

Now you can initialize the pair with the specified active binitializeConfigD:

```
// Initialize pair
await program.methods
  .initializePair(new BN(ACTIVE_ID))
  .accounts({
    liquidityBookConfig: config,
    binStepConfig: binStepConfig,
    quoteAssetBadge: quoteAssetBadge,
    pair: pair,
    tokenMintX: tokenX,
    tokenMintY: tokenY,
    user: wallet.publicKey,
  })
  .signers([wallet.payer])
  .rpc();

```

### Initializing Bin Arrays

Finally, you need to initialize the bin arrays for the pair:

```
// Initialize lower bin array
await program.methods
  .initializeBinArray(new BN(BIN_ARRAY_INDEX))
  .accounts({
    pair: pair,
    binArray: binArrayLower,
    user: wallet.publicKey,
  })
  .signers([wallet.payer])
  .rpc();

// Initialize upper bin array
await program.methods
  .initializeBinArray(new BN(BIN_ARRAY_INDEX + 1))
  .accounts({
    pair: pair,
    binArray: binArrayUpper,
    user: wallet.publicKey,
  })
  .signers([wallet.payer])
  .rpc();
```

### Complete End-to-End Example

Below is a consolidated script that ties together all the preceding steps:

```
import { PublicKey } from "@solana/web3.js";
import { BN, Program, utils } from "@coral-xyz/anchor";
import { getOrCreateAssociatedTokenAccount } from "@solana/spl-token";

// Configuration
const config = new PublicKey("9aXo79uWCtxxxmssuTmAjCSGyP1sMxhQZdKZhrcMxGzz");
const tokenX = new PublicKey("FtJADTW8HSB4t6QQ4WsR8kcrrZ6oVaoVJk7KEWQZDJqt");
const tokenY = new PublicKey("Chc7CkBPvBsyNAmxAcupVox6pB5wcU2yuXD5PJAqQteb");
const BIN_STEP = 20;
const BIN_ARRAY_INDEX = 0;
const ACTIVE_ID = 8388608;

// Derive PDAs
const [binStepConfig] = PublicKey.findProgramAddressSync(
  [
    Buffer.from(utils.bytes.utf8.encode("bin_step_config")),
    config.toBuffer(),
    new Uint8Array([BIN_STEP]),
  ],
  program.programId
);

const [quoteAssetBadge] = PublicKey.findProgramAddressSync(
  [
    Buffer.from(utils.bytes.utf8.encode("quote_asset_badge")),
    config.toBuffer(),
    tokenY.toBuffer(),
  ],
  program.programId
);

const [pair] = PublicKey.findProgramAddressSync(
  [
    Buffer.from(utils.bytes.utf8.encode("pair")),
    config.toBuffer(),
    tokenX.toBuffer(),
    tokenY.toBuffer(),
    new Uint8Array([BIN_STEP]),
  ],
  program.programId
);

const [binArrayLower] = PublicKey.findProgramAddressSync(
  [
    Buffer.from(utils.bytes.utf8.encode("bin_array")),
    pair.toBuffer(),
    new BN(BIN_ARRAY_INDEX).toArrayLike(Buffer, "le", 4),
  ],
  program.programId
);

const [binArrayUpper] = PublicKey.findProgramAddressSync(
  [
    Buffer.from(utils.bytes.utf8.encode("bin_array")),
    pair.toBuffer(),
    new BN(BIN_ARRAY_INDEX + 1).toArrayLike(Buffer, "le", 4),
  ],
  program.programId
);

// Create token vaults
const pairVaultX = await getOrCreateAssociatedTokenAccount(
  connection,
  wallet.payer,
  tokenX,
  pair,
  true
);

const pairVaultY = await getOrCreateAssociatedTokenAccount(
  connection,
  wallet.payer,
  tokenY,
  pair,
  true
);

// Initialize quote asset badge
await program.methods
  .initializeQuoteAssetBadge()
  .accounts({
    quoteAssetBadge: quoteAssetBadge,
    liquidityBookConfig: config,
    tokenMint: tokenY,
    presetAuthority: wallet.publicKey,
  })
  .signers([wallet.payer])
  .rpc();

// Initialize pair
await program.methods
  .initializePair(new BN(ACTIVE_ID))
  .accounts({
    liquidityBookConfig: config,
    binStepConfig: binStepConfig,
    quoteAssetBadge: quoteAssetBadge,
    pair: pair,
    tokenMintX: tokenX,
    tokenMintY: tokenY,
    user: wallet.publicKey,
  })
  .signers([wallet.payer])
  .rpc();

// Initialize bin arrays
await program.methods
  .initializeBinArray(new BN(BIN_ARRAY_INDEX))
  .accounts({
    pair: pair,
    binArray: binArrayLower,
    user: wallet.publicKey,
  })
  .signers([wallet.payer])
  .rpc();

await program.methods
  .initializeBinArray(new BN(BIN_ARRAY_INDEX + 1))
  .accounts({
    pair: pair,
    binArray: binArrayUpper,
    user: wallet.publicKey,
  })
  .signers([wallet.payer])
  .rpc();

console.log("Pair created successfully!");
console.log("Pair address:", pair.toBase58());
console.log("Bin array lower address:", binArrayLower.toBase58());
console.log("Bin array upper address:", binArrayUpper.toBase58());
```
