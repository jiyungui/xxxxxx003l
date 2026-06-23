/* ═══════════════════════════════════════════════════════
   settings.js  设置APP完整逻辑
   · API配置 + 模型管理
   · MiniMax语音配置
   · 屏幕调整 / 壁纸 / 图标 / 字体 / 数据管理
   · 全部持久化到 localStorage / IndexedDB
═══════════════════════════════════════════════════════ */
'use strict';

/* ════════════════════════════════
   设置专用存储（独立key空间）
════════════════════════════════ */
const SettingStore = {
    prefix: 'xxj_set_',
    set(k, v) { try { localStorage.setItem(this.prefix + k, JSON.stringify(v)); } catch (e) { } },
    get(k, fb) {
        try {
            const v = localStorage.getItem(this.prefix + k);
            return v === null ? fb : JSON.parse(v);
        } catch { return fb; }
    },
    remove(k) { try { localStorage.removeItem(this.prefix + k); } catch { } }
};

/* ════════════════════════════════
   页面导航
════════════════════════════════ */
function openSettingsApp() {
    const el = document.getElementById('settingsApp');
    el.classList.remove('hidden');
    el.style.animation = '';
    void el.offsetWidth;
    el.style.animation = 'saSlideIn 0.3s cubic-bezier(0.34,1.1,0.64,1)';
    saShowPage('saHome');
    loadSettingsState();
}

function closeSettingsApp() {
    const el = document.getElementById('settingsApp');
    el.style.animation = 'saSlideOut 0.22s ease forwards';
    setTimeout(() => {
        el.classList.add('hidden');
        el.style.animation = '';
    }, 220);
}

function saNav(pageId) {
    saShowPage(pageId);
}

function saBack(pageId) {
    saShowPage(pageId);
}

function saShowPage(pageId) {
    document.querySelectorAll('#settingsApp .sa-page').forEach(p => {
        p.classList.add('hidden');
    });
    const target = document.getElementById(pageId);
    if (target) {
        target.classList.remove('hidden');
        target.style.animation = '';
        void target.offsetWidth;
        target.style.animation = 'saPageIn 0.22s cubic-bezier(0.34,1.1,0.64,1)';
    }
}

/* ════════════════════════════════
   加载已保存设置到界面
════════════════════════════════ */
function loadSettingsState() {
    /* API字段 */
    _setVal('apiName', SettingStore.get('apiName', ''));
    _setVal('apiUrl', SettingStore.get('apiUrl', ''));
    _setVal('apiKey', SettingStore.get('apiKey', ''));

    /* MiniMax */
    _setVal('minimaxKey', SettingStore.get('minimaxKey', ''));
    _setVal('minimaxGroupId', SettingStore.get('minimaxGroupId', ''));
    _setVal('minimaxVoice', SettingStore.get('minimaxVoice', ''));
    const speed = SettingStore.get('minimaxSpeed', 1.0);
    _setVal('minimaxSpeed', speed);
    const speedEl = document.getElementById('minimaxSpeedVal');
    if (speedEl) speedEl.textContent = parseFloat(speed).toFixed(1);

    /* 渲染模型列表 */
    renderSavedModels();

    /* 存储用量 */
    calcStorage();

    /* 壁纸 */
    const wpColor = SettingStore.get('wpColor', null);
    if (wpColor) applyColorWallpaper(wpColor, false);

    /* 字体 */
    const font = SettingStore.get('font', 'system');
    applyFontToPage(font, false);
    /* 内置字体 active */
    _setActive('fontList', '.ft-item', `[data-font="${font}"]`);
    /* 字号 */
    const fontSize = SettingStore.get('fontSize', 100);
    _setVal('fontSizeRange', fontSize);
    const fontSizeValEl = document.getElementById('fontSizeVal');
    if (fontSizeValEl) fontSizeValEl.textContent = fontSize + '%';
    /* 渲染字体库 */
    renderFontLib();

    /* 图标风格 */
    const iconStyle = SettingStore.get('iconStyle', 'default');
    applyIconStyleToPage(iconStyle, false);
    _setActive('iconStyleList', '.ic-style-item', `[data-style="${iconStyle}"]`);

    /* 图标背景 */
    const iconBg = SettingStore.get('iconBg', 'glass');
    applyIconBgToPage(iconBg, false);
    _setActive(null, '.ic-bg-item', `[data-bg="${iconBg}"]`);

    /* 图标形状 */
    const iconShape = SettingStore.get('iconShape', 'circle');
    applyIconShapeToPage(iconShape, false);
    _setActive('iconShapeList', '.ic-shape-item', `[data-shape="${iconShape}"]`);

    /* 图标名称颜色 */
    const labelColor = SettingStore.get('iconLabelColor', '#2a2a2a');
    applyIconLabelColor(labelColor, false);
    _setActive(null, '.ic-label-chip', `[data-color="${labelColor}"]`);
    const picker = document.getElementById('icLabelColorPicker');
    if (picker) picker.value = labelColor;
    const preview = document.getElementById('icLabelPreviewText');
    if (preview) preview.style.color = labelColor;

    /* 渲染面板 */
    renderIconLinePanel();
    renderIconCustomList();
    renderIconGallery();

    /* 屏幕 */
    const scale = SettingStore.get('scale', 100);
    const brightness = SettingStore.get('brightness', 100);
    const gap = SettingStore.get('gridGap', 16);
    _setVal('scaleRange', scale);
    document.getElementById('scaleVal') && (document.getElementById('scaleVal').textContent = scale + '%');
    _setVal('brightnessRange', brightness);
    document.getElementById('brightnessVal') && (document.getElementById('brightnessVal').textContent = brightness + '%');
    _setVal('gridGapRange', gap);
    document.getElementById('gridGapVal') && (document.getElementById('gridGapVal').textContent = gap + 'px');
    applyScaleToPage(scale, false);
    applyBrightnessToPage(brightness, false);
    applyGridGapToPage(gap, false);

    /* 屏幕调整扩展 */
    const filter = SettingStore.get('screenFilter', 'none');
    _setActive(null, '.sc-filter-item', `[data-filter="${filter}"]`);
    applyFilterToPage(filter, false);

    const nightMode = SettingStore.get('nightMode', false);
    const el_nm = document.getElementById('nightModeToggle');
    if (el_nm) el_nm.checked = nightMode;
    applyNightMode(nightMode, false);

    const eyeCare = SettingStore.get('eyeCare', false);
    const el_ec = document.getElementById('eyeCareToggle');
    if (el_ec) el_ec.checked = eyeCare;
    applyEyeCare(eyeCare, false);

    const hideStatus = SettingStore.get('hideStatusBar', false);
    const el_hs = document.getElementById('hideStatusBar');
    if (el_hs) el_hs.checked = hideStatus;
    toggleStatusBar(hideStatus);

    const hideDI = SettingStore.get('hideDynamicIsland', false);
    const el_hdi = document.getElementById('hideDynamicIsland');
    if (el_hdi) el_hdi.checked = hideDI;
    toggleDynamicIsland(hideDI);

    const topWidget = SettingStore.get('topWidget', 'info');
    _setActive(null, '.sc-widget-opt', `[data-widget="${topWidget}"]`);
    applyTopWidget(topWidget, false);

    const tz = SettingStore.get('timezone', 'local');
    _setActive('tzGrid', '.sc-tz-item', `[data-tz="${tz}"]`);

    _setVal('weatherCity', SettingStore.get('weatherCity', ''));
    _setVal('weatherApiKey', SettingStore.get('weatherApiKey', ''));

    const pos = SettingStore.get('screenPos', { x: 0, y: 0 });
    _applyScreenPos(pos, false);

    _updateTzTimes();
    _startTzTimer();

    /* 壁纸图库 */
    renderWpGallery();

    /* 天气动效面板状态恢复 */
    const wxType = SettingStore.get('weatherEffect', 'none');
    _setActive(null, '.wp-wx-item', `[data-wx="${wxType}"]`);
    _wxIntensity = SettingStore.get('wxIntensity', 2);
    _setVal('wxIntensity', _wxIntensity);
    const intensityLabels = ['', '轻', '中', '强'];
    const intensityEl = document.getElementById('wxIntensityVal');
    if (intensityEl) intensityEl.textContent = intensityLabels[_wxIntensity] || '中';

    /* 导出记录 */
    renderExportLog();
}

function _setVal(id, val) {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.tagName === 'SELECT' || el.tagName === 'INPUT') el.value = val;
}

function _setActive(containerId, itemSelector, targetSelector) {
    const container = containerId ? document.getElementById(containerId) : document;
    if (!container) return;
    container.querySelectorAll(itemSelector).forEach(el => el.classList.remove('active'));
    const target = container.querySelector(targetSelector);
    if (target) target.classList.add('active');
}

/* ════════════════════════════════
   API 设置
════════════════════════════════ */
function toggleApiKeyVisible() {
    const input = document.getElementById('apiKey');
    const icon = document.getElementById('eyeIcon');
    if (!input) return;
    if (input.type === 'password') {
        input.type = 'text';
        icon.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';
    } else {
        input.type = 'password';
        icon.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
    }
}

