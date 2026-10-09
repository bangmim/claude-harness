---
name: audit
description: Audit the current project against CLAUDE.md rules — branch naming, PLAN.md completeness, marker integrity, gitignore state. Invoke when the user types `/audit`, or when CLAUDE.md's session-start rule tells you to offer it (PLAN.md unfilled, etc). Reports violations and proposes fixes requiring explicit user approval per fix. NEVER auto-apply fixes without the user confirming each one.
---

# /audit — 하네스 규칙 대비 현재 프로젝트 상태 점검

## 호출 조건

- 사용자가 `/audit` 또는 `/audit --fix` 를 명시적으로 입력
- 세션 시작/작업 시작 시 CLAUDE.md 규칙에 따라 Claude가 "먼저 /audit 돌릴까요?"로 사용자에게 제안 → Y 답변

## 플래그

- `--fix`: 위반 항목에 대해 수정 제안을 하나씩 사용자에게 Y/N 묻고 승인된 것만 적용.
- 플래그 없음: 리포트만 출력. 수정 안 함.

## 점검 항목

### 1. 브랜치 네이밍

- `git rev-parse --abbrev-ref HEAD` 로 현재 브랜치 획득.
- `main` 또는 `develop` 위면 → "작업은 feat/fix/chore/test/docs/refactor 접두 브랜치에서 해야 함" 안내.
- 그 외 브랜치는 `^(feat|fix|chore|test|docs|refactor)/[a-z0-9-]+$` 정규식 매치 확인.
- 매치 실패 시 → 리네임 제안 (`--fix` 모드에서만 `git branch -m <new>` 적용, 사용자 승인 필수).

### 2. PLAN.md 완성도

- 파일 존재 여부.
- 목표 섹션에 placeholder `(한 줄로 적어주세요)` 그대로 있으면 → "PLAN.md 목표가 비어있음".
- 범위 섹션이 `- [ ] 할 것 1`, `- [ ] 할 것 2` 그대로이면 → "범위 작성 필요".
- 수정은 자동 적용 안 함. "`PLAN.md 같이 쓰자`로 저에게 요청하세요" 안내.

### 3. CLAUDE.md 마커 무결성

- `<!-- ch:managed start -->`, `<!-- ch:managed end -->`, `<!-- ch:user start -->`, `<!-- ch:user end -->` 네 마커 모두 존재 확인.
- 하나라도 없으면 → "update가 작동 안 함. 백업에서 복원하거나 수동으로 마커 복구 후 `pnpm dlx github:bangmim/claude-harness update` 재실행 필요".
- `--fix` 모드에서 자동 복원은 안 함 (파일 손상 위험).

### 4. .gitignore

- `.backup/` 라인 유무 확인 (공백·앞뒤 trim 후 비교).
- 없으면 → 추가 제안. `--fix` 모드에서 사용자 승인 후 `.gitignore` 끝에 `.backup/` 추가.

### 5. 미커밋 변경 vs PLAN 범위

- `git status --short` 에 변경 있고 PLAN.md 범위 체크박스가 전부 비어있거나 placeholder이면
  → "현재 변경 작업이 PLAN.md 범위에 명시돼 있는지 확인하세요".
- 수정은 자동 적용 안 함. 사용자가 PLAN.md 범위를 채우거나 변경을 롤백해야 함.

## 리포트 형식

```
🔍 /audit — <프로젝트명>

❌ 위반 (N건)
  1. [브랜치] 현재 브랜치 `<name>` 가 규격 안 맞음
     기대: ^(feat|fix|chore|test|docs|refactor)/[a-z0-9-]+$
     제안: git branch -m feat/<kebab-name>
  2. [PLAN] 목표 섹션이 placeholder 그대로
     제안: "PLAN.md 같이 쓰자" 라고 Claude에게 요청

✅ 통과 (M건)
  - CLAUDE.md 마커 전부 정상
  - .gitignore 에 .backup/ 포함
  - 미커밋 변경 없음
```

`--fix` 모드일 때는 리포트 아래에 수정 승인 흐름 추가:

```
수정 적용?
  #1 브랜치 리네임 (git branch -m feat/<...>): y/N  _
```

Y면 적용, N이면 skip. 다음 항목으로 넘어감.

## 금지

- 사용자 승인 없는 브랜치 리네임, 파일 수정.
- PLAN.md 자동 작성 (반드시 사용자와 대화하며 작성).
- CLAUDE.md 또는 사용자 작성 코드 자동 리팩터링 — audit 범위는 "규칙 vs 현재 상태 비교"까지. 코드 수정은 별도 작업.
- `/cnp` 호출 (커밋은 사용자가 명시적으로 `/cnp` 요청해야만 발생).

## 리포트 톤

- 통과한 항목도 짧게 명시해서 "모두 OK" 상황도 사용자가 안심할 수 있게.
- 위반은 "뭐가 문제인지 + 제안 수정" 2줄로.
- 과장 금지: "완벽히 안전함" 같은 표현 안 씀.
