"use strict";

// Independent educational example: process-local event bookkeeping only.
// No provider payloads, signatures, database persistence, or concurrency guarantee.
class EventLedger {
  #deliveries = new Set();
  #subjects = new Map();

  accept(event) {
    if (!event || typeof event !== "object" || Array.isArray(event)) {
      throw new TypeError("Expected an event object.");
    }
    const fields = ["feed", "deliveryId", "scope", "subjectId"];
    for (const field of fields) {
      if (typeof event[field] !== "string" || !event[field].trim() || event[field].length > 80) {
        throw new TypeError(`${field} must contain 1 to 80 characters.`);
      }
    }

    // Delivery identity and business identity answer different questions.
    // Tuple encoding avoids collisions caused by concatenating delimiters.
    const deliveryKey = JSON.stringify([event.feed, event.deliveryId]);
    if (this.#deliveries.has(deliveryKey)) return { status: "duplicate" };

    const subjectKey = JSON.stringify([event.scope, event.subjectId]);
    const previous = this.#subjects.get(subjectKey);
    const record = Object.freeze({
      scope: event.scope,
      subjectId: event.subjectId,
      interactions: (previous?.interactions ?? 0) + 1,
    });
    this.#subjects.set(subjectKey, record);
    this.#deliveries.add(deliveryKey);
    return { status: previous ? "updated" : "created", record };
  }

  get subjectCount() {
    return this.#subjects.size;
  }
}

if (require.main === module) {
  const ledger = new EventLedger();
  const first = { feed: "demo-feed", deliveryId: "event-1", scope: "space-a", subjectId: "sample-1" };
  console.log(ledger.accept(first));
  console.log(ledger.accept(first));
  console.log(ledger.accept({ ...first, deliveryId: "event-2" }));
}

module.exports = { EventLedger };
