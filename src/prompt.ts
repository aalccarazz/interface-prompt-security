import type { Suggestion } from './analysis';
export type Decision = 'pending' | 'accepted' | 'dismissed';
export type ReviewedSuggestion = Suggestion & { decision: Decision };
export function assemblePrompt(original: string, current: string, suggestions: ReviewedSuggestion[], invalidated = false): string | null {
  if (invalidated || original !== current) return null;
  const accepted = suggestions.filter(s => s.decision === 'accepted' && s.requirement.trim());
  return original + (accepted.length ? '\n\nAdditional security requirements\n' + accepted.map(s => `- ${s.requirement.trim()}`).join('\n') : '');
}
