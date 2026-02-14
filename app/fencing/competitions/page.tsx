import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase-server';
import { Badge } from '@/components/ui/badge';

type CompetitionRow = {
  id: string;
  title: string;
  date: string;
  location: string;
  bracket_image_url: string | null;
  result_data: Record<string, unknown> | null;
};

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

export default async function FencingCompetitionsPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('competitions')
    .select('id, title, date, location, bracket_image_url, result_data')
    .order('date', { ascending: true })
    .limit(60);

  if (error) {
    console.error('Error fetching competitions:', error);
  }

  const competitions = (data || []) as CompetitionRow[];

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-40 bg-black/90 backdrop-blur border-b border-white/10 h-14 px-4 flex items-center">
        <Link href="/fencing" className="text-gray-400 hover:text-white transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-base font-semibold text-white ml-2">대회 정보</h1>
      </header>

      <main className="px-4 py-4 space-y-2">
        {competitions.length > 0 ? (
          competitions.map((competition) => {
            const hasResult = Boolean(competition.result_data || competition.bracket_image_url);

            return (
              <article
                key={competition.id}
                className="rounded-xl border border-white/10 bg-gray-950 px-4 py-3 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-white">{competition.title}</p>
                  <Badge
                    className={
                      hasResult
                        ? 'border-gray-700 bg-gray-800/60 text-gray-300'
                        : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                    }
                  >
                    {hasResult ? '결과 등록' : '예정'}
                  </Badge>
                </div>
                <p className="text-xs text-gray-400">{competition.location}</p>
                <p className="text-xs text-gray-500">{formatDateTime(competition.date)}</p>
              </article>
            );
          })
        ) : (
          <div className="rounded-xl border border-white/10 bg-gray-950 px-4 py-14 text-center text-sm text-gray-500">
            등록된 대회 정보가 없습니다.
          </div>
        )}
      </main>
    </div>
  );
}
