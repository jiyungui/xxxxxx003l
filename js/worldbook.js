/* ═══════════════════════════════════════════════════════
   worldbook.js  世界书 APP 完整逻辑
═══════════════════════════════════════════════════════ */
'use strict';

/* ════════════════════════════════
   存储
════════════════════════════════ */
const WBStore = {
    KEY: 'xxj_worldbook',
    get() {
        try {
            const v = localStorage.getItem(this.KEY);
            return v ? JSON.parse(v) : { groups: [], entries: [] };
        } catch { return { groups: [], entries: [] }; }
    },
    save(data) {
        try { localStorage.setItem(this.KEY, JSON.stringify(data)); } catch { }
    }
};

/* ════════════════════════════════
   全局状态
════════════════════════════════ */
let wbData = { groups: [], entries: [] };
let wbEditingEntryId = null;
let wbCurrentGroupId = null;

/* ════════════════════════════════
   APP 开关
════════════════════════════════ */
function openWorldbookApp() {
    wbData = WBStore.get();
    const el = document.getElementById('worldbookApp');
    el.classList.remove('hidden');
    el.style.animation = '';
    void el.offsetWidth;
    el.style.animation = 'wbSlideIn 0.3s cubic-bezier(0.34,1.1,0.64,1)';
    wbSwitchTab('global');
    wbRenderGroups();
}

function closeWorldbookApp() {
    const el = document.getElementById('worldbookApp');
    el.style.animation = 'wbSlideOut 0.22s ease forwards';
    setTimeout(() => {
        el.classList.add('hidden');
        el.style.animation = '';
    }, 220);
}

/* ════════════════════════════════
   Tab 切换
════════════════════════════════ */
function wbSwitchTab(tab) {
    ['global', 'role'].forEach(t => {
        document.getElementById(`wbPanel-${t}`).classList.toggle('hidden', t !== tab);
        document.getElementById(`wbDock-${t}`).classList.toggle('wb-dock-active', t === tab);
    });
}

/* ════════════════════════════════
   分组管理
════════════════════════════════ */
function wbAddGroup() {
    document.getElementById('wbGroupName').value = '';
    document.getElementById('wbGroupModal').classList.remove('hidden');
    setTimeout(() => document.getElementById('wbGroupName').focus(), 100);
}

function wbCloseGroupModal() {
    document.getElementById('wbGroupModal').classList.add('hidden');
}

function wbConfirmAddGroup() {
    const name = document.getElementById('wbGroupName').value.trim();
    if (!name) return;
    const group = { id: 'g_' + Date.now(), name };
    wbData.groups.push(group);
    WBStore.save(wbData);
    wbCloseGroupModal();
    wbRenderGroups();
}

function wbDeleteGroup(gid) {
    if (!confirm('删除该分组及其所有条目？')) return;
    wbData.groups = wbData.groups.filter(g => g.id !== gid);
    wbData.entries = wbData.entries.filter(e => e.groupId !== gid);
    WBStore.save(wbData);
    wbRenderGroups();
}

function wbToggleGroup(gid) {
    const card = document.getElementById('wbGC_' + gid);
    if (card) card.classList.toggle('wb-open');
}

/* ════════════════════════════════
   条目管理
════════════════════════════════ */
const WB_POS_HINT = {
    before: '适合：世界观、NPC设定、背景设定、基本人物关系等开篇内容。AI 每次对话都会最先读取。',
    middle: '适合：关键词触发场景或道具。平常不生效，提及关键词后 AI 必须遵照此条目内容继续。',
    after: '适合：核心逻辑、行为规范、语言格式等。AI 每次对话都会最后读取，优先级最高。'
};

