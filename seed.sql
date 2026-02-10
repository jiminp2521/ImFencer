-- [중요] 이 스크립트를 실행하기 전에 Supabase > Authentication 탭에서 사용자를 최소 1명 'Add User'로 만들어주세요.

DO $$
DECLARE
    target_user_id uuid;
BEGIN
    -- 1. auth.users 테이블에서 첫 번째 사용자의 ID를 가져옵니다.
    SELECT id INTO target_user_id FROM auth.users LIMIT 1;

    -- 2. 사용자가 한 명도 없으면 에러를 발생시켜 알려줍니다.
    IF target_user_id IS NULL THEN
        RAISE EXCEPTION '❌ 먼저 Supabase 대시보드의 Authentication 탭에서 [Add User] 버튼을 눌러 사용자를 하나 생성해주세요!';
    END IF;

    -- 3. 해당 사용자를 위한 프로필 생성 (이미 있으면 건너뜀)
    INSERT INTO public.profiles (id, username, weapon_type, tier, is_coach, avatar_url)
    VALUES (target_user_id, '펜싱꿈나무', 'Epee', 'Bronze', false, 'https://github.com/shadcn.png')
    ON CONFLICT (id) DO NOTHING;

    -- 4. 게시글 생성
    INSERT INTO public.posts (author_id, category, title, content, tags, image_url)
    VALUES 
        (target_user_id, 'Free', '오늘 첫 에페 대회 나갔다 왔습니다!', '생각보다 너무 긴장해서 실력을 다 못 보여준 것 같아 아쉽네요. 다음엔 더 준비해서 가야겠습니다. 다들 대회 준비 어떻게 하시나요?', ARRAY['에페', '대회', '첫출전'], 'https://images.unsplash.com/photo-1547623644-8aa526786c55?q=80&w=200&auto=format&fit=crop'),
        (target_user_id, 'Info', '2024년 펜싱 장비 규정 변경 안내', '마스크 스트랩 관련 규정이 강화되었습니다. 대회 나가시는 분들은 꼭 필독하세요.', ARRAY['규정', '정보', '마스크'], NULL),
        (target_user_id, 'Question', '강남 근처 펜싱 클럽 추천 부탁드려요', '퇴근하고 취미로 배우려고 하는데, 초보자도 잘 가르쳐주는 곳 있을까요? 사브르 생각 중입니다.', ARRAY['강남', '클럽추천', '사브르'], NULL);
        
    RAISE NOTICE '✅ 데이터가 성공적으로 들어갔습니다!';
END $$;
