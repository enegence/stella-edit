import { normalizeDocument } from './normalize';
import { createHeadingBlock, createParagraphBlock, createPanelBlock, createTableBlock } from './document';
import { cloneBlockWithNewIds, cloneDoc, findBlockIndex } from './transforms';

function result(doc, reason, changed = true, error = null) {
  return { doc: normalizeDocument(doc), selection: null, meta: { reason, changed, error } };
}

function textBlock(doc, blockId) {
  return doc.content.find((block) => block.id === blockId);
}

export function applyCommand(inputDoc, selection, command) {
  const doc = cloneDoc(normalizeDocument(inputDoc));
  const index = command.blockId ? findBlockIndex(doc, command.blockId) : -1;

  switch (command.type) {
    case 'toggle_mark': {
      const block = textBlock(doc, command.blockId);
      if (!block?.content?.[0] || block.content[0].type !== 'text') return result(doc, command.type, false, 'No text block');
      const text = block.content[0];
      const markIndex = text.marks.findIndex((mark) => mark.type === command.mark);
      if (markIndex >= 0) text.marks.splice(markIndex, 1);
      else text.marks.push({ type: command.mark, attrs: command.attrs || {} });
      return result(doc, command.type);
    }
    case 'set_block_type': {
      if (index < 0) return result(doc, command.type, false, 'Block not found');
      const current = doc.content[index];
      if (command.blockType === 'heading') {
        doc.content[index] = { ...createHeadingBlock({ level: command.attrs?.level || 1 }), id: current.id, content: current.content };
      } else if (command.blockType === 'paragraph') {
        doc.content[index] = { ...createParagraphBlock(current.content), id: current.id };
      }
      return result(doc, command.type);
    }
    case 'insert_block_after': {
      if (index < 0) return result(doc, command.type, false, 'Block not found');
      doc.content.splice(index + 1, 0, command.block || createParagraphBlock());
      return result(doc, command.type);
    }
    case 'insert_panel_after': {
      if (index < 0) return result(doc, command.type, false, 'Block not found');
      doc.content.splice(index + 1, 0, createPanelBlock(command.attrs || {}));
      return result(doc, command.type);
    }
    case 'delete_block': {
      if (index >= 0) doc.content.splice(index, 1);
      return result(doc, command.type);
    }
    case 'move_block_up': {
      if (index > 0) [doc.content[index - 1], doc.content[index]] = [doc.content[index], doc.content[index - 1]];
      return result(doc, command.type, index > 0);
    }
    case 'move_block_down': {
      if (index >= 0 && index < doc.content.length - 1) [doc.content[index + 1], doc.content[index]] = [doc.content[index], doc.content[index + 1]];
      return result(doc, command.type, index >= 0 && index < doc.content.length - 1);
    }
    case 'duplicate_block': {
      if (index < 0) return result(doc, command.type, false, 'Block not found');
      doc.content.splice(index + 1, 0, cloneBlockWithNewIds(doc.content[index]));
      return result(doc, command.type);
    }
    case 'insert_table_after': {
      const insertAt = index >= 0 ? index + 1 : doc.content.length;
      doc.content.splice(insertAt, 0, createTableBlock(command.attrs || {}));
      return result(doc, command.type);
    }
    case 'add_table_row':
    case 'remove_table_row':
    case 'add_table_column':
    case 'remove_table_column':
      return tableCommand(doc, command);
    default:
      return result(doc, command.type || 'unknown', false, 'Unknown command');
  }
}

function tableCommand(doc, command) {
  const table = doc.content.find((block) => block.id === command.tableId && block.type === 'table');
  if (!table) return result(doc, command.type, false, 'Table not found');
  const cols = table.content[0]?.content?.length || 1;
  const rowFactory = () => createTableBlock({ rows: 1, cols }).content[0];
  if (command.type === 'add_table_row') table.content.splice((command.rowIndex ?? table.content.length - 1) + 1, 0, rowFactory());
  if (command.type === 'remove_table_row' && table.content.length > 1) table.content.splice(command.rowIndex ?? table.content.length - 1, 1);
  if (command.type === 'add_table_column') {
    table.content.forEach((row) => row.content.splice((command.colIndex ?? cols - 1) + 1, 0, createTableBlock({ rows: 1, cols: 1 }).content[0].content[0]));
    table.attrs.columnWidths = Array.isArray(table.attrs.columnWidths) ? table.attrs.columnWidths : Array.from({ length: cols }, () => null);
    table.attrs.columnWidths.splice((command.colIndex ?? cols - 1) + 1, 0, null);
  }
  if (command.type === 'remove_table_column' && cols > 1) {
    table.content.forEach((row) => row.content.splice(command.colIndex ?? cols - 1, 1));
    if (Array.isArray(table.attrs.columnWidths)) table.attrs.columnWidths.splice(command.colIndex ?? cols - 1, 1);
  }
  return result(doc, command.type);
}
