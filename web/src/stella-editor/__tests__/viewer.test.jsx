import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StellaViewer } from '../react/StellaViewer';
import { createCodeBlock, createHeadingBlock, createPanelBlock, createTableBlock } from '../core';

describe('StellaViewer', () => {
  it('renders paragraph and heading text', () => {
    render(<StellaViewer value={{ content: [createHeadingBlock({ text: 'Title' })] }} />);
    expect(screen.getByText('Title')).toBeInTheDocument();
  });

  it('renders panels with variant class names', () => {
    render(<StellaViewer value={{ content: [createPanelBlock({ variant: 'warning' })] }} />);
    expect(document.querySelector('.se-panel-warning')).toBeInTheDocument();
  });

  it('renders code blocks without executing content', () => {
    render(<StellaViewer value={{ content: [createCodeBlock({ text: '<script>alert(1)</script>' })] }} />);
    expect(screen.getByText('<script>alert(1)</script>')).toBeInTheDocument();
  });

  it('renders table cells', () => {
    const table = createTableBlock({ rows: 1, cols: 1 });
    table.content[0].content[0].content[0].content = [{ type: 'text', text: 'Cell', marks: [] }];
    render(<StellaViewer value={{ content: [table] }} />);
    expect(screen.getByText('Cell')).toBeInTheDocument();
  });

  it('renders unsupported blocks safely', () => {
    render(<StellaViewer value={{ content: [{ type: 'legacy_widget' }] }} />);
    expect(screen.getByText(/Unsupported block/)).toBeInTheDocument();
  });
});
