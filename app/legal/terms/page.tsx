import Link from 'next/link';

export const metadata = {
  title: '이용약관 | ImFencer',
};

type TermsSection = {
  title: string;
  lines: string[];
};

const TERMS_SECTIONS: TermsSection[] = [
  {
    title: '제1조(목적)',
    lines: [
      '본 약관은 ImFencer(이하 "회사")가 제공하는 커뮤니티, 채팅, 중고거래, 레슨/클래스, 결제 연동 서비스의 이용조건과 절차를 정함을 목적으로 한다.',
      '회원은 본 약관에 동의한 후 서비스를 이용할 수 있으며, 미동의 시 가입 및 이용이 제한된다.',
    ],
  },
  {
    title: '제2조(정의)',
    lines: [
      '"회원"은 약관에 동의하고 회사와 이용계약을 체결한 자를 말한다.',
      '"콘텐츠"는 게시글, 댓글, 채팅, 이미지 등 회원이 서비스에 입력하거나 등록한 정보를 말한다.',
      '"거래"는 회원 간 물품/서비스 판매·구매 활동 및 이에 수반되는 커뮤니케이션을 말한다.',
    ],
  },
  {
    title: '제3조(회원가입 및 계정관리)',
    lines: [
      '회원가입은 소셜 로그인 후 필수 프로필 정보를 입력하고 가입 완료를 승인함으로써 성립한다.',
      '회원은 본인 명의의 정확한 정보를 제공하여야 하며, 허위 정보로 인한 불이익은 회원이 부담한다.',
      '계정의 관리 책임은 회원에게 있으며, 제3자에게 계정을 양도/대여할 수 없다.',
      '만 14세 미만은 법정대리인 동의 절차가 별도로 마련되기 전까지 가입할 수 없다.',
    ],
  },
  {
    title: '제4조(서비스 이용)',
    lines: [
      '회사는 안정적인 서비스 제공을 위해 시스템 점검, 기능 개선, 정책 개편을 수행할 수 있다.',
      '회사는 운영상 필요 시 서비스의 전부 또는 일부를 변경, 일시 중단, 종료할 수 있으며 사전에 고지한다.',
      '회원은 관련 법령, 본 약관, 운영정책, 공지사항을 준수하여 서비스를 이용하여야 한다.',
    ],
  },
  {
    title: '제5조(회원의 금지행위)',
    lines: [
      '회원은 타인의 권리 침해, 명의도용, 사기/허위거래, 불법정보 게시, 욕설·비방·혐오표현, 스팸 발송 행위를 해서는 안 된다.',
      '회원은 악성코드 배포, 서비스 장애 유발, 비정상 접근 등 보안 위협 행위를 해서는 안 된다.',
      '회원은 회사의 사전 승인 없이 서비스 데이터를 영리적으로 수집·재판매할 수 없다.',
    ],
  },
  {
    title: '제6조(유료서비스 및 결제)',
    lines: [
      '유료 기능의 결제는 회사가 지정한 결제수단 및 결제대행사를 통해 처리한다.',
      '결제 취소·환불은 관계 법령, 결제대행사 정책, 서비스별 환불규정을 따른다.',
      '회원의 귀책 사유로 발생한 결제 분쟁·손해는 회원이 부담하며, 회사는 고의·중과실이 없는 한 책임을 제한한다.',
    ],
  },
  {
    title: '제7조(콘텐츠 권리 및 이용허락)',
    lines: [
      '회원이 등록한 콘텐츠의 저작권은 해당 회원에게 귀속된다.',
      '회원은 서비스 운영, 표시, 백업, 검색 최적화 목적 범위 내에서 회사에 비독점적 이용권을 부여한다.',
      '타인의 권리를 침해한 콘텐츠는 사전통지 없이 삭제 또는 비공개 처리될 수 있다.',
    ],
  },
  {
    title: '제8조(계약해지 및 이용제한)',
    lines: [
      '회원은 언제든지 앱 내 계정삭제 기능을 통해 이용계약 해지를 요청할 수 있다.',
      '회사는 약관·법령 위반 시 경고, 게시물 제한, 기능 제한, 계정정지, 계약해지 조치를 할 수 있다.',
      '중대한 위반행위 또는 반복 위반행위가 확인되면 사전 통지 없이 즉시 이용을 제한할 수 있다.',
    ],
  },
  {
    title: '제9조(면책)',
    lines: [
      '회사는 천재지변, 전시, 통신장애, 제3자 서비스 장애 등 불가항력으로 인한 손해에 대하여 책임을 지지 않는다.',
      '회원 상호 간 거래·분쟁·커뮤니케이션으로 발생한 손해는 당사자 간 해결을 원칙으로 한다.',
      '회사는 무료 서비스 범위에서 특별한 사정이 없는 한 간접손해, 특별손해, 영업손실에 대한 책임을 제한한다.',
    ],
  },
  {
    title: '제10조(약관 변경 및 준거법)',
    lines: [
      '회사는 관련 법령 또는 서비스 정책 변경 시 약관을 개정할 수 있으며 시행일과 개정 사유를 사전에 공지한다.',
      '회원이 개정 약관 시행일 이후 서비스를 계속 이용하면 개정 약관에 동의한 것으로 본다.',
      '본 약관은 대한민국 법령을 준거법으로 하며, 분쟁 관할은 관계 법령이 정하는 법원을 따른다.',
    ],
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-black px-4 py-8 text-slate-200">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">이용약관</h1>
            <p className="mt-1 text-xs text-slate-400">시행일: 2026-02-22 | 최종 개정일: 2026-02-22</p>
          </div>
          <Link href="/login" className="text-sm text-slate-400 underline underline-offset-2 hover:text-slate-200">
            로그인으로 돌아가기
          </Link>
        </div>

        <section className="rounded-xl border border-white/10 bg-slate-950/80 p-4 text-sm leading-7">
          <p>
            본 약관은 ImFencer 서비스 이용에 필요한 기본 사항을 규정한다. 회원은 약관 전문을 충분히 확인한 후 동의하여야 하며,
            동의하지 않으면 회원가입 및 핵심 기능 이용이 제한된다.
          </p>
        </section>

        <div className="space-y-3">
          {TERMS_SECTIONS.map((section) => (
            <section key={section.title} className="rounded-xl border border-white/10 bg-slate-950/80 p-4">
              <h2 className="text-sm font-semibold text-white">{section.title}</h2>
              <div className="mt-2 space-y-2 text-sm leading-7 text-slate-300">
                {section.lines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <p className="text-xs text-slate-500">문의: 앱 내 문의 기능 또는 운영 공지 채널을 이용한다.</p>
      </div>
    </main>
  );
}
