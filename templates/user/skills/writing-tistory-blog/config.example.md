# writing-tistory-blog 개인 설정 (템플릿)

> 이 파일을 `config.md`로 복사한 뒤 자기 블로그 정보로 채워 사용하세요.
> `config.md`는 `.gitignore`로 공개 레포에서 제외됩니다.
>
> ```bash
> cp config.example.md config.md
> # 그런 다음 config.md를 열어 아래 placeholder들을 채우세요
> ```

## 블로그 기본 정보

- **blog_url:** https://{{YOUR_TISTORY_HANDLE}}.tistory.com
- **blog_name:** {{YOUR_TISTORY_HANDLE}}
- **save_dir:** `~/docs/blog/` <!-- 또는 원하는 로컬 경로 -->

## 카테고리 정의 (사용자 블로그의 실제 카테고리)

> 티스토리 블로그에서 **실제로 쓰는 카테고리 이름**을 그대로 적습니다.
> 카테고리는 2개 이상 지원됩니다. 필요 시 아래 블록을 복사해서 추가하세요.

### 카테고리 1
- **name:** "{{CATEGORY_1_NAME}}" <!-- 예: "사이드 프로젝트" -->
- **filename_label:** {{CATEGORY_1_LABEL}} <!-- 파일명에 들어갈 짧은 한글. 예: "사이드" -->
- **URL path:** `/category/{{CATEGORY_1_URL_SAFE}}` <!-- 예: /category/사이드%20프로젝트 -->
- **선택 조건:**
  - {{조건 1 — 어떤 글이 이 카테고리에 속하는지}}
  - {{조건 2}}
  - {{조건 3}}
- **판단 질문:** *"{{YES/NO 로 답할 수 있는 명확한 질문}}"* YES → 이 카테고리

### 카테고리 2
- **name:** "{{CATEGORY_2_NAME}}" <!-- 예: "개발 오답노트" -->
- **filename_label:** {{CATEGORY_2_LABEL}} <!-- 예: "오답노트" -->
- **URL path:** `/category/{{CATEGORY_2_URL_SAFE}}`
- **선택 조건:**
  - {{조건 1}}
  - {{조건 2}}
- **판단 질문:** *"{{판단 질문}}"* YES → 이 카테고리

## 톤 예시 (사용자가 실제로 쓴 문장)

> 자기 블로그에서 **대표적인 3~5문장**을 그대로 복사해 넣으세요.
> AI가 글 쓸 때 이 문장들의 어미·호흡·톤을 참고합니다.

- "{{사용자 실제 문장 1}}"
- "{{사용자 실제 문장 2}}"
- "{{사용자 실제 문장 3}}"

## 제목 prefix 사용 예시 (실제 발행 글 기반)

> 자기 블로그에서 **각 카테고리별로 실제 발행한 글 제목 3~5개**를 그대로 넣으세요.
> AI가 새 글 쓸 때 어떤 prefix 라벨을 쓰면 자연스러운지 참고합니다.

### "{{CATEGORY_1_NAME}}" 카테고리
- `[{{prefix}}] {{제목 예시 1}}` ({{왜 이 prefix를 썼는지 간단 설명}})
- `[{{prefix}}] {{제목 예시 2}}`
- `[{{prefix}}] {{제목 예시 3}}`

### "{{CATEGORY_2_NAME}}" 카테고리 (prefix는 글 성격에 따라 **유연** 선택 가능)
- `[{{기술명 또는 주제명}}] {{제목 예시 1}}` ({{왜 이 prefix인지}})
- `[{{기술명 또는 주제명}}] {{제목 예시 2}}`
- `[{{CATEGORY_2_NAME}}] {{메타·보편 교훈 글 예시}}` (**카테고리명 prefix는 범용 교훈이 글 자체인 경우에만**)

## 참조 메모리 (선택)

> Claude Code memory 시스템에 블로그 톤 관련 메모리 파일이 있다면 이름을 적어둡니다.
> 없으면 이 섹션 비워도 됨.

- `{{memory_file_name}}.md` <!-- 예: feedback_blog-tone-guide.md -->
