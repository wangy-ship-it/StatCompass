# StatCompass

Interactive statistics reference for data scientists — built to explain A/B testing, experiment design, and model evaluation concepts to stakeholders through hands-on visualizations.

## What it does

29 interactive modules across 6 sections, each with draggable sliders, real-time SVG charts, and plain-language explanations. Every module includes stakeholder-oriented Q&A, technical notes, and practical insights.

### Sections

| Section | What it covers |
|---|---|
| **Foundations** | Type I/II errors, p-values, confidence intervals, Bayesian vs frequentist |
| **Design** | Experiment structure, metrics & guardrails, sample size & power, effect size & MDE, CUPED variance reduction |
| **Validate & Run** | A/A testing, sequential testing, validity threats, novelty & time effects, interaction effects |
| **Analyze** | Choosing the right test, multiple testing corrections, lift calculator, practical vs statistical significance |
| **Interpret & Decide** | Result interpreter, heterogeneous effects, Simpson's paradox, regression to the mean |
| **Model & Evaluate** | Model metrics (ROC/AUC), calibration, cumulative gains, feature importance, bias-variance, cross-validation, model drift |

## Tech stack

- React 19
- Vite 6
- Tailwind CSS 4
- Pure SVG visualizations (no charting library)
- Light/dark mode with system preference detection

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Build

```bash
npm run build
npm run preview
```

## Design principles

- **No chart libraries** — all visualizations are hand-crafted SVG for full control over interactivity and styling
- **Stakeholder-first language** — descriptions and Q&As use business language, not academic jargon
- **Seeded randomness** — deterministic pseudo-random data so visualizations are reproducible across sessions
- **Lazy loading** — each module is code-split for fast initial load
