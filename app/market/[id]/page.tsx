import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase-server';
import { MarketStatusActions } from '@/components/market/MarketStatusActions';
import { ContactSellerButton } from '@/components/market/ContactSellerButton';
import { MarketOwnerActions } from '@/components/market/MarketOwnerActions';

type MarketDetailPageProps = {
  params: Promise<{ id: string }>;
};

const statusLabelMap: Record<string, string> = {
  selling: '판매중',
  reserved: '예약중',
  sold: '판매완료',
};

const statusStyleMap: Record<string, string> = {
  selling: 'border-emerald-600/40 bg-emerald-500/10 text-emerald-400',
  reserved: 'border-amber-600/40 bg-amber-500/10 text-amber-400',
  sold: 'border-gray-700 bg-gray-800/60 text-gray-300',
};

const weaponLabelMap: Record<string, string> = {
  Epee: '에페',
  Sabre: '사브르',
  Fleuret: '플뢰레',
};

export default async function MarketDetailPage({ params }: MarketDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: item, error } = await supabase
    .from('market_items')
    .select(`
      id,
      seller_id,
      title,
      description,
      price,
      status,
      image_url,
      weapon_type,
      brand,
      condition,
      created_at,
      profiles:seller_id (username)
    `)
    .eq('id', id)
    .single();

  if (error || !item) {
    notFound();
  }

  const sellerProfile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
  const isSeller = Boolean(user && user.id === item.seller_id);
  const statusClass = statusStyleMap[item.status] || 'border-gray-700 bg-gray-800/60 text-gray-300';

  return (
    <div className="min-h-screen pb-20 bg-black">
      <header className="sticky top-0 z-40 bg-black/90 backdrop-blur border-b border-white/10 h-14 px-4 flex items-center">
        <Link href="/market" className="text-gray-400 hover:text-white transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-base font-semibold text-white ml-2">상품 상세</h1>
      </header>

      <main className="p-4 space-y-4">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.title}
            className="w-full max-h-96 rounded-xl border border-white/10 object-cover bg-gray-900"
          />
        ) : (
          <div className="w-full h-52 rounded-xl border border-white/10 bg-gray-900 flex items-center justify-center text-gray-600 text-xs">
            NO IMAGE
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-xl font-bold text-white leading-tight">{item.title}</h2>
            <Badge className={`border shrink-0 ${statusClass}`}>{statusLabelMap[item.status] || item.status}</Badge>
          </div>

          <p className="text-2xl font-extrabold text-blue-400">{item.price.toLocaleString('ko-KR')}원</p>

          <div className="flex items-center gap-1.5 text-xs text-gray-500 flex-wrap">
            {item.weapon_type && <span>{weaponLabelMap[item.weapon_type] || item.weapon_type}</span>}
            {item.brand && (
              <>
                <span>•</span>
                <span>{item.brand}</span>
              </>
            )}
            {item.condition && (
              <>
                <span>•</span>
                <span>{item.condition}</span>
              </>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-gray-950 px-3 py-2.5 text-sm text-gray-300">
          판매자: {sellerProfile?.username || '알 수 없음'}
        </div>

        <article className="rounded-lg border border-white/10 bg-gray-950 px-3 py-3 text-sm leading-7 text-gray-200 whitespace-pre-wrap">
          {item.description || '설명이 없습니다.'}
        </article>

        <p className="text-xs text-gray-500">
          등록일:{' '}
          {new Date(item.created_at).toLocaleString('ko-KR', {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        </p>

        <section className="pt-2">
          {isSeller ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-200">판매 상태 변경</p>
              <MarketStatusActions marketItemId={item.id} initialStatus={item.status} />
              <MarketOwnerActions marketItemId={item.id} />
            </div>
          ) : (
            <ContactSellerButton sellerId={item.seller_id} marketTitle={item.title} />
          )}
        </section>
      </main>
    </div>
  );
}
