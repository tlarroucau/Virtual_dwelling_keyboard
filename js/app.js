/**
 * app.js — Main application controller
 * Initializes all modules, wires events, manages text state.
 */

(function () {
    'use strict';

    // --- DOM references ---
    const textContent = document.getElementById('text-content');
    const textOutput = document.getElementById('text-output');
    const keyboardContainer = document.getElementById('keyboard');
    const predictionsContainer = document.getElementById('predictions-container');
    const predictionsBar = document.getElementById('predictions-bar');

    // Buttons
    const clearBtn = document.getElementById('clear-btn');
    const copyBtn = document.getElementById('copy-btn');
    const settingsBtn = document.getElementById('settings-btn');
    const closeSettingsBtn = document.getElementById('close-settings');
    const settingsPanel = document.getElementById('settings-panel');
    const settingsOverlay = document.getElementById('settings-overlay');

    // Settings controls
    const dwellTimeSlider = document.getElementById('dwell-time-slider');
    const dwellTimeValue = document.getElementById('dwell-time-value');
    const cooldownSlider = document.getElementById('cooldown-slider');
    const cooldownValue = document.getElementById('cooldown-value');
    const keySizeSelect = document.getElementById('key-size-select');
    const themeSelect = document.getElementById('theme-select');
    const soundToggle = document.getElementById('sound-toggle');
    const predictionToggle = document.getElementById('prediction-toggle');

    // --- State ---
    let typedText = '';
    let currentWord = '';

    // --- Initialize ---
    function init() {
        // Load saved settings
        loadSettings();

        // Init predictor
        Predictor.init();

        // Render keyboard
        KeyboardModule.render(keyboardContainer);

        // Init dwell engine
        DwellEngine.init({
            onActivate: handleKeyActivation,
            dwellTime: parseInt(dwellTimeSlider.value),
            cooldownTime: parseInt(cooldownSlider.value),
            soundEnabled: soundToggle.checked,
        });

        // Attach dwell listeners to keys
        DwellEngine.attachToKeys(KeyboardModule.getKeyElements());

        // Wire up UI events
        setupSettingsEvents();
        setupActionButtons();

        // Initial predictions
        updatePredictions();

        // Apply initial theme & size
        applyTheme(themeSelect.value);
        applyKeySize(keySizeSelect.value);
    }

    // --- Key activation handler ---
    function handleKeyActivation(code) {
        const keyElements = KeyboardModule.getKeyElements();
        const entry = keyElements[code];
        if (!entry) return;

        const keyDef = entry.def;

        // Handle special keys
        switch (code) {
            case 'backspace':
                handleBackspace();
                return;
            case 'enter':
                handleEnter();
                return;
            case 'space':
                handleSpace();
                return;
            case 'shift-left':
            case 'shift-right':
                KeyboardModule.toggleShift();
                return;
            case 'caps':
                KeyboardModule.toggleCaps();
                return;
            case 'tab':
                handleTab();
                return;
        }

        // Get character
        const char = KeyboardModule.getCharForKey(keyDef);
        if (char == null) return;

        // Type the character
        typedText += char;
        currentWord += char;

        // If shift was active (not caps), deactivate it
        if (KeyboardModule.isShiftActive()) {
            KeyboardModule.deactivateShift();
        }

        updateDisplay();
        updatePredictions();
    }

    function handleBackspace() {
        if (typedText.length === 0) return;

        const removed = typedText[typedText.length - 1];
        typedText = typedText.slice(0, -1);

        if (removed === ' ' || removed === '\n') {
            // Recalculate current word
            currentWord = extractCurrentWord();
        } else {
            currentWord = currentWord.slice(0, -1);
        }

        updateDisplay();
        updatePredictions();
    }

    function handleEnter() {
        typedText += '\n';
        currentWord = '';
        updateDisplay();
        updatePredictions();
    }

    function handleSpace() {
        typedText += ' ';
        currentWord = '';
        updateDisplay();
        updatePredictions();
    }

    function handleTab() {
        typedText += '    ';
        updateDisplay();
    }

    /**
     * Extract the current (last) word being typed.
     */
    function extractCurrentWord() {
        const words = typedText.split(/[\s\n]+/);
        return words[words.length - 1] || '';
    }

    // --- Display ---
    function updateDisplay() {
        // Convert newlines to <br> for display
        const html = escapeHtml(typedText).replace(/\n/g, '<br>');
        textContent.innerHTML = html;

        // Auto-scroll to bottom
        textOutput.scrollTop = textOutput.scrollHeight;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // --- Predictions ---
    function updatePredictions() {
        predictionsContainer.innerHTML = '';

        if (!Predictor.isEnabled() || !predictionToggle.checked) {
            predictionsBar.style.display = 'none';
            return;
        }

        predictionsBar.style.display = '';

        const prefix = currentWord.toLowerCase();
        const predictions = Predictor.predict(prefix, 5);

        if (predictions.length === 0 && prefix.length > 0) {
            const empty = document.createElement('span');
            empty.className = 'prediction-empty';
            empty.textContent = 'Sin sugerencias';
            predictionsContainer.appendChild(empty);
            return;
        }

        if (prefix.length === 0) {
            const empty = document.createElement('span');
            empty.className = 'prediction-empty';
            empty.textContent = 'Empiece a escribir para ver sugerencias...';
            predictionsContainer.appendChild(empty);
            return;
        }

        predictions.forEach((word) => {
            const btn = document.createElement('button');
            btn.className = 'prediction-btn';
            btn.setAttribute('aria-label', `Seleccionar palabra: ${word}`);

            // Highlight the matching prefix
            const matchLen = prefix.length;
            btn.innerHTML = `<strong>${escapeHtml(word.slice(0, matchLen))}</strong>${escapeHtml(word.slice(matchLen))}<div class="dwell-fill"></div>`;

            // Attach dwell to prediction
            DwellEngine.attachToPrediction(btn, () => selectPrediction(word));

            predictionsContainer.appendChild(btn);
        });
    }

    function selectPrediction(word) {
        // Replace the current word with the prediction
        const prefix = currentWord;
        if (prefix.length > 0) {
            typedText = typedText.slice(0, -prefix.length);
        }
        typedText += word + ' ';
        currentWord = '';

        updateDisplay();
        updatePredictions();
    }

    // --- Settings ---
    function setupSettingsEvents() {
        // Open/close
        settingsBtn.addEventListener('click', (e) => e.stopPropagation()); // handled by dwell
        closeSettingsBtn.addEventListener('click', () => closeSettings());
        settingsOverlay.addEventListener('click', () => closeSettings());

        // Dwell time
        dwellTimeSlider.addEventListener('input', () => {
            const val = parseInt(dwellTimeSlider.value);
            dwellTimeValue.textContent = val + ' ms';
            DwellEngine.setDwellTime(val);
            saveSettings();
        });

        // Cooldown
        cooldownSlider.addEventListener('input', () => {
            const val = parseInt(cooldownSlider.value);
            cooldownValue.textContent = val + ' ms';
            DwellEngine.setCooldownTime(val);
            saveSettings();
        });

        // Key size
        keySizeSelect.addEventListener('change', () => {
            applyKeySize(keySizeSelect.value);
            saveSettings();
        });

        // Theme
        themeSelect.addEventListener('change', () => {
            applyTheme(themeSelect.value);
            saveSettings();
        });

        // Sound
        soundToggle.addEventListener('change', () => {
            DwellEngine.setSoundEnabled(soundToggle.checked);
            saveSettings();
        });

        // Predictions
        predictionToggle.addEventListener('change', () => {
            Predictor.setEnabled(predictionToggle.checked);
            updatePredictions();
            saveSettings();
        });
    }

    function openSettings() {
        settingsPanel.classList.add('open');
        settingsOverlay.classList.add('active');
    }

    function closeSettings() {
        settingsPanel.classList.remove('open');
        settingsOverlay.classList.remove('active');
    }

    function applyTheme(theme) {
        document.body.setAttribute('data-theme', theme);
    }

    function applyKeySize(size) {
        document.body.setAttribute('data-key-size', size);
    }

    // --- Action Buttons ---
    function setupActionButtons() {
        const clearAction = () => {
            typedText = '';
            currentWord = '';
            updateDisplay();
            updatePredictions();
        };

        const copyAction = () => {
            if (typedText.length === 0) return;
            navigator.clipboard.writeText(typedText).then(() => {
                showToast('¡Texto copiado!');
            }).catch(() => {
                const ta = document.createElement('textarea');
                ta.value = typedText;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                showToast('¡Texto copiado!');
            });
        };

        const settingsAction = () => {
            openSettings();
        };

        // Attach dwell + click to each action button
        attachDwellToActionBtn(clearBtn, clearAction);
        attachDwellToActionBtn(copyBtn, copyAction);
        attachDwellToActionBtn(settingsBtn, settingsAction);
    }

    /**
     * Add dwell-fill bar and dwell behavior to an action button.
     */
    function attachDwellToActionBtn(btn, action) {
        // Add dwell fill bar
        const fill = document.createElement('div');
        fill.className = 'dwell-fill';
        btn.style.position = 'relative';
        btn.style.overflow = 'hidden';
        btn.appendChild(fill);

        // Use DwellEngine's prediction-style dwell
        DwellEngine.attachToPrediction(btn, action);
    }

    // --- Toast notification ---
    function showToast(message) {
        // Remove existing toast
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        // Trigger animation
        requestAnimationFrame(() => {
            toast.classList.add('visible');
        });

        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }

    // --- Persistence (localStorage) ---
    function saveSettings() {
        const settings = {
            dwellTime: dwellTimeSlider.value,
            cooldownTime: cooldownSlider.value,
            keySize: keySizeSelect.value,
            theme: themeSelect.value,
            soundEnabled: soundToggle.checked,
            predictionEnabled: predictionToggle.checked,
        };
        try {
            localStorage.setItem('vdkSettings', JSON.stringify(settings));
        } catch (e) { /* ignore */ }
    }

    function loadSettings() {
        try {
            const raw = localStorage.getItem('vdkSettings');
            if (!raw) return;
            const s = JSON.parse(raw);

            if (s.dwellTime) {
                dwellTimeSlider.value = s.dwellTime;
                dwellTimeValue.textContent = s.dwellTime + ' ms';
            }
            if (s.cooldownTime) {
                cooldownSlider.value = s.cooldownTime;
                cooldownValue.textContent = s.cooldownTime + ' ms';
            }
            if (s.keySize) keySizeSelect.value = s.keySize;
            if (s.theme) themeSelect.value = s.theme;
            if (s.soundEnabled != null) soundToggle.checked = s.soundEnabled;
            if (s.predictionEnabled != null) predictionToggle.checked = s.predictionEnabled;
        } catch (e) { /* ignore */ }
    }

    // --- Keyboard shortcut support (physical keyboard, for testing) ---
    document.addEventListener('keydown', (e) => {
        // Escape closes settings
        if (e.key === 'Escape') {
            closeSettings();
        }
    });

    // --- Start ---
    let initialized = false;
    function safeInit() {
        if (initialized) return;
        initialized = true;
        init();
    }

    document.addEventListener('DOMContentLoaded', safeInit);
    // Fallback if DOM already loaded
    if (document.readyState !== 'loading') {
        safeInit();
    }
})();
