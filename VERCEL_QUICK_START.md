# Vercel 빠른 시작 가이드

Vercel Dashboard에서 프로젝트를 배포하는 가장 쉬운 방법입니다.

## 🚀 5분 안에 배포하기

### 1단계: 프로젝트 준비 확인

프로젝트 루트에 다음 파일들이 있는지 확인:
- ✅ `api/verify-license.js` (API 함수)
- ✅ `vercel.json` (자동 설정 파일)

### 2단계: Vercel에 로그인

1. [vercel.com](https://vercel.com) 접속
2. GitHub/GitLab/Bitbucket 계정으로 로그인

### 3단계: 프로젝트 추가

1. **Add New Project** 버튼 클릭
2. 저장소 선택 (GitHub에서 AISpace 저장소 찾기)
3. **Import** 클릭

### 4단계: 설정 확인 (자동으로 되어 있음!)

`vercel.json` 파일이 있으면 Vercel이 자동으로 설정합니다.

**확인만 하면 되는 항목:**
- Framework Preset: `Other` (자동 감지됨)
- Root Directory: `./` (기본값)
- Build Command: *(비워있음 - 정상)*
- Output Directory: *(비워있음 - 정상)*

**→ 그냥 Deploy 버튼 클릭!**

### 5단계: 배포 완료 대기

- 약 1-2분 소요
- "Building..." → "Ready" 상태가 되면 완료

### 6단계: 환경 변수 설정 (중요!)

배포가 완료된 후:

1. 프로젝트 페이지에서 **Settings** 클릭
2. 왼쪽 메뉴에서 **Environment Variables** 클릭
3. 다음 두 개 추가:

   **변수 1:**
   ```
   Key: SUPABASE_URL
   Value: https://xxxxx.supabase.co (Supabase에서 복사)
   Environment: Production, Preview, Development 모두 체크
   ```

   **변수 2:**
   ```
   Key: SUPABASE_ANON_KEY
   Value: eyJhbGci... (Supabase에서 복사)
   Environment: Production, Preview, Development 모두 체크
   ```

4. **Save** 클릭
5. 페이지 하단의 **Redeploy** 버튼 클릭

### 7단계: API URL 확인

배포 완료 후:
- 프로젝트 페이지에서 **Deployments** 탭 확인
- 최신 배포의 **Domains** 섹션에서 URL 확인
- API 엔드포인트: `https://your-project.vercel.app/api/verify-license`

## ✅ 완료!

이제 `src/js/license.js` 파일에서 `LICENSE_API_URL`을 위 URL로 변경하면 됩니다!

---

## 🆘 문제 해결

### "Framework Preset을 선택하세요" 오류

→ **Other** 또는 **Other (no framework)** 선택

### "Build Command가 필요합니다" 오류

→ 그냥 비워두고 Deploy 클릭 (API만 배포하므로 빌드 불필요)

### 배포는 되는데 API가 404 오류

→ `api/verify-license.js` 파일이 프로젝트 루트의 `api` 폴더에 있는지 확인

### 환경 변수가 적용되지 않음

→ 환경 변수 추가 후 **반드시 Redeploy** 해야 함!

