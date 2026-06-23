const ChatImgDB = (() => {
  const DB_NAME = "xxj_chat_img";
  const DB_VER = 1;
  const STORE = "imgs";
  let _db = null;

  function open() {
    if (_db) return Promise.resolve(_db);
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = (e) => {
        e.target.result.createObjectStore(STORE);
      };
      req.onsuccess = (e) => {
        _db = e.target.result;
        resolve(_db);
      };
      req.onerror = (e) => reject(e.target.error);
    });
  }

  function put(key, dataUrl) {
    return open().then(
      (db) =>
        new Promise((resolve, reject) => {
          const tx = db.transaction(STORE, "readwrite");
          const req = tx.objectStore(STORE).put(dataUrl, key);
          req.onsuccess = () => resolve(true);
          req.onerror = (e) => reject(e.target.error);
        }),
    );
  }

  function get(key) {
    return open().then(
      (db) =>
        new Promise((resolve, reject) => {
          const req = db
            .transaction(STORE, "readonly")
            .objectStore(STORE)
            .get(key);
          req.onsuccess = (e) => resolve(e.target.result || null);
          req.onerror = (e) => reject(e.target.error);
        }),
    );
  }

  function del(key) {
    return open().then(
      (db) =>
        new Promise((resolve, reject) => {
          const req = db
            .transaction(STORE, "readwrite")
            .objectStore(STORE)
            .delete(key);
          req.onsuccess = () => resolve();
          req.onerror = (e) => reject(e.target.error);
        }),
    );
  }

  return { put, get, del };
})();

/* ════════════════════════════════
   读取文件为 DataURL（不压缩）
════════════════════════════════ */
function _chatReadFile(file) {
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = (e) => resolve(e.target.result);
    r.readAsDataURL(file);
  });
}

/* ════════════════════════════════
   存储层 — 文字走 localStorage，图片走 IndexedDB
════════════════════════════════ */
const ChatStore = {
  PROFILE_KEY: "xxj_chat_profile",
  USERS_KEY: "xxj_chat_users",
  ACTIVE_KEY: "xxj_chat_active_user",

  getProfile() {
    try {
      const v = localStorage.getItem(this.PROFILE_KEY);
      return v ? JSON.parse(v) : { nickname: "", bio: "" };
    } catch {
      return { nickname: "", bio: "" };
    }
  },
  saveProfile(d) {
    /* profile 只存文字，不存图片 */
    const slim = { nickname: d.nickname || "", bio: d.bio || "" };
    try {
      localStorage.setItem(this.PROFILE_KEY, JSON.stringify(slim));
    } catch {}
  },

  getUsers() {
    try {
      const v = localStorage.getItem(this.USERS_KEY);
      return v ? JSON.parse(v) : [];
    } catch {
      return [];
    }
  },
  saveUsers(arr) {
    /* users 只存文字字段，头像图片单独存 IndexedDB */
    const slim = arr.map((u) => ({
      id: u.id,
      name: u.name,
      gender: u.gender,
      age: u.age,
      country: u.country,
      city: u.city,
      bio: u.bio,
      createdAt: u.createdAt,
      hasAvatar: !!u._avatarDirty || undefined /* 内部标记，不持久化 */,
    }));
    try {
      localStorage.setItem(this.USERS_KEY, JSON.stringify(slim));
    } catch (err) {
      console.warn("[ChatStore] saveUsers 失败:", err);
    }
  },

  getActiveId() {
    return localStorage.getItem(this.ACTIVE_KEY) || null;
  },
  setActiveId(id) {
    if (id) localStorage.setItem(this.ACTIVE_KEY, id);
    else localStorage.removeItem(this.ACTIVE_KEY);
  },
};

/* ════════════════════════════════
   APP 开关
════════════════════════════════ */
function openChatApp() {
  const el = document.getElementById("chatApp");
  if (!el) return;
  el.classList.remove("hidden");
  el.style.animation = "";
  void el.offsetWidth;
  el.style.animation = "chatSlideIn 0.3s cubic-bezier(0.34,1.1,0.64,1)";
  chatSwitchTab("talk");
}

function closeChatApp() {
  const el = document.getElementById("chatApp");
  el.style.animation = "chatSlideOut 0.22s ease forwards";
  setTimeout(() => {
    el.classList.add("hidden");
    el.style.animation = "";
  }, 220);
}

/* ════════════════════════════════
   个人主页渲染 — 异步读 IndexedDB 图片
════════════════════════════════ */
async function chatRenderProfile() {
  /* ── Banner（背景图，改为只操作 cpStripBg，不再依赖 cpBannerImg） ── */
  const bannerPH = document.getElementById("cpBannerPH");
  const stripBg = document.getElementById("cpStripBg");
  const bannerData = await ChatImgDB.get("cp_banner").catch(() => null);
  if (bannerData) {
    if (stripBg) stripBg.style.backgroundImage = `url(${bannerData})`;
    if (bannerPH) bannerPH.style.display = "none";
  } else {
    if (stripBg) stripBg.style.backgroundImage = "";
    if (bannerPH) bannerPH.style.display = "flex";
  }

  /* ── 前方头像（独立） ── */
  const avatarImg = document.getElementById("cpAvatarImg");
  const avatarPH = document.getElementById("cpAvatarPH");
  const avatarData = await ChatImgDB.get("cp_avatar").catch(() => null);
  if (avatarData) {
    avatarImg.src = avatarData;
    avatarImg.style.display = "block";
    if (avatarPH) avatarPH.style.display = "none";
  } else {
    avatarImg.style.display = "none";
    if (avatarPH) avatarPH.style.display = "flex";
  }

  /* ── 后方头像（独立） ── */
  const avatarBackImg = document.getElementById("cpAvatarBackImg");
  const avatarBackPH = document.getElementById("cpAvatarBackPH");
  const avatarBackData = await ChatImgDB.get("cp_avatar_back").catch(
    () => null,
  );
  if (avatarBackData && avatarBackImg) {
    avatarBackImg.src = avatarBackData;
    avatarBackImg.style.display = "block";
    if (avatarBackPH) avatarBackPH.style.display = "none";
  } else {
    if (avatarBackImg) avatarBackImg.style.display = "none";
    if (avatarBackPH) avatarBackPH.style.display = "flex";
  }
}

/* ════════════════════════════════
   个人主页 — 头像上传处理
════════════════════════════════ */

/* Banner 上传（同时同步下方延伸条背景） */
function cpTriggerBanner() {
  document.getElementById("cpBannerInput")?.click();
}
async function cpHandleBanner(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const dataUrl = await _chatReadFile(file);
  await ChatImgDB.put("cp_banner", dataUrl);
  /* 只操作 stripBg，cpBannerImg 已不存在 */
  const stripBg = document.getElementById("cpStripBg");
  const ph = document.getElementById("cpBannerPH");
  if (stripBg) stripBg.style.backgroundImage = `url(${dataUrl})`;
  if (ph) ph.style.display = "none";
  e.target.value = "";
}

/* 前方头像 */
function cpTriggerAvatar() {
  document.getElementById("cpAvatarInput")?.click();
}
async function cpHandleAvatar(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const dataUrl = await _chatReadFile(file);
  await ChatImgDB.put("cp_avatar", dataUrl);
  const img = document.getElementById("cpAvatarImg");
  const ph = document.getElementById("cpAvatarPH");
  if (img) {
    img.src = dataUrl;
    img.style.display = "block";
  }
  if (ph) {
    ph.style.display = "none";
  }
  e.target.value = "";
}

/* 后方头像 */
function cpTriggerAvatarBack() {
  document.getElementById("cpAvatarBackInput")?.click();
}
async function cpHandleAvatarBack(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const dataUrl = await _chatReadFile(file);
  await ChatImgDB.put("cp_avatar_back", dataUrl);
  const img = document.getElementById("cpAvatarBackImg");
  const ph = document.getElementById("cpAvatarBackPH");
  if (img) {
    img.src = dataUrl;
    img.style.display = "block";
  }
  if (ph) {
    ph.style.display = "none";
  }
  e.target.value = "";
}

/* ════════════════════════════════
   User 身份 浮层
════════════════════════════════ */
let cuEditingId = null;
let cuAvatarData = null; /* 当前选择的头像 DataURL（内存中） */
let cuGender = "";
let cuFormOpen = false;

function openUserIdentity() {
  cuEditingId = null;
  cuAvatarData = null;
  cuGender = "";
  cuFormOpen = false;
  const sheet = document.getElementById("cuSheet");
  if (!sheet) return;
  sheet.classList.remove("hidden");
  sheet.style.animation = "";
  void sheet.offsetWidth;
  sheet.style.animation = "cuSlideIn 0.28s cubic-bezier(0.34,1.1,0.64,1)";
  _cuSetFormVisible(false);
  cuRenderUserList();
}

function closeUserIdentity() {
  const sheet = document.getElementById("cuSheet");
  sheet.style.animation = "cuSlideOut 0.22s ease forwards";
  setTimeout(() => {
    sheet.classList.add("hidden");
    sheet.style.animation = "";
  }, 220);
}

/* ── 显隐表单（全用 style.display，不碰 class） ── */
function _cuSetFormVisible(show) {
  cuFormOpen = show;
  const fa = document.getElementById("cuFormArea");
  if (fa) fa.style.display = show ? "block" : "none";
  const btn = document.getElementById("cuAddBtn");
  if (btn)
    btn.innerHTML = show
      ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
               <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
           </svg>`
      : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
               <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
           </svg>`;
}

function cuToggleForm() {
  if (cuFormOpen) {
    cuEditingId = null;
    cuAvatarData = null;
    cuGender = "";
    _cuResetForm();
    _cuSetFormVisible(false);
  } else {
    cuEditingId = null;
    cuAvatarData = null;
    cuGender = "";
    _cuResetForm();
    _cuSetFormVisible(true);
    setTimeout(() => {
      const sc = document.getElementById("cuScroll");
      if (sc) sc.scrollTo({ top: sc.scrollHeight, behavior: "smooth" });
    }, 80);
  }
}

