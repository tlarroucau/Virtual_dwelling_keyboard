# AGENTS.md — Virtual Dwelling Keyboard

## Project Overview
A web-based accessible virtual keyboard designed for patients with limited mobility. The keyboard supports **dwell-click input** (letters are typed by hovering/resting the cursor on a key for a configurable duration), features a **Latin Spanish layout**, and includes **Spanish word prediction**.

## Architecture
- **Pure frontend** (HTML + CSS + JavaScript) — no backend required for local use
- Single-page application opened directly in a browser
- All word prediction runs client-side using a preloaded Spanish word frequency list

## Key Design Principles
1. **Accessibility first** — Large keys, high contrast, clear visual feedback
2. **Dwell-click** — Primary input method; click is also supported as fallback
3. **Customizable timing** — Dwell duration adjustable (300ms–3000ms) via settings
4. **Visual dwell progress** — Circular/radial countdown animation on each key
5. **Spanish keyboard layout** — Full QWERTY-ES including ñ, á, é, í, ó, ú, ü, ¡, ¿
6. **Word prediction** — Frequency-weighted Spanish word suggestions above the keyboard
7. **Modern aesthetic** — Rounded keys, subtle gradients, smooth animations
8. **Responsive** — Works on tablets and large screens

## File Structure
```
├── index.html              # Main entry point
├── css/
│   └── styles.css          # All styling, animations, themes
├── js/
│   ├── app.js              # Main controller, initialization
│   ├── keyboard.js         # Keyboard layout, rendering, key management
│   ├── dwell.js            # Dwell engine (timers, progress, activation)
│   └── predictor.js        # Word prediction engine
├── data/
│   └── spanish_words.json  # Top Spanish words with frequencies
├── AGENTS.md               # This file
└── README.md               # User-facing documentation
```

## Coding Conventions
- **Language**: ES6+ JavaScript (no build tools needed)
- **CSS**: Custom properties (variables) for theming
- **No frameworks** — vanilla JS for zero dependencies and maximum portability
- **Comments**: JSDoc style for functions
- **Naming**: camelCase for JS, kebab-case for CSS classes
- **Accessibility**: ARIA labels on interactive elements

## Dwell Behavior Rules
- Dwell timer starts on `pointerenter` / `mouseenter`
- Dwell timer cancels on `pointerleave` / `mouseleave`
- Visual progress indicator fills during dwell
- Key activates (types character) when timer completes
- After activation, a short cooldown prevents accidental re-trigger
- Click (`pointerdown`) also activates the key immediately

## Word Prediction Rules
- Show up to 5 predictions above the keyboard
- Predictions update on every keystroke
- Selecting a prediction completes the word and adds a space
- Predictions are frequency-weighted from common Spanish corpus
- Predictions also support dwell-to-select

## Settings (User Configurable)
- Dwell time (ms): 300–3000, default 800
- Sound feedback: on/off
- Key size: small / medium / large
- Theme: light / dark
- Cooldown after activation (ms)

## Future Enhancements
- Online deployment (static hosting)
- Text-to-speech integration
- Custom phrase bank
- Multi-language support
- Switch scanning mode (for extreme mobility limitations)
- Save/export typed text
