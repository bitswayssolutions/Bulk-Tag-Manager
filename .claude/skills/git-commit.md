# Skill: git-commit

Standards for committing code in this project.

## Commit format
```
feat: short description      # new feature
fix: short description       # bug fix
chore: short description     # tooling, config, deps, refactor
```
One line, lowercase after the colon, no period at the end, under 72 chars.

## Pre-commit checklist — must all pass before committing
1. **No `console.log`** — search and remove: `grep -r "console\.log" app/`
2. **No hardcoded secrets** — no API keys, passwords, tokens in source files
3. **TypeScript passes** — `npm run typecheck` exits 0
4. **No `any` types** — `grep -r ": any" app/` should return nothing
5. **Git status is intentional** — review `git diff --staged` before committing

## Commit after every completed feature
Commit one logical unit at a time. Do not bundle unrelated changes. Stage only the files relevant to the feature.

## Example workflow
```bash
# Check for console.logs
grep -r "console\.log" app/

# Type check
npm run typecheck

# Stage and commit
git add app/routes/app.products.tsx
git commit -m "feat: products tag manager with filter bar and bulk add/remove"
```

## Never commit
- `.env` (contains real credentials)
- `prisma/dev.sqlite`
- `node_modules/`
- Build output (`build/`, `.react-router/`)
