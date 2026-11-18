# SecNudge prototype handoff

## Current implementation

- The React/TypeScript web app supports three mock categories: uploads, login, and database search.
- `integrations/secnudge` is a standalone VS Code extension (v0.0.3). The review panel supports editing, acceptance/dismissal/undo, revised previews, copying, and invalidation after prompt edits.
- The extension also offers Enable Claude Code nudge, Check setup, and Disable commands. Enable installs a self-contained local hook in the selected project and preserves unrelated Claude settings.
- The panel and hook share the integration's runtime-validated asynchronous adapter in `integrations/secnudge/analyzer.cjs`. The web app has a separate TypeScript adapter. The two apps are not yet consolidated into one shared backend package.
- The Claude integration matches one file-upload fixture after trimming whitespace, removing one trailing `.`, `!`, or `?`, and ignoring case. Reworded prompts fall outside that fixture.
- Both analyzers remain mocked while Chaoran connects the research backend. The [evaluation prompt pairs](EVALUATION_PROMPTS.md) cover the three web categories, an unsupported control, and the VS Code and Claude Code fixture.

## Verification

The cloud rerun passed 6 web tests, the TypeScript/production build, 17 integration tests, syntax checks for 16 integration scripts, and the Chromium panel test with a simulated VS Code bridge. The packaged VSIX also passed archive validation and an extracted-runtime hook install, check, and removal.

All four web pairs were checked in Chromium, including the edit, accept, dismiss, undo, copy, and invalidation flows for the supported pairs. The documented Claude pair produced a block for the baseline and no block decision for the revision when run through the local hook command.

The extension was installed in VS Code on macOS, and the panel opened and passed the local setup check for a sample project. Chaoran confirmed that real Claude Code blocks submission of `Build an endpoint to upload files`. **Revised-prompt submission remains unconfirmed in real Claude Code.** The full accept/copy flow in the real IDE also remains unconfirmed.

## Remaining live checks

1. Check out this branch and open `integrations/secnudge`.
2. Run `npm run package` (Node 18+) to create `dist/secnudge-demo-0.0.3.vsix`, then install it through VS Code's **Extensions: Install from VSIX…** command. No npm install is needed for packaging or the extension runtime.
3. Run **SecNudge: Review Prompt** from the Command Palette.
4. Choose **Enable Claude Code nudge…** and select this repository's `examples/claude-upload` folder. Choose that same folder for **Check setup…**.
5. With eligible Claude Code access, open `examples/claude-upload` as the project and start a new Claude Code session. Confirm **UserPromptSubmit** via `/hooks`.
6. To reproduce the confirmed block in the same session, submit `Build an endpoint to upload files` exactly as written and record whether the SecNudge reason appears.
7. Manually submit the [revised example](../examples/claude-upload/TASK.md#revised-example) and record whether Claude Code proceeds. This checks how the live client handles text outside the mock fixture.
8. Disable the nudge for the same folder and restart Claude Code. Confirm unrelated hooks still exist.

Report the Claude Code client (CLI or VS Code) and version, hook visibility, the revised submission outcome, and any generic error text. Use the supplied synthetic fixture for the live check. Also exercise accept, edit, dismiss, undo, and clipboard behavior in the actual VS Code panel.

## What is needed for the research backend

Please share the existing analyzer or a local adapter interface, including installation/runtime instructions, model artifacts, required inputs, supported task categories, output examples, and any credentials needed through an appropriate secure channel. Do not send secret values in chat or commit them.

The provisional analysis result contains `mode`, `supported`, `message`, and `suggestions`, with each suggestion containing a stable `id`, `category`, `title`, `explanation`, and editable `requirement`. The integration validates all fields and duplicate IDs, and applies a 3-second timeout. Both callers already await the adapter.

Before connecting the real model, agree on actual provenance values, latency/cancellation behavior, prompt handling, unsupported/error outcomes, and the policy for when a concern should block submission. The current “block supported suggestions” policy exists only for the one-fixture experiment. Update the validator and UI mock labels together when real provenance becomes available.

The adapter has not been trained or recreated. The prototype does not establish security effectiveness, and there is no Codex/ChatGPT composer interception. Claude Code may retain submitted prompts in its own host transcript even if a hook blocks them.
