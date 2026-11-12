# SecNudge prototype handoff

## Current implementation

- The React/TypeScript web app supports three mock categories: uploads, login, and database search.
- `integrations/secnudge` is a standalone VS Code extension (v0.0.3). The review panel supports editing, acceptance/dismissal/undo, revised previews, copying, and invalidation after prompt edits.
- The extension also offers Enable Claude Code nudge, Check setup, and Disable commands. Enable installs a self-contained local hook in the selected project and preserves unrelated Claude settings.
- The panel and hook share the integration's runtime-validated asynchronous adapter in `integrations/secnudge/analyzer.cjs`. The web app has a separate TypeScript adapter. The two apps are not yet consolidated into one shared backend package.
- The Claude integration matches exactly one file-upload fixture. Reworded prompts bypass it. It is an interaction demo, not a predictor or security gate.

## Verification

Verified in the cloud workspace: 6 web-app tests, TypeScript/production build, 17 integration tests, integration syntax checks, browser checks using a simulated VS Code bridge, and extracted VSIX runtime installation/check/removal.

The user installed the extension in VS Code on macOS, opened the panel, enabled the hook for a sample project, and reported a passing local hook check. The full accept/copy flow in the real IDE and live Claude Code submission behavior have not been confirmed. Live Claude testing is blocked on the user's Claude access; no subscription or API credentials are included.

## What Chaoran can test

1. Check out this branch and open `integrations/secnudge`.
2. Run `npm run package` (Node 18+) to create `dist/secnudge-demo-0.0.3.vsix`, then install it through VS Code's **Extensions: Install from VSIX…** command. No npm install is needed for packaging or the extension runtime.
3. Run **SecNudge: Review Prompt** from the Command Palette.
4. Choose **Enable Claude Code nudge…** and select this repository's `examples/claude-upload` folder. Choose that same folder for **Check setup…**.
5. With eligible Claude Code access, open `examples/claude-upload` as the project and start a new Claude Code session. Confirm **UserPromptSubmit** via `/hooks`.
6. Submit exactly `Build an endpoint to upload files`. Record whether the SecNudge block reason appears before Claude proceeds. No screenshot or transcript containing sensitive prompts is needed; use only this fixture.
7. Manually resubmit the revised example in `TASK.md` and confirm it proceeds. That only verifies the exact-match bypass behavior, not whether a security requirement was understood.
8. Disable the nudge for the same folder and restart Claude Code. Confirm unrelated hooks still exist.

Report the Claude Code version/client (CLI or VS Code), whether the hook was visible, whether the fixture blocked, whether the revised prompt proceeded, and any generic error text. Also exercise accept/edit/dismiss/undo and clipboard behavior in the actual VS Code panel.

## What is needed for the research backend

Please share the existing analyzer or a local adapter interface, including installation/runtime instructions, model artifacts, required inputs, supported task categories, output examples, and any credentials needed through an appropriate secure channel. Do not send secret values in chat or commit them.

The provisional analysis result contains `mode`, `supported`, `message`, and `suggestions`, with each suggestion containing a stable `id`, `category`, `title`, `explanation`, and editable `requirement`. The integration validates all fields and duplicate IDs, and applies a 3-second timeout. Both callers already await the adapter.

Before connecting the real model, agree on actual provenance values, latency/cancellation behavior, prompt handling, unsupported/error outcomes, and the policy for when a concern should block submission. The current “block supported suggestions” policy exists only for the one-fixture experiment. Update the validator and UI mock labels together when real provenance becomes available.

The adapter has not been trained or recreated. The prototype does not establish security effectiveness, and there is no Codex/ChatGPT composer interception. Claude Code may retain submitted prompts in its own host transcript even if a hook blocks them.
