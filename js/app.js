/* ==========================================================================
   AA机 - 核心主应用控制器 (App Main Controller)
   负责路由调度、状态同步、IndexedDB 异步加载与持久化
   ========================================================================== */

import { INITIAL_DATA } from './data.js';
import { ICONS } from './icons.js';
import { ChatModule } from './chat.js';
import { Modules } from './modules.js';
import { db } from './storage.js';

class AAApp {
  constructor() {
    this.data = INITIAL_DATA;
    this.currentTab = 'chat';
    this.chatModule = new ChatModule(this);

    this.initApp();
  }

  async initApp() {
    // 从 IndexedDB 读取大容量持久化数据，避免 localStorage 爆黑屏
    const savedProfile = await db.get('profile_data');
    if (savedProfile) {
      this.data.profile = { ...this.data.profile, ...savedProfile };
    }

    const savedChats = await db.get('chats_data');
    if (savedChats) {
      this.data.chats = savedChats;
    }

    this.initDOM();
    this.bindGlobalEvents();
    this.startClock();
    this.switchTab('chat');
  }

  initDOM() {
    // 渲染侧边常驻 Dock 栏 (9大板块)
    const dockNav = document.getElementById('dock-nav-list');
    const dockItems = [
      { id: 'chat', label: '对话', icon: ICONS.chat, badge: false },
      { id: 'feed', label: '动态', icon: ICONS.feed },
      { id: 'character', label: '角色', icon: ICONS.character },
      { id: 'mask', label: '面具', icon: ICONS.mask },
      { id: 'beauty', label: '美化', icon: ICONS.beauty },
      { id: 'wallet', label: '钱包', icon: ICONS.wallet },
      { id: 'favorite', label: '收藏', icon: ICONS.favorite },
      { id: 'shopping', label: '购物', icon: ICONS.shopping },
      { id: 'setting', label: '设置', icon: ICONS.setting }
    ];

    dockNav.innerHTML = dockItems.map(item => `
      <button class="dock-nav-item ${item.id === 'chat' ? 'active' : ''}" data-tab="${item.id}" title="${item.label}">
        ${item.icon}
        <span class="dock-label-min">${item.label}</span>
        ${item.badge ? '<span class="dock-badge-dot"></span>' : ''}
      </button>
    `).join('');

    // 渲染 P1 展开式大抽屉
    this.renderSideDrawer();
  }

  renderSideDrawer() {
    const drawerPanel = document.getElementById('side-drawer-panel');
    const { couple } = this.data;

    drawerPanel.innerHTML = `
      <div class="drawer-header-card">
        <div class="drawer-user-info">
          <div class="drawer-avatar-group">
            <div class="avatar-circle avatar-1" style="background-image: url('${couple.avatar1}')"></div>
            <div class="avatar-circle avatar-2" style="background-image: url('${couple.avatar2}')"></div>
          </div>
          <div class="drawer-user-meta">
            <span class="couple-names">${couple.title}</span>
            <span class="couple-days">在一起的第 ${couple.days} 天</span>
          </div>
        </div>
        <button class="drawer-close-btn" id="btn-close-drawer">${ICONS.close}</button>
      </div>

      <div class="drawer-groups-wrap">
        <!-- 1. 对话窗口群 -->
        <div class="drawer-section-group">
          <div class="drawer-section-title">
            ${ICONS.chat}
            <span>Messages & Chat</span>
          </div>
          <ul class="drawer-subitems-list">
            <li class="drawer-subitem-link" data-tab="chat">立华奏 专属主页</li>
            <li class="drawer-add-window-btn" id="drawer-add-chat-btn">+ 新增窗口</li>
          </ul>
        </div>

        <!-- 2. 双人共听 / 频道 -->
        <div class="drawer-section-group">
          <div class="drawer-section-title">
            ${ICONS.music}
            <span>Listen Together</span>
          </div>
          <ul class="drawer-subitems-list">
            <li class="drawer-subitem-link">主播放室 · 有我呢</li>
            <li class="drawer-subitem-link">晚安电台 · 专属音频</li>
            <li class="drawer-add-window-btn">+ 新增窗口</li>
          </ul>
        </div>

        <!-- 3. 专属钱包 -->
        <div class="drawer-section-group">
          <div class="drawer-section-title">
            ${ICONS.wallet}
            <span>Puppy Wallet</span>
          </div>
          <ul class="drawer-subitems-list">
            <li class="drawer-subitem-link" data-tab="wallet">账单明细流水</li>
            <li class="drawer-subitem-link" data-tab="wallet">审批条专区</li>
            <li class="drawer-add-window-btn">+ 新增窗口</li>
          </ul>
        </div>

        <!-- 4. 其它功能快捷入口 -->
        <div class="drawer-section-group">
          <div class="drawer-section-title">
            ${ICONS.setting}
            <span>Other Modules</span>
          </div>
          <ul class="drawer-subitems-list">
            <li class="drawer-subitem-link" data-tab="feed">动态 Moments</li>
            <li class="drawer-subitem-link" data-tab="character">角色库 Characters</li>
            <li class="drawer-subitem-link" data-tab="mask">面具库 Masks</li>
            <li class="drawer-subitem-link" data-tab="beauty">美化 Themes</li>
            <li class="drawer-subitem-link" data-tab="favorite">收藏 Favorites</li>
            <li class="drawer-subitem-link" data-tab="shopping">购物 Store</li>
            <li class="drawer-subitem-link" data-tab="setting">系统设置 Settings</li>
          </ul>
        </div>
      </div>

      <div class="drawer-bottom-action">
        <div class="drawer-bottom-add-btn">
          ${ICONS.plus}
          <span>新增自定义应用</span>
        </div>
      </div>
    `;
  }