function _cuResetForm() {
  const img = document.getElementById("cuAvatarImg");
  const ph = document.getElementById("cuAvatarPH");
  if (img) {
    img.style.display = "none";
    img.src = "";
  }
  if (ph) ph.style.display = "flex";
  ["cuNickname", "cuAge", "cuBio"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  const co = document.getElementById("cuOriginCountry");
  const ci = document.getElementById("cuOriginCity");
  if (co) co.value = "";
  if (ci) ci.value = "";
  document
    .querySelectorAll(".cu-gender-btn")
    .forEach((b) => b.classList.remove("cu-gender-active"));
  cuUpdateCityOptions();
}

/* ── User 头像上传（不压缩，IndexedDB） ── */
function cuTriggerAvatar() {
  document.getElementById("cuAvatarInput").click();
}
async function cuHandleAvatar(e) {
  const file = e.target.files[0];
  if (!file) return;
  e.target.value = "";
  cuAvatarData = await _chatReadFile(file); /* 存内存，保存时写 DB */
  const img = document.getElementById("cuAvatarImg");
  const ph = document.getElementById("cuAvatarPH");
  img.src = cuAvatarData;
  img.style.display = "block";
  ph.style.display = "none";
}

/* ── 性别 ── */
function cuSetGender(g, btn) {
  cuGender = g;
  document
    .querySelectorAll(".cu-gender-btn")
    .forEach((b) => b.classList.remove("cu-gender-active"));
  btn.classList.add("cu-gender-active");
}

/* ── 城市联动 ── */
const CU_CITIES = {
  中国: [
    "北京",
    "上海",
    "广州",
    "深圳",
    "成都",
    "重庆",
    "杭州",
    "武汉",
    "南京",
    "西安",
    "天津",
    "苏州",
    "长沙",
    "郑州",
    "青岛",
    "厦门",
    "沈阳",
    "哈尔滨",
    "昆明",
    "大连",
    "宁波",
    "合肥",
    "济南",
    "福州",
    "兰州",
    "太原",
    "南宁",
    "贵阳",
    "乌鲁木齐",
    "拉萨",
    "呼和浩特",
    "海口",
    "三亚",
    "其他",
  ],
  日本: [
    "东京",
    "大阪",
    "京都",
    "横滨",
    "名古屋",
    "神户",
    "福冈",
    "札幌",
    "仙台",
    "广岛",
    "奈良",
    "长崎",
    "冲绳",
    "其他",
  ],
  韩国: [
    "首尔",
    "釜山",
    "仁川",
    "大邱",
    "大田",
    "光州",
    "济州岛",
    "水原",
    "其他",
  ],
  美国: [
    "纽约",
    "洛杉矶",
    "芝加哥",
    "旧金山",
    "西雅图",
    "波士顿",
    "迈阿密",
    "拉斯维加斯",
    "华盛顿特区",
    "休斯顿",
    "其他",
  ],
  英国: ["伦敦", "曼彻斯特", "伯明翰", "爱丁堡", "利物浦", "布里斯托", "其他"],
  法国: ["巴黎", "里昂", "马赛", "波尔多", "尼斯", "图卢兹", "其他"],
  德国: ["柏林", "慕尼黑", "汉堡", "法兰克福", "科隆", "杜塞尔多夫", "其他"],
  意大利: ["罗马", "米兰", "威尼斯", "佛罗伦萨", "那不勒斯", "都灵", "其他"],
  西班牙: ["马德里", "巴塞罗那", "塞维利亚", "瓦伦西亚", "毕尔巴鄂", "其他"],
  澳大利亚: [
    "悉尼",
    "墨尔本",
    "布里斯班",
    "珀斯",
    "阿德莱德",
    "堪培拉",
    "其他",
  ],
  加拿大: ["多伦多", "温哥华", "蒙特利尔", "卡尔加里", "渥太华", "其他"],
  新加坡: ["新加坡"],
  泰国: ["曼谷", "清迈", "普吉", "芭提雅", "其他"],
  越南: ["河内", "胡志明市", "岘港", "其他"],
  马来西亚: ["吉隆坡", "槟城", "新山", "其他"],
  印度: ["孟买", "新德里", "班加罗尔", "钦奈", "加尔各答", "其他"],
  巴西: ["圣保罗", "里约热内卢", "巴西利亚", "其他"],
  阿根廷: ["布宜诺斯艾利斯", "科尔多瓦", "其他"],
  俄罗斯: ["莫斯科", "圣彼得堡", "叶卡捷琳堡", "其他"],
  土耳其: ["伊斯坦布尔", "安卡拉", "伊兹密尔", "其他"],
  埃及: ["开罗", "亚历山大", "其他"],
  南非: ["约翰内斯堡", "开普敦", "德班", "其他"],
  墨西哥: ["墨西哥城", "瓜达拉哈拉", "蒙特雷", "其他"],
  "其他国家/地区": ["其他"],
};

function cuUpdateCityOptions() {
  const co = document.getElementById("cuOriginCountry");
  const ci = document.getElementById("cuOriginCity");
  if (!co || !ci) return;
  const cities = CU_CITIES[co.value] || [];
  ci.innerHTML =
    '<option value="">— 请选择城市 —</option>' +
    cities.map((c) => `<option value="${c}">${c}</option>`).join("");
}

/* ── 保存用户 ── */
async function cuSaveUser() {
  const name = document.getElementById("cuNickname")?.value.trim() || "未命名";
  const age = document.getElementById("cuAge")?.value.trim() || "";
  const bio = document.getElementById("cuBio")?.value.trim() || "";
  const country = document.getElementById("cuOriginCountry")?.value || "";
  const city = document.getElementById("cuOriginCity")?.value || "";

  const users = ChatStore.getUsers();

  if (cuEditingId) {
    /* ── 编辑已有 ── */
    const u = users.find((x) => x.id === cuEditingId);
    if (u) {
      u.name = name;
      u.gender = cuGender;
      u.age = age;
      u.country = country;
      u.city = city;
      u.bio = bio;
      if (cuAvatarData) {
        await ChatImgDB.put("cu_avatar_" + u.id, cuAvatarData);
      }
    }
  } else {
    /* ── 新建 ── */
    const uid = "u_" + Date.now();
    const u = {
      id: uid,
      name,
      gender: cuGender,
      age,
      country,
      city,
      bio,
      createdAt: Date.now(),
    };
    users.push(u);
    if (cuAvatarData) {
      await ChatImgDB.put("cu_avatar_" + uid, cuAvatarData);
    }
    if (users.length === 1) ChatStore.setActiveId(uid);
  }

  ChatStore.saveUsers(users);

  /* 重置表单状态 */
  cuEditingId = null;
  cuAvatarData = null;
  cuGender = "";
  _cuResetForm();
  _cuSetFormVisible(false);

  /* 先渲染列表，再同步主页 */
  await cuRenderUserList();
  chatRenderProfile();
  _cuShowToast("保存成功 ✓");
}

/* ── Toast ── */
function _cuShowToast(msg) {
  const t = document.getElementById("cuToast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("cu-toast-show");
  setTimeout(() => t.classList.remove("cu-toast-show"), 2200);
}

/* ── 渲染用户列表（异步，需要从 IndexedDB 加载头像） ── */
async function cuRenderUserList() {
  const users = ChatStore.getUsers();
  const activeId = ChatStore.getActiveId();
  const wrap = document.getElementById("cuUserList");
  if (!wrap) return;

  /* 清除旧条目，保留 empty 节点 */
  Array.from(wrap.children).forEach((c) => {
    if (c.id !== "cuUserListEmpty") c.remove();
  });

  const emptyEl = document.getElementById("cuUserListEmpty");

  if (users.length === 0) {
    if (emptyEl) emptyEl.style.display = "block";
    return;
  }
  if (emptyEl) emptyEl.style.display = "none";

  for (const u of users) {
    const isActive = u.id === activeId;

    /* 从 IndexedDB 读头像 */
    const avatarData = await ChatImgDB.get("cu_avatar_" + u.id).catch(
      () => null,
    );

    const avatarHTML = avatarData
      ? `<img src="${avatarData}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;" />`
      : `<div class="cu-user-avatar-default">
                   <svg viewBox="0 0 40 40" fill="none">
                       <circle cx="20" cy="20" r="20" fill="#e4e4e2"/>
                       <circle cx="20" cy="15" r="7" fill="#c8c8c5"/>
                       <ellipse cx="20" cy="33" rx="12" ry="8" fill="#c8c8c5"/>
                   </svg>
               </div>`;

    const sub = [
      u.gender,
      u.age ? u.age + "岁" : "",
      [u.country, u.city].filter(Boolean).join(" · "),
    ]
      .filter(Boolean)
      .join(" · ");

    const div = document.createElement("div");
    div.className = "cu-user-item" + (isActive ? " cu-user-active" : "");
    div.dataset.uid = u.id;
    div.innerHTML = `
            <div class="cu-user-avatar">${avatarHTML}</div>
            <div class="cu-user-info">
                <div class="cu-user-name">${_cuEsc(u.name)}</div>
                <div class="cu-user-sub">${_cuEsc(sub) || "暂无信息"}</div>
            </div>
            ${isActive ? '<span class="cu-active-badge">当前</span>' : ""}
            <div class="cu-user-actions">
                <button class="cu-user-switch"
                    onclick="event.stopPropagation();cuSwitchUser('${u.id}')">
                    ${isActive ? "已启用" : "切换"}
                </button>
                <button class="cu-user-del"
                    onclick="event.stopPropagation();cuDeleteUser('${u.id}')" title="删除">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                        <path d="M10 11v6M14 11v6"/>
                    </svg>
                </button>
            </div>`;
    div.addEventListener("click", () => cuEditUser(u.id));
    wrap.appendChild(div);
  }
}

/* ── 切换激活用户 ── */
function cuSwitchUser(uid) {
  ChatStore.setActiveId(uid);
  cuRenderUserList();
  chatRenderProfile();
  _cuShowToast("已切换身份 ✓");
}

/* ── 删除用户 ── */
async function cuDeleteUser(uid) {
  if (!confirm("确定删除该身份？")) return;
  await ChatImgDB.del("cu_avatar_" + uid).catch(() => {});
  let users = ChatStore.getUsers().filter((u) => u.id !== uid);
  ChatStore.saveUsers(users);
  if (ChatStore.getActiveId() === uid) {
    ChatStore.setActiveId(users.length ? users[0].id : null);
  }
  cuRenderUserList();
  chatRenderProfile();
}

/* ── 编辑用户 ── */
async function cuEditUser(uid) {
  const u = ChatStore.getUsers().find((x) => x.id === uid);
  if (!u) return;

  cuEditingId = uid;
  cuGender = u.gender || "";

  /* 从 IndexedDB 读头像 */
  cuAvatarData = await ChatImgDB.get("cu_avatar_" + uid).catch(() => null);
  const img = document.getElementById("cuAvatarImg");
  const ph = document.getElementById("cuAvatarPH");
  if (cuAvatarData) {
    img.src = cuAvatarData;
    img.style.display = "block";
    ph.style.display = "none";
  } else {
    img.style.display = "none";
    ph.style.display = "flex";
  }

  document.getElementById("cuNickname").value = u.name || "";
  document.getElementById("cuAge").value = u.age || "";
  document.getElementById("cuBio").value = u.bio || "";
  document.getElementById("cuOriginCountry").value = u.country || "";
  cuUpdateCityOptions();
  document.getElementById("cuOriginCity").value = u.city || "";
  document.querySelectorAll(".cu-gender-btn").forEach((b) => {
    b.classList.toggle("cu-gender-active", b.dataset.gender === cuGender);
  });

  _cuSetFormVisible(true);
  setTimeout(() => {
    const sc = document.getElementById("cuScroll");
    if (sc) sc.scrollTo({ top: sc.scrollHeight, behavior: "smooth" });
  }, 80);
}

/* ── HTML 转义 ── */
function _cuEsc(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ═══════════════════════════════════════════════════════
   对话面板 (Talk) — 分组 · 创建角色 · 会话列表
═══════════════════════════════════════════════════════ */
/* ════════════════════════════════
   TalkStore — 全部走 IndexedDB，彻底告别 localStorage 5MB 限制
════════════════════════════════ */
const TalkDB = (() => {
  const DB_NAME = "xxj_talk_store";
  const DB_VER = 1;
  const STORE = "kv";
  let _db = null;

  function open() {
    if (_db) return Promise.resolve(_db);
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = (e) => {
        e.target.result.createObjectStore(STORE);
      };
      req.onsuccess = (e) => {
        _db = e.target.result;
        resolve(_db);
      };
      req.onerror = (e) => reject(e.target.error);
    });
  }

  function set(key, value) {
    return open().then(
      (db) =>
        new Promise((resolve, reject) => {
          const req = db
            .transaction(STORE, "readwrite")
            .objectStore(STORE)
            .put(value, key);
          req.onsuccess = () => resolve(true);
          req.onerror = (e) => reject(e.target.error);
        }),
    );
  }

  function get(key, fallback) {
    return open()
      .then(
        (db) =>
          new Promise((resolve, reject) => {
            const req = db
              .transaction(STORE, "readonly")
              .objectStore(STORE)
              .get(key);
            req.onsuccess = (e) =>
              resolve(
                e.target.result !== undefined ? e.target.result : fallback,
              );
            req.onerror = (e) => reject(e.target.error);
          }),
      )
      .catch(() => fallback);
  }

  return { set, get };
})();

const TalkStore = {
  GROUPS_KEY: "xxj_talk_groups",
  CHARS_KEY: "xxj_talk_chars",
  CONVS_KEY: "xxj_talk_convs",

  /* ── 同步读（优先内存缓存，兜底 localStorage 旧数据） ── */
  _cache: {},

  _getSync(key) {
    if (this._cache[key] !== undefined) return this._cache[key];
    /* 兜底：读 localStorage 旧数据（首次迁移时用） */
    try {
      return JSON.parse(localStorage.getItem(key)) || [];
    } catch {
      return [];
    }
  },

  /* ── 异步预加载（页面初始化时调用一次） ── */
  async preload() {
    const [groups, chars, convs] = await Promise.all([
      TalkDB.get(this.GROUPS_KEY, null),
      TalkDB.get(this.CHARS_KEY, null),
      TalkDB.get(this.CONVS_KEY, null),
    ]);
    /* IndexedDB 有数据就用，否则迁移 localStorage 旧数据 */
    this._cache[this.GROUPS_KEY] =
      groups !== null
        ? groups
        : (() => {
            try {
              return JSON.parse(localStorage.getItem(this.GROUPS_KEY)) || [];
            } catch {
              return [];
            }
          })();
    this._cache[this.CHARS_KEY] =
      chars !== null
        ? chars
        : (() => {
            try {
              return JSON.parse(localStorage.getItem(this.CHARS_KEY)) || [];
            } catch {
              return [];
            }
          })();
    this._cache[this.CONVS_KEY] =
      convs !== null
        ? convs
        : (() => {
            try {
              return JSON.parse(localStorage.getItem(this.CONVS_KEY)) || [];
            } catch {
              return [];
            }
          })();
    /* 迁移完成后清掉 localStorage 里的旧数据，释放空间 */
    localStorage.removeItem(this.GROUPS_KEY);
    localStorage.removeItem(this.CHARS_KEY);
    localStorage.removeItem(this.CONVS_KEY);
  },

  getGroups() {
    return this._getSync(this.GROUPS_KEY);
  },
  saveGroups(arr) {
    this._cache[this.GROUPS_KEY] = arr;
    TalkDB.set(this.GROUPS_KEY, arr).catch((e) =>
      console.error("[TalkStore] saveGroups 失败:", e),
    );
  },

  getChars() {
    return this._getSync(this.CHARS_KEY);
  },
  saveChars(arr) {
    this._cache[this.CHARS_KEY] = arr;
    TalkDB.set(this.CHARS_KEY, arr).catch((e) =>
      console.error("[TalkStore] saveChars 失败:", e),
    );
  },

  getConvs() {
    return this._getSync(this.CONVS_KEY);
  },
  saveConvs(arr) {
    this._cache[this.CONVS_KEY] = arr;
    TalkDB.set(this.CONVS_KEY, arr).catch((e) =>
      console.error("[TalkStore] saveConvs 失败:", e),
    );
  },
};

/* ────────────────────────────────
   当前激活分组
──────────────────────────────── */
let _talkActiveCharId = null;
let _talkActiveGroup = "default";

/* ────────────────────────────────
   Tab 切换时初始化对话面板
──────────────────────────────── */
function chatSwitchTab(tab) {
  ["talk", "feed", "profile"].forEach((t) => {
    const panel = document.getElementById(`chatPanel-${t}`);
    const dock = document.getElementById(`chatDock-${t}`);
    if (panel) panel.classList.toggle("hidden", t !== tab);
    if (dock) dock.classList.toggle("chat-dock-active", t === tab);
  });
  // 顶栏加号按钮：只在 talk 面板显示
  const addBtn = document.getElementById("talkTopbarAddBtn");
  const addPH = document.getElementById("talkTopbarAddPlaceholder");
  if (addBtn && addPH) {
    addBtn.style.display = tab === "talk" ? "flex" : "none";
    addPH.style.display = tab === "talk" ? "none" : "block";
  }
  if (tab === "profile") chatRenderProfile();
  if (tab === "talk") talkInit();
}

/* ────────────────────────────────
   初始化对话面板
──────────────────────────────── */
let _talkInited = false;
async function talkInit() {
  if (!_talkInited) {
    await TalkStore.preload(); /* 只首次从 IndexedDB 加载 */
    _talkInited = true;
  }
  talkRenderGroupBar();
  talkRenderConvList();
  talkRenderUserCard();
}

/* ────────────────────────────────
   渲染分组胶囊
──────────────────────────────── */
function talkRenderGroupBar() {
  const scroll = document.getElementById("talkGroupScroll");
  if (!scroll) return;

  /* 清除旧胶囊（保留加号按钮） */
  Array.from(scroll.children).forEach((c) => {
    if (!c.classList.contains("talk-group-add")) c.remove();
  });

  const addBtn = scroll.querySelector(".talk-group-add");

  /* 全部胶囊 */
  const allPill = _makePill("default", "全部", _talkActiveGroup === "default");
  scroll.insertBefore(allPill, addBtn);

  /* 用户自定义分组 */
  TalkStore.getGroups().forEach((g) => {
    scroll.insertBefore(
      _makePill(g.id, g.name, _talkActiveGroup === g.id),
      addBtn,
    );
  });
}

function _makePill(gid, name, active) {
  const btn = document.createElement("button");
  btn.className = "talk-group-pill" + (active ? " talk-group-active" : "");
  btn.dataset.gid = gid;
  btn.textContent = name;
  btn.onclick = () => talkSwitchGroup(gid, btn);
  return btn;
}

/* ────────────────────────────────
   切换分组
──────────────────────────────── */
function talkSwitchGroup(gid, btn) {
  _talkActiveGroup = gid;
  document.querySelectorAll(".talk-group-pill").forEach((p) => {
    p.classList.toggle("talk-group-active", p.dataset.gid === gid);
  });
  talkRenderConvList();
}

/* ────────────────────────────────
   新增分组
──────────────────────────────── */
function talkAddGroup() {
  const name = prompt("请输入分组名称：");
  if (!name || !name.trim()) return;
  const groups = TalkStore.getGroups();
  const gid = "g_" + Date.now();
  groups.push({ id: gid, name: name.trim() });
  TalkStore.saveGroups(groups);
  talkRenderGroupBar();
  talkSwitchGroup(gid, null);
}

/* ────────────────────────────────
   渲染会话列表
──────────────────────────────── */
async function talkRenderConvList() {
  const listEl = document.getElementById("talkList");
  if (!listEl) return;
  listEl.innerHTML = "";

  const chars = TalkStore.getChars();
  const convs = TalkStore.getConvs();

  /* 过滤当前分组 */
  let filteredChars = chars;
  if (_talkActiveGroup !== "default") {
    filteredChars = chars.filter((c) => c.groupId === _talkActiveGroup);
  }

  if (filteredChars.length === 0) {
    listEl.innerHTML = `
            <div class="talk-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                </svg>
                <span>暂无对话，点击右上角 + 创建</span>
            </div>`;
    return;
  }

  /* ── 构建所有条目 DOM ── */
  const items = [];
  for (const char of filteredChars) {
    const conv = convs.find((c) => c.charId === char.id) || null;
    const avData = await ChatImgDB.get("char_avatar_" + char.id).catch(
      () => null,
    );

    const avatarHTML = avData
      ? `<img src="${avData}" alt=""/>`
      : `<div class="talk-conv-avatar-default">
                   <svg viewBox="0 0 40 40" fill="none">
                       <circle cx="20" cy="20" r="20" fill="#e4e4e2"/>
                       <circle cx="20" cy="15" r="7" fill="#c8c8c5"/>
                       <ellipse cx="20" cy="33" rx="12" ry="8" fill="#c8c8c5"/>
                   </svg>
               </div>`;

    const lastMsg = conv ? conv.lastMsg : "开始聊天吧…";
    const lastTime = conv ? _talkFmtTime(conv.lastTime) : "";

    const item = document.createElement("div");
    item.className = "talk-conv-item";
    item.dataset.charId = char.id;
    item.innerHTML = `
            <div class="talk-conv-avatar">${avatarHTML}</div>
            <div class="talk-conv-info">
                <div class="talk-conv-name">${_cuEsc(char.name)}</div>
                <div class="talk-conv-last">${_cuEsc(lastMsg)}</div>
            </div>
            <div class="talk-conv-meta">
                <span class="talk-conv-time">${lastTime}</span>
            </div>`;
    item.addEventListener("click", () => talkOpenConv(char.id));
    items.push(item);
  }

  /* ── 按 2-3-2-3… 分组，每组包进圆角卡片 ── */
  const pattern = [2, 3];
  let idx = 0,
    patIdx = 0;
  while (idx < items.length) {
    const groupSize = pattern[patIdx % pattern.length];
    const group = document.createElement("div");
    group.className = "talk-conv-group";
    const slice = items.slice(idx, idx + groupSize);
    slice.forEach((item) => group.appendChild(item));
    listEl.appendChild(group);
    idx += groupSize;
    patIdx++;
  }
}

function _talkFmtTime(ts) {
  if (!ts) return "";
  const d = new Date(ts),
    now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return (
      d.getHours().toString().padStart(2, "0") +
      ":" +
      d.getMinutes().toString().padStart(2, "0")
    );
  }
  return d.getMonth() + 1 + "/" + d.getDate();
}

