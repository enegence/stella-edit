import { normalizeDocument, isSafeUrl } from './normalize';

function visitRawNode(node, path, errors) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'text') {
    for (const [markIndex, mark] of (node.marks || []).entries()) {
      if (mark?.type === 'link' && mark.attrs?.kind === 'external_url' && !isSafeUrl(mark.attrs.href)) {
        errors.push({ path: `${path}.marks.${markIndex}`, message: 'Unsafe external link href' });
      }
    }
  }
  for (const [index, child] of (node.content || []).entries()) {
    visitRawNode(child, `${path}.content.${index}`, errors);
  }
}

function visitBlock(block, path, errors, warnings) {
  if (!block.id) errors.push({ path, message: 'Block is missing id' });
  if (block.type === 'unsupported') warnings.push({ path, message: `Unsupported block: ${block.attrs.originalType}` });
  if (block.type === 'table_row' && !block.content.length) errors.push({ path, message: 'Table row has no cells' });
  if (block.type === 'table_cell' && !block.content.length) errors.push({ path, message: 'Table cell has no content' });

  for (const [index, child] of (block.content || []).entries()) {
    if (child.type === 'text') {
      for (const [markIndex, mark] of (child.marks || []).entries()) {
        if (mark.type === 'link' && mark.attrs?.kind === 'external_url' && !isSafeUrl(mark.attrs.href)) {
          errors.push({ path: `${path}.content.${index}.marks.${markIndex}`, message: 'Unsafe external link href' });
        }
      }
    } else {
      visitBlock(child, `${path}.content.${index}`, errors, warnings);
    }
  }
}

export function validateDocument(doc) {
  const errors = [];
  const warnings = [];
  if (!doc || doc.type !== 'doc') errors.push({ path: 'type', message: 'Root type must be doc' });
  if (!doc || doc.version !== 1) errors.push({ path: 'version', message: 'Unsupported StellaDoc version' });
  if (!Array.isArray(doc?.content)) errors.push({ path: 'content', message: 'Root content must be an array' });
  (doc?.content || []).forEach((block, index) => visitRawNode(block, `content.${index}`, errors));

  const normalized = normalizeDocument(doc);
  normalized.content.forEach((block, index) => visitBlock(block, `content.${index}`, errors, warnings));
  return { valid: errors.length === 0, errors, warnings };
}
