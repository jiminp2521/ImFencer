# Social Signup Consent Research (Updated: 2026-02-22)

## Primary sources reviewed

- 개인정보보호법(법률 제19234호): https://www.law.go.kr/법령/개인정보%20보호법/(19234,20230915)
  - 제15조(개인정보의 수집·이용)
  - 제17조(개인정보의 제공)
  - 제22조(동의를 받는 방법)
  - 제30조(개인정보 처리방침의 수립 및 공개)
- Apple App Store Review Guidelines 5.1.1 Data Collection and Storage: https://developer.apple.com/app-store/review/guidelines/#5.1.1
- Google Play User Data policy: https://support.google.com/googleplay/android-developer/answer/9876937

## Consent UX decisions reflected in app

- 필수 동의
  - 만 14세 이상 확인
  - 이용약관 동의
  - 개인정보 수집·이용 동의
  - 개인정보 처리위탁·외부 연동 안내 확인
  - 개인정보처리방침 확인
- 선택 동의
  - 마케팅 정보 수신 동의

## Why the consent UI was expanded

- 법령상 동의 항목은 목적/항목/보관기간/거부권을 명확히 고지해야 한다.
- 앱스토어/플레이 심사에서는 데이터 처리 투명성(고지, 링크, 동의 흐름)을 확인한다.
- 따라서 단순 체크박스 2~3개가 아닌, 항목별 전문 펼침 + 원문 링크 + 필수/선택 분리를 반영했다.

## Flow enforcement

- `signup` 화면: 소셜 가입 버튼만 제공
- 소셜 인증 성공 후: `/signup/profile`로 이동
- 프로필 저장 전: 서비스 주요 화면 접근 제한
- 프로필 저장 완료 후: 가입 완료로 간주
