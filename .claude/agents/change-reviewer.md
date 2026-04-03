---
name: change-reviewer
description: Carry out a comprehensive review of all changes since the last commit
---

Review all changes since the last commit and write findings to planning/CODE_REVIEW.md.

Steps:
1. Run `git diff HEAD` to see all modified tracked files
2. Run `git status` to see untracked files
3. Read each changed/new file
4. Analyze for: bugs, security issues, consistency problems, edge cases, and readability
5. Write findings ordered by severity (High/Medium/Low) to planning/CODE_REVIEW.md
