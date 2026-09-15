export const ACCESS_MAX_USES = 10;
export const ACCESS_VALID_DAYS = 7;

export type AccessCodeStatus = 'available' | 'issued' | 'active' | 'exhausted' | 'expired' | 'disabled';

export interface AccessCodeState {
  status: AccessCodeStatus;
  maxUses: number;
  usedCount: number;
  issuedAt?: string | null;
  redeemedAt?: string | null;
  expiresAt?: string | null;
}

export interface AccessQuotaState {
  maxUses: number;
  usedCount: number;
  reservedCount?: number;
}

export interface DigestAdapter {
  hmacSha256(secret: string, message: string): Promise<string> | string;
}

const CODE_PREFIX = 'TCO';
const CODE_BODY_PATTERN = /^[A-Z0-9]{12}$/;
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

export function normalizeRedemptionCode(input: string): string | null {
  const compact = input.trim().toUpperCase().replace(/[\s-]+/g, '');
  const hasPrefix = compact.startsWith(CODE_PREFIX) && compact.length === CODE_PREFIX.length + 12;
  const body = hasPrefix ? compact.slice(CODE_PREFIX.length) : compact;

  if (!CODE_BODY_PATTERN.test(body)) return null;

  return `${CODE_PREFIX}-${body.slice(0, 4)}-${body.slice(4, 8)}-${body.slice(8, 12)}`;
}

export function isValidRedemptionCode(input: string): boolean {
  return normalizeRedemptionCode(input) !== null;
}

export function calculateAccessExpiry(redeemedAt: Date, validDays = ACCESS_VALID_DAYS): Date {
  return new Date(redeemedAt.getTime() + validDays * 24 * 60 * 60 * 1000);
}

export function deriveAccessStatus(record: AccessCodeState, now = new Date()): AccessCodeStatus {
  if (record.status === 'disabled') return 'disabled';
  if (record.status === 'expired') return 'expired';
  if (record.status === 'exhausted') return 'exhausted';
  if (record.expiresAt && Date.parse(record.expiresAt) <= now.getTime()) return 'expired';
  if (record.usedCount >= record.maxUses) return 'exhausted';
  if (record.redeemedAt) return 'active';
  if (record.issuedAt || record.status === 'issued') return 'issued';
  return 'available';
}

export function reserveUse(quota: AccessQuotaState): AccessQuotaState | null {
  const reservedCount = quota.reservedCount ?? 0;
  if (quota.usedCount + reservedCount >= quota.maxUses) return null;

  return {
    ...quota,
    reservedCount: reservedCount + 1,
  };
}

export function consumeReservedUse(quota: AccessQuotaState): AccessQuotaState {
  const reservedCount = quota.reservedCount ?? 0;
  if (reservedCount <= 0) return quota;

  return {
    ...quota,
    usedCount: quota.usedCount + 1,
    reservedCount: reservedCount - 1,
  };
}

export function releaseReservedUse(quota: AccessQuotaState): AccessQuotaState {
  const reservedCount = quota.reservedCount ?? 0;
  if (reservedCount <= 0) return quota;

  return {
    ...quota,
    reservedCount: reservedCount - 1,
  };
}

export function isValidIdempotencyKey(input: string): boolean {
  return IDEMPOTENCY_KEY_PATTERN.test(input);
}

export async function createKeyedDigest(
  redemptionCode: string,
  secret: string,
  crypto: DigestAdapter,
): Promise<string> {
  const normalized = normalizeRedemptionCode(redemptionCode);
  if (!normalized) throw new Error('Invalid redemption code');

  return crypto.hmacSha256(secret, normalized);
}
