---
name: cnp
description: ONLY invoke when the user explicitly types `/cnp` or `/cnp --merge`. Commits staged+unstaged changes, pushes current branch to origin, and (with --merge) merges into develop. NEVER auto-invoke this skill — commit/push/merge is forbidden without an explicit user command.
---

# /cnp — Commit · Push · (옵션) Merge

## 호출 조건 (절대 규칙)

- **오직 사용자가 `/cnp` 또는 `/cnp --merge` 를 명시적으로 입력했을 때만 실행한다.**
- 작업 완료 후 사용자 요청 없이 자동으로 호출 금지.
- "커밋해줘", "푸시해줘" 같은 자연어도 사용자가 직접 `/cnp` 명령어를 쓰지 않으면 실행하지 않는다. 대신 "/cnp 또는 /cnp --merge 를 입력해주세요"라고 안내한다.

## 플래그

- `--merge`: 커밋+푸시 후 `develop`에 머지까지 진행.
- 플래그 없음: 커밋+푸시만.

## 공통 사전 체크

1. `git status`, `git diff` 로 현재 변경 내용을 확인한다.
2. 변경이 전혀 없으면 "커밋할 변경이 없습니다"로 종료.
3. 현재 브랜치 이름을 확인한다. `main` 또는 `develop` 위에서 직접 호출된 경우 → 중단하고 "작업 브랜치에서 실행하세요"로 안내.
4. **현재 작업 디렉토리가 워크트리인지 확인한다.**
   - `git rev-parse --git-dir` 실행
   - 결과가 `.git` (상대) 또는 `<repo>/.git` (절대, 메인 디렉토리) → 메인 디렉토리
   - 결과가 `<repo>/.git/worktrees/<name>` 형식 → 워크트리
   - 메인 디렉토리면 중단: "메인 디렉토리에서는 /cnp 실행 금지. 워크트리 안에서 실행하세요."
   - 단, 세팅 흐름의 초기 1회 예외는 사용자가 명시적으로 "이번만 예외"로 지시한 경우에 한함.
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

### `/cnp` (머지 없음)

1. 변경 파일을 명시적으로 `git add <files>` 로 스테이징 (`.env`, 자격증명류 제외).
2. 위 규칙대로 커밋.
3. `git push -u origin <현재 브랜치>` (upstream 없으면 `-u`, 있으면 그냥 `push`).
4. 사용자에게 커밋 해시, 변경 요약, 원격 브랜치 URL을 보고.

### `/cnp --merge`

1~3 동일.
4. `develop` 으로 체크아웃: `git checkout develop && git pull --ff-only`
5. 작업 브랜치를 머지: `git merge --no-ff <작업브랜치> -m "merge: <작업브랜치> into develop"`
   - 충돌 발생 시 자동 해결 금지. 머지를 중단(`git merge --abort`)하고 사용자에게 상황 보고 후 지시 대기.
6. `git push origin develop`
7. **`develop`에 머문다. 작업 브랜치로 복귀 금지.** Claude의 기본 체크아웃 상태는 항상 `develop`.
8. 사용자에게 묻는다: "작업 브랜치 `<작업브랜치>`를 삭제할까? (로컬 + origin)". 사용자 승인 시에만 삭제. 삭제 후에도 `develop`에 머문다.

## 금지

- `--force`, `--force-with-lease` push 금지 (사용자가 명시적으로 요청한 경우 외).
- `--no-verify`, `--no-gpg-sign` 플래그 금지.
- 사용자 승인 없는 브랜치 삭제 금지.
- `.env`, 자격증명, 큰 바이너리 자동 커밋 금지. 발견 시 사용자에게 경고.
- `main` 브랜치 직접 커밋/푸시 금지.

## 보고 형식

마지막 사용자 메시지는 다음 형태:

```
✅ 커밋 완료
- 브랜치: <name>
- 커밋: <hash> <subject>
- 원격: pushed to origin/<name>
- (--merge 시) develop 머지 완료. 작업 브랜치 삭제할까?
```
