# Security Policy

## Reporting a vulnerability

If you discover a security vulnerability in Crosshair, please report it
privately so it can be addressed before public disclosure.

**Do not open a public issue for security vulnerabilities.**

Instead, use GitHub's private vulnerability reporting:
[Report a vulnerability](https://github.com/mhandresen/crosshair/security/advisories/new)

Please include:

- A description of the vulnerability and its impact
- Steps to reproduce, or a proof of concept
- Any suggested remediation, if you have one

You can expect an initial response within a few days. Once the issue is
confirmed and a fix is prepared, we will coordinate a disclosure timeline
with you and credit you in the advisory unless you prefer to remain anonymous.

## Scope and threat model

Crosshair runs as a developer and CI tool. Two parts of its operation are
security-relevant, and contributors should keep them in mind:

- **It launches MCP servers as subprocesses.** Crosshair executes the server
  command from your configuration (or CLI arguments). Treat a `crosshair.config.ts`
  the same way you treat any executable project config: only run it from sources
  you trust. Crosshair observes which tool a model *selects*; it does not execute
  the selected tool against your server.

- **It sends tool definitions and prompts to model providers.** When you run
  behavioral tests, your tool schemas and case prompts are sent to the configured
  provider's API. Do not put secrets in tool descriptions or prompts.

### API keys

Crosshair reads provider credentials (e.g. `ANTHROPIC_API_KEY`) from the
environment. It never writes them to disk, never includes them in cache files
(the cache stores only model responses), and never logs them. In CI, supply the
key via repository secrets and the job environment — **never** through a config
file or a workflow that runs on untrusted pull requests. See the CI guide for the
fork-safe workflow pattern.

## Supported versions

Crosshair is pre-1.0. Security fixes are applied to the latest released version.