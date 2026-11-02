"use strict";

// Independent educational example: share pending work, not completed results.
// Callers must give different contexts different keys. No HTTP or auth is used.
function createRequestCoordinator() {
  const pending = new Map();

  function run(key, load) {
    if (typeof key !== "string" || !key.trim() || typeof load !== "function") {
      throw new TypeError("Expected a nonempty key and a loader function.");
    }
    if (pending.has(key)) return pending.get(key);

    // Deferring the loader also turns a synchronous throw into a rejection.
    const request = Promise.resolve().then(load);
    pending.set(key, request);
    const cleanup = () => {
      if (pending.get(key) === request) pending.delete(key);
    };
    // Both handlers fulfill their cleanup branch; no ignored rejecting finally.
    request.then(cleanup, cleanup);
    return request;
  }

  return { run, get pendingCount() { return pending.size; } };
}

if (require.main === module) {
  (async () => {
    const coordinator = createRequestCoordinator();
    let executions = 0;
    const load = () => { executions += 1; return { items: 3 }; };
    const first = coordinator.run("space-a:summary", load);
    const second = coordinator.run("space-a:summary", load);
    const results = await Promise.all([first, second]);
    console.log({ sharedPromise: first === second, executions, results });
  })().catch(error => { console.error(error.message); process.exitCode = 1; });
}

module.exports = { createRequestCoordinator };
