/** Phase 7 — addresses from env (set after local or testnet deploy). */

export const COHORT_ORACLE_ADDRESS = (process.env.NEXT_PUBLIC_COHORT_ORACLE_ADDRESS ??
  "") as `0x${string}`;
export const LENS_TOKEN_ADDRESS = (process.env.NEXT_PUBLIC_LENS_TOKEN_ADDRESS ??
  "") as `0x${string}`;
export const STAKING_ADDRESS = (process.env.NEXT_PUBLIC_STAKING_ADDRESS ?? "") as `0x${string}`;
export const COHORT_GOVERNOR_ADDRESS = (process.env.NEXT_PUBLIC_COHORT_GOVERNOR_ADDRESS ??
  "") as `0x${string}`;

export function tokenomicsConfigured(): boolean {
  return Boolean(
    COHORT_ORACLE_ADDRESS && LENS_TOKEN_ADDRESS && STAKING_ADDRESS,
  );
}

export function governanceConfigured(): boolean {
  return Boolean(COHORT_GOVERNOR_ADDRESS);
}