/* ────────────────────────────────
   顶栏加号菜单 开/关
──────────────────────────────── */
function talkToggleFabMenu() {
  const menu = document.getElementById("talkFabMenu");
  if (!menu) return;
  menu.classList.toggle("hidden");
}

function talkCloseFabMenu() {
  document.getElementById("talkFabMenu")?.classList.add("hidden");
}

/* ────────────────────────────────
   打开 / 关闭「创建角色」浮层
──────────────────────────────── */
let _charAvatarData = null;
let _charGender = "";

function talkOpenCreateChar() {
  talkCloseFabMenu();
  _charAvatarData = null;
  _charGender = "";
  _charLinkedUserId = "";
  _charResetForm();
  _charRefreshMinimaxStatus();
  _charFillGroupSelect();
  _charFillUserPick();
  const sheet = document.getElementById("charCreateSheet");
  if (sheet) sheet.classList.remove("hidden");
}

function talkCloseCreateChar() {
  document.getElementById("charCreateSheet")?.classList.add("hidden");
  /* 无论编辑还是创建模式，关闭时统一还原 */
  _talkEditingCharId = null;
  const saveBtn = document.querySelector("#charCreateSheet .cu-save-btn");
  if (saveBtn) {
    saveBtn.textContent = "创建角色";
    saveBtn.onclick = () => charSaveCreate();
  }
  const titleEl = document.querySelector("#charCreateSheet .talk-sheet-title");
  if (titleEl) titleEl.textContent = "创建角色";
}

function talkOpenCreateGroup() {
  talkCloseFabMenu();
  document.getElementById("groupCreateSheet")?.classList.remove("hidden");
}

function talkCloseCreateGroup() {
  document.getElementById("groupCreateSheet")?.classList.add("hidden");
}