function wbOpenEntryModal(groupId, entryId = null) {
    wbCurrentGroupId = groupId;
    wbEditingEntryId = entryId;

    const sel = document.getElementById('wbEntryGroup');
    sel.innerHTML = wbData.groups.map(g =>
        `<option value="${g.id}">${_esc(g.name)}</option>`
    ).join('');
    sel.value = groupId;

    if (entryId) {
        const e = wbData.entries.find(x => x.id === entryId);
        if (!e) return;
        document.getElementById('wbModalTitle').textContent = '编辑条目';
        document.getElementById('wbEntryName').value = e.name;
        document.getElementById('wbEntryKeywords').value = (e.keywords || []).join(', ');
        sel.value = e.groupId;
        document.getElementById('wbEntryContent').value = e.content;
        document.querySelectorAll('.wb-inject-tab').forEach(btn => {
            btn.classList.toggle('wb-inject-active', btn.dataset.pos === e.pos);
        });
        document.getElementById('wbPosHintText').textContent = WB_POS_HINT[e.pos] || '';
    } else {
        document.getElementById('wbModalTitle').textContent = '新建条目';
        document.getElementById('wbEntryName').value = '';
        document.getElementById('wbEntryKeywords').value = '';
        document.getElementById('wbEntryContent').value = '';
        document.querySelectorAll('.wb-inject-tab').forEach((btn, i) => {
            btn.classList.toggle('wb-inject-active', i === 0);
        });
        document.getElementById('wbPosHintText').textContent = WB_POS_HINT['before'];
    }

    document.getElementById('wbEntryModal').classList.remove('hidden');
    setTimeout(() => document.getElementById('wbEntryName').focus(), 100);
}

function wbCloseModal() {
    document.getElementById('wbEntryModal').classList.add('hidden');
}

function wbSelectPos(btn) {
    document.querySelectorAll('.wb-inject-tab').forEach(b => b.classList.remove('wb-inject-active'));
    btn.classList.add('wb-inject-active');
    document.getElementById('wbPosHintText').textContent = WB_POS_HINT[btn.dataset.pos] || '';
}

function wbSaveEntry() {
    const name = document.getElementById('wbEntryName').value.trim();
    if (!name) {
        document.getElementById('wbEntryName').focus();
        return;
    }
    const groupId = document.getElementById('wbEntryGroup').value;
    const keywords = document.getElementById('wbEntryKeywords').value
        .split(/[,，]+/).map(s => s.trim()).filter(Boolean);
    const posBtn = document.querySelector('.wb-inject-tab.wb-inject-active');
    const pos = posBtn ? posBtn.dataset.pos : 'before';
    const content = document.getElementById('wbEntryContent').value.trim();

    if (wbEditingEntryId) {
        const e = wbData.entries.find(x => x.id === wbEditingEntryId);
        if (e) {
            e.name = name;
            e.groupId = groupId;
            e.keywords = keywords;
            e.pos = pos;
            e.content = content;
        }
    } else {
        wbData.entries.push({
            id: 'e_' + Date.now(),
            groupId, name, keywords, pos, content,
            enabled: true
        });
    }

    WBStore.save(wbData);
    wbCloseModal();
    wbRenderGroups();  /* ← 保存后立即重渲染 */
}

function wbToggleEntry(entryId) {
    const e = wbData.entries.find(x => x.id === entryId);
    if (e) { e.enabled = !e.enabled; WBStore.save(wbData); wbRenderGroups(); }
}

function wbDeleteEntry(entryId) {
    wbData.entries = wbData.entries.filter(x => x.id !== entryId);
    WBStore.save(wbData);
    wbRenderGroups();
}

/* ════════════════════════════════
   渲染
   修复：empty 节点用 CSS 控制显隐，
   不再用 appendChild 操作，
   避免 innerHTML 覆盖后节点丢失
════════════════════════════════ */
const POS_LABEL = { before: '前', middle: '中', after: '后' };

