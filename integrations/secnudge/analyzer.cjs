// Shared, replaceable adapter. No prompt logging, persistence, or network calls.
const example = 'Build an endpoint to upload files';
const fixture = {
  id: 'upload-size', category: 'Resource limits', title: 'Maximum upload size',
  explanation: 'A server-side size limit can reduce resource consumption from oversized uploads.',
  requirement: 'Enforce a configurable maximum file size on the server and reject oversized uploads.'
};
const mockAdapter = {
  async analyze(prompt) {
    const supported = prompt.trim().replace(/[.!?]$/, '').toLowerCase() === example.toLowerCase();
    return {
      mode: 'mock', supported,
      message: supported
        ? 'Hand-written example analysis, not the research predictor. Potential concerns are not confirmed vulnerabilities.'
        : 'No demo analysis for this prompt. Try the file-upload example. This does not mean your prompt is secure.',
      suggestions: supported ? [{ ...fixture }] : []
    };
  }
};
function validateResult(result) {
  if (!result || result.mode !== 'mock' || typeof result.supported !== 'boolean' || typeof result.message !== 'string' || !Array.isArray(result.suggestions)) throw new Error('Invalid analyzer response');
  const ids = new Set();
  for (const item of result.suggestions) {
    if (!item || !['id','category','title','explanation','requirement'].every(key => typeof item[key] === 'string' && item[key].trim()) || ids.has(item.id)) throw new Error('Invalid suggestion');
    ids.add(item.id);
  }
  if (!result.supported && result.suggestions.length) throw new Error('Unsupported analysis has suggestions');
  return result;
}
function createAnalyzer(adapter, timeoutMs = 3000) {
  return async prompt => {
    if (typeof prompt !== 'string' || !prompt.trim()) throw new Error('A nonblank prompt is required');
    let timer;
    try {
      return validateResult(await Promise.race([
        Promise.resolve().then(() => adapter.analyze(prompt)),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Analysis timed out')), timeoutMs); })
      ]));
    } finally { clearTimeout(timer); }
  };
}
// Connect Chaoran's local adapter here. Both integrations already await it.
// A future backend must explicitly define provenance and prompt privacy behavior.
const analyzePrompt = createAnalyzer(mockAdapter);
module.exports = { analyzePrompt, createAnalyzer, validateResult, example };
