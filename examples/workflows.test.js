"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { PGlite } = require("@electric-sql/pglite");
const { receive, processNext } = require("./webhook-inbox");
const { scoreLead } = require("./lead-scoring");

// These values are synthetic fixtures, not provider credentials or real enquiries.
const secret = "synthetic-test-signing-key";
const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");

async function fixture(t) {
  const db = new PGlite();
  await db.exec(schema);
  t.after(() => db.close());
  const query = (sql, params) => db.query(sql, params);
  // PGlite runs one embedded session. This adapter exercises the pg-style client
  // lifecycle, not pg pool scheduling or concurrent PostgreSQL worker processes.
  const pool = { query, connect: async () => ({ query, release() {} }) };
  return { db, pool };
}

function request(pool, overrides = {}) {
  const rawBody = Buffer.from(JSON.stringify({
    eventId: "event-1", accountId: "account-a", message: "Synthetic enquiry.",
    workspaceId: 999, // Deliberately untrusted: tenant routing must ignore it.
    ...overrides
  }));
  const signature = "sha256=" + crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return { pool, secret, provider: "demo", rawBody, signature };
}

async function connect(pool, workspace = 10) {
  await pool.query(
    "INSERT INTO platform_connections(provider,account_id,workspace_id) VALUES ('demo','account-a',$1)",
    [workspace]
  );
}

async function lead(pool) {
  return (await pool.query(
    "INSERT INTO leads(workspace_id,notes) VALUES (10,'Synthetic enquiry.') RETURNING id"
  )).rows[0].id;
}

async function count(pool, table) {
  // table is test-owned, never request input.
  return (await pool.query(`SELECT COUNT(*)::int AS count FROM ${table}`)).rows[0].count;
}

const evaluation = () => ({ final_score: 62, ai_score_status: "completed", reasoning: "Synthetic model result." });

function pendingEvaluation() {
  let ready, resolve;
  const started = new Promise(yes => { ready = yes; });
  const result = new Promise(yes => { resolve = yes; });
  return { started, resolve, evaluateLead: () => { ready(); return result; } };
}

test("webhook: signature covers original bytes; tampering and missing secrets fail closed", async t => {
  const { pool } = await fixture(t);
  const original = request(pool);
  assert.equal((await receive({ ...original, rawBody: Buffer.concat([original.rawBody, Buffer.from(" ")]) })).status, 403);
  assert.equal((await receive({ ...original, signature: "sha256=not-hex" })).status, 403);
  assert.equal((await receive({ ...original, secret: "" })).status, 503);
  assert.equal(await count(pool, "webhook_inbox"), 0);
});

test("webhook: receipt commits before acknowledgement; redelivery captures one correctly scoped lead", async t => {
  const { pool } = await fixture(t);
  await connect(pool);
  const commands = [];
  const traced = { ...pool, connect: async () => ({
    query: async (sql, params) => { commands.push(sql); return pool.query(sql, params); },
    release() { commands.push("RELEASE"); }
  }) };
  assert.equal((await receive(request(traced))).status, 200);
  assert.deepEqual(commands.slice(-2), ["COMMIT", "RELEASE"]);
  assert.equal(await count(pool, "leads"), 0);
  assert.equal((await receive(request(pool))).status, 200);
  assert.equal(await count(pool, "webhook_inbox"), 1);
  const captured = await processNext({ pool });
  assert.equal(captured.status, "completed");
  assert.equal((await pool.query("SELECT workspace_id FROM leads")).rows[0].workspace_id, 10);
  assert.equal((await processNext({ pool })).status, "idle");
  const scored = await scoreLead({ pool, leadId: captured.leadId, workspaceId: 10, evaluateLead: evaluation });
  assert.equal(scored.effectiveScore, 62);
  assert.equal(await count(pool, "lead_scores"), 1);
});

test("webhook: insert or commit failure returns a retryable response and stores no event", async t => {
  const { pool } = await fixture(t);
  for (const failOn of ["INSERT INTO webhook_inbox", "COMMIT"]) {
    const failing = { ...pool, connect: async () => ({
      query: (sql, params) => {
        if (sql.includes(failOn)) throw new Error("Synthetic persistence failure");
        return pool.query(sql, params);
      }, release() {}
    }) };
    assert.equal((await receive(request(failing))).status, 503);
    assert.equal(await count(pool, "webhook_inbox"), 0);
  }
});

test("webhook: absent and ambiguous account mappings are quarantined", async t => {
  const { pool } = await fixture(t);
  await receive(request(pool));
  assert.equal((await processNext({ pool })).status, "quarantined");
  await connect(pool, 10);
  await connect(pool, 20);
  await receive(request(pool, { eventId: "event-2" }));
  assert.equal((await processNext({ pool })).status, "quarantined");
  assert.equal(await count(pool, "leads"), 0);
});

test("webhook: account move during enrichment cannot capture using obsolete routing", async t => {
  const { pool } = await fixture(t);
  await connect(pool);
  await receive(request(pool));
  const outcome = await processNext({ pool, enrich: async payload => {
    await pool.query("UPDATE platform_connections SET workspace_id=20");
    return payload;
  } });
  assert.equal(outcome.status, "retry_or_failed");
  assert.equal(await count(pool, "leads"), 0);
  assert.equal((await pool.query("SELECT status FROM webhook_inbox")).rows[0].status, "pending");
});

