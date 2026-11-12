const { readFileSync } = require('node:fs');
const { analyzePrompt } = require('./analyzer.cjs');
async function evaluateHook(input, analyze = analyzePrompt) {
  if (!input || typeof input.prompt !== 'string' || !input.prompt.trim()) throw new Error('Invalid hook input');
  const result = await analyze(input.prompt);
  if (!result.supported || result.suggestions.length === 0) return null;
  return {
    decision: 'block',
    reason: 'SecNudge demo — model not connected. This exact example matches a hand-written fixture, not a security prediction.\n' +
      result.suggestions.map(s => `${s.title}: ${s.explanation}\nSuggested addition: ${s.requirement}`).join('\n\n') +
      '\nRevise and resubmit manually, or disable this demo hook. Other prompts are not evaluated by this fixture.'
  };
}
async function main() {
  try {
    const decision = await evaluateHook(JSON.parse(readFileSync(0, 'utf8')));
    if (decision) process.stdout.write(JSON.stringify(decision));
  } catch {
    // Fail open. Never write raw inputs, adapter errors, or credentials to logs.
    process.stderr.write('SecNudge demo could not complete its check; submission was not blocked. No security conclusion is available.\n');
    process.exitCode = 1;
  }
}
if (require.main === module) main();
module.exports = { evaluateHook };
