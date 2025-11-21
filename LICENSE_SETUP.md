# 라이선스 키 시스템 설정 가이드

이 문서는 AISpace 앱에 라이선스 키 검증 시스템을 설정하는 방법을 설명합니다.

## 📋 목차

1. [Supabase 설정](#1-supabase-설정)
2. [Vercel Functions 설정](#2-vercel-functions-설정)
3. [앱 설정](#3-앱-설정)
4. [테스트](#4-테스트)

---

## 1. Supabase 설정

### 1.1 테이블 생성

1. Supabase Dashboard에 로그인
2. **SQL Editor** 메뉴로 이동
3. `supabase-schema.sql` 파일의 내용을 복사하여 실행
4. 테이블이 생성되었는지 확인

### 1.2 테스트 라이선스 키 생성

SQL Editor에서 다음 쿼리를 실행하여 테스트용 라이선스 키를 생성하세요:

```sql
-- 테스트용 라이선스 키 생성
INSERT INTO licenses (license_key, user_email, expires_at, is_active)
VALUES 
  ('TEST-1234-5678-9012', 'test@example.com', NOW() + INTERVAL '1 year', true),
  ('DEMO-ABCD-EFGH-IJKL', 'demo@example.com', NOW() + INTERVAL '6 months', true);
```

### 1.3 API 키 확인

1. **Settings** > **API** 메뉴로 이동
2. 다음 정보를 복사해두세요:
   - **Project URL** (예: `https://xxxxx.supabase.co`)
   - **anon/public key** (예: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

---

## 2. Vercel Functions 설정

### 2.1 프로젝트 준비

1. 프로젝트 루트에 `api` 폴더가 있는지 확인
2. `api/verify-license.js` 파일이 있는지 확인

### 2.2 Vercel에 프로젝트 배포

#### 방법 1: Vercel CLI 사용

```bash
# Vercel CLI 설치 (처음 한 번만)
npm i -g vercel

# 프로젝트 루트에서 실행
vercel

# 프로덕션 배포
vercel --prod
```

#### 방법 2: Vercel Dashboard 사용 (추천)

**단계별 가이드:**

1. **프로젝트 준비**
   - `vercel.json` 파일이 프로젝트 루트에 있는지 확인 (이미 생성됨)
   - `api/verify-license.js` 파일이 있는지 확인

2. **Vercel Dashboard 접속**
   - [Vercel Dashboard](https://vercel.com/dashboard)에 로그인
   - **Add New Project** 버튼 클릭

3. **저장소 연결**
   - GitHub/GitLab/Bitbucket에서 저장소 선택
   - 또는 **Import Third-Party Git Repository**로 다른 Git 서비스 연결
   - 저장소가 없으면 **Deploy** 탭에서 직접 업로드 가능

4. **프로젝트 설정 (중요!)**
   
   Vercel이 자동으로 설정을 감지하지만, 다음 항목을 확인하세요:
   
   | 설정 항목 | 값 | 설명 |
   |---------|-----|------|
   | **Framework Preset** | `Other` 또는 `Other (no framework)` | Electron 앱이므로 프레임워크 없음 |
   | **Root Directory** | `./` (기본값) | 프로젝트 루트 그대로 |
   | **Build Command** | *(비워두기)* | API만 배포하므로 빌드 불필요 |
   | **Output Directory** | *(비워두기)* | API만 배포하므로 출력 디렉토리 불필요 |
   | **Install Command** | `npm install` (기본값) | 그대로 두기 |
   
   **참고:** `vercel.json` 파일이 있으면 대부분 자동으로 설정됩니다!

5. **환경 변수 설정 (나중에 해도 됨)**
   - 이 단계는 건너뛰고 먼저 배포 진행
   - 배포 후 Settings에서 환경 변수 추가 가능

6. **Deploy 클릭**
   - **Deploy** 버튼 클릭
   - 배포가 완료될 때까지 대기 (약 1-2분)

### 2.3 환경 변수 설정

**배포 후 반드시 설정해야 합니다!**

1. **Vercel Dashboard에서 프로젝트 선택**
   - 배포가 완료된 프로젝트 클릭

2. **Settings 메뉴로 이동**
   - 상단 메뉴에서 **Settings** 클릭
   - 왼쪽 사이드바에서 **Environment Variables** 클릭

3. **환경 변수 추가**
   
   **첫 번째 변수 추가:**
   - **Key**: `SUPABASE_URL`
   - **Value**: Supabase Dashboard > Settings > API에서 복사한 **Project URL**
     - 예: `https://xxxxxxxxxxxxx.supabase.co`
   - **Environment**: ✅ Production, ✅ Preview, ✅ Development 모두 체크
   - **Add** 버튼 클릭
   
   **두 번째 변수 추가:**
   - **Key**: `SUPABASE_ANON_KEY`
   - **Value**: Supabase Dashboard > Settings > API에서 복사한 **anon public** 키
     - 예: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (긴 문자열)
   - **Environment**: ✅ Production, ✅ Preview, ✅ Development 모두 체크
   - **Add** 버튼 클릭

4. **재배포 (중요!)**
   - 환경 변수를 추가한 후 **반드시 재배포**해야 적용됩니다
   - **Deployments** 탭으로 이동
   - 최신 배포 옆 **⋯ (점 3개)** 메뉴 클릭
   - **Redeploy** 선택
   - 또는 **Settings** > **Environment Variables** 페이지 하단의 **Redeploy** 버튼 클릭

### 2.4 API 엔드포인트 URL 확인

1. Vercel Dashboard에서 프로젝트 선택
2. **Deployments** 탭에서 최신 배포 확인
3. API 엔드포인트 URL: `https://your-project.vercel.app/api/verify-license`
   - 예: `https://aispace-app.vercel.app/api/verify-license`

---

## 3. 앱 설정

### 3.1 라이선스 API URL 설정

1. `src/js/license.js` 파일을 열기
2. `LICENSE_API_URL` 상수를 찾아서 Vercel API 엔드포인트 URL로 변경:

```javascript
const LICENSE_API_URL = 'https://your-project.vercel.app/api/verify-license';
```

예시:
```javascript
const LICENSE_API_URL = 'https://aispace-app.vercel.app/api/verify-license';
```

### 3.2 빌드 및 테스트

```bash
# 개발 모드로 실행
npm start

# 빌드
npm run build:win
```

---

## 4. 테스트

### 4.1 정상적인 라이선스 키 테스트

1. 앱 실행
2. 라이선스 모달이 표시되는지 확인
3. 유효한 라이선스 키 입력 (예: `TEST-1234-5678-9012`)
4. "인증" 버튼 클릭
5. 인증 성공 후 앱이 정상적으로 시작되는지 확인

### 4.2 잘못된 라이선스 키 테스트

1. 앱 실행
2. 존재하지 않는 라이선스 키 입력 (예: `INVALID-KEY-TEST-1234`)
3. "인증" 버튼 클릭
4. 오류 메시지가 표시되는지 확인

### 4.3 중복 활성화 테스트

1. 한 디바이스에서 라이선스 키 활성화
2. 다른 디바이스에서 같은 라이선스 키로 인증 시도
3. "이미 다른 디바이스에서 활성화되었습니다" 오류 메시지 확인

---

## 🔧 문제 해결

### 라이선스 모달이 표시되지 않음

- `src/js/app.js`에서 라이선스 모듈 import 확인
- 브라우저 콘솔에서 오류 메시지 확인

### 인증이 실패함

- Vercel 환경 변수 확인 (Settings > Environment Variables)
- Supabase 테이블에 라이선스 키가 존재하는지 확인
- 브라우저 개발자 도구의 Network 탭에서 API 요청 확인
- Vercel Functions 로그 확인 (Dashboard > 프로젝트 > Functions 탭)

### CORS 오류

- Vercel Function의 CORS 헤더 설정 확인
- `api/verify-license.js`에서 `Access-Control-Allow-Origin` 헤더가 설정되어 있는지 확인

### Vercel 배포 오류

- `api/verify-license.js` 파일이 프로젝트 루트의 `api` 폴더에 있는지 확인
- Vercel Dashboard의 Functions 탭에서 함수가 제대로 배포되었는지 확인

---

## 📝 라이선스 키 관리

### 라이선스 키 생성

Supabase SQL Editor에서:

```sql
INSERT INTO licenses (license_key, user_email, expires_at, is_active)
VALUES ('XXXX-XXXX-XXXX-XXXX', 'user@example.com', NOW() + INTERVAL '1 year', true);
```

### 라이선스 키 비활성화

```sql
UPDATE licenses 
SET is_active = false 
WHERE license_key = 'XXXX-XXXX-XXXX-XXXX';
```

### 라이선스 키 활성화 해제 (다른 디바이스에서 사용 가능하도록)

```sql
UPDATE licenses 
SET device_id = NULL, activated_at = NULL 
WHERE license_key = 'XXXX-XXXX-XXXX-XXXX';
```

---

## 🔒 보안 고려사항

1. **프로덕션 환경에서는**:
   - Vercel에 Rate Limiting 추가 권장 (Vercel Pro 플랜 이상)
   - Supabase RLS 정책을 더 엄격하게 설정
   - HTTPS 사용 필수 (Vercel은 기본 제공)
   - 환경 변수는 Vercel Dashboard에서만 관리

2. **디바이스 ID**:
   - 현재는 간단한 랜덤 문자열 사용
   - 프로덕션에서는 하드웨어 정보 기반 ID 사용 권장

3. **라이선스 키 형식**:
   - 현재는 자유 형식
   - 프로덕션에서는 특정 패턴 검증 추가 권장

---

## 📞 지원

문제가 발생하면 다음을 확인하세요:
- Supabase 로그 (Dashboard > Logs)
- Vercel Functions 로그 (Dashboard > 프로젝트 > Functions 탭)
- 브라우저 콘솔 오류 (F12 > Console)
- Network 탭에서 API 요청/응답 확인 (F12 > Network)

