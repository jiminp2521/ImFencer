# ImFencer Social Login Go-Live (Google/Kakao/Apple)

아래 2개가 실제 동작의 핵심입니다.

## 4) OAuth Provider Console 설정

### A. Supabase (공통)

1. Supabase Dashboard > Authentication > URL Configuration
2. `Site URL`:
   - `https://imfencer.com`
3. `Redirect URLs`에 아래 2개 추가:
   - `https://imfencer.com/auth/callback`
   - `imfencer://auth/callback`
4. Authentication > Providers에서 Google/Kakao/Apple 활성화

### B. Google

1. Google Cloud Console > APIs & Services > Credentials
2. OAuth Client 생성(또는 수정)
3. Authorized redirect URI:
   - `https://xpirrkfejdnjiaivohez.supabase.co/auth/v1/callback`
4. 발급한 Client ID/Secret을 Supabase Google Provider에 입력

### C. Kakao

1. Kakao Developers > 내 애플리케이션 > 카카오 로그인 활성화
2. Redirect URI 추가:
   - `https://xpirrkfejdnjiaivohez.supabase.co/auth/v1/callback`
3. 플랫폼 등록:
   - Web: `https://imfencer.com`
4. REST API Key(+ Secret 사용 시 Secret) 값을 Supabase Kakao Provider에 입력

### D. Apple

1. Apple Developer > Certificates, IDs & Profiles
2. `Identifiers`에서 Services ID 생성(예: `com.imfencer.web`)
3. Sign in with Apple 활성화 후 다음 입력:
   - Domain: `xpirrkfejdnjiaivohez.supabase.co`
   - Return URL: `https://xpirrkfejdnjiaivohez.supabase.co/auth/v1/callback`
4. Key 생성(Sign in with Apple 권한) 후 `.p8`, Key ID, Team ID 확보
5. Supabase Apple Provider에 Services ID/Key ID/Team ID/Private Key 입력

## 5) 모바일 복귀/딥링크 설정 점검

### iOS

1. Xcode > App target > Signing & Capabilities
2. `Associated Domains` 추가:
   - `applinks:imfencer.com`
3. 프로젝트에 entitlements 파일 연결 확인:
   - `mobile/ios/App/App/App.entitlements`
4. URL Scheme 확인:
   - `imfencer` (`Info.plist`)

### Android

1. `mobile/android/app/src/main/AndroidManifest.xml`의 intent-filter 유지
2. 앱링크 검증용 파일 배포 확인:
   - `https://imfencer.com/.well-known/assetlinks.json`

### 공통 검증 시나리오

1. 앱에서 Google/Kakao/Apple 버튼 클릭
2. 외부 브라우저로 이동
3. 로그인 완료 후 앱 복귀
4. 세션 생성 및 홈 진입 확인
5. 실패 시 `/login?oauthError=...` 메시지 확인
