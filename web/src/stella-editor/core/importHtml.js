import { sanitizePaste } from './sanitizePaste.js';

export function importHtml(html) {
  return sanitizePaste({ html });
}
