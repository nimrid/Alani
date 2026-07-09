const { Connection, PublicKey, Keypair, SystemProgram, Transaction, TransactionInstruction, sendAndConfirmTransaction } = require('@solana/web3.js');
const { getAssociatedTokenAddressSync, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, createAssociatedTokenAccountIdempotentInstruction } = require('@solana/spl-token');
const nacl = require('tweetnacl');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  
  const secret = process.env.DEV_WALLET_SECRET;
  if (!secret) throw new Error("Missing DEV_WALLET_SECRET");
  const wallet = Keypair.fromSecretKey(Buffer.from(secret, 'base64'));
  console.log("Wallet:", wallet.publicKey.toBase58());

  const balance = await connection.getBalance(wallet.publicKey);
  console.log("Balance:", balance / 1e9, "SOL");
  if (balance < 0.01 * 1e9) {
    console.error("\n[!] INSUFFICIENT SOL: Please fund the wallet before running this script.");
    process.exit(1);
  }

  const programId = new PublicKey('6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J');
  const txlTokenMint = new PublicKey('4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG');

  const [pricingMatrixPda] = PublicKey.findProgramAddressSync([Buffer.from("pricing_matrix")], programId);
  const [tokenTreasuryPda] = PublicKey.findProgramAddressSync([Buffer.from("token_treasury_v2")], programId);
  
  const tokenTreasuryVault = getAssociatedTokenAddressSync(txlTokenMint, tokenTreasuryPda, true, TOKEN_2022_PROGRAM_ID);
  const userTokenAccount = getAssociatedTokenAddressSync(txlTokenMint, wallet.publicKey, false, TOKEN_2022_PROGRAM_ID);

  console.log("Executing subscribe on-chain...");
  
  const tx = new Transaction();
  const ataInfo = await connection.getAccountInfo(userTokenAccount);
  if (!ataInfo) {
    console.log("Creating user ATA...");
    tx.add(
      createAssociatedTokenAccountIdempotentInstruction(
        wallet.publicKey,
        userTokenAccount,
        wallet.publicKey,
        txlTokenMint,
        TOKEN_2022_PROGRAM_ID
      )
    );
  }

  // Subscribe Instruction
  const discriminator = Buffer.from([254, 28, 191, 138, 156, 179, 183, 53]);
  const serviceLevelIdBuf = Buffer.alloc(2);
  serviceLevelIdBuf.writeUInt16LE(1, 0); // Service Level 12
  const weeksBuf = Buffer.from([4]); // 4 weeks
  const data = Buffer.concat([discriminator, serviceLevelIdBuf, weeksBuf]);

  const keys = [
    { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
    { pubkey: pricingMatrixPda, isSigner: false, isWritable: false },
    { pubkey: txlTokenMint, isSigner: false, isWritable: false },
    { pubkey: userTokenAccount, isSigner: false, isWritable: true },
    { pubkey: tokenTreasuryVault, isSigner: false, isWritable: true },
    { pubkey: tokenTreasuryPda, isSigner: false, isWritable: false },
    { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }
  ];

  tx.add(new TransactionInstruction({ programId, keys, data }));

  const txSig = await sendAndConfirmTransaction(connection, tx, [wallet], { commitment: 'confirmed' });
  console.log("Subscription TxSig:", txSig);

  // Now hit the activation API
  console.log("Getting guest JWT from devnet...");
  const res1 = await fetch('https://txline-dev.txodds.com/auth/guest/start', { method: 'POST' });
  const { token: jwt } = await res1.json();
  if (!jwt) throw new Error("Failed to get JWT");

  console.log("Signing activation message...");
  const msg = `${txSig}::${jwt}`;
  const signatureBytes = nacl.sign.detached(Buffer.from(msg), wallet.secretKey);
  const walletSignature = Buffer.from(signatureBytes).toString('base64');

  console.log("Activating API Token...");
  const res2 = await fetch('https://txline-dev.txodds.com/api/token/activate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwt}`
    },
    body: JSON.stringify({
      walletPublicKey: wallet.publicKey.toBase58(),
      walletSignature,
      txSig
    })
  });
  
  if (!res2.ok) {
    console.error("Activation failed:", res2.status, await res2.text());
    process.exit(1);
  }
  
  const apiToken = await res2.text();
  console.log("Activation Success! API Token acquired.");

  // Save to .env.local
  let envContent = fs.readFileSync('.env.local', 'utf8');
  envContent += `\n# Devnet TxLINE Auth\nTXLINE_DEV_JWT=${jwt}\nTXLINE_DEV_API_TOKEN=${apiToken}\n`;
  fs.writeFileSync('.env.local', envContent);
  console.log("Saved TXLINE_DEV_JWT and TXLINE_DEV_API_TOKEN to .env.local");
}

main().catch(err => console.error(err));
