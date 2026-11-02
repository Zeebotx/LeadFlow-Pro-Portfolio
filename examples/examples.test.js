"use strict";

// Synthetic fixtures only. Built-in Node assertions; no application dependencies.
const test = require("node:test");
const assert = require("node:assert/strict");
const { calculatePriority } = require("./bounded-priority");
const { EventLedger } = require("./event-idempotency");
const { RevisionedNote } = require("./stale-result-guard");
const { createRequestCoordinator } = require("./request-coordinator");
const { normalizeReview } = require("./output-validation");

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

test("priority: incomplete signals stay neutral; explicit signals remain bounded", () => {
  assert.equal(calculatePriority().score, 0);
  assert.equal(calculatePriority({ contactable: true, confirmedNeed: true, daysToStart: 21, touchpoints: 2 }).score, 75);
  assert.equal(calculatePriority({ contactable: true, confirmedNeed: true, daysToStart: 0, touchpoints: Number.MAX_SAFE_INTEGER }).score, 100);
});

test("priority: malformed signals cannot silently become positive evidence", () => {
  for (const value of [null, [], { contactable: "yes" }, { daysToStart: -1 }, { daysToStart: Infinity }, { touchpoints: 1.5 }]) {
    assert.throws(() => calculatePriority(value));
  }
});

test("priority: extra interactions saturate and calculation does not mutate input", () => {
  const input = Object.freeze({ touchpoints: 4 });
  assert.deepEqual(calculatePriority(input), calculatePriority({ touchpoints: 400 }));
  assert.equal(input.touchpoints, 4);
});

const event = { feed: "feed-a", deliveryId: "event-1", scope: "space-a", subjectId: "sample-1" };
test("events: redelivery has no additional business effect", () => {
  const ledger = new EventLedger();
  const first = ledger.accept(event);
  assert.equal(first.status, "created");
  assert.equal(ledger.accept({ ...event }).status, "duplicate");
  const followUp = ledger.accept({ ...event, deliveryId: "event-2" });
  assert.equal(followUp.record.interactions, 2);
  assert.equal(first.record.interactions, 1);
  assert.equal(ledger.subjectCount, 1);
});

test("events: independent feeds can reuse delivery IDs", () => {
  const ledger = new EventLedger();
  ledger.accept(event);
  assert.equal(ledger.accept({ ...event, feed: "feed-b" }).record.interactions, 2);
});

test("events: business identity is scoped, even when subject IDs match", () => {
  const ledger = new EventLedger();
  ledger.accept(event);
  const other = ledger.accept({ ...event, deliveryId: "event-2", scope: "space-b" });
  assert.equal(other.status, "created");
  assert.equal(other.record.interactions, 1);
  assert.equal(ledger.subjectCount, 2);
});

test("events: tuple keys avoid delimiter collisions", () => {
  const ledger = new EventLedger();
  ledger.accept({ ...event, feed: "a:b", deliveryId: "c" });
  assert.equal(ledger.accept({ ...event, feed: "a", deliveryId: "b:c" }).status, "updated");
});

test("events: validation failure does not consume delivery identity", () => {
  const ledger = new EventLedger();
  assert.throws(() => ledger.accept({ ...event, scope: "" }));
  assert.equal(ledger.accept(event).status, "created");
});

test("revisions: a current result is accepted once", () => {
  const note = new RevisionedNote("Original demonstration text.");
  const snapshot = note.snapshot();
  assert.equal(note.commitSummary(snapshot.revision, "Current summary.").status, "applied");
  assert.equal(note.commitSummary(snapshot.revision, "Another old result.").status, "stale");
  assert.equal(note.snapshot().summary, "Current summary.");
});

test("revisions: an edit during asynchronous work prevents an old commit", async () => {
  const note = new RevisionedNote("Earlier text.");
  const snapshot = note.snapshot();
  const job = deferred();
  const completion = job.promise.then(summary => note.commitSummary(snapshot.revision, summary));
  note.replaceText("Updated text.");
  job.resolve("Summary based on earlier text.");
  assert.equal((await completion).status, "stale");
  assert.deepEqual(note.snapshot(), { revision: 1, text: "Updated text.", summary: null });
});

test("revisions: a newer committed result survives an older completion", () => {
  const note = new RevisionedNote("First request.");
  const old = note.snapshot();
  const current = note.replaceText("Second request.");
  note.commitSummary(current.revision, "Latest summary.");
  assert.equal(note.commitSummary(old.revision, "Obsolete summary.").status, "stale");
  assert.equal(note.snapshot().summary, "Latest summary.");
});

