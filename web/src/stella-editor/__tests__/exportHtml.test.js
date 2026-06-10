import { describe, expect, it } from 'vitest';
import { createHeadingBlock, exportHtml } from '../core';

describe('exportHtml', () => {
  it('exports paragraphs and headings', () => {
    expect(exportHtml({ content: [createHeadingBlock({ level: 1, text: 'Title' })] })).toContain('<h1>Title</h1>');
  });

  it('exports links with safe hrefs', () => {
    const html = exportHtml({ content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Link', marks: [{ type: 'link', attrs: { kind: 'external_url', href: 'https://example.com' } }] }] }] });
    expect(html).toContain('https://example.com');
  });

  it('does not export script tags', () => {
    expect(exportHtml({ content: [{ type: 'paragraph', content: [{ type: 'text', text: '<script>', marks: [] }] }] })).not.toContain('<script>');
  });
});
