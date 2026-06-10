import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  applyCommand,
  createCodeBlock,
  createDividerBlock,
  createEmptyDocument,
  createExpandBlock,
  createHeadingBlock,
  createLayoutBlock,
  createListBlock,
  createMediaBlock,
  createPanelBlock,
  createParagraphBlock,
  createStatusBlock,
  createTableBlock,
  createText,
  isSafeUrl,
  normalizeDocument,
  sanitizePaste,
  validateDocument
} from '../core';
import { createId } from '../core/ids';
import { createDefaultAdapters } from '../adapters/defaultAdapters';
import { InlineToolbar } from './InlineToolbar';
import { LinkPopover } from './LinkPopover';
import { getAllowedCommands, SlashMenu } from './SlashMenu';
import { EditableCanvas } from './EditableCanvas';
import { StellaViewer } from './StellaViewer';
import { FormattingToolbar } from './FormattingToolbar';
import '../styles/stella-editor.css';

function createBlockFromCommand(command) {
  if (command.type === 'heading') return createHeadingBlock(command.attrs);
  if (command.type === 'panel') return createPanelBlock(command.attrs);
  if (command.type === 'code_block') return createCodeBlock();
  if (command.type === 'divider') return createDividerBlock();
  if (command.type === 'expand') return createExpandBlock();
  if (command.type === 'status') return createStatusBlock(command.attrs);
  if (command.type === 'layout') return createLayoutBlock(command.attrs);
  if (command.type === 'table') return createTableBlock();
  if (command.type === 'media') return createMediaBlock();
  if (['bullet_list', 'ordered_list', 'task_list'].includes(command.type)) return createListBlock(command.type);
  if (command.type === 'blockquote') return { id: createParagraphBlock().id, type: 'blockquote', attrs: {}, content: [] };
  return createParagraphBlock();
}

function getBlockText(block) {
  return block?.content?.filter((node) => node.type === 'text').map((node) => node.text).join('') || '';
}

function canEditText(block) {
  return ['paragraph', 'heading', 'blockquote', 'code_block'].includes(block?.type);
}

function setBlockText(block, text, content = null) {
  block.content = Array.isArray(content) ? content : text ? [createText(text)] : [];
}

function ensureParagraphText(container, text) {
  if (!container.content?.length) {
    container.content = [createParagraphBlock()];
  }
  const paragraph = container.content.find((child) => child.type === 'paragraph') || container.content[0];
  paragraph.type = 'paragraph';
  paragraph.attrs = paragraph.attrs || {};
  setBlockText(paragraph, text);
}

function makeListItem(listType, text = '') {
  return {
    id: createId(listType === 'task_list' ? 'task_item' : 'list_item'),
    type: listType === 'task_list' ? 'task_item' : 'list_item',
    attrs: listType === 'task_list' ? { checked: false } : {},
    content: [createParagraphBlock(text ? [createText(text)] : [])]
  };
}

function createConvertedBlock(current, style) {
  const text = getBlockText(current);
  const id = current.id;
  if (style.startsWith('heading:')) {
    const level = Number(style.split(':')[1]) || 1;
    return { ...createHeadingBlock({ level, text }), id };
  }
  if (style === 'blockquote') return { id, type: 'blockquote', attrs: {}, content: text ? [createText(text)] : [] };
  if (style === 'code_block') return { id, type: 'code_block', attrs: { language: '' }, content: text ? [createText(text)] : [] };
  return { ...createParagraphBlock(text ? [createText(text)] : []), id };
}

