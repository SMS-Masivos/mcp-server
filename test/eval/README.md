# Eval Suite — MCP Server

Validates that an LLM correctly selects the right tool given natural language prompts.

## When to run

- **Pre-release:** before bumping version + `npm publish`.
- **CI:** auto-runs on `release/*` branches and tags (NOT on every PR — token cost).
- **Manual debugging:** when changing tool descriptions or schemas, run to verify selection still works.

## Setup

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
npm run test:eval               # default: Haiku 4.5 (~$0.05/run)
EVAL_MODEL=sonnet npm run test:eval   # Sonnet 4.6 (~$0.50/run)
```

## What's tested

- 10–15 natural-language prompts → expected tool name + key arg shape
- Discriminator paths in `manage_webhook`
- Workflow prompts that orchestrate multiple tools

## Cost calibration

- Haiku 4.5: ~$0.05 for ~15 cases (default in CI on release)
- Sonnet 4.6: ~$0.50 (manual run before release)

If Haiku passes, stronger models will too. Sonnet manual is a safety net.
