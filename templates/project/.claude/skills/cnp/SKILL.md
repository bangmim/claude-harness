---
name: cnp
description: ONLY invoke when the user explicitly types `/cnp` or `/cnp --merge`. Commits staged+unstaged changes, pushes current branch to origin, and (with --merge) merges the reviewed PR into the confirmed integration branch. NEVER auto-invoke this skill — commit/push/merge is forbidden without an explicit user command.
---

# /cnp — Commit · Push · (옵션) Merge

## 호출 조건 (절대 규칙)

- **오직 사용자가 `/cnp` 또는 `/cnp --merge` 를 명시적으로 입력했을 때만 실행한다.**
- 작업 완료 후 사용자 요청 없이 자동으로 호출 금지.
- "커밋해줘", "푸시해줘" 같은 자연어도 사용자가 직접 `/cnp` 명령어를 쓰지 않으면 실행하지 않는다. 대신 "/cnp 또는 /cnp --merge 를 입력해주세요"라고 안내한다.

## 플래그

- `--merge`: 커밋·푸시·PR 생성 후 검사와 리뷰가 완료되면 확인한 통합 브랜치에 병합한다.
- 플래그 없음: 커밋·푸시·PR 생성·리뷰까지만 진행하고 병합하지 않는다.

## 공통 사전 체크

1. `git status`, `git diff` 로 현재 변경 내용을 확인한다.
2. 미커밋 변경이 없으면 새 커밋은 만들지 않는다. 현재 작업 브랜치에 미푸시 커밋이나 열린 PR이 있으면 푸시·리뷰·요청된 병합을 이어서 진행한다. 모두 없으면 "커밋하거나 이어서 처리할 작업이 없습니다"로 종료한다.
3. **저장소와 병합 대상 확인** — 원격 URL, 저장소의 작업 규칙, 로컬·원격 브랜치를 확인한다. 기본은 `develop`이다. 저장소가 명시적으로 main-only를 사용하거나, `develop`이 없고 원격 기본 브랜치가 `main`이면 PR 대상으로 `main`을 사용하고 시작 보고에 알린다. 규칙이 충돌하거나 다른 통합 브랜치가 있으면 먼저 확인한다. `develop`을 임의로 새로 만들지 않는다.
4. **작업 브랜치와 worktree 확인** — `git worktree list`, `git rev-parse --git-dir`로 확인한다. 통합 브랜치나 메인 worktree에 있으면 확인한 통합 브랜치에서 규격에 맞는 별도 작업 브랜치와 형제 worktree를 만든다. 기존 변경이 있으면 staged·unstaged diff와 untracked 파일을 먼저 백업하고, 새 worktree에 보존됐음을 확인한 뒤 옮긴다. `.env`·키·인증서는 옮기거나 스테이징하지 않는다. 보존이 실패하면 원본을 유지하고 중단한다. 통합 브랜치에는 직접 커밋하지 않는다.
5. **브랜치명 정규식 검증:**
   - `git rev-parse --abbrev-ref HEAD` 로 현재 브랜치 획득
   - 정규식 `^(feat|fix|chore|test|docs|refactor)/[a-z0-9-]+$` 매치 확인
   - 불일치 시 중단: "브랜치명이 규격 `<type>/<kebab-case>` 형식이 아닙니다. 허용 타입: feat/fix/chore/test/docs/refactor. 예: `feat/kakao-oauth`"
6. 변경 내용을 한국어 2~4줄로 사용자에게 요약 (파일별이 아니라 "무엇을 바꿨는지" 관점).
7. 커밋 메시지 초안을 사용자에게 보여주고 바로 다음 단계로 진행. (사용자가 수정 원하면 다시 요청할 것이므로 승인 대기는 불필요.)

## 커밋 메시지 규칙

- Conventional Commits 사용. 접두사는 현재 브랜치 접두사와 일치시킨다 (`feat/` → `feat:` 등).
- 제목: 영어, 72자 이내, 명령형.
- 본문: 필요 시 한국어로 "왜" 설명. 2~3줄.
- 끝에 다음 두 줄을 넣는다:
  ```
  🤖 Generated with [Claude Code](https://claude.com/claude-code)

  Co-Authored-By: Claude <noreply@anthropic.com>
  ```
