import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assemblePrompt, type ReviewedSuggestion } from './prompt';
import { mockAdapter } from './analysis';
const suggestion = (decision: ReviewedSuggestion['decision'], requirement: string): ReviewedSuggestion => ({ id: requirement, category: 'Test', title: 'Test', explanation: 'Test', requirement, decision });
test('includes only accepted requirements and preserves original text', () => {
  assert.equal(assemblePrompt(' original\n', ' original\n', [suggestion('pending', 'pending'), suggestion('accepted', 'edited text'), suggestion('dismissed', 'dismissed')]), ' original\n\n\nAdditional security requirements\n- edited text');
});
test('unchanged without accepted requirements', () => assert.equal(assemblePrompt('prompt', 'prompt', [suggestion('pending', 'text')]), 'prompt'));
test('outdated results cannot be assembled for copy', () => assert.equal(assemblePrompt('old', 'new', [suggestion('accepted', 'text')]), null));
test('empty edited requirements are excluded', () => assert.equal(assemblePrompt('prompt', 'prompt', [suggestion('accepted', '  ')]), 'prompt'));
test('mock categories are deterministic and unsupported requests make no security claim', async () => {
  for (const prompt of ['file upload endpoint', 'user login endpoint', 'database search endpoint']) {
    const result = await mockAdapter.analyze(prompt);
    assert.equal(result.suggestions.length, 3);
    assert.equal(result.mode, 'mock');
  }
  const unsupported = await mockAdapter.analyze('Build a weather widget');
  assert.equal(unsupported.supported, false);
  assert.deepEqual(unsupported.suggestions, []);
});

test('editing and restoring input still requires review', () => assert.equal(assemblePrompt('same', 'same', [suggestion('accepted', 'text')], true), null));
