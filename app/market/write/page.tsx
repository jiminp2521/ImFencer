import { MarketWriteForm } from '@/components/market/MarketWriteForm';

type MarketWritePageProps = {
  searchParams: Promise<{
    edit?: string;
  }>;
};

export default async function MarketWritePage({ searchParams }: MarketWritePageProps) {
  const resolved = await searchParams;
  const editId = typeof resolved.edit === 'string' && resolved.edit ? resolved.edit : null;

  return <MarketWriteForm editId={editId} />;
}
