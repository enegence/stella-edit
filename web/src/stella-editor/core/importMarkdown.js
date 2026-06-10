import { createHeadingBlock, createParagraphBlock, createText } from './document';
import { normalizeDocument } from './normalize';

export function importMarkdown(markdown = '') {
  const blocks = String(markdown).split(/\n{2,}/).filter(Boolean).map((chunk) => {
    const heading = chunk.match(/^(#{1,4})\s+(.*)$/);
    if (heading) return createHeadingBlock({ level: heading[1].length, text: heading[2] });
    return createParagraphBlock([createText(chunk)]);
  });
  return normalizeDocument({ version: 1, type: 'doc', content: blocks });
}
