let idCounter = 0;

export function createId(prefix = 'block') {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${idCounter.toString(36)}`;
}

export function resetIdCounterForTests() {
  idCounter = 0;
}
