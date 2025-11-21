/**
 * 라이선스 검증 모듈
 */

const LICENSE_STORAGE_KEY = 'aispace_license';
const DEVICE_ID_KEY = 'aispace_device_id';

// Vercel API 엔드포인트 URL (실제 배포 후 변경 필요)
const LICENSE_API_URL = 'YOUR_VERCEL_API_URL'; // 예: https://your-project.vercel.app/api/verify-license

/**
 * 디바이스 ID 생성/가져오기
 * @returns {string} 디바이스 ID
 */
function getDeviceId() {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    // 간단한 디바이스 ID 생성
    // 실제 프로덕션에서는 더 안전한 방법 사용 권장 (예: 하드웨어 정보 기반)
    deviceId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

/**
 * 저장된 라이선스 정보 가져오기
 * @returns {Object|null} 라이선스 정보 또는 null
 */
function getStoredLicense() {
  try {
    const stored = localStorage.getItem(LICENSE_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('라이선스 정보 파싱 오류:', error);
    return null;
  }
}

/**
 * 라이선스 정보 저장
 * @param {Object} licenseData - 저장할 라이선스 데이터
 * @returns {boolean} 저장 성공 여부
 */
function saveLicense(licenseData) {
  try {
    localStorage.setItem(LICENSE_STORAGE_KEY, JSON.stringify(licenseData));
    return true;
  } catch (error) {
    console.error('라이선스 저장 실패:', error);
    return false;
  }
}

/**
 * 라이선스 정보 삭제
 */
function clearLicense() {
  try {
    localStorage.removeItem(LICENSE_STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('라이선스 삭제 실패:', error);
    return false;
  }
}

/**
 * 라이선스 검증 API 호출
 * @param {string} licenseKey - 라이선스 키
 * @returns {Promise<Object>} 검증 결과
 */
async function verifyLicense(licenseKey) {
  const deviceId = getDeviceId();

  // API URL이 설정되지 않은 경우
  if (LICENSE_API_URL === 'YOUR_VERCEL_API_URL') {
    console.warn('라이선스 API URL이 설정되지 않았습니다.');
    return { 
      success: false, 
      error: '라이선스 서버가 설정되지 않았습니다. 관리자에게 문의하세요.' 
    };
  }

  try {
    const response = await fetch(LICENSE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        licenseKey: licenseKey.trim(),
        deviceId,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP 오류: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('라이선스 검증 실패:', error);
    
    // 네트워크 오류인 경우
    if (error.message.includes('fetch')) {
      return { 
        success: false, 
        error: '네트워크 연결을 확인하세요.' 
      };
    }
    
    return { 
      success: false, 
      error: '라이선스 검증 중 오류가 발생했습니다.' 
    };
  }
}

/**
 * 라이선스 유효성 확인
 * @returns {boolean} 라이선스가 유효한지 여부
 */
function isLicenseValid() {
  const license = getStoredLicense();
  if (!license) {
    return false;
  }

  // 만료일 확인
  if (license.expiresAt) {
    const expiresAt = new Date(license.expiresAt);
    if (expiresAt < new Date()) {
      // 만료된 라이선스 삭제
      clearLicense();
      return false;
    }
  }

  return true;
}

export {
  getDeviceId,
  getStoredLicense,
  saveLicense,
  clearLicense,
  verifyLicense,
  isLicenseValid,
  LICENSE_API_URL,
};

