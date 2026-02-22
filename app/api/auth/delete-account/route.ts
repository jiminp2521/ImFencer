import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';

type DeleteAccountBody = {
  reason?: string;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as DeleteAccountBody | null;
  const reason = body?.reason?.trim().slice(0, 300) || null;

  let supabaseAdmin;
  try {
    supabaseAdmin = createAdminClient();
  } catch (error) {
    console.error('Service role client initialization failed:', error);
    return NextResponse.json(
      { error: 'Delete account is not configured on server' },
      { status: 500 }
    );
  }

  const nowIso = new Date().toISOString();
  const deletedUsername = `deleted_${user.id.replace(/-/g, '').slice(0, 20)}`;

  const [postCountResult, commentCountResult, orderCountResult, reservationCountResult] = await Promise.all([
    supabaseAdmin.from('posts').select('id', { count: 'exact', head: true }).eq('author_id', user.id),
    supabaseAdmin.from('comments').select('id', { count: 'exact', head: true }).eq('author_id', user.id),
    supabaseAdmin
      .from('fencing_lesson_orders')
      .select('id', { count: 'exact', head: true })
      .eq('buyer_id', user.id),
    supabaseAdmin
      .from('fencing_class_reservations')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id),
  ]);

  const metadata = {
    postCount: postCountResult.count || 0,
    commentCount: commentCountResult.count || 0,
    lessonOrderCount: orderCountResult.count || 0,
    classReservationCount: reservationCountResult.count || 0,
  };

  const { error: deletionLogError } = await supabaseAdmin.from('account_deletions').insert({
    user_id: user.id,
    reason,
    metadata,
    deleted_at: nowIso,
  });

  if (deletionLogError) {
    console.error('Failed to create account deletion log:', deletionLogError);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }

  const [
    profileUpdateResult,
    pushDisableResult,
    lessonOrderUpdateResult,
    classReservationUpdateResult,
    lessonProductsUpdateResult,
    marketItemsUpdateResult,
    postLikeDeleteResult,
    postBookmarkDeleteResult,
  ] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .update({
        username: deletedUsername,
        weapon_type: null,
        club_id: null,
        tier: null,
        is_coach: false,
        avatar_url: null,
        user_type: null,
        is_deleted: true,
        deleted_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', user.id),
    supabaseAdmin
      .from('push_devices')
      .update({ is_active: false, updated_at: nowIso })
      .eq('user_id', user.id),
    supabaseAdmin
      .from('fencing_lesson_orders')
      .update({ status: 'cancelled', updated_at: nowIso })
      .eq('buyer_id', user.id)
      .in('status', ['requested', 'accepted', 'paid']),
    supabaseAdmin
      .from('fencing_class_reservations')
      .update({ status: 'cancelled', payment_status: 'cancelled', updated_at: nowIso })
      .eq('user_id', user.id)
      .in('status', ['requested', 'confirmed']),
    supabaseAdmin
      .from('fencing_lesson_products')
      .update({ is_active: false, updated_at: nowIso })
      .eq('coach_id', user.id),
    supabaseAdmin
      .from('market_items')
      .update({ status: 'sold' })
      .eq('seller_id', user.id)
      .eq('status', 'selling'),
    supabaseAdmin.from('post_likes').delete().eq('user_id', user.id),
    supabaseAdmin.from('post_bookmarks').delete().eq('user_id', user.id),
  ]);

  const mutationErrors = [
    profileUpdateResult.error,
    pushDisableResult.error,
    lessonOrderUpdateResult.error,
    classReservationUpdateResult.error,
    lessonProductsUpdateResult.error,
    marketItemsUpdateResult.error,
    postLikeDeleteResult.error,
    postBookmarkDeleteResult.error,
  ].filter(Boolean);

  if (mutationErrors.length > 0) {
    console.error('Delete account mutation errors:', mutationErrors);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }

  const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id, true);
  if (authDeleteError) {
    console.error('Soft delete user in auth failed:', authDeleteError);
    return NextResponse.json({ error: 'Failed to delete account auth record' }, { status: 500 });
  }

  await supabase.auth.signOut();

  return NextResponse.json({
    ok: true,
    deletedAt: nowIso,
  });
}