test("webhook: failure after lead insertion rolls capture back; retry completes once", async t => {
  const { pool } = await fixture(t);
  await connect(pool);
  await receive(request(pool));
  const failing = { ...pool, connect: async () => ({
    query: (sql, params) => {
      if (sql.includes("status='completed'")) throw new Error("Synthetic completion failure");
      return pool.query(sql, params);
    }, release() {}
  }) };
  assert.equal((await processNext({ pool: failing })).status, "retry_or_failed");
  assert.equal(await count(pool, "leads"), 0);
  await pool.query("UPDATE webhook_inbox SET next_attempt_at=NOW()");
  assert.equal((await processNext({ pool })).status, "completed");
  assert.equal(await count(pool, "leads"), 1);
});

test("webhook: expired lease is reclaimable and duplicate business capture is constrained", async t => {
  const { pool } = await fixture(t);
  await connect(pool);
  await receive(request(pool));
  await pool.query("UPDATE webhook_inbox SET status='processing',lease_until=NOW()-INTERVAL '1 second'");
  assert.equal((await processNext({ pool })).status, "completed");
  // Simulate reprocessing a completed event: the unique inbox FK prevents a
  // second lead even if the event's processing state is reset.
  await pool.query("UPDATE webhook_inbox SET status='pending',next_attempt_at=NOW()");
  assert.equal((await processNext({ pool })).status, "completed");
  assert.equal(await count(pool, "leads"), 1);
});

test("webhook: a superseded lease cannot commit capture", async t => {
  const { pool } = await fixture(t);
  await connect(pool);
  await receive(request(pool));
  const outcome = await processNext({ pool, enrich: async payload => {
    await pool.query("UPDATE webhook_inbox SET lease_token=$1", [crypto.randomUUID()]);
    return payload;
  } });
  assert.equal(outcome.status, "lease_lost");
  assert.equal(await count(pool, "leads"), 0);
});

test("webhook: repeated processing failures reach the terminal failed state", async t => {
  const { pool } = await fixture(t);
  await connect(pool);
  await receive(request(pool));
  await pool.query("UPDATE webhook_inbox SET attempts=9");
  await processNext({ pool, enrich: async () => { throw new Error("Synthetic provider failure"); } });
  assert.equal((await pool.query("SELECT status FROM webhook_inbox")).rows[0].status, "failed");
});

test("scoring: changed content while evaluation is pending rejects the obsolete result", async t => {
  const { pool } = await fixture(t);
  const leadId = await lead(pool);
  const model = pendingEvaluation();
  const scoring = scoreLead({ pool, leadId, workspaceId: 10, evaluateLead: model.evaluateLead });
  await model.started;
  await pool.query("UPDATE leads SET notes='Changed enquiry' WHERE id=$1", [leadId]);
  model.resolve(evaluation());
  assert.equal((await scoring).status, "stale");
  assert.equal(await count(pool, "lead_scores"), 0);
});

test("scoring: an override entered during evaluation remains the effective score", async t => {
  const { pool } = await fixture(t);
  const leadId = await lead(pool);
  const model = pendingEvaluation();
  const scoring = scoreLead({ pool, leadId, workspaceId: 10, evaluateLead: model.evaluateLead });
  await model.started;
  await pool.query("UPDATE leads SET manual_score_override=94,effective_score=94 WHERE id=$1", [leadId]);
  model.resolve(evaluation());
  const outcome = await scoring;
  assert.equal(outcome.finalScore, 62);
  assert.equal(outcome.effectiveScore, 94);
  assert.equal((await pool.query("SELECT final_score FROM lead_scores")).rows[0].final_score, 62);
});

test("scoring: a workspace move during evaluation invalidates the result", async t => {
  const { pool } = await fixture(t);
  const leadId = await lead(pool);
  const model = pendingEvaluation();
  const scoring = scoreLead({ pool, leadId, workspaceId: 10, evaluateLead: model.evaluateLead });
  await model.started;
  await pool.query("UPDATE leads SET workspace_id=20 WHERE id=$1", [leadId]);
  model.resolve(evaluation());
  assert.equal((await scoring).status, "stale");
  assert.equal(await count(pool, "lead_scores"), 0);
});

test("scoring: wrong workspace never reaches evaluator; unchanged input skips another evaluation", async t => {
  const { pool } = await fixture(t);
  const leadId = await lead(pool);
  let calls = 0;
  const evaluateLead = () => { calls++; return evaluation(); };
  assert.equal((await scoreLead({ pool, leadId, workspaceId: 20, evaluateLead })).status, "not_found");
  assert.equal(calls, 0);
  await scoreLead({ pool, leadId, workspaceId: 10, evaluateLead });
  assert.equal((await scoreLead({ pool, leadId, workspaceId: 10, evaluateLead })).status, "skipped_unchanged");
  assert.equal(calls, 1);
});

test("scoring: score-write failure rolls back its audit row too", async t => {
  const { pool } = await fixture(t);
  const leadId = await lead(pool);
  const failing = { ...pool, connect: async () => ({
    query: (sql, params) => {
      if (sql.includes("UPDATE leads SET lead_score")) throw new Error("Synthetic score-write failure");
      return pool.query(sql, params);
    }, release() {}
  }) };
  await assert.rejects(scoreLead({ pool: failing, leadId, workspaceId: 10, evaluateLead: evaluation }), /Synthetic/);
  assert.equal(await count(pool, "lead_scores"), 0);
  assert.equal((await pool.query("SELECT effective_score FROM leads")).rows[0].effective_score, null);
});

test("scoring: invalid evaluation is rejected before any audit or score write", async t => {
  const { pool } = await fixture(t);
  const leadId = await lead(pool);
  await assert.rejects(scoreLead({ pool, leadId, workspaceId: 10,
    evaluateLead: async () => ({ ...evaluation(), final_score: Infinity }) }), /normalized/);
  assert.equal(await count(pool, "lead_scores"), 0);
});
