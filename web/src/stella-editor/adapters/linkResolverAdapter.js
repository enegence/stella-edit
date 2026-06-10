import { isSafeUrl } from '../core';

export function resolveHref(linksAdapter, mark, context) {
  if (mark?.attrs?.kind === 'external_url') return isSafeUrl(mark.attrs.href) ? mark.attrs.href : null;
  const href = linksAdapter?.getHref?.(mark?.attrs?.reference, context);
  return isSafeUrl(href) ? href : null;
}
