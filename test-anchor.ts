import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { AnchorProvider, BN, Program, Idl } from "@coral-xyz/anchor";
import devnetIdl from "./src/lib/alani/devnet-idl.json";
import { getTxLineProgram, getDailyScoresPda } from "./src/lib/alani/solana";

const connection = new Connection("https://api.devnet.solana.com");
const wallet = {
  publicKey: Keypair.generate().publicKey,
  signTransaction: async (tx: any) => tx,
  signAllTransactions: async (txs: any) => txs,
};
const provider = new AnchorProvider(connection, wallet as any, {});
const program = getTxLineProgram(provider);

async function test() {
  try {
    const tx = await program.methods.validateStat(
      new BN(123),
      { }, // summary
      [], // fixtureProof
      [], // mainTreeProof
      { goal: {} }, // stat_a
      null,
      null
    ).accounts({
      dailyScoresMerkleRoots: getDailyScoresPda(1),
    }).transaction();
    console.log("Success building transaction");
  } catch (err: any) {
    console.log("Error:", err.message);
  }
}
test();
