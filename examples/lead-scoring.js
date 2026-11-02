"use strict";

const crypto = require("node:crypto");
const { transaction } = require("./transaction");

// Adapted from ScoringQueue.executeJob. The evaluator represents the existing
// deterministic/Gemini service boundary; it is injected, not reimplemented here.
// The reduced schema hashes notes only. Production hashes more scoring fields.
function contentHash(lead) {
  return crypto.createHash("sha256").update(lead.notes).digest("hex");
}

async function scoreLead({ pool, leadId, workspaceId, evaluateLead }) {
  const { rows: [snapshot] } = await pool.query(
    "SELECT * FROM leads WHERE id=$1 AND workspace_id=$2", [leadId, workspaceId]
  );
  if (!snapshot) return { status: "not_found" };
  const hash = contentHash(snapshot);
  if (snapshot.last_scored_hash === hash) return { status: "skipped_unchanged" };

  // No write transaction is open during external model work. In the application,
  // evaluateLeadWithGemini builds its minimized payload and normalizes the result.
  const result = await evaluateLead(snapshot);
  if (!Number.isFinite(result.final_score) || result.final_score < 0 ||
      result.final_score > 100 || typeof result.reasoning !== "string" ||
      !["completed", "failed", "skipped"].includes(result.ai_score_status)) {
    throw new TypeError("Expected a bounded, normalized evaluation result");
  }

  return transaction(pool, async client => {
    const { rows: [current] } = await client.query(
      "SELECT * FROM leads WHERE id=$1 FOR UPDATE", [leadId]
    );
    if (!current || current.workspace_id !== snapshot.workspace_id ||
        contentHash(current) !== hash) return { status: "stale" };

    const audit = await client.query(
      `INSERT INTO lead_scores(lead_id, final_score, ai_score_status, reasoning)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [leadId, Math.round(result.final_score), result.ai_score_status, result.reasoning]
    );
    const { rows: [updated] } = await client.query(
      `UPDATE leads SET lead_score=COALESCE(manual_score_override, $1),
       effective_score=COALESCE(manual_score_override, $1),
       ai_score_status=$2, last_scored_hash=$3 WHERE id=$4 RETURNING effective_score`,
      [Math.round(result.final_score), result.ai_score_status, hash, leadId]
    );
    return { status: "completed", auditId: audit.rows[0].id,
      finalScore: Math.round(result.final_score), effectiveScore: updated.effective_score };
  });
}

module.exports = { scoreLead };