/* ── 重置创建角色表单 ── */
function _charResetForm() {
  const img = document.getElementById("charAvatarImg");
  const ph = document.getElementById("charAvatarPH");
  if (img) {
    img.style.display = "none";
    img.src = "";
  }
  if (ph) ph.style.display = "flex";
  ["charName", "charNickname", "charVoiceId"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  const det = document.getElementById("charDetail");
  if (det) det.value = "";
  const ve = document.getElementById("charVoiceEnabled");
  if (ve) ve.checked = false;
  document
    .querySelectorAll("#charCreateSheet .cu-gender-btn")
    .forEach((b) => b.classList.remove("cu-gender-active"));
  const cc = document.getElementById("charCountry");
  if (cc) cc.value = "";
  charUpdateCityOptions();
  _charGender = "";
}

/* ── 填充分组选择 ── */
function _charFillGroupSelect() {
  const sel = document.getElementById("charGroupSelect");
  if (!sel) return;
  const groups = TalkStore.getGroups();
  sel.innerHTML =
    '<option value="default">全部（无分组）</option>' +
    groups
      .map((g) => `<option value="${g.id}">${_cuEsc(g.name)}</option>`)
      .join("");
  /* 默认选中当前激活分组 */
  if (_talkActiveGroup !== "default") sel.value = _talkActiveGroup;
}

/* ── MiniMax 状态显示 ── */
function _charRefreshMinimaxStatus() {
  const el = document.getElementById("charMinimaxStatus");
  if (!el) return;
  const key = localStorage.getItem("xxj_minimax_key") || "";
  const gid = localStorage.getItem("xxj_minimax_group") || "";
  const vid = localStorage.getItem("xxj_minimax_voice") || "";
  if (key) {
    el.className = "char-minimax-status ok";
    el.textContent = `✓ API 已配置，可直接对话${key && gid ? `（语音：${vid || "未启用"}）` : "（未配置语音，对话仍可用）"}`;
  } else {
    el.className = "char-minimax-status err";
    el.textContent =
      "⚠ 未配置 API Key，请前往 设置 → API 设置 填写（语音可选，不填仍可对话）";
  }
}

/* ── 头像 ── */
function charTriggerAvatar() {
  document.getElementById("charAvatarInput")?.click();
}
async function charHandleAvatar(e) {
  const file = e.target.files[0];
  if (!file) return;
  e.target.value = "";
  _charAvatarData = await _chatReadFile(file);
  const img = document.getElementById("charAvatarImg");
  const ph = document.getElementById("charAvatarPH");
  img.src = _charAvatarData;
  img.style.display = "block";
  ph.style.display = "none";
}

/* ── 性别 ── */
function charSetGender(g, btn) {
  _charGender = g;
  document
    .querySelectorAll("#charCreateSheet .cu-gender-btn")
    .forEach((b) => b.classList.remove("cu-gender-active"));
  btn.classList.add("cu-gender-active");
}

/* ── 城市联动（复用 CU_CITIES） ── */
function charUpdateCityOptions() {
  const co = document.getElementById("charCountry");
  const ci = document.getElementById("charCity");
  if (!co || !ci) return;
  const cities = CU_CITIES[co.value] || [];
  ci.innerHTML =
    '<option value="">— 请选择城市 —</option>' +
    cities.map((c) => `<option value="${c}">${c}</option>`).join("");
}

/* ── 保存创建角色 ── */
async function charSaveCreate() {
  const name = document.getElementById("charName")?.value.trim();
  if (!name) {
    alert("请填写角色姓名");
    return;
  }

  const cid = "ch_" + Date.now();
  const char = {
    id: cid,
    name: name,
    nickname: document.getElementById("charNickname")?.value.trim() || "",
    gender: _charGender,
    groupId: document.getElementById("charGroupSelect")?.value || "default",
    country: document.getElementById("charCountry")?.value || "",
    city: document.getElementById("charCity")?.value || "",
    detail: document.getElementById("charDetail")?.value.trim() || "",
    voiceId: document.getElementById("charVoiceId")?.value.trim() || "",
    voiceEnabled: document.getElementById("charVoiceEnabled")?.checked || false,
    linkedUserId: _charLinkedUserId || "",
    createdAt: Date.now(),
  };

  /* 存头像 */
  if (_charAvatarData) {
    await ChatImgDB.put("char_avatar_" + cid, _charAvatarData);
  }

  /* 存角色 */
  const chars = TalkStore.getChars();
  chars.push(char);
  TalkStore.saveChars(chars);

  /* 创建会话条目 */
  const convs = TalkStore.getConvs();
  convs.unshift({
    id: "cv_" + Date.now(),
    charId: cid,
    lastMsg: "",
    lastTime: Date.now(),
    unread: 0,
  });
  TalkStore.saveConvs(convs);

  /* 关闭浮层，切换到对应分组，刷新列表 */
  talkCloseCreateChar();
  _charResetForm(); /* 顺手重置表单 */
  talkRenderGroupBar();
  await talkRenderConvList(); /* 直接 await，无需延迟 */

  _cuShowToast("角色已创建 ✓");
}

/* ── 打开对话 ── */
async function talkOpenConv(charId) {
  const chars = TalkStore.getChars();
  const char = chars.find((c) => c.id === charId);
  if (!char) return;

  _talkActiveCharId = charId;

  /* ── 显示对话页面 ── */ // ← 在这里加这两行
  const convPage = document.getElementById("talkConvPage");
  if (convPage) convPage.classList.remove("hidden");

  /* 顶栏：char 名称 + 地区 */
  const nameEl = document.getElementById("tcpCharName");
  const locEl = document.getElementById("tcpCharLoc");
  if (nameEl) nameEl.textContent = char.name || "";
  if (locEl)
    locEl.textContent = [char.country, char.city].filter(Boolean).join(" · ");

  /* char 头像 */
  const charAvImg = document.getElementById("tcpCharAvImg");
  const charAvPH = document.querySelector("#tcpCharAv .tcp-av-ph");
  const charAvData = await ChatImgDB.get("char_avatar_" + charId).catch(
    () => null,
  );
  if (charAvData && charAvImg) {
    charAvImg.src = charAvData;
    charAvImg.classList.remove("hidden");
    if (charAvPH) charAvPH.style.display = "none";
  } else {
    if (charAvImg) charAvImg.classList.add("hidden");
    if (charAvPH) charAvPH.style.display = "flex";
  }

  /* user 头像：优先 char.linkedUserId，否则全局 activeUser */
  const users = ChatStore.getUsers();
  const activeId = ChatStore.getActiveId();
  const uid = char.linkedUserId || activeId;
  const userAvImg = document.getElementById("tcpUserAvImg");
  const userAvPH = document.querySelector("#tcpUserAv .tcp-av-ph");
  const userAvData = uid
    ? await ChatImgDB.get("cu_avatar_" + uid).catch(() => null)
    : null;
  if (userAvData && userAvImg) {
    userAvImg.src = userAvData;
    userAvImg.classList.remove("hidden");
    if (userAvPH) userAvPH.style.display = "none";
  } else {
    if (userAvImg) userAvImg.classList.add("hidden");
    if (userAvPH) userAvPH.style.display = "flex";
  }

  /* ── 渲染历史消息 ── */
  await _tcpRenderMessages(charId);
}

/* ── 渲染消息 ── */
async function _tcpRenderMessages(charId) {
  const box = document.getElementById("tcpMessages");
  if (!box) return;
  box.innerHTML = "";

  const char = TalkStore.getChars().find((c) => c.id === charId) || null; // ← 新增
  const memRounds = Number(char?.settings?.memoryRounds ?? 20);
  const allMsgs = _tcpGetMsgs(charId);
  const msgs = memRounds > 0 ? allMsgs.slice(-(memRounds * 2)) : allMsgs;
  const charAvData = await ChatImgDB.get("char_avatar_" + charId).catch(
    () => null,
  );

  const avHTML = charAvData
    ? `<div class="tcp-bubble-av"><img src="${charAvData}" alt=""/></div>`
    : `<div class="tcp-bubble-av"><svg viewBox="0 0 40 40" fill="none">
               <circle cx="20" cy="20" r="20" fill="#e4e4e2"/>
               <circle cx="20" cy="15" r="7" fill="#c8c8c5"/>
               <ellipse cx="20" cy="33" rx="12" ry="8" fill="#c8c8c5"/>
           </svg></div>`;

  /* 多选模式状态 */
  if (!box._multiSelect) box._multiSelect = false;

  msgs.forEach((m, i) => {
    /* 撤回消息：显示通知行 */
    if (m.recalled) {
      const recallEl = document.createElement("div");
      recallEl.className = "tcp-recall-notice";
      const charName = (() => {
        try {
          return (
            TalkStore.getChars().find((c) => c.id === charId)?.name || "对方"
          );
        } catch {
          return "对方";
        }
      })();
      recallEl.textContent =
        m.role === "user" ? "你撤回了一条消息" : `${charName}撤回了一条消息`;
      recallEl.dataset.msgIndex = i;
      box.appendChild(recallEl);
      return;
    }

    /* 引用消息：构建引用块 HTML */
    let quoteHTML = "";
    if (m.quoteIndex !== undefined && msgs[m.quoteIndex]) {
      const qm = msgs[m.quoteIndex];
      const charName = (() => {
        try {
          return (
            TalkStore.getChars().find((c) => c.id === charId)?.name || "对方"
          );
        } catch {
          return "对方";
        }
      })();
      const qSender = qm.role === "user" ? "你" : charName;
      quoteHTML = `<div class="tcp-quote-block" data-qi="${m.quoteIndex}">
                <span class="tcp-quote-sender">${_cuEsc(qSender)}</span>
                <span class="tcp-quote-text">${_cuEsc(qm.text.slice(0, 40))}${qm.text.length > 40 ? "…" : ""}</span>
            </div>`;
    }

    const wrap = document.createElement("div");
    const isChar = m.role === "char";
    const prevIsChar =
      i > 0 && msgs[i - 1]?.role === "char" && !msgs[i - 1]?.recalled;
    const nextIsChar =
      i < msgs.length - 1 &&
      msgs[i + 1]?.role === "char" &&
      !msgs[i + 1]?.recalled;

    if (isChar) {
      wrap.className =
        "tcp-bubble-wrap char" + (prevIsChar ? " tcp-no-av" : "");
      const showTime = !nextIsChar;
      wrap.innerHTML =
        avHTML +
        `<div class="tcp-bubble" data-index="${i}">${quoteHTML}${_cuEsc(m.text)}</div>` +
        (showTime
          ? `<span class="tcp-bubble-time">${_tcpFmtTime(m.ts)}</span>`
          : "");
    } else {
      wrap.className = "tcp-bubble-wrap user";
      wrap.innerHTML = `<span class="tcp-bubble-time">${_tcpFmtTime(m.ts)}</span>
                 <div class="tcp-bubble" data-index="${i}">${quoteHTML}${_cuEsc(m.text)}</div>`;
    }

    /* 气泡点击 → 弹出横排菜单 */
    const bubble = wrap.querySelector(".tcp-bubble");
    bubble.addEventListener("click", (e) => {
      e.stopPropagation();
      if (box._multiSelect) {
        _tcpToggleSelect(wrap, i);
        return;
      }
      _tcpShowBubbleMenu(bubble, i, m.role, charId, msgs);
    });

    /* 多选勾选框（默认隐藏） */
    const chk = document.createElement("div");
    chk.className = "tcp-multisel-chk";
    chk.dataset.index = i;
    wrap.appendChild(chk);

    box.appendChild(wrap);
  });

  /* 多选工具栏 */
  _tcpRenderMultiBar(charId);

  setTimeout(() => {
    box.scrollTop = box.scrollHeight;
  }, 30);
}

/* ── 横排气泡菜单 ── */
function _tcpShowBubbleMenu(bubble, index, role, charId, msgs) {
  /* 先移除旧菜单 */
  document.getElementById("tcpBubbleMenu")?.remove();

  const chars = TalkStore.getChars();
  const char = chars.find((c) => c.id === charId);
  const charName = char?.name || "对方";
  const isUser = role === "user";

  const menu = document.createElement("div");
  menu.id = "tcpBubbleMenu";
  menu.className =
    "tcp-bubble-menu" +
    (isUser ? " tcp-bubble-menu-user" : " tcp-bubble-menu-char");

  const actions = [
    {
      label: "重回",
      icon: "↩",
      show: role === "char",
      fn: () => _tcpRegret(index, charId),
    },
    {
      label: "编辑",
      icon: "✏",
      show: true,
      fn: () => _tcpEditMsg(index, charId),
    },
    {
      label: "收藏",
      icon: "☆",
      show: true,
      fn: () => _tcpFavorite(index, charId, msgs),
    },
    {
      label: "撤回",
      icon: "⊘",
      show: true,
      fn: () => _tcpRecall(index, charId, charName, role),
    },
    {
      label: "引用",
      icon: "❝",
      show: true,
      fn: () => _tcpQuote(index, charId),
    },
    {
      label: "删除",
      icon: "✕",
      show: true,
      fn: () => _tcpDeleteMsg(index, charId),
    },
    {
      label: "多选",
      icon: "☑",
      show: true,
      fn: () => _tcpEnterMultiSelect(charId),
    },
  ];

  actions
    .filter((a) => a.show)
    .forEach((a) => {
      const btn = document.createElement("button");
      btn.className = "tcp-bmenu-btn";
      btn.innerHTML = `<span class="tcp-bmenu-icon">${a.icon}</span><span class="tcp-bmenu-label">${a.label}</span>`;
      btn.onclick = (e) => {
        e.stopPropagation();
        menu.remove();
        a.fn();
      };
      menu.appendChild(btn);
    });

  /* ── 挂到消息容器上，用绝对定位悬浮在气泡正上方 ── */
  const box = document.getElementById("tcpMessages");
  if (!box) return;
  /* tcpMessages 需要 position:relative，样式已加 */
  box.appendChild(menu);

  /* 计算气泡的位置，将菜单定位到气泡正上方 */
  requestAnimationFrame(() => {
    const bubbleRect = bubble.getBoundingClientRect();
    const boxRect = box.getBoundingClientRect();
    const menuW = menu.offsetWidth;
    const menuH = menu.offsetHeight;

    /* 垂直：气泡顶部上方 8px */
    let top = bubbleRect.top - boxRect.top + box.scrollTop - menuH - 8;
    if (top < box.scrollTop + 4)
      top =
        bubbleRect.bottom -
        boxRect.top +
        box.scrollTop +
        8; /* 若顶部空间不足改到气泡下方 */

    /* 水平：user气泡右对齐菜单右边；char气泡左对齐菜单左边 */
    let left;
    if (isUser) {
      left = bubbleRect.right - boxRect.left - menuW;
    } else {
      left = bubbleRect.left - boxRect.left;
    }
    /* 防止超出左右边界 */
    const maxLeft = boxRect.width - menuW - 4;
    left = Math.max(4, Math.min(left, maxLeft));

    menu.style.top = top + "px";
    menu.style.left = left + "px";
  });

  /* 点击其他区域关闭 */
  setTimeout(() => {
    document.addEventListener(
      "click",
      function _close() {
        menu.remove();
        document.removeEventListener("click", _close);
      },
      { once: true },
    );
  }, 10);
}

/* ── 重回（重新生成，支持风格提示） ── */
function _tcpRegret(index, charId) {
  const styleHint = prompt(
    "重回期望风格（可不填，直接确认）\n例如：温柔一点、主动一些、更简短",
    "",
  );
  if (styleHint === null) return; /* 取消 */

  const msgs = _tcpGetMsgs(charId);
  /* 删除从 index 开始往后所有 char 的连续消息（本次AI回复组） */
  let end = index;
  while (end < msgs.length && msgs[end].role === "char") end++;
  msgs.splice(index, end - index);
  _tcpSaveMsgs(charId, msgs);

  /* 触发重新生成，携带风格提示 */
  _tcpContinueWithStyle(charId, styleHint.trim());
}

async function _tcpContinueWithStyle(charId, styleHint) {
  if (_tcpIsGenerating) return;

  let apiKey = "",
    apiUrl = "",
    apiModel = "";
  if (typeof getActiveModel === "function") {
    const m = getActiveModel();
    if (m && m.key && m.url && m.model) {
      apiKey = m.key;
      apiUrl = m.url.replace(/\/$/, "") + "/chat/completions";
      apiModel = m.model;
    }
  }
  if (!apiKey) return;

  const chars = TalkStore.getChars();
  const char = chars.find((c) => c.id === charId);
  if (!char) return;

  const users = ChatStore.getUsers();
  const activeId = ChatStore.getActiveId();
  const uid = char.linkedUserId || activeId;
  const user = users.find((u) => u.id === uid) || null;

  const msgs = _tcpGetMsgs(charId);

  _tcpIsGenerating = true;
  _tcpShowTyping();

  try {
    const history = msgs.slice(-20).map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.text,
    }));

    let systemPrompt = _tcpBuildSystemPrompt(char, user);
    if (styleHint) {
      systemPrompt += `\n\n【本次风格要求】在不OOC、严格符合人设的前提下，请尽量做到：${styleHint}`;
    }

    const resp = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: apiModel,
        messages: [{ role: "system", content: systemPrompt }, ...history],
        temperature: 0.9,
        top_p: 0.95,
        max_tokens: 2000,
      }),
    });

    if (!resp.ok)
      throw new Error(`API错误 ${resp.status}: ${await resp.text()}`);
    const data = await resp.json();
    const rawText = data?.choices?.[0]?.message?.content || "";
    if (!rawText) throw new Error("API返回空内容");

    const parts = rawText
      .split(/\n?---\n?/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const now = Date.now();
    const storedMsgs = _tcpGetMsgs(charId);
    parts.forEach((text, i) =>
      storedMsgs.push({ role: "char", text, ts: now + i * 300 }),
    );
    _tcpSaveMsgs(charId, storedMsgs);

    const convs = TalkStore.getConvs();
    const conv = convs.find((c) => c.charId === charId);
    if (conv) {
      conv.lastMsg = parts[parts.length - 1];
      conv.lastTime = now + (parts.length - 1) * 300;
    }
    TalkStore.saveConvs(convs);
  } catch (err) {
    console.error("[重回]", err);
    const storedMsgs = _tcpGetMsgs(charId);
    storedMsgs.push({
      role: "char",
      text: `（回复失败：${err.message}）`,
      ts: Date.now(),
    });
    _tcpSaveMsgs(charId, storedMsgs);
  } finally {
    _tcpIsGenerating = false;
    _tcpHideTyping();
    _tcpRenderMessages(charId);
  }
}

/* ── 编辑消息 ── */
function _tcpEditMsg(index, charId) {
  const msgs = _tcpGetMsgs(charId);
  const m = msgs[index];
  if (!m) return;
  const newText = prompt("编辑消息内容：", m.text);
  if (newText === null) return;
  if (newText.trim() === "") return;
  msgs[index].text = newText.trim();
  msgs[index].edited = true;
  _tcpSaveMsgs(charId, msgs);
  _tcpRenderMessages(charId);
}

/* ── 收藏消息（存入个人主页收藏板块） ── */
function _tcpFavorite(index, charId, msgs) {
  const m = msgs[index];
  if (!m) return;
  const chars = TalkStore.getChars();
  const char = chars.find((c) => c.id === charId);
  const charName = char?.name || "对方";

  const favKey = "xxj_chat_favorites";
  let favs = [];
  try {
    favs = JSON.parse(localStorage.getItem(favKey) || "[]");
  } catch {}

  const item = {
    id: Date.now() + "_" + Math.random().toString(36).slice(2),
    charId,
    charName,
    role: m.role,
    text: m.text,
    ts: m.ts,
    savedAt: Date.now(),
  };
  favs.unshift(item);
  try {
    localStorage.setItem(favKey, JSON.stringify(favs));
  } catch {}

  /* 视觉反馈 */
  const box = document.getElementById("tcpMessages");
  const bubble = box?.querySelector(`.tcp-bubble[data-index="${index}"]`);
  if (bubble) {
    bubble.classList.add("tcp-bubble-faved");
    setTimeout(() => bubble.classList.remove("tcp-bubble-faved"), 1200);
  }
}

/* ── 撤回消息 ── */
function _tcpRecall(index, charId, charName, role) {
  const msgs = _tcpGetMsgs(charId);
  if (!msgs[index]) return;
  msgs[index].recalled = true;
  _tcpSaveMsgs(charId, msgs);
  _tcpRenderMessages(charId);
}

/* ── 引用消息 ── */
function _tcpQuote(index, charId) {
  /* 在输入框上方显示引用预览，发送时附带 quoteIndex */
  const msgs = _tcpGetMsgs(charId);
  const m = msgs[index];
  if (!m) return;
  const chars = TalkStore.getChars();
  const char = chars.find((c) => c.id === charId);
  const sender = m.role === "user" ? "你" : char?.name || "对方";

  /* 移除旧引用 */
  document.getElementById("tcpQuoteBar")?.remove();

  const bar = document.createElement("div");
  bar.id = "tcpQuoteBar";
  bar.className = "tcp-quote-bar";
  bar.dataset.quoteIndex = index;
  bar.innerHTML = `
        <div class="tcp-quote-bar-inner">
            <span class="tcp-quote-bar-sender">${_cuEsc(sender)}</span>
            <span class="tcp-quote-bar-text">${_cuEsc(m.text.slice(0, 60))}${m.text.length > 60 ? "…" : ""}</span>
        </div>
        <button class="tcp-quote-bar-close" onclick="document.getElementById('tcpQuoteBar')?.remove()">✕</button>`;

  const bottom = document.querySelector(".tcp-bottom");
  if (bottom) bottom.insertBefore(bar, bottom.firstChild);
}

