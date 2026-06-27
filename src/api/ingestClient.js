const BASE = "http://localhost:8000";

/**
 * Upload a PDF and start an extraction job.
 * Returns { job_id, pdf_name }.
 */
export async function uploadPdf({ file, transactionType, segment, dryRun, model }) {
  const form = new FormData();
  form.append("pdf", file);
  form.append("transaction_type", transactionType || "RETAIL");
  form.append("segment", segment || "");
  form.append("dry_run", dryRun ? "true" : "false");
  form.append("model", model || "claude-sonnet-4-6");

  const res = await fetch(`${BASE}/api/ingest/upload`, { method: "POST", body: form });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

/** Poll the current state of an ingestion job. */
export async function getIngestStatus(jobId) {
  const res = await fetch(`${BASE}/api/ingest/status/${encodeURIComponent(jobId)}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

/** Get the diff between ingestion_output/ and rules/. */
export async function getReview() {
  const res = await fetch(`${BASE}/api/ingest/review`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();  // { diff: "..." }
}

/** Promote ingestion_output/ to rules/. */
export async function promote() {
  const res = await fetch(`${BASE}/api/ingest/promote`, { method: "POST" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `HTTP ${res.status}`);
  }
  return res.json();  // { promoted: [...], count: N }
}

/** Return flagged_for_review.json contents. */
export async function getFlagged() {
  const res = await fetch(`${BASE}/api/ingest/flagged`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();  // { flagged: [...] }
}
