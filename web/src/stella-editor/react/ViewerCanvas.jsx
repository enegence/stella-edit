import React from 'react';
import { BlockRenderer } from './BlockRenderer';

export function ViewerCanvas({ doc, adapters, context }) {
  return <>{doc.content.map((block) => <BlockRenderer key={block.id} block={block} adapters={adapters} context={context} />)}</>;
}
