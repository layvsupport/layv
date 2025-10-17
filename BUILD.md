# AISpace 빌드 가이드

## 사전 준비

1. **Node.js 설치 확인**
   ```bash
   node --version
   npm --version
   ```

2. **의존성 패키지 설치**
   ```bash
   npm install
   ```

## 빌드 명령어

### 개발 모드 실행
```bash
npm start
```

### 배포용 빌드

#### Windows 빌드
```bash
npm run build:win
```
생성 파일:
- `dist/AISpace Setup 1.0.0.exe` (설치 프로그램)
- `dist/AISpace 1.0.0.exe` (포터블 버전)

#### macOS 빌드
```bash
npm run build:mac
```
생성 파일:
- `dist/AISpace-1.0.0.dmg` (DMG 이미지)
- `dist/AISpace-1.0.0-mac.zip` (압축 파일)

#### Linux 빌드
```bash
npm run build:linux
```
생성 파일:
- `dist/AISpace-1.0.0.AppImage` (AppImage)
- `dist/aispace_1.0.0_amd64.deb` (Debian 패키지)

#### 모든 플랫폼 빌드
```bash
npm run build:all
```

## 빌드 결과물

빌드가 완료되면 `dist/` 폴더에 다음과 같은 파일들이 생성됩니다:

### Windows
- **설치 프로그램**: `AISpace Setup 1.0.0.exe`
  - NSIS 기반 인스톨러
  - 프로그램 메뉴 및 바탕화면 바로가기 생성
  - 설치 경로 선택 가능

- **포터블 버전**: `AISpace 1.0.0.exe`
  - 설치 없이 실행 가능
  - USB 등에 담아 이동 가능

### macOS
- **DMG 이미지**: `AISpace-1.0.0.dmg`
  - 드래그 앤 드롭 설치
  - x64 및 Apple Silicon(M1/M2) 지원

- **압축 파일**: `AISpace-1.0.0-mac.zip`
  - 압축 해제 후 실행

### Linux
- **AppImage**: `AISpace-1.0.0.AppImage`
  - 의존성 없이 독립 실행 가능
  - 실행 권한 부여 후 실행: `chmod +x AISpace-1.0.0.AppImage`

- **DEB 패키지**: `aispace_1.0.0_amd64.deb`
  - Ubuntu/Debian 계열에서 설치: `sudo dpkg -i aispace_1.0.0_amd64.deb`

## 아이콘 파일 (선택사항)

더 전문적인 배포를 위해 아이콘 파일을 추가할 수 있습니다:

```
assets/
└── icons/
    ├── icon.ico      (Windows, 256x256)
    ├── icon.icns     (macOS)
    └── icon.png      (Linux, 512x512)
```

아이콘이 없어도 빌드는 정상적으로 진행됩니다 (기본 Electron 아이콘 사용).

## 문제 해결

### Windows에서 코드 서명 경고
- 코드 서명 인증서가 없으면 Windows Defender에서 경고가 표시될 수 있습니다.
- 배포 시 코드 서명 인증서를 구매하여 적용하는 것을 권장합니다.

### macOS에서 "확인되지 않은 개발자" 경고
- Apple 개발자 계정으로 앱을 공증(notarize)해야 경고가 표시되지 않습니다.
- 개인 사용 시: 시스템 환경설정 > 보안 및 개인 정보 보호 > "확인 없이 열기"

### Linux에서 실행 권한 문제
```bash
chmod +x AISpace-1.0.0.AppImage
./AISpace-1.0.0.AppImage
```

## 버전 업데이트

버전을 업데이트하려면 `package.json`의 `version` 필드를 수정하세요:
```json
{
  "version": "1.0.1"
}
```

## 추가 정보

- 빌드 시간: 플랫폼당 5-10분 소요
- 빌드 크기: 약 200-300MB (플랫폼별로 다름)
- 첫 빌드 시 의존성 다운로드로 시간이 더 걸릴 수 있습니다.

