/**
 * TxLINE Auth Module
 *
 * Step 1: Get guest JWT from /auth/guest/start
 * Step 2: Subscribe on-chain (free tier, service level 1 or 12)
 * Step 3: Sign activation message with wallet
 * Step 4: Activate API token at /api/token/activate
 * Step 5: Store JWT + apiToken — both required on every data call
 *
 * JWT expires in 30 days. Refresh on 401.
 * X-Api-Token is tied to the subscription period.
 *
 * Free tier endpoints:
 *   Service level 1  = World Cup + Int Friendlies, 60s delay
 *   Service level 12 = World Cup + Int Friendlies, real-time
 *
 * Use service level 12 for the best fan experience.
 * Both cost 0 TxL — no purchase required.
 */

export const TXLINE_CONFIG = {
  apiOrigin: process.env.TXLINE_API_ORIGIN!,
  apiBase: process.env.TXLINE_API_BASE!,
  programId: '9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA', // mainnet
  txlMint: 'Zhw9TVKp68a1QrftncMSd6ELXKDtpVMNuMGr1jNwdeL',   // mainnet
  serviceLevelId: 12,    // real-time World Cup free tier
  durationWeeks: 4,
  selectedLeagues: [] as number[], // empty = standard bundle
}

export async function getGuestJWT(): Promise<string> {
  const res = await fetch(`${TXLINE_CONFIG.apiOrigin}/auth/guest/start`, {
    method: 'POST',
  })
  
  if (!res.ok) {
      throw new Error(`Failed to fetch guest JWT: ${res.statusText}`)
  }

  const data = await res.json()
  return data.token
}

export function buildTxLineHeaders(jwt: string, apiToken: string) {
  return {
    'Authorization': `Bearer ${jwt}`,
    'X-Api-Token': apiToken,
  }
}
