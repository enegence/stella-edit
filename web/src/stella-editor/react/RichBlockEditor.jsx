import React, { useRef, useState } from 'react';
import { BlockRenderer } from './BlockRenderer';

function textFromBlock(block) {
  return block?.content?.filter((node) => node.type === 'text').map((node) => node.text).join('') || '';
}

function firstParagraph(container) {
  return container?.content?.find((block) => block.type === 'paragraph') || container?.content?.[0];
}

function listText(item) {
  return textFromBlock(firstParagraph(item));
}

export function RichBlockEditor({ block, adapters, context, onChange, onTableAction, onPickAsset }) {
  const [expandOpen, setExpandOpen] = useState(Boolean(block.attrs.defaultOpen));
  const resizeRef = useRef(null);

  function startColumnResize(event, colIndex) {
    const cell = event.currentTarget.closest('td');
    if (!cell) return;
    event.preventDefault();
    resizeRef.current = { colIndex, startX: event.clientX, startWidth: cell.getBoundingClientRect().width };
    function move(pointerEvent) {
      const resize = resizeRef.current;
      if (!resize) return;
      onChange({ kind: 'table_column_width', colIndex: resize.colIndex, width: resize.startWidth + pointerEvent.clientX - resize.startX });
    }
    function stop() {
      resizeRef.current = null;
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', stop);
    }
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', stop);
  }

  if (block.type === 'bullet_list' || block.type === 'ordered_list' || block.type === 'task_list') {
    return (
      <div className="se-rich-edit se-list-edit">
        {block.content.map((item, index) => (
          <div className="se-list-row" key={item.id}>
            {block.type === 'task_list' ? (
              <input
                type="checkbox"
                checked={Boolean(item.attrs.checked)}
                onChange={(event) => onChange({ kind: 'task_checked', itemIndex: index, checked: event.target.checked })}
              />
            ) : (
              <span className="se-list-marker">{block.type === 'ordered_list' ? `${index + 1}.` : '-'}</span>
            )}
            <input
              aria-label={`${block.type.replace('_', ' ')} item ${index + 1}`}
              value={listText(item)}
              onChange={(event) => onChange({ kind: 'list_item_text', itemIndex: index, text: event.target.value })}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  onChange({ kind: 'add_list_item', itemIndex: index });
                }
                if (event.key === 'Backspace' && event.currentTarget.selectionStart === 0 && event.currentTarget.selectionEnd === 0 && block.content.length > 1) {
                  event.preventDefault();
                  onChange({ kind: 'remove_list_item', itemIndex: index });
                }
              }}
            />
          </div>
        ))}
        <button type="button" className="se-inline-add" onClick={() => onChange({ kind: 'add_list_item', itemIndex: block.content.length - 1 })}>Add item</button>
      </div>
    );
  }

  if (block.type === 'panel') {
    const icons = { info: 'i', note: 'n', success: '✓', warning: '!', error: 'x' };
    return (
      <aside className={`se-panel se-panel-${block.attrs.variant} se-rich-edit`}>
        <span className="se-panel-icon" aria-hidden="true">{icons[block.attrs.variant] || 'i'}</span>
        <div className="se-panel-controls">
          <select value={block.attrs.variant} aria-label="Panel variant" onChange={(event) => onChange({ kind: 'panel_variant', variant: event.target.value })}>
            <option value="info">Info</option>
            <option value="note">Note</option>
            <option value="success">Success</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
          </select>
          <input aria-label="Panel title" value={block.attrs.title || ''} placeholder="Optional title" onChange={(event) => onChange({ kind: 'panel_title', title: event.target.value })} />
        </div>
        <textarea aria-label="Panel body" value={textFromBlock(firstParagraph(block))} onChange={(event) => onChange({ kind: 'container_text', text: event.target.value })} />
      </aside>
    );
  }

  if (block.type === 'expand') {
    return (
      <div className="se-expand-edit se-rich-edit">
        <button type="button" className="se-expand-toggle" aria-expanded={expandOpen} onClick={() => setExpandOpen((value) => !value)}>{expandOpen ? 'v' : '>'}</button>
        <input aria-label="Expand title" value={block.attrs.title || ''} onChange={(event) => onChange({ kind: 'expand_title', title: event.target.value })} />
        <label className="se-check-label">
          <input type="checkbox" checked={Boolean(block.attrs.defaultOpen)} onChange={(event) => onChange({ kind: 'expand_default_open', defaultOpen: event.target.checked })} />
          Open by default
        </label>
        {expandOpen ? <textarea aria-label="Expand body" value={textFromBlock(firstParagraph(block))} onChange={(event) => onChange({ kind: 'container_text', text: event.target.value })} /> : null}
      </div>
    );
  }

  if (block.type === 'status') {
    return (
      <div className="se-status-edit se-rich-edit">
        <span className={`se-status-pill se-status-${block.attrs.color}`}>{block.attrs.text}</span>
        <input aria-label="Status text" value={block.attrs.text} maxLength={40} onChange={(event) => onChange({ kind: 'status_text', text: event.target.value.toUpperCase() })} />
        <select aria-label="Status color" value={block.attrs.color} onChange={(event) => onChange({ kind: 'status_color', color: event.target.value })}>
          <option value="blue">Blue</option>
          <option value="green">Green</option>
          <option value="yellow">Yellow</option>
          <option value="red">Red</option>
          <option value="gray">Gray</option>
          <option value="coral">Coral</option>
        </select>
      </div>
    );
  }

  if (block.type === 'layout') {
    return (
      <div className={`se-layout-edit se-layout-${block.attrs.variant}`}>
        <div className="se-layout-controls">
          <label className="se-check-label">Layout
            <select value={block.attrs.variant} onChange={(event) => onChange({ kind: 'layout_variant', variant: event.target.value })}>
              <option value="50-50">50/50</option>
              <option value="33-33-33">33/33/33</option>
              <option value="70-30">70/30</option>
            </select>
          </label>
        </div>
        <div className="se-layout-columns">
          {block.content.map((column, columnIndex) => (
            <section className="se-layout-column" key={column.id} aria-label={`Layout column ${columnIndex + 1}`}>
              {column.content.map((child, childIndex) => child.type === 'paragraph' ? (
                <textarea
                  key={child.id}
                  aria-label={`Layout column ${columnIndex + 1} block ${childIndex + 1}`}
                  value={textFromBlock(child)}
                  placeholder="Add content"
                  onChange={(event) => onChange({ kind: 'layout_column_text', columnIndex, childIndex, text: event.target.value })}
                />
              ) : (
                <BlockRenderer key={child.id} block={child} adapters={adapters} context={context} />
              ))}
              <button type="button" className="se-inline-add" onClick={() => onChange({ kind: 'layout_add_column_block', columnIndex })}>Add block</button>
            </section>
          ))}
        </div>
      </div>
    );
  }

  if (block.type === 'table') {
    function focusCell(rowIndex, colIndex, backwards) {
      const totalRows = block.content.length;
      const totalCols = block.content[0]?.content.length || 1;
      let nextRow = rowIndex;
      let nextCol = backwards ? colIndex - 1 : colIndex + 1;
      if (nextCol >= totalCols) {
        nextCol = 0;
        nextRow = Math.min(rowIndex + 1, totalRows - 1);
      }
      if (nextCol < 0) {
        nextCol = totalCols - 1;
        nextRow = Math.max(rowIndex - 1, 0);
      }
      requestAnimationFrame(() => {
        document.querySelector(`[aria-label="Table cell ${nextRow + 1}-${nextCol + 1}"]`)?.focus();
      });
    }

    return (
      <div className="se-table-edit se-rich-edit">
        <div className="se-table-controls se-table-floating-menu">
          <button type="button" onClick={() => onTableAction({ type: 'add_table_row', rowIndex: block.content.length - 1 })}>Add row</button>
          <button type="button" onClick={() => onTableAction({ type: 'remove_table_row', rowIndex: block.content.length - 1 })}>Delete row</button>
          <button type="button" onClick={() => onTableAction({ type: 'add_table_column', colIndex: (block.content[0]?.content.length || 1) - 1 })}>Add column</button>
          <button type="button" onClick={() => onTableAction({ type: 'remove_table_column', colIndex: (block.content[0]?.content.length || 1) - 1 })}>Delete column</button>
          <label className="se-check-label"><input type="checkbox" checked={Boolean(block.attrs.headerRow)} onChange={(event) => onChange({ kind: 'table_attr', attr: 'headerRow', value: event.target.checked })} /> Header row</label>
          <label className="se-check-label"><input type="checkbox" checked={Boolean(block.attrs.headerColumn)} onChange={(event) => onChange({ kind: 'table_attr', attr: 'headerColumn', value: event.target.checked })} /> Header column</label>
          <button type="button" onClick={() => onChange({ kind: 'table_cell_background', color: '#FCE8DF' })}>Coral cell</button>
          <button type="button" onClick={() => onChange({ kind: 'table_cell_background', color: '#EFF6FF' })}>Blue cell</button>
          <button type="button" onClick={() => onChange({ kind: 'table_cell_background', color: '' })}>Clear cell</button>
        </div>
        <div className="se-table-column-controls" style={{ gridTemplateColumns: `repeat(${block.content[0]?.content.length || 1}, minmax(72px, 1fr))` }}>
          {block.content[0]?.content.map((cell, colIndex) => <button type="button" key={cell.id} onClick={() => onTableAction({ type: 'add_table_column', colIndex })}>+</button>)}
        </div>
        <table>
          <colgroup>
            {block.content[0]?.content.map((cell, colIndex) => <col key={cell.id} style={block.attrs.columnWidths?.[colIndex] ? { width: `${block.attrs.columnWidths[colIndex]}px` } : undefined} />)}
          </colgroup>
          <tbody>
            {block.content.map((row, rowIndex) => (
              <tr key={row.id}>
                {row.content.map((cell, colIndex) => (
                  <td key={cell.id} style={cell.attrs.background ? { background: cell.attrs.background } : undefined} className={(block.attrs.headerRow && rowIndex === 0) || (block.attrs.headerColumn && colIndex === 0) ? 'se-table-header-cell' : ''}>
                    {colIndex === 0 ? <button type="button" className="se-table-row-insert" aria-label={`Add row after ${rowIndex + 1}`} onClick={() => onTableAction({ type: 'add_table_row', rowIndex })}>+</button> : null}
                    <textarea
                      aria-label={`Table cell ${rowIndex + 1}-${colIndex + 1}`}
                      value={textFromBlock(firstParagraph(cell))}
                      onFocus={() => onChange({ kind: 'table_focus_cell', rowIndex, colIndex })}
                      onChange={(event) => onChange({ kind: 'table_cell_text', rowIndex, colIndex, text: event.target.value })}
                      onKeyDown={(event) => {
                        if (event.key === 'Tab') {
                          event.preventDefault();
                          focusCell(rowIndex, colIndex, event.shiftKey);
                        }
                      }}
                    />
                    {colIndex < row.content.length - 1 ? <span className="se-col-resizer" role="separator" aria-orientation="vertical" onPointerDown={(event) => startColumnResize(event, colIndex)} /> : null}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <button type="button" className="se-table-add-row" aria-label="Add table row visually" onClick={() => onTableAction({ type: 'add_table_row', rowIndex: block.content.length - 1 })}>+</button>
        <button type="button" className="se-table-add-column" aria-label="Add table column visually" onClick={() => onTableAction({ type: 'add_table_column', colIndex: (block.content[0]?.content.length || 1) - 1 })}>+</button>
      </div>
    );
  }

  if (block.type === 'media') {
    return (
      <div className="se-media-edit se-rich-edit">
        <BlockRenderer block={block} adapters={adapters} context={context} />
        <div className="se-media-fields">
          <button type="button" onClick={() => onPickAsset(block.id)}>Pick asset</button>
          <input aria-label="Media asset id" value={block.attrs.assetId || ''} placeholder="Asset ID" onChange={(event) => onChange({ kind: 'media_attr', attr: 'assetId', value: event.target.value || null })} />
          <select aria-label="Media width" value={block.attrs.width || 'full'} onChange={(event) => onChange({ kind: 'media_attr', attr: 'width', value: event.target.value })}>
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="wide">Wide</option>
            <option value="full">Full</option>
          </select>
          <input aria-label="Media alt text" value={block.attrs.alt || ''} placeholder="Alt text" onChange={(event) => onChange({ kind: 'media_attr', attr: 'alt', value: event.target.value })} />
          <input aria-label="Media caption" value={block.attrs.caption || ''} placeholder="Caption" onChange={(event) => onChange({ kind: 'media_attr', attr: 'caption', value: event.target.value })} />
        </div>
      </div>
    );
  }

  return <BlockRenderer block={block} adapters={adapters} context={context} />;
}
