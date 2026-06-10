import React from 'react';
import { BlockToolbar } from './BlockToolbar';
import { RichBlockEditor } from './RichBlockEditor';
import { getEditableText, RichTextEditable } from './RichTextEditable';

export function EditableBlock({ block, selected, placeholder, onTextChange, onFocus, onKeyDown, onSelectText, onToolbarAction, onRichBlockChange, onTableAction, onPickAsset, readOnly, inputRef, adapters, context, onDragStart, onDragOver, onDrop }) {
  const editableTypes = new Set(['paragraph', 'heading', 'blockquote', 'code_block']);

  if (editableTypes.has(block.type)) {
    const className = [
      'se-block-input',
      block.type === 'heading' ? `se-heading-input se-heading-${block.attrs.level}` : '',
      block.type === 'blockquote' ? 'se-quote-input' : '',
      block.type === 'code_block' ? 'se-code-input' : '',
      block.attrs.align ? `se-align-${block.attrs.align}` : ''
    ].filter(Boolean).join(' ');

    return (
      <div className="se-editable-block" data-block-id={block.id} data-selected={selected || undefined} onDragOver={onDragOver} onDrop={onDrop}>
        {!readOnly ? <BlockToolbar onAction={onToolbarAction} dragHandleProps={{ draggable: true, onDragStart }} /> : null}
        <RichTextEditable
          block={block}
          className={className}
          placeholder={placeholder}
          readOnly={readOnly}
          inputRef={inputRef}
          onFocus={onFocus}
          onSelectionChange={(start, end) => onSelectText(block.id, start, end)}
          onChange={(text, content) => onTextChange(text, content)}
          onKeyDown={(event, editState) => onKeyDown(event, editState)}
        />
        <input className="se-visually-hidden" tabIndex={-1} aria-hidden="true" placeholder="Stella block value mirror" value={getEditableText(block)} readOnly />
      </div>
    );
  }

  return (
    <div className="se-editable-block" data-block-id={block.id} data-selected={selected || undefined} tabIndex={0} onFocus={onFocus} onDragOver={onDragOver} onDrop={onDrop}>
      {!readOnly ? <BlockToolbar onAction={onToolbarAction} dragHandleProps={{ draggable: true, onDragStart }} /> : null}
      <div className="se-nontext-block">
        <RichBlockEditor block={block} adapters={adapters} context={context} onChange={(change) => onRichBlockChange(block.id, change)} onTableAction={(command) => onTableAction(block.id, command)} onPickAsset={onPickAsset} />
      </div>
    </div>
  );
}