function toggleMinimaxKeyVisible() {
    const input = document.getElementById('minimaxKey');
    if (!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
}

/* 拉取模型列表 */
async function fetchModels() {
    const url = document.getElementById('apiUrl').value.trim();
    const key = document.getElementById('apiKey').value.trim();
    const btn = document.getElementById('fetchModelsBtn');

    if (!url || !key) {
        saToast('请先填写 API URL 和 API Key');
        return;
    }

    btn.textContent = '拉取中…';
    btn.disabled = true;

    try {
        /* 尝试标准 OpenAI /models 接口 */
        const modelsUrl = url.replace(/\/$/, '') + '/models';
        const res = await fetch(modelsUrl, {
            headers: { 'Authorization': 'Bearer ' + key }
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const models = (data.data || data.models || [])
            .map(m => m.id || m.name || m)
            .filter(Boolean)
            .sort();

        if (!models.length) throw new Error('未获取到模型');

        const select = document.getElementById('modelSelect');
        select.innerHTML = models.map(m =>
            `<option value="${m}">${m}</option>`
        ).join('');

        saToast(`已拉取 ${models.length} 个模型`);
    } catch (err) {
        saToast('拉取失败：' + err.message, 'error');
        /* 失败时提供手动输入fallback */
        const select = document.getElementById('modelSelect');
        if (select.options.length <= 1) {
            select.innerHTML = '<option value="">— 拉取失败，请手动输入 —</option>';
        }
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15"/></svg>拉取模型`;
    }
}

/* 测试模型 */
async function testModel() {
    const url = document.getElementById('apiUrl').value.trim();
    const key = document.getElementById('apiKey').value.trim();
    const model = document.getElementById('modelSelect').value;
    const resultEl = document.getElementById('testResult');

    if (!url || !key || !model) {
        saToast('请填写完整配置并选择模型');
        return;
    }

    resultEl.className = 'sa-test-result';
    resultEl.textContent = '测试中…';
    resultEl.classList.remove('hidden');

    try {
        const chatUrl = url.replace(/\/$/, '') + '/chat/completions';
        const res = await fetch(chatUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + key
            },
            body: JSON.stringify({
                model,
                messages: [{ role: 'user', content: 'Hi, reply with one word: OK' }],
                max_tokens: 10
            })
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error?.message || `HTTP ${res.status}`);
        }

        const data = await res.json();
        const reply = data.choices?.[0]?.message?.content || '（无回复）';
        resultEl.className = 'sa-test-result success';
        resultEl.textContent = `✓ 测试通过  模型回复：${reply.trim()}`;
    } catch (err) {
        resultEl.className = 'sa-test-result error';
        resultEl.textContent = `✗ 测试失败：${err.message}`;
    }
}

/* 保存模型 */
function saveModel() {
    const name = document.getElementById('apiName').value.trim();
    const url = document.getElementById('apiUrl').value.trim();
    const key = document.getElementById('apiKey').value.trim();
    const model = document.getElementById('modelSelect').value;

    if (!name || !url || !key || !model) {
        saToast('请填写 API名称、URL、Key 并选择模型');
        return;
    }

    /* 同时保存当前配置的快照 */
    SettingStore.set('apiName', name);
    SettingStore.set('apiUrl', url);
    SettingStore.set('apiKey', key);

    const list = SettingStore.get('modelList', []);
    const id = Date.now().toString(36);

    /* 避免同名同模型重复 */
    const dup = list.find(m => m.name === name && m.model === model);
    if (dup) { saToast('该配置已存在'); return; }

    list.push({ id, name, url, key, model, createdAt: Date.now() });
    SettingStore.set('modelList', list);

    /* 自动激活刚保存的模型 */
    SettingStore.set('activeModelId', id);

    renderSavedModels();
    saToast('模型已保存并激活');
}

/* 渲染模型列表 */
function renderSavedModels() {
    const list = SettingStore.get('modelList', []);
    const activeId = SettingStore.get('activeModelId', null);
    const container = document.getElementById('savedModelList');
    const badge = document.getElementById('modelCountBadge');
    if (!container) return;

    if (badge) badge.textContent = list.length;

    if (!list.length) {
        container.innerHTML = '<div class="sa-empty-tip">暂无保存的模型</div>';
        return;
    }

    container.innerHTML = list.map(m => `
    <div class="sa-model-card ${m.id === activeId ? 'active' : ''}"
         onclick="activateModel('${m.id}')">
      <div class="sa-model-dot"></div>
      <div class="sa-model-info">
        <div class="sa-model-name">${_escHtml(m.name)}</div>
        <div class="sa-model-sub">${_escHtml(m.model)} · ${_escHtml(_shortUrl(m.url))}</div>
      </div>
      <button class="sa-model-del" onclick="deleteModel(event,'${m.id}')" title="删除">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
          <path d="M10 11v6M14 11v6"/>
        </svg>
      </button>
    </div>
  `).join('');
}

/* 激活模型（加载到输入框） */
function activateModel(id) {
    const list = SettingStore.get('modelList', []);
    const m = list.find(x => x.id === id);
    if (!m) return;

    SettingStore.set('activeModelId', id);
    _setVal('apiName', m.name);
    _setVal('apiUrl', m.url);
    _setVal('apiKey', m.key);

    /* 把模型填入select */
    const select = document.getElementById('modelSelect');
    let opt = Array.from(select.options).find(o => o.value === m.model);
    if (!opt) {
        opt = new Option(m.model, m.model);
        select.add(opt);
    }
    select.value = m.model;

    renderSavedModels();
    saToast(`已切换到：${m.name} / ${m.model}`);
}

/* 删除模型 */
function deleteModel(e, id) {
    e.stopPropagation();
    if (!confirm('确认删除此模型配置？')) return;
    let list = SettingStore.get('modelList', []);
    list = list.filter(m => m.id !== id);
    SettingStore.set('modelList', list);
    const activeId = SettingStore.get('activeModelId', null);
    if (activeId === id) SettingStore.remove('activeModelId');
    renderSavedModels();
}

/* ── MiniMax 语音配置 ── */
function saveMinimaxConfig() {
    SettingStore.set('minimaxKey', document.getElementById('minimaxKey').value.trim());
    SettingStore.set('minimaxGroupId', document.getElementById('minimaxGroupId').value.trim());
    SettingStore.set('minimaxVoice', document.getElementById('minimaxVoice').value.trim());
    SettingStore.set('minimaxSpeed', document.getElementById('minimaxSpeed').value);
    saToast('语音配置已保存');
}

/* 对外接口：获取当前激活模型（供聊天等APP调用） */
function getActiveModel() {
    const list = SettingStore.get('modelList', []);
    const activeId = SettingStore.get('activeModelId', null);
    return list.find(m => m.id === activeId) || null;
}

function getMinimaxConfig() {
    return {
        key: SettingStore.get('minimaxKey', ''),
        groupId: SettingStore.get('minimaxGroupId', ''),
        voice: SettingStore.get('minimaxVoice', ''),
        speed: parseFloat(SettingStore.get('minimaxSpeed', 1.0))
    };
}

/* ════════════════════════════════
   MiniMax 试听
════════════════════════════════ */
let _previewAudioUrl = null;

async function previewMinimaxVoice() {
    const cfg = getMinimaxConfig();
    const text = document.getElementById('minimaxPreviewText').value.trim();

    if (!cfg.key) { saToast('请先填写并保存 MiniMax API Key', 'error'); return; }
    if (!cfg.groupId) { saToast('请先填写并保存 Group ID', 'error'); return; }
    if (!cfg.voice) { saToast('请先填写并保存 Voice ID', 'error'); return; }
    if (!text) { saToast('请输入试听文字', 'error'); return; }

    const playBtn = document.getElementById('previewPlayBtn');
    const stopBtn = document.getElementById('previewStopBtn');
    const statusEl = document.getElementById('previewStatus');

    /* UI：加载中 */
    playBtn.disabled = true;
    playBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16v.5"/></svg>合成中…`;
    statusEl.className = 'sa-voice-preview-status loading';
    statusEl.textContent = '正在合成语音，请稍候…';
    statusEl.classList.remove('hidden');
    stopBtn.style.display = 'none';

    try {
        const apiUrl = `https://api.minimax.chat/v1/text_to_speech?GroupId=${cfg.groupId}`;
        const body = {
            model: 'speech-01',
            text: text,
            voice_id: cfg.voice,
            speed: cfg.speed,
            vol: 1.0,
            pitch: 0
        };

        const res = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${cfg.key}`
            },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.base_resp?.status_msg || `HTTP ${res.status}`);
        }

        /* 释放旧的 Blob URL */
        if (_previewAudioUrl) {
            URL.revokeObjectURL(_previewAudioUrl);
            _previewAudioUrl = null;
        }

        const blob = await res.blob();
        _previewAudioUrl = URL.createObjectURL(blob);

        const audio = document.getElementById('minimaxPreviewAudio');
        audio.src = _previewAudioUrl;
        audio.play();

        /* UI：播放中 */
        statusEl.className = 'sa-voice-preview-status';
        statusEl.textContent = '▶ 正在播放…';
        stopBtn.style.display = '';
        playBtn.disabled = false;
        playBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><polygon points="5 3 19 12 5 21 5 3"/></svg>试听`;

        audio.onended = () => {
            stopBtn.style.display = 'none';
            statusEl.textContent = '✓ 播放完毕';
        };

    } catch (err) {
        statusEl.className = 'sa-voice-preview-status error';
        statusEl.textContent = `✗ 合成失败：${err.message}`;
        playBtn.disabled = false;
        playBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><polygon points="5 3 19 12 5 21 5 3"/></svg>试听`;
    }
}

function stopMinimaxPreview() {
    const audio = document.getElementById('minimaxPreviewAudio');
    const stopBtn = document.getElementById('previewStopBtn');
    const statusEl = document.getElementById('previewStatus');
    if (audio) { audio.pause(); audio.currentTime = 0; }
    stopBtn.style.display = 'none';
    if (statusEl) statusEl.textContent = '已停止';
}

/* ════════════════════════════════
   壁纸更换 — 完整版
════════════════════════════════ */

/* ── 状态变量 ── */
let _wpRawFile = null;   // 原始 File 对象（不压缩）
let _wpRawDataUrl = null;   // 原始图片 DataURL（100% 画质）
let _wpFit = 'cover';

/* ── 上传处理（保留原始画质） ── */
function handleWallpaperUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    _wpRawFile = file;

    /* 显示文件信息 */
    const info = document.getElementById('wpFileInfo');
    if (info) info.textContent = `${file.name} · ${(file.size / 1024).toFixed(0)} KB`;

    const reader = new FileReader();
    reader.onload = (e) => {
        _wpRawDataUrl = e.target.result;
        _renderWpCanvas(_wpRawDataUrl);
        const panel = document.getElementById('wpStylePanel');
        if (panel) panel.style.display = '';
    };
    reader.readAsDataURL(file);   // 直接读取，不压缩
    event.target.value = '';
}

/* ── Canvas 预览（带样式参数） ── */
function _renderWpCanvas(dataUrl) {
    const wrap = document.getElementById('wpPreviewWrap');
    const canvas = document.getElementById('wpCanvas');
    if (!wrap || !canvas) return;
    wrap.classList.remove('hidden');

    const img = new Image();
    img.onload = () => {
        /* 记录原始尺寸 */
        const badge = document.getElementById('wpDimBadge');
        if (badge) badge.textContent = `${img.naturalWidth}×${img.naturalHeight}`;

        const W = canvas.offsetWidth || 280;
        const H = Math.round(W * 1.4);
        canvas.width = W * devicePixelRatio;
        canvas.height = H * devicePixelRatio;
        canvas.style.height = H + 'px';

        const ctx = canvas.getContext('2d');
        ctx.scale(devicePixelRatio, devicePixelRatio);

        /* 读取调节参数 */
        const opacity = (document.getElementById('wpOpacity')?.value || 100) / 100;
        const blur = parseInt(document.getElementById('wpBlur')?.value || 0);
        const bright = (document.getElementById('wpBright')?.value || 100) / 100;
        const sat = (document.getElementById('wpSat')?.value || 100) / 100;
        const frost = parseInt(document.getElementById('wpFrost')?.value || 0);

        /* 应用滤镜 */
        ctx.filter = `blur(${blur}px) brightness(${bright}) saturate(${sat})`;
        ctx.globalAlpha = opacity;

        /* 填充方式 */
        if (_wpFit === 'cover') {
            const scale = Math.max(W / img.naturalWidth, H / img.naturalHeight);
            const sw = img.naturalWidth * scale, sh = img.naturalHeight * scale;
            ctx.drawImage(img, (W - sw) / 2, (H - sh) / 2, sw, sh);
        } else if (_wpFit === 'contain') {
            const scale = Math.min(W / img.naturalWidth, H / img.naturalHeight);
            const sw = img.naturalWidth * scale, sh = img.naturalHeight * scale;
            ctx.drawImage(img, (W - sw) / 2, (H - sh) / 2, sw, sh);
        } else if (_wpFit === 'tile') {
            const pat = ctx.createPattern(img, 'repeat');
            ctx.fillStyle = pat;
            ctx.fillRect(0, 0, W, H);
        } else {
            /* center */
            ctx.drawImage(img, (W - img.naturalWidth) / 2, (H - img.naturalHeight) / 2);
        }

        /* 毛玻璃叠层（白色半透明遮罩模拟） */
        if (frost > 0) {
            ctx.globalAlpha = frost * 0.04;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, W, H);
            ctx.globalAlpha = 1;
        }
    };
    img.src = dataUrl;
}

/* 实时预览触发 */
function previewWpStyle() {
    if (!_wpRawDataUrl) return;
    /* 更新标签 */
    const v = (id, suffix) => {
        const el = document.getElementById(id);
        return el ? el.value + suffix : '';
    };
    document.getElementById('wpOpacityVal').textContent = v('wpOpacity', '%');
    document.getElementById('wpBlurVal').textContent = v('wpBlur', 'px');
    document.getElementById('wpFrostVal').textContent = document.getElementById('wpFrost')?.value || '0';
    document.getElementById('wpBrightVal').textContent = v('wpBright', '%');
    document.getElementById('wpSatVal').textContent = v('wpSat', '%');
    _renderWpCanvas(_wpRawDataUrl);
}

function selectWpFit(fit) {
    _wpFit = fit;
    document.querySelectorAll('.wp-fit-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.wp-fit-btn[data-fit="${fit}"]`)?.classList.add('active');
    if (_wpRawDataUrl) _renderWpCanvas(_wpRawDataUrl);
}

/* ── 应用壁纸到主屏幕（不压缩 DataURL） ── */
function applyWallpaper() {
    if (!_wpRawDataUrl) { saToast('请先选择图片'); return; }

    const opacity = (document.getElementById('wpOpacity')?.value || 100) / 100;
    const blur = parseInt(document.getElementById('wpBlur')?.value || 0);
    const bright = (document.getElementById('wpBright')?.value || 100) / 100;
    const sat = (document.getElementById('wpSat')?.value || 100) / 100;
    const frost = parseInt(document.getElementById('wpFrost')?.value || 0);

    /* 小组件图片不受影响：wallpaperLayer 独立层，与 widget img 并列，不嵌套 */
    const layer = document.getElementById('wallpaperLayer');
    if (layer) {
        const fitMap = { cover: 'cover', contain: 'contain', center: 'auto', tile: 'auto' };
        layer.style.backgroundImage = `url(${_wpRawDataUrl})`;
        layer.style.backgroundSize = fitMap[_wpFit] || 'cover';
        layer.style.backgroundPosition = 'center';
        layer.style.backgroundRepeat = _wpFit === 'tile' ? 'repeat' : 'no-repeat';
        layer.style.backgroundColor = 'transparent';
        layer.style.opacity = opacity;
        layer.style.filter = `blur(${blur}px) brightness(${bright}) saturate(${sat})`;
        /* 毛玻璃叠层 */
        let pseudo = document.getElementById('wpFrostLayer');
        if (!pseudo) {
            pseudo = document.createElement('div');
            pseudo.id = 'wpFrostLayer';
            pseudo.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:1;transition:opacity .3s;';
            layer.parentNode.insertBefore(pseudo, layer.nextSibling);
        }
        pseudo.style.background = `rgba(255,255,255,${frost * 0.04})`;
    }

    /* ① 存原始 DataURL 到 IndexedDB（保全画质） */
    if (typeof ImgDB !== 'undefined') {
        ImgDB.set('wallpaper', _wpRawDataUrl).catch(() => { });
    }
    /* ② 存壁纸样式参数 */
    SettingStore.set('wpStyle', { opacity, blur, bright, sat, frost, fit: _wpFit });
    SettingStore.remove('wpColor');

    /* ③ 自动加入图库 */
    _addToGalleryItem(_wpRawDataUrl, _wpRawFile?.name || 'wallpaper');

    saToast('壁纸已设置');
}

/* ── 纯色壁纸 ── */
function applyColorWallpaper(color, save = true) {
    const layer = document.getElementById('wallpaperLayer');
    if (layer) {
        layer.style.backgroundImage = 'none';
        layer.style.backgroundColor = color;
        layer.style.opacity = '1';
        layer.style.filter = 'none';
    }
    const frost = document.getElementById('wpFrostLayer');
    if (frost) frost.style.background = 'transparent';
    if (save) {
        SettingStore.set('wpColor', color);
        SettingStore.remove('wpStyle');
        if (typeof ImgDB !== 'undefined') ImgDB.remove('wallpaper').catch(() => { });
        saToast('颜色壁纸已设置');
    }
}

/* ── 恢复默认 ── */
function resetWallpaper() {
    applyColorWallpaper('#dfdfdd');
    _wpRawDataUrl = null;
    _wpRawFile = null;
    const wrap = document.getElementById('wpPreviewWrap');
    if (wrap) wrap.classList.add('hidden');
    const panel = document.getElementById('wpStylePanel');
    if (panel) panel.style.display = 'none';
    if (typeof ImgDB !== 'undefined') ImgDB.remove('wallpaper').catch(() => { });
    saToast('已恢复默认壁纸');
}

/* ── 恢复壁纸到主屏幕（启动时） ── */
function _restoreWallpaperFromDB() {
    if (typeof ImgDB === 'undefined') {
        const wpColor = SettingStore.get('wpColor', null);
        if (wpColor) applyColorWallpaper(wpColor, false);
        return;
    }
    ImgDB.get('wallpaper').then(dataUrl => {
        if (dataUrl) {
            const style = SettingStore.get('wpStyle', {});
            const layer = document.getElementById('wallpaperLayer');
            const fitMap = { cover: 'cover', contain: 'contain', center: 'auto', tile: 'auto' };
            if (layer) {
                layer.style.backgroundImage = `url(${dataUrl})`;
                layer.style.backgroundSize = fitMap[style.fit] || 'cover';
                layer.style.backgroundPosition = 'center';
                layer.style.backgroundRepeat = style.fit === 'tile' ? 'repeat' : 'no-repeat';
                layer.style.backgroundColor = 'transparent';
                layer.style.opacity = style.opacity != null ? style.opacity : 1;
                layer.style.filter = `blur(${style.blur || 0}px) brightness(${style.bright || 1}) saturate(${style.sat || 1})`;
            }
            /* 毛玻璃层 */
            if (style.frost) {
                let pseudo = document.getElementById('wpFrostLayer');
                if (!pseudo) {
                    pseudo = document.createElement('div');
                    pseudo.id = 'wpFrostLayer';
                    pseudo.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:1;';
                    layer && layer.parentNode.insertBefore(pseudo, layer.nextSibling);
                }
                pseudo.style.background = `rgba(255,255,255,${(style.frost || 0) * 0.04})`;
            }
        } else {
            const wpColor = SettingStore.get('wpColor', null);
            if (wpColor) applyColorWallpaper(wpColor, false);
        }
    }).catch(() => {
        const wpColor = SettingStore.get('wpColor', null);
        if (wpColor) applyColorWallpaper(wpColor, false);
    });
}

/* ════════════════════════════════
   壁纸图库
════════════════════════════════ */
const WP_GALLERY_KEY = 'xxj_set_wpGallery';
const WP_GALLERY_IDB_PREFIX = 'wpgallery_';
const WP_GALLERY_MAX = 20;

function addToWpGallery(event) {
    const files = Array.from(event.target.files);
    if (!files.length) return;
    files.slice(0, WP_GALLERY_MAX).forEach(file => {
        const reader = new FileReader();
        reader.onload = e => _addToGalleryItem(e.target.result, file.name);
        reader.readAsDataURL(file);
    });
    event.target.value = '';
}

function _addToGalleryItem(dataUrl, name) {
    const meta = JSON.parse(localStorage.getItem(WP_GALLERY_KEY) || '[]');
    const id = 'wg_' + Date.now().toString(36);
    /* 避免重复（简单前64字符比较） */
    if (meta.find(m => m.preview === dataUrl.slice(0, 64))) return;

    meta.unshift({ id, name: name || id, preview: dataUrl.slice(0, 64), ts: Date.now() });
    if (meta.length > WP_GALLERY_MAX) {
        const removed = meta.splice(WP_GALLERY_MAX);
        removed.forEach(m => {
            if (typeof ImgDB !== 'undefined') ImgDB.remove(WP_GALLERY_IDB_PREFIX + m.id).catch(() => { });
        });
    }
    localStorage.setItem(WP_GALLERY_KEY, JSON.stringify(meta));

    if (typeof ImgDB !== 'undefined') {
        ImgDB.set(WP_GALLERY_IDB_PREFIX + id, dataUrl).catch(() => { });
    }
    renderWpGallery();
}

function renderWpGallery() {
    const meta = JSON.parse(localStorage.getItem(WP_GALLERY_KEY) || '[]');
    const grid = document.getElementById('wpGalleryGrid');
    const badge = document.getElementById('wpGalleryBadge');
    const empty = document.getElementById('wpGalleryEmpty');
    if (!grid) return;
    if (badge) badge.textContent = meta.length;

    if (!meta.length) {
        if (empty) empty.style.display = '';
        return;
    }
    if (empty) empty.style.display = 'none';

    /* 清空旧内容（保留empty节点） */
    Array.from(grid.children).forEach(c => { if (c.id !== 'wpGalleryEmpty') c.remove(); });

    meta.forEach(m => {
        const idbKey = WP_GALLERY_IDB_PREFIX + m.id;
        const thumb = document.createElement('div');
        thumb.className = 'wp-gallery-thumb';
        thumb.dataset.id = m.id;
        thumb.title = m.name;
        thumb.innerHTML = `
            <div class="wp-gallery-img-wrap">
                <img class="wp-gallery-img" data-idbkey="${idbKey}" alt="" />
                <button class="wp-gallery-del" onclick="deleteGalleryItem(event,'${m.id}')" title="删除">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>
            <div class="wp-gallery-name">${_escHtml(m.name.slice(0, 12))}</div>
        `;
        /* 异步加载缩略图 */
        if (typeof ImgDB !== 'undefined') {
            ImgDB.get(idbKey).then(dataUrl => {
                if (dataUrl) {
                    const img = thumb.querySelector('.wp-gallery-img');
                    if (img) img.src = dataUrl;
                }
            }).catch(() => { });
        }
        /* 点击选用 */
        thumb.querySelector('.wp-gallery-img-wrap').addEventListener('click', () => {
            if (typeof ImgDB !== 'undefined') {
                ImgDB.get(idbKey).then(dataUrl => {
                    if (dataUrl) {
                        _wpRawDataUrl = dataUrl;
                        _wpFit = 'cover';
                        _renderWpCanvas(dataUrl);
                        document.getElementById('wpStylePanel').style.display = '';
                        saToast('已选入，调整后点击"设为壁纸"');
                    }
                });
            }
        });

        grid.appendChild(thumb);
    });
}

function deleteGalleryItem(e, id) {
    e.stopPropagation();
    let meta = JSON.parse(localStorage.getItem(WP_GALLERY_KEY) || '[]');
    meta = meta.filter(m => m.id !== id);
    localStorage.setItem(WP_GALLERY_KEY, JSON.stringify(meta));
    if (typeof ImgDB !== 'undefined') {
        ImgDB.remove(WP_GALLERY_IDB_PREFIX + id).catch(() => { });
    }
    renderWpGallery();
}

/* ════════════════════════════════
   主屏天气动态效果
════════════════════════════════ */
let _wxType = 'none';
let _wxIntensity = 2;        // 1轻 2中 3强
let _wxAnimId = null;
let _wxParticles = [];

const WX_CONFIG = {
    rain: { count: [60, 120, 220], color: 'rgba(180,210,240,0.65)' },
    heavyrain: { count: [100, 200, 360], color: 'rgba(140,180,220,0.7)' },
    snow: { count: [40, 80, 150], color: 'rgba(230,240,255,0.85)' },
    fog: { count: [12, 20, 30], color: 'rgba(210,215,220,0.22)' },
    thunder: { count: [60, 120, 200], color: 'rgba(180,210,240,0.65)' },
    wind: { count: [50, 100, 180], color: 'rgba(200,210,220,0.5)' },
    sakura: { count: [30, 60, 100], color: 'rgba(255,180,190,0.7)' },
};

function selectWeatherEffect(type) {
    _setActive(null, '.wp-wx-item', `[data-wx="${type}"]`);
    _wxType = type;
    SettingStore.set('weatherEffect', type);
    _startWeatherEffect(type);
}

function updateWxIntensityLabel(val) {
    _wxIntensity = parseInt(val);
    const labels = ['', '轻', '中', '强'];
    document.getElementById('wxIntensityVal').textContent = labels[_wxIntensity] || '中';
    SettingStore.set('wxIntensity', _wxIntensity);
    if (_wxType !== 'none') _startWeatherEffect(_wxType);
}

function _startWeatherEffect(type) {
    /* ① 停止旧动画 + 清除雷暴定时器 */
    if (_wxAnimId) { cancelAnimationFrame(_wxAnimId); _wxAnimId = null; }
    if (window._wxThunderTimer) { clearTimeout(window._wxThunderTimer); window._wxThunderTimer = null; }
    _wxParticles = [];

    const canvas = document.getElementById('weatherCanvas');
    if (!canvas) return;

    if (type === 'none') {
        canvas.classList.add('hidden');
        return;
    }

    /* ② 先移除 hidden，再用 requestAnimationFrame 等浏览器重排后读尺寸 */
    canvas.classList.remove('hidden');

    requestAnimationFrame(() => {
        /* ③ 从父容器（homeScreen）读取真实尺寸，避免 canvas 自身尺寸为 0 的问题 */
        const parent = document.getElementById('homeScreen') || canvas.parentElement;
        const W = parent ? parent.offsetWidth : window.innerWidth;
        const H = parent ? parent.offsetHeight : window.innerHeight;

        if (!W || !H) return;   // 防御：父容器也为 0 时跳过

        /* ④ 设置 canvas 物理尺寸（不用 devicePixelRatio，天气粒子不需要高清） */
        canvas.width = W;
        canvas.height = H;
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';

        const ctx = canvas.getContext('2d');
        const cfg = WX_CONFIG[type] || WX_CONFIG.rain;
        const count = cfg.count[_wxIntensity - 1];

        /* ⑤ 初始化粒子 */
        _wxParticles = [];
        for (let i = 0; i < count; i++) {
            _wxParticles.push(_newParticle(type, W, H, true));
        }

        /* ⑥ 雷暴闪光（用 window 变量，方便外部清除） */
        function _scheduleThunder() {
            window._wxThunderTimer = setTimeout(() => {
                const screen = document.getElementById('homeScreen');
                if (!screen) return;
                /* 临时加一个闪光 overlay div，不污染 phoneScreen 的 filter */
                let flash = document.getElementById('wxThunderFlash');
                if (!flash) {
                    flash = document.createElement('div');
                    flash.id = 'wxThunderFlash';
                    flash.style.cssText = 'position:absolute;inset:0;z-index:9;pointer-events:none;background:rgba(255,255,255,0);transition:background .05s;';
                    screen.appendChild(flash);
                }
                flash.style.background = 'rgba(255,255,255,0.45)';
                setTimeout(() => {
                    flash.style.background = 'rgba(255,255,255,0)';
                    if (_wxType === 'thunder') _scheduleThunder();
                }, 80);
            }, 1800 + Math.random() * 3500);
        }
        if (type === 'thunder') _scheduleThunder();

        /* ⑦ 动画循环（用局部 animId 防止新旧并存） */
        let localAnimId = null;
        function tick() {
            /* 如果全局 _wxAnimId 已被新调用清空，停止本循环 */
            if (_wxAnimId !== localAnimId) return;
            ctx.clearRect(0, 0, W, H);
            _wxParticles.forEach((p, i) => {
                _drawParticle(ctx, type, p, cfg.color);
                _updateParticle(type, p, W, H);
                if (_offScreen(type, p, W, H)) {
                    _wxParticles[i] = _newParticle(type, W, H, false);
                }
            });
            localAnimId = _wxAnimId = requestAnimationFrame(tick);
        }
        localAnimId = _wxAnimId = requestAnimationFrame(tick);
    });
}

function _newParticle(type, W, H, scatter) {
    const y = scatter ? Math.random() * H : -20;
    switch (type) {
        case 'rain':
        case 'heavyrain':
        case 'thunder':
            return { x: Math.random() * W, y, len: 8 + Math.random() * 12, speed: 6 + Math.random() * 8, angle: 0.18 };
        case 'snow':
            return { x: Math.random() * W, y, r: 2 + Math.random() * 3, speed: 0.6 + Math.random() * 1.2, vx: (Math.random() - 0.5) * 0.5, phase: Math.random() * Math.PI * 2 };
        case 'fog':
            return { x: Math.random() * W, y: scatter ? Math.random() * H : H / 2, w: 80 + Math.random() * 140, h: 14 + Math.random() * 22, speed: 0.2 + Math.random() * 0.4, alpha: 0.1 + Math.random() * 0.18 };
        case 'wind':
            return { x: scatter ? Math.random() * W : -60, y: Math.random() * H, len: 30 + Math.random() * 60, speed: 3 + Math.random() * 5, alpha: 0.2 + Math.random() * 0.35 };
        case 'sakura':
            return { x: Math.random() * W, y, r: 4 + Math.random() * 5, speed: 0.8 + Math.random() * 1.4, vx: (Math.random() - 0.5), rot: Math.random() * Math.PI * 2, rotSpeed: (Math.random() - 0.5) * 0.06 };
        default:
            return { x: Math.random() * W, y, speed: 2 };
    }
}

function _drawParticle(ctx, type, p, color) {
    ctx.save();
    switch (type) {
        case 'rain':
        case 'heavyrain':
        case 'thunder':
            ctx.strokeStyle = color;
            ctx.lineWidth = type === 'heavyrain' ? 1.5 : 1;
            ctx.globalAlpha = 0.6;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x + p.len * Math.sin(p.angle), p.y + p.len);
            ctx.stroke();
            break;
        case 'snow':
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.8;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
            break;
        case 'fog':
            const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.w / 2);
            grd.addColorStop(0, `rgba(210,215,220,${p.alpha})`);
            grd.addColorStop(1, 'rgba(210,215,220,0)');
            ctx.fillStyle = grd;
            ctx.globalAlpha = 1;
            ctx.beginPath();
            ctx.ellipse(p.x, p.y, p.w / 2, p.h / 2, 0, 0, Math.PI * 2);
            ctx.fill();
            break;
        case 'wind':
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.globalAlpha = p.alpha;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x + p.len, p.y);
            ctx.stroke();
            break;
        case 'sakura':
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.75;
            ctx.beginPath();
            /* 简单花瓣形状（椭圆叠加） */
            for (let k = 0; k < 5; k++) {
                ctx.save();
                ctx.rotate((k / 5) * Math.PI * 2);
                ctx.beginPath();
                ctx.ellipse(0, -p.r * 0.8, p.r * 0.4, p.r * 0.9, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
            break;
    }
    ctx.restore();
}

