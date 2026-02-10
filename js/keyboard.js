/**
 * keyboard.js — Spanish QWERTY keyboard layout and rendering
 */

const KeyboardModule = (() => {
    'use strict';

    /**
     * Spanish QWERTY layout definition.
     * Each key: { label, code, width?, type?, shift?, altGr? }
     *   - label: what's displayed
     *   - code: unique identifier
     *   - char: character to type (if different from label)
     *   - shiftChar: character when shift is active
     *   - width: CSS class suffix for wider keys
     *   - type: 'char' | 'special' | 'accent'
     */
    const LAYOUTS = {
        default: [
            // Row 1: numbers
            [
                { label: 'º', code: 'masculine', char: 'º', shiftChar: 'ª', type: 'char' },
                { label: '1', code: 'digit1', char: '1', shiftChar: '!', type: 'char' },
                { label: '2', code: 'digit2', char: '2', shiftChar: '"', type: 'char' },
                { label: '3', code: 'digit3', char: '3', shiftChar: '·', type: 'char' },
                { label: '4', code: 'digit4', char: '4', shiftChar: '$', type: 'char' },
                { label: '5', code: 'digit5', char: '5', shiftChar: '%', type: 'char' },
                { label: '6', code: 'digit6', char: '6', shiftChar: '&', type: 'char' },
                { label: '7', code: 'digit7', char: '7', shiftChar: '/', type: 'char' },
                { label: '8', code: 'digit8', char: '8', shiftChar: '(', type: 'char' },
                { label: '9', code: 'digit9', char: '9', shiftChar: ')', type: 'char' },
                { label: '0', code: 'digit0', char: '0', shiftChar: '=', type: 'char' },
                { label: "'", code: 'apostrophe', char: "'", shiftChar: '?', type: 'char' },
                { label: '¡', code: 'exclamdown', char: '¡', shiftChar: '¿', type: 'char' },
                { label: '⌫', code: 'backspace', type: 'special', width: 'backspace' },
            ],
            // Row 2: QWERTY top
            [
                { label: 'Tab', code: 'tab', type: 'special', width: 'tab', char: '\t' },
                { label: 'Q', code: 'q', char: 'q', shiftChar: 'Q', type: 'char' },
                { label: 'W', code: 'w', char: 'w', shiftChar: 'W', type: 'char' },
                { label: 'E', code: 'e', char: 'e', shiftChar: 'E', type: 'char' },
                { label: 'R', code: 'r', char: 'r', shiftChar: 'R', type: 'char' },
                { label: 'T', code: 't', char: 't', shiftChar: 'T', type: 'char' },
                { label: 'Y', code: 'y', char: 'y', shiftChar: 'Y', type: 'char' },
                { label: 'U', code: 'u', char: 'u', shiftChar: 'U', type: 'char' },
                { label: 'I', code: 'i', char: 'i', shiftChar: 'I', type: 'char' },
                { label: 'O', code: 'o', char: 'o', shiftChar: 'O', type: 'char' },
                { label: 'P', code: 'p', char: 'p', shiftChar: 'P', type: 'char' },
                { label: '`', code: 'grave', char: '`', shiftChar: '^', type: 'char' },
                { label: '+', code: 'plus', char: '+', shiftChar: '*', type: 'char' },
            ],
            // Row 3: home row
            [
                { label: 'Bloq', code: 'caps', type: 'special', width: 'caps' },
                { label: 'A', code: 'a', char: 'a', shiftChar: 'A', type: 'char' },
                { label: 'S', code: 's', char: 's', shiftChar: 'S', type: 'char' },
                { label: 'D', code: 'd', char: 'd', shiftChar: 'D', type: 'char' },
                { label: 'F', code: 'f', char: 'f', shiftChar: 'F', type: 'char' },
                { label: 'G', code: 'g', char: 'g', shiftChar: 'G', type: 'char' },
                { label: 'H', code: 'h', char: 'h', shiftChar: 'H', type: 'char' },
                { label: 'J', code: 'j', char: 'j', shiftChar: 'J', type: 'char' },
                { label: 'K', code: 'k', char: 'k', shiftChar: 'K', type: 'char' },
                { label: 'L', code: 'l', char: 'l', shiftChar: 'L', type: 'char' },
                { label: 'Ñ', code: 'ntilde', char: 'ñ', shiftChar: 'Ñ', type: 'char' },
                { label: '´', code: 'acute', char: '´', shiftChar: '¨', type: 'char' },
                { label: '↵', code: 'enter', type: 'special', width: 'enter' },
            ],
            // Row 4: bottom letters
            [
                { label: '⇧', code: 'shift-left', type: 'special', width: 'shift' },
                { label: '<', code: 'less', char: '<', shiftChar: '>', type: 'char' },
                { label: 'Z', code: 'z', char: 'z', shiftChar: 'Z', type: 'char' },
                { label: 'X', code: 'x', char: 'x', shiftChar: 'X', type: 'char' },
                { label: 'C', code: 'c', char: 'c', shiftChar: 'C', type: 'char' },
                { label: 'V', code: 'v', char: 'v', shiftChar: 'V', type: 'char' },
                { label: 'B', code: 'b', char: 'b', shiftChar: 'B', type: 'char' },
                { label: 'N', code: 'n', char: 'n', shiftChar: 'N', type: 'char' },
                { label: 'M', code: 'm', char: 'm', shiftChar: 'M', type: 'char' },
                { label: ',', code: 'comma', char: ',', shiftChar: ';', type: 'char' },
                { label: '.', code: 'period', char: '.', shiftChar: ':', type: 'char' },
                { label: '-', code: 'minus', char: '-', shiftChar: '_', type: 'char' },
                { label: '⇧', code: 'shift-right', type: 'special', width: 'shift' },
            ],
            // Row 5: bottom bar (accented vowels + punctuation + space)
            [
                { label: '¡', code: 'excl-open', char: '¡', type: 'char' },
                { label: '!', code: 'excl-close', char: '!', type: 'char' },
                { label: 'Á', code: 'a-acute', char: 'á', shiftChar: 'Á', type: 'char' },
                { label: 'É', code: 'e-acute', char: 'é', shiftChar: 'É', type: 'char' },
                { label: 'Í', code: 'i-acute', char: 'í', shiftChar: 'Í', type: 'char' },
                { label: 'Espacio', code: 'space', char: ' ', type: 'accent', width: 'space' },
                { label: 'Ó', code: 'o-acute', char: 'ó', shiftChar: 'Ó', type: 'char' },
                { label: 'Ú', code: 'u-acute', char: 'ú', shiftChar: 'Ú', type: 'char' },
                { label: 'Ü', code: 'u-dieresis', char: 'ü', shiftChar: 'Ü', type: 'char' },
                { label: '¿', code: 'quest-open', char: '¿', type: 'char' },
                { label: '?', code: 'quest-close', char: '?', type: 'char' },
            ],
        ],
    };

    let keyElements = {};
    let shiftActive = false;
    let capsActive = false;

    /**
     * Render the keyboard into a container element.
     * @param {HTMLElement} container
     * @param {Function} onKeyActivated - callback(keyData)
     */
    function render(container, onKeyActivated) {
        container.innerHTML = '';
        keyElements = {};

        const layout = LAYOUTS.default;

        layout.forEach((row) => {
            const rowEl = document.createElement('div');
            rowEl.className = 'keyboard-row';

            row.forEach((keyDef) => {
                const keyEl = document.createElement('button');
                keyEl.className = 'key';
                keyEl.setAttribute('data-code', keyDef.code);
                keyEl.setAttribute('aria-label', keyDef.label);

                // Width variants
                if (keyDef.width) {
                    keyEl.classList.add(`key-${keyDef.width}`);
                }

                // Type styling
                if (keyDef.type === 'special') {
                    keyEl.classList.add('key-special');
                } else if (keyDef.type === 'accent') {
                    keyEl.classList.add('key-accent');
                }

                // Inner content
                const labelSpan = document.createElement('span');
                labelSpan.className = 'key-label';
                labelSpan.textContent = keyDef.label;
                keyEl.appendChild(labelSpan);

                // Shift sublabel
                if (keyDef.shiftChar && keyDef.shiftChar !== keyDef.label) {
                    const subLabel = document.createElement('span');
                    subLabel.className = 'key-sublabel';
                    subLabel.textContent = keyDef.shiftChar;
                    keyEl.appendChild(subLabel);
                }

                // Dwell progress background
                const dwellBg = document.createElement('div');
                dwellBg.className = 'dwell-progress-bg';
                keyEl.appendChild(dwellBg);

                // Store reference
                keyElements[keyDef.code] = { el: keyEl, def: keyDef };

                rowEl.appendChild(keyEl);
            });

            container.appendChild(rowEl);
        });
    }

    /**
     * Get the character to type for a key, considering shift/caps state.
     */
    function getCharForKey(keyDef) {
        if (!keyDef || keyDef.type === 'special') return null;

        const useUpper = shiftActive || capsActive;

        if (useUpper && keyDef.shiftChar) {
            return keyDef.shiftChar;
        }
        return keyDef.char || keyDef.label;
    }

    /**
     * Toggle shift state.
     */
    function toggleShift() {
        shiftActive = !shiftActive;
        updateModifierVisuals();
    }

    /**
     * Deactivate shift (after a character is typed).
     */
    function deactivateShift() {
        shiftActive = false;
        updateModifierVisuals();
    }

    /**
     * Toggle caps lock.
     */
    function toggleCaps() {
        capsActive = !capsActive;
        updateModifierVisuals();
    }

    function isShiftActive() {
        return shiftActive;
    }

    function isCapsActive() {
        return capsActive;
    }

    function updateModifierVisuals() {
        // Update shift keys
        ['shift-left', 'shift-right'].forEach((code) => {
            const entry = keyElements[code];
            if (entry) {
                entry.el.classList.toggle('active', shiftActive);
            }
        });
        // Update caps key
        const capsEntry = keyElements['caps'];
        if (capsEntry) {
            capsEntry.el.classList.toggle('active', capsActive);
        }

        // Update displayed labels for letter keys
        Object.values(keyElements).forEach(({ el, def }) => {
            if (def.type === 'char' && def.char && def.shiftChar) {
                const labelEl = el.querySelector('.key-label');
                const useUpper = shiftActive || capsActive;
                // Determine if it's a letter (shift shows uppercase) or symbol (shift shows different)
                if (def.char.length === 1 && def.char.match(/[a-záéíóúñü]/i)) {
                    labelEl.textContent = useUpper ? def.char.toUpperCase() : def.char.toLowerCase();
                }
            }
        });
    }

    /**
     * Get all key elements (for attaching dwell listeners).
     * @returns {Object} { code: { el, def } }
     */
    function getKeyElements() {
        return keyElements;
    }

    /**
     * Flash activation effect on a key.
     */
    function flashKey(code) {
        const entry = keyElements[code];
        if (!entry) return;
        const el = entry.el;
        el.classList.add('activated');
        setTimeout(() => el.classList.remove('activated'), 150);
    }

    /**
     * Set cooldown on a key (briefly disable it after activation).
     */
    function setCooldown(code, duration) {
        const entry = keyElements[code];
        if (!entry) return;
        entry.el.classList.add('cooldown');
        setTimeout(() => entry.el.classList.remove('cooldown'), duration);
    }

    return {
        render,
        getCharForKey,
        toggleShift,
        deactivateShift,
        toggleCaps,
        isShiftActive,
        isCapsActive,
        getKeyElements,
        flashKey,
        setCooldown,
    };
})();
