# Sokratik Math Tutor

An interactive, client-side, AI-powered Socratic math tutor — bilingual (English/Turkish),
built with plain HTML, CSS, and JavaScript, deployable to GitHub Pages with no backend
required for Phase 1.

## Live demo

Hosted via GitHub Pages: see the repository's **About** section / GitHub Pages settings for the URL.

## Current scope (Phase 1)

- Socratic coaching persona: never gives direct answers; guides through scaffolding questions.
- Three-phase pagination: **Concept Introduction → Guided Practice → Mini-Test**, with an
  explicit phase-transition message each time the learner advances (see `startPhase()` in `app.js`).
- Bilingual UI and tutoring content (English / Turkish), toggled from the header.
- Progress (chat history, phase, language) persisted in `localStorage`; returning users are
  welcomed back where they left off.
- LaTeX rendering for equations via [KaTeX](https://katex.org/) (auto-render on `$...$` / `$$...$$`).
- A "Dynamic Visual Verification" flow that asks the learner to predict a graph transformation
  before checking it in an external interactive graphing tool / dynamic geometry software.
  Tool references are intentionally generic (no commercial brand names) to avoid brand bias.
- Turkish content strictly uses the project's required terminology: *istem*, *öğrenme çıktıları*,
  *yönerge*, *veri kümeleri* (see the comments and strings in `app.js`).

## Architecture

- `index.html` — page structure and CDN includes (KaTeX).
- `style.css` — visual design, responsive layout, light/dark support.
- `app.js` — state management, i18n, phase machine, rendering, and the AI response seam.

The Socratic replies in Phase 1 are **mocked** with canned, phase-appropriate prompts so the
whole flow is demoable without a backend. The integration point for real AI logic is clearly
marked in `app.js`:

```js
function generateAIResponse(userInput) {
  // TODO(real-AI-integration): replace this body with a call to an AI backend
  // that is grounded in the Sources directory (RAG over the instructional
  // PDFs/Docs) and returns Socratic, non-answer-giving scaffolding text.
}
```

The `TOPICS` and `MOCK_CONTENT` structures are dictionaries keyed by topic id, so adding new
grade levels or concepts later does not require restructuring the app — only adding new entries.

## Running locally

No build step. Just open `index.html` in a browser, or serve the folder statically, e.g.:

```bash
python3 -m http.server 8000
```

## Roadmap (beyond Phase 1)

- Replace `generateAIResponse()` with a real backend call (RAG grounded in the Sources directory).
- Per-response conceptual-gap analysis instead of canned probing questions.
- Additional topics/grade levels via the existing `TOPICS` dictionary.
