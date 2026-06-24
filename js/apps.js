const STAR_APPS = [
  {
    id: "chat",
    name: "聊天",
    inDock: true,
    icon: "chat",
  },
  {
    id: "worldbook",
    name: "世界书",
    inDock: true,
    icon: "globe",
  },
  {
    id: "heart",
    name: "心声",
    inDock: false,
    icon: "people",
  },
  {
    id: "forum",
    name: "论坛",
    inDock: false,
    icon: "message",
  },
  {
    id: "diary",
    name: "小芽日记",
    inDock: false,
    icon: "dot",
  },
  {
    id: "street",
    name: "街の声",
    inDock: false,
    icon: "store",
  },
  {
    id: "candy",
    name: "糖果铺",
    inDock: false,
    icon: "bag",
  },
  {
    id: "music",
    name: "音乐",
    inDock: false,
    icon: "music",
  },
  {
    id: "settings",
    name: "设置",
    inDock: true,
    icon: "settings",
  },
];

function getIconSvg(type) {
  const icons = {
    chat: `
      <svg viewBox="0 0 24 24">
        <path d="M5 6.5h14v9H9l-4 3v-12z"/>
        <path d="M8.5 10h7"/>
        <path d="M8.5 12.8h4.5"/>
      </svg>
    `,
    globe: `
      <svg viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="8"/>
        <path d="M4 12h16"/>
        <path d="M12 4c2.3 2.1 3.4 4.8 3.4 8s-1.1 5.9-3.4 8"/>
        <path d="M12 4c-2.3 2.1-3.4 4.8-3.4 8s1.1 5.9 3.4 8"/>
      </svg>
    `,
    people: `
      <svg viewBox="0 0 24 24">
        <circle cx="9" cy="9" r="3"/>
        <circle cx="16.5" cy="10" r="2.4"/>
        <path d="M4 18c.8-3.1 2.7-4.5 5-4.5s4.2 1.4 5 4.5"/>
        <path d="M13.5 17.5c.7-2 2-3 3.5-3 1.6 0 2.9 1 3.5 3"/>
      </svg>
    `,
    message: `
      <svg viewBox="0 0 24 24">
        <path d="M6 5h12v11H9l-3 3V5z"/>
        <path d="M9 9h6"/>
        <path d="M9 12h4"/>
      </svg>
    `,
    dot: `
      <svg viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="8"/>
        <circle cx="9" cy="11" r=".9" fill="#343434"/>
        <circle cx="15" cy="11" r=".9" fill="#343434"/>
        <path d="M9.5 15c1.4 1 3.6 1 5 0"/>
      </svg>
    `,
    store: `
      <svg viewBox="0 0 24 24">
        <path d="M5 10h14"/>
        <path d="M7 10v8h10v-8"/>
        <path d="M6 6h12l1 4H5l1-4z"/>
        <path d="M10 14h4"/>
      </svg>
    `,
    bag: `
      <svg viewBox="0 0 24 24">
        <path d="M6.5 9h11l-.8 10h-9.4L6.5 9z"/>
        <path d="M9 9a3 3 0 0 1 6 0"/>
        <path d="M9.5 13.5h5"/>
      </svg>
    `,
    music: `
      <svg viewBox="0 0 24 24">
        <path d="M10 17.5a2.2 2.2 0 1 1-1.5-2.1V6l9-2v10.5"/>
        <path d="M17.5 14.5a2.2 2.2 0 1 1-1.5-2.1"/>
        <path d="M10 8.5l7.5-1.7"/>
      </svg>
    `,
    settings: `
      <svg viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 4v2"/>
        <path d="M12 18v2"/>
        <path d="M4 12h2"/>
        <path d="M18 12h2"/>
        <path d="M6.3 6.3l1.4 1.4"/>
        <path d="M16.3 16.3l1.4 1.4"/>
        <path d="M17.7 6.3l-1.4 1.4"/>
        <path d="M7.7 16.3l-1.4 1.4"/>
      </svg>
    `,
  };

  return icons[type] || icons.dot;
}

function createAppButton(app) {
  const button = document.createElement("button");
  button.className = "app-button";
  button.type = "button";
  button.dataset.appId = app.id;

  button.innerHTML = `
    <span class="app-icon">${getIconSvg(app.icon)}</span>
    <span class="app-name">${app.name}</span>
  `;

  return button;
}

