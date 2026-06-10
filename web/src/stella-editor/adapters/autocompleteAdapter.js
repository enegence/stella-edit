export function searchCommands(autocompleteAdapter, query, context) {
  return autocompleteAdapter?.searchCommands?.(query, context) || [];
}
