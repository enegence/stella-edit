import { describe, expect, it } from 'vitest';
import { applyCommand, createEmptyDocument, createPanelBlock, createTableBlock, createText } from '../core';

describe('commands', () => {
  it('toggles bold mark on selected text', () => {
    const doc = createEmptyDocument();
    doc.content[0].content = [createText('Hello')];
    const result = applyCommand(doc, null, { type: 'toggle_mark', blockId: doc.content[0].id, mark: 'bold' });
    expect(result.doc.content[0].content[0].marks[0].type).toBe('bold');
  });

  it('sets paragraph block to heading level 2', () => {
    const doc = createEmptyDocument();
    const result = applyCommand(doc, null, { type: 'set_block_type', blockId: doc.content[0].id, blockType: 'heading', attrs: { level: 2 } });
    expect(result.doc.content[0].type).toBe('heading');
    expect(result.doc.content[0].attrs.level).toBe(2);
  });

  it('inserts a panel after the current block', () => {
    const doc = createEmptyDocument();
    const result = applyCommand(doc, null, { type: 'insert_block_after', blockId: doc.content[0].id, block: createPanelBlock() });
    expect(result.doc.content[1].type).toBe('panel');
  });

  it('deletes a block but leaves at least one paragraph', () => {
    const doc = createEmptyDocument();
    const result = applyCommand(doc, null, { type: 'delete_block', blockId: doc.content[0].id });
    expect(result.doc.content[0].type).toBe('paragraph');
  });

  it('moves and duplicates root blocks', () => {
    const doc = createEmptyDocument();
    const second = createPanelBlock();
    doc.content.push(second);
    expect(applyCommand(doc, null, { type: 'move_block_up', blockId: second.id }).doc.content[0].id).toBe(second.id);
    expect(applyCommand(doc, null, { type: 'move_block_down', blockId: doc.content[0].id }).doc.content[1].id).toBe(doc.content[0].id);
    const duplicated = applyCommand(doc, null, { type: 'duplicate_block', blockId: second.id }).doc;
    expect(duplicated.content).toHaveLength(3);
    expect(duplicated.content[2].id).not.toBe(second.id);
  });

  it('inserts and edits table dimensions', () => {
    const doc = createEmptyDocument();
    const inserted = applyCommand(doc, null, { type: 'insert_table_after', blockId: doc.content[0].id, attrs: { rows: 3, cols: 3 } }).doc;
    const table = inserted.content[1];
    expect(table.content).toHaveLength(3);
    const addRow = applyCommand(inserted, null, { type: 'add_table_row', tableId: table.id, rowIndex: 0 }).doc.content[1];
    expect(addRow.content).toHaveLength(4);
    const addCol = applyCommand({ ...inserted, content: [createTableBlock({ rows: 2, cols: 2 })] }, null, { type: 'add_table_column', tableId: inserted.content[1].id, colIndex: 0 });
    expect(addCol.meta.changed).toBe(false);
  });
});
