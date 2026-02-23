'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import { ChevronLeft, Loader2, Shuffle, Store, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  createDefaultPixelAvatarConfig,
  parsePixelAvatarToken,
  pixelAvatarParts,
  toPixelAvatarDataUri,
  toPixelAvatarToken,
  type PixelAvatarConfig,
} from '@/lib/pixel-avatar';

type AvatarStudioClientProps = {
  initialAvatarUrl: string | null;
  seed: string;
  displayName: string;
};

const colorRows: Array<{
  key: 'background' | 'skin' | 'hair' | 'mask' | 'jacket' | 'blade';
  label: string;
  options: readonly { label: string; color: string }[];
}> = [
  { key: 'background', label: '배경', options: pixelAvatarParts.background },
  { key: 'skin', label: '피부', options: pixelAvatarParts.skin },
  { key: 'hair', label: '헤어', options: pixelAvatarParts.hair },
  { key: 'mask', label: '마스크', options: pixelAvatarParts.mask },
  { key: 'jacket', label: '자켓', options: pixelAvatarParts.jacket },
  { key: 'blade', label: '블레이드', options: pixelAvatarParts.blade },
];

const textRows: Array<{
  key: 'emblem' | 'stance';
  label: string;
  options: readonly { label: string }[];
}> = [
  { key: 'emblem', label: '엠블럼', options: pixelAvatarParts.emblem },
  { key: 'stance', label: '포즈', options: pixelAvatarParts.stance },
];

const pickRandom = (size: number) => {
  if (size <= 0) return 0;
  return Math.floor(Math.random() * size);
};

