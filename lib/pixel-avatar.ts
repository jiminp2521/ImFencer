export const PIXEL_AVATAR_TOKEN_PREFIX = 'pixel-avatar:v1:';

type PaletteOption = {
  label: string;
  color: string;
};

type NamedOption = {
  label: string;
};

export type PixelAvatarConfig = {
  background: number;
  skin: number;
  hair: number;
  mask: number;
  jacket: number;
  blade: number;
  emblem: number;
  stance: number;
};

export const pixelAvatarParts = {
  background: [
    { label: 'Night', color: '#060f1c' },
    { label: 'Arena', color: '#17102a' },
    { label: 'Neon', color: '#0f2a21' },
    { label: 'Sunset', color: '#2c0f16' },
  ] as readonly PaletteOption[],
  skin: [
    { label: 'Skin 1', color: '#f6d2b2' },
    { label: 'Skin 2', color: '#e8b78f' },
    { label: 'Skin 3', color: '#cb946e' },
    { label: 'Skin 4', color: '#9f6e4f' },
  ] as readonly PaletteOption[],
  hair: [
    { label: 'Black', color: '#111827' },
    { label: 'Brown', color: '#4c2c1d' },
    { label: 'Silver', color: '#8b99ae' },
    { label: 'Blonde', color: '#b38a2c' },
  ] as readonly PaletteOption[],
  mask: [
    { label: 'Steel', color: '#9daec8' },
    { label: 'Carbon', color: '#556074' },
    { label: 'Gold', color: '#c79b35' },
    { label: 'White', color: '#d2d8e5' },
  ] as readonly PaletteOption[],
  jacket: [
    { label: 'Navy', color: '#1f2c4d' },
    { label: 'Black', color: '#1d1d24' },
    { label: 'Royal', color: '#21427f' },
    { label: 'Crimson', color: '#5e1f32' },
  ] as readonly PaletteOption[],
  blade: [
    { label: 'Silver', color: '#d7e0ee' },
    { label: 'Blue Steel', color: '#90b0f2' },
    { label: 'Emerald', color: '#74d0a6' },
    { label: 'Rose', color: '#f3a2b2' },
  ] as readonly PaletteOption[],
  emblem: [{ label: 'Star' }, { label: 'Stripe' }, { label: 'Target' }] as readonly NamedOption[],
  stance: [{ label: 'Right' }, { label: 'Left' }, { label: 'Forward' }] as readonly NamedOption[],
} as const;

const defaultConfig: PixelAvatarConfig = {
  background: 0,
  skin: 0,
  hair: 0,
  mask: 0,
  jacket: 0,
  blade: 0,
  emblem: 0,
  stance: 0,
};

const clampIndex = (value: number, maxLength: number) => {
  if (!Number.isFinite(value) || maxLength <= 0) return 0;
  const index = Math.trunc(value);
  if (index < 0) return 0;
  if (index >= maxLength) return maxLength - 1;
  return index;
};

