import { Connection } from "@solana/web3.js";
import { AnchorProvider, BN } from "@coral-xyz/anchor";
import { getTxLineProgram, getDailyScoresPda } from "./solana";
import { supabase } from "./supabase";

export async function generateEventProof(
  wallet: any,
  fixtureId: number,
  eventType: string,
  eventTs: number,
  eventMinute: number
) {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error("Wallet not connected");
  }

  const epochDay = Math.floor(eventTs / (24 * 60 * 60 * 1000));
  
  // 1. Fetch proof from proxy
  const res = await fetch(`/api/txline/proof?fixtureId=${fixtureId}&epochDay=${epochDay}&ts=${eventTs}`);
  if (!res.ok) throw new Error("Proof not found on TxLINE network");
  const proofData = await res.json();

  if (!proofData || !proofData.fixtureProof) {
    throw new Error("Invalid proof data");
  }

  const { fixtureProof, mainTreeProof, fixtureSummary } = proofData;

  // 2. Setup Anchor
  const connection = new Connection("https://api.devnet.solana.com");
  const provider = new AnchorProvider(connection, wallet, {});
  const program = getTxLineProgram(provider);

  const dailyScoresPda = getDailyScoresPda(epochDay);

  // Determine StatTerm based on event_type.
  // Assuming StatTerm is an enum with e.g. `goals: {}`, `corners: {}`, etc.
  const statTerm = { [eventType.toLowerCase()]: {} };

  try {
    // 3. Create Transaction
    const tx = await program.methods.validateStat(
      new BN(eventTs),
      fixtureSummary,
      fixtureProof,
      mainTreeProof,
      statTerm, // stat_a
      null,     // stat_b
      null      // predicate
    ).accounts({
      dailyScoresMerkleRoots: dailyScoresPda,
    }).transaction();

    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    tx.feePayer = wallet.publicKey;

    // 4. Request Signature
    const signedTx = await wallet.signTransaction(tx);
    const txId = await connection.sendRawTransaction(signedTx.serialize());
    
    // Optional: wait for confirmation
    // await connection.confirmTransaction(txId);

    // 5. Store in Supabase
    await supabase.from('fan_events').insert({
      wallet_address: wallet.publicKey.toBase58(),
      fixture_id: fixtureId,
      event_type: eventType,
      event_ts: eventTs,
      event_minute: eventMinute,
      proof_hash: txId, // Using txId as proof reference
      on_chain_tx: txId,
      verified: true
    });

    return txId;

  } catch (err: any) {
    console.error("On-chain validation failed:", err);
    throw new Error("Failed to verify on-chain: " + err.message);
  }
}
