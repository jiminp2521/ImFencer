import Link from 'next/link';

export const metadata = {
  title: '이용약관 | ImFencer',
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-black px-4 py-8 text-slate-200">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">이용약관</h1>
          <Link href="/login" className="text-sm text-slate-400 underline underline-offset-2 hover:text-slate-200">
            로그인으로 돌아가기
          </Link>
        </div>

        <section className="rounded-xl border border-white/10 bg-slate-950/80 p-4 text-sm leading-7">
          <p>
            본 약관은 ImFencer 서비스의 이용 조건, 권리·의무, 책임 사항을 규정합니다. 서비스를 이용하면 본 약관에 동의한
            것으로 간주됩니다.
          </p>
          <p className="mt-3">
            이용자는 관련 법령과 서비스 정책을 준수해야 하며, 타인의 권리를 침해하거나 부정한 목적으로 서비스를 이용할 수 없습니다.
          </p>
          <p className="mt-3">
            게시물, 댓글, 채팅 등 사용자 생성 콘텐츠에 대한 책임은 작성자에게 있으며, 운영 정책 위반 시 게시물 제한 또는 계정
            제재가 이루어질 수 있습니다.
          </p>
          <p className="mt-3">
            서비스 내 거래/결제 기능은 제공 사업자 정책 및 관계 법령을 따르며, 결제 취소·환불·분쟁 처리 절차는 별도 정책에 따를
            수 있습니다.
          </p>
          <p className="mt-3">
            운영자는 안정적인 서비스 제공을 위해 약관을 변경할 수 있으며, 중요한 변경 사항은 사전 공지합니다.
          </p>
        </section>

        <p className="text-xs text-slate-500">최종 업데이트: 2026-02-22</p>
      </div>
    </main>
  );
}
