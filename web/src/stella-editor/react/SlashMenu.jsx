import React from 'react';

export const BUILT_IN_COMMANDS = [
  { id: 'paragraph', label: 'Text', type: 'paragraph' },
  { id: 'heading_1', label: 'Heading 1', type: 'heading', attrs: { level: 1 } },
  { id: 'heading_2', label: 'Heading 2', type: 'heading', attrs: { level: 2 } },
  { id: 'heading_3', label: 'Heading 3', type: 'heading', attrs: { level: 3 } },
  { id: 'heading_4', label: 'Heading 4', type: 'heading', attrs: { level: 4 } },
  { id: 'heading_5', label: 'Heading 5', type: 'heading', attrs: { level: 5 } },
  { id: 'heading_6', label: 'Heading 6', type: 'heading', attrs: { level: 6 } },
  { id: 'bullet_list', label: 'Bullet list', type: 'bullet_list' },
  { id: 'ordered_list', label: 'Numbered list', type: 'ordered_list' },
  { id: 'task_list', label: 'Task list', type: 'task_list' },
  { id: 'blockquote', label: 'Quote', type: 'blockquote' },
  { id: 'code_block', label: 'Code block', type: 'code_block' },
  { id: 'panel_info', label: 'Info panel', type: 'panel', attrs: { variant: 'info' } },
  { id: 'panel_note', label: 'Note panel', type: 'panel', attrs: { variant: 'note' } },
  { id: 'panel_success', label: 'Success panel', type: 'panel', attrs: { variant: 'success' } },
  { id: 'panel_warning', label: 'Warning panel', type: 'panel', attrs: { variant: 'warning' } },
  { id: 'panel_error', label: 'Error panel', type: 'panel', attrs: { variant: 'error' } },
  { id: 'divider', label: 'Divider', type: 'divider' },
  { id: 'table', label: 'Table', type: 'table' },
  { id: 'expand', label: 'Expand', type: 'expand' },
  { id: 'status', label: 'Status pill', type: 'status' },
  { id: 'layout_50_50', label: 'Layout 50/50', type: 'layout', attrs: { variant: '50-50' } },
  { id: 'layout_3_column', label: 'Layout 33/33/33', type: 'layout', attrs: { variant: '33-33-33' } },
  { id: 'layout_70_30', label: 'Layout 70/30', type: 'layout', attrs: { variant: '70-30' } },
  { id: 'media', label: 'Image/media', type: 'media' }
];

export function getAllowedCommands(adapters, context, query = '') {
  const builtIns = BUILT_IN_COMMANDS.filter((command) => {
    const allowed = adapters.permissions.canInsertBlock(command.type, context);
    return allowed?.allowed !== false && command.label.toLowerCase().includes(query.toLowerCase());
  });
  const hostCommands = adapters.autocomplete.searchCommands(query, context) || [];
  return [...builtIns, ...hostCommands.filter((command) => command?.id && command?.label && command?.type)];
}

export function SlashMenu({ commands, onSelect, variant = 'slash', activeIndex = 0 }) {
  return (
    <div className={`se-slash-menu se-${variant}-menu`} role="listbox">
      {commands.map((command, index) => (
        <button key={command.id} type="button" data-active={index === activeIndex || undefined} onMouseDown={(event) => event.preventDefault()} onClick={() => onSelect(command)}>
          {command.label}
        </button>
      ))}
    </div>
  );
}
