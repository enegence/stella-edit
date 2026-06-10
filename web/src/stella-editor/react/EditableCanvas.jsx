import React from 'react';
import { EditableBlock } from './EditableBlock';

export function EditableCanvas(props) {
  return (
    <>
      {props.doc.content.map((block, index) => (
        <EditableBlock
          key={block.id}
          block={block}
          placeholder={index === 0 ? props.placeholder : ''}
          selected={props.selectedBlockId === block.id}
          readOnly={props.readOnly}
          inputRef={(node) => props.registerInput(block.id, node)}
          adapters={props.adapters}
          context={props.context}
          onFocus={() => props.onFocusBlock(block.id)}
          onTextChange={(text, content) => props.onTextChange(block.id, text, content)}
          onKeyDown={(event, editState) => props.onKeyDown(event, block, editState)}
          onSelectText={props.onSelectText}
          onToolbarAction={(action) => props.onToolbarAction(action, block)}
          onRichBlockChange={props.onRichBlockChange}
          onTableAction={props.onTableAction}
          onPickAsset={props.onPickAsset}
          onDragStart={(event) => props.onDragStart(event, block)}
          onDragOver={(event) => props.onDragOver(event, block)}
          onDrop={(event) => props.onDrop(event, block)}
        />
      ))}
    </>
  );
}
