import Link from 'next/link';

export const metadata = {
  title: '개인정보처리방침 | ImFencer',
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-black px-4 py-8 text-slate-200">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">개인정보처리방침</h1>
          <Link href="/login" className="text-sm text-slate-400 underline underline-offset-2 hover:text-slate-200">
            로그인으로 돌아가기
          </Link>
        </div>

        <section className="rounded-xl border border-white/10 bg-slate-950/80 p-4 text-sm leading-7">
          <p>
            ImFencer(이하 &quot;서비스&quot;)는 회원 식별, 커뮤니티/거래/레슨 기능 제공, 고객 문의 대응을 위해 필요한 최소한의
            개인정보를 처리합니다.
          </p>
          <p className="mt-3">
            수집 항목: 이메일, 닉네임, 프로필 정보(종목/클럽), 서비스 이용 기록(게시글/댓글/채팅/결제/푸시 토큰).
          </p>
          <p className="mt-3">
            이용 목적: 계정 인증, 사용자 간 상호작용 제공, 결제 처리, 알림 제공, 부정 이용 방지, 고객 지원 및 운영 안정화.
          </p>
          <p className="mt-3">
            보관 및 파기: 관계 법령 또는 서비스 운영 목적 달성 시까지 보관하며, 회원 탈퇴 시 관련 정책에 따라 지체 없이 파기 또는
            비식별 처리합니다.
          </p>
          <p className="mt-3">
            이용자는 언제든지 본인 정보 열람/정정/삭제를 요청할 수 있으며, 앱 내 계정 삭제 기능을 통해 탈퇴할 수 있습니다.
          </p>
        </section>

        <p className="text-xs text-slate-500">최종 업데이트: 2026-02-22</p>
      </div>
    </main>
  );
}
