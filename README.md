# F6 Conversion Engine — Frontend

React frontend for the NCPDP Telecommunications Standard **D.0 → F6** agentic conversion engine. Built for the Hexaware Life Sciences SCION onboarding accelerator.

## What it does

- Paste or drag-and-drop a D.0 transaction, load one of 10 built-in sample scenarios
- Watches the 8-step backend agent pipeline execute in real time via SSE
- Shows a side-by-side inline diff of D.0 input vs. F6 output with per-field colour coding
- Displays validation findings, a filterable audit table, and a live rules library browser

## Screenshots

```
Sidebar layout
├── Convert page
│   ├── Pipeline stepper (8 live steps)
│   ├── Side-by-side D.0 / F6 diff panel
│   ├── Validation findings
│   ├── Audit summary bar (filter by change type)
│   └── Audit table (every field decision)
└── Rules page (live rules library from backend)
```

## Stack

- React 19 (Create React App)
- React Router v7
- Fetch + ReadableStream for SSE (POST-based, not EventSource)
- No UI library — custom CSS design system

## Setup

```bash
npm install
```

Requires the backend running on `http://localhost:8000`. See [f6_conversion_engine_backend](../f6_conversion_engine_backend).

## Run

```bash
npm start
```

Opens at [http://localhost:3000](http://localhost:3000).

## Build for production

```bash
npm run build
```

## Project structure

```
src/
  api/
    client.js          fetch wrapper — convertStream, fetchSample, fetchRulesSummary
  components/
    InputPanel.jsx     Textarea, drag-and-drop, sample loader
    PipelineSteps.jsx  Live 8-step SSE stepper
    OutputPanel.jsx    Side-by-side D.0 / F6 diff with inline field highlighting
    AuditSummaryBar.jsx Summary chips (added / transformed / modified / carried / removed)
    AuditTable.jsx     Filterable field-decision table
    ValidationFindings.jsx WARN / REJECT findings list
    DownloadBar.jsx    Download F6 output and change report (JSON)
    TransactionBadge.jsx Transaction type pill
    RulesPage.jsx      Live rules library — expandable per-transaction cards
  styles/
    global.css         Design system (CSS variables, layout, diff colour classes)
  App.js               Sidebar shell + routing (Convert / Rules)
  index.js             React entry point
```

## Diff colour coding

| Colour | Change type | Meaning |
|--------|------------|---------|
| Green | added | New F6 field, no D.0 equivalent |
| Amber | transformed | Value changed by a named transform (e.g. BIN → IIN pad) |
| Purple | modified | Same field, expanded code set in F6 |
| Red strikethrough | removed | D.0 field deprecated in F6 |
| Grey | carried | Passed through unchanged |

## Sample scenarios

| Scenario | Transaction code | Key features |
|----------|-----------------|--------------|
| Retail pharmacy claim | B1 | Baseline case, all core segments |
| Specialty / high cost therapy | B1 | High-cost drug, REMS and SP indicator |
| Controlled substance | B1 | DUR segment, prescriber traceability |
| Coordination of benefits | B1 + COB | Legacy BIN removed, COB restructured |
| Claim reversal | B2 | Key fields only, no new F6 fields added |
| Compound prescription | B1 + CMP | CMP segment, expanded ingredient handling |
| Long-term care | B1 | Patient residence, FAC segment |
| Medicare Part D | B1 | Group ID prefix detection |
| Eligibility verification | E1 | Minimal HDR / INS / PAT |
| Prior authorization | PA | PA segment |