function _updateParticle(type, p, W, H) {
    switch (type) {
        case 'rain':
        case 'heavyrain':
        case 'thunder':
            p.y += p.speed;
            p.x += p.speed * Math.sin(p.angle);
            break;
        case 'snow':
            p.y += p.speed;
            p.phase += 0.03;
            p.x += Math.sin(p.phase) * 0.6 + p.vx;
            break;
        case 'fog':
            p.x += p.speed;
            break;
        case 'wind':
            p.x += p.speed;
            break;
        case 'sakura':
            p.y += p.speed;
            p.x += p.vx;
            p.rot += p.rotSpeed;
            break;
    }
}

function _offScreen(type, p, W, H) {
    if (type === 'fog' || type === 'wind') return p.x > W + 100;
    return p.y > H + 20;
}

/* ════════════════════════════════
   屏幕调整 — 完整版
════════════════════════════════ */

/* ── 亮度 / 缩放 / 间距（合并保存） ── */
function previewScale(val) {
    document.getElementById('scaleVal').textContent = val + '%';
    applyScaleToPage(val, false);
}
function previewBrightness(val) {
    document.getElementById('brightnessVal').textContent = val + '%';
    applyBrightnessToPage(val, false);
}
function previewGridGap(val) {
    document.getElementById('gridGapVal').textContent = val + 'px';
    applyGridGapToPage(val, false);
}

