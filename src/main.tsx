import React, { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { analyzePrompt, examples } from './analysis';
import { assemblePrompt, type ReviewedSuggestion, type Decision } from './prompt';
import './style.css';
function App() {
  const [prompt, setPrompt] = useState('');
  const [original, setOriginal] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<ReviewedSuggestion[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [invalidated, setInvalidated] = useState(false);
  const [error, setError] = useState('');
  const [copyStatus, setCopyStatus] = useState('');
  const generation = useRef(0);
  const stale = original !== null && (invalidated || original !== prompt);
  const accepted = suggestions.filter(s => s.decision === 'accepted' && s.requirement.trim()).length;
  const preview = original === null ? null : assemblePrompt(original, prompt, suggestions, invalidated);
  function changePrompt(value: string) { generation.current++; if (original !== null) setInvalidated(true); setPrompt(value); setLoading(false); setCopyStatus(''); setError(''); }
  async function review() {
    const request = ++generation.current;
    const submitted = prompt;
    setLoading(true); setError(''); setCopyStatus(''); setSuggestions([]); setOriginal(null); setMessage('');
    try {
      const result = await analyzePrompt(submitted);
      if (request !== generation.current) return;
      setInvalidated(false); setOriginal(submitted); setMessage(result.message); setSuggestions(result.suggestions.map(s => ({ ...s, decision: 'pending' })));
    } catch { if (request === generation.current) setError('Review could not be completed. Your prompt is still here. Please try again.'); }
    finally { if (request === generation.current) setLoading(false); }
  }
  function update(id: string, patch: { decision?: Decision; requirement?: string }) { setSuggestions(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s)); setCopyStatus(''); }
  async function copy() {
    if (preview === null || stale) return;
    const request = generation.current;
    try { await navigator.clipboard.writeText(preview); if (request === generation.current) setCopyStatus('Copied to clipboard.'); }
    catch { if (request === generation.current) setCopyStatus('Copy failed. Select the preview text and copy it manually.'); }
  }
  return <div className="shell">
    <header><a className="brand" href="#"><span className="brand-icon" aria-hidden="true">S</span>SecNudge<span className="research">RESEARCH PROTOTYPE</span></a><span className="demo"><span aria-hidden="true">●</span> Demo mode — model not connected</span></header>
    <main><div className="intro"><div className="eyebrow">A MOMENT FOR SECURITY</div><h1>Better requirements.<br/><span>Before the first line of code.</span></h1><p>Review missing security requirements before generating code.</p></div>
    <div className="workflow" aria-label="Workflow"><span><b>1</b> Write a prompt</span><i aria-hidden="true">→</i><span><b>2</b> Review potential concerns</span><i aria-hidden="true">→</i><span><b>3</b> Copy your revision</span></div>
    <div className="workspace"><div className="left"><section className="panel editor" aria-labelledby="editor-title"><div className="section-heading"><span className="step">01</span><div><h2 id="editor-title">Your coding prompt</h2><p>What would you like your coding assistant to build?</p></div></div>
    <label htmlFor="prompt">Prompt</label><textarea id="prompt" className="prompt-input" value={prompt} onChange={e => changePrompt(e.target.value)} placeholder="Describe a feature or endpoint you want to build…"/>
    <div className="examples"><span>Try an example</span>{examples.map(example => <button key={example.label} onClick={() => changePrompt(example.prompt)}>{example.label}<span aria-hidden="true"> ↗</span></button>)}</div>
    <div className="editor-bottom"><span>In memory only. Never sent or saved.</span><button className="primary" disabled={!prompt.trim() || loading} onClick={review}>{loading ? 'Reviewing…' : 'Review prompt'} <span aria-hidden="true">→</span></button></div>
    </section>
    <section className="suggestions" aria-labelledby="concerns-title" aria-busy={loading}><div className="section-heading"><span className="step">02</span><div><h2 id="concerns-title">Potential concerns {suggestions.length > 0 && <span className="count">{suggestions.length}</span>}</h2><p>Inferred from your request, not confirmed vulnerabilities in generated code.</p></div></div>
    <div aria-live="polite">{loading && <div className="notice">Reviewing the demo examples…</div>}{error && <div className="notice warning" role="alert">{error}</div>}{stale && <div className="notice warning">Results are outdated. Review the edited prompt again before making decisions or copying.</div>}{message && <p className="mock-note">{message}</p>}</div>
    {original === null && !loading && !error && <div className="empty"><span className="empty-icon" aria-hidden="true">⌁</span><h3>A little context goes a long way.</h3><p>Enter a prompt and review it to explore security requirements you may want to make explicit.</p><span>You decide what belongs in your prompt.</span></div>}
    {suggestions.map((s, index) => <article className={`suggestion ${s.decision}`} key={s.id}><div className="card-top"><span>{String(index + 1).padStart(2, '0')} / {s.category}</span><span className={`state ${s.decision}`}>{s.decision}</span></div><h3>{s.title}</h3><p>{s.explanation}</p><label htmlFor={s.id}>Proposed prompt addition · editable</label><textarea id={s.id} value={s.requirement} disabled={stale} onChange={e => update(s.id, { requirement: e.target.value })}/><div className="card-actions">{s.decision === 'pending' ? <><button className="accept" disabled={stale || !s.requirement.trim()} onClick={() => update(s.id, { decision: 'accepted' })}>✓ Accept requirement</button><button disabled={stale} onClick={() => update(s.id, { decision: 'dismissed' })}>Dismiss</button></> : <><span>{s.decision === 'accepted' ? 'Included in your revision' : 'Excluded from your revision'}</span><button disabled={stale} onClick={() => update(s.id, { decision: 'pending' })}>Undo decision</button></>}</div></article>)}
    </section></div>
    <aside className="panel preview" aria-labelledby="preview-title"><div className="section-heading"><span className="step">03</span><div><h2 id="preview-title">Revised prompt</h2><p>Your intent, with explicit requirements.</p></div></div><div className="preview-meta"><span className="live-dot"/> {accepted} accepted {accepted === 1 ? 'requirement' : 'requirements'}<span className="preview-label">PREVIEW</span></div>
    <div className="preview-body">{stale ? <p className="preview-empty">Your prompt has changed. Run another review to create an up-to-date revision.</p> : preview !== null ? <pre>{preview}</pre> : <div className="preview-empty"><span aria-hidden="true">≡</span><h3>Your revision will appear here.</h3><p>Review a prompt, then accept the requirements you want to include.</p></div>}</div>
    <div className="preview-footer"><p>{accepted === 0 ? 'Your prompt stays unchanged until you accept a requirement.' : 'Only accepted requirements are included. Review the text before using it.'}</p><button className="primary copy" disabled={preview === null || stale || loading} onClick={copy}>Copy revised prompt <span aria-hidden="true">⧉</span></button><div className="copy-status" role="status">{copyStatus}</div><span className="next-step">Then paste it into your preferred coding assistant.</span></div></aside></div>
    <footer><span>SecNudge <span aria-hidden="true">/</span> Research in progress</span><span>Suggestions support your judgment. They do not establish security effectiveness.</span></footer></main></div>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
