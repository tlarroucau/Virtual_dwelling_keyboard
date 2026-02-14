# AGENTS.md — Virtual Dwelling Keyboard

## Project Overview
A web-based accessible virtual keyboard designed for patients with limited mobility. The keyboard supports **dwell-click input** (letters are typed by hovering/resting the cursor on a key for a configurable duration), features a **Latin Spanish layout**, includes **Spanish word prediction**, **quick-need emoji buttons** with composable pain phrases, and **text-to-speech via ElevenLabs API**.

Live at: https://tlarroucau.github.io/Virtual_dwelling_keyboard/

## Architecture
- **Pure frontend** (HTML + CSS + JavaScript) — no backend required for local use
- Single-page application opened directly in a browser or via GitHub Pages
- All word prediction runs client-side using a Trie data structure (~1500 Spanish words)
- Text-to-speech via ElevenLabs REST API (optional, requires user's API Key)
- All settings including API keys stored in browser localStorage

## Key Design Principles
1. **Accessibility first** — Large keys, high contrast, clear visual feedback
2. **Dwell-click** — Primary input method; click is also supported as fallback
3. **Customizable timing** — Dwell duration adjustable (300ms–3000ms), cooldown (100ms–5000ms)
4. **Visual dwell progress** — Progress bar animation on keys, predictions, and action buttons
5. **Spanish keyboard layout** — Full QWERTY-ES including ñ, á, é, í, ó, ú, ü, ¡, ¿
6. **Word prediction** — Frequency-weighted Spanish word suggestions above the keyboard
7. **Quick-need emojis** — One-dwell buttons for common needs (pain, thirst, cold, bathroom, etc.)
8. **Composable pain phrases** — "Me duele" / "Me incomoda" + body part buttons
9. **Text-to-speech** — ElevenLabs API integration (eleven_multilingual_v2 model)
10. **Fluid keyboard** — Keys use flex sizing to always fit 100% of window width
11. **Modern aesthetic** — Rounded keys, subtle gradients, smooth animations
12. **Responsive** — Works on tablets and large screens

## File Structure
```
├── index.html              # Main entry point
├── css/
│   └── styles.css          # All styling, animations, themes
├── js/
│   ├── app.js              # Main controller, TTS, state management
│   ├── keyboard.js         # Keyboard layout, rendering, key management
│   ├── dwell.js            # Dwell engine (timers, progress, activation, cooldown)
│   └── predictor.js        # Trie-based word prediction engine
├── AGENTS.md               # This file
└── README.md               # User-facing documentation (Spanish)
```

## Coding Conventions
- **Language**: ES6+ JavaScript (no build tools needed)
- **CSS**: Custom properties (variables) for theming and sizing
- **No frameworks** — vanilla JS for zero dependencies and maximum portability
- **Comments**: JSDoc style for functions
- **Naming**: camelCase for JS, kebab-case for CSS classes
- **Accessibility**: ARIA labels on interactive elements

## Dwell Behavior Rules
- Dwell timer starts on `pointerenter` / `mouseenter`
- Dwell timer cancels on `pointerleave` / `mouseleave`
- Visual progress bar fills during dwell
- Key activates (types character) when timer completes
- After activation, a configurable cooldown prevents accidental re-trigger
- Click (`pointerdown`) also activates the key immediately
- All interactive elements support dwell: keys, predictions, emoji buttons, action buttons

## Word Prediction Rules
- Show up to 5 predictions above the keyboard
- Predictions update on every keystroke
- Selecting a prediction completes the word and adds a space
- Predictions are frequency-weighted from common Spanish corpus (~1500 words)
- Predictions support dwell-to-select with progress bar

## Text-to-Speech (ElevenLabs)
- User provides API Key and Voice ID via settings panel
- Credentials stored in localStorage only (never in source code)
- Uses `eleven_multilingual_v2` model via POST to `/v1/text-to-speech/{voiceId}`
- Audio played as blob via HTML5 Audio element
- Speech rate configurable (0.5–2.0)
- Button shows animated pulse while speaking

## Settings (User Configurable)
- Dwell time (ms): 300–3000, default 800
- Cooldown after activation (ms): 100–5000, default 400
- Sound feedback: on/off
- Key size: small / medium / large / xlarge
- Font boost: normal / large / xlarge
- Emoji size: small / medium / large / xlarge
- Theme: dark / light / high-contrast
- Prediction: on/off
- ElevenLabs API Key: user-provided
- ElevenLabs Voice ID: user-provided
- Speech rate: 0.5–2.0

## Future Enhancements
- Custom phrase bank
- Switch scanning mode (for extreme mobility limitations)
- Save/export typed text
- Multi-language support
- Multi-language support
- Switch scanning mode (for extreme mobility limitations)
- Save/export typed text
