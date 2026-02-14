/**
 * dwell.js — Dwell-click engine
 * Manages hover timers, visual progress, and activation logic.
 */

const DwellEngine = (() => {
    'use strict';

    let dwellTime = 800;       // milliseconds
    let cooldownTime = 300;    // milliseconds after activation
    let soundEnabled = true;
    let dwellEnabled = true;   // when false, only click activates keys

    // State
    let activeKey = null;       // currently dwelling key code
    let dwellTimer = null;      // setTimeout ID
    let dwellStart = 0;         // timestamp when dwell started
    let animFrame = null;       // requestAnimationFrame ID
    let onActivateCallback = null;

    // Ring indicator
    let ringEl = null;
    let ringProgress = null;

    /**
     * Initialize the dwell engine.
     * @param {Object} options
     * @param {Function} options.onActivate - callback(keyCode)
     * @param {number} [options.dwellTime=800]
     * @param {number} [options.cooldownTime=300]
     * @param {boolean} [options.soundEnabled=true]
     */
    function init(options) {
        onActivateCallback = options.onActivate;
        if (options.dwellTime != null) dwellTime = options.dwellTime;
        if (options.cooldownTime != null) cooldownTime = options.cooldownTime;
        if (options.soundEnabled != null) soundEnabled = options.soundEnabled;
        if (options.dwellEnabled != null) dwellEnabled = options.dwellEnabled;

        ringEl = document.getElementById('dwell-indicator');
        ringProgress = document.getElementById('dwell-ring-progress');

        // Update CSS variable for dwell fill animation
        document.documentElement.style.setProperty('--dwell-duration', dwellTime + 'ms');
    }

    /**
     * Attach dwell listeners to all keys and prediction buttons.
     * @param {Object} keyElements - { code: { el, def } }
     */
    function attachToKeys(keyElements) {
        Object.entries(keyElements).forEach(([code, { el }]) => {
            el.addEventListener('pointerenter', (e) => {
                if (dwellEnabled) startDwell(code, el, e);
            });
            el.addEventListener('pointerleave', () => {
                if (dwellEnabled) cancelDwell(code, el);
            });
            el.addEventListener('pointermove', (e) => {
                if (dwellEnabled) updateRingPosition(e);
            });
            // Click — immediate activation (always works)
            el.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                if (dwellEnabled) cancelDwell(code, el);
                activate(code, el);
            });
        });
    }

    /**
     * Attach dwell to a prediction button.
     * @param {HTMLElement} btnEl
     * @param {Function} onSelect
     */
    function attachToPrediction(btnEl, onSelect) {
        let predTimer = null;
        let predDwellBg = btnEl.querySelector('.dwell-fill');

        btnEl.addEventListener('pointerenter', () => {
            if (!dwellEnabled) return;
            btnEl.classList.add('dwelling');
            if (predDwellBg) {
                predDwellBg.style.transition = `width ${dwellTime}ms linear`;
                predDwellBg.style.width = '100%';
            }
            predTimer = setTimeout(() => {
                btnEl.classList.remove('dwelling');
                if (predDwellBg) {
                    predDwellBg.style.transition = 'none';
                    predDwellBg.style.width = '0%';
                }
                onSelect();
                playSound();
            }, dwellTime);
        });

        btnEl.addEventListener('pointerleave', () => {
            if (!dwellEnabled) return;
            btnEl.classList.remove('dwelling');
            if (predDwellBg) {
                predDwellBg.style.transition = 'none';
                predDwellBg.style.width = '0%';
            }
            if (predTimer) {
                clearTimeout(predTimer);
                predTimer = null;
            }
        });

        // Click fallback
        btnEl.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            btnEl.classList.remove('dwelling');
            if (predDwellBg) {
                predDwellBg.style.transition = 'none';
                predDwellBg.style.width = '0%';
            }
            if (predTimer) {
                clearTimeout(predTimer);
                predTimer = null;
            }
            onSelect();
            playSound();
        });
    }

    /**
     * Start dwelling on a key.
     */
    function startDwell(code, el, event) {
        if (el.classList.contains('cooldown')) return;

        activeKey = code;
        dwellStart = performance.now();
        el.classList.add('dwelling');

        // Set CSS variable for animation duration
        el.style.setProperty('--dwell-duration', dwellTime + 'ms');

        // Show ring indicator
        showRing(event);
        animateRing();

        // Start timer
        dwellTimer = setTimeout(() => {
            activate(code, el);
        }, dwellTime);
    }

    /**
     * Cancel dwelling.
     */
    function cancelDwell(code, el) {
        if (activeKey === code) {
            activeKey = null;
            el.classList.remove('dwelling');
            clearTimeout(dwellTimer);
            dwellTimer = null;
            hideRing();
            cancelAnimationFrame(animFrame);
        }
    }

    /**
     * Activate a key (dwell completed or clicked).
     */
    function activate(code, el) {
        activeKey = null;
        el.classList.remove('dwelling');
        clearTimeout(dwellTimer);
        dwellTimer = null;
        hideRing();
        cancelAnimationFrame(animFrame);

        // Flash effect
        KeyboardModule.flashKey(code);

        // Cooldown
        KeyboardModule.setCooldown(code, cooldownTime);

        // Sound
        playSound();

        // Callback
        if (onActivateCallback) {
            onActivateCallback(code);
        }
    }

    /**
     * Show the ring indicator near cursor.
     */
    function showRing(event) {
        if (!ringEl) return;
        ringEl.classList.add('visible');
        updateRingPosition(event);
    }

    function hideRing() {
        if (!ringEl) return;
        ringEl.classList.remove('visible');
        resetRingProgress();
    }

    function updateRingPosition(event) {
        if (!ringEl || !ringEl.classList.contains('visible')) return;
        ringEl.style.left = event.clientX + 'px';
        ringEl.style.top = (event.clientY - 40) + 'px';
    }

    function resetRingProgress() {
        if (!ringProgress) return;
        ringProgress.style.transition = 'none';
        ringProgress.style.strokeDashoffset = '100.53';
    }

    /**
     * Animate the ring progress.
     */
    function animateRing() {
        if (!ringProgress) return;

        // Reset first
        ringProgress.style.transition = 'none';
        ringProgress.style.strokeDashoffset = '100.53';

        // Force reflow
        ringProgress.getBoundingClientRect();

        // Animate
        ringProgress.style.transition = `stroke-dashoffset ${dwellTime}ms linear`;
        ringProgress.style.strokeDashoffset = '0';
    }

    /**
     * Play activation sound.
     */
    function playSound() {
        if (!soundEnabled) return;
        try {
            // Use Web Audio API for a clean short click
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 880;
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.08);
        } catch (e) {
            // Silently fail if audio not available
        }
    }

    // --- Configuration setters ---
    function setDwellTime(ms) {
        dwellTime = ms;
        document.documentElement.style.setProperty('--dwell-duration', ms + 'ms');
    }

    function setCooldownTime(ms) {
        cooldownTime = ms;
    }

    function setSoundEnabled(enabled) {
        soundEnabled = enabled;
    }

    function getDwellTime() {
        return dwellTime;
    }

    function setDwellEnabled(enabled) {
        dwellEnabled = enabled;
    }

    function isDwellEnabled() {
        return dwellEnabled;
    }

    return {
        init,
        attachToKeys,
        attachToPrediction,
        setDwellTime,
        setCooldownTime,
        setSoundEnabled,
        setDwellEnabled,
        isDwellEnabled,
        getDwellTime,
    };
})();
