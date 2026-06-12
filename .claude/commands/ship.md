# /ship

Pre-deploy checklist. Run this before `npm run deploy` or pushing to production.

## Steps to perform in order

### 1. TypeScript
```bash
npm run typecheck
```
Must exit 0. Fix all errors before continuing.

### 2. No console.log
```bash
grep -r "console\.log" app/
```
Must return nothing. Remove any found.

### 3. No hardcoded secrets
```bash
grep -rE "(api_key|apiKey|secret|password|token)\s*=\s*['\"][^'\"]{8,}" app/
```
Must return nothing. All secrets must use `process.env.*`.

### 4. No `any` types
```bash
grep -rn ": any" app/
```
Must return nothing.

### 5. Lint
```bash
npm run lint
```
Must exit 0.

### 6. Git status clean
```bash
git status
```
Must show nothing uncommitted. Commit or stash everything first.

### 7. Environment variables
Confirm these are set in Vercel (not just `.env`):
- `SHOPIFY_API_KEY`
- `SHOPIFY_API_SECRET`
- `SHOPIFY_APP_URL`
- `DATABASE_URL`
- `DIRECT_URL`
- `SCOPES`

### 8. Build
```bash
npm run build
```
Must complete without errors.

## Report
After running all checks, report:
- ✅ All checks passed — safe to deploy
- ❌ Blocked — list each failing check with the fix needed
