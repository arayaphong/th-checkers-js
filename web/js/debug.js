// Lightweight trace logging for the web UI.
// On by default; toggle at runtime with `setTrace(false)` (exposed on window in index.js).
// Note: uses console.debug — enable the "Verbose"/"Debug" level in your devtools console to see it.
let enabled = true;

export function setTrace(on) {
  enabled = Boolean(on);
  return enabled;
}

export function trace(scope, ...args) {
  if (!enabled) return;
  console.debug(`[trace:${scope}]`, ...args);
}
