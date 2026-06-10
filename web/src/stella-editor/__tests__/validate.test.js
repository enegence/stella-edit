import { describe, expect, it } from 'vitest';
import { createEmptyDocument, validateDocument } from '../core';

describe('validateDocument', () => {
  it('returns no errors for a normalized empty document', () => {
    expect(validateDocument(createEmptyDocument()).valid).toBe(true);
  });

  it('returns errors for invalid root type', () => {
    expect(validateDocument({ type: 'page', version: 1, content: [] }).errors.length).toBeGreaterThan(0);
  });

  it('returns warnings for unsupported blocks', () => {
    const result = validateDocument({ type: 'doc', version: 1, content: [{ type: 'legacy' }] });
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('returns errors for unsafe external links', () => {
    const result = validateDocument({ type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'x', marks: [{ type: 'link', attrs: { kind: 'external_url', href: 'javascript:bad' } }] }] }] });
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
