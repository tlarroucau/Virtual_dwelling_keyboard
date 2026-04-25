/**
 * fullscreen.js — remembers fullscreen intent across same-origin page changes.
 */
(function () {
    'use strict';

    const STORAGE_KEY = 'vdkFullscreenIntent';
    const RESTORE_BTN_ID = 'fullscreen-restore-btn';

    function hasStoredIntent() {
        try {
            return sessionStorage.getItem(STORAGE_KEY) === '1';
        } catch (e) {
            return false;
        }
    }

    function setStoredIntent() {
        try {
            sessionStorage.setItem(STORAGE_KEY, '1');
        } catch (e) { /* ignore */ }
    }

    function isFullscreenLike() {
        if (document.fullscreenElement) return true;

        const widthMatches = Math.abs(window.innerWidth - screen.width) <= 2 ||
            Math.abs(window.innerWidth - screen.availWidth) <= 2;
        const heightMatches = Math.abs(window.innerHeight - screen.height) <= 2 ||
            Math.abs(window.innerHeight - screen.availHeight) <= 2;
        return widthMatches && heightMatches;
    }

    function rememberIntent() {
        if (hasStoredIntent() || isFullscreenLike()) {
            setStoredIntent();
        }
    }

    function removeRestoreButton() {
        const existing = document.getElementById(RESTORE_BTN_ID);
        if (existing) existing.remove();
    }

    async function requestFullscreen() {
        if (!document.fullscreenEnabled || document.fullscreenElement) {
            removeRestoreButton();
            return false;
        }

        try {
            await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
            setStoredIntent();
            removeRestoreButton();
            return true;
        } catch (e) {
            return false;
        }
    }

    function createRestoreButton(attachDwell) {
        if (document.getElementById(RESTORE_BTN_ID)) return;
        if (!document.fullscreenEnabled || isFullscreenLike()) return;

        const btn = document.createElement('button');
        btn.id = RESTORE_BTN_ID;
        btn.className = 'fullscreen-restore-btn';
        btn.type = 'button';
        btn.setAttribute('aria-label', 'Volver a pantalla completa');
        btn.innerHTML = '<span class="btn-icon">⛶</span><span>Pantalla completa</span><div class="dwell-fill"></div>';

        const action = () => {
            requestFullscreen().then((restored) => {
                if (!restored) btn.classList.add('fullscreen-restore-pending');
            });
        };

        document.body.appendChild(btn);

        if (typeof attachDwell === 'function') {
            attachDwell(btn, action);
        } else {
            btn.addEventListener('pointerdown', (event) => {
                event.preventDefault();
                action();
            });
        }
    }

    function init(attachDwell) {
        if (!hasStoredIntent()) return;

        if (isFullscreenLike()) {
            removeRestoreButton();
            return;
        }

        createRestoreButton(attachDwell);

        document.addEventListener('pointerdown', (event) => {
            if (!hasStoredIntent() || isFullscreenLike()) return;
            if (event.target.closest && event.target.closest(`#${RESTORE_BTN_ID}`)) return;
            if (event.isTrusted) requestFullscreen();
        }, { capture: true });

        document.addEventListener('fullscreenchange', () => {
            if (document.fullscreenElement) removeRestoreButton();
        });
    }

    window.FullscreenHandoff = {
        init,
        rememberIntent,
        requestFullscreen,
    };
})();