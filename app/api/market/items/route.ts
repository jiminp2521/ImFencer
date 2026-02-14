import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { ensureProfileRow } from '@/lib/ensure-profile';

type CreateMarketItemBody = {
  title?: string;
  description?: string;
  price?: number;
  weapon_type?: string | null;
  brand?: string | null;
  condition?: string | null;
  image_url?: string | null;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as CreateMarketItemBody | null;
  const title = body?.title?.trim() ?? '';
  const description = body?.description?.trim() ?? '';
  const price = Number(body?.price);
  const weaponType = typeof body?.weapon_type === 'string' ? body.weapon_type : null;
  const brand = typeof body?.brand === 'string' ? body.brand.trim() : null;
  const condition = typeof body?.condition === 'string' ? body.condition : null;
  const imageUrl = typeof body?.image_url === 'string' ? body.image_url.trim() : null;

  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }
  if (title.length > 80) {
    return NextResponse.json({ error: 'Title too long' }, { status: 400 });
  }
  if (!Number.isFinite(price) || price <= 0) {
    return NextResponse.json({ error: 'Invalid price' }, { status: 400 });
  }

  try {
    await ensureProfileRow(supabase, user.id);

    const { data, error } = await supabase
      .from('market_items')
      .insert({
        seller_id: user.id,
        title,
        description: description || null,
        price: Math.round(price),
        weapon_type: weaponType || null,
        brand: brand || null,
        condition: condition || null,
        image_url: imageUrl || null,
        status: 'selling',
      })
      .select('id')
      .single();

    if (error || !data) {
      console.error('Error creating market item:', error);
      return NextResponse.json({ error: 'Failed to create market item' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: data.id });
  } catch (error) {
    console.error('POST /api/market/items failed:', error);
    return NextResponse.json({ error: 'Failed to create market item' }, { status: 500 });
  }
}

