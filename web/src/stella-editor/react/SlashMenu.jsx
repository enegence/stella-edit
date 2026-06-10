import React from 'react';

export const BUILT_IN_COMMANDS = [
  { id: 'paragraph', label: 'Text', type: 'paragraph', description: 'Plain paragraph text' },
  { id: 'heading_1', label: 'Heading 1', type: 'heading', attrs: { level: 1 }, description: 'Large section heading' },
  { id: 'heading_2', label: 'Heading 2', type: 'heading', attrs: { level: 2 }, description: 'Medium section heading' },
  { id: 'heading_3', label: 'Heading 3', type: 'heading', attrs: { level: 3 }, description: 'Small section heading' },
  { id: 'heading_4', label: 'Heading 4', type: 'heading', attrs: { level: 4 }, description: 'Minor heading' },
  { id: 'heading_5', label: 'Heading 5', type: 'heading', attrs: { level: 5 }, description: 'Uppercase label heading' },
  { id: 'heading_6', label: 'Heading 6', type: 'heading', attrs: { level: 6 }, description: 'Smallest label heading' },
  { id: 'bullet_list', label: 'Bullet list', type: 'bullet_list', description: 'Unordered list with bullets' },
  { id: 'ordered_list', label: 'Numbered list', type: 'ordered_list', description: 'Ordered list with numbers' },
  { id: 'task_list', label: 'Task list', type: 'task_list', description: 'Checklist with checkboxes' },
  { id: 'blockquote', label: 'Quote', type: 'blockquote', description: 'Quoted text block' },
  { id: 'code_block', label: 'Code block', type: 'code_block', description: 'Monospace code snippet' },
  { id: 'panel_info', label: 'Info panel', type: 'panel', attrs: { variant: 'info' }, description: 'Highlight useful information' },
  { id: 'panel_note', label: 'Note panel', type: 'panel', attrs: { variant: 'note' }, description: 'Add a side note' },
  { id: 'panel_success', label: 'Success panel', type: 'panel', attrs: { variant: 'success' }, description: 'Call out a positive result' },
  { id: 'panel_warning', label: 'Warning panel', type: 'panel', attrs: { variant: 'warning' }, description: 'Warn about a risk' },
  { id: 'panel_error', label: 'Error panel', type: 'panel', attrs: { variant: 'error' }, description: 'Flag a critical problem' },
  { id: 'divider', label: 'Divider', type: 'divider', description: 'Horizontal rule between sections' },
  { id: 'table', label: 'Table', type: 'table', description: 'Insert a 3x3 table' },
  { id: 'expand', label: 'Expand', type: 'expand', description: 'Collapsible content section' },
  { id: 'status', label: 'Status pill', type: 'status', description: 'Colored status label' },
  { id: 'layout_50_50', label: 'Layout 50/50', type: 'layout', attrs: { variant: '50-50' }, description: 'Two equal columns' },
  { id: 'layout_3_column', label: 'Layout 33/33/33', type: 'layout', attrs: { variant: '33-33-33' }, description: 'Three equal columns' },
  { id: 'layout_70_30', label: 'Layout 70/30', type: 'layout', attrs: { variant: '70-30' }, description: 'Wide and narrow columns' },
  { id: 'media', label: 'Image/media', type: 'media', description: 'Image or file from the host app' }
];

function matchesQuery(command, query) {
  if (!query) return true;
  const haystack = `${command.label} ${command.description || ''} ${command.type}`.toLowerCase();
  return haystack.includes(query.toLowerCase());
}

export function getAllowedCommands(adapters, context, query = '') {
  const builtIns = BUILT_IN_COMMANDS.filter((command) => {
    const allowed = adapters.permissions.canInsertBlock(command.type, context);
    return allowed?.allowed !== false && matchesQuery(command, query);
  });
  const hostCommands = adapters.autocomplete.searchCommands(query, context) || [];
  return [...builtIns, ...hostCommands.filter((command) => command?.id && command?.label && command?.type)];
}

export function SlashMenu({ commands, onSelect, variant = 'slash', activeIndex = 0, style }) {
  return (
    <div className={`se-slash-menu se-${variant}-menu`} role="listbox" style={style}>
      {commands.map((command, index) => (
        <button key={command.id} type="button" aria-label={command.label} data-active={index === activeIndex || undefined} onMouseDown={(event) => event.preventDefault()} onClick={() => onSelect(command)}>
          <span className="se-command-label">{command.label}</span>
          {command.description ? <span className="se-command-description">{command.description}</span> : null}
        </button>
      ))}
    </div>
  );
}