function wbRenderGroups() {
    const list = document.getElementById('wbGroupList');
    const empty = document.getElementById('wbEmpty');

    /* ── 空状态：只用 CSS 控制，不移动节点 ── */
    if (wbData.groups.length === 0) {
        empty.classList.remove('hidden');   /* FIX: 不再 innerHTML/appendChild */
        /* 清掉除 empty 之外的所有卡片 */
        Array.from(list.children).forEach(child => {
            if (child.id !== 'wbEmpty') child.remove();
        });
        return;
    }
    empty.classList.add('hidden');          /* 有分组时隐藏空状态 */

    /* ── 清除旧卡片（保留 empty 节点） ── */
    Array.from(list.children).forEach(child => {
        if (child.id !== 'wbEmpty') child.remove();
    });

    /* ── 逐个插入分组卡片 ── */
    wbData.groups.forEach(g => {
        const entries = wbData.entries.filter(e => e.groupId === g.id);

        const entriesHTML = entries.map(e => `
            <div class="wb-entry-row" onclick="wbOpenEntryModal('${g.id}','${e.id}')">
                <div class="wb-entry-toggle ${e.enabled ? 'wb-on' : ''}"
                     onclick="event.stopPropagation();wbToggleEntry('${e.id}')"></div>
                <div class="wb-entry-info">
                    <div class="wb-entry-name">${_esc(e.name)}</div>
                    <div class="wb-entry-meta">
                        <span class="wb-entry-pos wb-entry-pos--${e.pos}">${POS_LABEL[e.pos] || e.pos}</span>
                        ${e.keywords && e.keywords.length
                /* FIX: 去除 emoji，改为纯文字前缀 */
                ? `<span class="wb-entry-kw">${_esc(e.keywords.join(', '))}</span>`
                : ''}
                    </div>
                </div>
                <button class="wb-entry-edit"
                        onclick="event.stopPropagation();wbDeleteEntry('${e.id}')"
                        title="删除">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                        <path d="M10 11v6M14 11v6"/>
                    </svg>
                </button>
            </div>
        `).join('');

        const card = document.createElement('div');
        card.className = 'wb-group-card wb-open';
        card.id = 'wbGC_' + g.id;
        card.innerHTML = `
            <div class="wb-group-head" onclick="wbToggleGroup('${g.id}')">
                <div class="wb-group-arrow">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9 18l6-6-6-6"/>
                    </svg>
                </div>
                <span class="wb-group-name">${_esc(g.name)}</span>
                <span class="wb-group-count">${entries.length}</span>
                <button class="wb-group-del"
                        onclick="event.stopPropagation();wbDeleteGroup('${g.id}')"
                        title="删除分组">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
            <div class="wb-group-body">
                ${entriesHTML}
                <button class="wb-add-entry-btn" onclick="wbOpenEntryModal('${g.id}')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
                        <line x1="12" y1="5" x2="12" y2="19"/>
                        <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    新建条目
                </button>
            </div>
        `;
        list.appendChild(card);   /* FIX: append 而非 innerHTML= */
    });
}

