export default function ProfileLoading() {
  return (
    <div className="imf-page">
      <header className="imf-topbar">
        <div className="imf-logo">
          <div className="h-7 w-28 rounded bg-slate-800 animate-pulse" />
        </div>
        <div className="h-8 w-8 rounded-full bg-slate-800 animate-pulse" />
      </header>

      <main className="px-4 py-4 space-y-5 animate-pulse">
        <section className="space-y-4 border-b border-white/10 pb-4">
          <div className="flex items-start gap-4">
            <div className="h-24 w-24 rounded-full bg-slate-800" />
            <div className="flex-1 space-y-2">
              <div className="h-6 w-36 rounded bg-slate-800" />
              <div className="h-3 w-24 rounded bg-slate-900" />
              <div className="h-4 w-full rounded bg-slate-900" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={`profile-action-skeleton-${index}`} className="h-10 rounded-lg border border-white/10 bg-white/[0.04]" />
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-black/35">
          <div className="grid grid-cols-3 divide-x divide-white/10">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={`profile-loading-metric-${index}`} className="py-3 text-center">
                <div className="mx-auto h-5 w-10 rounded bg-slate-800" />
                <div className="mx-auto mt-2 h-3 w-14 rounded bg-slate-900" />
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <div className="h-4 w-20 rounded bg-slate-800" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={`profile-post-skeleton-${index}`} className="rounded-xl border border-white/10 bg-black/30 p-3">
                <div className="h-3 w-20 rounded bg-slate-800" />
                <div className="mt-2 h-4 w-full rounded bg-slate-900" />
                <div className="mt-1 h-4 w-10/12 rounded bg-slate-900" />
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
