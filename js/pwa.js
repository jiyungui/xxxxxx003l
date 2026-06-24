var PWAController = (function () {
  var deferredPrompt = null;

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
    registerServiceWorker();
    listenInstallPrompt();
  }

  return {
    init: init,
    install: install,
  };
})();

window.PWAController = PWAController;