- HEREDOC 으로 전달:
  ```
  git commit -m "$(cat <<'EOF'
  <type>: <subject>

  <본문>

  🤖 Generated with [Claude Code](https://claude.com/claude-code)

  Co-Authored-By: Claude <noreply@anthropic.com>
  EOF
  )"
  ```

## 실행 흐름

1. **검증·코드 검토** — 저장소에서 요구하는 타입 검사·테스트와 변경 범위에 맞는 검사를 실행한다. 빌드·배포에 별도 승인이 필요한 프로젝트에서는 기존 승인 규칙을 지킨다. base와 작업 변경의 diff를 읽고 재현 가능한 버그, 회귀, 보안 문제, 누락된 검증을 확인한다. 자기 검토를 독립 리뷰나 GitHub 승인으로 표현하지 않는다. 실패나 확인된 결함이 있으면 PR 또는 로컬 보고에 기록하고 병합을 중단한다. 이슈는 아래 추적 기준에 맞을 때만 등록한다. 임의로 작업 범위를 넓혀 고치지 않는다.
2. **커밋·푸시** — 검증을 통과한 변경 파일만 명시적으로 `git add <files>` 하고 위 메시지 규칙으로 커밋한다. 새 커밋이 필요 없으면 생략한다. 작업 브랜치만 origin으로 푸시한다.
3. **PR 생성 또는 갱신** — 동일한 head와 base의 열린 PR을 찾아 재사용한다. 없으면 `gh pr create --base <base> --head <작업브랜치> --title <제목> --body-file <본문파일>`로 만든다. 본문에는 문제·변경된 동작·검증 결과·한계를 적는다. `gh` 인증이나 권한이 부족하면 커밋·푸시 상태와 남은 단계를 보고하고 중단한다.
4. **리뷰 확인** — 자동 리뷰가 연결돼 있으면 현재 head 커밋의 리뷰 결과를 확인한다. 저장소에 리뷰 봇과 요청 명령이 설정돼 있으면 그 절차를 사용한다. Codex 연결과 호출 권한이 확인된 경우에만 PR에 `@codex review`를 요청할 수 있다. 동일 head에 요청 또는 완료된 리뷰가 있으면 중복 요청하지 않는다. 외부 리뷰가 구성되지 않았으면 "자기 검토 완료 / 외부 리뷰 미설정"으로 구분해 보고한다. 외부 리뷰 완료나 필수 승인을 요구하는 저장소에서는 그 결과가 없으면 병합을 보류한다. 봇의 반응·리뷰 요청 댓글만으로 완료했다고 판단하지 않는다.
5. **검사·리뷰 판정** — `gh pr view`의 head SHA, 리뷰 결정·댓글·검사 결과를 확인하고 `gh pr checks`로 검사 상태를 확인한다. 검사 없음은 통과와 다르다. skipped·cancelled·pending을 성공으로 계산하지 않는다. 필요한 검사가 없거나 실패·미완료, 변경 요청, 미해결 중대 결함이 있으면 병합을 보류한다. 리뷰를 받는 동안 새 커밋이 생기면 검증·리뷰를 새 head 기준으로 다시 확인한다. 상태 확인은 최대 10분까지만 하며 60초 이내 간격으로 유의미한 진행을 보고한다. 미완료 상태는 PR을 남기고 종료하며 무기한 감시하지 않는다.
6. **플래그 없는 호출** — 여기서 종료하고 커밋·PR·검사·리뷰 결과를 보고한다. 자동 병합을 예약하지 않는다.
7. **`--merge` 호출** — 통합 worktree가 올바른 base에 있고 깨끗한지 확인한다. PR의 base·head·병합 가능 여부와 저장소 필수 조건을 다시 확인한다. `gh pr merge <PR> --merge --match-head-commit <검증한SHA>`로 병합한다. merge commit을 허용하지 않는 저장소라면 임의로 squash/rebase로 바꾸지 않고 지원되는 방법을 사용자에게 확인한다. 충돌·권한·검사 실패 시 중단하고 PR을 유지한다. `--admin`, 보호 규칙 우회, 로컬 merge 후 직접 push는 사용하지 않는다.
8. **병합 확인·정리** — PR 상태가 실제 `MERGED`인지 확인한 뒤 메인 worktree의 base를 `git pull --ff-only`로 동기화한다. 실패하면 남은 상태를 보고하며 강제 초기화하지 않는다. 병합에 포함되지 않은 변경이 없는 연결 worktree와 해당 작업 브랜치만 정리한다. 정리 후 base에 머문다. 병합 대기·실패 상태에서는 브랜치와 worktree를 삭제하지 않는다.

