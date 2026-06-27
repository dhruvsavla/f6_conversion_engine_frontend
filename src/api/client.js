const BASE = "http://localhost:8000";

// ── Core SSE conversion (existing — unchanged) ────────────────────────────────

export async function convertStream(d0Text, { onStep, onResult, onError } = {}) {
  const response = await fetch(`${BASE}/api/convert/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ d0_text: d0Text }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || `HTTP ${response.status}`);
  }
  return _readSSE(response, { onStep, onResult, onError });
}

export async function convertHexStream(rawBytes, { onStep, onResult, onError } = {}) {
  const response = await fetch(`${BASE}/api/convert/hex/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream" },
    body: rawBytes,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || `HTTP ${response.status}`);
  }
  return _readSSE(response, { onStep, onResult, onError });
}

async function _readSSE(response, { onStep, onResult, onError } = {}) {
  const reader  = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try {
        const event = JSON.parse(line.slice(6));
        if (event.type === "step"   && onStep)   onStep(event.data);
        if (event.type === "result" && onResult)  onResult(event.data);
        if (event.type === "error"  && onError)   onError(event.data.message);
      } catch { /* ignore malformed events */ }
    }
  }
}

// ── In-memory batch (existing — unchanged) ────────────────────────────────────

export async function convertBatch(text) {
  const res = await fetch(`${BASE}/api/convert/batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ d0_text: text }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `HTTP ${res.status}`);
  }
  return (await res.json()).job_id;
}

export async function getBatchStatus(jobId) {
  const res = await fetch(`${BASE}/api/convert/batch/${encodeURIComponent(jobId)}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Samples / rules summary (existing) ───────────────────────────────────────

export async function fetchSample(type = "RETAIL") {
  const res = await fetch(`${BASE}/api/sample?type=${encodeURIComponent(type)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()).d0_text;
}

export async function fetchRulesSummary() {
  const res = await fetch(`${BASE}/api/rules-summary`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── F6 → D.0 Reverse Conversion ──────────────────────────────────────────────

export async function reverseConvert(f6Text, filename = 'manual_f6_input') {
  const res = await fetch(`${BASE}/api/reverse-convert`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ f6_text: f6Text, filename }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchSampleF6(type = "RETAIL") {
  const res = await fetch(`${BASE}/api/sample-f6?type=${encodeURIComponent(type)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();  // { f6_text }
}

// ── Stats ─────────────────────────────────────────────────────────────────────

export async function fetchStats() {
  const res = await fetch(`${BASE}/api/stats`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── History (DB-backed conversions) ──────────────────────────────────────────

export async function listConversions({ limit = 20, offset = 0, status, batch_id } = {}) {
  const params = new URLSearchParams({ limit, offset });
  if (status)   params.set("status", status);
  if (batch_id) params.set("batch_id", batch_id);
  const res = await fetch(`${BASE}/api/conversions?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();   // { items, total, limit, offset }
}

export async function getConversion(conversionId, { segment, change_type, search } = {}) {
  const params = new URLSearchParams();
  if (segment)     params.set("segment", segment);
  if (change_type) params.set("change_type", change_type);
  if (search)      params.set("search", search);
  const qs  = params.toString() ? `?${params}` : "";
  const res = await fetch(`${BASE}/api/conversions/${encodeURIComponent(conversionId)}${qs}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── File-upload batch ─────────────────────────────────────────────────────────

export async function uploadBatch(files) {
  const form = new FormData();
  for (const f of files) form.append("files", f);
  const res = await fetch(`${BASE}/api/batch/upload`, { method: "POST", body: form });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `HTTP ${res.status}`);
  }
  return res.json();   // { batch_id, total_files, status }
}

export async function listBatches({ limit = 20, offset = 0 } = {}) {
  const res = await fetch(`${BASE}/api/batches?limit=${limit}&offset=${offset}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();   // { items }
}

export async function getBatch(batchId) {
  const res = await fetch(`${BASE}/api/batches/${encodeURIComponent(batchId)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();   // { ...batch, conversions: [] }
}

// ── Downloads ─────────────────────────────────────────────────────────────────

export async function downloadConversionFile(conversionId, type = "json") {
  const url = `${BASE}/api/conversions/${encodeURIComponent(conversionId)}/download/${type}`;
  const res  = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const disposition = res.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match ? match[1] : `conversion_${conversionId.slice(0, 8)}.${type}`;
  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ── F6 Validator ──────────────────────────────────────────────────────────────

export async function validateF6(f6Text, ruleSetId = null) {
  const body = { f6_text: f6Text };
  if (ruleSetId) body.rule_set_id = ruleSetId;
  const res = await fetch(`${BASE}/api/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const b = await res.json().catch(() => ({}));
    throw new Error(b.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function listValidations({ limit = 20, offset = 0, status } = {}) {
  const params = new URLSearchParams({ limit, offset });
  if (status) params.set("status", status);
  const res = await fetch(`${BASE}/api/validations?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();  // { items, total, limit, offset }
}

export async function getValidation(validationId) {
  const res = await fetch(`${BASE}/api/validations/${encodeURIComponent(validationId)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── Rules (DB-backed) ─────────────────────────────────────────────────────────

export async function listRuleSets() {
  const res = await fetch(`${BASE}/api/rules/sets`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();   // { items }
}

export async function activateRuleSet(ruleSetId) {
  const res = await fetch(`${BASE}/api/rules/sets/${encodeURIComponent(ruleSetId)}/activate`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function listRules({ ruleSetId, transactionType, segmentId, search } = {}) {
  const params = new URLSearchParams();
  if (ruleSetId)       params.set("rule_set_id", ruleSetId);
  if (transactionType) params.set("transaction_type", transactionType);
  if (segmentId)       params.set("segment_id", segmentId);
  if (search)          params.set("search", search);
  const res = await fetch(`${BASE}/api/rules?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();   // { items }
}

export async function updateRule(ruleId, data) {
  const res = await fetch(`${BASE}/api/rules/${encodeURIComponent(ruleId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function deleteRule(ruleId) {
  const res = await fetch(`${BASE}/api/rules/${encodeURIComponent(ruleId)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