function applyDisplaySettings() {
    const scale = document.getElementById('scaleRange').value;
    const brightness = document.getElementById('brightnessRange').value;
    const gap = document.getElementById('gridGapRange').value;
    applyScaleToPage(scale, true);
    applyBrightnessToPage(brightness, true);
    applyGridGapToPage(gap, true);
    saToast('显示设置已保存');
}

function applyScaleToPage(val, save) {
    const screen = document.getElementById('homeScreen');
    if (screen) screen.style.zoom = (val / 100);
    if (save) SettingStore.set('scale', parseInt(val));
}

function applyBrightnessToPage(val, save) {
    _rebuildScreenFilter();
    if (save) SettingStore.set('brightness', parseInt(val));
}

function applyGridGapToPage(val, save) {
    const grid = document.getElementById('appsGrid');
    if (grid) grid.style.gap = `${val}px ${Math.max(4, val - 8)}px`;
    if (save) SettingStore.set('gridGap', parseInt(val));
}

/* ── 色调滤镜 ── */
const FILTER_PRESETS = {
    none: '',
    retro: 'sepia(0.45) contrast(1.05) brightness(0.97)',
    dopamine: 'saturate(1.8) brightness(1.05) hue-rotate(10deg)',
    cream: 'sepia(0.2) brightness(1.04) saturate(0.85)',
    cool: 'hue-rotate(20deg) saturate(1.1) brightness(0.98)',
    warm: 'sepia(0.15) hue-rotate(-15deg) saturate(1.2) brightness(1.02)',
    ink: 'grayscale(0.6) contrast(1.15) brightness(0.95)',
    sakura: 'hue-rotate(-20deg) saturate(1.3) brightness(1.06)'
};

function selectFilter(filter) {
    _setActive(null, '.sc-filter-item', `[data-filter="${filter}"]`);
    applyFilterToPage(filter, true);
    saToast('滤镜已应用');
}

function applyFilterToPage(filter, save) {
    SettingStore.set('_tmpFilter', filter); // 临时写入供 _rebuildScreenFilter 读取
    _rebuildScreenFilter();
    if (save) SettingStore.set('screenFilter', filter);
}

/* 统一重建 filter（亮度 + 色调 + 护眼叠加） */
function _rebuildScreenFilter() {
    const screen = document.getElementById('phoneScreen');
    if (!screen) return;

    const brightness = SettingStore.get('brightness', 100);
    const filter = SettingStore.get('_tmpFilter', null) || SettingStore.get('screenFilter', 'none');
    const eyeCare = SettingStore.get('eyeCare', false);
    const nightMode = SettingStore.get('nightMode', false);

    let parts = [];
    if (brightness !== 100) parts.push(`brightness(${brightness / 100})`);
    if (filter && filter !== 'none' && FILTER_PRESETS[filter]) parts.push(FILTER_PRESETS[filter]);
    if (eyeCare) parts.push('sepia(0.25) brightness(0.96) saturate(0.9)');
    if (nightMode) parts.push('brightness(0.55) saturate(0.7)');

    screen.style.filter = parts.join(' ') || 'none';
}

/* ── 夜间 & 护眼 ── */
function toggleNightMode(on) {
    SettingStore.set('nightMode', on);
    applyNightMode(on, true);
}

function applyNightMode(on, save) {
    const screen = document.getElementById('phoneScreen');
    if (!screen) return;
    if (on) {
        screen.classList.add('night-mode');
    } else {
        screen.classList.remove('night-mode');
    }
    _rebuildScreenFilter();
    if (save) SettingStore.set('nightMode', on);
}

function toggleEyeCare(on) {
    SettingStore.set('eyeCare', on);
    applyEyeCare(on, true);
}

function applyEyeCare(on, save) {
    _rebuildScreenFilter();
    if (save) SettingStore.set('eyeCare', on);
}

/* ── 状态栏 & 灵动岛 ── */
function toggleStatusBar(hide) {
    const el = document.getElementById('phoneScreen') &&
        document.querySelector('.status-bar');
    if (el) el.style.display = hide ? 'none' : '';
    SettingStore.set('hideStatusBar', hide);
}

function toggleDynamicIsland(hide) {
    const el = document.querySelector('.dynamic-island');
    if (el) el.style.display = hide ? 'none' : '';
    SettingStore.set('hideDynamicIsland', hide);
}

/* ── 屏幕位置 ── */
let _screenPos = { x: 0, y: 0 };

function nudgeScreen(dir) {
    const step = parseInt(document.getElementById('nudgeStepRange')?.value || 4);
    if (dir === 'up') _screenPos.y -= step;
    if (dir === 'down') _screenPos.y += step;
    if (dir === 'left') _screenPos.x -= step;
    if (dir === 'right') _screenPos.x += step;
    _applyScreenPos(_screenPos, true);
}

function resetScreenPosition() {
    _screenPos = { x: 0, y: 0 };
    _applyScreenPos(_screenPos, true);
    saToast('位置已重置');
}

function _applyScreenPos(pos, save) {
    _screenPos = { ...pos };
    const shell = document.getElementById('phoneShell');
    if (shell) shell.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
    const info = document.getElementById('screenPosInfo');
    if (info) info.textContent = `偏移：X ${pos.x >= 0 ? '+' : ''}${pos.x}px  Y ${pos.y >= 0 ? '+' : ''}${pos.y}px`;
    if (save) SettingStore.set('screenPos', { x: pos.x, y: pos.y });
}

/* ── 顶部小组件切换 ── */
function selectTopWidget(type) {
    _setActive(null, '.sc-widget-opt', `[data-widget="${type}"]`);
    applyTopWidget(type, true);
    saToast(type === 'clock' ? '已切换为时钟小组件' : '已切换为个人信息卡');
}

function applyTopWidget(type, save) {
    const infoWidget = document.getElementById('topWidget');
    const clockWidget = document.getElementById('clockWidget');
    if (type === 'clock') {
        if (infoWidget) infoWidget.classList.add('hidden');
        if (clockWidget) { clockWidget.classList.remove('hidden'); _startClockWidget(); }
    } else {
        if (infoWidget) infoWidget.classList.remove('hidden');
        if (clockWidget) clockWidget.classList.add('hidden');
    }
    if (save) SettingStore.set('topWidget', type);
}

/* ── 时钟小组件逻辑 ── */
let _clockTimer = null;
let _weatherCache = null;

function _startClockWidget() {
    _updateClockWidget();
    if (_clockTimer) clearInterval(_clockTimer);
    _clockTimer = setInterval(_updateClockWidget, 10000);
    _fetchWeather();
}

function _updateClockWidget() {
    const tz = SettingStore.get('timezone', 'local');
    const cwTime = document.getElementById('cwTime');
    const cwDate = document.getElementById('cwDate');

    if (!cwTime) return;

    const now = new Date();
    let timeStr, dateStr;

    if (tz === 'local') {
        timeStr = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
        dateStr = now.toLocaleDateString('zh-CN', { weekday: 'short', month: 'long', day: 'numeric' });
    } else {
        timeStr = new Intl.DateTimeFormat('zh-CN', {
            hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz
        }).format(now);
        dateStr = new Intl.DateTimeFormat('zh-CN', {
            weekday: 'short', month: 'long', day: 'numeric', timeZone: tz
        }).format(now);
    }

    cwTime.textContent = timeStr;
    cwDate.textContent = dateStr;

    /* 地理位置（只获取一次） */
    _getLocationName();
}

let _locationFetched = false;
function _getLocationName() {
    if (_locationFetched) return;
    _locationFetched = true;
    if (!navigator.geolocation) {
        _setTextContent('cwLocationText', '未知位置');
        return;
    }
    navigator.geolocation.getCurrentPosition(
        pos => {
            const { latitude, longitude } = pos.coords;
            /* 使用 BigDataCloud 免费逆地理编码 */
            fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=zh`)
                .then(r => r.json())
                .then(d => {
                    const city = d.city || d.locality || d.countryName || '未知';
                    _setTextContent('cwLocationText', city);
                })
                .catch(() => _setTextContent('cwLocationText', '位置未知'));
        },
        () => _setTextContent('cwLocationText', '未授权定位')
    );
}

async function _fetchWeather() {
    const city = SettingStore.get('weatherCity', '');
    const apiKey = SettingStore.get('weatherApiKey', '');
    if (!city || !apiKey) {
        _setTextContent('cwWeatherText', '— °C');
        return;
    }
    try {
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric&lang=zh_cn`;
        const res = await fetch(url);
        if (!res.ok) throw new Error();
        const data = await res.json();
        const temp = Math.round(data.main.temp);
        const desc = data.weather?.[0]?.description || '';
        _setTextContent('cwWeatherText', `${temp}°C ${desc}`);
    } catch {
        _setTextContent('cwWeatherText', '天气获取失败');
    }
}

function saveClockWidgetConfig() {
    const tz = document.querySelector('#tzGrid .sc-tz-item.active')?.dataset.tz || 'local';
    const city = document.getElementById('weatherCity')?.value.trim() || '';
    const apiKey = document.getElementById('weatherApiKey')?.value.trim() || '';
    SettingStore.set('timezone', tz);
    SettingStore.set('weatherCity', city);
    SettingStore.set('weatherApiKey', apiKey);
    _weatherCache = null;
    _locationFetched = false;
    _updateClockWidget();
    _fetchWeather();
    saToast('时钟配置已保存');
}

/* ── 时区面板实时显示 ── */
const TZ_IDS = ['local', 'America/New_York', 'America/Los_Angeles', 'Asia/Tokyo',
    'Asia/Seoul', 'Europe/London', 'Europe/Paris', 'Asia/Shanghai',
    'Asia/Singapore', 'Australia/Sydney'];
let _tzTimer = null;

function _updateTzTimes() {
    const now = new Date();
    TZ_IDS.forEach(tz => {
        const el = document.getElementById(`tz-${tz}`);
        if (!el) return;
        try {
            el.textContent = tz === 'local'
                ? now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
                : new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz }).format(now);
        } catch { el.textContent = '--:--'; }
    });
}

function _startTzTimer() {
    if (_tzTimer) return;
    _tzTimer = setInterval(_updateTzTimes, 10000);
}

function selectTimezone(tz) {
    _setActive('tzGrid', '.sc-tz-item', `[data-tz="${tz}"]`);
    SettingStore.set('timezone', tz);
    _updateClockWidget();
}

/* ════════════════════════════════
   应用图标 — 完整版
════════════════════════════════ */