## 실패·결함 추적

- PR의 검사 실패와 해당 변경에서 발견된 리뷰 결함은 우선 PR에서 해결한다. 실패할 때마다 새 이슈를 만들지 않는다. 커밋 전 실패는 로컬 보고에 남긴다.
- 별도 추적이 필요한 확인된 기존 결함 또는 사용자가 후속 과제로 남기기로 한 일은 이슈로 등록한다. 추정만으로 결함을 확정하거나 작업 범위를 넓혀 수정하지 않는다. 등록 전 제목·영향을 짧게 알린다.
- 기본 브랜치 CI 실패에 이슈 자동화가 있으면 해당 결과를 재사용한다. 자동화가 없고 CNP 중 직접 기본 브랜치 실패를 확인한 경우에만 기존 이슈를 찾아 등록한다. PR 실패를 기본 브랜치 실패로 취급하지 않는다.
- 열린 이슈에서 원인·실패 검사·발생 위치를 확인해 중복을 피한다. 자동화가 파이프라인별 단일 이슈를 운영하면 그 이슈를 재사용하고, 원인이 다르면 분리 필요성을 보고한다. 동일 SHA·실패는 댓글도 반복하지 않는다.
- 이슈에는 증상, 기대 동작, 재현 명령, 영향 범위, 관련 SHA·PR·CI 링크를 적는다. 비밀값·개인 경로·원본 전체 로그는 제외하고 본문은 파일로 전달한다.
- 인증·네트워크·도구 미설치만으로 코드 버그 이슈를 만들지 않는다. 조회·쓰기 권한이 없으면 로컬 초안과 남은 단계를 보고한다. 실패한 검사를 우회해 병합하지 않는다.
- GitHub Actions 상시 실행과 리뷰 서비스 연결은 저장소별 설정이다. 이 스킬이 설치됐다는 이유만으로 활성화됐다고 안내하지 않는다. AI 리뷰는 초기에는 필요한 PR에 명시적으로 요청하고, 연결이 확인되지 않으면 자기 검토와 구분한다.

## 금지

- 사용자의 명시적 CNP 호출 없이 커밋·푸시·병합하지 않는다.
- `--force`, `--force-with-lease`, `--no-verify`, `--no-gpg-sign`으로 보호 장치를 우회하지 않는다.
- `.env`, 자격증명, 큰 바이너리를 자동 커밋하지 않는다.
- `main`에 직접 커밋·푸시하지 않는다. main-only 저장소도 PR을 통해 반영한다.
- 검증되지 않은 head 병합, 리뷰 완료 조작, 본인 PR에 승인 리뷰 제출은 금지한다.

## 보고

커밋 해시·작업 브랜치·PR URL·병합 대상, 타입 검사·테스트 결과, 자기 검토와 외부 리뷰 상태를 구분해 보고한다. 실패 시 이슈 URL 또는 로컬 초안과 다음 단계를 적는다. `--merge`에서는 실제 병합 여부와 worktree·브랜치 정리 결과를 덧붙인다.

## 도구 참고

- [GitHub CLI PR 검사](https://cli.github.com/manual/gh_pr_checks)
- [GitHub CLI PR 병합](https://cli.github.com/manual/gh_pr_merge)
- [Codex GitHub 리뷰 연결](https://learn.chatgpt.com/docs/third-party/github)
