/**
 * storage.js
 * 统一封装 localStorage，key 前缀 xixi_
 * 图片存 base64，文字直接存字符串
 */
const Storage = (() => {
  const P = "xixi_";

  const set = (k, v) => {
    try {
      localStorage.setItem(P + k, JSON.stringify(v));
    } catch (e) {
      console.warn("[Storage] set failed:", k, e);
    }
  };

  const get = (k, fallback = null) => {
    try {
      const r = localStorage.getItem(P + k);
      return r !== null ? JSON.parse(r) : fallback;
    } catch (e) {
      return fallback;
    }
  };

  /* 图片：base64 DataURL */
  const setImg = (k, url) => set("img__" + k, url);
  const getImg = (k) => get("img__" + k, null);

  /* 文字 */
  const setTxt = (k, v) => set("txt__" + k, v);
  const getTxt = (k, fb) => get("txt__" + k, fb);

  return { set, get, setImg, getImg, setTxt, getTxt };
})();
