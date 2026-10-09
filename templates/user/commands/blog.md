---
description: Write a Tistory blog post (invokes writing-tistory-blog skill)
---

Invoke the `writing-tistory-blog` skill to write a blog post.

If the user specified the topic and category, proceed directly. If not, briefly ask:
- What the post should cover
- Which category ("사이드 프로젝트" or "개발 오답노트") — only ask if ambiguous

After the file is written, always run `open ~/docs/blog/` to show the Finder window, and give the user the Tistory copy-paste guide.
