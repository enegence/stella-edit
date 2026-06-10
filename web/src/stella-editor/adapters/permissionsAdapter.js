export function can(adapter, method, ...args) {
  return adapter?.[method]?.(...args) || { allowed: false, reason: `Missing ${method} adapter.` };
}
