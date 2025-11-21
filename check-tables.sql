-- 테이블 확인 쿼리
-- Supabase SQL Editor에서 실행하세요

-- 1. licenses 테이블이 존재하는지 확인
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'licenses'
ORDER BY ordinal_position;

-- 2. 테이블의 행 개수 확인
SELECT COUNT(*) as total_licenses FROM licenses;

-- 3. RLS 정책 확인
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'licenses';

-- 4. 인덱스 확인
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'licenses';

