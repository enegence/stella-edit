import React, { useLayoutEffect, useRef } from 'react';
import { createText } from '../core';

function sameMarks(a = [], b = []) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function getMarksFromElement(element) {
  const marks = [];
  let node = element;
  while (node && node.nodeType === Node.ELEMENT_NODE) {
    const mark = node.dataset?.mark;
    if (mark && !marks.some((item) => item.type === mark)) {
      marks.unshift(mark === 'color' ? { type: 'color', attrs: { color: node.dataset.color || '#CC785C' } } : { type: mark, attrs: {} });
    }
    if (node.tagName === 'STRONG' || node.tagName === 'B') marks.unshift({ type: 'bold', attrs: {} });
    if (node.tagName === 'EM' || node.tagName === 'I') marks.unshift({ type: 'italic', attrs: {} });
    if (node.tagName === 'U') marks.unshift({ type: 'underline', attrs: {} });
    if (node.tagName === 'S' || node.tagName === 'STRIKE') marks.unshift({ type: 'strike', attrs: {} });
    if (node.tagName === 'CODE') marks.unshift({ type: 'code', attrs: {} });
    node = node.parentElement;
  }
  return marks.filter((mark, index, list) => list.findIndex((item) => item.type === mark.type) === index);
}

function domToInlineContent(root) {
  const parts = [];
  function visit(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (!node.nodeValue) return;
      const marks = getMarksFromElement(node.parentElement);
      const previous = parts[parts.length - 1];
      if (previous && sameMarks(previous.marks, marks)) previous.text += node.nodeValue;
      else parts.push(createText(node.nodeValue, marks));
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    if (node.tagName === 'BR') {
      parts.push(createText('\n'));
      return;
    }
    node.childNodes.forEach(visit);
  }
  root.childNodes.forEach(visit);
  return parts.filter((part) => part.text.length);
}

function getSelectionOffsets(root) {
  const selection = window.getSelection?.();
  if (!selection?.rangeCount) return { start: 0, end: 0 };
  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return { start: 0, end: 0 };
  const before = range.cloneRange();
  before.selectNodeContents(root);
  before.setEnd(range.startContainer, range.startOffset);
  const selected = range.cloneRange();
  return { start: before.toString().length, end: before.toString().length + selected.toString().length };
}

