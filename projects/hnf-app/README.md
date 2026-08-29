# H&F app (hnf-app)

여드름 케어와 탈모 케어를 하나의 앱에서 다루는 **피부·두피 케어 앱** MVP 스캐폴딩입니다.
20대(여드름·초기 탈모)를 핵심 타겟으로 하고, 30·40·50대 이상은 연령대별 맞춤 가이드·추천으로 확장합니다.

> 통합 앱 vs 별도 앱 2개에 대한 비교 분석은 [docs/integrated-vs-separate.md](docs/integrated-vs-separate.md)를 참고하세요.

## 핵심 구조: "관심사(Concern) 모듈" 아키텍처

공용 코어 엔진(사진 기록, 루틴, AI 분석, 추천)은 `concern` 타입만 알면 동작하고,
각 관심사 모듈은 도메인 콘텐츠(라벨, 기본 루틴 템플릿, 촬영 가이드)만 제공합니다.

- 새 관심사(예: 30~50대용 주름, 두피 노화)를 추가할 때는 `src/modules/`에 모듈 하나를 만들어 `registry.ts`에 등록하면 온보딩 선택지·기본 루틴·촬영 가이드가 자동 반영됩니다.
- 나중에 마케팅상 별도 앱이 유리해지면, 모듈 폴더만 떼어 별도 앱으로 분리하기 쉬운 구조입니다.

```
src/
  types/         # UserProfile, PhotoEntry, RoutineTask, Product 등 전역 타입
  theme.ts       # 색상·간격 토큰
  context/       # ProfileContext (온보딩 완료 여부 = 로그인 상태)
  navigation/    # RootNavigator (온보딩 → 메인 탭 6개)
  screens/
    OnboardingScreen  # 연령대(20/30/40/50+) + 관심사(여드름/탈모) 선택
    HomeScreen        # 오늘 루틴 진행률 + 관심사별 최근 기록 요약
    TimelineScreen    # 사진 촬영/선택 → 로컬 저장 → 타임라인, AI 분석(목업)
    RoutineScreen     # 아침/저녁 루틴 체크리스트, 일별 기록
    CalendarScreen    # 월간 캘린더 — 날짜별 루틴 완료·사진 확인/체크
    RecommendScreen   # 연령대·관심사별 가이드 + 제품/성분 추천
    SettingsScreen    # 프로필 수정, 초기화
  core/
    storage.ts   # AsyncStorage 공용 헬퍼 (모두 try-catch)
    profile.ts   # 프로필 저장/조회/초기화
    photoLog.ts  # 사진을 문서 폴더로 복사 후 메타데이터 저장
    routine.ts   # 루틴 시드(연령대별)/추가/삭제/순서변경/요일 필터/완료율 계산
    calendar.ts  # 월간 그리드·날짜 키 헬퍼
    reminders.ts # 아침·저녁 루틴 알림 예약 (expo-notifications)
    analysis.ts  # AnalysisService 인터페이스 + MockAnalysisService
    recommend.ts # 프로필 기반 제품·가이드 필터링
  modules/
    types.ts     # ConcernModule 인터페이스
    acne/        # 여드름 모듈
    hair/        # 탈모 모듈
    registry.ts  # 모듈 레지스트리 (확장 지점)
  data/
    products.json  # 연령대·관심사 태그가 붙은 추천 시드 데이터
    guides.json    # 연령대별 관리 가이드 콘텐츠
```

## 기술 스택

- Expo SDK 52 + TypeScript (strict)
- React Navigation v7 (Bottom Tabs)
- AsyncStorage(프로필·루틴·사진 메타데이터) + expo-file-system(사진 파일)
- expo-image-picker (촬영/앨범 선택)
- expo-notifications (아침/저녁 루틴 리마인더 — 웹 미지원, 앱 전용)

### 루틴 동작 방식

- 온보딩/설정에서 고른 **관심사 + 연령대**에 맞는 기본 루틴이 자동 시드됩니다
  (모듈 템플릿의 `ageGroups`, `days`로 연령대별·요일별 항목을 정의).
- 사용자가 직접 항목을 **추가·삭제·순서 변경**할 수 있고, 요일을 지정하면
  해당 요일에만 루틴 탭에 표시됩니다 (예: 주 1회 각질 케어).
- 완료율은 요일별 예정 개수를 분모로 계산되어 AI 분석 점수 보정에 쓰입니다.
- **달력 탭**에서 월별로 완료(초록)/일부(노랑) 점과 사진 기록을 확인하고,
  날짜를 누르면 그날 루틴을 체크하거나 사진을 볼 수 있습니다.

백엔드 없이 **완전 로컬로 동작**합니다. AI 분석은 `AnalysisService` 인터페이스 뒤에
목업 구현(`MockAnalysisService`)이 붙어 있어, 실제 비전 API 연동 시 구현체만 교체하면 됩니다.
목업 점수는 무작위가 아니라 사진별 결정적 기준점 + 최근 7일 루틴 완료율 보정으로 계산되어
"루틴을 지키면 점수가 오른다"는 UX 흐름을 검증할 수 있습니다.

## 실행

```bash
cd projects/hnf-app
npm install
npx expo start --port 8087
```

## 다음 단계 (스캐폴딩 범위 밖)

1. 실제 AI 분석: Firebase Functions 또는 외부 비전 API 연동 (`analysis.ts` 구현체 교체)
2. 클라우드 백업/동기화 (선택)
3. 30~50대용 추가 모듈: 주름, 모공, 두피 노화 등 (`modules/`에 추가 후 registry 등록)
4. 사진 비교 뷰 (before/after 슬라이더)
