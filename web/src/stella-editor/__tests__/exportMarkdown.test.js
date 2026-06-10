import { describe, expect, it } from 'vitest';
import { createCodeBlock, createHeadingBlock, createPanelBlock, createTableBlock, exportMarkdown } from '../core';

describe('exportMarkdown', () => {
  it('exports headings as markdown headings', () => {
    expect(exportMarkdown({ content: [createHeadingBlock({ level: 2, text: 'Title' })] })).toContain('## Title');
  });

  it('exports code blocks as fenced code', () => {
    expect(exportMarkdown({ content: [createCodeBlock({ language: 'js', text: 'x' })] })).toContain('```js');
  });

  it('exports simple tables', () => {
    expect(exportMarkdown({ content: [createTableBlock({ rows: 1, cols: 2 })] })).toContain('|');
  });

  it('exports panels with safe fallback syntax', () => {
    expect(exportMarkdown({ content: [createPanelBlock({ variant: 'info' })] })).toContain('[!INFO]');
  });
});
