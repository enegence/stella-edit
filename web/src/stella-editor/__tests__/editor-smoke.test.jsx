import React, { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { StellaEditor } from '../react/StellaEditor';
import { createEmptyDocument } from '../core';

function StatefulEditor() {
  const [doc, setDoc] = useState(() => createEmptyDocument());
  return <StellaEditor value={doc} onChange={setDoc} />;
}

function bodyTextbox() {
  return screen.getByPlaceholderText('Start writing...');
}

function editContenteditable(element, value) {
  element.textContent = value;
  fireEvent.input(element);
}

describe('StellaEditor', () => {
  it('renders an editable empty document', () => {
    render(<StellaEditor value={createEmptyDocument()} onChange={() => {}} />);
    expect(bodyTextbox()).not.toHaveAttribute('readonly');
  });

  it('calls onChange when text is edited', () => {
    const onChange = vi.fn();
    render(<StellaEditor value={createEmptyDocument()} onChange={onChange} />);
    const textbox = bodyTextbox();
    fireEvent.change(textbox, { target: { value: 'Hello' } });
    expect(onChange).toHaveBeenCalled();
  });

  it('opens slash menu when slash is typed', () => {
    render(<StellaEditor value={createEmptyDocument()} onChange={() => {}} />);
    fireEvent.change(bodyTextbox(), { target: { value: '/' } });
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('opens an insert palette from the toolbar and inserts a table', () => {
    render(<StatefulEditor />);
    fireEvent.click(screen.getByRole('button', { name: 'Insert' }));
    const palette = screen.getByRole('listbox');
    expect(palette).toBeInTheDocument();
    fireEvent.click(within(palette).getByRole('button', { name: 'Table' }));
    expect(document.querySelector('table')).toBeInTheDocument();
  });

  it('edits inserted table cells and table dimensions', () => {
    render(<StatefulEditor />);
    fireEvent.click(screen.getByRole('button', { name: 'Table' }));
    const cell = screen.getByLabelText('Table cell 1-1');
    fireEvent.change(cell, { target: { value: 'Name' } });
    expect(cell).toHaveValue('Name');
    fireEvent.click(screen.getByRole('button', { name: 'Add row' }));
    expect(screen.getByLabelText('Table cell 4-1')).toBeInTheDocument();
  });

  it('edits inserted list items and task checks', () => {
    render(<StatefulEditor />);
    fireEvent.click(screen.getByRole('button', { name: 'Bullet list' }));
    const item = screen.getByLabelText('bullet list item 1');
    fireEvent.change(item, { target: { value: 'First item' } });
    expect(item).toHaveValue('First item');
  });

  it('edits inserted panel content', () => {
    render(<StatefulEditor />);
    fireEvent.click(screen.getByRole('button', { name: 'Panel' }));
    fireEvent.change(screen.getByLabelText('Panel title'), { target: { value: 'Note' } });
    fireEvent.change(screen.getByLabelText('Panel body'), { target: { value: 'Panel text' } });
    expect(screen.getByLabelText('Panel title')).toHaveValue('Note');
    expect(screen.getByLabelText('Panel body')).toHaveValue('Panel text');
  });

  it('sanitizes and inserts pasted HTML as blocks', () => {
    render(<StatefulEditor />);
    const editor = document.querySelector('.stella-editor');
    fireEvent.paste(editor, {
      clipboardData: {
        getData: (type) => (type === 'text/html' ? '<script>alert(1)</script><h2>Safe title</h2>' : 'Safe title')
      }
    });
    expect(screen.getByDisplayValue('Safe title')).toBeInTheDocument();
    expect(document.body.innerHTML).not.toContain('<script>');
  });

  it('converts markdown-like authoring shortcuts', () => {
    render(<StatefulEditor />);
    fireEvent.change(bodyTextbox(), { target: { value: '## ' } });
    expect(screen.getByLabelText('Block style')).toHaveValue('heading:2');
  });

  it('edits page topper metadata and toggles width', () => {
    render(<StatefulEditor />);
    fireEvent.change(screen.getByLabelText('Page emoji'), { target: { value: 'SV' } });
    fireEvent.change(screen.getByLabelText('Cover image URL'), { target: { value: 'https://example.com/cover.jpg' } });
    fireEvent.click(screen.getByRole('button', { name: 'Toggle page width' }));
    expect(screen.getByLabelText('Page emoji')).toHaveValue('SV');
    expect(screen.getByLabelText('Cover image URL')).toHaveValue('https://example.com/cover.jpg');
    expect(document.querySelector('.stella-editor')).toHaveClass('se-page-full');
  });

  it('clears formatting from selected text', () => {
    render(<StatefulEditor />);
    const textbox = bodyTextbox();
    fireEvent.change(textbox, { target: { value: 'Marked' } });
    textbox.setSelectionRange(0, 6);
    fireEvent.select(textbox);
    fireEvent.click(screen.getByRole('button', { name: 'Bold' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear formatting' }));
    expect(textbox).toHaveValue('Marked');
  });

  it('shows adapter link suggestions', async () => {
    const adapters = {
      links: {
        searchLinkTargets: () => [{ type: 'document', id: 'doc_1', label: 'Policy' }]
      },
      scope: {
        canResolveReference: () => ({ allowed: true }),
        isReferenceVisible: () => true
      },
      permissions: {
        canLinkToTarget: () => ({ allowed: true })
      }
    };
    render(<StellaEditor value={createEmptyDocument()} onChange={() => {}} adapters={adapters} />);
    fireEvent.click(screen.getByRole('button', { name: 'Link' }));
    expect(await screen.findByRole('option', { name: 'Policy' })).toBeInTheDocument();
  });

  function linkAdapters(suggestions) {
    return {
      links: { searchLinkTargets: () => suggestions },
      scope: {
        canResolveReference: () => ({ allowed: true }),
        isReferenceVisible: () => true
      },
      permissions: { canLinkToTarget: () => ({ allowed: true }) }
    };
  }

  function LinkingEditor({ adapters, onDoc }) {
    const [doc, setDoc] = useState(() => createEmptyDocument());
    return <StellaEditor value={doc} onChange={(next) => { setDoc(next); onDoc(next); }} adapters={adapters} />;
  }

  function linkMarks(doc) {
    const marks = [];
    const visit = (node) => {
      for (const mark of node?.marks || []) if (mark.type === 'link') marks.push(mark);
      for (const child of node?.content || []) visit(child);
    };
    visit(doc);
    return marks;
  }

  function selectWord(value) {
    const textbox = bodyTextbox();
    fireEvent.change(textbox, { target: { value } });
    textbox.setSelectionRange(0, value.length);
    fireEvent.select(textbox);
  }

  it('groups link suggestions under their headings', async () => {
    render(<StellaEditor value={createEmptyDocument()} onChange={() => {}} adapters={linkAdapters([
      { reference: { type: 'card', packId: 'p1', itemKey: 'c1' }, label: 'Paris', group: 'Cards', description: 'World Capitals' },
      { type: 'document', id: 'doc_1', label: 'Policy', group: 'Pages' },
      { reference: { type: 'card', packId: 'p1', itemKey: 'c2' }, label: 'Rome', group: 'Cards' }
    ])} />);
    fireEvent.click(screen.getByRole('button', { name: 'Link' }));
    const cards = await screen.findByRole('group', { name: 'Cards' });
    expect(within(cards).getAllByRole('option').map((option) => option.textContent)).toEqual(['ParisWorld Capitals', 'Rome']);
    expect(within(screen.getByRole('group', { name: 'Pages' })).getByRole('option', { name: 'Policy' })).toBeInTheDocument();
  });

  it('passes a picked typed reference through to the link mark', async () => {
    const onDoc = vi.fn();
    const reference = { type: 'card', packId: 'p1', itemKey: 'c1' };
    render(<LinkingEditor onDoc={onDoc} adapters={linkAdapters([{ reference, label: 'Paris' }])} />);
    selectWord('Paris');
    fireEvent.click(screen.getAllByRole('button', { name: 'Link' })[0]);
    fireEvent.click(await screen.findByRole('option', { name: 'Paris' }));
    const [mark] = linkMarks(onDoc.mock.calls.at(-1)[0]);
    expect(mark.attrs).toMatchObject({ kind: 'reference', reference, href: null, label: 'Paris' });
  });

  it('picks the highlighted suggestion with arrow keys and Enter', async () => {
    const onDoc = vi.fn();
    render(<LinkingEditor onDoc={onDoc} adapters={linkAdapters([
      { type: 'document', id: 'doc_1', label: 'Policy' },
      { reference: { type: 'document', id: 'doc_2' }, label: 'Handbook' }
    ])} />);
    selectWord('Rules');
    fireEvent.click(screen.getAllByRole('button', { name: 'Link' })[0]);
    await screen.findByRole('option', { name: 'Handbook' });
    const input = screen.getByLabelText('Link URL');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getByRole('option', { name: 'Handbook' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(input, { key: 'Enter' });
    const [mark] = linkMarks(onDoc.mock.calls.at(-1)[0]);
    expect(mark.attrs).toMatchObject({ kind: 'document', reference: { type: 'document', id: 'doc_2' } });
  });

  it('refuses a typed reference the permission adapter denies', async () => {
    const onPermissionDenied = vi.fn();
    const adapters = linkAdapters([{ reference: { type: 'card', packId: 'p1', itemKey: 'c1' }, label: 'Paris' }]);
    adapters.permissions.canLinkToTarget = () => ({ allowed: false, reason: 'Nope' });
    render(<StellaEditor value={createEmptyDocument()} onChange={() => {}} adapters={adapters} onPermissionDenied={onPermissionDenied} />);
    fireEvent.click(screen.getByRole('button', { name: 'Link' }));
    fireEvent.click(await screen.findByRole('option', { name: 'Paris' }));
    expect(onPermissionDenied).toHaveBeenCalledWith({ action: 'insert_internal_link', reason: 'Nope' });
  });

  it('uses visual table add controls', () => {
    render(<StatefulEditor />);
    fireEvent.click(screen.getByRole('button', { name: 'Table' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add table row visually' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add table column visually' }));
    expect(screen.getByLabelText('Table cell 4-4')).toBeInTheDocument();
  });

  it('exposes toolbar undo and redo', () => {
    render(<StatefulEditor />);
    fireEvent.change(bodyTextbox(), { target: { value: 'Undo me' } });
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(bodyTextbox()).toHaveValue('');
    fireEvent.click(screen.getByRole('button', { name: 'Redo' }));
    expect(bodyTextbox()).toHaveValue('Undo me');
  });

  it('creates a focused block on Enter', () => {
    render(<StatefulEditor />);
    const textbox = bodyTextbox();
    fireEvent.change(textbox, { target: { value: 'Hello' } });
    textbox.setSelectionRange(5, 5);
    fireEvent.keyDown(textbox, { key: 'Enter' });
    expect(screen.getAllByPlaceholderText('')).toHaveLength(1);
    expect(screen.getAllByRole('textbox').length).toBeGreaterThanOrEqual(3);
  });

  it('merges with the previous block on Backspace at the start', async () => {
    render(<StatefulEditor />);
    const first = bodyTextbox();
    editContenteditable(first, 'Hello');
    await waitFor(() => expect(first).toHaveValue('Hello'));
    first.setSelectionRange(5, 5);
    fireEvent.keyDown(first, { key: 'Enter' });
    const second = screen.getAllByPlaceholderText('')[0];
    editContenteditable(second, ' world');
    await waitFor(() => expect(second).toHaveValue(' world'));
    second.setSelectionRange(0, 0);
    fireEvent.keyDown(second, { key: 'Backspace' });
    expect(screen.queryAllByPlaceholderText('')).toHaveLength(0);
    expect(bodyTextbox()).toHaveValue('Hello world');
  });

  it('respects readOnly mode', () => {
    render(<StellaEditor value={createEmptyDocument()} onChange={() => {}} readOnly />);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('moves a block up from the block options menu', () => {
    render(<StatefulEditor />);
    const first = bodyTextbox();
    fireEvent.change(first, { target: { value: 'First' } });
    first.setSelectionRange(5, 5);
    fireEvent.keyDown(first, { key: 'Enter' });
    const second = screen.getAllByRole('textbox', { name: '' }).find((node) => node.classList.contains('se-block-input') && node !== first);
    editContenteditable(second, 'Second');
    const optionButtons = screen.getAllByRole('button', { name: 'Block options' });
    fireEvent.click(optionButtons[optionButtons.length - 1]);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Move up' }));
    const inputs = document.querySelectorAll('.se-block-input');
    expect(inputs[0].textContent).toBe('Second');
    expect(inputs[1].textContent).toBe('First');
  });

  it('exits a list when Enter is pressed on an empty item', () => {
    render(<StatefulEditor />);
    fireEvent.click(screen.getByRole('button', { name: 'Bullet list' }));
    const item = screen.getByLabelText('bullet list item 1');
    fireEvent.keyDown(item, { key: 'Enter' });
    expect(screen.queryByLabelText('bullet list item 1')).not.toBeInTheDocument();
  });

  it('filters slash commands by description text', () => {
    render(<StatefulEditor />);
    fireEvent.change(bodyTextbox(), { target: { value: '/checkboxes' } });
    const palette = screen.getByRole('listbox');
    expect(within(palette).getByRole('button', { name: 'Task list' })).toBeInTheDocument();
  });
});