const shiftHex = (hex: string, amount: number) => {
  const r = clampIndex(Number.parseInt(hex.slice(1, 3), 16) + amount, 256);
  const g = clampIndex(Number.parseInt(hex.slice(3, 5), 16) + amount, 256);
  const b = clampIndex(Number.parseInt(hex.slice(5, 7), 16) + amount, 256);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

const normalizeConfig = (input: Partial<PixelAvatarConfig>): PixelAvatarConfig => ({
  background: clampIndex(input.background ?? defaultConfig.background, pixelAvatarParts.background.length),
  skin: clampIndex(input.skin ?? defaultConfig.skin, pixelAvatarParts.skin.length),
  hair: clampIndex(input.hair ?? defaultConfig.hair, pixelAvatarParts.hair.length),
  mask: clampIndex(input.mask ?? defaultConfig.mask, pixelAvatarParts.mask.length),
  jacket: clampIndex(input.jacket ?? defaultConfig.jacket, pixelAvatarParts.jacket.length),
  blade: clampIndex(input.blade ?? defaultConfig.blade, pixelAvatarParts.blade.length),
  emblem: clampIndex(input.emblem ?? defaultConfig.emblem, pixelAvatarParts.emblem.length),
  stance: clampIndex(input.stance ?? defaultConfig.stance, pixelAvatarParts.stance.length),
});

const hashSeed = (seed: string) => {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const pickIndex = (hash: number, shift: number, size: number) => {
  if (size <= 0) return 0;
  const mixed = (hash ^ Math.imul(shift + 1, 2654435761)) >>> 0;
  return mixed % size;
};

export const createDefaultPixelAvatarConfig = (seed: string) => {
  const hash = hashSeed(seed || 'fencer');
  return normalizeConfig({
    background: pickIndex(hash, 1, pixelAvatarParts.background.length),
    skin: pickIndex(hash, 2, pixelAvatarParts.skin.length),
    hair: pickIndex(hash, 3, pixelAvatarParts.hair.length),
    mask: pickIndex(hash, 4, pixelAvatarParts.mask.length),
    jacket: pickIndex(hash, 5, pixelAvatarParts.jacket.length),
    blade: pickIndex(hash, 6, pixelAvatarParts.blade.length),
    emblem: pickIndex(hash, 7, pixelAvatarParts.emblem.length),
    stance: pickIndex(hash, 8, pixelAvatarParts.stance.length),
  });
};

export const toPixelAvatarToken = (config: PixelAvatarConfig) => {
  const normalized = normalizeConfig(config);
  const params = new URLSearchParams();
  params.set('bg', String(normalized.background));
  params.set('skin', String(normalized.skin));
  params.set('hair', String(normalized.hair));
  params.set('mask', String(normalized.mask));
  params.set('jacket', String(normalized.jacket));
  params.set('blade', String(normalized.blade));
  params.set('emblem', String(normalized.emblem));
  params.set('stance', String(normalized.stance));
  return `${PIXEL_AVATAR_TOKEN_PREFIX}${params.toString()}`;
};

export const parsePixelAvatarToken = (value: string | null | undefined) => {
  if (!value || !value.startsWith(PIXEL_AVATAR_TOKEN_PREFIX)) {
    return null;
  }

  const rawParams = value.slice(PIXEL_AVATAR_TOKEN_PREFIX.length);
  const params = new URLSearchParams(rawParams);
  return normalizeConfig({
    background: Number(params.get('bg') ?? Number.NaN),
    skin: Number(params.get('skin') ?? Number.NaN),
    hair: Number(params.get('hair') ?? Number.NaN),
    mask: Number(params.get('mask') ?? Number.NaN),
    jacket: Number(params.get('jacket') ?? Number.NaN),
    blade: Number(params.get('blade') ?? Number.NaN),
    emblem: Number(params.get('emblem') ?? Number.NaN),
    stance: Number(params.get('stance') ?? Number.NaN),
  });
};

const createPixelAvatarSvg = (config: PixelAvatarConfig) => {
  const backgroundColor = pixelAvatarParts.background[config.background].color;
  const skinColor = pixelAvatarParts.skin[config.skin].color;
  const hairColor = pixelAvatarParts.hair[config.hair].color;
  const maskColor = pixelAvatarParts.mask[config.mask].color;
  const jacketColor = pixelAvatarParts.jacket[config.jacket].color;
  const bladeColor = pixelAvatarParts.blade[config.blade].color;
  const shadowColor = shiftHex(jacketColor, -25);
  const accentColor = shiftHex(jacketColor, 22);
  const floorColor = shiftHex(backgroundColor, 28);

  const rects: string[] = [
    `<rect x="0" y="0" width="16" height="16" fill="${backgroundColor}" />`,
    `<rect x="0" y="15" width="16" height="1" fill="${floorColor}" />`,
  ];

  const fillRect = (x: number, y: number, width: number, height: number, color: string) => {
    rects.push(`<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${color}" />`);
  };

  fillRect(6, 3, 4, 4, skinColor);
  fillRect(7, 7, 2, 1, skinColor);
  fillRect(5, 8, 6, 5, jacketColor);
  fillRect(4, 9, 1, 3, shadowColor);
  fillRect(11, 9, 1, 3, shadowColor);
  fillRect(6, 13, 4, 1, shadowColor);
  fillRect(6, 14, 2, 1, shiftHex(shadowColor, -18));
  fillRect(8, 14, 2, 1, shiftHex(shadowColor, -18));

  if (config.hair % 3 === 0) {
    fillRect(6, 2, 4, 1, hairColor);
    fillRect(5, 3, 1, 1, hairColor);
    fillRect(10, 3, 1, 1, hairColor);
  } else if (config.hair % 3 === 1) {
    fillRect(7, 1, 2, 1, hairColor);
    fillRect(6, 2, 4, 1, hairColor);
  } else {
    fillRect(6, 2, 4, 1, hairColor);
    fillRect(6, 3, 1, 1, hairColor);
    fillRect(9, 3, 1, 1, hairColor);
  }

  fillRect(6, 4, 4, 2, maskColor);

  if (config.emblem === 0) {
    fillRect(7, 9, 2, 2, accentColor);
    fillRect(6, 10, 4, 1, accentColor);
  } else if (config.emblem === 1) {
    fillRect(7, 8, 2, 5, accentColor);
  } else {
    fillRect(7, 9, 2, 2, accentColor);
    fillRect(6, 10, 1, 1, accentColor);
    fillRect(9, 10, 1, 1, accentColor);
  }

  if (config.stance === 0) {
    fillRect(12, 6, 1, 7, bladeColor);
    fillRect(11, 9, 1, 1, bladeColor);
  } else if (config.stance === 1) {
    fillRect(3, 6, 1, 7, bladeColor);
    fillRect(4, 9, 1, 1, bladeColor);
  } else {
    fillRect(10, 6, 1, 1, bladeColor);
    fillRect(11, 7, 1, 1, bladeColor);
    fillRect(12, 8, 1, 1, bladeColor);
    fillRect(13, 9, 1, 3, bladeColor);
    fillRect(11, 9, 2, 1, bladeColor);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 16 16" shape-rendering="crispEdges">${rects.join('')}</svg>`;
};

export const toPixelAvatarDataUri = (config: PixelAvatarConfig) => {
  const svg = createPixelAvatarSvg(normalizeConfig(config));
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const resolveProfileAvatarSrc = (avatarUrl: string | null, seed: string) => {
  const parsed = parsePixelAvatarToken(avatarUrl);
  if (parsed) {
    return toPixelAvatarDataUri(parsed);
  }
  if (avatarUrl && (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://') || avatarUrl.startsWith('data:image/'))) {
    return avatarUrl;
  }
  return toPixelAvatarDataUri(createDefaultPixelAvatarConfig(seed));
};