function detectTextShortcut(text) {
  const heading = text.match(/^(#{1,3})\s$/);
  if (heading) return { command: { id: `heading_${heading[1].length}`, type: 'heading', attrs: { level: heading[1].length } }, text: '' };
  if (text === '- ' || text === '* ') return { command: { id: 'bullet_list', type: 'bullet_list' }, text: '' };
  if (text === '1. ') return { command: { id: 'ordered_list', type: 'ordered_list' }, text: '' };
  if (text === '[] ' || text === '[ ] ') return { command: { id: 'task_list', type: 'task_list' }, text: '' };
  if (text === '> ') return { command: { id: 'blockquote', type: 'blockquote' }, text: '' };
  if (text === '```' || text === '``` ') return { command: { id: 'code_block', type: 'code_block' }, text: '' };
  return null;
}

function setContentEditableCaret(node, caret) {
  const selection = window.getSelection?.();
  if (!selection) return;
  const range = document.createRange();
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  let offset = 0;
  const target = caret === 'start' ? 0 : typeof caret === 'number' ? caret : node.textContent.length;

  while (current) {
    const nextOffset = offset + current.nodeValue.length;
    if (target <= nextOffset) {
      range.setStart(current, Math.max(0, target - offset));
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      return;
    }
    offset = nextOffset;
    current = walker.nextNode();
  }

  range.selectNodeContents(node);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

function markMatches(mark, type) {
  return mark.type === type;
}

function applyMarkToInlineContent(content = [], start, end, mark, attrs = {}) {
  let offset = 0;
  const selectedNodes = [];
  const nextContent = [];

  for (const node of content) {
    if (node.type !== 'text') continue;
    const nodeStart = offset;
    const nodeEnd = offset + node.text.length;
    const overlapStart = Math.max(start, nodeStart);
    const overlapEnd = Math.min(end, nodeEnd);

    if (overlapStart >= overlapEnd) {
      nextContent.push(node);
      offset = nodeEnd;
      continue;
    }

    selectedNodes.push(node);
    const before = node.text.slice(0, overlapStart - nodeStart);
    const selected = node.text.slice(overlapStart - nodeStart, overlapEnd - nodeStart);
    const after = node.text.slice(overlapEnd - nodeStart);
    if (before) nextContent.push(createText(before, node.marks || []));
    nextContent.push({ __selected: true, text: selected, marks: node.marks || [] });
    if (after) nextContent.push(createText(after, node.marks || []));
    offset = nodeEnd;
  }

  const shouldRemove = selectedNodes.length > 0 && selectedNodes.every((node) => (node.marks || []).some((item) => markMatches(item, mark)));
  return nextContent.map((node) => {
    if (!node.__selected) return node;
    const marks = shouldRemove
      ? node.marks.filter((item) => !markMatches(item, mark))
      : [...node.marks.filter((item) => !markMatches(item, mark)), { type: mark, attrs }];
    return createText(node.text, marks);
  });
}

function pageWidthClass(width) {
  return width === 'full' ? 'se-page-full' : 'se-page-fixed';
}

export function StellaEditor({
  value,
  onChange,
  context = {},
  adapters,
  readOnly = false,
  autoFocus = false,
  placeholder = 'Start writing...',
  className = '',
  style,
  onSaveRequest,
  onDirtyChange,
  onPermissionDenied,
  onValidationError
}) {
  const mergedAdapters = useMemo(() => createDefaultAdapters(adapters), [adapters]);
  const canEdit = !readOnly && mergedAdapters.permissions.canEditDocument(context)?.allowed !== false;
  const [doc, setDoc] = useState(() => normalizeDocument(value || createEmptyDocument()));
  const [selectedBlockId, setSelectedBlockId] = useState(doc.content[0]?.id || null);
  const [slashQuery, setSlashQuery] = useState(null);
  const [slashActiveIndex, setSlashActiveIndex] = useState(0);
  const [insertMenuTargetId, setInsertMenuTargetId] = useState(null);
  const [toolbarVisible, setToolbarVisible] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkSuggestions, setLinkSuggestions] = useState([]);
  const [textSelection, setTextSelection] = useState(null);
  const [draggedBlockId, setDraggedBlockId] = useState(null);
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);
  const rootRef = useRef(null);
  const inputRefs = useRef(new Map());
  const splitPrefixByBlockId = useRef(new Map());

  useEffect(() => {
    const next = normalizeDocument(value || createEmptyDocument());
    setDoc(next);
    const validation = validateDocument(next);
    if (!validation.valid) onValidationError?.(validation.errors);
  }, [value, onValidationError]);

  useEffect(() => {
    if (autoFocus) focusBlock(selectedBlockId || doc.content[0]?.id);
  }, [autoFocus]);

  useEffect(() => {
    function closeTransientMenus(event) {
      if (rootRef.current?.contains(event.target)) return;
      setInsertMenuTargetId(null);
      setSlashQuery(null);
      setLinkOpen(false);
    }
    document.addEventListener('pointerdown', closeTransientMenus);
    return () => document.removeEventListener('pointerdown', closeTransientMenus);
  }, []);

  function focusBlock(blockId, caret = 'end') {
    const id = blockId || selectedBlockId || doc.content[0]?.id;
    if (!id) return;
    requestAnimationFrame(() => {
      const input = inputRefs.current.get(id);
      input?.focus();
      if (input && typeof input.selectionStart === 'number') {
        const position = caret === 'start' ? 0 : typeof caret === 'number' ? caret : input.value.length;
        input.setSelectionRange(position, position);
      } else if (input?.isContentEditable) {
        setContentEditableCaret(input, caret);
      }
    });
  }

  function registerInput(blockId, node) {
    if (node) inputRefs.current.set(blockId, node);
    else inputRefs.current.delete(blockId);
  }

  function commit(nextDoc, reason) {
    const normalized = normalizeDocument(nextDoc);
    setPast((items) => [...items, doc]);
    setFuture([]);
    setDoc(normalized);
    onDirtyChange?.(true);
    onChange?.(normalized, { reason, dirty: true, changedAt: new Date().toISOString(), selection: { blockId: selectedBlockId } });
  }

  function updateTitle(title) {
    const next = structuredClone(doc);
    next.meta.title = title;
    next.meta.updatedAt = new Date().toISOString();
    commit(next, 'title_input');
  }

  function updateMeta(patch, reason) {
    const next = structuredClone(doc);
    next.meta = { ...next.meta, ...patch, updatedAt: new Date().toISOString() };
    commit(next, reason);
  }

  function updateText(blockId, text, content = null) {
    const next = structuredClone(doc);
    const block = next.content.find((item) => item.id === blockId);
    if (!block) return;
    const shortcut = detectTextShortcut(text);
    if (shortcut) {
      const index = next.content.findIndex((item) => item.id === blockId);
      const converted = createBlockFromCommand(shortcut.command);
      converted.id = block.id;
      if (canEditText(converted)) setBlockText(converted, shortcut.text);
      next.content[index] = converted;
      commit(next, `shortcut_${shortcut.command.id}`);
      return;
    }
    setBlockText(block, text, content);
    commit(next, 'text_input');
    if (text.startsWith('/') && block.type !== 'code_block') {
      setSlashQuery(text.slice(1));
      setSlashActiveIndex(0);
    } else setSlashQuery(null);
  }

  function handleTextSelection(blockId, start, end) {
    setSelectedBlockId(blockId);
    if (start !== end) {
      const range = window.getSelection?.()?.rangeCount ? window.getSelection().getRangeAt(0) : null;
      const rect = typeof range?.getBoundingClientRect === 'function' ? range.getBoundingClientRect() : null;
      setTextSelection({ blockId, start, end });
      setToolbarPosition(rect ? { left: rect.left + rect.width / 2, top: rect.top } : null);
      setToolbarVisible(true);
    } else {
      setTextSelection(null);
      setToolbarPosition(null);
      setToolbarVisible(false);
    }
  }

  function applyMark(mark, attrs = {}) {
    if (textSelection?.blockId && textSelection.start !== textSelection.end) {
      const next = structuredClone(doc);
      const block = next.content.find((item) => item.id === textSelection.blockId);
      if (!block) return;
      block.content = applyMarkToInlineContent(block.content, textSelection.start, textSelection.end, mark, attrs);
      commit(next, `toggle_${mark}`);
      return;
    }
    runCommand({ type: 'toggle_mark', blockId: selectedBlockId, mark, attrs });
  }

  function applyAlignment(align) {
    if (!selectedBlockId) return;
    const next = structuredClone(doc);
    const block = next.content.find((item) => item.id === selectedBlockId);
    if (!canEditText(block)) return;
    block.attrs = { ...block.attrs, align };
    commit(next, `align_${align}`);
  }

  function selectedMarks() {
    const block = doc.content.find((item) => item.id === (textSelection?.blockId || selectedBlockId));
    if (!block?.content) return [];
    const marks = new Set();
    block.content.forEach((node) => {
      if (node.type === 'text') (node.marks || []).forEach((mark) => marks.add(mark.type));
    });
    return [...marks];
  }

  function clearFormatting() {
    const next = structuredClone(doc);
    const block = next.content.find((item) => item.id === (textSelection?.blockId || selectedBlockId));
    if (!block?.content) return;
    block.content = block.content.map((node) => node.type === 'text' ? { ...node, marks: [] } : node);
    commit(next, 'clear_formatting');
    setToolbarVisible(false);
  }

  function updateRichBlock(blockId, change) {
    const next = structuredClone(doc);
    const block = next.content.find((item) => item.id === blockId);
    if (!block) return;

    if (change.kind === 'list_item_text') {
      const item = block.content[change.itemIndex];
      if (item) ensureParagraphText(item, change.text);
    }
    if (change.kind === 'add_list_item') {
      block.content.splice(change.itemIndex + 1, 0, makeListItem(block.type));
    }
    if (change.kind === 'remove_list_item' && block.content.length > 1) {
      block.content.splice(change.itemIndex, 1);
    }
    if (change.kind === 'task_checked') {
      const item = block.content[change.itemIndex];
      if (item) item.attrs.checked = change.checked;
    }
    if (change.kind === 'panel_variant') block.attrs.variant = change.variant;
    if (change.kind === 'panel_title') block.attrs.title = change.title || null;
    if (change.kind === 'expand_title') block.attrs.title = change.title || 'More details';
    if (change.kind === 'expand_default_open') block.attrs.defaultOpen = change.defaultOpen;
    if (change.kind === 'container_text') ensureParagraphText(block, change.text);
    if (change.kind === 'table_attr') block.attrs[change.attr] = change.value;
    if (change.kind === 'table_cell_text') {
      const cell = block.content[change.rowIndex]?.content?.[change.colIndex];
      if (cell) ensureParagraphText(cell, change.text);
    }
    if (change.kind === 'table_focus_cell') block.attrs.selectedCell = `${change.rowIndex}:${change.colIndex}`;
    if (change.kind === 'table_cell_background') {
      const [rowIndex, colIndex] = String(block.attrs.selectedCell || '').split(':').map((value) => Number(value));
      const cell = block.content[rowIndex]?.content?.[colIndex];
      if (cell) cell.attrs.background = change.color;
    }
    if (change.kind === 'table_column_width') {
      const columnCount = block.content[0]?.content?.length || 1;
      block.attrs.columnWidths = Array.isArray(block.attrs.columnWidths) ? block.attrs.columnWidths : Array.from({ length: columnCount }, () => null);
      block.attrs.columnWidths[change.colIndex] = Math.max(80, Math.round(change.width));
    }
    if (change.kind === 'media_attr') block.attrs[change.attr] = change.value;
    if (change.kind === 'status_text') block.attrs.text = change.text.slice(0, 40);
    if (change.kind === 'status_color') block.attrs.color = change.color;
    if (change.kind === 'layout_variant') {
      const replacement = createLayoutBlock({ variant: change.variant });
      replacement.id = block.id;
      replacement.content.forEach((column, index) => {
        if (block.content[index]) column.content = block.content[index].content;
      });
      next.content[next.content.findIndex((item) => item.id === blockId)] = replacement;
    }
    if (change.kind === 'layout_column_text') {
      const column = block.content[change.columnIndex];
      const child = column?.content?.[change.childIndex] || column;
      if (child?.type === 'paragraph') setBlockText(child, change.text);
      else if (child) ensureParagraphText(child, change.text);
    }
    if (change.kind === 'layout_add_column_block') {
      const column = block.content[change.columnIndex];
      if (column) column.content.push(createParagraphBlock());
    }

    commit(next, `rich_${change.kind}`);
  }

  function runTableAction(tableId, command) {
    const output = applyCommand(doc, { blockId: tableId }, { ...command, tableId });
    if (output.meta.error && output.meta.changed === false) return;
    commit(output.doc, command.type);
  }

  async function pickAssetForBlock(blockId) {
    const permission = mergedAdapters.permissions.canUploadAsset('image', context);
    const canUpload = mergedAdapters.assets.canUpload('image', context);
    if (permission?.allowed === false || canUpload?.allowed === false) {
      onPermissionDenied?.({ action: 'pick_asset', reason: permission?.reason || canUpload?.reason || 'Asset picking is not allowed.' });
      return;
    }
    const asset = await mergedAdapters.assets.pickAsset({ kinds: ['image', 'file', 'video', 'audio'] }, context);
    if (!asset?.assetId) return;
    const next = structuredClone(doc);
    const block = next.content.find((item) => item.id === blockId);
    if (!block) return;
    block.attrs.assetId = asset.assetId;
    block.attrs.kind = asset.kind || block.attrs.kind || 'unknown';
    block.attrs.alt = asset.alt || asset.filename || block.attrs.alt || '';
    commit(next, 'pick_asset');
  }

  async function uploadAssetFile(file, targetBlockId = null) {
    const kind = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : 'file';
    const permission = mergedAdapters.permissions.canUploadAsset(kind, context);
    const canUpload = mergedAdapters.assets.canUpload(kind, context);
    if (permission?.allowed === false || canUpload?.allowed === false) {
      onPermissionDenied?.({ action: 'upload_asset', reason: permission?.reason || canUpload?.reason || 'Upload is not allowed.' });
      return null;
    }
    const asset = await mergedAdapters.assets.uploadAsset(file, { kind }, context);
    if (!asset?.assetId) return null;
    const media = createMediaBlock({
      assetId: asset.assetId,
      kind: asset.kind || kind,
      alt: asset.alt || asset.filename || file.name || '',
      caption: asset.caption || '',
      width: 'full'
    });
    const next = structuredClone(doc);
    const targetId = targetBlockId || selectedBlockId || next.content[next.content.length - 1]?.id;
    const index = next.content.findIndex((block) => block.id === targetId);
    if (index >= 0) next.content.splice(index + 1, 0, media);
    else next.content.push(media);
    commit(next, 'upload_asset');
    setSelectedBlockId(media.id);
    return media;
  }

  function runCommand(command) {
    const output = applyCommand(doc, { blockId: selectedBlockId }, command);
    if (output.meta.error && output.meta.changed === false) return;
    commit(output.doc, command.type);
  }

  function undoEdit() {
    if (!past.length) return;
    const previous = past[past.length - 1];
    setPast((items) => items.slice(0, -1));
    setFuture((items) => [doc, ...items]);
    setDoc(previous);
    onChange?.(previous, { reason: 'undo', dirty: true });
  }

  function redoEdit() {
    if (!future.length) return;
    const [next, ...rest] = future;
    setFuture(rest);
    setPast((items) => [...items, doc]);
    setDoc(next);
    onChange?.(next, { reason: 'redo', dirty: true });
  }

  function handleSlashCommand(command) {
    const index = doc.content.findIndex((block) => block.id === selectedBlockId);
    const next = structuredClone(doc);
    const replacement = createBlockFromCommand(command);
    if (index >= 0) next.content[index] = replacement;
    commit(next, `slash_${command.id}`);
    setSelectedBlockId(replacement.id);
    setSlashQuery(null);
    setSlashActiveIndex(0);
    focusBlock(replacement.id);
  }

  function handleInsertCommand(command, targetOverrideId = null) {
    const targetId = targetOverrideId || insertMenuTargetId || selectedBlockId || doc.content[doc.content.length - 1]?.id;
    const nextBlock = createBlockFromCommand(command);
    const next = structuredClone(doc);
    const index = next.content.findIndex((block) => block.id === targetId);
    if (index >= 0) next.content.splice(index + 1, 0, nextBlock);
    else next.content.push(nextBlock);
    commit(next, `insert_${command.id}`);
    setSelectedBlockId(nextBlock.id);
    setInsertMenuTargetId(null);
    focusBlock(nextBlock.id);
  }

  function handleToolbarAction(action, block) {
    if (action === 'insert') {
      setSelectedBlockId(block.id);
      setInsertMenuTargetId(block.id);
      return;
    }
    if (action === 'up') runCommand({ type: 'move_block_up', blockId: block.id });
    if (action === 'down') runCommand({ type: 'move_block_down', blockId: block.id });
    if (action === 'duplicate') runCommand({ type: 'duplicate_block', blockId: block.id });
    if (action === 'delete') {
      const index = doc.content.findIndex((item) => item.id === block.id);
      const fallback = doc.content[index + 1]?.id || doc.content[index - 1]?.id || doc.content[0]?.id;
      runCommand({ type: 'delete_block', blockId: block.id });
      setSelectedBlockId(fallback);
      focusBlock(fallback);
    }
  }

  function setSelectedBlockStyle(style) {
    const index = doc.content.findIndex((block) => block.id === selectedBlockId);
    if (index < 0) return;
    const next = structuredClone(doc);
    next.content[index] = createConvertedBlock(next.content[index], style);
    commit(next, 'set_block_style');
    focusBlock(selectedBlockId);
  }

  function insertAfterSelected() {
    const block = doc.content.find((item) => item.id === selectedBlockId) || doc.content[doc.content.length - 1];
    if (!block) return;
    setInsertMenuTargetId(block.id);
    setSelectedBlockId(block.id);
  }

  function focusAppendArea() {
    const last = doc.content[doc.content.length - 1];
    if (last && canEditText(last) && !getBlockText(last)) {
      setSelectedBlockId(last.id);
      focusBlock(last.id);
      return;
    }
    const nextBlock = createParagraphBlock();
    const next = structuredClone(doc);
    next.content.push(nextBlock);
    commit(next, 'append_empty_block');
    setSelectedBlockId(nextBlock.id);
    focusBlock(nextBlock.id);
  }

  function promptForCover() {
    const value = window.prompt('Cover image URL', doc.meta.coverUrl || '');
    if (value === null) return;
    updateMeta({ coverUrl: value.trim() }, 'cover_input');
  }

  function promptForEmoji() {
    const value = window.prompt('Page icon or emoji', doc.meta.emoji || '');
    if (value === null) return;
    updateMeta({ emoji: value.trim().slice(0, 3) }, 'emoji_input');
  }

  function handleDragStart(event, block) {
    setDraggedBlockId(block.id);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', block.id);
  }

  function handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }

  function handleDrop(event, targetBlock) {
    event.preventDefault();
    const sourceId = draggedBlockId || event.dataTransfer.getData('text/plain');
    setDraggedBlockId(null);
    if (!sourceId || sourceId === targetBlock.id) return;
    const sourceIndex = doc.content.findIndex((block) => block.id === sourceId);
    const targetIndex = doc.content.findIndex((block) => block.id === targetBlock.id);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const next = structuredClone(doc);
    const [moved] = next.content.splice(sourceIndex, 1);
    const adjustedTargetIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
    next.content.splice(adjustedTargetIndex, 0, moved);
    commit(next, 'drag_reorder_block');
    setSelectedBlockId(sourceId);
    focusBlock(sourceId);
  }

  function handleKeyDown(event, block, editState = {}) {
    const mod = event.metaKey || event.ctrlKey;
    const liveEventText = event.currentTarget.value || event.currentTarget.textContent || '';
    const currentText = liveEventText || (typeof editState.text === 'string' ? editState.text : '');
    const selectionStart = Number.isInteger(editState.selectionStart) ? editState.selectionStart : event.currentTarget.selectionStart ?? 0;
    const selectionEnd = Number.isInteger(editState.selectionEnd) ? editState.selectionEnd : event.currentTarget.selectionEnd ?? selectionStart;
    if (slashQuery !== null) {
      const commands = getAllowedCommands(mergedAdapters, context, slashQuery);
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSlashActiveIndex((index) => Math.min(index + 1, commands.length - 1));
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSlashActiveIndex((index) => Math.max(index - 1, 0));
        return;
      }
      if (event.key === 'Enter' && commands[slashActiveIndex]) {
        event.preventDefault();
        handleSlashCommand(commands[slashActiveIndex]);
        return;
      }
    }
    if (event.key === 'Enter' && !event.shiftKey && block.type !== 'code_block') {
      event.preventDefault();
      const before = currentText.slice(0, selectionStart);
      const after = currentText.slice(selectionEnd);
      const nextBlock = createParagraphBlock();
      nextBlock.content = after ? [createText(after)] : [];
      splitPrefixByBlockId.current.set(nextBlock.id, before);
      const next = structuredClone(doc);
      const current = next.content.find((item) => item.id === block.id);
      if (current) setBlockText(current, before);
      if (event.currentTarget?.isContentEditable) {
        event.currentTarget.textContent = before;
        event.currentTarget.__stellaLegacyValue = before;
      }
      const currentIndex = next.content.findIndex((item) => item.id === block.id);
      if (currentIndex >= 0) next.content.splice(currentIndex + 1, 0, nextBlock);
      commit(next, 'split_block');
      setSelectedBlockId(nextBlock.id);
      focusBlock(nextBlock.id, 'start');
      return;
    }
    if (event.key === 'Backspace' && !mod && selectionStart === 0 && selectionEnd === 0) {
      const index = doc.content.findIndex((item) => item.id === block.id);
      if (index <= 0) return;
      event.preventDefault();
      const previous = doc.content[index - 1];
      const next = structuredClone(doc);
      const nextPrevious = next.content[index - 1];
      const nextCurrent = next.content[index];
      const previousNode = inputRefs.current.get(previous.id);
      const editableNodes = [...(rootRef.current?.querySelectorAll('.se-block-input[role="textbox"]') || [])];
      const domIndex = editableNodes.indexOf(event.currentTarget);
      const previousDomNode = domIndex > 0 ? editableNodes[domIndex - 1] : null;
      const previousText = getBlockText(nextPrevious) || splitPrefixByBlockId.current.get(block.id) || previousNode?.value || previousNode?.textContent || previousDomNode?.value || previousDomNode?.textContent || '';
      splitPrefixByBlockId.current.delete(block.id);
      const eventLiveText = event.currentTarget.value || event.currentTarget.textContent || currentText;
      const liveCurrentText = eventLiveText || getBlockText(nextCurrent);
      if (canEditText(nextPrevious) && canEditText(nextCurrent)) setBlockText(nextPrevious, `${previousText}${liveCurrentText}`);
      next.content.splice(index, 1);
      commit(next, liveCurrentText ? 'merge_block_backward' : 'delete_empty_block_backward');
      setSelectedBlockId(previous.id);
      focusBlock(previous.id, previousText.length);
      return;
    }
    if (event.key === 'Delete' && !mod && selectionStart === currentText.length && selectionEnd === currentText.length) {
      const index = doc.content.findIndex((item) => item.id === block.id);
      const following = doc.content[index + 1];
      if (!following) return;
      event.preventDefault();
      const next = structuredClone(doc);
      const nextCurrent = next.content[index];
      const nextFollowing = next.content[index + 1];
      const beforeText = getBlockText(nextCurrent);
      const afterText = getBlockText(nextFollowing);
      if (canEditText(nextCurrent) && canEditText(nextFollowing)) setBlockText(nextCurrent, `${beforeText}${afterText}`);
      next.content.splice(index + 1, 1);
      commit(next, afterText ? 'merge_block_forward' : 'delete_empty_block_forward');
      setSelectedBlockId(block.id);
      focusBlock(block.id, beforeText.length);
      return;
    }
    if (event.key === 'ArrowUp' && selectionStart === 0 && selectionEnd === 0) {
      const index = doc.content.findIndex((item) => item.id === block.id);
      const previous = doc.content[index - 1];
      if (previous && canEditText(previous)) {
        event.preventDefault();
        setSelectedBlockId(previous.id);
        focusBlock(previous.id);
      }
      return;
    }
    if (event.key === 'ArrowDown' && selectionStart === currentText.length && selectionEnd === currentText.length) {
      const index = doc.content.findIndex((item) => item.id === block.id);
      const nextBlock = doc.content[index + 1];
      if (nextBlock && canEditText(nextBlock)) {
        event.preventDefault();
        setSelectedBlockId(nextBlock.id);
        focusBlock(nextBlock.id, 'start');
      }
      return;
    }
    if (event.key === 'Escape') {
      setSlashQuery(null);
      setSlashActiveIndex(0);
      setInsertMenuTargetId(null);
      setLinkOpen(false);
    }
    if (mod && event.key.toLowerCase() === 's') {
      event.preventDefault();
      onSaveRequest?.(doc);
    }
    if (mod && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      if (event.shiftKey && future.length) {
        redoEdit();
      } else if (past.length) {
        undoEdit();
      }
    }
    if (mod && ['b', 'i', 'u'].includes(event.key.toLowerCase())) {
      event.preventDefault();
      const mark = event.key.toLowerCase() === 'b' ? 'bold' : event.key.toLowerCase() === 'i' ? 'italic' : 'underline';
      applyMark(mark);
    }
    if (mod && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      setLinkOpen(true);
    }
  }

  function applyLink(href) {
    if (href.startsWith('document:')) {
      const reference = { type: 'document', id: href.slice('document:'.length) };
      const scopeResult = mergedAdapters.scope.canResolveReference(reference, context);
      const permission = mergedAdapters.permissions.canLinkToTarget(reference, context);
      if (scopeResult?.allowed === false || permission?.allowed === false) {
        onPermissionDenied?.({ action: 'insert_internal_link', reason: scopeResult?.reason || permission?.reason || 'Internal link is out of scope.' });
        return;
      }
      applyMark('link', { kind: 'document', reference, href: null, label: reference.id });
      setLinkOpen(false);
      return;
    }
    if (!isSafeUrl(href)) {
      onPermissionDenied?.({ action: 'insert_link', reason: 'Unsafe URL' });
      return;
    }
    applyMark('link', { kind: 'external_url', href });
    setLinkOpen(false);
  }

  async function searchLinks(query) {
    const adapterResults = await mergedAdapters.links.searchLinkTargets(query, context);
    if (Array.isArray(adapterResults)) {
      setLinkSuggestions(adapterResults);
      return;
    }
    const autocompleteResults = await mergedAdapters.autocomplete.searchReferences(query, context);
    setLinkSuggestions(Array.isArray(autocompleteResults) ? autocompleteResults : []);
  }

  async function handlePaste(event) {
    if (!canEdit) return;
    const files = [...(event.clipboardData?.files || [])];
    if (files.length) {
      event.preventDefault();
      for (const file of files) await uploadAssetFile(file);
      return;
    }
    const html = event.clipboardData?.getData('text/html');
    const text = event.clipboardData?.getData('text/plain');
    if (!html && !text) return;
    event.preventDefault();
    const pasted = sanitizePaste({ html, text });
    const next = structuredClone(doc);
    const targetId = selectedBlockId || next.content[next.content.length - 1]?.id;
    const index = next.content.findIndex((block) => block.id === targetId);
    if (index >= 0) next.content.splice(index + 1, 0, ...pasted.content);
    else next.content.push(...pasted.content);
    commit(next, 'paste');
    const firstPasted = pasted.content[0];
    if (firstPasted) {
      setSelectedBlockId(firstPasted.id);
      focusBlock(firstPasted.id);
    }
  }

  async function handleDropOnCanvas(event) {
    const files = [...(event.dataTransfer?.files || [])];
    if (!files.length) return;
    event.preventDefault();
    for (const file of files) await uploadAssetFile(file);
  }

  if (!canEdit) return <StellaViewer value={doc} context={context} adapters={adapters} className={className} style={style} />;

  const slashCommands = slashQuery === null ? [] : getAllowedCommands(mergedAdapters, context, slashQuery);
  const insertCommands = insertMenuTargetId === null ? [] : getAllowedCommands(mergedAdapters, context, '');
  const selectedBlock = doc.content.find((block) => block.id === selectedBlockId) || doc.content[0];

  function handleCanvasPointerDown(event) {
    if (event.target === rootRef.current) {
      setInsertMenuTargetId(null);
      const id = selectedBlockId || doc.content[0]?.id;
      setSelectedBlockId(id);
      focusBlock(id);
    }
  }

  return (
    <section className={`stella-editor ${pageWidthClass(doc.meta.width)} ${className}`} style={style} ref={rootRef} onPointerDown={handleCanvasPointerDown} onPaste={handlePaste} onDrop={handleDropOnCanvas} onDragOver={(event) => event.preventDefault()} onMouseUp={() => setToolbarVisible(Boolean(window.getSelection?.()?.toString()))}>
      <FormattingToolbar blockType={selectedBlock?.type} headingLevel={selectedBlock?.attrs?.level} pageWidth={doc.meta.width} onUndo={undoEdit} onRedo={redoEdit} onWidthToggle={() => updateMeta({ width: doc.meta.width === 'full' ? 'fixed' : 'full' }, 'toggle_width')} onBlockType={setSelectedBlockStyle} onInsert={insertAfterSelected} onLink={() => setLinkOpen(true)} onQuickInsert={(command) => {
        const block = doc.content.find((item) => item.id === selectedBlockId) || doc.content[doc.content.length - 1];
        handleInsertCommand(command, block?.id || null);
      }} />
      <div className="se-page-topper">
        {doc.meta.coverUrl ? <img src={doc.meta.coverUrl} alt="" className="se-cover-image" /> : <div className="se-cover-placeholder">Cover image</div>}
        <div className="se-page-actions">
          <button type="button" className="se-page-icon-button" aria-label="Set page icon" onClick={promptForEmoji}>{doc.meta.emoji || 'Icon'}</button>
          <button type="button" onClick={promptForCover}>{doc.meta.coverUrl ? 'Change cover' : 'Add cover'}</button>
          {doc.meta.coverUrl ? <button type="button" onClick={() => updateMeta({ coverUrl: '' }, 'cover_clear')}>Remove cover</button> : null}
          <input className="se-visually-hidden" aria-label="Page emoji" value={doc.meta.emoji || ''} onChange={(event) => updateMeta({ emoji: event.target.value }, 'emoji_input')} />
          <input className="se-visually-hidden" aria-label="Cover image URL" value={doc.meta.coverUrl || ''} onChange={(event) => updateMeta({ coverUrl: event.target.value }, 'cover_input')} />
        </div>
      </div>
      <input className="se-title-input" aria-label="Document title" value={doc.meta.title} onChange={(event) => updateTitle(event.target.value)} placeholder="Give this page a title" />
      <InlineToolbar visible={toolbarVisible} position={toolbarPosition} activeMarks={selectedMarks()} onMark={(mark, attrs) => applyMark(mark, attrs)} onAlign={applyAlignment} onClear={clearFormatting} onLink={() => setLinkOpen(true)} />
      <LinkPopover open={linkOpen} suggestions={linkSuggestions} onSearch={searchLinks} onSubmit={applyLink} onClose={() => setLinkOpen(false)} />
      <EditableCanvas doc={doc} placeholder={placeholder} selectedBlockId={selectedBlockId} readOnly={!canEdit} registerInput={registerInput} adapters={mergedAdapters} context={context} onFocusBlock={setSelectedBlockId} onTextChange={updateText} onKeyDown={handleKeyDown} onSelectText={handleTextSelection} onToolbarAction={handleToolbarAction} onRichBlockChange={updateRichBlock} onTableAction={runTableAction} onPickAsset={pickAssetForBlock} onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop} />
      <div className="se-canvas-append" role="button" tabIndex={0} aria-label="Click to add content" onPointerDown={(event) => {
        event.preventDefault();
        focusAppendArea();
      }} onKeyDown={(event) => {
        if (event.key === 'Enter') focusAppendArea();
      }} />
      {slashCommands.length ? <SlashMenu commands={slashCommands} activeIndex={slashActiveIndex} onSelect={handleSlashCommand} /> : null}
      {insertCommands.length ? <SlashMenu variant="insert" commands={insertCommands} onSelect={handleInsertCommand} /> : null}
    </section>
  );
}