/* ── 删除消息 ── */
function _tcpDeleteMsg(index, charId) {
  if (!confirm("确认删除这条消息？")) return;
  const msgs = _tcpGetMsgs(charId);
  msgs.splice(index, 1);
  _tcpSaveMsgs(charId, msgs);
  _tcpRenderMessages(charId);
}

/* ── 多选模式 ── */
function _tcpEnterMultiSelect(charId) {
  const box = document.getElementById("tcpMessages");
  if (!box) return;
  box._multiSelect = true;
  box._multiSelected = new Set();
  box.classList.add("tcp-multisel-mode");
  _tcpRenderMessages(charId);
}

function _tcpToggleSelect(wrap, index) {
  const box = document.getElementById("tcpMessages");
  const sel = box._multiSelected;
  if (sel.has(index)) {
    sel.delete(index);
    wrap.classList.remove("tcp-multisel-on");
  } else {
    sel.add(index);
    wrap.classList.add("tcp-multisel-on");
  }
  const bar = document.getElementById("tcpMultiBar");
  if (bar)
    bar.querySelector(".tcp-multibar-count").textContent =
      `已选 ${sel.size} 条`;
}

function _tcpRenderMultiBar(charId) {
  document.getElementById("tcpMultiBar")?.remove();
  const box = document.getElementById("tcpMessages");
  if (!box?._multiSelect) return;

  const bar = document.createElement("div");
  bar.id = "tcpMultiBar";
  bar.className = "tcp-multibar";
  bar.innerHTML = `
        <button class="tcp-multibar-cancel" onclick="_tcpExitMultiSelect('${charId}')">取消</button>
        <span class="tcp-multibar-count">已选 0 条</span>
        <button class="tcp-multibar-del" onclick="_tcpMultiDelete('${charId}')">删除</button>`;
  document
    .querySelector(".tcp-bottom")
    ?.insertAdjacentElement("beforebegin", bar);
}

function _tcpExitMultiSelect(charId) {
  const box = document.getElementById("tcpMessages");
  if (box) {
    box._multiSelect = false;
    box._multiSelected = new Set();
    box.classList.remove("tcp-multisel-mode");
  }
  document.getElementById("tcpMultiBar")?.remove();
  _tcpRenderMessages(charId);
}

function _tcpMultiDelete(charId) {
  const box = document.getElementById("tcpMessages");
  const sel = box?._multiSelected;
  if (!sel || sel.size === 0) return;
  if (!confirm(`确认删除选中的 ${sel.size} 条消息？`)) return;
  const msgs = _tcpGetMsgs(charId);
  const indices = Array.from(sel).sort(
    (a, b) => b - a,
  ); /* 从后往前删，保持index正确 */
  indices.forEach((i) => msgs.splice(i, 1));
  _tcpSaveMsgs(charId, msgs);
  box._multiSelect = false;
  box._multiSelected = new Set();
  box.classList.remove("tcp-multisel-mode");
  document.getElementById("tcpMultiBar")?.remove();
  _tcpRenderMessages(charId);
}

function _tcpFmtTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return (
    d.getHours().toString().padStart(2, "0") +
    ":" +
    d.getMinutes().toString().padStart(2, "0")
  );
}

/* ════════════════════════════════
   消息读写工具函数
════════════════════════════════ */
function _tcpGetMsgs(charId) {
  try {
    const raw = localStorage.getItem("xxj_talk_msgs_" + charId);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function _tcpSaveMsgs(charId, msgs) {
  try {
    localStorage.setItem("xxj_talk_msgs_" + charId, JSON.stringify(msgs));
  } catch (err) {
    console.warn("[tcp] saveMsgs 失败:", err);
  }
}

/* ════════════════════════════════
   发送消息（只存消息，不触发AI）
════════════════════════════════ */
function talkConvSend() {
  const input = document.getElementById("tcpInput");
  if (!input || !_talkActiveCharId) return;
  const text = input.value.trim();
  if (!text) return;

  const msgs = _tcpGetMsgs(_talkActiveCharId);
  const newMsg = { role: "user", text, ts: Date.now() };

  /* 携带引用 */
  const quoteBar = document.getElementById("tcpQuoteBar");
  if (quoteBar) {
    const qi = parseInt(quoteBar.dataset.quoteIndex);
    if (!isNaN(qi)) newMsg.quoteIndex = qi;
    quoteBar.remove();
  }

  msgs.push(newMsg);
  _tcpSaveMsgs(_talkActiveCharId, msgs);

  const convs = TalkStore.getConvs();
  const conv = convs.find((c) => c.charId === _talkActiveCharId);
  if (conv) {
    conv.lastMsg = text;
    conv.lastTime = Date.now();
  } else {
    /* 首次发消息时 conv 记录不存在，补建一条 */
    convs.push({
      charId: _talkActiveCharId,
      lastMsg: text,
      lastTime: Date.now(),
    });
  }
  TalkStore.saveConvs(convs);

  input.value = "";
  tcpAutoResize(input);
  _tcpRenderMessages(_talkActiveCharId);
}

/* ── 输入框自动伸缩 ── */
function tcpAutoResize(el) {
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 100) + "px";
}

/* ── Enter 只发送，不触发AI ── */
function tcpKeyDown(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    talkConvSend();
  }
}

function talkConvTool() {
  /* 工具栏占位 */
}
function talkConvEmoji() {
  /* 表情占位 */
}
/* ════════════════════════════════
   聊天设置面板
════════════════════════════════ */

/* 当前设置面板对应的 charId */
let _tcsCharId = null;

/* 打开设置面板 */
async function talkOpenSettings() {
  const charId = _talkActiveCharId;
  if (!charId) return;
  _tcsCharId = charId;

  const panel = document.getElementById("tcpSettingsPanel");
  if (!panel) return;
  // 直接加 open，CSS transition 负责动画
  panel.classList.add("open");

  await _tcsLoadPanel(charId);
}

/* 关闭设置面板 */
function talkCloseSettings() {
  const panel = document.getElementById("tcpSettingsPanel");
  if (!panel) return;
  panel.classList.remove("open");
  // 无需操作 hidden，transform 回到 translateX(100%) 即不可见
}

/* 加载面板数据 */
async function _tcsLoadPanel(charId) {
  const chars = TalkStore.getChars();
  const char = chars.find((c) => c.id === charId);
  if (!char) return;

  /* ── 头像 ── */
  const [charAv, userAv] = await Promise.all([
    ChatImgDB.get("char_avatar_" + charId).catch(() => null),
    char.linkedUserId
      ? ChatImgDB.get("cu_avatar_" + char.linkedUserId).catch(() => null)
      : Promise.resolve(null),
  ]);
  _tcsSetAvatar("tcsAvCharImg", "tcsAvCharPH", charAv);
  _tcsSetAvatar("tcsAvUserImg", "tcsAvUserPH", userAv);

  /* ── 备注 ── */
  const el = (id) => document.getElementById(id);
  el("tcsRemark").value = char.remark || "";

  /* ── 分组 ── */
  const groups = TalkStore.getGroups();
  const gSel = el("tcsGroupSelect");
  gSel.innerHTML =
    `<option value="default">全部</option>` +
    groups
      .map(
        (g) =>
          `<option value="${g.id}"${char.groupId === g.id ? " selected" : ""}>${g.name}</option>`,
      )
      .join("");
  if (!char.groupId || char.groupId === "default") gSel.value = "default";

  /* ── 扩展开关 ── */
  const cfg = char.settings || {};
  el("tcsAutoTranslate").checked = !!cfg.autoTranslate;
  el("tcsPushMode").checked = !!cfg.pushMode;
  el("tcsProactive").checked = !!cfg.proactive;
  el("tcsMemorySummary").checked = !!cfg.memorySummary;
  el("tcsMemoryRounds").value = cfg.memoryRounds ?? 20;
  el("tcsTimezone").value = cfg.timezone || "";

  /* ── 地点感知 ── */
  _tcsLoadCountries();
  if (cfg.locCountry) {
    el("tcsLocCountry").value = cfg.locCountry;
    _tcsLoadCities(cfg.locCountry);
    if (cfg.locCity)
      setTimeout(() => {
        el("tcsLocCity").value = cfg.locCity;
      }, 50);
  }
}

/* ── 修改角色信息入口（由聊天设置面板调用） ── */
function tcsOpenEditChar() {
  if (_tcsCharId) talkEditChar(_tcsCharId);
}

/* ── 切换 User 身份入口（由聊天设置面板调用） ── */
function tcsOpenEditUser() {
  if (_tcsCharId) talkEditUser(_tcsCharId);
}

function _tcsSetAvatar(imgId, phId, data) {
  const img = document.getElementById(imgId);
  const ph = document.getElementById(phId);
  if (data && img) {
    img.src = data;
    img.classList.remove("hidden");
    if (ph) ph.style.display = "none";
  } else {
    if (img) img.classList.add("hidden");
    if (ph) ph.style.display = "flex";
  }
}

/* ── 头像更换 ── */
function tcsChangeCharAvatar() {
  document.getElementById("tcsCharAvatarInput").click();
}
function tcsChangeUserAvatar() {
  document.getElementById("tcsUserAvatarInput").click();
}

async function tcsOnCharAvatarChange(e) {
  const file = e.target.files[0];
  if (!file || !_tcsCharId) return;
  const data = await _chatReadFile(file);
  await ChatImgDB.put("char_avatar_" + _tcsCharId, data);
  _tcsSetAvatar("tcsAvCharImg", "tcsAvCharPH", data);
  /* 同步更新对话顶栏头像 */
  const charAvImg = document.getElementById("tcpCharAvImg");
  if (charAvImg) {
    charAvImg.src = data;
    charAvImg.classList.remove("hidden");
  }
  _cuShowToast("角色头像已更新 ✓");
  e.target.value = "";
}

async function tcsOnUserAvatarChange(e) {
  const file = e.target.files[0];
  if (!file || !_tcsCharId) return;
  const chars = TalkStore.getChars();
  const char = chars.find((c) => c.id === _tcsCharId);
  const uid = char?.linkedUserId || ChatStore.getActiveId();
  if (!uid) {
    _cuShowToast("未关联 User，请先在角色信息中绑定");
    return;
  }
  const data = await _chatReadFile(file);
  await ChatImgDB.put("cu_avatar_" + uid, data);
  _tcsSetAvatar("tcsAvUserImg", "tcsAvUserPH", data);
  /* 同步更新对话顶栏 user 头像 */
  const userAvImg = document.getElementById("tcpUserAvImg");
  if (userAvImg) {
    userAvImg.src = data;
    userAvImg.classList.remove("hidden");
  }
  _cuShowToast("用户头像已更新 ✓");
  e.target.value = "";
}

/* ── 备注 ── */
function tcsOnRemarkInput() {
  if (!_tcsCharId) return;
  const remark = document.getElementById("tcsRemark").value.trim();
  const chars = TalkStore.getChars();
  const char = chars.find((c) => c.id === _tcsCharId);
  if (!char) return;
  char.remark = remark;
  TalkStore.saveChars(chars);
  /* 同步对话页顶栏显示的名字（备注优先） */
  const nameEl = document.getElementById("tcpCharName");
  if (nameEl) nameEl.textContent = remark || char.name || "";
}

/* ── 分组 ── */
function tcsOnGroupChange() {
  if (!_tcsCharId) return;
  const val = document.getElementById("tcsGroupSelect").value;
  const chars = TalkStore.getChars();
  const char = chars.find((c) => c.id === _tcsCharId);
  if (!char) return;
  char.groupId = val === "default" ? "" : val;
  TalkStore.saveChars(chars);
  talkRenderGroupBar();
  _cuShowToast("分组已更新 ✓");
}

/* ── 通用开关 ── */
function tcsOnToggle(key, val) {
  if (!_tcsCharId) return;
  const chars = TalkStore.getChars();
  const char = chars.find((c) => c.id === _tcsCharId);
  if (!char) return;
  char.settings = char.settings || {};
  char.settings[key] = val;
  TalkStore.saveChars(chars);
}

/* ── 记忆轮数 ── */
function tcsOnMemoryChange() {
  tcsOnToggle(
    "memoryRounds",
    Number(document.getElementById("tcsMemoryRounds").value),
  );
}

/* ── 时区 ── */
function tcsOnTimezoneChange() {
  tcsOnToggle("timezone", document.getElementById("tcsTimezone").value);
}

/* ── 地点感知：国家/城市数据 ── */
const _TCS_REGIONS = {
  中国: [
    "北京",
    "上海",
    "广州",
    "深圳",
    "成都",
    "杭州",
    "武汉",
    "南京",
    "西安",
    "重庆",
    "天津",
    "苏州",
    "长沙",
    "青岛",
    "郑州",
    "大连",
    "宁波",
    "厦门",
  ],
  日本: [
    "东京",
    "大阪",
    "京都",
    "横滨",
    "名古屋",
    "神户",
    "福冈",
    "札幌",
    "仙台",
    "广岛",
    "奈良",
    "冲绳",
  ],
  韩国: ["首尔", "釜山", "仁川", "大邱", "光州", "大田", "济州"],
  美国: [
    "纽约",
    "洛杉矶",
    "芝加哥",
    "旧金山",
    "西雅图",
    "波士顿",
    "迈阿密",
    "拉斯维加斯",
    "华盛顿",
    "休斯顿",
  ],
  英国: ["伦敦", "曼彻斯特", "伯明翰", "爱丁堡", "利物浦", "布里斯托"],
  法国: ["巴黎", "里昂", "马赛", "尼斯", "波尔多"],
  德国: ["柏林", "慕尼黑", "汉堡", "法兰克福", "科隆"],
  澳大利亚: ["悉尼", "墨尔本", "布里斯班", "珀斯", "阿德莱德"],
  加拿大: ["多伦多", "温哥华", "蒙特利尔", "卡尔加里", "渥太华"],
  泰国: ["曼谷", "清迈", "普吉", "芭提雅"],
  新加坡: ["新加坡"],
  俄罗斯: ["莫斯科", "圣彼得堡", "叶卡捷琳堡", "新西伯利亚"],
  意大利: ["罗马", "米兰", "佛罗伦萨", "威尼斯", "那不勒斯"],
  西班牙: ["马德里", "巴塞罗那", "塞维利亚", "瓦伦西亚"],
  阿联酋: ["迪拜", "阿布扎比"],
  印度: ["孟买", "新德里", "班加罗尔", "海得拉巴", "钦奈"],
  巴西: ["圣保罗", "里约热内卢", "巴西利亚"],
  阿根廷: ["布宜诺斯艾利斯", "科尔多瓦"],
  墨西哥: ["墨西哥城", "瓜达拉哈拉", "蒙特雷"],
  埃及: ["开罗", "亚历山大"],
  南非: ["约翰内斯堡", "开普敦", "德班"],
};

