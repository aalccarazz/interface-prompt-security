// Shared pure logic; also loaded as a CSP-authorized webview script.
(function (root) {
  function assemblePrompt(original, current, suggestions, outdated = false) {
    if (outdated || original !== current) return null;
    const accepted = suggestions.filter(s => s.decision === 'accepted' && s.requirement.trim());
    return original + (accepted.length ? '\n\nAdditional security requirements\n' + accepted.map(s => '- ' + s.requirement.trim()).join('\n') : '');
  }
  const api = { assemblePrompt };
  if (typeof module !== 'undefined') module.exports = api;
  else root.SecNudgeRevision = api;
})(globalThis);
