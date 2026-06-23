/* ═══════════════════════════════════════════════════════
   widgets.js  v3
   图片 → IndexedDB（无容量限制）
   文字 → localStorage（独立 key，互不干扰）
   刷新后 100% 恢复
═══════════════════════════════════════════════════════ */
'use strict';

/* ════════════════════════════════════════════════
   1. IndexedDB 封装（专存图片 Blob/dataURL）
════════════════════════════════════════════════ */
const ImgDB = (() => {
    const DB_NAME = 'xingxingji_imgs';
    const DB_VERSION = 1;
    const STORE_NAME = 'images';
    let _db = null;

    function _open() {
        return new Promise((resolve, reject) => {
            if (_db) { resolve(_db); return; }
            const req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = (e) => {
                e.target.result.createObjectStore(STORE_NAME);
            };
            req.onsuccess = (e) => { _db = e.target.result; resolve(_db); };
            req.onerror = (e) => reject(e.target.error);
        });
    }

    return {
        /* 存储 dataURL 字符串 */
        set(key, dataUrl) {
            return _open().then(db => new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const req = tx.objectStore(STORE_NAME).put(dataUrl, key);
                req.onsuccess = () => resolve();
                req.onerror = (e) => reject(e.target.error);
            }));
        },

        /* 读取 dataURL，不存在返回 null */
        get(key) {
            return _open().then(db => new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readonly');
                const req = tx.objectStore(STORE_NAME).get(key);
                req.onsuccess = (e) => resolve(e.target.result ?? null);
                req.onerror = (e) => reject(e.target.error);
            }));
        },

        /* 删除 */
        remove(key) {
            return _open().then(db => new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const req = tx.objectStore(STORE_NAME).delete(key);
                req.onsuccess = () => resolve();
                req.onerror = (e) => reject(e.target.error);
            }));
        }
    };
})();

/* ════════════════════════════════════════════════
   2. 文字存储（localStorage，每个字段独立 key）
════════════════════════════════════════════════ */
const TextStore = {
    PREFIX: 'xxj_text_',

    set(fieldId, value) {
        try {
            localStorage.setItem(this.PREFIX + fieldId, value);
        } catch (e) {
            console.warn('文字存储失败:', e);
        }
    },

    get(fieldId) {
        try {
            return localStorage.getItem(this.PREFIX + fieldId); // 不存在返回 null
        } catch {
            return null;
        }
    }
};

/* ════════════════════════════════════════════════
   3. 图片上传入口
════════════════════════════════════════════════ */
let _currentImgTarget = null;

function triggerImgUpload(imgId) {
    _currentImgTarget = imgId;
    const input = document.getElementById('fileInputImg');
    input.value = '';
    input.click();
}

function handleImgUpload(event) {
    const file = event.target.files[0];
    if (!file || !_currentImgTarget) return;
    const target = _currentImgTarget; // 闭包固定，防止异步问题
    _currentImgTarget = null;

    const reader = new FileReader();
    reader.onload = (e) => {
        const dataUrl = e.target.result;
        _applyWidgetImg(target, dataUrl);      // 立刻渲染
        ImgDB.set('img_' + target, dataUrl)   // 异步存 IndexedDB
            .catch(err => console.warn('图片保存失败:', err));
    };
    reader.readAsDataURL(file);
}

function triggerAvatarUpload() {
    const input = document.getElementById('fileInputAvatar');
    input.value = '';
    input.click();
}

function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const dataUrl = e.target.result;
        _applyAvatar(dataUrl);
        ImgDB.set('img_avatar', dataUrl)
            .catch(err => console.warn('头像保存失败:', err));
    };
    reader.readAsDataURL(file);
}

/* ════════════════════════════════════════════════
   4. DOM 渲染函数
════════════════════════════════════════════════ */

function _applyWidgetImg(imgId, dataUrl) {
    const imgEl = document.getElementById(imgId);
    if (!imgEl) return;
    imgEl.src = dataUrl;
    imgEl.classList.remove('hidden');

    const ph = document.getElementById(imgId + 'Placeholder');
    if (ph) ph.classList.add('hidden');

    _attachRemoveBtn(imgId);
}

function _applyAvatar(dataUrl) {
    const defaultEl = document.getElementById('avatarDefault');
    const imgEl = document.getElementById('avatarImg');
    if (defaultEl) defaultEl.classList.add('hidden');
    if (imgEl) {
        imgEl.src = dataUrl;
        imgEl.classList.remove('hidden');
    }
}

function _attachRemoveBtn(imgId) {
    const parent = imgId === 'noteImg'
        ? document.getElementById('noteImgArea')
        : document.getElementById('widgetPhoto');
    if (!parent || parent.querySelector('.img-remove-btn')) return;

    const btn = document.createElement('button');
    btn.className = 'img-remove-btn';
    btn.textContent = '×';
    btn.title = '移除图片';
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        _removeWidgetImg(imgId);
    });
    parent.appendChild(btn);
}

function _removeWidgetImg(imgId) {
    const imgEl = document.getElementById(imgId);
    if (imgEl) { imgEl.src = ''; imgEl.classList.add('hidden'); }

    const ph = document.getElementById(imgId + 'Placeholder');
    if (ph) ph.classList.remove('hidden');

    const parent = imgId === 'noteImg'
        ? document.getElementById('noteImgArea')
        : document.getElementById('widgetPhoto');
    if (parent) {
        const btn = parent.querySelector('.img-remove-btn');
        if (btn) btn.remove();
    }

    ImgDB.remove('img_' + imgId).catch(() => { });
}

/* ════════════════════════════════════════════════
   5. 文字编辑绑定
════════════════════════════════════════════════ */
const TEXT_FIELDS = ['twMotto', 'twBaby', 'twContact', 'noteLabel'];

function bindTextEdits() {
    TEXT_FIELDS.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;

        el.addEventListener('input', () => {
            TextStore.set(id, el.innerText);
        });

        el.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); el.blur(); }
        });

        el.addEventListener('blur', () => {
            TextStore.set(id, el.innerText);
        });
    });
}

/* ════════════════════════════════════════════════
   6. 恢复所有数据（刷新后调用）
   文字：同步恢复（localStorage）
   图片：异步恢复（IndexedDB）
════════════════════════════════════════════════ */
function restoreWidgets() {
    /* ── 文字（同步，立刻执行） ── */
    TEXT_FIELDS.forEach(id => {
        const saved = TextStore.get(id);
        const el = document.getElementById(id);
        /* saved 为 null 说明用户从未编辑过，保持空白让 CSS placeholder 生效 */
        if (saved !== null && el) {
            el.innerText = saved;
        }
    });

    /* ── 图片（异步，Promise 链） ── */
    ImgDB.get('img_avatar').then(dataUrl => {
        if (dataUrl) _applyAvatar(dataUrl);
    }).catch(() => { });

    ['noteImg', 'photoImg'].forEach(id => {
        ImgDB.get('img_' + id).then(dataUrl => {
            if (dataUrl) _applyWidgetImg(id, dataUrl);
        }).catch(() => { });
    });
}
