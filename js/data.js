/* ==========================================================================
   AA机 - 模块初始数据源 (纯净默认值 · 彻底去除网络外链图 · 浅灰优雅质感)
   ========================================================================== */

export const INITIAL_DATA = {
  // P1 顶部立华奏卡片 (默认浅灰底色，无外链图片依赖)
  profile: {
    banner: "", // 留空时呈现纯净浅灰几何渐变
    bannerTag: "Npcs",
    bannerPosX: 50, // 背景图水平中心百分比
    bannerPosY: 50, // 背景图垂直中心百分比
    bannerScale: 100, // 缩放百分比
    avatar: "", // 留空时呈现高质感浅灰头像占位
    name: "立华奏",
    handle: "@umimilasw",
    bio: "The world of Kanade Tachibana quiet and tender.",
    followers: "13.14K",
    posts: "10"
  },

  couple: {
    name1: "revel",
    name2: "enyou",
    title: "revel & enyou",
    days: 520,
    avatar1: "",
    avatar2: ""
  },
  
  // 对话列表默认置空
  chats: [],

  feeds: [
    {
      id: "f1",
      author: "立华奏",
      time: "10分钟前",
      avatar: "",
      content: "冬日的晨光穿过薄雾，极简的黑白线条让人感到格外平静。AA机正式启动。",
      images: [],
      likes: 128,
      comments: 24
    }
  ],

  characters: [
    { id: "c1", name: "立华奏 (Kanade)", role: "天使会长", desc: "安静而温柔的心灵守护者", avatar: "" },
    { id: "c2", name: "Revel", role: "极客领航者", desc: "理性逻辑与美学构造", avatar: "" }
  ],

  masks: [
    { id: "m1", name: "默认真实身份 (Default)", bio: "原始声纹与记忆核心", isCurrent: true, avatar: "" },
    { id: "m2", name: "观察者 07 (Observer)", bio: "冷峻客观，隐蔽足迹", isCurrent: false, avatar: "" }
  ],

  wallet: {
    balance: "18,920.00",
    currency: "PTS",
    transactions: [
      { id: "t1", title: "购买专属定制主题", time: "今日 12:30", amount: "-120.00", type: "minus" },
      { id: "t2", title: "每日签到与心动利息", time: "今日 00:00", amount: "+50.00", type: "plus" }
    ]
  },

  favorites: [
    { id: "fav1", text: "“所有的晦暗都留给过往，从遇见你开始，凛冬散尽，星河长明。”", from: "立华奏 · 专属语录" }
  ],

  goods: [
    { id: "g1", name: "极简黑曜石外壳皮肤", price: "299 PTS", image: "" }
  ]
};