  bindGlobalEvents() {
    const dockNav = document.getElementById('dock-nav-list');
    dockNav.addEventListener('click', (e) => {
      const item = e.target.closest('.dock-nav-item');
      if (!item) return;
      const tab = item.dataset.tab;
      this.switchTab(tab);
    });

    const drawerOverlay = document.getElementById('side-drawer-overlay');
    const drawerTrigger = document.getElementById('dock-drawer-trigger');
    const drawerCloseBtn = document.getElementById('btn-close-drawer');

    const openDrawer = () => drawerOverlay.classList.add('active');
    const closeDrawer = () => drawerOverlay.classList.remove('active');

    drawerTrigger.addEventListener('click', openDrawer);
    if (drawerCloseBtn) drawerCloseBtn.addEventListener('click', closeDrawer);

    drawerOverlay.addEventListener('click', (e) => {
      if (e.target === drawerOverlay) closeDrawer();
    });

    drawerOverlay.addEventListener('click', (e) => {
      const link = e.target.closest('.drawer-subitem-link');
      if (link && link.dataset.tab) {
        this.switchTab(link.dataset.tab);
        closeDrawer();
      }
    });
  }

  switchTab(tabId) {
    this.currentTab = tabId;

    document.querySelectorAll('.dock-nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    const convView = document.getElementById('chat-conversation-view');
    if (convView && tabId !== 'chat') {
      convView.classList.remove('active');
    }

    document.querySelectorAll('.module-page').forEach(page => {
      page.classList.remove('active');
    });

    const targetPage = document.getElementById(`page-${tabId}`);
    if (targetPage) {
      targetPage.innerHTML = this.renderModuleContent(tabId);
      targetPage.classList.add('active');

      if (tabId === 'chat') {
        this.chatModule.bindEvents();
      }
    }
  }

  renderModuleContent(tabId) {
    switch (tabId) {
      case 'chat':
        return this.chatModule.renderList();
      case 'feed':
        return Modules.renderFeed(this.data);
      case 'character':
        return Modules.renderCharacters(this.data);
      case 'mask':
        return Modules.renderMasks(this.data);
      case 'beauty':
        return Modules.renderBeauty(this.data);
      case 'wallet':
        return Modules.renderWallet(this.data);
      case 'favorite':
        return Modules.renderFavorites(this.data);
      case 'shopping':
        return Modules.renderShopping(this.data);
      case 'setting':
        return Modules.renderSettings(this.data);
      default:
        return `<div style="padding: 20px;">板块施工中...</div>`;
    }
  }

  renderChatListOnly() {
    if (this.currentTab === 'chat') {
      const page = document.getElementById('page-chat');
      if (page) {
        page.innerHTML = this.chatModule.renderList();
        this.chatModule.bindEvents();
      }
    }
  }

  startClock() {
    const timeEl = document.getElementById('statusbar-time');
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      if (timeEl) timeEl.textContent = `${hours}:${mins}`;
    };
    updateTime();
    setInterval(updateTime, 1000);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new AAApp();
});