/* ── 9个图标的元数据 ── */
const IC_APPS = [
    {
        id: 'voice', name: '心声', sel: '[onclick="openApp(\'voice\')"]',
        defaultSvg: '<path d="M16 4a5 5 0 015 5v7a5 5 0 01-10 0V9a5 5 0 015-5z"/><path d="M7 18a9 9 0 0018 0"/><line x1="16" y1="27" x2="16" y2="30"/><line x1="12" y1="30" x2="20" y2="30"/>',
        lineSvgs: {
            default: '<path d="M16 4a5 5 0 015 5v7a5 5 0 01-10 0V9a5 5 0 015-5z"/><path d="M7 18a9 9 0 0018 0"/><line x1="16" y1="27" x2="16" y2="30"/><line x1="12" y1="30" x2="20" y2="30"/>',
            heart: '<path d="M16 24s-8-5.5-8-11a8 8 0 0116 0c0 5.5-8 11-8 11z"/>',
            wave: '<path d="M4 16 Q8 10 12 16 Q16 22 20 16 Q24 10 28 16"/><line x1="16" y1="22" x2="16" y2="28"/><line x1="12" y1="28" x2="20" y2="28"/>',
            star: '<polygon points="16,4 18.5,12 27,12 20,17.5 22.5,26 16,21 9.5,26 12,17.5 5,12 13.5,12"/>',
            music: '<path d="M12 26V12l14-3v14"/><circle cx="9" cy="26" r="3"/><circle cx="23" cy="23" r="3"/>'
        }
    },
    {
        id: 'forum', name: '论坛', sel: '[onclick="openApp(\'forum\')"]',
        defaultSvg: '<rect x="4" y="4" width="24" height="18" rx="2"/><line x1="8" y1="11" x2="24" y2="11"/><line x1="8" y1="15" x2="20" y2="15"/><line x1="8" y1="19" x2="17" y2="19"/>',
        lineSvgs: {
            default: '<rect x="4" y="4" width="24" height="18" rx="2"/><line x1="8" y1="11" x2="24" y2="11"/><line x1="8" y1="15" x2="20" y2="15"/><line x1="8" y1="19" x2="17" y2="19"/>',
            bubble: '<path d="M4 6h24v16a2 2 0 01-2 2H8l-4 4V8a2 2 0 012-2z"/><circle cx="11" cy="15" r="1.5" fill="currentColor" stroke="none"/><circle cx="16" cy="15" r="1.5" fill="currentColor" stroke="none"/><circle cx="21" cy="15" r="1.5" fill="currentColor" stroke="none"/>',
            quote: '<path d="M8 8h5l-3 8H7zm9 0h5l-3 8h-3z"/>',
            pin: '<path d="M12 2a4 4 0 014 4c0 3-4 8-4 8S8 9 8 6a4 4 0 014-4z"/><circle cx="12" cy="6" r="1.5"/><path d="M8 28l4-10 4 10"/>'
        }
    },
    {
        id: 'diary', name: '小芽日记', sel: '[onclick="openApp(\'diary\')"]',
        defaultSvg: '<rect x="5" y="3" width="18" height="26" rx="2"/><path d="M5 3h3a2 2 0 012 2v22a2 2 0 01-2 2H5" stroke-width="1.4"/><line x1="13" y1="10" x2="20" y2="10"/><line x1="13" y1="15" x2="20" y2="15"/><line x1="13" y1="20" x2="18" y2="20"/>',
        lineSvgs: {
            default: '<rect x="5" y="3" width="18" height="26" rx="2"/><path d="M5 3h3a2 2 0 012 2v22a2 2 0 01-2 2H5" stroke-width="1.4"/><line x1="13" y1="10" x2="20" y2="10"/><line x1="13" y1="15" x2="20" y2="15"/><line x1="13" y1="20" x2="18" y2="20"/>',
            flower: '<circle cx="16" cy="16" r="4"/><circle cx="16" cy="8" r="3"/><circle cx="16" cy="24" r="3"/><circle cx="8" cy="16" r="3"/><circle cx="24" cy="16" r="3"/>',
            leaf: '<path d="M16 28C16 28 6 22 6 13a10 10 0 0120 0c0 9-10 15-10 15z"/><line x1="16" y1="28" x2="16" y2="18"/>',
            pen: '<path d="M17 5l6 6-12 12H5v-6L17 5z"/><line x1="14" y1="8" x2="20" y2="14"/>'
        }
    },
    {
        id: 'street', name: '街の声', sel: '[onclick="openApp(\'street\')"]',
        defaultSvg: '<path d="M16 6a5 5 0 015 5c0 4-5 10-5 10S11 15 11 11a5 5 0 015-5z"/><circle cx="16" cy="11" r="2" fill="currentColor" stroke="none"/><path d="M6 28l3-8h14l3 8"/>',
        lineSvgs: {
            default: '<path d="M16 6a5 5 0 015 5c0 4-5 10-5 10S11 15 11 11a5 5 0 015-5z"/><circle cx="16" cy="11" r="2" fill="currentColor" stroke="none"/><path d="M6 28l3-8h14l3 8"/>',
            compass: '<circle cx="16" cy="16" r="10"/><polygon points="16,8 18,14 16,16 14,14"/><polygon points="16,24 14,18 16,16 18,18"/>',
            flag: '<line x1="8" y1="4" x2="8" y2="28"/><path d="M8 4l16 6-16 6"/>',
            map: '<path d="M4 6l8 3 8-3 8 3v20l-8-3-8 3-8-3V6z"/><line x1="12" y1="9" x2="12" y2="26"/><line x1="20" y1="6" x2="20" y2="23"/>'
        }
    },
    {
        id: 'candy', name: '糖果铺', sel: '[onclick="openApp(\'candy\')"]',
        defaultSvg: '<circle cx="16" cy="16" r="7"/><path d="M9 9l-4-4M23 9l4-4M9 23l-4 4M23 23l4 4"/><circle cx="16" cy="16" r="2.5" fill="currentColor" stroke="none"/>',
        lineSvgs: {
            default: '<circle cx="16" cy="16" r="7"/><path d="M9 9l-4-4M23 9l4-4M9 23l-4 4M23 23l4 4"/><circle cx="16" cy="16" r="2.5" fill="currentColor" stroke="none"/>',
            candy: '<path d="M10 22C10 22 8 14 16 14S22 22 22 22"/><path d="M12 10c0-2.2 1.8-4 4-4s4 1.8 4 4-1.8 3-4 3-4-.8-4-3z"/><path d="M10 22l2 5M22 22l-2 5"/>',
            star4: '<polygon points="16,4 18,14 28,16 18,18 16,28 14,18 4,16 14,14"/>',
            gem: '<polygon points="16,3 26,10 23,24 9,24 6,10"/><line x1="6" y1="10" x2="26" y2="10"/>'
        }
    },
    {
        id: 'music', name: '音乐', sel: '[onclick="openApp(\'music\')"]',
        defaultSvg: '<path d="M12 26V12l14-3v14"/><circle cx="9" cy="26" r="3"/><circle cx="23" cy="23" r="3"/>',
        lineSvgs: {
            default: '<path d="M12 26V12l14-3v14"/><circle cx="9" cy="26" r="3"/><circle cx="23" cy="23" r="3"/>',
            note: '<path d="M12 20V8l12-2v12"/><circle cx="9" cy="20" r="3"/><circle cx="21" cy="18" r="3"/><path d="M18 8l-4 4h-2"/>',
            wave: '<path d="M4 16 Q8 8 12 16 Q16 24 20 16 Q24 8 28 16"/><circle cx="7" cy="25" r="2.5"/><circle cx="25" cy="25" r="2.5"/>',
            headphone: '<path d="M6 16a10 10 0 0120 0"/><rect x="3" y="15" width="5" height="8" rx="2"/><rect x="20" y="15" width="5" height="8" rx="2"/>'
        }
    },
    {
        id: 'chat', name: '聊天', sel: '[onclick="openApp(\'chat\')"]',
        defaultSvg: '<path d="M4 6h24v16a2 2 0 01-2 2H8l-4 4V8a2 2 0 012-2z"/><circle cx="11" cy="14" r="1.5" fill="currentColor" stroke="none"/><circle cx="16" cy="14" r="1.5" fill="currentColor" stroke="none"/><circle cx="21" cy="14" r="1.5" fill="currentColor" stroke="none"/>',
        lineSvgs: {
            default: '<path d="M4 6h24v16a2 2 0 01-2 2H8l-4 4V8a2 2 0 012-2z"/><circle cx="11" cy="14" r="1.5" fill="currentColor" stroke="none"/><circle cx="16" cy="14" r="1.5" fill="currentColor" stroke="none"/><circle cx="21" cy="14" r="1.5" fill="currentColor" stroke="none"/>',
            heart: '<path d="M4 6h24v14H8l-4 4V8a2 2 0 012-2z"/><path d="M16 18s-4-3-4-6a4 4 0 018 0c0 3-4 6-4 6z"/>',
            love: '<path d="M16 26s-10-7-10-14a10 10 0 0120 0c0 7-10 14-10 14z"/>',
            phone: '<path d="M6 4l4 2-2 4 3 3 4-2 2 4-5 3C8 17 5 11 6 4z"/><path d="M18 4a10 10 0 018 8"/><path d="M18 9a5 5 0 014 4"/>'
        }
    },
    {
        id: 'worldbook', name: '世界书', sel: '[onclick="openApp(\'worldbook\')"]',
        defaultSvg: '<circle cx="16" cy="16" r="11"/><path d="M5 16h22M16 5c-3 3-5 7-5 11s2 8 5 11M16 5c3 3 5 7 5 11s-2 8-5 11"/>',
        lineSvgs: {
            default: '<circle cx="16" cy="16" r="11"/><path d="M5 16h22M16 5c-3 3-5 7-5 11s2 8 5 11M16 5c3 3 5 7 5 11s-2 8-5 11"/>',
            book: '<rect x="5" y="4" width="20" height="24" rx="2"/><path d="M5 4h3a2 2 0 012 2v20a2 2 0 01-2 2H5"/><line x1="13" y1="10" x2="21" y2="10"/><line x1="13" y1="15" x2="21" y2="15"/>',
            compass2: '<circle cx="16" cy="16" r="11"/><circle cx="16" cy="16" r="3"/><line x1="16" y1="5" x2="16" y2="13"/><line x1="16" y1="19" x2="16" y2="27"/>',
            planet: '<circle cx="16" cy="16" r="8"/><ellipse cx="16" cy="16" rx="14" ry="5"/>'
        }
    },
    {
        id: 'settings', name: '设置', sel: '[onclick="openApp(\'settings\')"]',
        defaultSvg: '<circle cx="16" cy="16" r="3.5"/><path d="M16 4v3M16 25v3M4 16h3M25 16h3M7.5 7.5l2.1 2.1M22.4 22.4l2.1 2.1M7.5 24.5l2.1-2.1M22.4 9.6l2.1-2.1"/>',
        lineSvgs: {
            default: '<circle cx="16" cy="16" r="3.5"/><path d="M16 4v3M16 25v3M4 16h3M25 16h3M7.5 7.5l2.1 2.1M22.4 22.4l2.1 2.1M7.5 24.5l2.1-2.1M22.4 9.6l2.1-2.1"/>',
            gear: '<circle cx="16" cy="16" r="4"/><path d="M16 6a10 10 0 0110 10h-2a8 8 0 00-8-8V6zM26 16a10 10 0 01-10 10v-2a8 8 0 008-8h2zM6 16a10 10 0 0110-10v2a8 8 0 00-8 8H6zM16 26a10 10 0 01-10-10h2a8 8 0 008 8v2z"/>',
            diamond: '<rect x="8" y="8" width="16" height="16" rx="2" transform="rotate(45 16 16)"/><circle cx="16" cy="16" r="3"/>'
        }
    }
];

/* ── 整体风格（含背景+形状一键应用） ── */
const IC_STYLE_CONFIGS = {
    default: { bg: 'rgba(255,255,255,0.7)', border: '1px solid rgba(220,220,218,0.5)', borderRadius: '50%', svgColor: '#444', strokeW: '1.4', fill: 'none' },
    glass: { bg: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.5)', borderRadius: '50%', svgColor: '#3a3a3a', strokeW: '1.4', fill: 'none', backdrop: 'blur(8px)' },
    transparent: { bg: 'transparent', border: 'none', borderRadius: '50%', svgColor: '#fff', strokeW: '1.4', fill: 'none' },
    ins: { bg: 'linear-gradient(135deg,rgba(255,220,230,0.6),rgba(220,200,255,0.6))', border: '1px solid rgba(255,200,220,0.4)', borderRadius: '28%', svgColor: '#c06090', strokeW: '1.4', fill: 'none' },
    korean: { bg: 'rgba(245,240,255,0.8)', border: '1px solid rgba(220,210,240,0.5)', borderRadius: '40%', svgColor: '#9070c0', strokeW: '1.4', fill: 'none' },
    ios: { bg: 'rgba(240,240,255,0.85)', border: '1px solid rgba(200,210,240,0.4)', borderRadius: '25%', svgColor: '#4060c0', strokeW: '1.4', fill: 'none' },
    filled: { bg: 'rgba(255,255,255,0.75)', border: '1px solid rgba(220,220,218,0.5)', borderRadius: '50%', svgColor: '#2a2a2a', strokeW: '0', fill: 'currentColor' },
    dark: { bg: 'rgba(30,30,30,0.85)', border: '1px solid rgba(60,60,60,0.4)', borderRadius: '50%', svgColor: '#f0f0ee', strokeW: '1.4', fill: 'none' }
};

const IC_SHAPE_RADIUS = {
    circle: '50%',
    squircle: '25%',
    round: '38%',
    'squircle-sm': '12%',
    diamond: '0%'
};

/* 当前图标自定义图片（IDB） */
const IC_IMG_IDB_PREFIX = 'ic_img_';
const IC_GALLERY_KEY = 'xxj_set_icGallery';
const IC_GALLERY_IDB_PREFIX = 'icgallery_';
const IC_GALLERY_MAX = 30;

/* ── 整体风格选择 ── */
function selectIconStyle(style) {
    _setActive('iconStyleList', '.ic-style-item', `[data-style="${style}"]`);
    applyIconStyleToPage(style, true);
    saToast('图标风格已应用');
}