function _tcsLoadCountries() {
  const sel = document.getElementById("tcsLocCountry");
  sel.innerHTML =
    `<option value="">选择国家</option>` +
    Object.keys(_TCS_REGIONS)
      .map((c) => `<option value="${c}">${c}</option>`)
      .join("");
}

function _tcsLoadCities(country) {
  const sel = document.getElementById("tcsLocCity");
  const cities = _TCS_REGIONS[country] || [];
  sel.innerHTML =
    `<option value="">选择城市</option>` +
    cities.map((c) => `<option value="${c}">${c}</option>`).join("");
}

function tcsOnLocChange() {
  const country = document.getElementById("tcsLocCountry").value;
  _tcsLoadCities(country);
  if (!_tcsCharId) return;
  const chars = TalkStore.getChars();
  const char = chars.find((c) => c.id === _tcsCharId);
  if (!char) return;
  char.settings = char.settings || {};
  char.settings.locCountry = country;
  char.settings.locCity = "";
  TalkStore.saveChars(chars);
}

/* 监听城市选择 */
document.addEventListener("DOMContentLoaded", () => {
  const cityEl = document.getElementById("tcsLocCity");
  if (cityEl)
    cityEl.addEventListener("change", () => {
      if (!_tcsCharId) return;
      const chars = TalkStore.getChars();
      const char = chars.find((c) => c.id === _tcsCharId);
      if (!char) return;
      char.settings = char.settings || {};
      char.settings.locCity = cityEl.value;
      TalkStore.saveChars(chars);
    });
});

/* ══════════════════════════════════════
   修改角色信息 — 复用 charCreateSheet，切换到编辑模式
══════════════════════════════════════ */
let _talkEditingCharId = null; // 当前正在编辑的 char id

function talkEditChar(charId) {
  const chars = TalkStore.getChars();
  const char = chars.find((c) => c.id === charId);
  if (!char) return;
  _talkEditingCharId = charId;

  /* ── 先走正常的打开流程（重置表单 + 填充下拉列表） ── */
  talkCloseFabMenu();
  _charAvatarData = null;
  _charGender = "";
  _charLinkedUserId = "";
  _charResetForm();
  _charFillGroupSelect(); // 正确的函数名
  _charFillUserPick(); // 正确的函数名

  /* ── 再用角色数据覆盖表单字段 ── */
  const _el = (id) => document.getElementById(id);
  _el("charName").value = char.name || "";
  _el("charNickname").value = char.nickname || "";
  _el("charDetail").value = char.detail || "";
  _el("charVoiceId") && (_el("charVoiceId").value = char.voiceId || "");
  _el("charVoiceEnabled") &&
    (_el("charVoiceEnabled").checked = !!char.voiceEnabled);

  /* 性别 */
  _charGender = char.gender || "";
  document.querySelectorAll("#charCreateSheet .cu-gender-btn").forEach((b) => {
    b.classList.toggle("cu-gender-active", b.dataset.gender === _charGender);
  });

  /* 分组 */
  if (char.groupId) {
    const sel = _el("charGroupSelect");
    if (sel) sel.value = char.groupId;
  }

  /* 出生地 */
  if (char.country) {
    const countryEl = _el("charCountry");
    if (countryEl) {
      countryEl.value = char.country;
      charUpdateCityOptions && charUpdateCityOptions();
      setTimeout(() => {
        if (char.city) {
          const c = _el("charCity");
          if (c) c.value = char.city;
        }
      }, 60);
    }
  }

  /* 头像 */
  ChatImgDB.get("char_avatar_" + charId).then((data) => {
    if (!data) return;
    const img = _el("charAvatarImg");
    const ph = _el("charAvatarPH");
    if (img) {
      img.src = data;
      img.style.display = "block";
    }
    if (ph) {
      ph.style.display = "none";
    }
    _charAvatarData = data;
  });

  /* 关联 user */
  _charLinkedUserId = char.linkedUserId || "";
  /* 高亮已选中的 user pick 项 */
  setTimeout(() => {
    document
      .querySelectorAll("#charCreateSheet .cu-user-pick-item")
      .forEach((item) => {
        item.classList.toggle(
          "cu-user-pick-active",
          item.dataset.uid === _charLinkedUserId,
        );
      });
  }, 30);

  /* 改按钮和标题为编辑模式 */
  const saveBtn = document.querySelector("#charCreateSheet .cu-save-btn");
  if (saveBtn) {
    saveBtn.textContent = "保存修改";
    saveBtn.onclick = () => charSaveEdit();
  }
  const titleEl = document.querySelector("#charCreateSheet .talk-sheet-title");
  if (titleEl) titleEl.textContent = "修改角色信息";

  /* 打开 sheet — 把它移到 chat-app 根容器确保不被遮挡 */
  const sheet = _el("charCreateSheet");
  if (sheet) {
    const root = document.querySelector(".chat-app") || document.body;
    if (sheet.parentElement !== root) root.appendChild(sheet);
    sheet.classList.remove("hidden");
  }
}

async function charSaveEdit() {
  if (!_talkEditingCharId) {
    charSaveCreate();
    return;
  }
  const name = document.getElementById("charName")?.value.trim();
  if (!name) {
    alert("请填写角色姓名");
    return;
  }

  const chars = TalkStore.getChars();
  const char = chars.find((c) => c.id === _talkEditingCharId);
  if (!char) return;

  char.name = name;
  char.nickname = document.getElementById("charNickname")?.value.trim() || "";
  char.gender = _charGender;
  char.groupId = document.getElementById("charGroupSelect")?.value || "default";
  char.country = document.getElementById("charCountry")?.value || "";
  char.city = document.getElementById("charCity")?.value || "";
  char.detail = document.getElementById("charDetail")?.value.trim() || "";
  char.voiceId = document.getElementById("charVoiceId")?.value.trim() || "";
  char.voiceEnabled =
    document.getElementById("charVoiceEnabled")?.checked || false;
  char.linkedUserId = _charLinkedUserId || "";

  if (_charAvatarData) {
    await ChatImgDB.put("char_avatar_" + _talkEditingCharId, _charAvatarData);
  }

  TalkStore.saveChars(chars);

  /* 同步刷新对话顶栏名称 */
  const nameEl = document.getElementById("tcpCharName");
  if (nameEl && _talkActiveCharId === _talkEditingCharId)
    nameEl.textContent = char.name;

  talkCloseCreateChar();
  _charResetForm();
  _talkEditingCharId = null;

  /* 还原按钮和标题 */
  const saveBtn = document.querySelector("#charCreateSheet .cu-save-btn");
  if (saveBtn) {
    saveBtn.textContent = "创建角色";
    saveBtn.onclick = () => charSaveCreate();
  }
  const title = document.querySelector("#charCreateSheet .talk-sheet-title");
  if (title) title.textContent = "新建角色";

  talkRenderGroupBar();
  await talkRenderConvList();
  _cuShowToast("角色信息已更新 ✓");
}

/* ══════════════════════════════════════
   切换 User 身份 — 弹出 user 选择 sheet
══════════════════════════════════════ */
function talkEditUser(charId) {
  const chars = TalkStore.getChars();
  const char = chars.find((c) => c.id === charId);
  if (!char) return;

  const users = ChatStore.getUsers();
  if (!users.length) {
    _cuShowToast('请先在"对话"→"+"→"新建 User"中创建身份');
    return;
  }

  /* 动态构建一个选择面板 */
  let panel = document.getElementById("_talkUserSwitchPanel");
  if (!panel) {
    panel = document.createElement("div");
    panel.id = "_talkUserSwitchPanel";
    panel.className = "talk-sheet";
    panel.style.zIndex = "700";
    panel.innerHTML = `
          <div class="talk-sheet-topbar">
            <button class="talk-sheet-back" onclick="document.getElementById('_talkUserSwitchPanel').classList.add('hidden')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <span class="talk-sheet-title">切换 User 身份</span>
            <div style="width:32px"></div>
          </div>
          <div class="talk-sheet-scroll" id="_talkUserSwitchList" style="padding:16px;gap:10px;display:flex;flex-direction:column;"></div>
        `;
    /* 挂到 talkConvPage 同级容器 */
    document.getElementById("talkConvPage")?.parentElement?.appendChild(panel);
  }

  /* 渲染 user 列表 */
  const list = document.getElementById("_talkUserSwitchList");
  list.innerHTML = "";
  const current = char.linkedUserId || "";

  users.forEach((u) => {
    const item = document.createElement("div");
    item.style.cssText = `
            display:flex;align-items:center;gap:12px;padding:12px 14px;
            background:#fff;border-radius:12px;cursor:pointer;
            border:2px solid ${u.id === current ? "#333" : "transparent"};
            transition:border 0.15s;
        `;
    item.innerHTML = `
            <div style="width:40px;height:40px;border-radius:50%;overflow:hidden;background:#eee;flex-shrink:0;display:flex;align-items:center;justify-content:center;" id="_usw_av_${u.id}">
              <svg viewBox="0 0 40 40" width="40" height="40"><circle cx="20" cy="20" r="20" fill="#ddd"/><circle cx="20" cy="15" r="7" fill="#bbb"/><ellipse cx="20" cy="33" rx="12" ry="8" fill="#bbb"/></svg>
            </div>
            <div>
              <div style="font-weight:600;font-size:14px;color:#1a1a1a;">${_cuEsc(u.name || "未命名")}</div>
              <div style="font-size:12px;color:#888;">${_cuEsc(u.gender || "")} ${_cuEsc(u.age ? u.age + "岁" : "")} ${_cuEsc(u.country || "")}</div>
            </div>
            ${u.id === current ? '<div style="margin-left:auto;font-size:12px;color:#333;font-weight:600;">当前</div>' : ""}
        `;

    /* 异步加载头像 */
    ChatImgDB.get("cu_avatar_" + u.id).then((data) => {
      if (!data) return;
      const wrap = document.getElementById("_usw_av_" + u.id);
      if (wrap)
        wrap.innerHTML = `<img src="${data}" style="width:100%;height:100%;object-fit:cover;">`;
    });

    item.onclick = () => {
      const chars2 = TalkStore.getChars();
      const c2 = chars2.find((x) => x.id === charId);
      if (c2) {
        c2.linkedUserId = u.id;
        TalkStore.saveChars(chars2);
        _cuShowToast(`已切换为 ${u.name || "该身份"} ✓`);
      }
      panel.classList.add("hidden");
    };
    list.appendChild(item);
  });

  /* 加一个"不使用身份"选项 */
  const noneItem = document.createElement("div");
  noneItem.style.cssText = `
        padding:12px 14px;background:#fff;border-radius:12px;cursor:pointer;
        border:2px solid ${!current ? "#333" : "transparent"};
        font-size:14px;color:#888;text-align:center;
    `;
  noneItem.textContent = "不使用身份（默认）";
  noneItem.onclick = () => {
    const chars2 = TalkStore.getChars();
    const c2 = chars2.find((x) => x.id === charId);
    if (c2) {
      c2.linkedUserId = "";
      TalkStore.saveChars(chars2);
    }
    _cuShowToast("已清除身份绑定 ✓");
    panel.classList.add("hidden");
  };
  list.appendChild(noneItem);

  panel.classList.remove("hidden");
}
/* ══════════════════════════════════════════════════
   聊天设置 → 关联世界书面板
   - 全局世界书板块：显示 WBStore 里 enabled=true 的条目，按分组展示，多选
   - 角色世界书板块：显示 WBRoleStore 里 charId===_tcsCharId 的条目，按分组展示，多选
   - 选中的条目 id 存储在 char.settings.linkedWbEntries（全局）
     和 char.settings.linkedRoleEntries（角色）
══════════════════════════════════════════════════ */
function tcsOpenWorldbook() {
  if (!_tcsCharId) return;

  /* 已有面板则复用 */
  let panel = document.getElementById("_tcsWbPanel");
  if (!panel) {
    panel = document.createElement("div");
    panel.id = "_tcsWbPanel";
    panel.className = "talk-sheet";
    panel.style.zIndex = "700";
    panel.innerHTML = `
          <div class="talk-sheet-topbar">
            <button class="talk-sheet-back" onclick="document.getElementById('_tcsWbPanel').classList.add('hidden')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <span class="talk-sheet-title">关联世界书</span>
            <button class="talk-sheet-back" style="color:#333;font-size:13px;font-weight:600;background:none;border:none;cursor:pointer;padding:0 4px;" onclick="_tcsWbSave()">保存</button>
          </div>
          <div class="talk-sheet-scroll" id="_tcsWbBody" style="padding:16px;display:flex;flex-direction:column;gap:20px;"></div>
        `;
    const root = document.querySelector(".chat-app") || document.body;
    root.appendChild(panel);
  }

  _tcsWbRender();
  panel.classList.remove("hidden");
}

