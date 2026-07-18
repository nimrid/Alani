import { Connection } from "@solana/web3.js";
import { AnchorProvider, BN } from "@coral-xyz/anchor";
import { Transaction, SystemProgram } from "@solana/web3.js";
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
  let isDemoBypass = false;
  let proofData = null;
  try {
    const res = await fetch(`/api/txline/proof?fixtureId=${fixtureId}&epochDay=${epochDay}&ts=${eventTs}`);
    if (!res.ok) {
      isDemoBypass = true;
    } else {
      proofData = await res.json();
      if (!proofData || !proofData.fixtureProof) isDemoBypass = true;
    }
  } catch (e) {
    isDemoBypass = true;
  }

  const connection = new Connection("https://api.devnet.solana.com");
  let txId = "";

  if (isDemoBypass) {
    console.warn("Demo mode: Proof not found on TxLINE network. Bypassing Anchor validation for UI demo.");
    const tx = new Transaction().add(SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: wallet.publicKey,
      lamports: 100 // dummy
    }));
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    tx.feePayer = wallet.publicKey;
    
    // Request Signature for UX demo
    await wallet.signTransaction(tx);
    txId = "demo_tx_" + Math.random().toString(36).slice(2);
  } else {
    const { fixtureProof, mainTreeProof, fixtureSummary } = proofData;

    // 2. Setup Anchor
    const provider = new AnchorProvider(connection, wallet, {});
    const program = getTxLineProgram(provider);

    const dailyScoresPda = getDailyScoresPda(epochDay);

    // Determine StatTerm based on event_type.
    let statTermVariant = '';
    switch (eventType.toUpperCase()) {
      case 'GOAL': statTermVariant = 'goalsSoccer'; break;
      case 'OWN_GOAL': statTermVariant = 'goalsSoccer'; break;
      case 'RED_CARD': statTermVariant = 'redCardsSoccer'; break;
      case 'YELLOW_CARD': statTermVariant = 'yellowCardsSoccer'; break;
      case 'FOUL': statTermVariant = 'foulsSoccer'; break;
      case 'OFFSIDE': statTermVariant = 'offsidesSoccer'; break;
      case 'SHOT': statTermVariant = 'shotsOnTargetSoccer'; break;
      default: statTermVariant = 'goalsSoccer'; // fallback
    }
    const statTerm = { [statTermVariant]: {} };

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
    txId = await connection.sendRawTransaction(signedTx.serialize());
  }

  try {
    // 5. Store in Supabase
    await supabase.from('fan_events').insert({
      wallet_address: wallet.publicKey.toBase58(),
      fixture_id: fixtureId,
      event_type: eventType,
      event_ts: eventTs,
      event_minute: eventMinute,
      proof_hash: txId,
      on_chain_tx: txId,
      // Demo bypass: not a real on-chain verification — mark accordingly
      verified: !isDemoBypass,
    });

    // Update Form Score in profile
    const { data: profile } = await supabase
      .from('fan_profiles')
      .select('form_score')
      .eq('wallet_address', wallet.publicKey.toBase58())
      .single();

    if (profile) {
      await supabase
        .from('fan_profiles')
        .update({ form_score: (profile.form_score || 0) + 15 })
        .eq('wallet_address', wallet.publicKey.toBase58());
    }

    // Notify UI to update
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('alani_form_score_updated'));
    }

    return txId;

  } catch (err: any) {
    console.error("On-chain validation failed:", err);
    throw new Error("Failed to verify on-chain: " + err.message);
  }
}
