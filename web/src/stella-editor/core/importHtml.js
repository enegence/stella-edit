import { sanitizePaste } from './sanitizePaste';

export function importHtml(html) {
  return sanitizePaste({ html });
}
