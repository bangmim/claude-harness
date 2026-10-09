# claude-harness

Claude Code 신규 프로젝트에 CLAUDE.md + /cnp 스킬 + 브랜치 규격 하네스를 한 커맨드로 설치하는 CLI.
블로그 스킬 등 전역(`~/.claude/`) 스킬도 함께 세팅합니다.

## 빠른 시작

```bash
# 아무 폴더에서
pnpm dlx github:bangmim/claude-harness init
```

이 한 줄이 다음을 설치합니다:

**전역(`~/.claude/`)** — 처음 1회만, 이미 있으면 skip:
- `commands/blog.md`, `commands/블로그.md`
- `skills/writing-tistory-blog/`

**현재 폴더** — 매 프로젝트:
- `CLAUDE.md` (작업 규칙 + 브랜치 규격 + /cnp 절대 규칙)
- `PLAN.md` (빈 스켈레톤, 폴더명 자동 치환)
- `.claude/skills/cnp/SKILL.md`
- `.gitignore`에 `.backup/` 자동 추가

## 본인 username으로 fork해서 쓰려면

1. 리포 fork → `your-username/claude-harness`
2. `templates/user/skills/writing-tistory-blog/SKILL.md` 수정 — 본인 블로그 URL/톤 가이드로 교체
3. 명령어 교체:
   ```bash
   pnpm dlx github:your-username/claude-harness init
   ```

## 커맨드

### `init` — 신규 설치
```bash
pnpm dlx github:bangmim/claude-harness init [flags]
```

| 플래그 | 동작 |
|---|---|
| `--force` | 기존 파일 묻지 않고 전부 덮어씀. 백업은 자동 생성. |
| `--project-only` | 사용자 레벨(`~/.claude/`) 건너뜀 |
| `--dry-run` | 설치될 파일만 출력, 실제 복사 안 함 |

### `update` — 하네스 영역만 재설치
```bash
pnpm dlx github:bangmim/claude-harness update [flags]
```

| 플래그 | 동작 |
|---|---|
| `--dry-run` | 변경될 영역만 출력, 실제 수정 안 함 |

**모드별 동작:**
- `markers` 모드 (CLAUDE.md): `<!-- ch:managed start -->` ~ `<!-- ch:managed end -->` 사이만 교체. `<!-- ch:user ... -->` 영역과 마커 바깥은 보존.
- `whole` 모드 (cnp SKILL.md, 블로그 스킬): 체크섬 비교해 다르면 자동 백업 후 교체.
- `init-only` 모드 (PLAN.md): 완전 skip. 사용자 작업물 보존.

## 커스터마이즈

### 프로젝트별 규칙 추가 — CLAUDE.md ch:user 영역

```markdown
<!-- ch:user start -->
## 프로젝트별 추가 규칙
- 이 프로젝트는 TypeScript strict 모드 유지
- API 호출은 반드시 Zod 검증 통과
<!-- ch:user end -->
```

하네스가 업데이트돼도 이 영역은 안 건드립니다.

### 브랜치 모델 override (main-only 프로젝트)

CLAUDE.md의 ch:user 영역에 다음을 적으세요:

```markdown
## 브랜치 모델 override
- 이 프로젝트는 `main` 단일 브랜치. `develop` 없음.
- CNP의 "develop 체크아웃·머지 단계"는 적용 안 함 (`/cnp`만 사용, `/cnp --merge` 금지).
```

## 문제 해결

### 백업 복원
덮어쓴 파일은 모두 자동 백업됩니다:
```bash
# 프로젝트 레벨
./.backup/YYYYMMDD-HHMMSS/

# 사용자 레벨
~/.claude/.backup/YYYYMMDD-HHMMSS/
```

복원 예시:
```bash
cp ./.backup/20261009-143022/CLAUDE.md ./CLAUDE.md
```

오래된 백업 정리:
```bash
rm -rf ./.backup/<old-timestamp>/
```

### 마커 파손 복구
`<!-- ch:managed start -->` 또는 `<!-- ch:managed end -->` 를 실수로 지웠다면:
1. 백업에서 복원하거나,
2. 수동으로 마커를 다시 넣고 `update` 재실행

### `pnpm dlx` 캐시 문제
최신 리포 반영이 안 되는 것 같으면:
```bash
pnpm store prune
pnpm dlx github:bangmim/claude-harness update
```

## 라이선스

MIT