function _tcsWbRender() {
  const body = document.getElementById("_tcsWbBody");
  if (!body) return;
  body.innerHTML = "";

  const chars = TalkStore.getChars();
  const char = chars.find((c) => c.id === _tcsCharId);
  if (!char) return;
  char.settings = char.settings || {};
  const linkedGlobal = new Set(char.settings.linkedWbEntries || []);
  const linkedRole = new Set(char.settings.linkedRoleEntries || []);

  /* ── 板块1：全局世界书 ── */
  const globalData =
    typeof WBStore !== "undefined"
      ? WBStore.get()
      : { groups: [], entries: [] };
  const globalEnabledEntries = globalData.entries.filter((e) => e.enabled);

  const sec1 = document.createElement("div");
  sec1.innerHTML = `<div style="font-size:13px;font-weight:700;color:#555;margin-bottom:10px;letter-spacing:0.5px;">全局世界书 <span style="font-weight:400;color:#aaa;font-size:11px;">（仅已开启的条目可选）</span></div>`;

  if (globalData.groups.length === 0 || globalEnabledEntries.length === 0) {
    sec1.innerHTML += `<div style="font-size:13px;color:#bbb;padding:10px 0;">暂无可选条目（请先在世界书中创建并开启条目）</div>`;
  } else {
    globalData.groups.forEach((g) => {
      const gEntries = globalEnabledEntries.filter((e) => e.groupId === g.id);
      if (!gEntries.length) return;
      const groupEl = _tcsWbMakeGroup(g.name, gEntries, linkedGlobal, "wbG_");
      sec1.appendChild(groupEl);
    });
  }
  body.appendChild(sec1);

  /* ── 板块2：角色世界书 ── */
  const roleData =
    typeof WBRoleStore !== "undefined"
      ? WBRoleStore.get()
      : { roleGroups: [], roleEntries: [] };
  const roleEntries = roleData.roleEntries.filter(
    (e) => e.charId === _tcsCharId,
  );

  const sec2 = document.createElement("div");
  sec2.innerHTML = `<div style="font-size:13px;font-weight:700;color:#555;margin-bottom:10px;margin-top:4px;letter-spacing:0.5px;">角色世界书 <span style="font-weight:400;color:#aaa;font-size:11px;">（仅关联当前角色的条目）</span></div>`;

  if (roleData.roleGroups.length === 0 || roleEntries.length === 0) {
    sec2.innerHTML += `<div style="font-size:13px;color:#bbb;padding:10px 0;">暂无可选条目（请先在世界书→角色标签中创建并关联此角色的条目）</div>`;
  } else {
    roleData.roleGroups.forEach((g) => {
      const gEntries = roleEntries.filter((e) => e.groupId === g.id);
      if (!gEntries.length) return;
      const groupEl = _tcsWbMakeGroup(g.name, gEntries, linkedRole, "wbR_");
      sec2.appendChild(groupEl);
    });
  }
  body.appendChild(sec2);
}

