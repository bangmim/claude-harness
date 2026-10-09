---
description: Write a Tistory blog post (invokes writing-tistory-blog skill)
---

Invoke the `writing-tistory-blog` skill to write a blog post.

The skill reads `~/.claude/skills/writing-tistory-blog/config.md` for the user's blog URL, category definitions, save directory, tone examples, and title prefix examples. If `config.md` is missing, instruct the user to copy `config.example.md` to `config.md` and fill it in before continuing.

If the user specified the topic and category, proceed directly. If not, briefly ask:
- What the post should cover
- Which category — only ask if ambiguous, referring to the category names defined in `config.md`

After the file is written, run `open {config.save_dir}` to show the Finder window, and give the user the Tistory copy-paste guide.
