import { describe, expect, it } from 'vitest';
import { normalizeDocument } from '../core';

describe('normalizeDocument', () => {
  it('adds an empty paragraph to an empty doc', () => {
    expect(normalizeDocument({ type: 'doc', version: 1, content: [] }).content[0].type).toBe('paragraph');
  });

  it('adds missing block ids', () => {
    expect(normalizeDocument({ content: [{ type: 'paragraph', content: [] }] }).content[0].id).toBeTruthy();
  });

  it('wraps invalid root content safely', () => {
    expect(normalizeDocument({ content: 'bad' }).content[0].type).toBe('paragraph');
  });

  it('converts unknown blocks to unsupported blocks', () => {
    expect(normalizeDocument({ content: [{ type: 'legacy_widget', attrs: { x: 1 } }] }).content[0].type).toBe('unsupported');
  });

  it('ensures panel has at least one paragraph', () => {
    const panel = normalizeDocument({ content: [{ type: 'panel', content: [] }] }).content[0];
    expect(panel.content[0].type).toBe('paragraph');
  });

  it('ensures expand has at least one paragraph', () => {
    const expand = normalizeDocument({ content: [{ type: 'expand', content: [] }] }).content[0];
    expect(expand.content[0].type).toBe('paragraph');
  });

  it('ensures table has at least one row and cell', () => {
    const table = normalizeDocument({ content: [{ type: 'table', content: [] }] }).content[0];
    expect(table.content[0].type).toBe('table_row');
    expect(table.content[0].content[0].type).toBe('table_cell');
  });

  it('strips unknown marks', () => {
    const doc = normalizeDocument({ content: [{ type: 'paragraph', content: [{ type: 'text', text: 'x', marks: [{ type: 'blink' }] }] }] });
    expect(doc.content[0].content[0].marks).toHaveLength(0);
  });

  it('strips unsafe link hrefs', () => {
    const doc = normalizeDocument({ content: [{ type: 'paragraph', content: [{ type: 'text', text: 'x', marks: [{ type: 'link', attrs: { kind: 'external_url', href: 'javascript:alert(1)' } }] }] }] });
    expect(doc.content[0].content[0].marks).toHaveLength(0);
  });
});
