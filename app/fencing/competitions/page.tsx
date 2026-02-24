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
    <div className="imf-page">
      <header className="imf-topbar">
        <div className="flex min-w-0 items-center">
          <Link href="/fencing" className="imf-icon-button h-8 w-8 rounded-lg">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="ml-2 truncate text-base font-semibold text-white">대회 정보</h1>
        </div>
        <div className="h-8 w-8" aria-hidden />
      </header>

      <main className="px-4 py-4 space-y-2">
        {competitions.length > 0 ? (
          competitions.map((competition) => {
            const hasResult = Boolean(competition.result_data || competition.bracket_image_url);

            return (
              <article
                key={competition.id}
                className="imf-panel space-y-2 px-4 py-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-white">{competition.title}</p>
                  <Badge
                    className={
                      hasResult
                        ? 'border-white/20 bg-black/40 text-slate-300'
                        : 'border-white/25 bg-white/10 text-white'
                    }
                  >
                    {hasResult ? '결과 등록' : '예정'}
                  </Badge>
                </div>
                <p className="text-xs text-slate-400">{competition.location}</p>
                <p className="text-xs text-slate-500">{formatDateTime(competition.date)}</p>
              </article>
            );
          })
        ) : (
          <div className="imf-panel px-4 py-14 text-center text-sm text-slate-500">
            등록된 대회 정보가 없습니다.
          </div>
        )}
      </main>
    </div>
  );
}
