const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IPV4_REGEX = /^(\d{1,3})(?:\.(\d{1,3})){3}$/;
const IPV6_LOOPBACK = new Set(['::1', '0:0:0:0:0:0:0:1']);

const DEFAULT_ALLOWED_IMAGE_HOST_PATTERNS = [
  '*.supabase.co',
  'images.unsplash.com',
] as const;

const readAllowedImageHostPatterns = () => {
  const raw = process.env.NEXT_PUBLIC_ALLOWED_IMAGE_HOSTS || '';
  const fromEnv = raw
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  const merged = [...DEFAULT_ALLOWED_IMAGE_HOST_PATTERNS, ...fromEnv];
  return Array.from(new Set(merged));
};

const isPrivateIpv4 = (hostname: string) => {
  const match = hostname.match(IPV4_REGEX);
  if (!match) return false;

  const segments = hostname.split('.').map((segment) => Number.parseInt(segment, 10));
  if (segments.length !== 4 || segments.some((segment) => !Number.isFinite(segment) || segment < 0 || segment > 255)) {
    return true;
  }

  const [first, second] = segments;

  if (first === 10 || first === 127) return true;
  if (first === 169 && second === 254) return true;
  if (first === 172 && second >= 16 && second <= 31) return true;
  if (first === 192 && second === 168) return true;

  return false;
};

const isPrivateIpv6 = (hostname: string) => {
  const normalized = hostname.toLowerCase();
  if (IPV6_LOOPBACK.has(normalized)) return true;

  // Unique local addresses (fc00::/7) and link-local (fe80::/10).
  return normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb');
};

const isLocalHostname = (hostname: string) => {
  const normalized = hostname.toLowerCase();
  return normalized === 'localhost' || normalized.endsWith('.localhost') || normalized.endsWith('.local');
};

const matchesHostPattern = (hostname: string, pattern: string) => {
  const host = hostname.toLowerCase();
  const normalized = pattern.toLowerCase();

  if (normalized.startsWith('*.')) {
    const suffix = normalized.slice(1);
    return host.endsWith(suffix);
  }

  return host === normalized;
};

export function isUuid(value: string | null | undefined): value is string {
  if (!value) return false;
  return UUID_V4_REGEX.test(value.trim());
}

export function sanitizeUserImageUrl(value: string, options?: { allowDataImage?: boolean }) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (options?.allowDataImage && /^data:image\/(png|jpe?g|gif|webp|svg\+xml);/i.test(trimmed)) {
    return trimmed;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'https:') {
    return null;
  }

  if (parsed.username || parsed.password) {
    return null;
  }

  const host = parsed.hostname.trim().toLowerCase();
  if (!host) {
    return null;
  }

  if (isLocalHostname(host) || isPrivateIpv4(host) || isPrivateIpv6(host)) {
    return null;
  }

  const allowPatterns = readAllowedImageHostPatterns();
  const allowed = allowPatterns.some((pattern) => matchesHostPattern(host, pattern));

  if (!allowed) {
    return null;
  }

  return parsed.toString();
}

export function parseOptionalImageUrl(
  value: unknown,
  options?: { allowDataImage?: boolean }
): { ok: true; value: string | null } | { ok: false } {
  if (value === null || typeof value === 'undefined') {
    return { ok: true, value: null };
  }

  if (typeof value !== 'string') {
    return { ok: false };
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return { ok: true, value: null };
  }

  const sanitized = sanitizeUserImageUrl(trimmed, options);
  if (!sanitized) {
    return { ok: false };
  }

  return { ok: true, value: sanitized };
}