/* ════════════════════════════════
   工具
════════════════════════════════ */
function _esc(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/* ════════════════════════════════
   对外暴露：获取注入内容（供聊天AI调用）
════════════════════════════════ */
function wbGetInjection(pos) {
    return wbData.entries
        .filter(e => e.enabled && e.pos === pos)
        .map(e => e.content)
        .filter(Boolean)
        .join('\n');
}

function wbGetTriggered(userMessage) {
    return wbData.entries
        .filter(e => e.enabled && e.pos === 'middle' && e.keywords && e.keywords.length)
        .filter(e => e.keywords.some(kw => kw && userMessage.includes(kw)))
        .map(e => e.content)
        .filter(Boolean)
        .join('\n');
}

/* ════════════════════════════════════════════════════════
   角色关联世界书  完整逻辑
   存储 key: xxj_worldbook_role
   数据结构:
     roleGroups  : [{ id, name }]
     roleEntries : [{ id, groupId, charId, charName, name,
                      keywords, pos, content, enabled }]
     chars       : [{ id, name }]  ← 角色名册（手动维护）
════════════════════════════════════════════════════════ */

/* ── 存储 ── */
const WBRoleStore = {
    KEY: 'xxj_worldbook_role',
    get() {
        try {
            const v = localStorage.getItem(this.KEY);
            return v ? JSON.parse(v) : { roleGroups: [], roleEntries: [], chars: [] };
        } catch { return { roleGroups: [], roleEntries: [], chars: [] }; }
    },
    save(data) {
        try { localStorage.setItem(this.KEY, JSON.stringify(data)); } catch { }
    }
};

/* ── 状态 ── */
let wbRoleData = { roleGroups: [], roleEntries: [], chars: [] };
let wbRoleEditingEntryId = null;
let wbRoleCurrentGroupId = null;

/* ══ 内置默认角色列表（可在此扩展，后期接聊天模块自动注入） ══ */
const WB_DEFAULT_CHARS = [
    { id: 'char_custom', name: '自定义角色' }
];

/* ── 初始化角色列表（确保至少有默认项） ── */
function wbRoleInitChars() {
    if (!wbRoleData.chars || wbRoleData.chars.length === 0) {
        wbRoleData.chars = [...WB_DEFAULT_CHARS];
        WBRoleStore.save(wbRoleData);
    }
}

/* ── Tab 切换时加载角色面板 ── */
const _wbSwitchTabOrig = wbSwitchTab;
wbSwitchTab = function (tab) {
    _wbSwitchTabOrig(tab);
    if (tab === 'role') {
        wbRoleData = WBRoleStore.get();
        wbRoleInitChars();
        wbRoleRenderGroups();
    }
};

/* ════ 角色关联 - 分组管理 ════ */
function wbRoleAddGroup() {
    document.getElementById('wbRoleGroupName').value = '';
    document.getElementById('wbRoleGroupModal').classList.remove('hidden');
    setTimeout(() => document.getElementById('wbRoleGroupName').focus(), 100);
}

function wbRoleCloseGroupModal() {
    document.getElementById('wbRoleGroupModal').classList.add('hidden');
}

function wbRoleConfirmAddGroup() {
    const name = document.getElementById('wbRoleGroupName').value.trim();
    if (!name) return;
    const group = { id: 'rg_' + Date.now(), name };
    wbRoleData.roleGroups.push(group);
    WBRoleStore.save(wbRoleData);
    wbRoleCloseGroupModal();
    wbRoleRenderGroups();
}

function wbRoleDeleteGroup(gid) {
    if (!confirm('删除该分组及其所有条目？')) return;
    wbRoleData.roleGroups = wbRoleData.roleGroups.filter(g => g.id !== gid);
    wbRoleData.roleEntries = wbRoleData.roleEntries.filter(e => e.groupId !== gid);
    WBRoleStore.save(wbRoleData);
    wbRoleRenderGroups();
}

function wbRoleToggleGroup(gid) {
    const card = document.getElementById('wbRGC_' + gid);
    if (card) card.classList.toggle('wb-open');
}

/* ════ 角色关联 - 条目管理 ════ */
function wbRoleOpenEntryModal(groupId, entryId = null) {
    wbRoleCurrentGroupId = groupId;
    wbRoleEditingEntryId = entryId;

    /* 填充角色下拉 */
    const charSel = document.getElementById('wbRoleEntryChar');
    charSel.innerHTML = '<option value="">— 请选择角色 —</option>' +
        wbRoleData.chars.map(c =>
            `<option value="${c.id}">${_esc(c.name)}</option>`
        ).join('');

    /* 填充分组下拉 */
    const grpSel = document.getElementById('wbRoleEntryGroup');
    grpSel.innerHTML = wbRoleData.roleGroups.map(g =>
        `<option value="${g.id}">${_esc(g.name)}</option>`
    ).join('');
    grpSel.value = groupId;

    if (entryId) {
        const e = wbRoleData.roleEntries.find(x => x.id === entryId);
        if (!e) return;
        document.getElementById('wbRoleModalTitle').textContent = '编辑条目';
        charSel.value = e.charId || '';
        document.getElementById('wbRoleEntryName').value = e.name;
        document.getElementById('wbRoleEntryKeywords').value = (e.keywords || []).join(', ');
        grpSel.value = e.groupId;
        document.getElementById('wbRoleEntryContent').value = e.content;
        document.querySelectorAll('#wbRoleEntryModal .wb-inject-tab').forEach(btn => {
            btn.classList.toggle('wb-inject-active', btn.dataset.pos === e.pos);
        });
        document.getElementById('wbRolePosHintText').textContent = WB_POS_HINT[e.pos] || '';
    } else {
        document.getElementById('wbRoleModalTitle').textContent = '新建条目';
        charSel.value = '';
        document.getElementById('wbRoleEntryName').value = '';
        document.getElementById('wbRoleEntryKeywords').value = '';
        document.getElementById('wbRoleEntryContent').value = '';
        document.querySelectorAll('#wbRoleEntryModal .wb-inject-tab').forEach((btn, i) => {
            btn.classList.toggle('wb-inject-active', i === 0);
        });
        document.getElementById('wbRolePosHintText').textContent = WB_POS_HINT['before'];
    }

    document.getElementById('wbRoleEntryModal').classList.remove('hidden');
    setTimeout(() => document.getElementById('wbRoleEntryChar').focus(), 100);
}

function wbRoleCloseModal() {
    document.getElementById('wbRoleEntryModal').classList.add('hidden');
}

function wbRoleSelectPos(btn) {
    document.querySelectorAll('#wbRoleEntryModal .wb-inject-tab')
        .forEach(b => b.classList.remove('wb-inject-active'));
    btn.classList.add('wb-inject-active');
    document.getElementById('wbRolePosHintText').textContent = WB_POS_HINT[btn.dataset.pos] || '';
}

function wbRoleSaveEntry() {
    /* 验证：角色必选 */
    const charSel = document.getElementById('wbRoleEntryChar');
    const charId = charSel.value;
    const charName = charSel.options[charSel.selectedIndex]?.text || '';
    if (!charId) {
        charSel.focus();
        charSel.style.borderColor = '#e05050';
        setTimeout(() => charSel.style.borderColor = '', 1500);
        return;
    }

    const name = document.getElementById('wbRoleEntryName').value.trim();
    if (!name) {
        document.getElementById('wbRoleEntryName').focus();
        return;
    }

    const groupId = document.getElementById('wbRoleEntryGroup').value;
    const keywords = document.getElementById('wbRoleEntryKeywords').value
        .split(/[,，]+/).map(s => s.trim()).filter(Boolean);
    const posBtn = document.querySelector('#wbRoleEntryModal .wb-inject-tab.wb-inject-active');
    const pos = posBtn ? posBtn.dataset.pos : 'before';
    const content = document.getElementById('wbRoleEntryContent').value.trim();

    if (wbRoleEditingEntryId) {
        const e = wbRoleData.roleEntries.find(x => x.id === wbRoleEditingEntryId);
        if (e) {
            e.charId = charId; e.charName = charName;
            e.name = name; e.groupId = groupId;
            e.keywords = keywords; e.pos = pos; e.content = content;
        }
    } else {
        wbRoleData.roleEntries.push({
            id: 're_' + Date.now(),
            groupId, charId, charName,
            name, keywords, pos, content,
            enabled: true
        });
    }

    WBRoleStore.save(wbRoleData);
    wbRoleCloseModal();
    wbRoleRenderGroups();
}

function wbRoleToggleEntry(entryId) {
    const e = wbRoleData.roleEntries.find(x => x.id === entryId);
    if (e) { e.enabled = !e.enabled; WBRoleStore.save(wbRoleData); wbRoleRenderGroups(); }
}

function wbRoleDeleteEntry(entryId) {
    wbRoleData.roleEntries = wbRoleData.roleEntries.filter(x => x.id !== entryId);
    WBRoleStore.save(wbRoleData);
    wbRoleRenderGroups();
}

/* ════ 角色关联 - 渲染 ════ */
function wbRoleRenderGroups() {
    const list = document.getElementById('wbRoleGroupList');
    const empty = document.getElementById('wbRoleEmpty');

    if (wbRoleData.roleGroups.length === 0) {
        empty.classList.remove('hidden');
        Array.from(list.children).forEach(c => { if (c.id !== 'wbRoleEmpty') c.remove(); });
        return;
    }
    empty.classList.add('hidden');
    Array.from(list.children).forEach(c => { if (c.id !== 'wbRoleEmpty') c.remove(); });

    wbRoleData.roleGroups.forEach(g => {
        const entries = wbRoleData.roleEntries.filter(e => e.groupId === g.id);

        const entriesHTML = entries.map(e => `
            <div class="wb-entry-row" onclick="wbRoleOpenEntryModal('${g.id}','${e.id}')">
                <div class="wb-entry-toggle ${e.enabled ? 'wb-on' : ''}"
                     onclick="event.stopPropagation();wbRoleToggleEntry('${e.id}')"></div>
                <div class="wb-entry-info">
                    <div class="wb-entry-name">${_esc(e.name)}</div>
                    <div class="wb-entry-meta">
                        <span class="wb-entry-char">${_esc(e.charName || '未关联')}</span>
                        <span class="wb-entry-pos wb-entry-pos--${e.pos}">${POS_LABEL[e.pos] || e.pos}</span>
                        ${e.keywords && e.keywords.length
                ? `<span class="wb-entry-kw">${_esc(e.keywords.join(', '))}</span>` : ''}
                    </div>
                </div>
                <button class="wb-entry-edit"
                        onclick="event.stopPropagation();wbRoleDeleteEntry('${e.id}')"
                        title="删除">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                        <path d="M10 11v6M14 11v6"/>
                    </svg>
                </button>
            </div>
        `).join('');

        const card = document.createElement('div');
        card.className = 'wb-group-card wb-open';
        card.id = 'wbRGC_' + g.id;
        card.innerHTML = `
            <div class="wb-group-head" onclick="wbRoleToggleGroup('${g.id}')">
                <div class="wb-group-arrow">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9 18l6-6-6-6"/>
                    </svg>
                </div>
                <span class="wb-group-name">${_esc(g.name)}</span>
                <span class="wb-group-count">${entries.length}</span>
                <button class="wb-group-del"
                        onclick="event.stopPropagation();wbRoleDeleteGroup('${g.id}')"
                        title="删除分组">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
            <div class="wb-group-body">
                ${entriesHTML}
                <button class="wb-add-entry-btn" onclick="wbRoleOpenEntryModal('${g.id}')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
                        <line x1="12" y1="5" x2="12" y2="19"/>
                        <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    新建条目
                </button>
            </div>
        `;
        list.appendChild(card);
    });
}

/* ════ 对外：注册角色（供聊天模块调用） ════ */
function wbRoleRegisterChar(id, name) {
    wbRoleData = WBRoleStore.get();
    if (!wbRoleData.chars) wbRoleData.chars = [];
    if (!wbRoleData.chars.find(c => c.id === id)) {
        wbRoleData.chars.push({ id, name });
        WBRoleStore.save(wbRoleData);
    }
}

/* 获取指定角色+位置的注入内容 */
function wbRoleGetInjection(charId, pos) {
    return wbRoleData.roleEntries
        .filter(e => e.enabled && e.charId === charId && e.pos === pos)
        .map(e => e.content)
        .filter(Boolean)
        .join('\n');
}

/* 获取指定角色的关键词触发内容 */
function wbRoleGetTriggered(charId, userMessage) {
    return wbRoleData.roleEntries
        .filter(e => e.enabled && e.charId === charId && e.pos === 'middle'
            && e.keywords && e.keywords.length)
        .filter(e => e.keywords.some(kw => kw && userMessage.includes(kw)))
        .map(e => e.content)
        .filter(Boolean)
        .join('\n');
}

