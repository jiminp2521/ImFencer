import Link from 'next/link';

export const metadata = {
  title: '개인정보처리방침 | ImFencer',
};

const collectionRows = [
  {
    category: '회원가입/인증',
    items: '소셜 식별자, 이메일, 닉네임(제공 범위 내)',
    purpose: '회원 식별, 인증, 계정 보안, 중복 가입 방지',
    retention: '회원 탈퇴 시 지체 없이 파기 (법령 보관 의무 예외)',
  },
  {
    category: '프로필 설정',
    items: '닉네임, 종목, 선수 구분, 소속 클럽(선택)',
    purpose: '프로필 표시, 맞춤형 커뮤니티 경험 제공',
    retention: '회원 탈퇴 시 지체 없이 파기',
  },
  {
    category: '서비스 이용',
    items: '게시글/댓글/채팅/거래/결제 기록, 접속 로그, 기기정보, 푸시 토큰',
    purpose: '서비스 제공, 분쟁 대응, 부정 이용 방지, 운영 안정화',
    retention: '목적 달성 시 파기 또는 법정 보관기간 보관',
  },
];

const legalRetentionRows = [
  {
    basis: '전자상거래 등에서의 소비자보호에 관한 법률',
    item: '계약 또는 청약철회 등에 관한 기록',
    period: '5년',
  },
  {
    basis: '전자상거래 등에서의 소비자보호에 관한 법률',
    item: '대금결제 및 재화 등의 공급에 관한 기록',
    period: '5년',
  },
  {
    basis: '전자상거래 등에서의 소비자보호에 관한 법률',
    item: '소비자 불만 또는 분쟁처리에 관한 기록',
    period: '3년',
  },
  {
    basis: '통신비밀보호법',
    item: '접속 로그(웹/앱 접속기록 등)',
    period: '3개월',
  },
];

