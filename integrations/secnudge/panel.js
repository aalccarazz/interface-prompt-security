/* global acquireVsCodeApi, SecNudgeRevision */
const vscode = acquireVsCodeApi();
const byId = id => document.getElementById(id);
const draft = byId('draft');
const status = byId('status');
let requestId = 0;
let copyId = 0;
let reviewedPrompt = null;
let suggestions = [];
let busy = false;
let outdated = false;
function revision() { return reviewedPrompt === null ? null : SecNudgeRevision.assemblePrompt(reviewedPrompt, draft.value, suggestions, outdated); }
function render() {
  const text = revision();
  byId('preview').value = text === null ? '' : text;
  const count = suggestions.filter(s => s.decision === 'accepted' && s.requirement.trim()).length;
  byId('accepted-count').textContent = `${count} accepted ${count === 1 ? 'requirement' : 'requirements'}`;
  byId('preview-help').textContent = outdated ? 'Your draft changed. Review again before copying.' : count ? 'Only accepted requirements are included.' : 'Your prompt stays unchanged until you accept a requirement.';
  byId('copy').disabled = text === null || busy;
  byId('review').disabled = !draft.value.trim() || busy;
  byId('review').textContent = busy ? 'Reviewing…' : 'Review prompt';
  byId('suggestions').setAttribute('aria-busy', String(busy));
}
function invalidate() {
  requestId++; copyId++; busy = false;
  outdated = reviewedPrompt !== null;
  status.textContent = 'Review the edited prompt to refresh suggestions.';
  byId('suggestions').replaceChildren();
  suggestions = []; render();
}
function cards() {
  const container = byId('suggestions'); container.replaceChildren();
  for (const suggestion of suggestions) {
    const card = document.createElement('article'); card.className = 'card';
    const category = document.createElement('p'); category.className = 'category'; category.textContent = suggestion.category;
    const title = document.createElement('h3'); title.textContent = suggestion.title;
    const explanation = document.createElement('p'); explanation.textContent = suggestion.explanation;
    const label = document.createElement('label'); label.textContent = 'Proposed requirement · editable';
    const field = document.createElement('textarea'); field.value = suggestion.requirement; field.rows = 4;
    // Nesting avoids using untrusted backend IDs as DOM IDs or selectors.
    label.append(field);
    const state = document.createElement('p'); state.className = 'decision'; state.setAttribute('aria-live','polite');
    const actions = document.createElement('div'); actions.className = 'actions';
    const accept = document.createElement('button'); accept.textContent = 'Accept requirement';
    const dismiss = document.createElement('button'); dismiss.textContent = 'Dismiss';
    const undo = document.createElement('button'); undo.textContent = 'Undo decision';
    const refresh = () => {
      state.textContent = suggestion.decision;
      accept.disabled = !suggestion.requirement.trim() || suggestion.decision === 'accepted';
      dismiss.disabled = suggestion.decision === 'dismissed'; undo.disabled = suggestion.decision === 'pending';
      render();
    };
    for (const [button, decision] of [[accept,'accepted'],[dismiss,'dismissed'],[undo,'pending']]) {
      button.onclick = () => { suggestion.decision = decision; copyId++; refresh(); };
    }
    field.addEventListener('input', () => { suggestion.requirement = field.value; copyId++; refresh(); });
    actions.append(accept,dismiss,undo); card.append(category,title,explanation,label,state,actions); container.append(card); refresh();
  }
}
draft.addEventListener('input', invalidate);
byId('example').onclick = () => { draft.value = 'Build an endpoint to upload files'; invalidate(); status.textContent = 'Example loaded. Select Review prompt to continue.'; draft.focus(); };
byId('review').onclick = () => {
  requestId++; copyId++; reviewedPrompt = null; suggestions = []; outdated = false; busy = true;
  byId('suggestions').replaceChildren(); status.textContent = 'Reviewing the mock example…'; render();
  vscode.postMessage({type:'review', id:requestId, prompt:draft.value});
};
byId('copy').onclick = () => {
  const text = revision(); if (text === null || busy) return;
  vscode.postMessage({type:'copy', id:++copyId, reviewId:requestId, text});
};
window.addEventListener('message', ({data}) => {
  if (!data || typeof data !== 'object') return;
  if (data.type === 'result' && data.id === requestId) {
    busy = false; reviewedPrompt = draft.value;
    suggestions = data.result.suggestions.map(s => ({...s,decision:'pending'}));
    status.textContent = data.result.message; cards(); render();
  }
  if (data.type === 'review-error' && data.id === requestId) {
    busy = false; status.textContent = 'Review could not be completed. Your draft is intact. Try again.'; render();
  }
  if (data.reviewId === requestId && data.id === copyId) {
    if (data.type === 'copied') status.textContent = 'Prompt copied. Paste it into your coding assistant.';
    if (data.type === 'copy-error') status.textContent = 'Could not copy. Select and copy the preview manually.';
  }
});
render();

for (const action of ['enable','check','disable']) {
  byId('claude-'+action).onclick = () => {
    byId('claude-status').textContent = 'Choose the project folder in VS Code to continue…';
    vscode.postMessage({type:'claude-action',action});
  };
}
window.addEventListener('message', ({data}) => {
  if (data?.type === 'claude-status' && typeof data.text === 'string') byId('claude-status').textContent=data.text;
});
