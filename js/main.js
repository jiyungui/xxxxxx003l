/* ═══════════════════════════════════════════════════════
   main.js  v3
═══════════════════════════════════════════════════════ */
'use strict';

function _updateClock() {
    const now = new Date();
    const el = document.getElementById('statusTime');
    if (el) {
        el.textContent =
            String(now.getHours()).padStart(2, '0') + ':' +
            String(now.getMinutes()).padStart(2, '0');
    }
}
_updateClock();
setInterval(_updateClock, 15000);

function _setVhFix() {
    document.documentElement.style.setProperty(
        '--vh', (window.innerHeight * 0.01) + 'px'
    );
}
_setVhFix();
window.addEventListener('resize', _setVhFix);

document.addEventListener('gesturestart', e => e.preventDefault(), { passive: false });
document.addEventListener('touchmove', e => {
    if (e.touches.length > 1) e.preventDefault();
}, { passive: false });

document.addEventListener('pointerdown', (e) => {
    const active = document.activeElement;
    if (
        active &&
        active.getAttribute('contenteditable') === 'true' &&
        !active.contains(e.target)
    ) {
        active.blur();
    }
});

function _init() {
    restoreWidgets();    // widgets.js
    bindTextEdits();     // widgets.js
    restoreSettings();   // settings.js ← 新增
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
} else {
    _init();
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(() => { });
    });
}
