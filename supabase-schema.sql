-- AISpace 라이선스 관리 테이블
-- Supabase SQL Editor에서 실행하세요

-- licenses 테이블 생성
CREATE TABLE IF NOT EXISTS licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_key TEXT UNIQUE NOT NULL,
  user_email TEXT,
  device_id TEXT,
  is_active BOOLEAN DEFAULT true,
  activated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

-- 인덱스 추가 (검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_license_key ON licenses(license_key);
CREATE INDEX IF NOT EXISTS idx_device_id ON licenses(device_id);
CREATE INDEX IF NOT EXISTS idx_is_active ON licenses(is_active);

-- Row Level Security (RLS) 설정
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;

-- 기존 정책이 있으면 삭제 (재실행 시 오류 방지)
DROP POLICY IF EXISTS "Allow read access for license verification" ON licenses;

-- 모든 사용자가 읽을 수 있도록 정책 생성 (Cloudflare Workers에서 사용)
CREATE POLICY "Allow read access for license verification"
  ON licenses FOR SELECT
  USING (true);

-- 업데이트는 서비스 키로만 가능 (Cloudflare Workers에서 사용)
-- 실제로는 Cloudflare Workers가 서비스 키를 사용하므로 별도 정책 불필요

-- 테스트용 라이선스 키 생성 함수 (선택사항)
CREATE OR REPLACE FUNCTION generate_license_key()
RETURNS TEXT AS $$
DECLARE
  key_parts TEXT[];
  i INTEGER;
  part TEXT;
BEGIN
  key_parts := ARRAY[]::TEXT[];
  FOR i IN 1..4 LOOP
    part := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 4));
    key_parts := array_append(key_parts, part);
  END LOOP;
  RETURN array_to_string(key_parts, '-');
END;
$$ LANGUAGE plpgsql;

-- 테스트용 라이선스 삽입 예시 (실제 사용 시 수정 필요)
-- INSERT INTO licenses (license_key, user_email, expires_at)
-- VALUES (generate_license_key(), 'test@example.com', NOW() + INTERVAL '1 year');

