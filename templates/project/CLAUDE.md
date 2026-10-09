# 작업 규칙

<!-- ch:managed start -->
- 작업을 시작하기 전에 반드시 PLAN.md를 끝까지 읽는다.
- 세션 시작 시 또는 사용자가 새 작업을 지시했을 때, PLAN.md 목표/범위 섹션이 placeholder("(한 줄로 적어주세요)", "할 것 1") 그대로이고 `.claude/skills/audit/`가 설치되어 있으면, 작업 들어가기 전에 "먼저 `/audit`으로 프로젝트 상태 점검할까요?"라고 사용자에게 한 번 묻는다. (사용자가 N 하면 다시 묻지 않음.)
- PLAN.md 범위 안에서만 작업한다. 범위를 벗어나는 일은 먼저 사용자 승인을 받는다.
- PLAN.md의 "미확정 사항" 중 체크되지 않은 항목은 추측하지 말고 사용자에게 먼저 확인받는다.
- 확인받은 항목은 PLAN.md에서 체크하고, 받은 답을 그 항목 아래에 한 줄로 기록한다.
- 사용자의 의도가 불분명하면 즉시 질문한다.
- 보고는 비개발자도 이해할 수 있게 쉽게 쓰고, 근거를 밝힌다. 추정은 추정이라고 말한다.
- 요금, 정책, 세금처럼 바뀔 수 있는 내용은 기억에 의존하지 말고 검색해서 확인한다.
- 계획이 바뀌면 코드보다 PLAN.md를 먼저 고치고 사용자에게 알린다.

# 브랜치 / 깃 규칙

## 브랜치 구조
- `main`: 안정판. 직접 커밋 금지.
- `develop`: Claude의 기본 작업 base. 모든 PR과 머지는 `develop`을 향한다.
- 작업 브랜치: `develop`에서 분기. 접두사 + kebab-case 짧은 설명.

## 브랜치 네이밍 규격
- 형식: `<type>/<kebab-case-description>`
- 허용 타입: `feat`, `fix`, `chore`, `test`, `docs`, `refactor`
- 정규식: `^(feat|fix|chore|test|docs|refactor)/[a-z0-9-]+$`
- 예: `feat/kakao-oauth`, `fix/notification-timezone`, `chore/firebase-setup`

## 작업 워크플로우
- 메인 디렉토리 체크아웃은 항상 `develop` 고정.
- 작업과 브랜치/워크트리는 1:1.
- 사용자가 작업을 지시하면:
  1. Agent tool로 subagent를 띄운다 (`isolation: "worktree"`).
  2. subagent는 자체 워크트리 안에서 `develop`을 base로 작업 브랜치를 분기.
  3. 작업이 끝나면 subagent 안에서 `/cnp` 또는 `/cnp --merge`.
  4. 머지 완료 후 subagent 종료, 메인 세션은 `develop`에 그대로 머문다.

## 절대 규칙: /cnp 를 통해서만
- Claude는 사용자가 `/cnp` 또는 `/cnp --merge`를 명시적으로 입력하기 전에는 절대로 `git commit`, `git push`, `git merge`를 실행하지 않는다.
- `/cnp`: 커밋 → 현재 브랜치 origin에 push. 머지 없음.
- `/cnp --merge`: `/cnp` + `develop` 머지 + `develop` push + 작업 브랜치 삭제 여부 질문.
- 세부 동작은 `.claude/skills/cnp/SKILL.md` 참조.
<!-- ch:managed end -->

<!-- ch:user start -->
<!-- 프로젝트별 커스텀 규칙을 여기에 적으세요. 하네스 업데이트가 이 영역을 안 건드립니다. -->

<!-- 예: 이 프로젝트는 develop 없이 main-only 모델을 쓴다면 아래 주석 해제 -->
<!--
## 브랜치 모델 override
- 이 프로젝트는 `main` 단일 브랜치. `develop` 없음.
- CNP의 "develop 체크아웃·머지 단계"는 적용 안 함 (`/cnp`만 사용, `/cnp --merge` 금지).
-->
<!-- ch:user end -->
