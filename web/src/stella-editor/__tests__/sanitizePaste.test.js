import { describe, expect, it } from 'vitest';
import { exportHtml, sanitizePaste } from '../core';

describe('sanitizePaste', () => {
  it('removes script tags from pasted HTML', () => {
    const doc = sanitizePaste({ html: '<script>alert(1)</script><p>Hello</p>' });
    expect(exportHtml(doc)).toContain('Hello');
    expect(exportHtml(doc)).not.toContain('script');
  });

  it('removes event handler attributes', () => {
    expect(exportHtml(sanitizePaste({ html: '<img src="x" onerror="alert(1)"><p>Safe</p>' }))).not.toContain('onerror');
  });

  it('removes javascript hrefs', () => {
    expect(exportHtml(sanitizePaste({ html: '<a href="javascript:alert(1)">Bad</a>' }))).not.toContain('javascript');
  });

  it('preserves safe paragraphs and headings', () => {
    const doc = sanitizePaste({ html: '<h2>Title</h2><p>Hello</p>' });
    expect(doc.content.map((block) => block.type)).toEqual(['heading', 'paragraph']);
  });

  it('converts simple pasted tables into table blocks', () => {
    const doc = sanitizePaste({ html: '<table><tr><td>A</td><td>B</td></tr></table>' });
    expect(doc.content[0].type).toBe('table');
    expect(doc.content[0].content[0].content[1].content[0].content[0].text).toBe('B');
  });
});
