# SecNudge

For the **VS Code extension and Claude Code submission nudge**, start with [the integration setup guide](integrations/secnudge/README.md). [Current status and Chaoran handoff](docs/HANDOFF.md) includes the live-test checklist and backend requirements. A disposable [sample project](examples/claude-upload) is included.

A preliminary research interface for reviewing missing security requirements before generating code. All analyses are clearly labeled mock results. This prototype does **not** establish security effectiveness or identify confirmed vulnerabilities.

## Local development

Requires Node.js 20.19+ or 22.12+ (validated with Node 24).

```sh
npm ci
npm run dev
```

Open the local address printed by Vite. No API keys, database, external AI service, or backend are required. Prompts and decisions live only in React memory: no logging, persistence, or transmission. Reloading clears them. Copying writes the revision to the system clipboard only when requested.

```sh
npm test
npm run typecheck
npm run build
```

## Workflow and mock behavior

Enter a prompt or select File upload, User login, or Database search. Review, edit, and accept or dismiss individual requirements. Undo resets a decision to pending. Only accepted, nonempty requirements enter the preview. Changing the prompt invalidates results, blocks copying, and ignores any in-flight analysis response. A new review resets all decisions.

`src/analysis/index.ts` contains typed fixtures and a deterministic keyword-based mock adapter. The matching is demo behavior, **not** the research predictor. Ambiguous multi-category and unsupported prompts receive an explanatory message rather than unrelated suggestions or a security verdict. The short delay exercises the loading UI. Failures from the adapter render a retryable error without losing input.

## Connecting Chaoran’s backend

Replace the selected `AnalysisAdapter` in `src/analysis/index.ts` with the existing model's local backend adapter. The UI calls only `analyzePrompt(prompt): Promise<AnalysisResult>` and does not import fixtures. Do not train or recreate the research model here.

Provisional input/output contract (to confirm with Chaoran):

```ts
// Possible local POST /analyze body:
{ prompt: string }
// Adapter return value:
{
  mode: 'mock', // provisional: extend with 'model' when connected
  supported: boolean,
  message: string,
  suggestions: Array<{
    id: string,          // unique, stable within an analysis
    category: string,
    title: string,
    explanation: string,
    requirement: string
  }>
}
```

The current `mode: 'mock'` type and persistent demo labels intentionally describe only the implemented adapter. A real integration must extend that contract, update provenance labels, validate backend responses, and explicitly define prompt transmission/privacy behavior. It must not silently remove the current in-memory-only promise. Rejected adapter promises are handled by the UI. Numerical risk or confidence scores are intentionally absent.

## Structure

- `src/main.tsx`: accessible editor, decisions, preview, async-response guards, copy feedback.
- `src/analysis/index.ts`: replaceable analysis boundary and mock examples.
- `src/prompt.ts`: pure revision assembly; refuses outdated results.
- `src/prompt.test.ts`: focused assembly and adapter tests.
- `src/style.css`: responsive layout, local system fonts, visible focus styling.

No deployment or publication is configured.

## VS Code and Claude Code experiment

The newer standalone integration demo lives in [`integrations/secnudge`](integrations/secnudge/README.md). It adds an on-demand VS Code review panel and an opt-in Claude Code submission hook, sharing one exact-match upload fixture. The web prototype above remains separate and unchanged. See the integration README for Mac launch instructions, VSIX installation, hook enable/disable steps, privacy limits, tests, and the provisional backend contract.
