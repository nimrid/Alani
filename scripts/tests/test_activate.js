const { Keypair } = require('@solana/web3.js');
const nacl = require('tweetnacl');

async function test() {
  const txSig = '4mK3aC1J8v1u3W6WwY3DkV3W2QvA3Q1v3W6WwY3DkV3W2QvA3Q1v3W6WwY3DkV3W2QvA3Q1v3W6WwY3DkV3W2Qv';
  const kp = Keypair.generate();
  
  const res1 = await fetch('https://txline.txodds.com/auth/guest/start', { method: 'POST' });
  const { token: jwt } = await res1.json();
  
  const msg = `${txSig}::${jwt}`;
  const signatureBytes = nacl.sign.detached(Buffer.from(msg), kp.secretKey);
  const signature = Buffer.from(signatureBytes).toString('base64');
  
  const res2 = await fetch('https://txline.txodds.com/api/token/activate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwt}`
    },
    body: JSON.stringify({
      walletPublicKey: kp.publicKey.toBase58(),
      walletSignature: signature,
      txSig
    })
  });
  console.log(res2.status, await res2.text());
}
test();