function applyIconStyleToPage(style, save) {
    const cfg = IC_STYLE_CONFIGS[style] || IC_STYLE_CONFIGS.default;
    const icons = document.querySelectorAll('.app-icon, .dock-icon');
    icons.forEach(icon => {
        icon.dataset.iconStyle = style;
        if (style === 'glass') {
            icon.classList.add('glass-icon');
            icon.style.cssText = '';
        } else {
            icon.classList.remove('glass-icon');
            icon.style.background = cfg.bg;
            icon.style.border = cfg.border;
            icon.style.borderRadius = cfg.borderRadius;
            if (cfg.backdrop) icon.style.backdropFilter = cfg.backdrop;
            else icon.style.backdropFilter = '';
        }
        icon.querySelectorAll('svg').forEach(svg => {
            svg.style.color = cfg.svgColor;
            if (cfg.fill === 'currentColor') {
                svg.setAttribute('fill', 'currentColor');
                svg.setAttribute('stroke', 'none');
                svg.setAttribute('stroke-width', '0');
            } else {
                svg.setAttribute('fill', 'none');
                svg.setAttribute('stroke', 'currentColor');
                svg.setAttribute('stroke-width', cfg.strokeW);
            }
        });
    });
    if (save) SettingStore.set('iconStyle', style);
}

/* ── 图标背景（仅背景色/质感） ── */
function selectIconBg(bg) {
    _setActive(null, '.ic-bg-item', `[data-bg="${bg}"]`);
    applyIconBgToPage(bg, true);
}

function applyIconBgToPage(bg, save) {
    const bgMap = {
        glass: { cls: 'glass-icon', bg: '', color: '' },
        white: { cls: '', bg: 'rgba(255,255,255,0.92)', color: '' },
        dark: { cls: '', bg: 'rgba(30,30,30,0.88)', color: '#f0f0ee' },
        cream: { cls: '', bg: 'rgba(255,248,235,0.88)', color: '#7a5a3a' },
        none: { cls: '', bg: 'transparent', color: '' }
    };
    const cfg = bgMap[bg] || bgMap.glass;
    document.querySelectorAll('.app-icon, .dock-icon').forEach(icon => {
        if (bg === 'glass') {
            icon.classList.add('glass-icon');
            icon.style.background = '';
            icon.style.border = '';
        } else {
            icon.classList.remove('glass-icon');
            icon.style.background = cfg.bg;
            icon.style.border = bg === 'none' ? 'none' : '1px solid rgba(200,200,198,0.3)';
        }
        if (cfg.color) icon.querySelectorAll('svg').forEach(s => s.style.color = cfg.color);
        else icon.querySelectorAll('svg').forEach(s => s.style.color = '');
    });
    if (save) SettingStore.set('iconBg', bg);
}

/* ── 图标形状 ── */
function selectIconShape(shape) {
    _setActive('iconShapeList', '.ic-shape-item', `[data-shape="${shape}"]`);
    applyIconShapeToPage(shape, true);
    saToast('形状已应用');
}

function applyIconShapeToPage(shape, save) {
    const radius = IC_SHAPE_RADIUS[shape] || '50%';
    /* 菱形：用 clip-path */
    const clipPath = shape === 'diamond' ? 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' : 'none';
    document.querySelectorAll('.app-icon, .dock-icon').forEach(icon => {
        icon.style.borderRadius = shape === 'diamond' ? '0' : radius;
        icon.style.clipPath = clipPath;
    });
    if (save) SettingStore.set('iconShape', shape);
}

/* ── 应用名称字体颜色 ── */
function selectIconLabelColor(color) {
    _setActive(null, '.ic-label-chip', `[data-color="${color}"]`);
    applyIconLabelColor(color, true);
    /* 预览 */
    const preview = document.getElementById('icLabelPreviewText');
    if (preview) preview.style.color = color;
}

function applyIconLabelColor(color, save) {
    document.querySelectorAll('.app-name, .dock-name').forEach(el => {
        el.style.color = color;
    });
    if (save) SettingStore.set('iconLabelColor', color);
}

/* ── 线条样式更改 ── */
function renderIconLinePanel() {
    const container = document.getElementById('icLineAppList');
    if (!container) return;
    container.innerHTML = '';
    IC_APPS.forEach(app => {
        const saved = SettingStore.get(`iconLine_${app.id}`, 'default');
        const wrap = document.createElement('div');
        wrap.className = 'ic-line-app-row';
        wrap.innerHTML = `
            <div class="ic-line-app-name">${app.name}</div>
            <div class="ic-line-opts" data-appid="${app.id}">
                ${Object.keys(app.lineSvgs).map(key => `
                    <div class="ic-line-opt ${saved === key ? 'active' : ''}" data-key="${key}"
                         onclick="applyIconLine('${app.id}','${key}')">
                        <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.4">
                            ${app.lineSvgs[key]}
                        </svg>
                        <span>${key === 'default' ? '默认' : key}</span>
                    </div>
                `).join('')}
            </div>
        `;
        container.appendChild(wrap);
    });
}

function applyIconLine(appId, lineKey) {
    const app = IC_APPS.find(a => a.id === appId);
    if (!app) return;
    const svgContent = app.lineSvgs[lineKey] || app.lineSvgs.default;
    /* 找到对应图标 DOM */
    const iconEls = document.querySelectorAll(`.app-icon${app.sel}, .dock-icon${app.sel}`);
    /* 更通用：通过父级 app-item 的 onclick 匹配 */
    document.querySelectorAll('.app-item, .dock-item').forEach(item => {
        if (item.getAttribute('onclick') === `openApp('${appId}')`) {
            const svg = item.querySelector('.app-icon svg, .dock-icon svg');
            if (svg) svg.innerHTML = svgContent;
        }
    });
    /* 更新 active 状态 */
    const opts = document.querySelectorAll(`[data-appid="${appId}"] .ic-line-opt`);
    opts.forEach(o => o.classList.toggle('active', o.dataset.key === lineKey));
    SettingStore.set(`iconLine_${appId}`, lineKey);
    saToast(`${app.name} 线条已更新`);
}

function restoreIconLines() {
    IC_APPS.forEach(app => {
        const saved = SettingStore.get(`iconLine_${app.id}`, 'default');
        if (saved !== 'default') applyIconLine(app.id, saved);
    });
}

/* ── 单个图标自定义图片 ── */
function renderIconCustomList() {
    const container = document.getElementById('icCustomList');
    if (!container) return;
    container.innerHTML = '';
    IC_APPS.forEach(app => {
        const row = document.createElement('div');
        row.className = 'ic-custom-row';
        row.innerHTML = `
            <div class="ic-custom-icon-wrap" id="icCustomWrap_${app.id}">
                <div class="ic-custom-icon-default">
                    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.4">${app.defaultSvg}</svg>
                </div>
                <img class="ic-custom-icon-img hidden" id="icCustomImg_${app.id}" alt="" />
            </div>
            <div class="ic-custom-info">
                <div class="ic-custom-app-name">${app.name}</div>
                <div class="ic-custom-btns">
                    <button class="ic-custom-btn" onclick="triggerIconImgUpload('${app.id}')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                            <polyline points="17 8 12 3 7 8"/>
                            <line x1="12" y1="3" x2="12" y2="15"/>
                        </svg>
                        上传
                    </button>
                    <button class="ic-custom-btn ic-custom-reset" onclick="resetIconImg('${app.id}')">恢复默认</button>
                </div>
            </div>
        `;
        container.appendChild(row);

        /* 加载已保存图片 */
        if (typeof ImgDB !== 'undefined') {
            ImgDB.get(IC_IMG_IDB_PREFIX + app.id).then(dataUrl => {
                if (dataUrl) _applyCustomIconImg(app.id, dataUrl);
            }).catch(() => { });
        }
    });
}

function triggerIconImgUpload(appId) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const dataUrl = ev.target.result;
            _applyCustomIconImg(appId, dataUrl);
            /* 同时更新主屏幕图标 */
            _applyIconImgToScreen(appId, dataUrl);
            if (typeof ImgDB !== 'undefined') {
                ImgDB.set(IC_IMG_IDB_PREFIX + appId, dataUrl).catch(() => { });
            }
            /* 加入图库 */
            _addToIconGalleryItem(dataUrl, `${appId}_icon`);
            saToast(`${IC_APPS.find(a => a.id === appId)?.name} 图标已更新`);
        };
        reader.readAsDataURL(file);
    };
    input.click();
}

function _applyCustomIconImg(appId, dataUrl) {
    const img = document.getElementById(`icCustomImg_${appId}`);
    const def = document.querySelector(`#icCustomWrap_${appId} .ic-custom-icon-default`);
    if (img) { img.src = dataUrl; img.classList.remove('hidden'); }
    if (def) def.classList.add('hidden');
}

function _applyIconImgToScreen(appId, dataUrl) {
    document.querySelectorAll('.app-item, .dock-item').forEach(item => {
        if (item.getAttribute('onclick') === `openApp('${appId}')`) {
            const iconDiv = item.querySelector('.app-icon, .dock-icon');
            if (!iconDiv) return;
            /* 替换 SVG 为 img */
            iconDiv.innerHTML = `<img src="${dataUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;" alt="" />`;
        }
    });
}

function resetIconImg(appId) {
    const app = IC_APPS.find(a => a.id === appId);
    if (!app) return;
    /* 恢复主屏幕图标SVG */
    document.querySelectorAll('.app-item, .dock-item').forEach(item => {
        if (item.getAttribute('onclick') === `openApp('${appId}')`) {
            const iconDiv = item.querySelector('.app-icon, .dock-icon');
            if (!iconDiv) return;
            const isGlass = iconDiv.classList.contains('glass-icon');
            iconDiv.innerHTML = `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.4">${app.defaultSvg}</svg>`;
        }
    });
    /* 更新面板 */
    const img = document.getElementById(`icCustomImg_${appId}`);
    const def = document.querySelector(`#icCustomWrap_${appId} .ic-custom-icon-default`);
    if (img) { img.src = ''; img.classList.add('hidden'); }
    if (def) def.classList.remove('hidden');
    if (typeof ImgDB !== 'undefined') ImgDB.remove(IC_IMG_IDB_PREFIX + appId).catch(() => { });
    saToast('已恢复默认图标');
}

function restoreCustomIconImgs() {
    if (typeof ImgDB === 'undefined') return;
    IC_APPS.forEach(app => {
        ImgDB.get(IC_IMG_IDB_PREFIX + app.id).then(dataUrl => {
            if (dataUrl) _applyIconImgToScreen(app.id, dataUrl);
        }).catch(() => { });
    });
}

/* ── 图标图库 ── */
function addToIconGallery(event) {
    const files = Array.from(event.target.files);
    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = e => _addToIconGalleryItem(e.target.result, file.name);
        reader.readAsDataURL(file);
    });
    event.target.value = '';
}

function _addToIconGalleryItem(dataUrl, name) {
    const meta = JSON.parse(localStorage.getItem(IC_GALLERY_KEY) || '[]');
    if (meta.find(m => m.preview === dataUrl.slice(0, 64))) return;
    const id = 'icg_' + Date.now().toString(36);
    meta.unshift({ id, name: name || id, preview: dataUrl.slice(0, 64), ts: Date.now() });
    if (meta.length > IC_GALLERY_MAX) {
        meta.splice(IC_GALLERY_MAX).forEach(m => {
            if (typeof ImgDB !== 'undefined') ImgDB.remove(IC_GALLERY_IDB_PREFIX + m.id).catch(() => { });
        });
    }
    localStorage.setItem(IC_GALLERY_KEY, JSON.stringify(meta));
    if (typeof ImgDB !== 'undefined') ImgDB.set(IC_GALLERY_IDB_PREFIX + id, dataUrl).catch(() => { });
    renderIconGallery();
}

function renderIconGallery() {
    const meta = JSON.parse(localStorage.getItem(IC_GALLERY_KEY) || '[]');
    const grid = document.getElementById('icGalleryGrid');
    const badge = document.getElementById('icGalleryBadge');
    const empty = document.getElementById('icGalleryEmpty');
    if (!grid) return;
    if (badge) badge.textContent = meta.length;
    if (!meta.length) { if (empty) empty.style.display = ''; return; }
    if (empty) empty.style.display = 'none';
    Array.from(grid.children).forEach(c => { if (c.id !== 'icGalleryEmpty') c.remove(); });

    meta.forEach(m => {
        const idbKey = IC_GALLERY_IDB_PREFIX + m.id;
        const item = document.createElement('div');
        item.className = 'ic-gallery-item';
        item.innerHTML = `
            <img class="ic-gallery-img" alt="" />
            <button class="ic-gallery-del" onclick="deleteIconGalleryItem(event,'${m.id}')" title="删除">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
        `;
        if (typeof ImgDB !== 'undefined') {
            ImgDB.get(idbKey).then(dataUrl => {
                if (dataUrl) item.querySelector('.ic-gallery-img').src = dataUrl;
            }).catch(() => { });
        }
        /* 点击弹出目标选择 */
        item.querySelector('.ic-gallery-img').addEventListener('click', () => {
            _showIconTargetPicker(m.id, idbKey);
        });
        grid.appendChild(item);
    });
}

