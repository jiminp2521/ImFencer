import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { ensureProfileRow } from '@/lib/ensure-profile';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type UpdateMarketItemBody = {
  title?: string;
  description?: string;
  price?: number;
  weapon_type?: string | null;
  brand?: string | null;
  condition?: string | null;
  image_url?: string | null;
  status?: string;
};

const allowedStatus = new Set(['selling', 'reserved', 'sold']);

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('market_items')
    .select('id, seller_id, title, description, price, weapon_type, brand, condition, image_url, status')
    .eq('id', id)
    .eq('seller_id', user.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, item: data });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as UpdateMarketItemBody | null;
  if (!body) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};

  if (typeof body.title === 'string') {
    const title = body.title.trim();
    if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    if (title.length > 80) return NextResponse.json({ error: 'Title too long' }, { status: 400 });
    patch.title = title;
  }

  if (typeof body.description === 'string') {
    patch.description = body.description.trim() || null;
  }

  if (typeof body.price !== 'undefined') {
    const price = Number(body.price);
    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json({ error: 'Invalid price' }, { status: 400 });
    }
    patch.price = Math.round(price);
  }

  if (typeof body.weapon_type !== 'undefined') {
    patch.weapon_type = body.weapon_type || null;
  }

  if (typeof body.brand !== 'undefined') {
    patch.brand = typeof body.brand === 'string' ? body.brand.trim() || null : null;
  }

  if (typeof body.condition !== 'undefined') {
    patch.condition = typeof body.condition === 'string' ? body.condition : null;
  }

  if (typeof body.image_url !== 'undefined') {
    patch.image_url = typeof body.image_url === 'string' ? body.image_url.trim() || null : null;
  }

  if (typeof body.status === 'string') {
    if (!allowedStatus.has(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    patch.status = body.status;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No changes' }, { status: 400 });
  }

  try {
    await ensureProfileRow(supabase, user.id);

    const { data, error } = await supabase
      .from('market_items')
      .update(patch)
      .eq('id', id)
      .eq('seller_id', user.id)
      .select('id')
      .single();

    if (error || !data) {
      console.error('Error updating market item:', error);
      return NextResponse.json({ error: 'Failed to update market item' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: data.id });
  } catch (error) {
    console.error('PATCH /api/market/items/[id] failed:', error);
    return NextResponse.json({ error: 'Failed to update market item' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureProfileRow(supabase, user.id);

    const { error } = await supabase
      .from('market_items')
      .delete()
      .eq('id', id)
      .eq('seller_id', user.id);

    if (error) {
      console.error('Error deleting market item:', error);
      return NextResponse.json({ error: 'Failed to delete market item' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/market/items/[id] failed:', error);
    return NextResponse.json({ error: 'Failed to delete market item' }, { status: 500 });
  }
}

