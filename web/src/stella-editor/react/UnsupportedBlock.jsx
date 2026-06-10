export function UnsupportedBlock({ block }) {
  return `Unsupported block: ${block?.attrs?.originalType || 'unknown'}`;
}
