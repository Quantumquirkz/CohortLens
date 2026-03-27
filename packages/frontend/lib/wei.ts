export function toWeiBigInt(value: number | string | bigint): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "string") {
    const normalized = value.trim();
    if (!normalized) return 0n;
    try {
      return BigInt(normalized);
    } catch {
      return 0n;
    }
  }
  if (!Number.isFinite(value)) return 0n;
  return BigInt(Math.max(0, Math.trunc(value)));
}
