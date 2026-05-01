export const TENANT_COOKIE = 'fg_tenant_id';
export const TENANT_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
export const INVITE_EXPIRY_DAYS = 7;
export const INVITE_TOKEN_BYTES = 32;

export const PUBLIC_ROUTE_PATTERNS: RegExp[] = [
  /^\/login$/,
  /^\/forgot-password$/,
  /^\/reset-password$/,
  /^\/accept-invite\/.+$/,
  /^\/api\/auth\/.+$/,
];
