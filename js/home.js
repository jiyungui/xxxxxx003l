/* ─── home.js 完整替换 ─── */
'use strict';

const APP_NAMES = {
    chat: '聊天',
    worldbook: '世界书',
    voice: '心声',
    forum: '论坛',
    diary: '小芽日记',
    street: '街の声',
    candy: '糖果铺',
    music: '音乐',
    settings: '设置'
};

const DEVELOPED_APPS = ['settings', 'worldbook', 'chat'];

function openApp(appId) {
    if (appId === 'settings') { openSettingsApp(); return; }
    if (appId === 'worldbook') { openWorldbookApp(); return; }
    if (appId === 'chat') { openChatApp(); return; }

    if (!DEVELOPED_APPS.includes(appId)) {
        const overlay = document.getElementById('appOverlay');
        document.getElementById('overlayAppName').textContent = APP_NAMES[appId] || appId;
        overlay.style.animation = '';
        overlay.classList.remove('hidden');
        void overlay.offsetWidth;
        overlay.style.animation = 'slideUp 0.3s cubic-bezier(0.34,1.2,0.64,1)';
    }
}

function closeApp() {
    const overlay = document.getElementById('appOverlay');
    overlay.style.animation = 'slideDown 0.22s ease forwards';
    setTimeout(() => {
        overlay.classList.add('hidden');
        overlay.style.animation = '';
    }, 220);
}

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeApp();
});
