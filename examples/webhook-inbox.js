"use strict";

const crypto = require("node:crypto");
const { transaction } = require("./transaction");

// Adapted from webhookSignature.js and webhookInbox.js. The envelope is invented;
// production provider adapters, credential handling, and enrichment are excluded.
function validSignature(rawBody, signature, secret) {
  if (!Buffer.isBuffer(rawBody) || typeof signature !== "string" ||
      !/^sha256=[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest();
  return crypto.timingSafeEqual(Buffer.from(signature.slice(7), "hex"), expected);
}

async function receive({ pool, secret, provider, rawBody, signature }) {
  if (!secret) return { status: 503 };
  if (!validSignature(rawBody, signature, secret)) return { status: 403 };
  let event;
  try {
    event = JSON.parse(rawBody.toString("utf8"));
    for (const key of ["eventId", "accountId", "message"]) {
      if (typeof event?.[key] !== "string" || !event[key].trim() ||
          event[key].length > 1000) throw new TypeError("Invalid event");
    }
  } catch {
    return { status: 400 };
  }

  try {
    await transaction(pool, async client => {
      await client.query(
        `INSERT INTO webhook_inbox(provider, event_key, account_id, payload)
         VALUES ($1, $2, $3, $4) ON CONFLICT(provider, event_key) DO NOTHING`,
        [provider, JSON.stringify([event.accountId, event.eventId]), event.accountId,
          JSON.stringify({ message: event.message })]
      );
    });
    // A transport adapter can send HTTP 200 here, only after COMMIT succeeds.
    return { status: 200 };
  } catch {
    return { status: 503 };
  }
}

async function connections(db, job) {
  return (await db.query(
    `SELECT id, workspace_id FROM platform_connections
     WHERE provider=$1 AND account_id=$2 AND status='connected'`,
    [job.provider, job.account_id]
  )).rows;
}

async function processNext({ pool, enrich = async payload => payload }) {
  const lease = crypto.randomUUID();
  const { rows: [job] } = await pool.query(
    `UPDATE webhook_inbox SET status='processing', lease_token=$1,
       lease_until=NOW()+INTERVAL '2 minutes', attempts=attempts+1
     WHERE id=(SELECT id FROM webhook_inbox
       WHERE (status='pending' AND next_attempt_at<=NOW()) OR
         (status='processing' AND lease_until<NOW())
       ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING *`, [lease]
  );
  if (!job) return { status: "idle" };

  try {
    const matches = await connections(pool, job);
    if (matches.length !== 1) {
      await pool.query(
        `UPDATE webhook_inbox SET status='quarantined',
         error_code='account_unmapped_or_ambiguous' WHERE id=$1 AND lease_token=$2`,
        [job.id, lease]
      );
      return { status: "quarantined" };
    }
    const connection = matches[0];
    // Provider I/O belongs outside the capture transaction. Tests control this
    // seam to disconnect an account while enrichment is pending.
    const payload = await enrich(job.payload);
    return await transaction(pool, async client => {
      const locked = await client.query(
        `SELECT id FROM webhook_inbox WHERE id=$1 AND lease_token=$2
         AND status='processing' FOR UPDATE`, [job.id, lease]
      );
      if (!locked.rows.length) return { status: "lease_lost" };
      await client.query("LOCK TABLE platform_connections IN SHARE MODE");
      const current = await connections(client, job);
      if (current.length !== 1 || current[0].id !== connection.id ||
          current[0].workspace_id !== connection.workspace_id) {
        throw new Error("connection_changed");
      }
      // Tenant identity comes from the verified connection, never the payload.
      const captured = await client.query(
        `INSERT INTO leads(workspace_id, webhook_event_id, notes)
         VALUES ($1, $2, $3) ON CONFLICT(webhook_event_id) DO NOTHING RETURNING id`,
        [connection.workspace_id, job.id, payload.message]
      );
      await client.query(
        `UPDATE webhook_inbox SET status='completed', lease_until=NULL,
         error_code=NULL WHERE id=$1`, [job.id]
      );
      return { status: "completed", leadId: captured.rows[0]?.id };
    });
  } catch {
    await pool.query(
      `UPDATE webhook_inbox SET status=CASE WHEN attempts>=10 THEN 'failed' ELSE 'pending' END,
       next_attempt_at=NOW()+INTERVAL '1 minute', lease_until=NULL,
       error_code='processing_failed' WHERE id=$1 AND lease_token=$2`, [job.id, lease]
    );
    return { status: "retry_or_failed" };
  }
}

module.exports = { receive, processNext };
