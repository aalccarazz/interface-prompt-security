# SecNudge evaluation prompt pairs

Use these synthetic pairs to check the interface with the mock analyzer and to provide sample inputs for Chaoran’s backend integration. Each revision keeps the original task and adds one explicit requirement. Expected results below describe the current fixtures. Record backend results separately when the backend is available.

## Web review

Review each baseline as a fresh draft. Check the named suggestion, edit and accept it, and confirm the preview preserves the baseline and includes only the accepted requirement. Check dismiss and undo, then change the draft and confirm copying is disabled until a new review. Paste the supplied revision as a fresh draft to check the mock result independently of your edits. Both versions of each supported pair should show the same three suggestions because the mock matches category keywords.

| Pair | Baseline | Revised | Expected web result |
| --- | --- | --- | --- |
| File upload | Create a file upload endpoint where authenticated users can upload documents. | Create a file upload endpoint where authenticated users can upload documents. Enforce a configurable maximum upload size on the server and reject oversized requests before buffering the full file. | Three upload suggestions, including **Bound upload sizes**. |
| User login | Build a user login endpoint with email and password authentication. | Build a user login endpoint with email and password authentication. Hash stored passwords with Argon2id and a unique salt for each password. | Three login suggestions, including **Use password-specific hashing**. |
| Database search | Create a database search endpoint that lets users search customer records. | Create a database search endpoint that lets users search customer records. Use parameterized queries for all user-supplied search terms. | Three search suggestions, including **Parameterize database queries**. |
| Unsupported control | Build a weather widget that displays the current forecast. | Build a weather widget that displays the current forecast. Render forecast text as plain text. | Unsupported message and zero suggestions for both versions. |

## VS Code panel and Claude Code hook

Use this pair in the panel and the disposable [Claude upload project](../examples/claude-upload). The baseline matches the single fixture after trimming whitespace, removing one trailing `.`, `!`, or `?`, and ignoring case. Submit the baseline as written for the live check.

| Baseline | Revised |
| --- | --- |
| Build an endpoint to upload files | Build an endpoint to upload files. Enforce a configurable maximum file size on the server and reject oversized uploads. |

- **VS Code panel mock** — The baseline shows **Maximum upload size**. Accept it and check the preview and copy action. Paste the supplied revision as a fresh draft to check the unsupported state.
- **Local hook** — The baseline returns `decision: "block"` with the suggested limit. The revision exits successfully with no block decision because it falls outside the fixture.
- **Live Claude Code** — Chaoran confirmed that the baseline blocked submission. The revised submission remains unconfirmed. The [handoff](HANDOFF.md#remaining-live-checks) lists what to record when checking it.

Record the surface, pair, prompt version, and observed suggestions or submission outcome. For live Claude Code, include the client and version if available. These pairs exercise interface behavior and fixture matching. Security effectiveness would require a separate evaluation.
