export interface Suggestion { id: string; category: string; title: string; explanation: string; requirement: string }
export interface AnalysisResult { mode: 'mock'; supported: boolean; suggestions: Suggestion[]; message: string }
export interface AnalysisAdapter { analyze(prompt: string): Promise<AnalysisResult> }
export const examples = [
  { label: 'File upload', prompt: 'Create a file upload endpoint where authenticated users can upload documents.' },
  { label: 'User login', prompt: 'Build a user login endpoint with email and password authentication.' },
  { label: 'Database search', prompt: 'Create a database search endpoint that lets users search customer records.' },
];
const fixtures: Record<string, Suggestion[]> = {
  upload: [
    { id: 'upload-size', category: 'Resource limits', title: 'Bound upload sizes', explanation: 'Unbounded document uploads can exhaust server memory or storage.', requirement: 'Define and enforce a maximum upload size appropriate for the supported documents, rejecting oversized requests before buffering the full file.' },
    { id: 'upload-type', category: 'Input validation', title: 'Verify the actual file type', explanation: 'A filename extension alone does not establish that an uploaded document is an allowed format.', requirement: 'Allow only required document formats and validate their content and file signatures rather than trusting filenames or client-provided MIME types.' },
    { id: 'upload-storage', category: 'Storage', title: 'Keep uploads out of executable paths', explanation: 'Uploaded files may contain active content and should not become executable or directly public.', requirement: 'Store uploads outside executable and publicly served locations, use server-generated storage names, and serve downloads through authorized access checks.' },
  ],
  login: [
    { id: 'login-hash', category: 'Credentials', title: 'Use password-specific hashing', explanation: 'Password storage needs a slow, salted password hash rather than plaintext or a general-purpose digest.', requirement: 'Store passwords using an established password-hashing library such as Argon2id with unique salts and parameters selected for the deployment; never store or log plaintext passwords.' },
    { id: 'login-rate', category: 'Abuse prevention', title: 'Limit repeated login attempts', explanation: 'An unrestricted login endpoint allows automated password guessing.', requirement: 'Apply login rate limits appropriate for the application across account and source signals, with safe retry behavior and generic authentication failure messages.' },
    { id: 'login-session', category: 'Sessions', title: 'Define secure session handling', explanation: 'Authentication also needs a deliberate session lifecycle after credentials are checked.', requirement: 'Use unpredictable session identifiers, rotate them after login, define expiration and logout invalidation, and protect browser session cookies with Secure, HttpOnly, and an appropriate SameSite policy.' },
  ],
  search: [
    { id: 'search-query', category: 'Query safety', title: 'Parameterize database queries', explanation: 'Search terms must remain data when used in database queries.', requirement: 'Use parameterized database queries for all user-controlled search terms and allowlist any dynamic query identifiers such as sort columns.' },
    { id: 'search-auth', category: 'Authorization', title: 'Scope results to authorized records', explanation: 'Being able to search does not imply permission to read every customer record.', requirement: 'Authenticate callers and enforce record-level and tenant-level authorization in the search query so users can only retrieve records they are permitted to access.' },
    { id: 'search-data', category: 'Data minimization', title: 'Return only necessary customer data', explanation: 'Broad result objects can expose sensitive customer fields unnecessarily.', requirement: 'Explicitly select the customer fields required by the search interface, exclude sensitive fields by default, and bound result counts with pagination.' },
  ],
};
export const mockAdapter: AnalysisAdapter = {
  async analyze(prompt) {
    await new Promise(resolve => setTimeout(resolve, 450));
    const matches = [ /\b(upload|uploads|uploading)\b/i.test(prompt) ? 'upload' : '', /\b(login|log[ -]in|sign[ -]in)\b/i.test(prompt) ? 'login' : '', /\b(search|query)\b/i.test(prompt) && /\b(database|sql|customer|records)\b/i.test(prompt) ? 'search' : '' ].filter(Boolean);
    const supported = matches.length === 1;
    return { mode: 'mock', supported, suggestions: supported ? fixtures[matches[0]].map(s => ({ ...s })) : [], message: supported ? 'Example matching selected a hand-written demo analysis. This is not the research predictor.' : 'This demo only includes example analyses for file upload, user login, and database search. Try one task category at a time. No security conclusion can be drawn for this prompt.' };
  },
};
// Replace this adapter with Chaoran’s local backend implementation, e.g. a POST
// to /analyze returning AnalysisResult. Network transmission requires a future,
// explicit product change; this demo never sends prompts anywhere.
const adapter: AnalysisAdapter = mockAdapter;
export const analyzePrompt = (prompt: string): Promise<AnalysisResult> => adapter.analyze(prompt);
