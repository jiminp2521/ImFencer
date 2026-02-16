import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient } from '@/lib/supabase-public';
import { withApiTiming } from '@/lib/api-timing';

export const dynamic = 'force-dynamic';

const MARKET_PAGE_SIZE = 24;
const VALID_STATUS = new Set(['All', 'selling', 'reserved', 'sold']);
const VALID_WEAPONS = new Set(['All', 'Epee', 'Sabre', 'Fleuret']);

type MarketProfile = {
  username: string | null;
};

type MarketItem = {
  id: string;
  title: string;
  price: number;
  status: string;
  weapon_type: string | null;
  brand: string | null;
  condition: string | null;
  image_url: string | null;
  created_at: string;
  profiles: MarketProfile | MarketProfile[] | null;
};

const parsePositivePage = (rawValue: string | null) => {
  const parsed = Number.parseInt(rawValue || '1', 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return parsed;
};

export async function GET(request: NextRequest) {
  return withApiTiming('market-feed', async () => {
    const { searchParams } = new URL(request.url);

    const selectedStatus = VALID_STATUS.has(searchParams.get('status') || '')
      ? (searchParams.get('status') as string)
      : 'All';
    const selectedWeapon = VALID_WEAPONS.has(searchParams.get('weapon') || '')
      ? (searchParams.get('weapon') as string)
      : 'All';
    const searchText = (searchParams.get('q') || '').trim();
    const currentPage = parsePositivePage(searchParams.get('page'));
    const offset = (currentPage - 1) * MARKET_PAGE_SIZE;

    const supabase = createPublicClient();

    let query = supabase
      .from('market_items')
      .select(`
        id,
        title,
        price,
        status,
        weapon_type,
        brand,
        condition,
        image_url,
        created_at,
        profiles:seller_id (username)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + MARKET_PAGE_SIZE);

    if (selectedStatus !== 'All') {
      query = query.eq('status', selectedStatus);
    }

    if (selectedWeapon !== 'All') {
      query = query.eq('weapon_type', selectedWeapon);
    }

    if (searchText) {
      const escaped = searchText.replace(/[%_]/g, '');
      query = query.or(`title.ilike.%${escaped}%,brand.ilike.%${escaped}%`);
    }

    const { data: items, error } = await query;

    if (error) {
      console.error('Error fetching market items:', error);
    }

    const list = (items || []) as MarketItem[];
    const hasNextPage = list.length > MARKET_PAGE_SIZE;
    const visibleItems = hasNextPage ? list.slice(0, MARKET_PAGE_SIZE) : list;

    return NextResponse.json({
      selectedStatus,
      selectedWeapon,
      searchText,
      currentPage,
      hasNextPage,
      items: visibleItems,
    });
  });
}