const entrustmentRows = [
  {
    company: 'Supabase',
    task: '인증, 데이터베이스, 스토리지 인프라 운영',
  },
  {
    company: 'Vercel',
    task: '웹 애플리케이션 호스팅 및 배포',
  },
  {
    company: 'Firebase Cloud Messaging',
    task: '푸시 알림 발송',
  },
  {
    company: '토스페이먼츠',
    task: '결제 처리 및 결제 상태 연동',
  },
];

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-black px-4 py-8 text-slate-200">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">개인정보처리방침</h1>
            <p className="mt-1 text-xs text-slate-400">시행일: 2026-02-22 | 최종 개정일: 2026-02-22</p>
          </div>
          <Link href="/login" className="text-sm text-slate-400 underline underline-offset-2 hover:text-slate-200">
            로그인으로 돌아가기
          </Link>
        </div>

        <section className="rounded-xl border border-white/10 bg-slate-950/80 p-4 text-sm leading-7 text-slate-300">
          <p>
            ImFencer(이하 &quot;회사&quot;)는 개인정보보호법 등 관계 법령을 준수하며, 이용자의 개인정보를 안전하게 처리한다. 회사는
            서비스 제공에 필요한 최소한의 정보만 수집하며, 처리 목적이 달성되면 지체 없이 파기한다.
          </p>
        </section>

        <section className="rounded-xl border border-white/10 bg-slate-950/80 p-4">
          <h2 className="text-sm font-semibold text-white">① 수집 항목, 목적, 보관기간</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-xs text-slate-300">
              <thead>
                <tr className="border-b border-white/10 text-slate-200">
                  <th className="px-3 py-2 font-semibold">구분</th>
                  <th className="px-3 py-2 font-semibold">수집 항목</th>
                  <th className="px-3 py-2 font-semibold">이용 목적</th>
                  <th className="px-3 py-2 font-semibold">보관 기간</th>
                </tr>
              </thead>
              <tbody>
                {collectionRows.map((row) => (
                  <tr key={row.category} className="border-b border-white/5 align-top">
                    <td className="px-3 py-2">{row.category}</td>
                    <td className="px-3 py-2">{row.items}</td>
                    <td className="px-3 py-2">{row.purpose}</td>
                    <td className="px-3 py-2">{row.retention}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs leading-6 text-slate-400">
            필수정보 수집·이용에 대한 동의를 거부할 수 있으나, 동의 거부 시 회원가입 또는 핵심 기능 이용이 제한된다.
          </p>
        </section>

        <section className="rounded-xl border border-white/10 bg-slate-950/80 p-4">
          <h2 className="text-sm font-semibold text-white">② 법령에 따른 보관 항목</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-xs text-slate-300">
              <thead>
                <tr className="border-b border-white/10 text-slate-200">
                  <th className="px-3 py-2 font-semibold">법적 근거</th>
                  <th className="px-3 py-2 font-semibold">보관 항목</th>
                  <th className="px-3 py-2 font-semibold">보관 기간</th>
                </tr>
              </thead>
              <tbody>
                {legalRetentionRows.map((row) => (
                  <tr key={`${row.basis}-${row.item}`} className="border-b border-white/5 align-top">
                    <td className="px-3 py-2">{row.basis}</td>
                    <td className="px-3 py-2">{row.item}</td>
                    <td className="px-3 py-2">{row.period}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border border-white/10 bg-slate-950/80 p-4">
          <h2 className="text-sm font-semibold text-white">③ 개인정보 처리위탁</h2>
          <p className="mt-2 text-xs leading-6 text-slate-300">
            회사는 원활한 서비스 제공을 위해 외부 전문업체에 개인정보 처리업무를 위탁할 수 있으며, 위탁계약 시 법령상 안전조치를
            준수하도록 관리·감독한다.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-xs text-slate-300">
              <thead>
                <tr className="border-b border-white/10 text-slate-200">
                  <th className="px-3 py-2 font-semibold">수탁사</th>
                  <th className="px-3 py-2 font-semibold">위탁 업무</th>
                </tr>
              </thead>
              <tbody>
                {entrustmentRows.map((row) => (
                  <tr key={row.company} className="border-b border-white/5 align-top">
                    <td className="px-3 py-2">{row.company}</td>
                    <td className="px-3 py-2">{row.task}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs leading-6 text-slate-400">
            클라우드 및 소셜 인증 인프라 특성상 개인정보가 국외 서버에서 처리될 수 있으며, 회사는 관련 법령에 따른 고지 의무를
            준수한다.
          </p>
        </section>

        <section className="rounded-xl border border-white/10 bg-slate-950/80 p-4 text-sm leading-7 text-slate-300">
          <h2 className="text-sm font-semibold text-white">④ 이용자 권리와 행사 방법</h2>
          <p className="mt-2">
            이용자는 언제든지 개인정보 열람, 정정, 삭제, 처리정지를 요청할 수 있다. 앱 내 계정삭제 기능으로 탈퇴를 요청할 수
            있으며, 회사는 관련 법령에서 정한 바에 따라 지체 없이 처리한다.
          </p>
        </section>

        <section className="rounded-xl border border-white/10 bg-slate-950/80 p-4 text-sm leading-7 text-slate-300">
          <h2 className="text-sm font-semibold text-white">⑤ 안전성 확보 조치</h2>
          <p className="mt-2">
            회사는 접근권한 관리, 전송구간 암호화, 로그 모니터링, 내부 접근 통제 등 개인정보 보호를 위한 기술적·관리적 조치를
            시행한다.
          </p>
        </section>

        <section className="rounded-xl border border-white/10 bg-slate-950/80 p-4 text-sm leading-7 text-slate-300">
          <h2 className="text-sm font-semibold text-white">⑥ 방침 변경 및 고지</h2>
          <p className="mt-2">
            본 방침의 내용 추가, 삭제, 수정이 있는 경우 시행일 7일 전(중요 변경은 30일 전)부터 앱 공지사항 또는 로그인 화면을 통해
            고지한다.
          </p>
        </section>
      </div>
    </main>
  );
}
