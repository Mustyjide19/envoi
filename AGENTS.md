# Envoi Codex Rules

## Branching
- Always create and work on a branch named: phase2/<feature-name>
- Never push to GitHub. I will push manually.
- Before editing, explain the plan and list the files to modify.

## Testing (Mandatory)
After making changes:
- Run: npm run test:unit
- Run: npm run test:e2e
- Or: npm run test:all
If tests fail, fix them before saying the task is complete.

## Safety
- Do not modify .env
- Do not change Husky configuration
- Do not weaken validation, auth, or access control

## Output format
Respond in this order:
1. Plan
2. Files to modify
3. Implementation summary
4. Test results summary
5. One short dev joke or fact (1 sentence only)