/* 生成可折叠分组块（含多选条目） */
function _tcsWbMakeGroup(groupName, entries, linkedSet, prefix) {
  const wrap = document.createElement("div");
  wrap.style.cssText =
    "background:#fff;border-radius:12px;overflow:hidden;margin-bottom:8px;box-shadow:0 1px 4px rgba(0,0,0,0.06);";

  /* 分组头 */
  const head = document.createElement("div");
  head.style.cssText =
    "display:flex;align-items:center;justify-content:space-between;padding:11px 14px;cursor:pointer;user-select:none;";
  head.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;">
            <span id="${prefix}arrow_${groupName}" style="display:inline-block;transition:transform 0.2s;transform:rotate(90deg);font-size:12px;color:#999;">▶</span>
            <span style="font-size:14px;font-weight:600;color:#1a1a1a;">${groupName}</span>
        </div>
        <span style="font-size:12px;color:#bbb;">${entries.length} 条</span>
    `;

  /* 条目列表（默认展开） */
  const list = document.createElement("div");
  list.style.cssText =
    "display:flex;flex-direction:column;border-top:1px solid #f0f0f0;";
  list.id = `${prefix}list_${groupName}`;

  entries.forEach((e) => {
    const row = document.createElement("div");
    const checked = linkedSet.has(e.id);
    row.style.cssText =
      "display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;border-bottom:1px solid #f8f8f8;";
    row.dataset.eid = e.id;
    row.dataset.prefix = prefix;
    row.innerHTML = `
            <div style="width:18px;height:18px;border-radius:5px;border:2px solid ${checked ? "#333" : "#ccc"};
                background:${checked ? "#333" : "#fff"};display:flex;align-items:center;justify-content:center;
                flex-shrink:0;transition:all 0.15s;" class="_tcsWbChk">
                ${checked ? '<svg viewBox="0 0 12 12" width="10" height="10"><polyline points="2,6 5,9 10,3" fill="none" stroke="#fff" stroke-width="2"/></svg>' : ""}
            </div>
            <div style="flex:1;min-width:0;">
                <div style="font-size:13px;color:#1a1a1a;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${e.name}</div>
                <div style="font-size:11px;color:#aaa;">${e.keywords && e.keywords.length ? "关键词: " + e.keywords.join(", ") : "无关键词"} · ${e.pos === "before" ? "前置" : e.pos === "after" ? "后置" : "触发"}</div>
            </div>
        `;
    row.onclick = () => {
      if (linkedSet.has(e.id)) linkedSet.delete(e.id);
      else linkedSet.add(e.id);
      /* 更新视觉 */
      const chk = row.querySelector("._tcsWbChk");
      const now = linkedSet.has(e.id);
      chk.style.background = now ? "#333" : "#fff";
      chk.style.borderColor = now ? "#333" : "#ccc";
      chk.innerHTML = now
        ? '<svg viewBox="0 0 12 12" width="10" height="10"><polyline points="2,6 5,9 10,3" fill="none" stroke="#fff" stroke-width="2"/></svg>'
        : "";
      /* 同步回 char.settings（实时写入） */
      _tcsWbFlushToChar(prefix, linkedSet);
    };
    list.appendChild(row);
  });

  /* 折叠/展开逻辑 */
  head.onclick = () => {
    const isOpen = list.style.display !== "none";
    list.style.display = isOpen ? "none" : "flex";
    const arrow = document.getElementById(`${prefix}arrow_${groupName}`);
    if (arrow)
      arrow.style.transform = isOpen ? "rotate(0deg)" : "rotate(90deg)";
  };

  wrap.appendChild(head);
  wrap.appendChild(list);
  return wrap;
}

/* 实时将选中状态写回 char.settings */
function _tcsWbFlushToChar(prefix, linkedSet) {
  if (!_tcsCharId) return;
  const chars = TalkStore.getChars();
  const char = chars.find((c) => c.id === _tcsCharId);
  if (!char) return;
  char.settings = char.settings || {};
  if (prefix === "wbG_") char.settings.linkedWbEntries = Array.from(linkedSet);
  else char.settings.linkedRoleEntries = Array.from(linkedSet);
  TalkStore.saveChars(chars);
}

/* 保存按钮（直接关闭，数据已实时写入） */
function _tcsWbSave() {
  document.getElementById("_tcsWbPanel")?.classList.add("hidden");
  _cuShowToast("世界书关联已保存 ✓");
}
function tcsOpenEmoji() {
  _cuShowToast("表情包管理 — 即将开放");
}

/* ── 聊天壁纸 ── */
function tcsChangeBg() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file || !_tcsCharId) return;
    const data = await _chatReadFile(file);
    await TalkDB.set("chat_bg_" + _tcsCharId, data);
    _tcsApplyBg(data);
    _cuShowToast("壁纸已更新 ✓");
  };
  input.click();
}

function tcsOpenBgLibrary() {
  _cuShowToast("壁纸库 — 即将开放");
}

async function _tcsApplyBg(data) {
  const msgArea = document.getElementById("tcpMessages");
  if (!msgArea) return;
  if (data) {
    msgArea.style.backgroundImage = `url(${data})`;
    msgArea.style.backgroundSize = "cover";
    msgArea.style.backgroundPosition = "center";
  } else {
    msgArea.style.backgroundImage = "";
  }
}

/* ── 清除聊天记录 ── */
function tcsClearHistory() {
  if (!_tcsCharId) return;
  if (!confirm("确定清除所有聊天记录？角色将不再记得之前的对话内容。")) return;
  const key = "msgs_" + _tcsCharId;
  TalkDB.set(key, []).then(() => {
    /* 清空当前显示 */
    const msgArea = document.getElementById("tcpMessages");
    if (msgArea) msgArea.innerHTML = "";
    /* 清除 convs 里的 lastMsg */
    const convs = TalkStore.getConvs();
    const conv = convs.find((c) => c.charId === _tcsCharId);
    if (conv) {
      conv.lastMsg = "";
      conv.lastTime = Date.now();
      TalkStore.saveConvs(convs);
    }
    talkRenderConvList();
    _cuShowToast("聊天记录已清除");
  });
}

/* ── 删除好友 ── */
function tcsDeleteFriend() {
  if (!_tcsCharId) return;
  if (!confirm("确定删除该好友？所有聊天记录和角色信息将被清除且无法恢复。"))
    return;
  const chars = TalkStore.getChars().filter((c) => c.id !== _tcsCharId);
  TalkStore.saveChars(chars);
  const convs = TalkStore.getConvs().filter((c) => c.charId !== _tcsCharId);
  TalkStore.saveConvs(convs);
  /* 清除图片和消息 */
  ChatImgDB.del("char_avatar_" + _tcsCharId);
  TalkDB.set("msgs_" + _tcsCharId, []);
  /* 关闭设置面板和对话页 */
  talkCloseSettings();
  const tcpPanel = document.getElementById("chatPanel-conv");
  if (tcpPanel) tcpPanel.classList.add("hidden");
  talkRenderConvList();
  _cuShowToast("已删除好友");
  _tcsCharId = null;
  _talkActiveCharId = null;
}

/* 旧占位函数保持兼容 */
function talkConvSettings() {
  talkOpenSettings();
}

/* ════════════════════════════════
   构建 char 系统提示（读取人设+user信息）
════════════════════════════════ */
function _tcpBuildSystemPrompt(char, user) {
  const charDetail = char.detail || "";
  const charName = char.name || "角色";
  const charNickname = char.nickname || "";
  const charGender =
    char.gender === "male"
      ? "男"
      : char.gender === "female"
        ? "女"
        : char.gender || "不明";
  const charAge = char.age ? `${char.age}岁` : "";

  /* 出生地/所在地拼接 */
  const charCountry = char.country || "";
  const charCity = char.city || "";
  const charLocParts = [charCountry, charCity].filter(Boolean);
  const charLoc = charLocParts.length ? charLocParts.join("·") : "不明";
  const charLocDesc = charLocParts.length
    ? `你出生并成长于${charLoc}，这是你身份认同的一部分，言谈中可自然体现当地文化或口音习惯。`
    : "";

  /* ── 聊天设置：地点感知 & 时间感知 ── */
  const cfg = char.settings || {};
  const locCountry = cfg.locCountry || "";
  const locCity = cfg.locCity || "";
  const locLine =
    locCountry || locCity
      ? `当前所在地（地点感知）：${[locCountry, locCity].filter(Boolean).join("·")}`
      : "";

  let timeAwareness = "";
  const tz = cfg.timezone || "";
  if (tz) {
    try {
      const now = new Date();
      const tzTime = now.toLocaleString("zh-CN", {
        timeZone: tz,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      const tzDate = now.toLocaleDateString("zh-CN", {
        timeZone: tz,
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long",
      });
      timeAwareness = `你所在时区的当前时间：${tzDate} ${tzTime}（时区：${tz}）`;
    } catch (e) {
      /* 忽略无效时区 */
    }
  }

  /* User 人设描述 */
  let userDesc = "";
  let userCallName = "User";
  if (user) {
    const parts = [];
    if (user.name) {
      parts.push(`名字：${user.name}`);
      userCallName = user.name;
    }
    if (user.gender) parts.push(`性别：${user.gender}`);
    if (user.age) parts.push(`年龄：${user.age}岁`);
    const userLoc = [user.country, user.city].filter(Boolean).join("·");
    if (userLoc) parts.push(`所在地：${userLoc}`);
    if (user.bio) parts.push(`关于他/她：${user.bio}`);
    userDesc = parts.join("，");
  }

  return `你不是AI，你就是「${charName}」本人。请完全沉浸在这个身份中，用第一人称和对方聊天，绝对不得出戏（OOC）、不得承认自己是AI或语言模型。

━━━━━━━━━━━━━━━━━━━━━━
【你是谁】
━━━━━━━━━━━━━━━━━━━━━━
姓名：${charName}${charNickname ? `（对方可以叫你「${charNickname}」）` : ""}
性别：${charGender}${charAge ? `　年龄：${charAge}` : ""}
出生地/所在地：${charLoc}
${charLocDesc}${locLine ? `\n${locLine}` : ""}${timeAwareness ? `\n${timeAwareness}` : ""}

━━━━━━━━━━━━━━━━━━━━━━
【你的详细人设（必须严格遵守）】
━━━━━━━━━━━━━━━━━━━━━━
${charDetail || "（无详细设定，请根据姓名、性别、地区自由发挥，保持一致性）"}

━━━━━━━━━━━━━━━━━━━━━━
【正在和你聊天的人】
━━━━━━━━━━━━━━━━━━━━━━
${
  userDesc
    ? `你正在和「${userCallName}」聊天。以下是关于他/她的信息，请自然地将这些信息融入对话中，对待他/她的方式要符合你的性格人设：\n${userDesc}`
    : `对方没有留下具体信息，你可以称呼对方为"你"，用符合你性格的方式与对方交流。`
}

━━━━━━━━━━━━━━━━━━━━━━
【聊天规则（必须遵守）】
━━━━━━━━━━━━━━━━━━━━━━
1. 你就是「${charName}」，不是在"扮演"，是"就是"。人设里写了什么口癖、口头禅、说话方式，你就原原本本地用出来。
2. 性格、喜好、讨厌的事、习惯、说话语气——全部严格按照【你的详细人设】执行，不得自行软化或改变。
3. 绝对不说"作为AI""作为语言模型""我只是在扮演"之类的话，永远不出戏。
4. 回复用"---"分隔成多条短消息（每条对应一个气泡），每条不超过50字，像真实发消息一样自然分段。
5. 分条数量根据内容自然决定，通常2～4条，不要强行凑数。
6. 只输出你说的话，不要写动作描述，不要加括号说明，不要加旁白。
7. 如果人设中有特定语言习惯（如日语词汇混用、方言、敬语/无礼口吻等），请严格体现出来。`;
}

/* ════════════════════════════════
   续写键 — 消耗API，思考一次，多条气泡回复
════════════════════════════════ */
let _tcpIsGenerating = false;

async function talkConvContinue() {
  if (!_talkActiveCharId || _tcpIsGenerating) return;

  /* ── 优先读取通用 API 配置（settings.js 的 getActiveModel）── */
  let apiKey = "",
    apiUrl = "",
    apiModel = "";
  if (typeof getActiveModel === "function") {
    const m = getActiveModel();
    if (m && m.key && m.url && m.model) {
      apiKey = m.key;
      /* ⚠️ 必须拼接 /chat/completions，与 testModel 保持一致 */
      apiUrl = m.url.replace(/\/$/, "") + "/chat/completions";
      apiModel = m.model;
    }
  }

  /* 通用 API 未配置 → 静默返回，不弹框，不尝试 MiniMax */
  if (!apiKey) return;

  const chars = TalkStore.getChars();
  const char = chars.find((c) => c.id === _talkActiveCharId);
  if (!char) return;

  /* 获取关联 user 信息 */
  const users = ChatStore.getUsers();
  const activeId = ChatStore.getActiveId();
  const uid = char.linkedUserId || activeId;
  const user = users.find((u) => u.id === uid) || null;

  const allMsgs = _tcpGetMsgs(_talkActiveCharId);
  if (allMsgs.length === 0) {
    alert("还没有任何消息，请先发送消息再续写");
    return;
  }

  /* ── 防重复，标记生成中 ── */
  _tcpIsGenerating = true;
  _tcpShowTyping();

  try {
    /* 构建消息历史（按记忆轮数截取） */
    const memRounds = Number(char?.settings?.memoryRounds ?? 20);
    const msgs = memRounds > 0 ? allMsgs.slice(-(memRounds * 2)) : allMsgs;
    const history = msgs.map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.text,
    }));

    const systemPrompt = _tcpBuildSystemPrompt(char, user);

    /* ── 调用 API（兼容 OpenAI 格式 + MiniMax） ── */
    const resp = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: apiModel,
        messages: [{ role: "system", content: systemPrompt }, ...history],
        temperature: 0.9,
        top_p: 0.95,
        max_tokens: 2000,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`API错误 ${resp.status}: ${errText}`);
    }

    const data = await resp.json();
    const rawText = data?.choices?.[0]?.message?.content || "";
    if (!rawText) throw new Error("API返回空内容");

    /* ── 按 "---" 拆分成多条气泡 ── */
    const parts = rawText
      .split(/\n?---\n?/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    /* ── 依次存入消息 ── */
    const now = Date.now();
    const storedMsgs = _tcpGetMsgs(_talkActiveCharId);
    parts.forEach((text, i) => {
      storedMsgs.push({ role: "char", text, ts: now + i * 300 });
    });
    _tcpSaveMsgs(_talkActiveCharId, storedMsgs);

    /* 更新会话列表 */
    const convs = TalkStore.getConvs();
    const conv = convs.find((c) => c.charId === _talkActiveCharId);
    if (conv) {
      conv.lastMsg = parts[parts.length - 1];
      conv.lastTime = now + (parts.length - 1) * 300;
    }
    TalkStore.saveConvs(convs);
  } catch (err) {
    console.error("[续写]", err);
    const storedMsgs = _tcpGetMsgs(_talkActiveCharId);
    storedMsgs.push({
      role: "char",
      text: `（回复失败：${err.message}）`,
      ts: Date.now(),
    });
    _tcpSaveMsgs(_talkActiveCharId, storedMsgs);
  } finally {
    _tcpIsGenerating = false;
    _tcpHideTyping();
    _tcpRenderMessages(_talkActiveCharId);
  }
}

/* ── 思考中 loading 气泡 ── */
function _tcpShowTyping() {
  const box = document.getElementById("tcpMessages");
  if (!box) return;
  const wrap = document.createElement("div");
  wrap.className = "tcp-typing-wrap";
  wrap.id = "tcpTypingWrap";

  /* 先用默认头像占位，再异步替换为真实头像（与气泡渲染逻辑一致） */
  const defaultAvSVG = `<svg viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="20" r="20" fill="#e4e4e2"/>
        <circle cx="20" cy="15" r="7" fill="#c8c8c5"/>
        <ellipse cx="20" cy="33" rx="12" ry="8" fill="#c8c8c5"/>
    </svg>`;

  wrap.innerHTML = `
        <div class="tcp-bubble-av" id="tcpTypingAv">${defaultAvSVG}</div>
        <div class="tcp-typing-bubble">
            <div class="tcp-typing-dot"></div>
            <div class="tcp-typing-dot"></div>
            <div class="tcp-typing-dot"></div>
        </div>`;
  box.appendChild(wrap);
  setTimeout(() => {
    box.scrollTop = box.scrollHeight;
  }, 30);

  /* 异步加载真实头像，加载完成后替换（wrap 可能已被 hide 移除，需判断） */
  if (_talkActiveCharId) {
    ChatImgDB.get("char_avatar_" + _talkActiveCharId)
      .then((data) => {
        if (!data) return;
        const avEl = document.getElementById("tcpTypingAv");
        if (avEl)
          avEl.innerHTML = `<img src="${data}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">`;
      })
      .catch(() => {});
  }
}

function _tcpHideTyping() {
  document.getElementById("tcpTypingWrap")?.remove();
}

/* ── 关联 User 身份选择 ── */
let _charLinkedUserId = "";

async function _charFillUserPick() {
  const wrap = document.getElementById("charUserPickList");
  if (!wrap) return;
  wrap.innerHTML = "";

  const users = ChatStore.getUsers();
  const activeId = ChatStore.getActiveId();

  if (users.length === 0) {
    wrap.innerHTML =
      '<div class="char-user-pick-empty">暂无 User 身份，请先创建</div>';
    return;
  }

  /* 默认选中当前激活 user */
  _charLinkedUserId = activeId || users[0]?.id || "";

  for (const u of users) {
    const avData = await ChatImgDB.get("cu_avatar_" + u.id).catch(() => null);
    const avHTML = avData
      ? `<img src="${avData}" alt=""/>`
      : `<svg viewBox="0 0 40 40" fill="none">
                   <circle cx="20" cy="20" r="20" fill="#e4e4e2"/>
                   <circle cx="20" cy="15" r="7" fill="#c8c8c5"/>
                   <ellipse cx="20" cy="33" rx="12" ry="8" fill="#c8c8c5"/>
               </svg>`;
    const isActive = u.id === _charLinkedUserId;
    const sub = [u.gender, u.country, u.city].filter(Boolean).join(" · ");

    const btn = document.createElement("button");
    btn.className = "char-user-pick-item" + (isActive ? " selected" : "");
    btn.dataset.uid = u.id;
    btn.innerHTML = `
            <div class="char-user-pick-av">${avHTML}</div>
            <div class="char-user-pick-info">
                <div class="char-user-pick-name">${_cuEsc(u.name)}</div>
                ${sub ? `<div class="char-user-pick-sub">${_cuEsc(sub)}</div>` : ""}
            </div>
            <div class="char-user-pick-check"></div>`;
    btn.addEventListener("click", () => {
      _charLinkedUserId = u.id;
      wrap
        .querySelectorAll(".char-user-pick-item")
        .forEach((b) => b.classList.toggle("selected", b.dataset.uid === u.id));
    });
    wrap.appendChild(btn);
  }
}

/* ════════════════════════════════
   对话面板 — 顶部用户身份卡片渲染
   同步：头像、昵称、个人主页简介
════════════════════════════════ */
async function talkRenderUserCard() {
  const users = ChatStore.getUsers();
  const activeId = ChatStore.getActiveId();
  const activeU = users.find((u) => u.id === activeId) || null;
  const profile = ChatStore.getProfile();

  /* ── 头像 ── */
  const img = document.getElementById("tucAvatarImg");
  const ph = document.getElementById("tucAvatarPH");
  let avData = null;
  if (activeU) {
    avData = await ChatImgDB.get("cu_avatar_" + activeU.id).catch(() => null);
  }
  if (!avData) {
    avData = await ChatImgDB.get("cp_avatar").catch(() => null);
  }
  if (avData && img) {
    img.src = avData;
    img.classList.remove("hidden");
    if (ph) ph.style.display = "none";
  } else {
    if (img) img.classList.add("hidden");
    if (ph) ph.style.display = "flex";
  }

  /* ── 大横幅图片（WeChat风顶部左侧图） ── */
  const bannerImg = document.getElementById("tucBannerImg");
  const bannerPH = document.getElementById("tucBannerPH");
  const bannerData = await ChatImgDB.get("tuc_banner").catch(() => null);
  if (bannerData && bannerImg) {
    bannerImg.src = bannerData;
    bannerImg.style.display = "block";
    if (bannerPH) bannerPH.style.display = "none";
  } else {
    if (bannerImg) bannerImg.style.display = "none";
    if (bannerPH) bannerPH.style.display = "flex";
  }

  /* ── 4张相册图片（Live 实况） ── */
  for (let i = 0; i < 4; i++) {
    const imgEl = document.getElementById(`tucPhoto${i}`);
    const phEl = document.getElementById(`tucPhotoPH${i}`);
    const liveTag = document.getElementById(`tucLiveTag${i}`);
    const data = await ChatImgDB.get(`tuc_photo_${i}`).catch(() => null);
    const isLive = localStorage.getItem(`tuc_photo_live_${i}`) === "1";
    if (data && imgEl) {
      imgEl.src = data;
      imgEl.style.display = "block";
      if (phEl) phEl.style.display = "none";
    } else {
      if (imgEl) imgEl.style.display = "none";
      if (phEl) phEl.style.display = "flex";
    }
    if (liveTag) liveTag.style.display = isLive ? "flex" : "none";
  }

  /* ── 右侧文字信息 ── */
  const nameEl = document.getElementById("tucName");
  if (nameEl && document.activeElement !== nameEl) {
    nameEl.textContent = activeU && activeU.name ? activeU.name : "未设置身份";
  }
  const bioEl = document.getElementById("tucBio");
  if (bioEl && document.activeElement !== bioEl) {
    bioEl.textContent = profile.bio || "";
  }
  /* ── 右侧可编辑标语 ── */
  const mottoEl = document.getElementById("tucMotto");
  if (mottoEl && document.activeElement !== mottoEl) {
    mottoEl.textContent = localStorage.getItem("tuc_motto") || "";
  }
}

/* ── 顶部横幅图上传 ── */
function tucTriggerBanner() {
  document.getElementById("tucBannerInput").click();
}
async function tucHandleBanner(e) {
  const file = e.target.files[0];
  if (!file) return;
  e.target.value = "";
  const data = await _chatReadFile(file);
  await ChatImgDB.put("tuc_banner", data);
  talkRenderUserCard();
}

/* ── 4张相册图片上传 ── */
function tucTriggerPhoto(i) {
  document.getElementById("tucPhotoInput" + i).click();
}
async function tucHandlePhoto(e, i) {
  const file = e.target.files[0];
  if (!file) return;
  e.target.value = "";
  const data = await _chatReadFile(file);
  await ChatImgDB.put("tuc_photo_" + i, data);
  talkRenderUserCard();
}

/* ── 切换 Live 标记 ── */
function tucToggleLive(i, e) {
  e.stopPropagation();
  const cur = localStorage.getItem("tuc_photo_live_" + i) === "1";
  localStorage.setItem("tuc_photo_live_" + i, cur ? "0" : "1");
  talkRenderUserCard();
}

/* ── 右侧标语失焦保存 ── */
function tucSaveMotto() {
  const el = document.getElementById("tucMotto");
  if (el) localStorage.setItem("tuc_motto", el.textContent.trim());
}

/* ════════════════════════════════
   个人主页收藏板块
════════════════════════════════ */
function cpOpenFavorites() {
  /* 创建全屏收藏页覆盖 */
  document.getElementById("cpFavPage")?.remove();
  const page = document.createElement("div");
  page.id = "cpFavPage";
  page.className = "cp-fav-page";

  const favKey = "xxj_chat_favorites";
  let favs = [];
  try {
    favs = JSON.parse(localStorage.getItem(favKey) || "[]");
  } catch {}

  const listHTML =
    favs.length === 0
      ? '<div class="cp-fav-empty">暂无收藏</div>'
      : favs
          .map(
            (f) => `
            <div class="cp-fav-item" data-id="${f.id}">
                <div class="cp-fav-meta">
                    <span class="cp-fav-char">${_cuEsc(f.charName)}</span>
                    <span class="cp-fav-role">${f.role === "user" ? "我说" : "对方说"}</span>
                    <span class="cp-fav-time">${new Date(f.savedAt).toLocaleDateString()}</span>
                    <button class="cp-fav-del" onclick="_cpDelFav('${f.id}')">✕</button>
                </div>
                <div class="cp-fav-text">${_cuEsc(f.text)}</div>
            </div>`,
          )
          .join("");

  page.innerHTML = `
        <div class="cp-fav-topbar">
            <button class="cp-fav-back" onclick="document.getElementById('cpFavPage')?.remove()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
                    <path d="M15 18l-6-6 6-6"/>
                </svg>
            </button>
            <span class="cp-fav-title">收藏</span>
        </div>
        <div class="cp-fav-list">${listHTML}</div>`;

  document.getElementById("chatPanel-profile")?.appendChild(page);
}

function _cpDelFav(id) {
  if (!confirm("确认删除该收藏？")) return;
  const favKey = "xxj_chat_favorites";
  let favs = [];
  try {
    favs = JSON.parse(localStorage.getItem(favKey) || "[]");
  } catch {}
  favs = favs.filter((f) => f.id !== id);
  try {
    localStorage.setItem(favKey, JSON.stringify(favs));
  } catch {}
  cpOpenFavorites(); /* 刷新 */
}

function talkCloseConv() {
  const convPage = document.getElementById("talkConvPage");
  if (convPage) convPage.classList.add("hidden");
  _talkActiveCharId = null;
}
