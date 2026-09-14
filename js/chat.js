/* ==========================================================================
   AA机 - Chat 对话模块业务逻辑 (Profile Widget & Zero-loss IndexedDB Storage)
   支持背景图点击更换、全功能构图位置与缩放弹窗调节
   ========================================================================== */

import { ICONS } from './icons.js';
import { db } from './storage.js';

export class ChatModule {
  constructor(app) {
    this.app = app;
    this.currentChatId = null;
    this.imagePickerTarget = null;
    this.searchQuery = '';

    // 图片构图调节临时状态
    this.cropState = {
      rawImg: '',
      target: 'banner',
      posX: 50,
      posY: 50,
      scale: 100,
      isDragging: false,
      startX: 0,
      startY: 0
    };

    this.initFilePicker();
  }

  initFilePicker() {
    let input = document.getElementById('aa-universal-file-input');
    if (!input) {
      input = document.createElement('input');
      input.type = 'file';
      input.id = 'aa-universal-file-input';
      input.accept = 'image/*';
      input.style.display = 'none';
      document.body.appendChild(input);

      input.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
          const imgData = event.target.result;
          if (this.imagePickerTarget === 'banner') {
            // 打开构图调节弹窗
            this.openCropModal(imgData, 'banner');
          } else if (this.imagePickerTarget === 'avatar') {
            this.app.data.profile.avatar = imgData;
            await db.set('profile_data', this.app.data.profile);
            const avatarEl = document.getElementById('profile-widget-avatar');
            if (avatarEl) {
              avatarEl.style.backgroundImage = `url('${imgData}')`;
              avatarEl.innerHTML = '';
            }
          }
        };
        reader.readAsDataURL(file);
        input.value = '';
      });
    }
    this.fileInput = input;
  }

  // 打开构图调节弹窗
  openCropModal(imgSrc, target = 'banner') {
    this.cropState.rawImg = imgSrc;
    this.cropState.target = target;
    this.cropState.posX = this.app.data.profile.bannerPosX || 50;
    this.cropState.posY = this.app.data.profile.bannerPosY || 50;
    this.cropState.scale = this.app.data.profile.bannerScale || 100;

    let modal = document.getElementById('image-adjust-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'image-adjust-modal';
      modal.className = 'img-adjust-modal-overlay';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="img-adjust-dialog">
        <div class="adjust-modal-header">
          <h3>调节背景图显示区域</h3>
          <button class="adjust-modal-close-btn" id="btn-close-crop">${ICONS.close}</button>
        </div>

        <div class="adjust-viewport-wrap">
          <div class="adjust-crop-frame" id="crop-frame">
            <img src="${imgSrc}" class="adjust-image-target" id="crop-img-target" draggable="false" />
            <div class="adjust-grid-overlay"></div>
          </div>
          <span class="adjust-drag-tip">可直接按住图片拖动位置，或使用下方滑条</span>
        </div>

        <div class="adjust-controls-panel">
          <div class="adjust-slider-row">
            <span class="adjust-slider-label">缩放</span>
            <input type="range" class="adjust-range-slider" id="crop-scale-slider" min="100" max="250" value="${this.cropState.scale}" />
          </div>
          <div class="adjust-slider-row">
            <span class="adjust-slider-label">垂直</span>
            <input type="range" class="adjust-range-slider" id="crop-posy-slider" min="0" max="100" value="${this.cropState.posY}" />
          </div>
          <div class="adjust-slider-row">
            <span class="adjust-slider-label">水平</span>
            <input type="range" class="adjust-range-slider" id="crop-posx-slider" min="0" max="100" value="${this.cropState.posX}" />
          </div>
        </div>

        <div class="adjust-actions-footer">
          <button class="btn-adjust-reset" id="btn-crop-reset">重置</button>
          <button class="btn-adjust-confirm" id="btn-crop-confirm">确认应用</button>
        </div>
      </div>
    `;

    modal.classList.add('active');
    this.bindCropEvents(modal);
    this.updateCropPreview();
  }

  bindCropEvents(modal) {
    const closeBtn = document.getElementById('btn-close-crop');
    const confirmBtn = document.getElementById('btn-crop-confirm');
    const resetBtn = document.getElementById('btn-crop-reset');
    const scaleSlider = document.getElementById('crop-scale-slider');
    const posySlider = document.getElementById('crop-posy-slider');
    const posxSlider = document.getElementById('crop-posx-slider');
    const frame = document.getElementById('crop-frame');

    const closeModal = () => modal.classList.remove('active');

    closeBtn.addEventListener('click', closeModal);

    scaleSlider.addEventListener('input', (e) => {
      this.cropState.scale = parseInt(e.target.value);
      this.updateCropPreview();
    });

    posySlider.addEventListener('input', (e) => {
      this.cropState.posY = parseInt(e.target.value);
      this.updateCropPreview();
    });

    posxSlider.addEventListener('input', (e) => {
      this.cropState.posX = parseInt(e.target.value);
      this.updateCropPreview();
    });

    resetBtn.addEventListener('click', () => {
      this.cropState.scale = 100;
      this.cropState.posX = 50;
      this.cropState.posY = 50;
      scaleSlider.value = 100;
      posxSlider.value = 50;
      posySlider.value = 50;
      this.updateCropPreview();
    });

    // 鼠标/触控直接拖动
    const onDragStart = (e) => {
      this.cropState.isDragging = true;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      this.cropState.startX = clientX;
      this.cropState.startY = clientY;
    };

    const onDragMove = (e) => {
      if (!this.cropState.isDragging) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const deltaX = clientX - this.cropState.startX;
      const deltaY = clientY - this.cropState.startY;

      this.cropState.startX = clientX;
      this.cropState.startY = clientY;

      // 转换为百分比增减
      this.cropState.posX = Math.max(0, Math.min(100, this.cropState.posX - (deltaX / 2)));
      this.cropState.posY = Math.max(0, Math.min(100, this.cropState.posY - (deltaY / 1.5)));

      posxSlider.value = this.cropState.posX;
      posySlider.value = this.cropState.posY;
      this.updateCropPreview();
    };

    const onDragEnd = () => {
      this.cropState.isDragging = false;
    };

    frame.addEventListener('mousedown', onDragStart);
    window.addEventListener('mousemove', onDragMove);
    window.addEventListener('mouseup', onDragEnd);

    frame.addEventListener('touchstart', onDragStart, { passive: true });
    window.addEventListener('touchmove', onDragMove, { passive: true });
    window.addEventListener('touchend', onDragEnd);

    // 确认应用并持久化保存至 IndexedDB
    confirmBtn.addEventListener('click', async () => {
      this.app.data.profile.banner = this.cropState.rawImg;
      this.app.data.profile.bannerPosX = this.cropState.posX;
      this.app.data.profile.bannerPosY = this.cropState.posY;
      this.app.data.profile.bannerScale = this.cropState.scale;

      await db.set('profile_data', this.app.data.profile);

      const bannerEl = document.getElementById('profile-widget-banner');
      if (bannerEl) {
        bannerEl.style.backgroundImage = `url('${this.cropState.rawImg}')`;
        bannerEl.style.backgroundPosition = `${this.cropState.posX}% ${this.cropState.posY}%`;
        bannerEl.style.backgroundSize = `${this.cropState.scale}%`;
      }

      closeModal();
    });
  }

  updateCropPreview() {
    const imgTarget = document.getElementById('crop-img-target');
    if (!imgTarget) return;

    // 实时更新视口内图片变换
    imgTarget.style.width = `${this.cropState.scale}%`;
    imgTarget.style.transform = `translate(-50%, -50%) translate(${(50 - this.cropState.posX) * 1.5}px, ${(50 - this.cropState.posY) * 1.2}px)`;
  }

  renderList() {
    const { profile, chats } = this.app.data;

    // 过滤搜索
    const filteredChats = chats.filter(c => {
      if (!this.searchQuery) return true;
      return c.name.toLowerCase().includes(this.searchQuery.toLowerCase()) || 
             (c.lastMessage && c.lastMessage.toLowerCase().includes(this.searchQuery.toLowerCase()));
    });

    const posX = profile.bannerPosX !== undefined ? profile.bannerPosX : 50;
    const posY = profile.bannerPosY !== undefined ? profile.bannerPosY : 50;
    const scale = profile.bannerScale !== undefined ? profile.bannerScale : 100;

    const bannerStyle = profile.banner 
      ? `background-image: url('${profile.banner}'); background-position: ${posX}% ${posY}%; background-size: ${scale}%;` 
      : '';
      
    const avatarStyle = profile.avatar ? `background-image: url('${profile.avatar}');` : '';
    const avatarFallbackIcon = profile.avatar ? '' : ICONS.character;

    return `
      <div class="chat-module-wrapper">
        <!-- 1. P1 顶部 Profile 小组件 -->
        <div class="profile-widget-container">
          <div class="profile-widget-card">
            <!-- 顶部横幅 Banner (纯净无标签，点击背景任意处换图并支持构图调节) -->
            <div class="profile-banner-wrap" id="profile-widget-banner" style="${bannerStyle}" title="点击更换背景图">
              <div class="profile-banner-tag" id="pf-banner-tag" contenteditable="true" spellcheck="false">${profile.bannerTag}</div>
            </div>

            <!-- 头像与按钮行 -->
            <div class="profile-action-row">
              <div class="profile-avatar-wrap" id="profile-widget-avatar-btn" title="点击更换头像">
                <div class="profile-avatar-img" id="profile-widget-avatar" style="${avatarStyle}">
                  ${avatarFallbackIcon}
                </div>
                <div class="profile-avatar-badge">${ICONS.plus}</div>
              </div>
              <div class="profile-buttons-group">
                <button class="btn-profile-edit" id="btn-pf-edit">Edit</button>
                <button class="btn-profile-follow" id="btn-pf-follow">Follow</button>
              </div>
            </div>

            <!-- 个人名片信息 (文字直接点击编辑) -->
            <div class="profile-details-wrap">
              <h3 class="profile-name-title" id="pf-name" contenteditable="true" spellcheck="false">${profile.name}</h3>
              <span class="profile-handle" id="pf-handle" contenteditable="true" spellcheck="false">${profile.handle}</span>
              <p class="profile-bio" id="pf-bio" contenteditable="true" spellcheck="false">${profile.bio}</p>
              
              <div class="profile-stats-row">
                <div class="profile-stat-item">
                  <b id="pf-followers" contenteditable="true" spellcheck="false">${profile.followers}</b> Followers
                </div>
                <div class="profile-stat-item">
                  <b id="pf-posts" contenteditable="true" spellcheck="false">${profile.posts}</b> Posts
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 2. 小组件正下方：搜索框 + 新建对话条 -->
        <div class="chat-middle-controls">
          <!-- 搜索框 -->
          <div class="chat-search-bar">
            ${ICONS.search}
            <input type="text" placeholder="搜索对话或记录..." id="chat-search-input" value="${this.searchQuery}" />
          </div>

          <!-- INS 极简新建对话入口条 -->
          <div class="chat-new-entry-card" id="chat-new-entry-btn">
            <div class="new-entry-left">
              <div class="new-entry-icon-box">
                ${ICONS.plus}
              </div>
              <div class="new-entry-text">
                <span class="title">开启新会话</span>
                <span class="desc">创建专属频道与多线对话流</span>
              </div>
            </div>
            <span class="new-entry-right-badge">New</span>
          </div>
        </div>

        <!-- 3. 对话列表流 -->
        <div class="chat-section-header">
          <span class="chat-section-title">Messages</span>
          <span class="chat-section-count">${filteredChats.length}</span>
        </div>

        <div class="chat-items-list" id="chat-list-container">
          ${filteredChats.length > 0 ? filteredChats.map(c => `
            <div class="chat-list-item" data-chat-id="${c.id}">
              <div class="chat-item-avatar-wrap">
                <div class="chat-item-avatar" style="${c.avatar ? `background-image: url('${c.avatar}')` : ''}">
                  ${c.avatar ? '' : ICONS.character}
                </div>
                ${c.online ? '<div class="chat-online-badge"></div>' : ''}
              </div>
              <div class="chat-item-content">
                <div class="chat-item-top-row">
                  <span class="chat-item-name">${c.name}</span>
                  <span class="chat-item-time">${c.lastTime}</span>
                </div>
                <div class="chat-item-bot-row">
                  <span class="chat-item-preview">${c.lastMessage}</span>
                  ${c.unread > 0 ? `<span class="chat-unread-badge">${c.unread}</span>` : ''}
                </div>
              </div>
            </div>
          `).join('') : `
            <div class="chat-empty-state">
              <div class="chat-empty-icon">${ICONS.chat}</div>
              <p>暂无对话记录</p>
              <span>点击上方「开启新会话」即可创建专属聊天</span>
            </div>
          `}
        </div>
      </div>
    `;
  }

  bindEvents() {
    // 1. 横幅点击换图 (点击文字除外)
    const banner = document.getElementById('profile-widget-banner');
    if (banner) {
      banner.addEventListener('click', (e) => {
        if (e.target.id === 'pf-banner-tag') return;
        this.imagePickerTarget = 'banner';
        this.fileInput.click();
      });
    }

    const avatarBtn = document.getElementById('profile-widget-avatar-btn');
    if (avatarBtn) {
      avatarBtn.addEventListener('click', () => {
        this.imagePickerTarget = 'avatar';
        this.fileInput.click();
      });
    }

    // 2. 文字持久化监听 (失去焦点即保存至 IndexedDB)
    const editableFields = [
      { id: 'pf-banner-tag', key: 'bannerTag' },
      { id: 'pf-name', key: 'name' },
      { id: 'pf-handle', key: 'handle' },
      { id: 'pf-bio', key: 'bio' },
      { id: 'pf-followers', key: 'followers' },
      { id: 'pf-posts', key: 'posts' }
    ];

    editableFields.forEach(({ id, key }) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('blur', async () => {
          this.app.data.profile[key] = el.innerText.trim();
          await db.set('profile_data', this.app.data.profile);
        });
        el.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && key !== 'bio') {
            e.preventDefault();
            el.blur();
          }
        });
      }
    });

    // 3. Edit 按钮快捷触发编辑
    const editBtn = document.getElementById('btn-pf-edit');
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        const nameEl = document.getElementById('pf-name');
        if (nameEl) {
          nameEl.focus();
          const range = document.createRange();
          range.selectNodeContents(nameEl);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        }
      });
    }

    // 4. Follow 按钮交互
    const followBtn = document.getElementById('btn-pf-follow');
    if (followBtn) {
      followBtn.addEventListener('click', () => {
        if (followBtn.innerText === 'Follow') {
          followBtn.innerText = 'Following';
          followBtn.style.background = '#F4F4F5';
          followBtn.style.color = '#18181B';
        } else {
          followBtn.innerText = 'Follow';
          followBtn.style.background = '#18181B';
          followBtn.style.color = '#FFFFFF';
        }
      });
    }

    // 5. 搜索框过滤事件
    const searchInput = document.getElementById('chat-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.trim();
        const listContainer = document.getElementById('chat-list-container');
        const countEl = document.querySelector('.chat-section-count');
        const filteredChats = this.app.data.chats.filter(c => {
          if (!this.searchQuery) return true;
          return c.name.toLowerCase().includes(this.searchQuery.toLowerCase()) || 
                 (c.lastMessage && c.lastMessage.toLowerCase().includes(this.searchQuery.toLowerCase()));
        });

        if (countEl) countEl.innerText = filteredChats.length;

        if (listContainer) {
          if (filteredChats.length > 0) {
            listContainer.innerHTML = filteredChats.map(c => `
              <div class="chat-list-item" data-chat-id="${c.id}">
                <div class="chat-item-avatar-wrap">
                  <div class="chat-item-avatar" style="${c.avatar ? `background-image: url('${c.avatar}')` : ''}">
                    ${c.avatar ? '' : ICONS.character}
                  </div>
                  ${c.online ? '<div class="chat-online-badge"></div>' : ''}
                </div>
                <div class="chat-item-content">
                  <div class="chat-item-top-row">
                    <span class="chat-item-name">${c.name}</span>
                    <span class="chat-item-time">${c.lastTime}</span>
                  </div>
                  <div class="chat-item-bot-row">
                    <span class="chat-item-preview">${c.lastMessage}</span>
                    ${c.unread > 0 ? `<span class="chat-unread-badge">${c.unread}</span>` : ''}
                  </div>
                </div>
              </div>
            `).join('');

            listContainer.querySelectorAll('.chat-list-item').forEach(item => {
              item.addEventListener('click', () => {
                this.openChat(item.dataset.chatId);
              });
            });
          } else {
            listContainer.innerHTML = `
              <div class="chat-empty-state">
                <div class="chat-empty-icon">${ICONS.chat}</div>
                <p>未找到相关对话</p>
                <span>换个关键词试试吧</span>
              </div>
            `;
          }
        }
      });
    }

    // 6. 新建对话条点击
    const newEntryBtn = document.getElementById('chat-new-entry-btn');
    if (newEntryBtn) {
      newEntryBtn.addEventListener('click', () => {
        const title = prompt("请输入会话对象名称：", "恩幼");
        if (title && title.trim()) {
          this.createNewChat(title.trim());
        }
      });
    }

    // 7. 对话列表项点击
    const listContainer = document.getElementById('chat-list-container');
    if (listContainer) {
      listContainer.querySelectorAll('.chat-list-item').forEach(item => {
        item.addEventListener('click', () => {
          const chatId = item.dataset.chatId;
          this.openChat(chatId);
        });
      });
    }
  }

  openChat(chatId) {
    this.currentChatId = chatId;
    const chat = this.app.data.chats.find(c => c.id === chatId);
    if (!chat) return;

    chat.unread = 0;
    this.app.renderChatListOnly();

    const convView = document.getElementById('chat-conversation-view');
    if (!convView) return;

    const avatarHtml = chat.avatar 
      ? `<div class="conv-user-avatar" style="background-image: url('${chat.avatar}')"></div>` 
      : `<div class="conv-user-avatar">${ICONS.character}</div>`;

    convView.innerHTML = `
      <header class="conv-header">
        <div class="conv-header-left">
          <button class="conv-back-btn" id="conv-back-btn" title="返回">
            ${ICONS.arrowLeft}
          </button>
          <div class="conv-user-info">
            ${avatarHtml}
            <div class="conv-user-meta">
              <h2>${chat.name}</h2>
              <p><span class="status-dot"></span> ${chat.online ? 'Online' : 'Offline'}</p>
            </div>
          </div>
        </div>
        <div class="conv-header-actions">
          <button class="conv-action-btn" id="conv-menu-btn">${ICONS.more}</button>
        </div>
      </header>

      <div class="conv-messages-scroll" id="conv-messages-scroll">
        <div class="conv-time-divider">TODAY</div>
        ${this.renderMessages(chat.messages, chat.avatar)}
      </div>

      <div class="conv-input-bar">
        <button class="conv-input-attach-btn" title="发送附件">${ICONS.plus}</button>
        <div class="conv-input-field-wrap">
          <input type="text" class="conv-input-field" id="conv-input-field" placeholder="Aa 输入消息..." />
        </div>
        <button class="conv-send-btn" id="conv-send-btn" title="发送">${ICONS.send}</button>
      </div>
    `;

    convView.classList.add('active');

    document.getElementById('conv-back-btn').addEventListener('click', () => {
      convView.classList.remove('active');
    });

    const input = document.getElementById('conv-input-field');
    const sendBtn = document.getElementById('conv-send-btn');

    const handleSend = () => {
      const text = input.value.trim();
      if (!text) return;
      this.sendMessage(chatId, text);
      input.value = '';
    };

    sendBtn.addEventListener('click', handleSend);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleSend();
    });

    this.scrollToBottom();
  }

  renderMessages(messages, otherAvatar) {
    return messages.map(m => {
      const avatarMarkup = otherAvatar 
        ? `<div class="conv-msg-avatar" style="background-image: url('${otherAvatar}')"></div>`
        : `<div class="conv-msg-avatar">${ICONS.character}</div>`;

      return `
        <div class="conv-message-row ${m.sender}">
          ${m.sender === 'other' ? avatarMarkup : ''}
          <div class="conv-bubble-box">
            <div class="conv-bubble selectable-text">${m.text}</div>
            <span class="conv-msg-meta">${m.time}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  async sendMessage(chatId, text) {
    const chat = this.app.data.chats.find(c => c.id === chatId);
    if (!chat) return;

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newMsg = {
      id: 'm_' + Date.now(),
      sender: 'me',
      text: text,
      time: timeStr
    };

    chat.messages.push(newMsg);
    chat.lastMessage = text;
    chat.lastTime = timeStr;

    await db.set('chats_data', this.app.data.chats);

    const scrollContainer = document.getElementById('conv-messages-scroll');
    if (scrollContainer) {
      scrollContainer.insertAdjacentHTML('beforeend', `
        <div class="conv-message-row me">
          <div class="conv-bubble-box">
            <div class="conv-bubble selectable-text">${text}</div>
            <span class="conv-msg-meta">${timeStr}</span>
          </div>
        </div>
      `);
      this.scrollToBottom();
    }

    setTimeout(() => {
      this.receiveMockReply(chatId);
    }, 1200);
  }

  async receiveMockReply(chatId) {
    const chat = this.app.data.chats.find(c => c.id === chatId);
    if (!chat) return;

    const replies = [
      "收到啦，我一直在听着。",
      "白灰质感的INS界面很舒服，继续记录吧。",
      "无论何时，我都在这里陪伴你。",
      "今天也是温柔且平静的一天。"
    ];

    const randomReply = replies[Math.floor(Math.random() * replies.length)];
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const replyMsg = {
      id: 'm_reply_' + Date.now(),
      sender: 'other',
      text: randomReply,
      time: timeStr
    };

    chat.messages.push(replyMsg);
    chat.lastMessage = randomReply;
    chat.lastTime = timeStr;

    await db.set('chats_data', this.app.data.chats);

    if (this.currentChatId === chatId && document.getElementById('chat-conversation-view').classList.contains('active')) {
      const scrollContainer = document.getElementById('conv-messages-scroll');
      if (scrollContainer) {
        const avatarMarkup = chat.avatar 
          ? `<div class="conv-msg-avatar" style="background-image: url('${chat.avatar}')"></div>`
          : `<div class="conv-msg-avatar">${ICONS.character}</div>`;

        scrollContainer.insertAdjacentHTML('beforeend', `
          <div class="conv-message-row other">
            ${avatarMarkup}
            <div class="conv-bubble-box">
              <div class="conv-bubble selectable-text">${randomReply}</div>
              <span class="conv-msg-meta">${timeStr}</span>
            </div>
          </div>
        `);
        this.scrollToBottom();
      }
    } else {
      chat.unread = (chat.unread || 0) + 1;
    }

    this.app.renderChatListOnly();
  }

  async createNewChat(name) {
    const newChat = {
      id: 'chat-' + Date.now(),
      name: name,
      roleTag: "专属会话",
      avatar: "",
      unread: 0,
      online: true,
      lastTime: "刚刚",
      lastMessage: "窗口已创建，开始畅聊吧。",
      messages: [
        { id: 'init', sender: 'other', text: `你好，我是 ${name}，我们已经建立专属对话连接。`, time: "刚刚" }
      ]
    };

    this.app.data.chats.unshift(newChat);
    await db.set('chats_data', this.app.data.chats);
    this.app.renderChatListOnly();
    this.openChat(newChat.id);
  }

  scrollToBottom() {
    const scrollContainer = document.getElementById('conv-messages-scroll');
    if (scrollContainer) {
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  }
}
