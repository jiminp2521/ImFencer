'use client';

import { useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type PlatformSettingsFormProps = {
  initialClassFeeRate: number;
  initialLessonFeeRate: number;
  initialMarketFeeRate: number;
};

const toPercent = (rate: number) => (Number.isFinite(rate) ? (rate * 100).toFixed(2) : '0.00');

const parsePercentToRate = (value: string) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return NaN;
  return parsed / 100;
};

export function PlatformSettingsForm({
  initialClassFeeRate,
  initialLessonFeeRate,
  initialMarketFeeRate,
}: PlatformSettingsFormProps) {
  const [classFeePercent, setClassFeePercent] = useState(toPercent(initialClassFeeRate));
  const [lessonFeePercent, setLessonFeePercent] = useState(toPercent(initialLessonFeeRate));
  const [marketFeePercent, setMarketFeePercent] = useState(toPercent(initialMarketFeeRate));
  const [pending, setPending] = useState(false);

  const save = async () => {
    if (pending) return;
    setPending(true);

    try {
      const classFeeRate = parsePercentToRate(classFeePercent);
      const lessonFeeRate = parsePercentToRate(lessonFeePercent);
      const marketFeeRate = parsePercentToRate(marketFeePercent);

      if (![classFeeRate, lessonFeeRate, marketFeeRate].every((rate) => Number.isFinite(rate))) {
        alert('수수료 값을 숫자로 입력해주세요.');
        return;
      }

      const response = await fetch('/api/admin/platform-settings', {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          classFeeRate,
          lessonFeeRate,
          marketFeeRate,
        }),
      });

      const body = (await response.json().catch(() => null)) as
        | {
            error?: string;
            settings?: {
              classFeeRate: number;
              lessonFeeRate: number;
              marketFeeRate: number;
            };
          }
        | null;

      if (!response.ok || !body?.settings) {
        alert(body?.error || '수수료 저장에 실패했습니다.');
        return;
      }

      setClassFeePercent(toPercent(body.settings.classFeeRate));
      setLessonFeePercent(toPercent(body.settings.lessonFeeRate));
      setMarketFeePercent(toPercent(body.settings.marketFeeRate));
      alert('수수료 설정이 저장되었습니다.');
    } catch (error) {
      console.error('Failed to save platform settings:', error);
      alert('수수료 저장에 실패했습니다.');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-sm text-gray-300">클래스 수수료 (%)</p>
        <Input
          value={classFeePercent}
          onChange={(event) => setClassFeePercent(event.target.value)}
          inputMode="decimal"
          className="border-gray-800 bg-gray-950 text-gray-100"
        />
      </div>
      <div className="space-y-1">
        <p className="text-sm text-gray-300">레슨 수수료 (%)</p>
        <Input
          value={lessonFeePercent}
          onChange={(event) => setLessonFeePercent(event.target.value)}
          inputMode="decimal"
          className="border-gray-800 bg-gray-950 text-gray-100"
        />
      </div>
      <div className="space-y-1">
        <p className="text-sm text-gray-300">마켓 수수료 (%)</p>
        <Input
          value={marketFeePercent}
          onChange={(event) => setMarketFeePercent(event.target.value)}
          inputMode="decimal"
          className="border-gray-800 bg-gray-950 text-gray-100"
        />
      </div>

      <Button
        type="button"
        onClick={save}
        disabled={pending}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        저장
      </Button>
    </div>
  );
}
