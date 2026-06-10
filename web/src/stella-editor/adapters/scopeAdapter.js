export function referenceVisible(scopeAdapter, reference, context) {
  return Boolean(scopeAdapter?.isReferenceVisible?.(reference, context));
}