function _showIconTargetPicker(galleryId, idbKey) {
    /* 简单弹层：选择要替换哪个APP的图标 */
    const existing = document.getElementById('icTargetPicker');
    if (existing) existing.remove();

    const picker = document.createElement('div');
    picker.id = 'icTargetPicker';
    picker.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:flex-end;background:rgba(0,0,0,0.4);backdrop-filter:blur(4px);';
    picker.innerHTML = `
        <div style="background:#f2f2f0;border-radius:20px 20px 0 0;width:100%;padding:20px 16px 36px;max-height:60vh;overflow-y:auto;">
            <div style="font-size:13px;color:#888;text-align:center;margin-bottom:14px;letter-spacing:0.3px;">选择要替换的图标</div>
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;">
                ${IC_APPS.map(app => `
                    <div onclick="applyGalleryImgToIcon('${galleryId}','${idbKey}','${app.id}')"
                         style="display:flex;flex-direction:column;align-items:center;gap:5px;cursor:pointer;padding:8px;border-radius:12px;background:rgba(240,240,238,0.8);border:1.5px solid rgba(210,210,208,0.4);">
                        <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.4" style="width:28px;height:28px">${app.defaultSvg}</svg>
                        <span style="font-size:10px;color:#666">${app.name}</span>
                    </div>
                `).join('')}
            </div>
            <button onclick="document.getElementById('icTargetPicker').remove()"
                    style="width:100%;margin-top:14px;padding:12px;border-radius:12px;background:rgba(42,42,42,0.08);border:none;font-size:13px;color:#888;cursor:pointer;letter-spacing:0.3px;">取消</button>
        </div>
    `;
    picker.addEventListener('click', e => { if (e.target === picker) picker.remove(); });
    document.body.appendChild(picker);
}

function applyGalleryImgToIcon(galleryId, idbKey, appId) {
    document.getElementById('icTargetPicker')?.remove();
    if (typeof ImgDB === 'undefined') return;
    ImgDB.get(idbKey).then(dataUrl => {
        if (!dataUrl) return;
        _applyCustomIconImg(appId, dataUrl);
        _applyIconImgToScreen(appId, dataUrl);
        ImgDB.set(IC_IMG_IDB_PREFIX + appId, dataUrl).catch(() => { });
        saToast(`已替换 ${IC_APPS.find(a => a.id === appId)?.name} 图标`);
    }).catch(() => { });
}

function deleteIconGalleryItem(e, id) {
    e.stopPropagation();
    let meta = JSON.parse(localStorage.getItem(IC_GALLERY_KEY) || '[]');
    meta = meta.filter(m => m.id !== id);
    localStorage.setItem(IC_GALLERY_KEY, JSON.stringify(meta));
    if (typeof ImgDB !== 'undefined') ImgDB.remove(IC_GALLERY_IDB_PREFIX + id).catch(() => { });
    renderIconGallery();
}

/* ════════════════════════════════
   字体更换 — 完整版
════════════════════════════════ */

/* ── 内置字体 Map ── */
const FONT_MAP = {
    system: "-apple-system,'PingFang SC','Helvetica Neue',sans-serif",
    serif: "Georgia,'Times New Roman',serif",
    mono: "'Courier New','Menlo',monospace"
};

/* ── 字体库 IDB Key 前缀 ── */
const FT_LIB_KEY = 'xxj_set_ftLib';       // 元数据 → localStorage（name、source、type、family）
const FT_IDB_PREFIX = 'ft_data_';             // 字体二进制 DataURL → IndexedDB

/* ── 当前自定义字体 family 名称（用于 CSS @font-face） ── */
let _ftCurrentFamily = '';

/* ════════════
   内置字体选择
════════════ */
function selectFont(fontKey) {
    _setActive('fontList', '.ft-item', `[data-font="${fontKey}"]`);
    applyFontToPage(fontKey, true);
    saToast('字体已切换');
}

/* ════════════
   全局应用字体（内置 key 或自定义 family 名）
════════════ */
function applyFontToPage(fontKeyOrFamily, save) {
    /* 判断是内置 key 还是自定义 family */
    const isBuiltin = Object.prototype.hasOwnProperty.call(FONT_MAP, fontKeyOrFamily);
    const family = isBuiltin ? FONT_MAP[fontKeyOrFamily] : `'${fontKeyOrFamily}',sans-serif`;

    /* ① 全局 body 字体（刷新永久保留的关键） */
    document.body.style.fontFamily = family;
    /* ② 内部所有子元素同步（防止局部覆盖） */
    document.querySelectorAll('#phoneScreen, #settingsApp').forEach(el => {
        el.style.fontFamily = family;
    });

    if (save) {
        SettingStore.set('font', fontKeyOrFamily);
        /* 刷新持久化：写入 <style id="fontCustomStyle"> 确保刷新后立即生效 */
        _persistFontStyle(fontKeyOrFamily, family);
    }
}

/* 刷新持久化：把 font-family 写入内联 style 标签 + localStorage，
   页面加载时 _restoreFontOnLoad() 立即应用，不依赖 JS 执行完毕 */
function _persistFontStyle(fontKeyOrFamily, family) {
    SettingStore.set('fontFamily_computed', family);
    const styleEl = document.getElementById('fontCustomStyle');
    if (styleEl) {
        styleEl.textContent = `body,#phoneScreen,#settingsApp,*{font-family:${family}!important;}`;
    }
    /* 同时把这段 CSS 存到 localStorage，以便下次加载时在 HTML head 还没执行前注入 */
    try {
        localStorage.setItem('xxj_set_fontInjectCSS', `body,#phoneScreen,#settingsApp,*{font-family:${family}!important;}`);
    } catch (e) { }
}

/* ════════════
   字号
════════════ */
function previewFontSize(val) {
    document.getElementById('fontSizeVal').textContent = val + '%';
    applyFontSizeToPage(val, false);
}

function applyFontSize() {
    const val = document.getElementById('fontSizeRange')?.value || 100;
    applyFontSizeToPage(val, true);
    saToast('字号已应用');
}

function applyFontSizeToPage(val, save) {
    const rem = (parseInt(val) / 100).toFixed(2) + 'rem';
    document.documentElement.style.fontSize = rem;   // 作用于 html，全局生效
    if (save) {
        SettingStore.set('fontSize', parseInt(val));
        try { localStorage.setItem('xxj_set_fontSizeCSS', `html{font-size:${rem}!important;}`); } catch (e) { }
    }
}

/* ════════════
   URL 导入字体
════════════ */
async function importFontFromUrl() {
    const url = document.getElementById('ftUrlInput')?.value?.trim();
    const name = document.getElementById('ftUrlName')?.value?.trim() || _guessNameFromUrl(url);
    if (!url) { saToast('请填写字体 URL', 'error'); return; }

    saToast('正在加载字体…');
    try {
        const family = _sanitizeFamilyName(name || 'CustomFont_' + Date.now());
        await _loadFontFace(family, url);
        applyFontToPage(family, true);
        _addToFontLib({ name, family, source: url, type: 'url', ts: Date.now() });
        saToast(`字体「${name}」已应用并保存`);
        document.getElementById('ftUrlInput').value = '';
        document.getElementById('ftUrlName').value = '';
        _hideFtUrlPreview();
    } catch (err) {
        saToast('字体加载失败，请检查 URL 或网络', 'error');
    }
}

/* URL 预览（不保存） */
async function previewFontUrl() {
    const url = document.getElementById('ftUrlInput')?.value?.trim();
    const name = document.getElementById('ftUrlName')?.value?.trim() || 'PreviewFont';
    if (!url) { saToast('请先填写字体 URL', 'error'); return; }
    saToast('加载预览中…');
    try {
        const family = _sanitizeFamilyName(name);
        await _loadFontFace(family, url);
        const bar = document.getElementById('ftUrlPreviewBar');
        const text = document.getElementById('ftUrlPreviewText');
        if (bar && text) {
            text.style.fontFamily = `'${family}',sans-serif`;
            bar.classList.remove('hidden');
        }
        saToast('预览已载入');
    } catch {
        saToast('加载失败', 'error');
    }
}

function _hideFtUrlPreview() {
    const bar = document.getElementById('ftUrlPreviewBar');
    if (bar) bar.classList.add('hidden');
}

/* ════════════
   文件导入字体
════════════ */
function importFontFromFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    const inputName = document.getElementById('ftFileName')?.value?.trim();
    const name = inputName || file.name.replace(/\.[^.]+$/, '');

    const info = document.getElementById('ftFileInfo');
    if (info) info.textContent = `${file.name} · ${(file.size / 1024).toFixed(0)} KB — 加载中…`;

    const reader = new FileReader();
    reader.onload = async (e) => {
        const dataUrl = e.target.result;           // data:font/ttf;base64,...
        const family = _sanitizeFamilyName(name || 'FileFont_' + Date.now());
        try {
            await _loadFontFace(family, dataUrl);
            applyFontToPage(family, true);
            /* 存 IDB */
            const id = 'ft_' + Date.now().toString(36);
            if (typeof ImgDB !== 'undefined') {
                ImgDB.set(FT_IDB_PREFIX + id, dataUrl).catch(() => { });
            }
            _addToFontLib({ id, name, family, source: dataUrl.slice(0, 60), type: 'file', idbKey: FT_IDB_PREFIX + id, ts: Date.now() });
            if (info) info.textContent = `${file.name} — 已应用`;
            saToast(`字体「${name}」已应用并保存`);
            document.getElementById('ftFileName').value = '';
        } catch {
            saToast('字体文件加载失败', 'error');
            if (info) info.textContent = '加载失败，请检查文件格式';
        }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
}

/* ════════════
   FontFace 加载核心
   支持 URL（跨域）和 DataURL
════════════ */
function _loadFontFace(family, src) {
    return new Promise((resolve, reject) => {
        /* 注入 @font-face CSS 到 <style id="fontCustomStyle"> */
        const styleEl = document.getElementById('fontCustomStyle');
        if (styleEl) {
            styleEl.textContent += `@font-face{font-family:'${family}';src:url('${src}') format('truetype');font-display:swap;}`;
        }
        /* 同时用 FontFace API 确认加载成功 */
        const ff = new FontFace(family, `url(${src})`);
        ff.load().then(loaded => {
            document.fonts.add(loaded);
            _ftCurrentFamily = family;
            resolve(family);
        }).catch(reject);
    });
}

/* ════════════
   字体库
════════════ */
function _addToFontLib(meta) {
    const lib = JSON.parse(localStorage.getItem(FT_LIB_KEY) || '[]');
    /* 按 family 去重 */
    const exists = lib.findIndex(m => m.family === meta.family);
    if (exists !== -1) lib.splice(exists, 1);
    lib.unshift(meta);
    if (lib.length > 20) lib.splice(20);
    localStorage.setItem(FT_LIB_KEY, JSON.stringify(lib));
    renderFontLib();
}

function renderFontLib() {
    const lib = JSON.parse(localStorage.getItem(FT_LIB_KEY) || '[]');
    const list = document.getElementById('ftLibList');
    const badge = document.getElementById('ftLibBadge');
    const empty = document.getElementById('ftLibEmpty');
    if (!list) return;
    if (badge) badge.textContent = lib.length;
    if (!lib.length) { if (empty) empty.style.display = ''; return; }
    if (empty) empty.style.display = 'none';
    /* 清空旧项 */
    Array.from(list.children).forEach(c => { if (c.id !== 'ftLibEmpty') c.remove(); });

    const currentFamily = SettingStore.get('font', 'system');

    lib.forEach(meta => {
        const item = document.createElement('div');
        item.className = `ft-lib-item ${meta.family === currentFamily ? 'active' : ''}`;
        item.dataset.family = meta.family;

        item.innerHTML = `
            <div class="ft-lib-info">
                <div class="ft-lib-name">${_escHtml(meta.name || meta.family)}</div>
                <div class="ft-lib-type">${meta.type === 'url' ? 'URL' : '文件'} · ${_tsAgo(meta.ts)}</div>
            </div>
            <div class="ft-lib-preview-text" style="font-family:'${meta.family}',sans-serif">
                星星机 Aa 永远
            </div>
            <div class="ft-lib-actions">
                <button class="ft-lib-use" onclick="applyFontFromLib('${meta.family}','${meta.type}','${meta.idbKey || ''}','${encodeURIComponent(meta.source || '')}')">
                    使用
                </button>
                <button class="ft-lib-del" onclick="deleteFontLibItem(event,'${meta.family}')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>
        `;
        list.appendChild(item);
    });
}

async function applyFontFromLib(family, type, idbKey, encodedSource) {
    saToast('字体加载中…');
    try {
        /* 先尝试直接用 family（FontFace 已注册则直接可用） */
        const already = [...document.fonts].some(f => f.family === family || f.family === `"${family}"`);
        if (!already) {
            /* 需要重新加载 */
            if (type === 'file' && idbKey && typeof ImgDB !== 'undefined') {
                const dataUrl = await ImgDB.get(idbKey);
                if (dataUrl) {
                    await _loadFontFace(family, dataUrl);
                } else {
                    saToast('字体文件已丢失，请重新上传', 'error'); return;
                }
            } else {
                const src = decodeURIComponent(encodedSource || '');
                if (src) await _loadFontFace(family, src);
                else { saToast('字体来源丢失', 'error'); return; }
            }
        }
        applyFontToPage(family, true);
        /* 更新 active 状态 */
        document.querySelectorAll('.ft-lib-item').forEach(el => {
            el.classList.toggle('active', el.dataset.family === family);
        });
        saToast('字体已切换');
    } catch {
        saToast('字体加载失败', 'error');
    }
}

function deleteFontLibItem(e, family) {
    e.stopPropagation();
    let lib = JSON.parse(localStorage.getItem(FT_LIB_KEY) || '[]');
    const meta = lib.find(m => m.family === family);
    if (meta?.idbKey && typeof ImgDB !== 'undefined') {
        ImgDB.remove(meta.idbKey).catch(() => { });
    }
    lib = lib.filter(m => m.family !== family);
    localStorage.setItem(FT_LIB_KEY, JSON.stringify(lib));
    renderFontLib();
    saToast('已删除');
}

