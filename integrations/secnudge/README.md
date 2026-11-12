# SecNudge: editor + submission nudge

Two local prototypes share **one exact-match mock fixture**: an on-demand VS Code panel and an optional Claude Code UserPromptSubmit hook. No research model is connected. This prototype does not establish security effectiveness. There is no integration inside the Claude Code, Codex, or ChatGPT composer. Copying from the panel is the final step.

## Run on your Mac

Install [Visual Studio Code](https://code.visualstudio.com/). Unzip **SecNudge-Claude-demo.zip** and double-click **Launch VS Code.command** inside `SecNudge`. It opens an Extension Development Host with the prototype loaded.

If macOS refuses the launcher, use Terminal instead; do not disable macOS security settings. Type `cd ` (including the space), drag the extracted `SecNudge` folder from Finder into Terminal, then press Return. Run:

```sh
code --new-window --extensionDevelopmentPath="$PWD" "$PWD"
```

If `code` is unavailable, run this instead:

```sh
"/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" --new-window --extensionDevelopmentPath="$PWD" "$PWD"
```

In the new window press **Cmd+Shift+P**, select **SecNudge: Review Prompt**, then **Load file upload example** → **Review prompt**. Edit and accept/dismiss a requirement; undo returns it to pending. Only accepted, nonempty requirements enter the preview. Editing the draft invalidates the review, even if you restore the old text. Copy the revision into your coding assistant.

**No npm install, API keys, database, or Claude subscription is required for the panel.** It uses VS Code's built-in Node runtime and no runtime package dependencies.

### Install the VSIX instead

In VS Code open Extensions → **…** → **Install from VSIX…** and select the separately provided `secnudge-demo-0.0.3.vsix`. Then run the same Command Palette command. `secnudge-research` is a local package identifier, not a verified Marketplace publisher. Nothing has been published to the Marketplace.

## Claude Code submission-time nudge

In the SecNudge panel, the **Claude Code · submission nudge** section now provides **Enable Claude Code nudge…**, **Check setup…**, and **Disable nudge…**. These are also commands in the VS Code Command Palette. Use these controls rather than editing JSON manually.

Requires standalone **Node.js 18+** on the same machine as the extension host and an installed, authenticated Claude Code client. The VS Code review panel still works without either. The hook is off until you enable it for a selected project; opening this panel does not enable it.

1. Click **Enable Claude Code nudge…** and choose the project folder you will open in Claude Code.
2. Click **Check setup…** and choose that same folder. A passing check runs the installed hook against the known demo input locally. It does not call Claude or send your draft anywhere.
3. Restart Claude Code in that project. Run **/hooks** to confirm the SecNudge command is listed under **UserPromptSubmit**, and accept any client-requested hook approval after reviewing it.
4. Submit exactly **Build an endpoint to upload files**. The hook should pause this example and display the suggested maximum-upload-size requirement.
5. Manually revise and resubmit, for example **Build an endpoint to upload files. Enforce a configurable maximum file size on the server and reject oversized uploads.**
6. To stop the experiment, click **Disable nudge…**, choose the same project, then restart Claude Code.

**Other prompts pass because they do not match the fixture, not because they are secure or because SecNudge detected a fix.** Even wording changes bypass it. The hook is an interaction demo, not a security gate. SecNudge does not add controls inside Claude’s composer, automatically rewrite submissions, or launch an AI request.

### Installation behavior

Enable copies only `hook.cjs` and `analyzer.cjs` into the selected project's `.claude/secnudge/`, records installation metadata, and adds a command to `.claude/settings.local.json`. The installed hook is independent of the downloaded extension folder and survives VS Code extension upgrades. Node must remain installed at the recorded path; if you change Node installations, enable again to refresh the binding.

The installer preserves unrelated hooks/settings and keeps a `.secnudge-backup` of settings before actual edits. It refuses malformed settings, unknown runtime directories, locally edited managed hook files, or a local `disableAllHooks` setting. Disable removes only its registered command and retains its runtime files, so local edits are not deleted. You can remove `.claude/secnudge/` after disabling if you no longer need it. Keep the managed runtime and its metadata out of version control if these are local study settings.

A local check is not proof of live Claude behavior: global/managed settings, client hook support, workspace trust, or other hooks can affect submission. If the fixture does not pause, check **/hooks**, the project folder, and whether hooks are disabled in the client. Claude CLI and VS Code client behavior require a manual check with your installed version.

### Terminal alternative

From the extracted SecNudge folder:

```sh
node scripts/configure-hook.cjs enable "/absolute/path/to/your/project"
node scripts/configure-hook.cjs status "/absolute/path/to/your/project"
node scripts/configure-hook.cjs disable "/absolute/path/to/your/project"
```

The installer currently supports macOS/Linux. On Windows configure the command manually using the reference `claude-settings.example.json` (which assumes `hook.cjs` at the project root); do not overwrite existing settings with that example.

Protocol: fixture → `{decision:"block",reason:string}` on stdout, exit 0; unsupported → no stdout, exit 0; errors → generic stderr diagnostic, exit 1, intended to fail open under Claude Code's nonblocking-error behavior. The analyzer timeout is 3 seconds inside a 5-second hook budget. Verify that behavior with your client before a study.

## Privacy

The review panel and analyzer do not log, persist, or transmit drafts, read workspace files, or automatically submit to an agent. The opt-in hook installer manages only the selected project’s Claude settings, backup, and copied SecNudge runtime. Installation metadata contains file hashes and executable paths, never prompts. Local setup tests use only the known mock example. Closing/reloading the panel clears its memory. Copy explicitly writes to the OS clipboard. Claude Code receives submitted prompts and may retain them, including blocked prompts, in its own transcripts. The panel's local-only guarantee does not extend to that host workflow.

## Connect Chaoran's backend

Replace the adapter selected in `analyzer.cjs`; both the extension and hook await `analyzePrompt(prompt)`. The shared wrapper validates responses and unique IDs and times out. Errors become retryable panel messages or generic nonblocking hook diagnostics.

Provisional contract, to confirm with Chaoran:

```ts
analyzePrompt(prompt: string): Promise<{
  mode: 'mock'; // extend provenance when connecting the real model
  supported: boolean;
  message: string;
  suggestions: Array<{
    id: string; // stable, unique in this analysis
    category: string;
    title: string;
    explanation: string;
    requirement: string;
  }>;
}>
```

A real integration must update the validator/provenance labels, agree on privacy and timeout/cancellation semantics, and define a blocking policy. Do not carry the current “block every supported suggestion” demo policy into a real model without that decision.

## Development and checks

From this folder, Node alone can run:

```sh
npm test
npm run check
npm run package
```

`package` builds a local VSIX in `dist`, without publishing. For browser tests:

```sh
npm ci
npx playwright install chromium
npm run test:browser
```

Or use existing Chromium: `CHROMIUM_PATH=/path/to/chromium npm run test:browser`.

Tests cover assembly, async adapter validation/timeouts, hook CLI behavior, additive setup/removal, self-contained runtime installation, commands with spaces/apostrophes in paths, Node discovery, setup cancellation, and extension message handling with a mocked VS Code API. Browser checks use the real panel/scripts and a simulated message bridge, covering decisions, loading/errors, stale responses, copy feedback, unsupported prompts, long text, and mobile layout. Screenshots go to ignored `dist/`.

These checks do **not** establish real VS Code installation/activation, IDE clipboard behavior, or live Claude submission blocking. Use the manual workflows above to verify those before a study.
