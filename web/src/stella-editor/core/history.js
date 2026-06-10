export function createHistory(initialDoc) {
  return { past: [], present: initialDoc, future: [] };
}

export function pushHistory(history, nextDoc) {
  return { past: [...history.past, history.present], present: nextDoc, future: [] };
}

export function undo(history) {
  if (!history.past.length) return history;
  const present = history.past[history.past.length - 1];
  return { past: history.past.slice(0, -1), present, future: [history.present, ...history.future] };
}

export function redo(history) {
  if (!history.future.length) return history;
  const present = history.future[0];
  return { past: [...history.past, history.present], present, future: history.future.slice(1) };
}