export function AvatarStudioClient({ initialAvatarUrl, seed, displayName }: AvatarStudioClientProps) {
  const initialConfig = useMemo(
    () => parsePixelAvatarToken(initialAvatarUrl) ?? createDefaultPixelAvatarConfig(seed),
    [initialAvatarUrl, seed]
  );
  const [config, setConfig] = useState<PixelAvatarConfig>(initialConfig);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const avatarToken = useMemo(() => toPixelAvatarToken(config), [config]);
  const previewSrc = useMemo(() => toPixelAvatarDataUri(config), [config]);

  const updatePart = (key: keyof PixelAvatarConfig, value: number) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const randomize = () => {
    setConfig({
      background: pickRandom(pixelAvatarParts.background.length),
      skin: pickRandom(pixelAvatarParts.skin.length),
      hair: pickRandom(pixelAvatarParts.hair.length),
      mask: pickRandom(pixelAvatarParts.mask.length),
      jacket: pickRandom(pixelAvatarParts.jacket.length),
      blade: pickRandom(pixelAvatarParts.blade.length),
      emblem: pickRandom(pixelAvatarParts.emblem.length),
      stance: pickRandom(pixelAvatarParts.stance.length),
    });
    setSavedAt(null);
    setError(null);
  };

  const saveAvatar = async () => {
    setSaving(true);
    setSavedAt(null);
    setError(null);

    try {
      const response = await fetch('/api/profile/avatar', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ avatarToken }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || '저장에 실패했습니다.');
      }

      setSavedAt(new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }));
    } catch (requestError) {
      console.error('Avatar save failed:', requestError);
      setError(requestError instanceof Error ? requestError.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="imf-page">
      <header className="sticky top-0 z-40 h-14 border-b border-white/10 bg-black/80 px-4 backdrop-blur-md">
        <div className="flex h-full items-center justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <Link href="/profile" className="text-gray-400 hover:text-white transition-colors">
              <ChevronLeft className="h-6 w-6" />
            </Link>
            <h1 className="truncate text-base font-semibold text-white">Avatar Studio</h1>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={saveAvatar}
            disabled={saving}
            className="border-cyan-400/40 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/20"
          >
            {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
            저장
          </Button>
        </div>
      </header>

      <main className="space-y-4 p-4 pb-24">
        <section className="imf-panel border-cyan-400/20 bg-[linear-gradient(135deg,rgba(6,14,24,0.96),rgba(10,19,30,0.86))]">
          <div className="flex flex-wrap items-center gap-4">
            <div className="rounded-2xl border border-white/15 bg-black/40 p-2.5">
              <Image
                src={previewSrc}
                alt={`${displayName} avatar preview`}
                width={112}
                height={112}
                unoptimized
                className="h-28 w-28 rounded-xl border border-white/15 object-contain [image-rendering:pixelated]"
              />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-sm font-semibold text-white">{displayName}님의 픽셀 아바타</p>
              <p className="text-xs text-slate-300">
                프로필 사진 대신 경기장 감성의 픽셀 아바타를 사용합니다. 커리어와 함께 개성을 보여주세요.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={randomize}
                className="border-white/20 bg-white/5 text-slate-100 hover:bg-white/10"
              >
                <Shuffle className="mr-1.5 h-4 w-4" />
                랜덤 생성
              </Button>
            </div>
          </div>
          {savedAt ? <p className="mt-3 text-xs text-emerald-300">저장 완료: {savedAt}</p> : null}
          {error ? <p className="mt-3 text-xs text-rose-300">{error}</p> : null}
        </section>

        {colorRows.map((row) => (
          <section key={row.key} className="imf-panel space-y-3">
            <h2 className="text-sm font-semibold text-slate-100">{row.label}</h2>
            <div className="grid grid-cols-4 gap-2">
              {row.options.map((option, index) => {
                const active = config[row.key] === index;
                return (
                  <button
                    key={`${row.key}-${option.label}`}
                    type="button"
                    onClick={() => updatePart(row.key, index)}
                    className={`rounded-xl border px-2 py-2 text-[11px] transition-colors ${
                      active
                        ? 'border-white bg-white text-black'
                        : 'border-white/15 bg-black/30 text-slate-200 hover:border-white/35'
                    }`}
                  >
                    <span
                      className="mb-1 block h-5 w-full rounded-md border border-black/20"
                      style={{ backgroundColor: option.color }}
                    />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </section>
        ))}

        {textRows.map((row) => (
          <section key={row.key} className="imf-panel space-y-3">
            <h2 className="text-sm font-semibold text-slate-100">{row.label}</h2>
            <div className="grid grid-cols-3 gap-2">
              {row.options.map((option, index) => {
                const active = config[row.key] === index;
                return (
                  <button
                    key={`${row.key}-${option.label}`}
                    type="button"
                    onClick={() => updatePart(row.key, index)}
                    className={`rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
                      active
                        ? 'border-cyan-300 bg-cyan-100 text-black'
                        : 'border-white/15 bg-black/30 text-slate-200 hover:border-white/35'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </section>
        ))}

        <section className="imf-panel border-amber-300/20 bg-[linear-gradient(130deg,rgba(39,24,6,0.85),rgba(20,13,4,0.95))]">
          <div className="flex items-start gap-3">
            <div className="rounded-xl border border-amber-200/35 bg-amber-200/10 p-2">
              <Store className="h-5 w-5 text-amber-200" />
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-semibold text-amber-100">아바타 아이템 마켓</p>
              <p className="text-xs text-amber-50/85">
                다음 단계로 헬멧/블레이드 스킨/이모트 아이템 판매를 연결할 수 있게 구조를 열어두었습니다.
              </p>
              <Link href="/market" className="inline-flex items-center gap-1 text-xs text-amber-200 underline underline-offset-4">
                마켓 흐름 확인하기
              </Link>
            </div>
          </div>
        </section>

        <section className="imf-panel border-purple-300/20 bg-[linear-gradient(125deg,rgba(21,10,31,0.95),rgba(8,8,18,0.9))]">
          <div className="flex items-start gap-3">
            <div className="rounded-xl border border-purple-200/35 bg-purple-300/10 p-2">
              <Trophy className="h-5 w-5 text-purple-100" />
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-semibold text-purple-100">커리어 쇼케이스 연동</p>
              <p className="text-xs text-purple-100/80">
                저장한 아바타는 마이페이지 메인에서 실적 카드와 함께 노출됩니다.
              </p>
              <Link href="/profile" className="inline-flex items-center gap-1 text-xs text-purple-200 underline underline-offset-4">
                마이페이지로 돌아가기
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
