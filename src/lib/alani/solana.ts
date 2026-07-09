import { PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider, Idl } from "@coral-xyz/anchor";
import devnetIdl from "./devnet-idl.json";

export const TXLINE_DEVNET_PROGRAM_ID = new PublicKey("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J");

export function getTxLineProgram(provider: AnchorProvider) {
  return new Program(devnetIdl as Idl, provider);
}

export function getDailyScoresPda(epochDay: number) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(epochDay);
  
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("daily_scores_roots"),
      buffer
    ],
    TXLINE_DEVNET_PROGRAM_ID
  );
  return pda;
}
