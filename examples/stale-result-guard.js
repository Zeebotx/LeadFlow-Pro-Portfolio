"use strict";

// Independent educational example: optimistic revision checks in one process.
// A real database needs an atomic conditional write or equivalent transaction.
function validateText(value) {
  if (typeof value !== "string" || !value.trim() || value.length > 200) {
    throw new TypeError("Expected nonempty text of at most 200 characters.");
  }
  return value.trim();
}

class RevisionedNote {
  #revision = 0;
  #text;
  #summary = null;

  constructor(text) {
    this.#text = validateText(text);
  }

  snapshot() {
    return Object.freeze({ revision: this.#revision, text: this.#text, summary: this.#summary });
  }

  replaceText(text) {
    this.#text = validateText(text);
    this.#summary = null;
    this.#revision += 1;
    return this.snapshot();
  }

  commitSummary(expectedRevision, summary) {
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
      throw new TypeError("Expected a nonnegative revision.");
    }
    const cleanSummary = validateText(summary);
    if (expectedRevision !== this.#revision) return { status: "stale", record: this.snapshot() };

    this.#summary = cleanSummary;
    this.#revision += 1;
    return { status: "applied", record: this.snapshot() };
  }
}

if (require.main === module) {
  const note = new RevisionedNote("A demonstration request needs a summary.");
  const captured = note.snapshot();
  note.replaceText("The request changed while the summary was being prepared.");
  console.log(note.commitSummary(captured.revision, "Summary of the earlier request."));
  const current = note.snapshot();
  console.log(note.commitSummary(current.revision, "Summary of the current request."));
}

module.exports = { RevisionedNote };
