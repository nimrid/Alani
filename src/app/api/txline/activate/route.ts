import { NextResponse } from 'next/server';

/**
 * POST /api/txline/activate
 *
 * Body: { walletPublicKey: string, txSig: string,
 *         walletSignature: string (base64) }
 *
 * Returns: { jwt: string, apiToken: string }
 *
 * The client:
 *   1. Calls subscribe() on-chain (via wallet adapter)
 *   2. Signs the activation message with their wallet
 *   3. POSTs txSig + walletSignature here
 *   4. Receives jwt + apiToken to store
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { walletPublicKey, txSig, walletSignature } = body;

    // TODO: Stage 6 - Implement actual on-chain verification and API token activation.
    // For now, we return a mock success response so we can test the flow.
    console.log('Activation requested for:', walletPublicKey);

    // Mock response for Stage 1 debug
    return NextResponse.json({
      jwt: 'mock-jwt-token',
      apiToken: 'mock-api-token'
    });
  } catch (error) {
    console.error('Activation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
