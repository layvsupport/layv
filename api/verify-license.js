/**
 * Vercel Serverless Function - 라이선스 검증 API
 * 
 * 환경 변수 설정 필요 (Vercel Dashboard > Settings > Environment Variables):
 * - SUPABASE_URL: Supabase 프로젝트 URL
 * - SUPABASE_ANON_KEY: Supabase Anon Key
 * 
 * 배포 방법:
 * 1. 이 파일을 프로젝트 루트의 api/ 폴더에 배치
 * 2. Vercel에 프로젝트 연결 및 배포
 * 3. Vercel Dashboard > Settings > Environment Variables에서 환경 변수 설정
 * 4. API 엔드포인트: https://your-project.vercel.app/api/verify-license
 */

export default async function handler(req, res) {
  // CORS 헤더 설정
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // OPTIONS 요청 처리 (CORS preflight)
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  // POST 요청만 허용
  if (req.method !== 'POST') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    // 요청 본문 파싱
    const { licenseKey, deviceId } = req.body;
    
    // 필수 파라미터 검증
    if (!licenseKey || !deviceId) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(400).json({ 
        success: false, 
        error: '라이선스 키와 디바이스 ID가 필요합니다.' 
      });
    }

    // 환경 변수 확인
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      console.error('Supabase 환경 변수가 설정되지 않았습니다.');
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(500).json({ 
        success: false, 
        error: '서버 설정 오류' 
      });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    // 라이선스 키 조회
    const response = await fetch(
      `${supabaseUrl}/rest/v1/licenses?license_key=eq.${encodeURIComponent(licenseKey)}&select=*`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Supabase API 오류: ${response.status}`);
    }

    const licenses = await response.json();

    // 라이선스 키가 존재하지 않음
    if (!licenses || licenses.length === 0) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(200).json({ 
        success: false, 
        error: '유효하지 않은 라이선스 키입니다.' 
      });
    }

    const license = licenses[0];

    // 비활성화된 라이선스 확인
    if (!license.is_active) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(200).json({ 
        success: false, 
        error: '비활성화된 라이선스입니다.' 
      });
    }

    // 만료일 확인
    if (license.expires_at) {
      const expiresAt = new Date(license.expires_at);
      if (expiresAt < new Date()) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.status(200).json({ 
          success: false, 
          error: '만료된 라이선스입니다.' 
        });
      }
    }

    // 이미 다른 디바이스에서 활성화되었는지 확인
    if (license.device_id && license.device_id !== deviceId) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(200).json({ 
        success: false, 
        error: '이 라이선스는 다른 디바이스에서 이미 활성화되었습니다.' 
      });
    }

    // 활성화되지 않은 경우 활성화
    if (!license.device_id) {
      const updateResponse = await fetch(
        `${supabaseUrl}/rest/v1/licenses?id=eq.${license.id}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
          body: JSON.stringify({
            device_id: deviceId,
            activated_at: new Date().toISOString(),
          }),
        }
      );

      if (!updateResponse.ok) {
        throw new Error('라이선스 활성화 실패');
      }
    }

    // 성공 응답
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({ 
      success: true, 
      license: {
        key: license.license_key,
        expiresAt: license.expires_at,
        activatedAt: license.activated_at,
      }
    });

  } catch (error) {
    console.error('라이선스 검증 오류:', error);
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).json({ 
      success: false, 
      error: '서버 오류가 발생했습니다.' 
    });
  }
}

