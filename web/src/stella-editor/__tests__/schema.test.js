import { describe, expect, it } from 'vitest';
import { createEmptyDocument } from '../core';

describe('schema', () => {
  it('creates a valid empty StellaDoc', () => {
    const doc = createEmptyDocument();
    expect(doc.version).toBe(1);
    expect(doc.type).toBe('doc');
    expect(Array.isArray(doc.content)).toBe(true);
    expect(doc.content).toHaveLength(1);
    expect(doc.content[0].type).toBe('paragraph');
    expect(typeof doc.content[0].id).toBe('string');
  });
});
