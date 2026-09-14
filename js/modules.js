/* ==========================================================================
   AA机 - 8大衍生功能板块业务逻辑模块 (Modules Logic)
   动态 · 角色库 · 面具库 · 美化 · 钱包 · 收藏 · 购物 · 设置
   ========================================================================== */

import { ICONS } from './icons.js';

export const Modules = {
  // 1. 动态板块
  renderFeed(data) {
    return `
      <div class="module-header">
        <div class="module-header-title">
          <h2>Moments</h2>
          <p>Shared Moments & Logs</p>
        </div>
        <button class="chat-icon-btn" id="feed-add-btn" title="发布动态">${ICONS.plus}</button>
      </div>

      <div class="module-content-scroll">
        ${data.feeds.map(f => `
          <div class="feed-card">
            <div class="feed-user-row">
              <div class="feed-user-meta">
                <div class="feed-avatar" style="background-image: url('${f.avatar}')"></div>
                <div class="feed-names">
                  <h4>${f.author}</h4>
                  <span>${f.time}</span>
                </div>
              </div>
              <button class="conv-action-btn">${ICONS.more}</button>
            </div>
            
            <div class="feed-body-text selectable-text">${f.content}</div>

            <div class="feed-image-grid">
              ${f.images.map(img => `
                <div class="feed-grid-photo" style="background-image: url('${img}')"></div>
              `).join('')}
            </div>

            <div class="feed-actions-bar">
              <div class="feed-action-btn-group">
                <div class="feed-act-btn">${ICONS.heart} <span>${f.likes}</span></div>
                <div class="feed-act-btn">${ICONS.messageSquare} <span>${f.comments}</span></div>
              </div>
              <span style="font-size: 10px; color: #A1A1AA;">AA机 · 纯净流</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },

  // 2. 角色库板块
  renderCharacters(data) {
    return `
      <div class="module-header">
        <div class="module-header-title">
          <h2>Characters</h2>
          <p>Personas & AI Roles</p>
        </div>
        <button class="chat-icon-btn" title="新建角色">${ICONS.plus}</button>
      </div>

      <div class="module-content-scroll">
        <div class="character-grid">
          ${data.characters.map(c => `
            <div class="character-card">
              <div class="character-avatar" style="background-image: url('${c.avatar}')"></div>
              <div class="character-name">${c.name}</div>
              <div class="character-tag">${c.role}</div>
              <p style="font-size: 11px; color: #71717A; margin-bottom: 10px;">${c.desc}</p>
              <button class="character-btn">切换对话</button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  // 3. 面具库板块
  renderMasks(data) {
    return `
      <div class="module-header">
        <div class="module-header-title">
          <h2>Identity Masks</h2>
          <p>User Sub-Identities</p>
        </div>
        <button class="chat-icon-btn" title="添加面具">${ICONS.plus}</button>
      </div>

      <div class="module-content-scroll">
        <div class="mask-list-wrap">
          ${data.masks.map(m => `
            <div class="mask-item-card ${m.isCurrent ? 'current' : ''}">
              <div class="mask-meta-left">
                <div class="mask-avatar" style="background-image: url('${m.avatar}')"></div>
                <div class="mask-info">
                  <h4>${m.name}</h4>
                  <p>${m.bio}</p>
                </div>
              </div>
              <span class="mask-badge-status">${m.isCurrent ? '已佩戴' : '佩戴'}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  // 4. 美化板块
  renderBeauty(data) {
    return `
      <div class="module-header">
        <div class="module-header-title">
          <h2>Themes & Visuals</h2>
          <p>Custom Minimal INS Tone</p>
        </div>
      </div>

      <div class="module-content-scroll">
        <div class="theme-section-box">
          <div class="theme-sec-title">配色调性 (Color Tone)</div>
          <div class="theme-color-palette">
            <div class="color-swatch active" style="background: #18181B;" title="墨黑"></div>
            <div class="color-swatch" style="background: #71717A;" title="冷灰"></div>
            <div class="color-swatch" style="background: #E4E4E7; border: 1px solid #D4D4D8;" title="雾白"></div>
            <div class="color-swatch" style="background: #3F3F46;" title="炭黑"></div>
          </div>
        </div>

        <div class="theme-section-box">
          <div class="theme-sec-title">壁纸预览与更换</div>
          <div class="theme-preview-box">
            <span>INS 极简颗粒感雾白壁纸 (已启用)</span>
          </div>
          <button class="character-btn" style="background: #18181B; padding: 10px; margin-top: 4px;">从相册自选无损壁纸</button>
        </div>
      </div>
    `;
  },

  // 5. 钱包板块 (参考 P1: Puppy Wallet)
  renderWallet(data) {
    return `
      <div class="module-header">
        <div class="module-header-title">
          <h2>Puppy Wallet</h2>
          <p>Account & Balance</p>
        </div>
      </div>

      <div class="module-content-scroll">
        <div class="wallet-card-main">
          <div class="wallet-card-top">
            <span>TOTAL BALANCE</span>
            <span style="font-family: var(--aa-font-mono);">AA-CARD #520</span>
          </div>
          <div class="wallet-balance-num">
            ${data.wallet.balance} <span style="font-size: 16px; font-weight: 500;">${data.wallet.currency}</span>
          </div>
          <div class="wallet-action-row">
            <div class="wallet-sub-btn">账单明细流水</div>
            <div class="wallet-sub-btn">审批条专区</div>
            <div class="wallet-sub-btn">+ 新增窗口</div>
          </div>
        </div>

        <h4 style="font-size: 13px; font-weight: 700; margin-top: 6px; color: #18181B;">近期账单</h4>
        <div class="wallet-transactions-list">
          ${data.wallet.transactions.map(t => `
            <div class="wallet-tx-item">
              <div class="tx-left">
                <h5>${t.title}</h5>
                <span>${t.time}</span>
              </div>
              <div class="tx-amount ${t.type}">
                ${t.amount}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  // 6. 收藏板块
  renderFavorites(data) {
    return `
      <div class="module-header">
        <div class="module-header-title">
          <h2>Favorites</h2>
          <p>Quotes & Stored Notes</p>
        </div>
        <button class="chat-icon-btn" title="新增语录">${ICONS.plus}</button>
      </div>

      <div class="module-content-scroll">
        ${data.favorites.map(f => `
          <div class="fav-quote-card">
            <p class="fav-quote-text selectable-text">${f.text}</p>
            <div class="fav-quote-from">${f.from}</div>
          </div>
        `).join('')}
      </div>
    `;
  },

  // 7. 购物板块
  renderShopping(data) {
    return `
      <div class="module-header">
        <div class="module-header-title">
          <h2>Store & Goods</h2>
          <p>Exclusive Themes & Plugins</p>
        </div>
      </div>

      <div class="module-content-scroll">
        <div class="store-grid">
          ${data.goods.map(g => `
            <div class="store-card">
              <div class="store-thumb" style="background-image: url('${g.image}')"></div>
              <h4>${g.name}</h4>
              <div class="store-card-bot">
                <span class="store-price">${g.price}</span>
                <button class="store-buy-btn">兑换</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  // 8. 设置板块
  renderSettings(data) {
    return `
      <div class="module-header">
        <div class="module-header-title">
          <h2>Settings</h2>
          <p>Preferences & System</p>
        </div>
      </div>

      <div class="module-content-scroll">
        <div class="settings-group">
          <div class="settings-item-row">
            <div class="settings-item-left">
              ${ICONS.chat}
              <span>多线窗口消息流设置</span>
            </div>
            <div class="settings-item-right">${ICONS.arrowRight}</div>
          </div>
          <div class="settings-item-row">
            <div class="settings-item-left">
              ${ICONS.music}
              <span>双人共听 Listen Together</span>
            </div>
            <div class="settings-item-right">${ICONS.arrowRight}</div>
          </div>
          <div class="settings-item-row">
            <div class="settings-item-left">
              ${ICONS.beauty}
              <span>PWA 全屏贴合与渲染模式</span>
            </div>
            <div class="settings-item-right"><span>100% Fit</span> ${ICONS.arrowRight}</div>
          </div>
        </div>

        <div class="settings-group">
          <div class="settings-item-row">
            <div class="settings-item-left">
              ${ICONS.setting}
              <span>AA机 系统版本</span>
            </div>
            <div class="settings-item-right"><span>v1.0.0 Pro</span></div>
          </div>
        </div>
      </div>
    `;
  }
};
