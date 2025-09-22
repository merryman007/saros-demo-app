/**
 * fetch_pools.js
 *
 * Usage:
 *   node fetch_pools.js
 *
 * Requires:
 *   npm install @saros-finance/dlmm-sdk @solana/web3.js node-fetch
 */

import fs from "fs";
import fetch from "node-fetch";
import { Connection } from "@solana/web3.js";
import { LiquidityBookServices, MODE } from "@saros-finance/dlmm-sdk";

// ---- CONFIG ----
const HELIUS_RPC = "https://mainnet.helius-rpc.com/?api-key=25eb7563-a303-4783-8e62-535586261018";
const BATCH_SIZE = 2;             // how many pools at once
const DELAY_BETWEEN_BATCH_MS = 2000; // wait between batches
const MAX_RETRIES = 3;            // retries per request
const RETRY_BASE_DELAY_MS = 1000; // exponential backoff base

const OUT_JSONL = "pools.jsonl";  // newline-delimited JSON
const OUT_TXT = "pools.txt";      // human readable

// ---- HELPERS ----
function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

async function withRetry(fn, maxRetries = MAX_RETRIES) {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (attempt > maxRetries) throw err;
      const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
      console.warn(`Retry ${attempt}/${maxRetries} in ${delay}ms...`, err.message || err);
      await sleep(delay);
    }
  }
}

function shorten(addr) {
  if (!addr) return "UNK";
  return addr.slice(0, 4) + "..." + addr.slice(-4);
}

// ---- MAIN ----
async function main() {
  console.log("Connecting to Helius RPC...");
  const connection = new Connection(HELIUS_RPC, "confirmed");

  const liquidityBookServices = new LiquidityBookServices({
    mode: MODE.MAINNET,
    connection,
  });

  // load token list
  console.log("Fetching token list...");
  const tokenListUrl =
    "https://raw.githubusercontent.com/solana-labs/token-list/main/src/tokens/solana.tokenlist.json";
  const tokenList = await fetch(tokenListUrl).then((r) => r.json());
  const mintToSymbol = new Map(
    tokenList.tokens.map((t) => [t.address, t.symbol])
  );
  console.log("Token list loaded:", mintToSymbol.size, "entries");

  // fetch pool addresses
  console.log("Fetching pool addresses...");
  const poolAddresses = await withRetry(() =>
    liquidityBookServices.fetchPoolAddresses()
  );
  console.log(`Found ${poolAddresses.length} pools`);

  // open files for append
  const jsonStream = fs.createWriteStream(OUT_JSONL, { flags: "a" });
  const txtStream = fs.createWriteStream(OUT_TXT, { flags: "a" });

  // process in batches
  for (let i = 0; i < poolAddresses.length; i += BATCH_SIZE) {
    const batch = poolAddresses.slice(i, i + BATCH_SIZE);
    console.log(
      `Batch ${i / BATCH_SIZE + 1}/${Math.ceil(poolAddresses.length / BATCH_SIZE)}`
    );

    const results = await Promise.all(
      batch.map((addr) =>
        withRetry(() => liquidityBookServices.fetchPoolMetadata(addr)).catch(
          (err) => {
            console.error("Failed for", addr, err.message || err);
            return null;
          }
        )
      )
    );

    for (const md of results) {
      if (!md) continue;
      const baseMint =
        md.tokenBase?.mintAddress ||
        md.tokenMintX ||
        md.tokenA ||
        md.baseMint;
      const quoteMint =
        md.tokenQuote?.mintAddress ||
        md.tokenMintY ||
        md.tokenB ||
        md.quoteMint;
      const baseSym = baseMint
        ? mintToSymbol.get(baseMint) || shorten(baseMint)
        : "UNK";
      const quoteSym = quoteMint
        ? mintToSymbol.get(quoteMint) || shorten(quoteMint)
        : "UNK";
      const poolName = `${baseSym}/${quoteSym}`;

      const rec = {
        poolName,
        poolAddress:
          md.address ||
          md.pair ||
          md.id ||
          (md.publicKey ? md.publicKey.toString() : null),
        raw: md,
      };

      jsonStream.write(JSON.stringify(rec) + "\n");
      txtStream.write(`${poolName} — ${rec.poolAddress}\n`);

      console.log("Saved:", poolName);
    }

    if (i + BATCH_SIZE < poolAddresses.length) {
      await sleep(DELAY_BETWEEN_BATCH_MS);
    }
  }

  jsonStream.end();
  txtStream.end();
  console.log("All done ✅");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