test("revisions: invalid changes leave the record unchanged", () => {
  const note = new RevisionedNote("Valid text.");
  const before = note.snapshot();
  assert.throws(() => note.replaceText(""));
  assert.throws(() => note.commitSummary(-1, "Invalid revision."));
  assert.deepEqual(note.snapshot(), before);
});

test("requests: identical pending work shares one promise and one execution", async () => {
  const coordinator = createRequestCoordinator();
  const job = deferred();
  let executions = 0;
  const load = () => { executions += 1; return job.promise; };
  const first = coordinator.run("space-a:summary", load);
  const second = coordinator.run("space-a:summary", load);
  assert.equal(first, second);
  await Promise.resolve();
  assert.equal(executions, 1);
  job.resolve({ count: 3 });
  assert.deepEqual(await first, { count: 3 });
  assert.equal(coordinator.pendingCount, 0);
});

test("requests: distinct contexts never share a pending result", async () => {
  const coordinator = createRequestCoordinator();
  const first = coordinator.run("space-a:summary", () => "a");
  const second = coordinator.run("space-b:summary", () => "b");
  assert.notEqual(first, second);
  assert.deepEqual(await Promise.all([first, second]), ["a", "b"]);
});

test("requests: rejection is shared, cleaned up, and can be retried", async () => {
  const coordinator = createRequestCoordinator();
  const job = deferred();
  const first = coordinator.run("sample", () => job.promise);
  const second = coordinator.run("sample", () => "should not execute");
  const failed = Promise.allSettled([first, second]);
  job.reject(new Error("Synthetic failure"));
  assert.deepEqual((await failed).map(result => result.status), ["rejected", "rejected"]);
  assert.equal(coordinator.pendingCount, 0);
  assert.equal(await coordinator.run("sample", () => "recovered"), "recovered");
});

test("requests: synchronous loader errors do not leave a stuck entry", async () => {
  const coordinator = createRequestCoordinator();
  await assert.rejects(coordinator.run("sample", () => { throw new Error("Synthetic error"); }), /Synthetic error/);
  assert.equal(coordinator.pendingCount, 0);
});

test("requests: settled results are not cached", async () => {
  const coordinator = createRequestCoordinator();
  let executions = 0;
  const load = () => ++executions;
  assert.equal(await coordinator.run("sample", load), 1);
  assert.equal(await coordinator.run("sample", load), 2);
});

test("output: invalid top-level values are rejected", () => {
  for (const value of [null, [], "text", 3]) assert.throws(() => normalizeReview(value));
});

test("output: finite numbers are bounded and rounding is explicit", () => {
  const { value, warnings } = normalizeReview({ rating: 8, confidence: -2, summary: "Review.", labels: [] });
  assert.equal(value.rating, 5);
  assert.equal(value.confidence, 0);
  assert.ok(warnings.includes("rating:clamped"));
  assert.equal(normalizeReview({ rating: 3.456 }).value.rating, 3.46);
});

test("output: numeric strings, nonfinite values and missing fields use neutral defaults", () => {
  for (const rating of ["5", Infinity, NaN, null]) assert.equal(normalizeReview({ rating }).value.rating, 0);
  assert.equal(normalizeReview({}).value.confidence, 0);
  assert.equal(normalizeReview({}).value.summary, "Manual review required.");
});

test("output: labels are allowlisted, unique and independent of extra fields", () => {
  const result = normalizeReview({ labels: ["follow_up", "unknown", "follow_up", null], extraField: "omitted" });
  assert.deepEqual(result.value.labels, ["follow_up"]);
  assert.deepEqual(Object.keys(result.value).sort(), ["confidence", "labels", "rating", "summary"]);
});

test("output: long Unicode text is bounded without splitting characters", () => {
  const result = normalizeReview({ summary: "🌱".repeat(130) });
  assert.equal(Array.from(result.value.summary).length, 120);
  assert.ok(result.warnings.includes("summary:truncated"));
});

test("output: caller-owned data is not mutated", () => {
  const input = Object.freeze({ rating: 10, labels: Object.freeze(["follow_up", "follow_up"]) });
  normalizeReview(input);
  assert.equal(input.rating, 10);
  assert.equal(input.labels.length, 2);
});
