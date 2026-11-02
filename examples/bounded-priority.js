"use strict";

// Independent educational example. These invented rules are not LeadFlow's policy.
// Pure calculation: no application imports, network, credentials, or stored data.
function calculatePriority(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("Expected a signal object.");
  }

  const {
    contactable = false,
    confirmedNeed = false,
    daysToStart = null,
    touchpoints = 0,
  } = input;

  if (typeof contactable !== "boolean" || typeof confirmedNeed !== "boolean") {
    throw new TypeError("Contact and need signals must be booleans.");
  }
  if (daysToStart !== null && (!Number.isInteger(daysToStart) || daysToStart < 0 || daysToStart > 365)) {
    throw new RangeError("daysToStart must be null or an integer from 0 to 365.");
  }
  if (!Number.isSafeInteger(touchpoints) || touchpoints < 0) {
    throw new RangeError("touchpoints must be a nonnegative safe integer.");
  }

  const breakdown = {
    contact: contactable ? 20 : 0,
    need: confirmedNeed ? 35 : 0,
    timing: daysToStart === null ? 0 : daysToStart <= 14 ? 25 : daysToStart <= 45 ? 10 : 0,
    engagement: Math.min(touchpoints, 4) * 5,
  };
  const total = Object.values(breakdown).reduce((sum, points) => sum + points, 0);
  return { score: Math.min(100, Math.max(0, total)), breakdown };
}

if (require.main === module) {
  const result = calculatePriority({
    contactable: true,
    confirmedNeed: true,
    daysToStart: 21,
    touchpoints: 2,
  });
  console.log("Illustrative priority:", result);
}

module.exports = { calculatePriority };
