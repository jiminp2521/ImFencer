import 'server-only';
import { createAdminClient } from '@/lib/supabase-admin';

export type PlatformSettings = {
  classFeeRate: number;
  lessonFeeRate: number;
  marketFeeRate: number;
};

const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  classFeeRate: 0.1,
  lessonFeeRate: 0.1,
  marketFeeRate: 0.05,
};

export const clampFeeRate = (value: number) => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(0.9, value));
};

export const calculatePlatformFee = (amount: number, feeRate: number) => {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.floor(amount * clampFeeRate(feeRate));
};

export async function getActivePlatformSettings(): Promise<PlatformSettings> {
  try {
    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin
      .from('platform_settings')
      .select('class_fee_rate, lesson_fee_rate, market_fee_rate')
      .eq('code', 'default')
      .maybeSingle();

    if (error || !data) {
      if (error) {
        console.error('Error loading platform settings:', error);
      }
      return DEFAULT_PLATFORM_SETTINGS;
    }

    return {
      classFeeRate: clampFeeRate(Number(data.class_fee_rate)),
      lessonFeeRate: clampFeeRate(Number(data.lesson_fee_rate)),
      marketFeeRate: clampFeeRate(Number(data.market_fee_rate)),
    };
  } catch (error) {
    console.error('Failed to get active platform settings:', error);
    return DEFAULT_PLATFORM_SETTINGS;
  }
}

export function getDefaultPlatformSettings() {
  return { ...DEFAULT_PLATFORM_SETTINGS };
}
