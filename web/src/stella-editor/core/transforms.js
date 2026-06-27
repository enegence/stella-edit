import { normalizeDocument } from './normalize.js';
import { createId } from './ids.js';

export function cloneDoc(doc) {
  return JSON.parse(JSON.stringify(doc));
}

export function cloneBlockWithNewIds(block) {
  const clone = cloneDoc(block);
  function visit(node) {
    if (node && node.type !== 'text') {
      node.id = createId(node.type || 'block');
      (node.content || []).forEach(visit);
    }
  }
  visit(clone);
  return clone;
}

export function findBlockIndex(doc, blockId) {
  return doc.content.findIndex((block) => block.id === blockId);
}

export function replaceRootBlock(doc, blockId, nextBlock) {
  const next = cloneDoc(doc);
  const index = findBlockIndex(next, blockId);
  if (index >= 0) next.content[index] = nextBlock;
  return normalizeDocument(next);
}
