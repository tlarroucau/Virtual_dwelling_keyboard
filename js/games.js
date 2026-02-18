/**
 * games.js — Games page controller
 * Sudoku game with dwell-click support.
 */

(function () {
    'use strict';

    // ========================================================
    // Theme persistence (read from main app settings)
    // ========================================================
    function applyStoredTheme() {
        try {
            const raw = localStorage.getItem('vdkSettings');
            if (!raw) return;
            const s = JSON.parse(raw);
            if (s.theme) document.body.setAttribute('data-theme', s.theme);
        } catch (e) { /* ignore */ }
    }

    // ========================================================
    // Dwell helpers
    // ========================================================
    let dwellTime = 800;
    let dwellEnabled = true;

    function loadDwellSettings() {
        try {
            const raw = localStorage.getItem('vdkSettings');
            if (!raw) return;
            const s = JSON.parse(raw);
            if (s.dwellTime) dwellTime = parseInt(s.dwellTime);
            if (s.dwellEnabled != null) dwellEnabled = s.dwellEnabled;
        } catch (e) { /* ignore */ }
    }

    /**
     * Attach dwell + click to any button element.
     * @param {HTMLElement} btn
     * @param {Function} action
     */
    function attachDwell(btn, action) {
        let timer = null;
        const fill = btn.querySelector('.dwell-fill');

        btn.addEventListener('pointerenter', () => {
            if (!dwellEnabled) return;
            btn.classList.add('dwelling');
            if (fill) {
                fill.style.transition = `width ${dwellTime}ms linear`;
                fill.style.width = '100%';
            }
            timer = setTimeout(() => {
                btn.classList.remove('dwelling');
                if (fill) {
                    fill.style.transition = 'none';
                    fill.style.width = '0%';
                }
                action();
                playSound();
            }, dwellTime);
        });

        btn.addEventListener('pointerleave', () => {
            btn.classList.remove('dwelling');
            if (fill) {
                fill.style.transition = 'none';
                fill.style.width = '0%';
            }
            if (timer) {
                clearTimeout(timer);
                timer = null;
            }
        });

        btn.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            btn.classList.remove('dwelling');
            if (fill) {
                fill.style.transition = 'none';
                fill.style.width = '0%';
            }
            if (timer) {
                clearTimeout(timer);
                timer = null;
            }
            action();
            playSound();
        });
    }

    function playSound() {
        try {
            const raw = localStorage.getItem('vdkSettings');
            if (raw) {
                const s = JSON.parse(raw);
                if (s.soundEnabled === false) return;
            }
        } catch (e) { /* ignore */ }
        try {
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
        } catch (e) { /* ignore */ }
    }

    // ========================================================
    // Navigation: game selector <-> game area
    // ========================================================
    const gameSelector = document.getElementById('game-selector');
    const sudokuArea = document.getElementById('sudoku-area');

    function showSelector() {
        gameSelector.style.display = '';
        sudokuArea.style.display = 'none';
    }

    function showSudoku() {
        gameSelector.style.display = 'none';
        sudokuArea.style.display = '';
        if (!sudokuInitialized) initSudoku();
    }

    // ========================================================
    // SUDOKU ENGINE
    // ========================================================
    let sudokuInitialized = false;
    let sudokuSolution = [];
    let sudokuBoard = [];       // current player board
    let sudokuGiven = [];       // boolean 9x9 — true if pre-filled
    let selectedCell = null;    // { row, col }

    const sudokuBoardEl = document.getElementById('sudoku-board');
    const sudokuNumpadEl = document.getElementById('sudoku-numpad');
    const sudokuMessage = document.getElementById('sudoku-message');

    /**
     * Generate a solved Sudoku board using backtracking.
     */
    function generateSolvedBoard() {
        const board = Array.from({ length: 9 }, () => Array(9).fill(0));

        function isValid(board, row, col, num) {
            for (let i = 0; i < 9; i++) {
                if (board[row][i] === num) return false;
                if (board[i][col] === num) return false;
            }
            const br = Math.floor(row / 3) * 3;
            const bc = Math.floor(col / 3) * 3;
            for (let r = br; r < br + 3; r++) {
                for (let c = bc; c < bc + 3; c++) {
                    if (board[r][c] === num) return false;
                }
            }
            return true;
        }

        function solve(board) {
            for (let r = 0; r < 9; r++) {
                for (let c = 0; c < 9; c++) {
                    if (board[r][c] === 0) {
                        const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
                        for (const n of nums) {
                            if (isValid(board, r, c, n)) {
                                board[r][c] = n;
                                if (solve(board)) return true;
                                board[r][c] = 0;
                            }
                        }
                        return false;
                    }
                }
            }
            return true;
        }

        solve(board);
        return board;
    }

    function shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    /**
     * Create a puzzle by removing cells from a solved board.
     * @param {number[][]} solved
     * @param {number} clues — number of cells to keep visible (30–40 for medium)
     */
    function createPuzzle(solved, clues) {
        const board = solved.map(row => [...row]);
        const given = Array.from({ length: 9 }, () => Array(9).fill(true));
        const positions = [];
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                positions.push([r, c]);
            }
        }
        shuffle(positions);

        let removed = 0;
        const toRemove = 81 - clues;
        for (const [r, c] of positions) {
            if (removed >= toRemove) break;
            board[r][c] = 0;
            given[r][c] = false;
            removed++;
        }

        return { board, given };
    }

    function initSudoku() {
        sudokuInitialized = true;
        newSudokuGame();
        buildNumpad();
    }

    function newSudokuGame() {
        sudokuMessage.textContent = '';
        selectedCell = null;
        sudokuSolution = generateSolvedBoard();
        const puzzle = createPuzzle(sudokuSolution, 35);
        sudokuBoard = puzzle.board;
        sudokuGiven = puzzle.given;
        renderSudokuBoard();
    }

    function renderSudokuBoard() {
        sudokuBoardEl.innerHTML = '';
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const cell = document.createElement('div');
                cell.className = 'sudoku-cell';
                cell.setAttribute('data-row', r);
                cell.setAttribute('data-col', c);

                if (sudokuGiven[r][c]) {
                    cell.classList.add('given');
                    cell.textContent = sudokuBoard[r][c];
                } else {
                    cell.textContent = sudokuBoard[r][c] || '';
                }

                // Add dwell fill
                const fill = document.createElement('div');
                fill.className = 'dwell-fill';
                cell.appendChild(fill);

                // Attach dwell for cell selection
                const row = r, col = c;
                attachDwell(cell, () => selectSudokuCell(row, col));

                sudokuBoardEl.appendChild(cell);
            }
        }
    }

    function selectSudokuCell(row, col) {
        if (sudokuGiven[row][col]) return;

        // Remove previous selection
        sudokuBoardEl.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));

        selectedCell = { row, col };
        const idx = row * 9 + col;
        sudokuBoardEl.children[idx].classList.add('selected');
    }

    function placeNumber(num) {
        if (!selectedCell) {
            sudokuMessage.textContent = 'Selecciona una celda primero';
            sudokuMessage.className = 'game-message error';
            return;
        }
        const { row, col } = selectedCell;
        if (sudokuGiven[row][col]) return;

        sudokuBoard[row][col] = num;
        const idx = row * 9 + col;
        const cell = sudokuBoardEl.children[idx];
        cell.textContent = num || '';
        cell.classList.remove('error');

        // Re-add dwell fill
        if (!cell.querySelector('.dwell-fill')) {
            const fill = document.createElement('div');
            fill.className = 'dwell-fill';
            cell.appendChild(fill);
        }

        // Check if complete
        if (isBoardFull()) {
            checkSudokuSolution();
        }
    }

    function eraseNumber() {
        if (!selectedCell) return;
        placeNumber(0);
        const idx = selectedCell.row * 9 + selectedCell.col;
        sudokuBoardEl.children[idx].textContent = '';
        // Re-add dwell fill
        const cell = sudokuBoardEl.children[idx];
        if (!cell.querySelector('.dwell-fill')) {
            const fill = document.createElement('div');
            fill.className = 'dwell-fill';
            cell.appendChild(fill);
        }
    }

    function isBoardFull() {
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (sudokuBoard[r][c] === 0) return false;
            }
        }
        return true;
    }

    function checkSudokuSolution() {
        let correct = true;
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const idx = r * 9 + c;
                const cell = sudokuBoardEl.children[idx];
                if (sudokuBoard[r][c] !== sudokuSolution[r][c]) {
                    correct = false;
                    if (!sudokuGiven[r][c]) {
                        cell.classList.add('error');
                    }
                } else {
                    cell.classList.remove('error');
                }
            }
        }

        if (correct) {
            sudokuMessage.textContent = '🎉 ¡Felicidades! ¡Sudoku completado!';
            sudokuMessage.className = 'game-message success';
        } else {
            sudokuMessage.textContent = '❌ Hay errores. Las celdas incorrectas están marcadas en rojo.';
            sudokuMessage.className = 'game-message error';
        }
    }

    function giveSudokuHint() {
        // Find an empty or incorrect cell and fill it
        const emptyCells = [];
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (!sudokuGiven[r][c] && sudokuBoard[r][c] !== sudokuSolution[r][c]) {
                    emptyCells.push([r, c]);
                }
            }
        }
        if (emptyCells.length === 0) {
            sudokuMessage.textContent = '✅ ¡Todo correcto! No hay más pistas.';
            sudokuMessage.className = 'game-message success';
            return;
        }

        const [r, c] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        sudokuBoard[r][c] = sudokuSolution[r][c];
        const idx = r * 9 + c;
        const cell = sudokuBoardEl.children[idx];
        cell.textContent = sudokuSolution[r][c];
        cell.classList.remove('error');
        cell.classList.add('hint-flash');
        setTimeout(() => cell.classList.remove('hint-flash'), 700);

        // Re-add dwell fill
        if (!cell.querySelector('.dwell-fill')) {
            const fill = document.createElement('div');
            fill.className = 'dwell-fill';
            cell.appendChild(fill);
        }

        sudokuMessage.textContent = '💡 Pista colocada';
        sudokuMessage.className = 'game-message';

        if (isBoardFull()) {
            checkSudokuSolution();
        }
    }

    function buildNumpad() {
        sudokuNumpadEl.innerHTML = '';
        for (let n = 1; n <= 9; n++) {
            const btn = document.createElement('button');
            btn.className = 'numpad-btn';
            btn.textContent = n;
            btn.setAttribute('aria-label', `Número ${n}`);
            const fill = document.createElement('div');
            fill.className = 'dwell-fill';
            btn.appendChild(fill);
            const num = n;
            attachDwell(btn, () => placeNumber(num));
            sudokuNumpadEl.appendChild(btn);
        }
        // Erase button
        const eraseBtn = document.createElement('button');
        eraseBtn.className = 'numpad-btn erase-btn';
        eraseBtn.textContent = '⌫ Borrar';
        eraseBtn.setAttribute('aria-label', 'Borrar número');
        const fill = document.createElement('div');
        fill.className = 'dwell-fill';
        eraseBtn.appendChild(fill);
        attachDwell(eraseBtn, () => eraseNumber());
        sudokuNumpadEl.appendChild(eraseBtn);
    }

    // ========================================================
    // INITIALIZATION
    // ========================================================
    function initGamesPage() {
        applyStoredTheme();
        loadDwellSettings();

        // Wire game selector card
        attachDwell(document.getElementById('select-sudoku'), showSudoku);

        // Wire Sudoku controls
        attachDwell(document.getElementById('sudoku-new'), () => newSudokuGame());
        attachDwell(document.getElementById('sudoku-check'), () => checkSudokuSolution());
        attachDwell(document.getElementById('sudoku-hint'), () => giveSudokuHint());
        attachDwell(document.getElementById('sudoku-back-to-menu'), showSelector);

        // Wire back button
        attachDwell(document.getElementById('back-btn'), () => {
            window.location.href = 'index.html';
        });
    }

    // Start
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initGamesPage);
    } else {
        initGamesPage();
    }
})();
