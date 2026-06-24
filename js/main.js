document.addEventListener("DOMContentLoaded", function () {
  renderApps();

  if (window.WidgetController && WidgetController.init) {
    WidgetController.init();
  }

  if (window.PWAController && PWAController.init) {
    PWAController.init();
  }

  if (window.SettingsController && SettingsController.init) {
    SettingsController.init();
  }

  updateTime();
  setInterval(updateTime, 1000 * 30);
});

function renderApps() {
  const appGrid = document.getElementById("appGrid");
  const dock = document.getElementById("dock");

  const normalApps = STAR_APPS.filter((app) => !app.inDock);
  const dockApps = STAR_APPS.filter((app) => app.inDock);

  normalApps.forEach((app) => {
    const button = createAppButton(app);
    button.addEventListener("click", () => handleAppClick(app));
    appGrid.appendChild(button);
  });

  dockApps.forEach((app) => {
    const button = createAppButton(app);
    button.addEventListener("click", () => handleAppClick(app));
    dock.appendChild(button);
  });
}

function handleAppClick(app) {
  if (app.id === "settings") {
    openSettingsModal();
    return;
  }

  showModal(app.name, "这个板块还没有开发。");
}

function openSettingsModal() {
  showModal(
    "设置",
    "基础设置入口已预留。后续可以在这里加入更换壁纸、重排图标、备份数据等功能。",
  );
}

function showModal(title, text) {
  const modal = document.getElementById("appModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalText = document.getElementById("modalText");
  const closeBtn = document.getElementById("modalClose");

  modalTitle.textContent = title;
  modalText.textContent = text;

  if (!modal.open) modal.showModal();

  closeBtn.onclick = () => modal.close();

  modal.addEventListener(
    "click",
    (event) => {
      if (event.target === modal) {
        modal.close();
      }
    },
    { once: true },
  );
}

function updateTime() {
  const timeEl = document.getElementById("statusTime");
  const now = new Date();

  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");

  timeEl.textContent = `${hour}:${minute}`;
}
