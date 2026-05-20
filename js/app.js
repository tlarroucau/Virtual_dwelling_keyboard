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
    const deleteWordBtn = document.getElementById('delete-word-btn');
    const speakBtn = document.getElementById('speak-btn');
    const copyBtn = document.getElementById('copy-btn');
    const gamesBtn = document.getElementById('games-btn');
    const settingsBtn = document.getElementById('settings-btn');
    const whatsappOpenBtn = document.getElementById('whatsapp-open-btn');
    const closeSettingsBtn = document.getElementById('close-settings');
    const settingsPanel = document.getElementById('settings-panel');
    const settingsOverlay = document.getElementById('settings-overlay');

    // Emoji overlay
    const emojiToggleBtn = document.getElementById('emoji-toggle-btn');
    const emojiOverlay = document.getElementById('emoji-overlay');
    const emojiOverlayClose = document.getElementById('emoji-overlay-close');
    const emojiOverlayGrid = document.getElementById('emoji-overlay-grid');

    // Settings controls
    const dwellTimeSlider = document.getElementById('dwell-time-slider');
    const dwellTimeValue = document.getElementById('dwell-time-value');
    const cooldownSlider = document.getElementById('cooldown-slider');
    const cooldownValue = document.getElementById('cooldown-value');
    const keySizeSelect = document.getElementById('key-size-select');
    const fontBoostSelect = document.getElementById('font-boost-select');
    const emojiSizeSelect = document.getElementById('emoji-size-select');
    const emojiFontBoostSelect = document.getElementById('emoji-font-boost-select');
    const themeSelect = document.getElementById('theme-select');
    const soundToggle = document.getElementById('sound-toggle');
    const predictionToggle = document.getElementById('prediction-toggle');
    const elevenlabsKeyInput = document.getElementById('elevenlabs-key');
    const elevenlabsVoiceInput = document.getElementById('elevenlabs-voice');
    const speechRateSlider = document.getElementById('speech-rate-slider');
    const speechRateValue = document.getElementById('speech-rate-value');
    const dwellToggle = document.getElementById('dwell-toggle');
    const arrowNavToggle = document.getElementById('arrow-nav-toggle');
    const arrowFocusDwellToggle = document.getElementById('arrow-focus-dwell-toggle');
    const arrowSingleStepToggle = document.getElementById('arrow-single-step-toggle');

    // --- State ---
    let typedText = '';
    let currentWord = '';
    let arrowNavEnabled = false;
    let arrowFocusDwellEnabled = false;
    let arrowNavSingleStepEnabled = false;

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
            dwellEnabled: dwellToggle.checked,
        });

        // Attach dwell listeners to keys
        DwellEngine.attachToKeys(KeyboardModule.getKeyElements());

        // Wire up UI events
        setupSettingsEvents();
        setupActionButtons();
        if (window.FullscreenHandoff) window.FullscreenHandoff.init(attachDwellToActionBtn);
        setupQuickNeeds();
        setupBottomControls();
        setupEmojiOverlay();
        applyInitialViewMode();

        // Arrow navigation
        setupArrowNavigation();
        updateNavigationSettingsState();

        // Initial predictions
        updatePredictions();

        // Apply initial theme, size, font boost & emoji size
        applyTheme(themeSelect.value);
        applyKeySize(keySizeSelect.value);
        applyFontBoost(fontBoostSelect.value);
        applyEmojiSize(emojiSizeSelect.value);
        applyEmojiFontBoost(emojiFontBoostSelect.value);

        // Load available voices for speech
        loadVoices();
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
            if (focusDwellEl && isArrowFocusDwellActive()) {
                startArrowFocusDwell(navFocusedEl);
            }
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

        // Font boost
        fontBoostSelect.addEventListener('change', () => {
            applyFontBoost(fontBoostSelect.value);
            saveSettings();
        });

        // Emoji size
        emojiSizeSelect.addEventListener('change', () => {
            applyEmojiSize(emojiSizeSelect.value);
            saveSettings();
        });

        // Emoji font boost
        emojiFontBoostSelect.addEventListener('change', () => {
            applyEmojiFontBoost(emojiFontBoostSelect.value);
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

        // Dwell toggle
        dwellToggle.addEventListener('change', () => {
            DwellEngine.setDwellEnabled(dwellToggle.checked);
            // Show/hide dwell-specific settings
            const dwellSettings = [dwellTimeSlider.closest('.setting-group'), cooldownSlider.closest('.setting-group')];
            dwellSettings.forEach(el => {
                if (el) el.style.opacity = dwellToggle.checked ? '1' : '0.4';
            });
            updateNavigationSettingsState();
            saveSettings();
        });

        // Arrow navigation toggle
        arrowNavToggle.addEventListener('change', () => {
            arrowNavEnabled = arrowNavToggle.checked;
            if (!arrowNavEnabled) {
                pressedArrowKeys.clear();
                clearArrowNavFocus();
            }
            updateNavigationSettingsState();
            saveSettings();
        });

        arrowFocusDwellToggle.addEventListener('change', () => {
            arrowFocusDwellEnabled = arrowFocusDwellToggle.checked;
            updateNavigationSettingsState();
            saveSettings();
        });

        arrowSingleStepToggle.addEventListener('change', () => {
            arrowNavSingleStepEnabled = arrowSingleStepToggle.checked;
            if (!arrowNavSingleStepEnabled) {
                pressedArrowKeys.clear();
            }
            updateNavigationSettingsState();
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

    function applyFontBoost(boost) {
        document.body.setAttribute('data-font-boost', boost);
    }

    function applyEmojiSize(size) {
        document.body.setAttribute('data-emoji-size', size);
    }

    function applyEmojiFontBoost(boost) {
        document.body.setAttribute('data-emoji-font-boost', boost);
    }

    function updateNavigationSettingsState() {
        const combinedGroup = arrowFocusDwellToggle.closest('.setting-group');
        const singleStepGroup = arrowSingleStepToggle.closest('.setting-group');
        const combinedAvailable = arrowNavEnabled && DwellEngine.isDwellEnabled();
        const singleStepAvailable = arrowNavEnabled;

        if (combinedGroup) {
            combinedGroup.style.opacity = combinedAvailable ? '1' : '0.4';
            combinedGroup.style.borderColor = combinedAvailable ? 'var(--accent)' : 'var(--border)';
        }

        if (singleStepGroup) {
            singleStepGroup.style.opacity = singleStepAvailable ? '1' : '0.4';
            singleStepGroup.style.borderColor = singleStepAvailable ? 'var(--accent)' : 'var(--border)';
        }

        if (isArrowFocusDwellActive()) {
            if (navFocusedEl) startArrowFocusDwell(navFocusedEl);
        } else {
            cancelArrowFocusDwell();
        }
    }

    // --- Action Buttons ---
    function setupActionButtons() {
        const clearAction = () => {
            typedText = '';
            currentWord = '';
            updateDisplay();
            updatePredictions();
        };

        const deleteWordAction = () => {
            if (typedText.length === 0) return;
            // Remove trailing spaces, then remove characters until next space or start
            typedText = typedText.trimEnd();
            const lastSpace = typedText.lastIndexOf(' ');
            typedText = lastSpace === -1 ? '' : typedText.slice(0, lastSpace + 1);
            currentWord = '';
            updateDisplay();
            updatePredictions();
        };

        const settingsAction = () => {
            openSettings();
        };

        const speakAction = () => {
            speakText();
        };

        const copyAction = async () => {
            if (!typedText.trim()) {
                showToast('No hay texto para copiar');
                return;
            }

            const copied = await copyTextToClipboard(typedText);
            showToast(copied ? 'Texto copiado' : 'No se pudo copiar');
        };

        const whatsappAction = () => {
            const message = typedText.trim();
            if (!message) {
                showToast('Escriba un mensaje antes de abrir WhatsApp');
                return;
            }

            const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
            const popup = window.open(url, '_blank', 'noopener,noreferrer');
            if (!popup) {
                window.location.href = url;
            }
        };

        const gamesAction = () => {
            if (window.FullscreenHandoff) window.FullscreenHandoff.rememberIntent();
            window.location.href = 'games.html';
        };

        // Attach dwell + click to each action button
        attachDwellToActionBtn(clearBtn, clearAction);
        attachDwellToActionBtn(deleteWordBtn, deleteWordAction);
        attachDwellToActionBtn(speakBtn, speakAction);
        if (copyBtn) attachDwellToActionBtn(copyBtn, copyAction);
        if (whatsappOpenBtn) attachDwellToActionBtn(whatsappOpenBtn, whatsappAction);
        if (gamesBtn) attachDwellToActionBtn(gamesBtn, gamesAction);
        attachDwellToActionBtn(settingsBtn, settingsAction);
    }

    async function copyTextToClipboard(text) {
        if (navigator.clipboard && window.isSecureContext) {
            try {
                await navigator.clipboard.writeText(text);
                return true;
            } catch (error) {
                // Fall through to the legacy copy path.
            }
        }

        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', 'readonly');
        textarea.style.position = 'fixed';
        textarea.style.top = '-9999px';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();

        let copied = false;
        try {
            copied = document.execCommand('copy');
        } catch (error) {
            copied = false;
        }

        textarea.remove();
        return copied;
    }

    /**
     * Add dwell-fill bar and dwell behavior to an action button.
     */
    function attachDwellToActionBtn(btn, action) {
        // Add dwell fill bar if not already present
        if (!btn.querySelector('.dwell-fill')) {
            const fill = document.createElement('div');
            fill.className = 'dwell-fill';
            btn.style.position = 'relative';
            btn.style.overflow = 'hidden';
            btn.appendChild(fill);
        }

        // Use DwellEngine's prediction-style dwell
        DwellEngine.attachToPrediction(btn, action);
    }

    // --- Quick Needs ---
    function setupQuickNeeds() {
        const needBtns = document.querySelectorAll('#quick-needs .need-btn');
        needBtns.forEach((btn) => {
            const phrase = btn.getAttribute('data-phrase');
            const action = () => {
                // Type the full phrase + space
                typedText += phrase + ' ';
                currentWord = '';
                updateDisplay();
                updatePredictions();

                // Flash
                btn.classList.add('activated');
                setTimeout(() => btn.classList.remove('activated'), 200);

                // Auto-speak the phrase
                speakPhrase(phrase, isUrgentPhrase(phrase));
            };
            attachDwellToActionBtn(btn, action);
        });
    }

    // --- Bottom Controls (Sí/No, +/-, SOS, arrows) ---
    function setupBottomControls() {
        const bottomBtns = document.querySelectorAll('#bottom-controls .need-btn');
        bottomBtns.forEach((btn) => {
            const phrase = btn.getAttribute('data-phrase');
            const action = () => {
                typedText += phrase + ' ';
                currentWord = '';
                updateDisplay();
                updatePredictions();

                btn.classList.add('activated');
                setTimeout(() => btn.classList.remove('activated'), 200);

                speakPhrase(phrase, isUrgentPhrase(phrase));
            };
            attachDwellToActionBtn(btn, action);
        });
    }

    // --- Emoji Overlay (tablet mode) ---
    function setupEmojiOverlay() {
        if (!emojiToggleBtn || !emojiOverlay || !emojiOverlayGrid) return;

        // Wire emoji toggle button with dwell
        attachDwellToActionBtn(emojiToggleBtn, openEmojiOverlay);

        // Wire close button with dwell
        attachDwellToActionBtn(emojiOverlayClose, closeEmojiOverlay);

        // Populate the overlay grid with cloned need buttons
        populateEmojiOverlay();
    }

    function applyInitialViewMode() {
        const mode = new URLSearchParams(window.location.search).get('mode');
        if (mode === 'emoji') {
            openEmojiOverlay();
            return;
        }

        showKeyboardMode();
    }

    function showKeyboardMode() {
        document.body.classList.add('keyboard-mode-active');
        document.body.classList.remove('emoji-mode-active');
        if (emojiOverlay) emojiOverlay.classList.remove('open');
    }

    function populateEmojiOverlay() {
        emojiOverlayGrid.innerHTML = '';
        const needBtns = document.querySelectorAll('#quick-needs .need-btn');

        needBtns.forEach((srcBtn) => {
            const phrase = srcBtn.getAttribute('data-phrase');
            const clone = srcBtn.cloneNode(true);
            const existingFill = clone.querySelector('.dwell-fill');
            if (existingFill) existingFill.remove();

            const action = () => {
                typedText += phrase + ' ';
                currentWord = '';
                updateDisplay();
                updatePredictions();

                clone.classList.add('activated');
                setTimeout(() => clone.classList.remove('activated'), 200);

                speakPhrase(phrase, isUrgentPhrase(phrase));
            };
            attachDwellToActionBtn(clone, action);
            emojiOverlayGrid.appendChild(clone);
        });

        // Populate bottom controls section separately
        const controlsGrid = document.getElementById('emoji-overlay-controls');
        if (controlsGrid) {
            controlsGrid.innerHTML = '';
            const bottomBtns = document.querySelectorAll('#bottom-controls .need-btn');
            bottomBtns.forEach((srcBtn) => {
                const phrase = srcBtn.getAttribute('data-phrase');
                const clone = srcBtn.cloneNode(true);
                const existingFill = clone.querySelector('.dwell-fill');
                if (existingFill) existingFill.remove();

                const action = () => {
                    typedText += phrase + ' ';
                    currentWord = '';
                    updateDisplay();
                    updatePredictions();

                    clone.classList.add('activated');
                    setTimeout(() => clone.classList.remove('activated'), 200);

                    speakPhrase(phrase, isUrgentPhrase(phrase));
                };
                attachDwellToActionBtn(clone, action);
                controlsGrid.appendChild(clone);
            });
        }
    }

    function openEmojiOverlay() {
        document.body.classList.remove('keyboard-mode-active');
        document.body.classList.add('emoji-mode-active');
        emojiOverlay.classList.add('open');
    }

    function closeEmojiOverlay() {
        showKeyboardMode();
    }

    // --- Speech Synthesis (ElevenLabs API) ---
    let currentAudio = null;

    /** Phrases that should be spoken at maximum volume */
    const URGENT_PHRASES = [
        'Necesito ayuda',
        'Llama al doctor',
        'Tengo dolor',
    ];

    /**
     * Check if a phrase is urgent (should be loud).
     */
    function isUrgentPhrase(phrase) {
        const lower = phrase.trim().toLowerCase();
        return URGENT_PHRASES.some(u => lower.includes(u.toLowerCase()));
    }

    function loadVoices() {
        // Speech rate slider
        speechRateSlider.addEventListener('input', () => {
            speechRateValue.textContent = speechRateSlider.value + 'x';
            saveSettings();
        });

        elevenlabsKeyInput.addEventListener('change', () => saveSettings());
        elevenlabsVoiceInput.addEventListener('change', () => saveSettings());
    }

    /**
     * Speak a specific phrase via ElevenLabs. If urgent, plays at full volume.
     */
    async function speakPhrase(phrase, urgent) {
        if (!phrase || !phrase.trim()) return;

        // Stop any currently playing audio
        if (currentAudio) {
            currentAudio.pause();
            currentAudio = null;
            speakBtn.classList.remove('speaking');
        }

        const apiKey = elevenlabsKeyInput.value.trim();
        const voiceId = elevenlabsVoiceInput.value.trim() || 'EXAVITQu4vr4xnSDxMaL';

        if (!apiKey) {
            showToast('Configure su API Key de ElevenLabs en Ajustes');
            return;
        }

        speakBtn.classList.add('speaking');

        try {
            const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
                method: 'POST',
                headers: {
                    'Accept': 'audio/mpeg',
                    'Content-Type': 'application/json',
                    'xi-api-key': apiKey,
                },
                body: JSON.stringify({
                    text: phrase.trim(),
                    model_id: 'eleven_multilingual_v2',
                    voice_settings: {
                        stability: urgent ? 0.7 : 0.5,
                        similarity_boost: 0.75,
                        speed: parseFloat(speechRateSlider.value),
                    }
                }),
            });

            if (!response.ok) {
                const err = await response.text();
                throw new Error(err);
            }

            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            currentAudio = new Audio(audioUrl);
            currentAudio.volume = urgent ? 1.0 : 0.7;

            currentAudio.onended = () => {
                speakBtn.classList.remove('speaking');
                URL.revokeObjectURL(audioUrl);
                currentAudio = null;
            };

            currentAudio.onerror = () => {
                speakBtn.classList.remove('speaking');
                URL.revokeObjectURL(audioUrl);
                currentAudio = null;
                showToast('Error al reproducir audio');
            };

            currentAudio.play();
        } catch (e) {
            speakBtn.classList.remove('speaking');
            console.error('ElevenLabs error:', e);
            showToast('Error al conectar con ElevenLabs');
        }
    }

    async function speakText() {
        if (!typedText.trim()) {
            showToast('No hay texto para hablar');
            return;
        }

        // If currently playing, stop
        if (currentAudio) {
            currentAudio.pause();
            currentAudio = null;
            speakBtn.classList.remove('speaking');
            return;
        }

        await speakPhrase(typedText, isUrgentPhrase(typedText));
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
            fontBoost: fontBoostSelect.value,
            emojiSize: emojiSizeSelect.value,
            emojiFontBoost: emojiFontBoostSelect.value,
            theme: themeSelect.value,
            soundEnabled: soundToggle.checked,
            predictionEnabled: predictionToggle.checked,
            elevenlabsKey: elevenlabsKeyInput.value,
            elevenlabsVoice: elevenlabsVoiceInput.value,
            speechRate: speechRateSlider.value,
            dwellEnabled: dwellToggle.checked,
            arrowNavEnabled: arrowNavToggle.checked,
            arrowFocusDwellEnabled: arrowFocusDwellToggle.checked,
            arrowNavSingleStepEnabled: arrowSingleStepToggle.checked,
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
            if (s.fontBoost) fontBoostSelect.value = s.fontBoost;
            if (s.emojiSize) emojiSizeSelect.value = s.emojiSize;
            if (s.emojiFontBoost) emojiFontBoostSelect.value = s.emojiFontBoost;
            if (s.theme) themeSelect.value = s.theme;
            if (s.soundEnabled != null) soundToggle.checked = s.soundEnabled;
            if (s.predictionEnabled != null) predictionToggle.checked = s.predictionEnabled;
            if (s.elevenlabsKey) elevenlabsKeyInput.value = s.elevenlabsKey;
            if (s.elevenlabsVoice) elevenlabsVoiceInput.value = s.elevenlabsVoice;
            if (s.speechRate) {
                speechRateSlider.value = s.speechRate;
                speechRateValue.textContent = s.speechRate + 'x';
            }
            if (s.dwellEnabled != null) dwellToggle.checked = s.dwellEnabled;
            if (s.arrowNavEnabled != null) {
                arrowNavToggle.checked = s.arrowNavEnabled;
                arrowNavEnabled = s.arrowNavEnabled;
            }
            if (s.arrowFocusDwellEnabled != null) {
                arrowFocusDwellToggle.checked = s.arrowFocusDwellEnabled;
                arrowFocusDwellEnabled = s.arrowFocusDwellEnabled;
            }
            if (s.arrowNavSingleStepEnabled != null) {
                arrowSingleStepToggle.checked = s.arrowNavSingleStepEnabled;
                arrowNavSingleStepEnabled = s.arrowNavSingleStepEnabled;
            }
        } catch (e) { /* ignore */ }
    }

    // ========================================================
    // Arrow navigation engine
    // ========================================================
    const VISUAL_ROW_TOLERANCE = 12;
    const ARROW_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
    let navGrid = [];          // 2D array of focusable elements
    let navRow = 0;
    let navCol = 0;
    let navFocusedEl = null;
    let focusDwellTimer = null;
    let focusDwellEl = null;
    const pressedArrowKeys = new Set();

    function isElementVisible(el) {
        return Boolean(el && el.isConnected && el.getClientRects().length > 0);
    }

    function groupElementsByVisualRows(elements, section) {
        const positioned = elements
            .filter(isElementVisible)
            .map((el) => ({ el, rect: el.getBoundingClientRect() }))
            .sort((a, b) => {
                if (Math.abs(a.rect.top - b.rect.top) > VISUAL_ROW_TOLERANCE) {
                    return a.rect.top - b.rect.top;
                }
                return a.rect.left - b.rect.left;
            });

        const rows = [];

        positioned.forEach(({ el, rect }) => {
            let row = rows.find((candidate) => Math.abs(candidate.top - rect.top) <= VISUAL_ROW_TOLERANCE);
            if (!row) {
                row = { top: rect.top, elements: [] };
                rows.push(row);
            }

            row.top = ((row.top * row.elements.length) + rect.top) / (row.elements.length + 1);
            row.elements.push({ el, left: rect.left });
        });

        return rows
            .sort((a, b) => a.top - b.top)
            .map((row) => ({
                section,
                elements: row.elements.sort((a, b) => a.left - b.left).map((item) => item.el),
            }))
            .filter((row) => row.elements.length > 0);
    }

    /**
     * Build the navigation grid from all interactive elements.
     */
    function buildNavGrid() {
        navGrid = [];

        // If emoji overlay is open, only navigate its buttons
        if (emojiOverlay && emojiOverlay.classList.contains('open')) {
            navGrid.push(...groupElementsByVisualRows(
                Array.from(emojiOverlayGrid.querySelectorAll('.need-btn')),
                'emoji-overlay'
            ));
            const overlayControls = document.getElementById('emoji-overlay-controls');
            if (overlayControls) {
                navGrid.push(...groupElementsByVisualRows(
                    Array.from(overlayControls.querySelectorAll('.need-btn')),
                    'emoji-overlay-controls'
                ));
            }
            navGrid.push(...groupElementsByVisualRows(
                [emojiOverlayClose],
                'emoji-overlay-close'
            ));
            return;
        }

        navGrid.push(...groupElementsByVisualRows(
            Array.from(document.querySelectorAll('#quick-needs .need-btn')),
            'needs'
        ));
        navGrid.push(...groupElementsByVisualRows(
            Array.from(document.querySelectorAll('.top-bar-actions .action-btn')),
            'top-actions'
        ));
        navGrid.push(...groupElementsByVisualRows(
            [
                document.getElementById('speak-btn'),
                document.getElementById('copy-btn'),
                document.getElementById('delete-word-btn'),
                document.getElementById('clear-btn'),
            ],
            'text-actions'
        ));
        navGrid.push(...groupElementsByVisualRows(
            Array.from(document.querySelectorAll('.prediction-btn')),
            'predictions'
        ));

        document.querySelectorAll('.keyboard-row').forEach((row) => {
            const keys = Array.from(row.querySelectorAll('.key')).filter(isElementVisible);
            if (keys.length > 0) {
                navGrid.push({ section: 'keyboard', elements: keys });
            }
        });

        navGrid.push(...groupElementsByVisualRows(
            Array.from(document.querySelectorAll('#bottom-controls .need-btn')),
            'bottom-controls'
        ));
    }

    function isArrowFocusDwellActive() {
        return arrowNavEnabled && arrowFocusDwellEnabled && DwellEngine.isDwellEnabled();
    }

    function resetFocusDwellVisual(el) {
        if (!el) return;

        el.classList.remove('dwelling');

        const fill = el.querySelector('.dwell-fill');
        if (fill) {
            fill.style.transition = 'none';
            fill.style.width = '0%';
        }
    }

    function cancelArrowFocusDwell() {
        if (focusDwellTimer) {
            clearTimeout(focusDwellTimer);
            focusDwellTimer = null;
        }

        if (focusDwellEl) {
            resetFocusDwellVisual(focusDwellEl);
            focusDwellEl = null;
        }
    }

    function dispatchSyntheticPointerDown(el) {
        if (!el) return;

        const downEvent = typeof PointerEvent === 'function'
            ? new PointerEvent('pointerdown', { bubbles: true })
            : new MouseEvent('mousedown', { bubbles: true });

        el.dispatchEvent(downEvent);
    }

    function startArrowFocusDwell(el) {
        cancelArrowFocusDwell();

        if (!el || !isArrowFocusDwellActive()) return;

        const dwellMs = DwellEngine.getDwellTime();
        const fill = el.querySelector('.dwell-fill');
        focusDwellEl = el;

        if (el.classList.contains('key')) {
            el.style.setProperty('--dwell-duration', dwellMs + 'ms');
        }

        if (fill) {
            fill.style.transition = 'none';
            fill.style.width = '0%';
            fill.getBoundingClientRect();
            fill.style.transition = `width ${dwellMs}ms linear`;
        }

        el.getBoundingClientRect();
        el.classList.add('dwelling');
        if (fill) {
            fill.style.width = '100%';
        }

        focusDwellTimer = setTimeout(() => {
            if (focusDwellEl !== el || navFocusedEl !== el) return;
            cancelArrowFocusDwell();
            dispatchSyntheticPointerDown(el);
        }, dwellMs);
    }

    function focusFirstNavigableElement() {
        buildNavGrid();
        if (navGrid.length === 0) return false;
        navRow = 0;
        navCol = 0;
        applyNavFocus();
        return true;
    }

    function syncNavPositionWithFocusedElement() {
        if (!navFocusedEl || !navFocusedEl.isConnected) return false;

        for (let rowIndex = 0; rowIndex < navGrid.length; rowIndex++) {
            const colIndex = navGrid[rowIndex].elements.indexOf(navFocusedEl);
            if (colIndex !== -1) {
                navRow = rowIndex;
                navCol = colIndex;
                return true;
            }
        }

        navRow = 0;
        navCol = 0;
        return false;
    }

    /**
     * Sync navRow/navCol to match a specific target element in navGrid.
     * @param {HTMLElement} targetEl
     * @returns {boolean} true if found
     */
    function syncNavPositionWithElement(targetEl) {
        if (!targetEl || !targetEl.isConnected) return false;

        for (let rowIndex = 0; rowIndex < navGrid.length; rowIndex++) {
            const colIndex = navGrid[rowIndex].elements.indexOf(targetEl);
            if (colIndex !== -1) {
                navRow = rowIndex;
                navCol = colIndex;
                return true;
            }
        }

        return false;
    }

    /**
     * Collect all unique navigable elements from the navGrid.
     */
    function getNavCandidates() {
        const seen = new Set();
        const candidates = [];

        navGrid.forEach((row) => {
            row.elements.forEach((el) => {
                if (!seen.has(el)) {
                    seen.add(el);
                    candidates.push(el);
                }
            });
        });

        return candidates;
    }

    function getElementCenter(rect) {
        return {
            x: rect.left + (rect.width / 2),
            y: rect.top + (rect.height / 2),
        };
    }

    function rangesOverlap(startA, endA, startB, endB) {
        return startA <= endB && startB <= endA;
    }

    /**
     * Find the nearest navigable element in the given arrow direction
     * using visual (bounding-rect) positions instead of grid indices.
     */
    function findDirectionalTarget(currentEl, direction) {
        if (!currentEl) return null;

        const currentRect = currentEl.getBoundingClientRect();
        const currentCenter = getElementCenter(currentRect);
        let bestCandidate = null;
        let bestScore = Infinity;

        getNavCandidates().forEach((candidate) => {
            if (candidate === currentEl || !isElementVisible(candidate)) return;

            const rect = candidate.getBoundingClientRect();
            const center = getElementCenter(rect);
            let primaryDistance = 0;
            let secondaryDistance = 0;
            let overlapsAxis = false;

            switch (direction) {
                case 'ArrowRight':
                    primaryDistance = rect.left - currentRect.right;
                    if (primaryDistance <= 0) return;
                    secondaryDistance = Math.abs(center.y - currentCenter.y);
                    overlapsAxis = rangesOverlap(currentRect.top, currentRect.bottom, rect.top, rect.bottom);
                    break;

                case 'ArrowLeft':
                    primaryDistance = currentRect.left - rect.right;
                    if (primaryDistance <= 0) return;
                    secondaryDistance = Math.abs(center.y - currentCenter.y);
                    overlapsAxis = rangesOverlap(currentRect.top, currentRect.bottom, rect.top, rect.bottom);
                    break;

                case 'ArrowDown':
                    primaryDistance = rect.top - currentRect.bottom;
                    if (primaryDistance <= 0) return;
                    secondaryDistance = Math.abs(center.x - currentCenter.x);
                    overlapsAxis = rangesOverlap(currentRect.left, currentRect.right, rect.left, rect.right);
                    break;

                case 'ArrowUp':
                    primaryDistance = currentRect.top - rect.bottom;
                    if (primaryDistance <= 0) return;
                    secondaryDistance = Math.abs(center.x - currentCenter.x);
                    overlapsAxis = rangesOverlap(currentRect.left, currentRect.right, rect.left, rect.right);
                    break;

                default:
                    return;
            }

            const score = primaryDistance + secondaryDistance * (overlapsAxis ? 0.25 : 2);
            if (score < bestScore) {
                bestScore = score;
                bestCandidate = candidate;
            }
        });

        return bestCandidate;
    }

    /**
     * Set focus highlight on the element at current navRow/navCol.
     */
    function applyNavFocus() {
        // Remove old focus
        clearArrowNavFocus();

        if (navGrid.length === 0) return;

        // Clamp row
        navRow = Math.max(0, Math.min(navRow, navGrid.length - 1));
        const row = navGrid[navRow].elements;
        // Clamp col
        navCol = Math.max(0, Math.min(navCol, row.length - 1));

        const el = row[navCol];
        if (el) {
            el.classList.add('arrow-focused');
            el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            navFocusedEl = el;
            startArrowFocusDwell(el);
        }
    }

    function clearArrowNavFocus() {
        cancelArrowFocusDwell();

        if (navFocusedEl) {
            navFocusedEl.classList.remove('arrow-focused');
            navFocusedEl = null;
        }
        // Also clear any stale ones
        document.querySelectorAll('.arrow-focused').forEach(el => el.classList.remove('arrow-focused'));
    }

    /**
     * Set up global key listener for arrow navigation.
     */
    function setupArrowNavigation() {
        document.addEventListener('keydown', (e) => {
            // Escape closes overlays
            if (e.key === 'Escape') {
                if (emojiOverlay && emojiOverlay.classList.contains('open')) {
                    closeEmojiOverlay();
                    return;
                }
                closeSettings();
                return;
            }

            if (!arrowNavEnabled) return;

            // Don't intercept when typing into settings inputs
            const tag = e.target.tagName;
            if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

            if (ARROW_KEYS.has(e.key) && arrowNavSingleStepEnabled) {
                if (e.repeat || pressedArrowKeys.has(e.key)) {
                    e.preventDefault();
                    return;
                }
                pressedArrowKeys.add(e.key);
            }

            const hasValidFocus = navFocusedEl && navFocusedEl.isConnected;

            switch (e.key) {
                case 'ArrowRight':
                    e.preventDefault();
                    if (!hasValidFocus) {
                        focusFirstNavigableElement();
                        break;
                    }
                    buildNavGrid();
                    if (navGrid.length === 0) break;
                    syncNavPositionWithFocusedElement();
                    const rightTarget = findDirectionalTarget(navFocusedEl, 'ArrowRight');
                    if (rightTarget && syncNavPositionWithElement(rightTarget)) {
                        applyNavFocus();
                    }
                    break;

                case 'ArrowLeft':
                    e.preventDefault();
                    if (!hasValidFocus) {
                        focusFirstNavigableElement();
                        break;
                    }
                    buildNavGrid();
                    if (navGrid.length === 0) break;
                    syncNavPositionWithFocusedElement();
                    const leftTarget = findDirectionalTarget(navFocusedEl, 'ArrowLeft');
                    if (leftTarget && syncNavPositionWithElement(leftTarget)) {
                        applyNavFocus();
                    }
                    break;

                case 'ArrowDown':
                    e.preventDefault();
                    if (!hasValidFocus) {
                        focusFirstNavigableElement();
                        break;
                    }
                    buildNavGrid();
                    if (navGrid.length === 0) break;
                    syncNavPositionWithFocusedElement();
                    const downTarget = findDirectionalTarget(navFocusedEl, 'ArrowDown');
                    if (downTarget && syncNavPositionWithElement(downTarget)) {
                        applyNavFocus();
                    }
                    break;

                case 'ArrowUp':
                    e.preventDefault();
                    if (!hasValidFocus) {
                        focusFirstNavigableElement();
                        break;
                    }
                    buildNavGrid();
                    if (navGrid.length === 0) break;
                    syncNavPositionWithFocusedElement();
                    const upTarget = findDirectionalTarget(navFocusedEl, 'ArrowUp');
                    if (upTarget && syncNavPositionWithElement(upTarget)) {
                        applyNavFocus();
                    }
                    break;

                case 'Enter':
                case ' ':
                    e.preventDefault();
                    if (isArrowFocusDwellActive()) {
                        break;
                    }
                    if (navFocusedEl) {
                        dispatchSyntheticPointerDown(navFocusedEl);
                    }
                    break;

                case 'Tab':
                    // Move to next section
                    e.preventDefault();
                    if (!hasValidFocus) {
                        focusFirstNavigableElement();
                        break;
                    }
                    buildNavGrid();
                    if (navGrid.length === 0) break;
                    syncNavPositionWithFocusedElement();
                    if (e.shiftKey) {
                        // Find previous section
                        const curSection = navGrid[navRow]?.section;
                        for (let i = navRow - 1; i >= 0; i--) {
                            if (navGrid[i].section !== curSection) {
                                navRow = i;
                                navCol = 0;
                                break;
                            }
                        }
                        if (navGrid[navRow]?.section === curSection) {
                            // Wrap to last section
                            for (let i = navGrid.length - 1; i >= 0; i--) {
                                if (navGrid[i].section !== curSection) {
                                    navRow = i;
                                    navCol = 0;
                                    break;
                                }
                            }
                        }
                    } else {
                        // Find next section
                        const curSection = navGrid[navRow]?.section;
                        let found = false;
                        for (let i = navRow + 1; i < navGrid.length; i++) {
                            if (navGrid[i].section !== curSection) {
                                navRow = i;
                                navCol = 0;
                                found = true;
                                break;
                            }
                        }
                        if (!found) {
                            navRow = 0;
                            navCol = 0;
                        }
                    }
                    applyNavFocus();
                    break;
            }
        });

        document.addEventListener('keyup', (e) => {
            if (ARROW_KEYS.has(e.key)) {
                pressedArrowKeys.delete(e.key);
            }
        });

        window.addEventListener('blur', () => {
            pressedArrowKeys.clear();
            cancelArrowFocusDwell();
        });
    }

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
