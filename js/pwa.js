var PWAController = (function () {
  var deferredPrompt = null;
  var resizeTimer = null;

  /*
    修复安装到主屏幕后：
    1. 100vh / 100dvh 高度不准
    2. 底部出现一截空白
    3. Dock 被 safe-bottom 顶得过高
  */
  function updateAppViewport() {
    var height = window.innerHeight || document.documentElement.clientHeight;

    if (!height) return;

    document.documentElement.style.setProperty("--app-height", height + "px");
  }

  function bindViewportFix() {
    updateAppViewport();

    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(updateAppViewport, 80);
    });

    window.addEventListener("orientationchange", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(updateAppViewport, 250);
    });

    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) {
        updateAppViewport();
      }
    });
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;

    window.addEventListener("load", function () {
      navigator.serviceWorker.register("./sw.js").catch(function (error) {
        console.warn("Service Worker 注册失败：", error);
      });
    });
  }

  function listenInstallPrompt() {
    window.addEventListener("beforeinstallprompt", function (event) {
      event.preventDefault();
      deferredPrompt = event;
      console.log("星星机可以安装到桌面。");
    });
  }

  async function install() {
    if (!deferredPrompt) {
      alert("如果没有弹出安装按钮，请使用浏览器菜单中的“添加到主屏幕”。");
      return;
    }

    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
  }

  function init() {
    bindViewportFix();
    registerServiceWorker();
    listenInstallPrompt();
  }

  return {
    init: init,
    install: install,
    updateAppViewport: updateAppViewport,
  };
})();

window.PWAController = PWAController;