/* ════════════
   页面加载时立即恢复字体（防止刷新闪烁）
   在 <head> 末尾注入 CSS，不等 JS 完整执行
════════════ */
function _restoreFontOnLoad() {
    /* 恢复 @font-face（自定义字体） */
    const lib = JSON.parse(localStorage.getItem(FT_LIB_KEY) || '[]');
    const currentFamily = SettingStore.get('font', 'system');
    const currentMeta = lib.find(m => m.family === currentFamily);

    const styleEl = document.getElementById('fontCustomStyle');
    if (!styleEl) return;

    /* 1. 注入 @font-face（如果是自定义字体） */
    if (currentMeta) {
        if (currentMeta.type === 'url') {
            styleEl.textContent += `@font-face{font-family:'${currentMeta.family}';src:url('${decodeURIComponent(currentMeta.source || '')}') format('truetype');font-display:swap;}`;
        } else if (currentMeta.type === 'file' && currentMeta.idbKey && typeof ImgDB !== 'undefined') {
            /* 文件字体需要异步加载 DataURL */
            ImgDB.get(currentMeta.idbKey).then(dataUrl => {
                if (dataUrl) _loadFontFace(currentMeta.family, dataUrl).then(() => {
                    applyFontToPage(currentMeta.family, false);
                }).catch(() => { });
            }).catch(() => { });
        }
    }

    /* 2. 注入保存的字体 CSS（立即生效，不等异步） */
    const savedCSS = localStorage.getItem('xxj_set_fontInjectCSS') || '';
    if (savedCSS) styleEl.textContent = savedCSS + styleEl.textContent;

    /* 3. 字号 */
    const sizeCSS = localStorage.getItem('xxj_set_fontSizeCSS') || '';
    if (sizeCSS) {
        let sz = document.createElement('style');
        sz.id = 'fontSizeStyle';
        sz.textContent = sizeCSS;
        document.head.appendChild(sz);
    }
}

/* ════════════
   工具函数
════════════ */
function _sanitizeFamilyName(name) {
    /* 去除引号和空格，用于 CSS font-family 名称 */
    return name.replace(/['"\\]/g, '').replace(/\s+/g, '_').slice(0, 40);
}

function _guessNameFromUrl(url) {
    if (!url) return '自定义字体';
    try {
        const path = new URL(url).pathname;
        const file = path.split('/').pop() || '字体';
        return decodeURIComponent(file.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '));
    } catch {
        return '自定义字体';
    }
}

function _tsAgo(ts) {
    if (!ts) return '';
    const diff = Date.now() - ts;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' 分钟前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' 小时前';
    return Math.floor(diff / 86400000) + ' 天前';
}

/* ════════════════════════════════
   数据管理 — 完整版
════════════════════════════════ */

/* ── 导出记录 key ── */
const DM_LOG_KEY = 'xxj_dm_exportLog';

/* ── 所有需要从 IDB 导出的 key ── */
function _getAllIdbKeys() {
    /* 壁纸、图片小组件 */
    const base = ['img_avatar', 'img_noteImg', 'img_photoImg', 'wallpaper'];
    /* 壁纸图库 */
    const wpMeta = JSON.parse(localStorage.getItem('xxj_set_wpGallery') || '[]');
    wpMeta.forEach(m => base.push('wpgallery_' + m.id));
    /* 图标图库 */
    const icMeta = JSON.parse(localStorage.getItem('xxj_set_icGallery') || '[]');
    icMeta.forEach(m => base.push('icgallery_' + m.id));
    /* 字体文件 */
    const ftLib = JSON.parse(localStorage.getItem('xxj_set_ftLib') || '[]');
    ftLib.forEach(m => { if (m.idbKey) base.push(m.idbKey); });
    return base;
}

/* ── 存储用量计算 ── */
function calcStorage() {
    /* localStorage */
    let textBytes = 0;
    for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('xxj_')) textBytes += (localStorage.getItem(k) || '').length * 2;
    }

    const fmt = b => b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(2) + ' MB';
    _setTextContent('textDataSize', fmt(textBytes));

    if (typeof ImgDB !== 'undefined') {
        const idbKeys = _getAllIdbKeys();
        /* 字体 key 单独统计 */
        const ftLib = JSON.parse(localStorage.getItem('xxj_set_ftLib') || '[]');
        const ftIdbKeys = ftLib.filter(m => m.idbKey).map(m => m.idbKey);
        const imgKeys = idbKeys.filter(k => !ftIdbKeys.includes(k));

        Promise.all(idbKeys.map(k => ImgDB.get(k).catch(() => null))).then(results => {
            let imgBytes = 0, ftBytes = 0;
            results.forEach((r, i) => {
                if (!r) return;
                const bytes = r.length * 2;
                if (ftIdbKeys.includes(idbKeys[i])) ftBytes += bytes;
                else imgBytes += bytes;
            });
            _setTextContent('imgDataSize', fmt(imgBytes));
            _setTextContent('fontDataSize', fmt(ftBytes));
            _setTextContent('totalDataSize', fmt(textBytes + imgBytes + ftBytes));
        }).catch(() => {
            _setTextContent('imgDataSize', '无法估算');
            _setTextContent('fontDataSize', '—');
            _setTextContent('totalDataSize', '—');
        });
    } else {
        _setTextContent('imgDataSize', '—');
        _setTextContent('fontDataSize', '—');
        _setTextContent('totalDataSize', fmt(textBytes));
    }
}

/* ── 导出全部数据 ── */
async function exportData() {
    saToast('正在打包数据…');
    const data = { _version: 1, _ts: Date.now() };

    /* localStorage */
    for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('xxj_')) data[k] = localStorage.getItem(k);
    }

    /* IndexedDB（全量） */
    const idbKeys = _getAllIdbKeys();
    if (typeof ImgDB !== 'undefined') {
        const pairs = await Promise.all(
            idbKeys.map(k => ImgDB.get(k).catch(() => null).then(v => ({ k: 'idb_' + k, v })))
        );
        pairs.forEach(({ k, v }) => { if (v) data[k] = v; });
    }

    /* 计算大小 */
    const json = JSON.stringify(data);
    const bytes = json.length * 2;
    const fmt = b => b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(2) + ' MB';
    const sizeStr = fmt(bytes);

    /* 下载 */
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `xingxingji_${dateStr}.json`;
    a.click();
    URL.revokeObjectURL(url);

    /* 保存导出记录（最近5次） */
    _addExportLog(dateStr, sizeStr);

    saToast(`导出成功 · ${sizeStr}`);
}

/* ── 导出记录管理 ── */
function _addExportLog(date, size) {
    let log = JSON.parse(localStorage.getItem(DM_LOG_KEY) || '[]');
    log.unshift({ date, size, ts: Date.now() });
    if (log.length > 5) log = log.slice(0, 5);
    localStorage.setItem(DM_LOG_KEY, JSON.stringify(log));
    renderExportLog();
}

function renderExportLog() {
    const log = JSON.parse(localStorage.getItem(DM_LOG_KEY) || '[]');
    const container = document.getElementById('dmExportLog');
    const empty = document.getElementById('dmLogEmpty');
    if (!container) return;
    /* 清旧 */
    Array.from(container.children).forEach(c => { if (c.id !== 'dmLogEmpty') c.remove(); });
    if (!log.length) { if (empty) empty.style.display = ''; return; }
    if (empty) empty.style.display = 'none';
    log.forEach((item, idx) => {
        const row = document.createElement('div');
        row.className = 'dm-log-row';
        row.innerHTML = `
            <div class="dm-log-index">#${idx + 1}</div>
            <div class="dm-log-info">
                <div class="dm-log-date">${_escHtml(item.date)}</div>
                <div class="dm-log-size">${_escHtml(item.size)}</div>
            </div>
            <div class="dm-log-ago">${_tsAgo(item.ts)}</div>
        `;
        container.appendChild(row);
    });
}

/* ── 导入数据 ── */
function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target.result);
            /* localStorage */
            Object.keys(data).forEach(k => {
                if (k.startsWith('xxj_')) localStorage.setItem(k, data[k]);
            });
            /* IndexedDB */
            if (typeof ImgDB !== 'undefined') {
                const idbPairs = Object.entries(data).filter(([k]) => k.startsWith('idb_'));
                await Promise.all(idbPairs.map(([k, v]) =>
                    ImgDB.set(k.replace('idb_', ''), v).catch(() => { })
                ));
            }
            saToast('导入成功，即将刷新…');
            setTimeout(() => location.reload(), 1200);
        } catch {
            saToast('导入失败：文件格式不正确', 'error');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

/* ── 恢复出厂设置（清空全部数据） ── */
function clearAllData() {
    if (!confirm('⚠️ 确认恢复出厂设置？\n\n所有设置、壁纸、头像、字体库、图标图库将全部清除，且不可撤销！\n\n建议先导出备份。')) return;

    /* 1. 清 localStorage（所有 xxj_ 开头） */
    const lsKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('xxj_')) lsKeys.push(k);
    }
    lsKeys.forEach(k => localStorage.removeItem(k));

    /* 2. 清 localStorage 中的字体 CSS 持久化缓存 */
    ['xxj_set_fontInjectCSS', 'xxj_set_fontSizeCSS'].forEach(k => {
        try { localStorage.removeItem(k); } catch { }
    });

    /* 3. 清 IndexedDB（全量） */
    if (typeof ImgDB !== 'undefined') {
        _getAllIdbKeys().forEach(k => ImgDB.remove(k).catch(() => { }));
    }

    saToast('已重置，即将刷新…');
    setTimeout(() => location.reload(), 1200);
}

/* ════════════════════════════════
   启动时恢复设置（页面加载时调用）
════════════════════════════════ */
function restoreSettings() {
    /* 壁纸：图片优先，否则颜色 */
    if (typeof ImgDB !== 'undefined') {
        ImgDB.get('wallpaper').then(dataUrl => {
            if (dataUrl) {
                const layer = document.getElementById('wallpaperLayer');
                if (layer) {
                    layer.style.backgroundImage = `url(${dataUrl})`;
                    layer.style.backgroundSize = 'cover';
                    layer.style.backgroundPosition = 'center';
                }
            } else {
                const wpColor = SettingStore.get('wpColor', null);
                if (wpColor) applyColorWallpaper(wpColor, false);
            }
        }).catch(() => { });
    }

    /* 屏幕 */
    const scale = SettingStore.get('scale', 100);
    const brightness = SettingStore.get('brightness', 100);
    const gap = SettingStore.get('gridGap', 16);
    applyScaleToPage(scale, false);
    applyBrightnessToPage(brightness, false);
    applyGridGapToPage(gap, false);

    /* 字体 — 刷新立即恢复 */
    _restoreFontOnLoad();
    applyFontToPage(SettingStore.get('font', 'system'), false);
    applyFontSizeToPage(SettingStore.get('fontSize', 100), false);

    /* 图标 */
    applyIconStyleToPage(SettingStore.get('iconStyle', 'default'), false);
    applyIconBgToPage(SettingStore.get('iconBg', 'glass'), false);
    applyIconShapeToPage(SettingStore.get('iconShape', 'circle'), false);
    applyIconLabelColor(SettingStore.get('iconLabelColor', '#2a2a2a'), false);
    restoreIconLines();
    restoreCustomIconImgs();

    /* ── 屏幕调整扩展恢复 ── */
    applyFilterToPage(SettingStore.get('screenFilter', 'none'), false);
    applyNightMode(SettingStore.get('nightMode', false), false);
    applyEyeCare(SettingStore.get('eyeCare', false), false);
    toggleStatusBar(SettingStore.get('hideStatusBar', false));
    toggleDynamicIsland(SettingStore.get('hideDynamicIsland', false));
    applyTopWidget(SettingStore.get('topWidget', 'info'), false);
    const savedPos = SettingStore.get('screenPos', { x: 0, y: 0 });
    _applyScreenPos(savedPos, false);
    _rebuildScreenFilter();
}

/* ── 壁纸恢复（高质量） ── */
_restoreWallpaperFromDB();

/* ── 天气动效恢复 ── */
const wxType = SettingStore.get('weatherEffect', 'none');
_wxIntensity = SettingStore.get('wxIntensity', 2);
if (wxType !== 'none') _startWeatherEffect(wxType);

/* ════════════════════════════════
   工具函数
════════════════════════════════ */

/* Toast 提示 */
function saToast(msg, type = 'success') {
    const existing = document.getElementById('saToast');
    if (existing) existing.remove();

    const el = document.createElement('div');
    el.id = 'saToast';
    el.textContent = msg;
    Object.assign(el.style, {
        position: 'fixed',
        bottom: '80px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: type === 'error' ? 'rgba(180,50,50,0.92)' : 'rgba(42,42,42,0.88)',
        color: '#fff',
        padding: '9px 18px',
        borderRadius: '20px',
        fontSize: '13px',
        letterSpacing: '0.3px',
        zIndex: '9999',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        backdropFilter: 'blur(8px)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
        animation: 'saToastIn 0.22s ease',
    });

    /* 追加动画 */
    if (!document.getElementById('saToastStyle')) {
        const s = document.createElement('style');
        s.id = 'saToastStyle';
        s.textContent = `
      @keyframes saToastIn  { from { opacity:0; transform:translateX(-50%) translateY(8px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
      @keyframes saToastOut { from { opacity:1; } to { opacity:0; } }
    `;
        document.head.appendChild(s);
    }

    document.body.appendChild(el);
    setTimeout(() => {
        el.style.animation = 'saToastOut 0.22s ease forwards';
        setTimeout(() => el.remove(), 220);
    }, 2200);
}

function _escHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function _shortUrl(url) {
    try { return new URL(url).hostname; } catch { return url; }
}

function _setTextContent(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

