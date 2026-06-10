import { describe, expect, it } from 'vitest';
import { createHeadingBlock, createMediaBlock, createTableBlock, extractText } from '../core';

describe('extractText', () => {
  it('extracts readable text from standard blocks', () => {
    expect(extractText({ content: [createHeadingBlock({ text: 'Title' })] })).toContain('Title');
  });

  it('includes media alt text and captions', () => {
    expect(extractText({ content: [createMediaBlock({ alt: 'Diagram', caption: 'Flow' })] })).toContain('Diagram Flow');
  });

  it('includes table cell text', () => {
    const table = createTableBlock({ rows: 1, cols: 1 });
    table.content[0].content[0].content[0].content = [{ type: 'text', text: 'Cell', marks: [] }];
    expect(extractText({ content: [table] })).toContain('Cell');
  });

  it('does not include unsupported raw JSON', () => {
    expect(extractText({ content: [{ type: 'legacy', attrs: { secret: 'no' } }] })).not.toContain('secret');
  });
});
