# claude-harness

> Claude Code 프로젝트에 작업 규칙·플랜 스켈레톤·`/cnp` 스킬·블로그 스킬을 한 커맨드로 설치합니다. 설치 후 Claude를 다시 켜면 하네스가 자동 적용된 상태에서 바로 이어서 작업할 수 있습니다.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
![Node.js 18+](https://img.shields.io/badge/node-%E2%89%A518-brightgreen)
![Platform: macOS · Linux](https://img.shields.io/badge/platform-macOS%20%7C%20Linux-lightgrey)

## 목차

- [배경](#배경)
- [요구사항](#요구사항)
- [설치](#설치)
- [설치되는 것들](#설치되는-것들)
- [사용](#사용)
- [`ch:user` — 안전하게 커스터마이즈](#chuser--안전하게-커스터마이즈)
- [업데이트](#업데이트)
- [Fork 가이드](#fork-가이드)
- [문제 해결](#문제-해결)
- [Contributing](#contributing)
- [License](#license)

## 배경

솔로 개발자가 Claude Code로 여러 사이드 프로젝트를 돌릴 때, 매 프로젝트마다 반복되는 세팅이 있습니다:

- Claude가 작업 전 읽을 **작업 규칙**(PLAN.md 범위 지키기, 추측 금지, 브랜치 네이밍 등)
- **PLAN.md 스켈레톤**(목표/범위/미확정/결정 기록)
- **`/cnp` 스킬**(커밋→푸시→옵션 머지 자동화)
- 블로그 발행용 스킬·커맨드

claude-harness는 이 네 가지를 한 커맨드로 설치하고, 이후 업데이트 때 사용자가 적어놓은 커스텀 영역은 보존합니다.

## 요구사항

- Node.js 18+
- pnpm
- macOS / Linux (Windows는 로드맵)

## 설치

아무 프로젝트 폴더에서:

```bash
pnpm dlx github:bangmim/claude-harness init
```

이게 전부입니다. 다음에 Claude Code 세션을 켜면 하네스가 자동 적용된 상태에서 시작합니다 — 사용자가 추가로 해야 할 명령어는 없습니다.

## 설치되는 것들

### 전역 (`~/.claude/`) — 처음 1회만

이미 있으면 건너뜁니다. 모든 프로젝트에서 공유됩니다.

| 파일 | 설명 |
|---|---|
| `commands/blog.md`, `commands/블로그.md` | 세션 작업물을 티스토리 블로그 포스트로 변환해달라고 요청하는 슬래시 커맨드. |
| `skills/writing-tistory-blog/SKILL.md` | 범용 티스토리 블로그 작성 가이드(톤·구조·발행 흐름). 블로그 URL·카테고리·톤 예시 같은 **개인 설정은 같은 폴더의 `config.md`에서 읽어옴**. |
| `skills/writing-tistory-blog/config.example.md` | 개인 설정 템플릿. 설치 후 `config.md`로 복사해 본인 블로그 정보를 채워야 스킬이 동작한다. |

#### 블로그 작성 기본 스타일

프로젝트에 관계없이 담백한 평어체로 기존 글의 다음 내용을 작성합니다. 관련 발행 글과 초안을 먼저 확인하고, 증상·원인·변경 전후·검증 결과를 연결합니다. 제목 아래 HTML 주석에는 실제 블로그 카테고리 전체 경로를 기록합니다. 스타일 예문은 스킬의 `references/approved-post.md`에 포함됩니다.

아이디어 뱅크는 발행하지 않는 내부 관리 문서입니다. 개인 블로그 주소·카테고리·저장 경로는 로컬 `config.md`로 유지하며 이 저장소에는 포함하지 않습니다.

#### 설치 후 블로그 스킬 1회 세팅

```bash
cd ~/.claude/skills/writing-tistory-blog
cp config.example.md config.md
# config.md 열어서 {{YOUR_TISTORY_HANDLE}}, 카테고리, 톤 예시 등 자기 값으로 채움
```

`config.md`는 로컬 전용이며 claude-harness 레포에서는 `.gitignore`로 제외된다. 하네스를 fork해도 본인 `config.md`는 커밋되지 않는다.

### 프로젝트 (`./`) — 매 프로젝트마다

| 파일 | 설명 |
|---|---|
| `CLAUDE.md` | Claude가 작업 시작 전 읽는 규칙. PLAN.md 범위 안에서만 작업하기, 불확실하면 질문하기, 브랜치 네이밍 규격(`^(feat\|fix\|chore\|test\|docs\|refactor)/[a-z0-9-]+$`), `/cnp` 외 git 명령 금지 등. |
| `PLAN.md` | 사용자가 작업 전 채우는 플랜(목표 / 범위 / 미확정 / 결정 기록). `{{PROJECT_NAME}}`은 폴더명으로 자동 치환. 한 번 생성 후에는 하네스가 절대 건드리지 않습니다. |
| `.claude/skills/cnp/SKILL.md` | `/cnp` 명령어 구현. 검증→커밋→작업 브랜치 푸시→PR 생성·리뷰. `--merge`면 확인한 통합 브랜치에 PR 병합 후 정리까지. 브랜치명 regex·워크트리 확인·main 직접 커밋 금지 등 안전장치 포함. |
| `.claude/skills/audit/SKILL.md` | `/audit` 명령어. 현재 프로젝트가 CLAUDE.md 규칙(브랜치 네이밍, PLAN.md 완성도, 마커 무결성, `.gitignore` 상태)을 지키는지 점검하고 수정 제안. `/audit --fix` 는 승인된 수정만 적용. 세션 시작 시 PLAN.md가 비어있으면 Claude가 자동으로 "먼저 /audit 돌릴까요?" 제안. |
| `.gitignore` | `.backup/` 라인을 중복 없이 추가. 기존 라인은 보존. |

## 사용

### 설치부터 첫 작업까지

```bash
# 1. 아무 폴더에서 설치
mkdir ~/code/my-project && cd ~/code/my-project
pnpm dlx github:bangmim/claude-harness init

# 2. Claude Code 켜기
claude
```

Claude 세션에서는 평소처럼 작업하면 됩니다. 첫 작업 전에는 보통 이렇게 시작합니다:

```
PLAN.md 같이 쓰자. 이 프로젝트는 … (목표 설명)
```

Claude가 PLAN.md를 함께 채우고, 작업 브랜치를 만들고, 작업을 진행합니다. 커밋이 필요한 시점에 `/cnp` 또는 `/cnp --merge`를 입력하면 커밋·푸시·(머지)까지 자동으로 진행합니다.

### 플래그

| 커맨드 | 플래그 | 동작 |
|---|---|---|
| `init` | `--force` | 묻지 않고 전부 덮어씀. 덮어쓴 파일은 자동 백업. |
| `init` | `--project-only` | 전역(`~/.claude/`) 설치 건너뜀. |
| `init` | `--dry-run` | 설치될 파일만 출력하고 실제로는 쓰지 않음. |
| `update` | `--dry-run` | 변경될 영역만 출력. |

### 기존 프로젝트에 추가 설치

이미 작업 중인 프로젝트에 `init`을 돌려도 안전합니다:

- `.env` 또는 `node_modules` 감지되면 "이미 진행 중인 프로젝트 같습니다. 계속할까요? (y/N)" — **기본값 N**.
- 기존 `CLAUDE.md`가 있고 `ch:managed` 마커가 있으면 → managed 섹션만 교체하고 `ch:user` 영역은 보존.
- 마커 없이 그냥 `CLAUDE.md`가 있으면 → diff 보여주고 덮어쓸지 묻기, **기본값 N**.
- `PLAN.md`가 있으면 → **무조건 skip**(사용자 작업물 보호).
- 덮어쓰는 모든 경우 자동 백업: `./.backup/YYYYMMDD-HHMMSS/`.

## `ch:user` — 안전하게 커스터마이즈

`CLAUDE.md`에는 두 종류의 영역이 있습니다:

```markdown
<!-- ch:managed start -->
(하네스가 관리하는 영역 — update 때 교체됨)
<!-- ch:managed end -->

<!-- ch:user start -->
(사용자 영역 — update 때 그대로 보존)
<!-- ch:user end -->
```

프로젝트별 추가 규칙은 `ch:user` 블록 안에 적으세요. 하네스가 업데이트돼도 이 블록은 안 건드립니다.

예시:

```markdown
<!-- ch:user start -->
## 이 프로젝트 전용 규칙
- TypeScript strict 유지
- 외부 API 응답은 Zod 검증 통과한 것만 사용
- 결제 모듈 수정 시 사용자 승인 필수
<!-- ch:user end -->
```

### 브랜치 모델이 다른 프로젝트 (main 단일 등)

하네스 기본값은 `develop` + 작업 브랜치 모델입니다. `main` 단일 브랜치 프로젝트라면 `ch:user` 영역에 override를 적습니다:

```markdown
<!-- ch:user start -->
## 브랜치 모델 override
- 이 프로젝트는 `main` 단일 브랜치, `develop` 없음.
- CNP의 PR 대상은 `main`. `--merge`도 PR을 통해 병합.
<!-- ch:user end -->
```

## 업데이트

하네스 쪽 업데이트(규칙 추가, cnp 스킬 개선 등)를 반영하려면:

```bash
pnpm dlx github:bangmim/claude-harness update
```

업데이트 처리:

- `CLAUDE.md` — `ch:managed` 섹션만 교체, `ch:user`와 바깥 영역은 보존.
- `cnp` 스킬 / 블로그 스킬 — 체크섬 다르면 자동 백업 후 교체.
- `PLAN.md` — 안 건드림.

## Fork 가이드

> **블로그 스킬은 Fork 없이 커스터마이즈 가능합니다.** 설치 후 `~/.claude/skills/writing-tistory-blog/config.md`에 자기 블로그 URL·카테고리·톤 예시를 채우면 됩니다. 아래 Fork 가이드는 **브랜치 모델이나 `/cnp` 흐름 등 하네스 자체 로직을 바꾸고 싶을 때**만 필요합니다.

본인 스택에 맞추려면 리포를 fork한 뒤 다음을 수정하세요:

1. **`templates/project/CLAUDE.md`의 `ch:managed` 영역** — 브랜치 모델이 다르면 수정.
2. **`templates/project/.claude/skills/cnp/SKILL.md`** — `/cnp` 세부 흐름(머지 규칙 등) 조정.
3. `pnpm build` 후 `dist/` 포함해서 커밋 + push.
4. 설치 명령 교체:

   ```bash
   pnpm dlx github:your-username/claude-harness init
   ```

## 문제 해결

### 백업 복원

덮어쓴 파일은 모두 자동 백업됩니다:

```
./.backup/YYYYMMDD-HHMMSS/        # 프로젝트 레벨
~/.claude/.backup/YYYYMMDD-HHMMSS/ # 사용자 레벨
```

복원:

```bash
cp ./.backup/20261009-143022/CLAUDE.md ./CLAUDE.md
```

오래된 백업 정리:

```bash
rm -rf ./.backup/<old-timestamp>/
```

### `ch:managed` 마커를 실수로 지웠을 때

1. 백업에서 복원, 또는
2. 수동으로 `<!-- ch:managed start -->` ~ `<!-- ch:managed end -->` 를 다시 넣고 `update` 재실행.

### `pnpm dlx` 캐시로 최신 리포가 안 반영됨

```bash
pnpm store prune
pnpm dlx github:bangmim/claude-harness update
```

### 설치만 되고 추가 안내 없이 끝남

맞습니다. 하네스는 설치 후 "✅ 설치 완료"와 백업 위치만 출력하고 끝납니다. Claude Code를 다시 켜면 CLAUDE.md와 `/cnp` 스킬이 자동으로 로드된 상태에서 평소대로 작업하면 됩니다.

### Windows

로드맵에 있지만 아직 미지원. macOS / Linux에서만 테스트됨.

## Contributing

이슈·PR 환영합니다. 다만 "솔로 개발자가 Claude Code로 사이드 프로젝트 돌리는 패턴"을 전제로 설계됐으므로, 브랜치 모델(`develop` 기본)이나 블로그 스킬 톤처럼 전제 자체를 바꾸는 큰 수정은 fork 추천.

## License

MIT © 박미현 (bangmim). 전문은 [LICENSE](./LICENSE) 참조.

## CNP의 PR 검증·리뷰

CNP는 검증 후 작업 브랜치를 푸시하고 PR을 생성하거나 갱신합니다. 플래그 없는 호출은 병합하지 않으며, `--merge`는 현재 head의 검사·리뷰와 저장소 조건을 확인한 뒤 PR로 병합합니다. `develop`이 없는 main-only 저장소는 `main`을 대상으로 합니다. PR 실패는 PR에서 처리하고, 기본 브랜치 실패나 별도 추적할 후속 과제만 이슈에 기록합니다. 실패 상태에서는 병합을 보류합니다.

자기 검토와 외부 리뷰는 따로 보고합니다. GitHub Actions 상시 실행이나 리뷰 서비스 연결은 이 스킬만으로 활성화되지 않습니다.

## 이 저장소의 GitHub 자동 검사

이 하네스 저장소 자체에는 `.github/workflows/ci.yml`이 PR·`main` push 시 타입 검사와 테스트를 실행합니다. `checks / verify`가 필수 검사 후보이며 원격 첫 실행의 실제 check 이름을 확인한 뒤 보호 규칙에 지정합니다. `main`의 CI 실패만 별도 workflow가 이슈로 등록하며, PR 실패·취소·수동 실행 실패는 이슈로 복제하지 않습니다. 반복 실패는 열린 파이프라인 이슈에 모으고 같은 실행 시도는 중복 기록하지 않습니다. 원인이 다른 실패는 확인 후 분리합니다. 성공 시 자동으로 이슈를 닫지는 않습니다.

PR 검사는 읽기 권한으로 실행합니다. 이슈 작성 작업은 기본 브랜치 코드만 사용하며 PR 코드·아티팩트·로그를 실행하거나 가져오지 않습니다. 추가 API 키는 필요하지 않습니다. AI 리뷰 서비스 연결과 GitHub 브랜치 보호는 별도 설정이며 이 파일만으로 켜지지 않습니다.

이 workflow들은 이 저장소 자체의 설정입니다. 하네스 `init`으로 다른 프로젝트에 복사하지 않습니다. 다른 프로젝트는 언어·패키지 관리자·테스트·배포 승인 규칙에 맞춰 별도 CI를 구성해야 합니다. 새 저장소는 템플릿으로 파일을 가져오거나 공통 reusable workflow를 호출할 수 있지만, 개인 계정의 모든 저장소에 자동 전역 적용되지는 않습니다.

브랜치 보호의 적용 예정 값은 `.github/branch-protection.json`에 있습니다. `main`은 PR로만 반영하고 GitHub Actions의 `checks / verify` 검사를 필수로 요구하며, 관리자에게도 적용합니다. 1인 운영이므로 사람 승인 수는 0으로 두고 강제 push·삭제는 허용하지 않습니다. 이 JSON은 선언용이며 자동 적용되지는 않습니다. 기존 보호 규칙이 있으면 통째로 덮어쓰지 않고 확인 후 필요한 조건만 조정합니다. workflow를 원격에 반영하고 실제 검사 이름·발행 앱을 확인한 뒤 저장소 설정에 적용해야 합니다.

위 자동화는 workflow가 원격에 반영된 뒤 동작합니다. 로컬 파일 작성만으로 활성화되지는 않습니다.

## 두 하네스의 공통 CI

설치 도구와 저장소는 분리하되, 타입 검사·테스트 단계는 `codex-harness/.github/workflows/harness-checks.yml`에서 함께 관리합니다. Codex 저장소는 같은 커밋의 로컬 workflow를, Claude 저장소는 공개 `codex-harness`의 `main` workflow를 호출합니다. checkout 대상은 호출한 저장소이므로 각각 자기 코드와 테스트를 검사합니다. 쓰기 권한이나 추가 secrets를 전달하지 않습니다.

최초 반영은 공통 workflow를 가진 `codex-harness`부터 병합하고, 그 다음 `claude-harness` PR 검사를 확인해야 합니다. 그 전 Claude의 원격 검사는 공통 workflow가 없어 실행되지 않을 수 있습니다. `@main` 참조는 공통 검사 변경을 함께 받기 위한 선택입니다. 이후 재현성을 우선하면 검증한 커밋 SHA로 고정하고 갱신 PR을 별도로 운영할 수 있습니다. 브랜치 보호의 check 이름은 원격 실행 결과로 확인합니다.
