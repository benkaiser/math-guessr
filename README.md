# Math Guessr

Sharpen your approximate mental math skills. Inspired by GeoGuessr, but for arithmetic estimation.

The goal isn't to get the *exact* answer — it's to get *close*, *fast*. Your score is a function of both accuracy and speed, rewarding the kind of back-of-the-envelope thinking that's genuinely useful in everyday life.

## Features

- **Practice Mode** — Choose your difficulty level (Easy, Medium, Hard, Extreme), answer mode, and number of questions per round
- **Daily Challenge** — A fixed set of 5 questions each day (365 days of challenges baked in). Compare your score with friends via shareable results
- **Answer Modes** — Like GeoGuessr's camera options:
  - **Free Entry** — Type your estimate
  - **Multiple Choice** — Pick from 4 options
  - **Slider** — Drag to your best guess within a range
- **Scratch Pad** — A napkin-style text area for rough working
- **Bullseye Scoring** — Visual feedback showing how close you landed, with concentric rings at 1%, 5%, 10%, 25%, and 50% error
- **Speed Bonus** — 1-second grace period to read the question, then your score multiplier decays over time

## Difficulty Levels

| Level | What to Expect | Timer |
|-------|---------------|-------|
| **Easy** | Addition, subtraction, simple multiplication (1-100) | 30s |
| **Medium** | Larger numbers, two-digit multiplication (10-999) | 25s |
| **Hard** | Multi-step operations, three-digit multiplication (100-9999) | 20s |
| **Extreme** | Chained operations, division, large numbers (1000-99999) | 15s |

Easy through Hard produce integer answers. Extreme may include decimals (rounded to 1 decimal place).

## How Scoring Works

- **Accuracy** (0-1000 pts): Quadratic decay based on percentage error from the true answer
- **Speed Multiplier** (0.5x - 1.0x): Full credit for the first second, then decays linearly to 0.5x at the buzzer
- **Per Question Max**: 1,000 points
- **Grades**: S (95%+), A (85%+), B (70%+), C (50%+), D (30%+), F (below 30%)

## Future Ideas

- **Fermi Estimation Mode** — "How many piano tuners are there in Chicago?" — train order-of-magnitude reasoning
- **Real-World Numeracy Mode** — Estimate populations, distances, market caps, calories — using live data feeds
- **Multiplayer** — Head-to-head duels, same question, closest answer wins. Party mode for groups.
- **Category Elo Ratings** — Track separate skill ratings across different estimation types
- **Napkin Reveal** — In multiplayer, reveal everyone's scratch work after each round

## Tech

Static site (vanilla HTML/CSS/JS) hosted on GitHub Pages. No build step, no framework, no backend.

## Development

Just open `index.html` in a browser. To regenerate daily challenges:

```bash
node generate-daily.js
```

## License

MIT
