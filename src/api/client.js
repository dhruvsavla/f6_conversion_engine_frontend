const BASE = "http://localhost:8000";

/**
 * Stream a D.0 → F6 conversion via SSE.
 * Calls onStep for each agent step event, onResult with the final result.
 * Returns a promise that resolves when the stream closes.
 */
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

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop(); // keep any incomplete line

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try {
        const event = JSON.parse(line.slice(6));
        if (event.type === "step" && onStep) onStep(event.data);
        else if (event.type === "result" && onResult) onResult(event.data);
        else if (event.type === "error" && onError) onError(event.data.message);
      } catch {
        // ignore malformed events
      }
    }
  }
}

export async function fetchSample(type = "RETAIL") {
  const res = await fetch(`${BASE}/api/sample?type=${encodeURIComponent(type)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.d0_text;
}

export async function fetchRulesSummary() {
  const res = await fetch(`${BASE}/api/rules-summary`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
