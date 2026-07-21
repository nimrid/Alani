import { Connection, PublicKey, TransactionInstruction } from "@solana/web3.js";
import { AnchorProvider, BN } from "@coral-xyz/anchor";
import { Transaction } from "@solana/web3.js";
import { getTxLineProgram, getDailyScoresPda } from "./solana";
import { supabase } from "./supabase";

// Solana Memo program — a built-in program, no install required.
// Writes arbitrary UTF-8 data into a transaction permanently on-chain.
const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

function buildMemoInstruction(memoText: string, signerPubkey: PublicKey): TransactionInstruction {
  return new TransactionInstruction({
    keys: [{ pubkey: signerPubkey, isSigner: true, isWritable: false }],
    programId: MEMO_PROGRAM_ID,
    data: Buffer.from(memoText, 'utf8'),
  });
}

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

  // 1. Try to fetch TxLINE Merkle proof
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
    // TxLINE Merkle proof unavailable (common on devnet — proof data is sparse).
    // Record a real Memo transaction instead of a fake self-transfer so the fan
    // moment is genuinely on-chain and viewable in the devnet Explorer.
    console.info("TxLINE Merkle proof unavailable — recording fan moment via Solana Memo program.");

    const memoPayload = JSON.stringify({
      app: 'Alani',
      fixture: fixtureId,
      event: eventType,
      ts: eventTs,
      minute: eventMinute,
      epoch_day: epochDay,
    });

    const tx = new Transaction().add(
      buildMemoInstruction(memoPayload, wallet.publicKey)
    );
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    tx.feePayer = wallet.publicKey;

    const signedTx = await wallet.signTransaction(tx);
    txId = await connection.sendRawTransaction(signedTx.serialize());

  } else {
    // Full TxLINE Merkle proof path — verifies the event against the on-chain
    // daily_scores_roots PDA via TxLINE's own Solana program.
    const { fixtureProof, mainTreeProof, fixtureSummary } = proofData;

    // 2. Setup Anchor
    const provider = new AnchorProvider(connection, wallet, {});
    const program = getTxLineProgram(provider);
    const dailyScoresPda = getDailyScoresPda(epochDay);

    // 3. Map event type to TxLINE StatTerm variant
    let statTermVariant = '';
    switch (eventType.toUpperCase()) {
      case 'GOAL':        statTermVariant = 'goalsSoccer'; break;
      case 'OWN_GOAL':   statTermVariant = 'goalsSoccer'; break;
      case 'RED_CARD':   statTermVariant = 'redCardsSoccer'; break;
      case 'YELLOW_CARD':statTermVariant = 'yellowCardsSoccer'; break;
      case 'FOUL':       statTermVariant = 'foulsSoccer'; break;
      case 'OFFSIDE':    statTermVariant = 'offsidesSoccer'; break;
      case 'SHOT':       statTermVariant = 'shotsOnTargetSoccer'; break;
      default:           statTermVariant = 'goalsSoccer';
    }
    const statTerm = { [statTermVariant]: {} };

    // 4. Build and send validateStat transaction
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
      // Memo-path moments are real on-chain txs but not Merkle-verified by TxLINE's program
      verified: !isDemoBypass,
    });

    // 6. Update Form Score
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

    // 7. Notify UI
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('alani_form_score_updated'));
    }

    return txId;

  } catch (err: any) {
    console.error("On-chain validation failed:", err);
    throw new Error("Failed to verify on-chain: " + err.message);
  }
}
