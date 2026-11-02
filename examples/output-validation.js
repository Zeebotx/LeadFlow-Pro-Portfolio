"use strict";

// Independent educational example with an invented review schema.
// Expects parsed JSON. Normalization is not truth checking or HTML sanitization.
const ALLOWED_LABELS = new Set(["needs_context", "ready_for_review", "follow_up"]);

function normalizeReview(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("Expected a parsed JSON object.");
  }
  const warnings = [];
  function boundedNumber(value, min, max, fallback, field) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      warnings.push(`${field}:defaulted`);
      return fallback;
    }
    const bounded = Math.max(min, Math.min(max, value));
    if (bounded !== value) warnings.push(`${field}:clamped`);
    return Math.round(bounded * 100) / 100;
  }

  const rating = boundedNumber(input.rating, 0, 5, 0, "rating");
  const confidence = boundedNumber(input.confidence, 0, 1, 0, "confidence");
  let summary = typeof input.summary === "string" ? input.summary.trim() : "";
  if (!summary) {
    warnings.push("summary:defaulted");
    summary = "Manual review required.";
  }
  const characters = Array.from(summary);
  if (characters.length > 120) {
    warnings.push("summary:truncated");
    summary = characters.slice(0, 120).join("");
  }

  const candidates = Array.isArray(input.labels) ? input.labels : [];
  const labels = [...new Set(candidates.filter(label => ALLOWED_LABELS.has(label)))];
  if (!Array.isArray(input.labels) || labels.length !== candidates.length) warnings.push("labels:normalized");

  // Construct an allowlisted result instead of spreading arbitrary input fields.
  return { value: { rating, confidence, summary, labels }, warnings };
}

if (require.main === module) {
  console.log(normalizeReview({
    rating: 8,
    confidence: "unknown",
    summary: "  An illustrative response needs review.  ",
    labels: ["follow_up", "follow_up", "unrecognized"],
    extraField: "This field is not forwarded.",
  }));
}

module.exports = { normalizeReview };
