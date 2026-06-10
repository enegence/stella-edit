import React from 'react';
import { normalizeDocument } from '../core';
import { createDefaultAdapters } from '../adapters/defaultAdapters';
import { ViewerCanvas } from './ViewerCanvas';
import '../styles/stella-editor.css';

export function StellaViewer({ value, context = {}, adapters, className = '', style, onUnsupportedBlock }) {
  const doc = normalizeDocument(value);
  const mergedAdapters = createDefaultAdapters(adapters);
  doc.content.filter((block) => block.type === 'unsupported').forEach((block) => onUnsupportedBlock?.(block));
  return (
    <article className={`stella-viewer ${className}`} style={style}>
      <ViewerCanvas doc={doc} adapters={mergedAdapters} context={context} />
    </article>
  );
}
