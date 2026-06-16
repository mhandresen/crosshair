# Contributing to Crosshair

Thanks for your interest in contributing. This guide covers getting the
monorepo running, the test setup, and how changes get released.

## Setup

Crosshair is a pnpm workspace with two published packages —
`@crosshair/core` (the library) and `@crosshair/cli` (the `crosshair`
binary) — plus example servers used in tests.

```bash
git clone https://github.com/mhandresen/crosshair.git
cd crosshair
pnpm install
pnpm build
```

You'll need Node 20+ and pnpm. The build uses tsup; the type-check that
gates releases runs the real `tsc`, so `pnpm build` is the source of truth
for "does it compile."

## Running tests

```bash
pnpm test        # full suite, runs offline
pnpm lint        # Biome (lint + format check)
```

The test suite runs entirely offline — model calls are faked through a
mock adapter, so you don't need an API key to develop or to run CI. Tests
that would hit a real provider are opt-in and skipped by default.

If you add a feature, add a test for it. The mock adapter
(`MockAdapter`, with the `callsTool` / `callsNoTool` helpers) lets you
assert tool-selection behavior deterministically without a network call.

## Making a change

1. Create a branch.
2. Make your change, with tests.
3. `pnpm build && pnpm test && pnpm lint` — all green.
4. **Add a changeset:** `pnpm changeset`. Pick the affected packages and a
   bump level, and write a short summary. This is what drives versioning and
   the changelog — a PR that changes published code without a changeset will
   be flagged.
5. Open a PR. CI runs lint, build, and the offline tests on every PR,
   including from forks (no secrets are exposed to fork PRs).

## Adding a model adapter

Crosshair talks to model providers through a small `ModelAdapter` interface
(`packages/core/src/adapters`). The Anthropic adapter is the reference
implementation. Adding support for another provider — for example via the
[Vercel AI SDK](https://sdk.vercel.ai/), which normalizes many providers
behind one interface — means implementing that interface and returning the
tool calls the model produced. Contributions here are welcome.

## Scope

Crosshair tests the model-facing surface of MCP servers: tool definitions,
selection behavior, and regressions in either. Changes that fit that mission
are welcome. If you're planning something larger, open an issue first so we
can talk through the approach before you build it.

## Code of conduct

This project follows the [Contributor Covenant](./CODE_OF_CONDUCT.md).