function setSelectionOffsets(root, start, end = start) {
  const selection = window.getSelection?.();
  if (!selection) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  let current = walker.nextNode();
  let offset = 0;
  let startSet = false;

  while (current) {
    const nextOffset = offset + current.nodeValue.length;
    if (!startSet && start <= nextOffset) {
      range.setStart(current, Math.max(0, start - offset));
      startSet = true;
    }
    if (end <= nextOffset) {
      range.setEnd(current, Math.max(0, end - offset));
      selection.removeAllRanges();
      selection.addRange(range);
      return;
    }
    offset = nextOffset;
    current = walker.nextNode();
  }

  range.selectNodeContents(root);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

function renderTextNode(node, index) {
  let element = node.text;
  for (const mark of node.marks || []) {
    if (mark.type === 'bold') element = <strong data-mark="bold">{element}</strong>;
    if (mark.type === 'italic') element = <em data-mark="italic">{element}</em>;
    if (mark.type === 'underline') element = <u data-mark="underline">{element}</u>;
    if (mark.type === 'strike') element = <s data-mark="strike">{element}</s>;
    if (mark.type === 'code') element = <code data-mark="code">{element}</code>;
    if (mark.type === 'color') element = <span data-mark="color" data-color={mark.attrs?.color || '#CC785C'} style={{ color: mark.attrs?.color || '#CC785C' }}>{element}</span>;
  }
  return <React.Fragment key={index}>{element}</React.Fragment>;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function inlineHtml(content = []) {
  return content.map((node) => {
    if (node.type !== 'text') return '';
    let html = escapeHtml(node.text);
    for (const mark of node.marks || []) {
      if (mark.type === 'bold') html = `<strong data-mark="bold">${html}</strong>`;
      if (mark.type === 'italic') html = `<em data-mark="italic">${html}</em>`;
      if (mark.type === 'underline') html = `<u data-mark="underline">${html}</u>`;
      if (mark.type === 'strike') html = `<s data-mark="strike">${html}</s>`;
      if (mark.type === 'code') html = `<code data-mark="code">${html}</code>`;
      if (mark.type === 'color') {
        const color = /^#[0-9a-f]{6}$/i.test(mark.attrs?.color || '') ? mark.attrs.color : '#CC785C';
        html = `<span data-mark="color" data-color="${color}" style="color:${color}">${html}</span>`;
      }
    }
    return html;
  }).join('');
}

export function getEditableText(block) {
  return block.content?.filter((node) => node.type === 'text').map((node) => node.text).join('') || '';
}

export function RichTextEditable({ block, className, placeholder, readOnly, inputRef, onFocus, onSelectionChange, onChange, onKeyDown }) {
  const ref = useRef(null);
  const selectionRef = useRef(null);
  const text = getEditableText(block);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    node.__stellaLegacyValue = text;

    if (!Object.prototype.hasOwnProperty.call(node, '__stellaValueBridge')) {
      Object.defineProperty(node, '__stellaValueBridge', { value: true });
      Object.defineProperty(node, 'value', {
        configurable: true,
        get() {
          return this.textContent || this.__stellaLegacyValue || '';
        },
        set(value) {
          this.__stellaLegacyValue = String(value ?? '');
        }
      });
      Object.defineProperty(node, 'selectionStart', {
        configurable: true,
        get() {
          return selectionRef.current?.start || 0;
        }
      });
      Object.defineProperty(node, 'selectionEnd', {
        configurable: true,
        get() {
          return selectionRef.current?.end || 0;
        }
      });
      node.setSelectionRange = (start, end = start) => {
        selectionRef.current = { start, end };
        if (document.activeElement === node) setSelectionOffsets(node, start, end);
      };
    }

    function handleLegacyChange(event) {
      const value = String(event.target?.value ?? node.value ?? '');
      node.__stellaLegacyValue = value;
      const content = value ? [createText(value)] : [];
      onChange(value, content, selectionRef.current || { start: 0, end: 0 });
    }

    node.addEventListener('change', handleLegacyChange);
    if (typeof inputRef === 'function') inputRef(node);
    return () => {
      node.removeEventListener('change', handleLegacyChange);
      if (typeof inputRef === 'function') inputRef(null);
    };
  }, [inputRef, onChange, text]);

  useLayoutEffect(() => {
    if (document.activeElement === ref.current && selectionRef.current) {
      setSelectionOffsets(ref.current, selectionRef.current.start, selectionRef.current.end);
    }
  }, [block.content]);

  useLayoutEffect(() => {
    if (ref.current) ref.current.__stellaLegacyValue = text;
    const html = inlineHtml(block.content);
    if (ref.current && ref.current.__stellaHtml !== html) {
      ref.current.innerHTML = html;
      ref.current.__stellaHtml = html;
    }
  }, [block.content, text]);

  function selectionState() {
    return getSelectionOffsets(ref.current);
  }

  function publishSelection() {
    const measured = selectionState();
    const offsets = measured.start === measured.end && selectionRef.current?.start !== selectionRef.current?.end
      ? selectionRef.current
      : measured;
    selectionRef.current = offsets;
    onSelectionChange(offsets.start, offsets.end);
    return offsets;
  }

  function publishChange() {
    const offsets = publishSelection();
    const content = domToInlineContent(ref.current);
    onChange(content.map((node) => node.text).join(''), content, offsets);
  }

  function publishLegacyChange(event) {
    const value = String(event.target?.value ?? ref.current?.__stellaLegacyValue ?? '');
    if (ref.current) ref.current.__stellaLegacyValue = value;
    onChange(value, value ? [createText(value)] : [], selectionRef.current || { start: 0, end: 0 });
  }

  return (
    <div
      ref={ref}
      role="textbox"
      aria-multiline="true"
      className={className}
      contentEditable={!readOnly}
      data-empty={!text || undefined}
      data-placeholder={placeholder || ''}
      placeholder={placeholder || ''}
      suppressContentEditableWarning
      tabIndex={readOnly ? -1 : 0}
      onFocus={onFocus}
      onInput={publishChange}
      onChange={publishLegacyChange}
      onSelect={publishSelection}
      onMouseUp={publishSelection}
      onKeyUp={publishSelection}
      onKeyDown={(event) => {
        const measured = selectionState();
        const offsets = measured.start === 0 && measured.end === 0 && selectionRef.current ? selectionRef.current : measured;
        const liveText = ref.current?.value ?? text;
        selectionRef.current = offsets;
        onKeyDown(event, { text: liveText, selectionStart: offsets.start, selectionEnd: offsets.end });
      }}
    />
  );
}
