var SettingsController = (function () {
  var STORAGE_KEYS = {
    models: "settings.api.models",
    activeModelId: "settings.api.activeModelId",
    temperature: "settings.api.temperature",
    minimax: "settings.minimax.config",
    screen: "settings.screen.config",
  };

  /*
    参考你之前成功版的设置存储。
    用独立 key 空间保存 API / MiniMax，避免和旧数据混在一起。
  */
  var SettingStore = {
    prefix: "xxj_set_",

    set: function (k, v) {
      try {
        localStorage.setItem(this.prefix + k, JSON.stringify(v));
        return true;
      } catch (error) {
        console.warn("SettingStore 保存失败：", k, error);
        return false;
      }
    },

    get: function (k, fallback) {
      try {
        var raw = localStorage.getItem(this.prefix + k);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (error) {
        return fallback;
      }
    },

    remove: function (k) {
      try {
        localStorage.removeItem(this.prefix + k);
      } catch (error) {}
    },

    /*
    清理之前重复保存的旧字段，释放空间。
    不会清空全部 localStorage，只清理设置页里重复的旧 key。
  */
    cleanupDuplicatedSettings: function () {
      var keys = [
        "apiName",
        "apiUrl",
        "apiKey",
        "temperature",
        "minimaxGroupId",
        "minimaxKey",
        "minimaxVoice",
        "minimaxSpeed",
        "minimaxPreviewText",
      ];

      for (var i = 0; i < keys.length; i++) {
        this.remove(keys[i]);
      }

      try {
        localStorage.removeItem(STORAGE_KEYS.models);
        localStorage.removeItem(STORAGE_KEYS.activeModelId);
        localStorage.removeItem(STORAGE_KEYS.temperature);
        localStorage.removeItem(STORAGE_KEYS.minimax);
      } catch (error) {}
    },
  };

  var state = {
    models: [],
    activeModelId: "",
    temperature: 0.7,
  };

  function $(id) {
    return document.getElementById(id);
  }

  function isQuotaError(error) {
    return (
      error &&
      (error.name === "QuotaExceededError" ||
        error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
        error.code === 22 ||
        error.code === 1014)
    );
  }

  function getStorageUsageText() {
    var total = 0;
    var list = [];

    try {
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        var value = localStorage.getItem(key) || "";
        var size = key.length + value.length;

        total += size;
        list.push({
          key: key,
          kb: Math.round(size / 1024),
        });
      }

      list.sort(function (a, b) {
        return b.kb - a.kb;
      });

      return {
        totalKB: Math.round(total / 1024),
        top: list.slice(0, 5),
      };
    } catch (error) {
      return {
        totalKB: 0,
        top: [],
      };
    }
  }

  function saveJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn("保存设置失败：", error);

      if (isQuotaError(error)) {
        var usage = getStorageUsageText();

        throw new Error(
          "本地存储空间已满，当前约 " +
            usage.totalKB +
            "KB。请先清理较大的图片、头像、壁纸缓存。",
        );
      }

      throw error;
    }
  }

  function saveString(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn("保存字符串失败：", error);

      if (isQuotaError(error)) {
        var usage = getStorageUsageText();

        throw new Error(
          "本地存储空间已满，当前约 " +
            usage.totalKB +
            "KB。请先清理较大的图片、头像、壁纸缓存。",
        );
      }

      throw error;
    }
  }

  function getJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function createId() {
    return "model-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
  }

  function openSettings() {
    var page = $("settingsPage");
    if (!page) return;

    page.classList.add("is-open");
    page.setAttribute("aria-hidden", "false");
    showHome();
  }

  function closeSettings() {
    var page = $("settingsPage");
    if (!page) return;

    page.classList.remove("is-open");
    page.setAttribute("aria-hidden", "true");
  }

  function showHome() {
    var home = $("settingsHomeView");
    var api = $("apiSettingsView");
    var screen = $("screenSettingsView");
    var title = $("settingsTitle");
    var subTitle = $("settingsSubTitle");

    if (home) home.classList.add("is-active");
    if (api) api.classList.remove("is-active");
    if (screen) screen.classList.remove("is-active");

    if (title) title.textContent = "设置";
    if (subTitle) subTitle.textContent = "Star Phone Settings";
  }

  function showApi() {
    var home = $("settingsHomeView");
    var api = $("apiSettingsView");
    var screen = $("screenSettingsView");
    var title = $("settingsTitle");
    var subTitle = $("settingsSubTitle");

    if (home) home.classList.remove("is-active");
    if (api) api.classList.add("is-active");
    if (screen) screen.classList.remove("is-active");

    if (title) title.textContent = "API 设置";
    if (subTitle) subTitle.textContent = "Model And Voice Config";

    loadTemperatureToForm();
    renderModelList();
    loadMinimaxToForm();
  }

  function showScreen() {
    var home = $("settingsHomeView");
    var api = $("apiSettingsView");
    var screen = $("screenSettingsView");
    var title = $("settingsTitle");
    var subTitle = $("settingsSubTitle");

    if (home) home.classList.remove("is-active");
    if (api) api.classList.remove("is-active");
    if (screen) screen.classList.add("is-active");

    if (title) title.textContent = "屏幕调整";
    if (subTitle) subTitle.textContent = "Display Filter And Layout";

    loadScreenSettingsToForm();
    applyScreenSettings(getScreenSettings());
    updateClockWidget();
  }

  function bindSettingsCards() {
    var cards = document.querySelectorAll("[data-settings-target]");

    for (var i = 0; i < cards.length; i++) {
      cards[i].addEventListener("click", function () {
        var target = this.getAttribute("data-settings-target");

        if (target === "api") {
          showApi();
          return;
        }

        if (target === "screen") {
          showScreen();
          return;
        }

        alert("这个板块稍后开发：" + target);
      });
    }
  }

  function bindBackButton() {
    var back = $("settingsBack");

    if (!back) return;

    back.addEventListener("click", function () {
      var api = $("apiSettingsView");
      var screen = $("screenSettingsView");

      if (
        (api && api.classList.contains("is-active")) ||
        (screen && screen.classList.contains("is-active"))
      ) {
        showHome();
      } else {
        closeSettings();
      }
    });
  }

  function fillModelToForm(model) {
    if (!model) return;

    var apiNameInput = $("apiNameInput");
    var apiUrlInput = $("apiUrlInput");
    var apiKeyInput = $("apiKeyInput");
    var modelSelect = $("modelSelect");
    var manualModelInput = $("manualModelInput");

    if (apiNameInput) apiNameInput.value = model.name || "";
    if (apiUrlInput) apiUrlInput.value = model.url || "";
    if (apiKeyInput) apiKeyInput.value = model.key || "";
    if (manualModelInput) manualModelInput.value = model.model || "";

    if (model.temperature !== undefined) {
      state.temperature = parseFloat(model.temperature);

      if (isNaN(state.temperature)) {
        state.temperature = 0.7;
      }

      loadTemperatureToForm();
    }

    if (modelSelect) {
      ensureSelectOption(model.model);
      modelSelect.value = model.model || "";
    }
  }

  function ensureSelectOption(modelName) {
    var select = $("modelSelect");

    if (!select || !modelName) return;

    var exists = false;

    for (var i = 0; i < select.options.length; i++) {
      if (select.options[i].value === modelName) {
        exists = true;
        break;
      }
    }

    if (!exists) {
      var option = document.createElement("option");
      option.value = modelName;
      option.textContent = modelName;
      select.appendChild(option);
    }
  }

  function renderModelList() {
    var list = $("modelList");
    if (!list) return;

    /*
    每次渲染都从 SettingStore 同步，避免页面状态和存储不一致。
  */
    state.models = SettingStore.get("modelList", state.models || []);
    state.activeModelId = SettingStore.get(
      "activeModelId",
      state.activeModelId || "",
    );

    if (!Array.isArray(state.models)) {
      state.models = [];
    }

    list.innerHTML = "";

    if (!state.models.length) {
      var empty = document.createElement("p");
      empty.className = "model-empty";
      empty.textContent = "暂无模型。保存模型后会出现在这里，可点击来回切换。";
      list.appendChild(empty);
      return;
    }

    for (var i = 0; i < state.models.length; i++) {
      var model = state.models[i];

      var item = document.createElement("div");
      item.className = "model-item";
      item.setAttribute("data-model-id", model.id);

      if (model.id === state.activeModelId) {
        item.classList.add("is-active");
      }

      var main = document.createElement("button");
      main.type = "button";
      main.className = "model-main";
      main.setAttribute("data-model-id", model.id);

      main.innerHTML =
        "<span>" +
        "<strong>" +
        escapeHTML(model.name || "未命名 API") +
        "</strong>" +
        "<span>" +
        escapeHTML(model.model || "未选择模型") +
        "</span>" +
        "</span>" +
        "<small>" +
        (model.id === state.activeModelId ? "当前" : "切换") +
        "</small>";

      main.addEventListener("click", function () {
        var id = this.getAttribute("data-model-id");
        setActiveModel(id);
      });

      var del = document.createElement("button");
      del.type = "button";
      del.className = "model-delete";
      del.setAttribute("data-model-id", model.id);
      del.textContent = "删除";

      del.addEventListener("click", function (event) {
        event.stopPropagation();

        var id = this.getAttribute("data-model-id");
        deleteModel(id);
      });

      item.appendChild(main);
      item.appendChild(del);
      list.appendChild(item);
    }
  }

  function escapeHTML(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function setActiveModel(id) {
    var model = null;

    for (var i = 0; i < state.models.length; i++) {
      if (state.models[i].id === id) {
        model = state.models[i];
        break;
      }
    }

    if (!model) return;

    state.activeModelId = id;
    state.temperature =
      typeof model.temperature === "number"
        ? model.temperature
        : parseFloat(model.temperature || "0.7");

    if (isNaN(state.temperature)) {
      state.temperature = 0.7;
    }

    /*
    只保存 activeModelId，不再写旧 STORAGE_KEYS。
  */
    SettingStore.set("activeModelId", id);

    fillModelToForm(model);
    loadTemperatureToForm();
    renderModelList();

    var status = $("apiStatusText");
    if (status) {
      status.textContent = "当前已切换到模型：" + (model.model || model.name);
    }
  }

  function deleteModel(id) {
    var target = null;
    var nextList = [];

    for (var i = 0; i < state.models.length; i++) {
      if (state.models[i].id === id) {
        target = state.models[i];
      } else {
        nextList.push(state.models[i]);
      }
    }

    if (!target) return;

    var ok = confirm(
      "确定删除这个模型配置吗？\n\n" +
        (target.name || "未命名 API") +
        " / " +
        (target.model || "未选择模型"),
    );

    if (!ok) return;

    state.models = nextList;

    /*
    如果删除的是当前模型，就自动切到剩余第一个。
  */
    if (state.activeModelId === id) {
      if (state.models.length) {
        state.activeModelId = state.models[0].id;
        fillModelToForm(state.models[0]);
      } else {
        state.activeModelId = "";

        if ($("apiNameInput")) $("apiNameInput").value = "";
        if ($("apiUrlInput")) $("apiUrlInput").value = "";
        if ($("apiKeyInput")) $("apiKeyInput").value = "";
        if ($("manualModelInput")) $("manualModelInput").value = "";
      }
    }

    var ok1 = SettingStore.set("modelList", state.models);
    var ok2 = SettingStore.set("activeModelId", state.activeModelId);

    if (!ok1 || !ok2) {
      alert("删除后保存失败：localStorage 空间不足。建议清理图片缓存。");
      return;
    }

    renderModelList();

    var status = $("apiStatusText");
    if (status) {
      status.textContent = "已删除模型配置：" + (target.model || target.name);
    }
  }

  function getTemperature() {
    var input = $("temperatureInput");
    var value = input ? parseFloat(input.value) : state.temperature;

    if (isNaN(value)) value = 0.7;
    if (value < 0) value = 0;
    if (value > 2) value = 2;

    return value;
  }

  function loadTemperatureToForm() {
    var value = state.temperature;

    if (typeof value !== "number") {
      value = parseFloat(value);
    }

    if (isNaN(value)) value = 0.7;

    state.temperature = value;

    var input = $("temperatureInput");
    var text = $("temperatureValue");
    var tip = $("temperatureTip");

    if (input) input.value = String(value);
    if (text) text.textContent = value.toFixed(1);

    if (tip) {
      if (value <= 0.3) {
        tip.textContent = "当前偏保守：适合事实问答、工具调用、稳定执行。";
      } else if (value <= 0.9) {
        tip.textContent = "当前较平衡：适合日常聊天、角色回复和普通创作。";
      } else if (value <= 1.4) {
        tip.textContent = "当前偏发散：回答会更有想象力，但稳定性会下降。";
      } else {
        tip.textContent = "当前很天马行空：适合灵感创作，但可能更容易跑偏。";
      }
    }
  }

  function bindTemperatureInput() {
    var input = $("temperatureInput");

    if (!input) return;

    input.addEventListener("input", function () {
      var value = getTemperature();

      state.temperature = value;

      var text = $("temperatureValue");
      var tip = $("temperatureTip");

      if (text) text.textContent = value.toFixed(1);

      if (tip) {
        if (value <= 0.3) {
          tip.textContent = "当前偏保守：适合事实问答、工具调用、稳定执行。";
        } else if (value <= 0.9) {
          tip.textContent = "当前较平衡：适合日常聊天、角色回复和普通创作。";
        } else if (value <= 1.4) {
          tip.textContent = "当前偏发散：回答会更有想象力，但稳定性会下降。";
        } else {
          tip.textContent = "当前很天马行空：适合灵感创作，但可能更容易跑偏。";
        }
      }
    });
  }
  function saveModel() {
    var saveBtn = $("saveModelBtn");
    var status = $("apiStatusText");

    var apiNameInput = $("apiNameInput");
    var apiUrlInput = $("apiUrlInput");
    var apiKeyInput = $("apiKeyInput");
    var modelSelect = $("modelSelect");
    var manualModelInput = $("manualModelInput");

    var apiName = apiNameInput ? apiNameInput.value.trim() : "";
    var apiUrl = apiUrlInput ? apiUrlInput.value.trim() : "";
    var apiKey = apiKeyInput ? apiKeyInput.value.trim() : "";
    var selectedModel = modelSelect ? modelSelect.value.trim() : "";
    var manualModel = manualModelInput ? manualModelInput.value.trim() : "";

    if (
      !selectedModel &&
      modelSelect &&
      modelSelect.selectedOptions &&
      modelSelect.selectedOptions[0]
    ) {
      selectedModel = modelSelect.selectedOptions[0].textContent.trim();
    }

    var modelName = manualModel || selectedModel;
    var temperature = getTemperature();

    if (!apiName) {
      alert("请填写 API 名称");
      return;
    }

    if (!apiUrl) {
      alert("请填写 API URL");
      return;
    }

    if (!apiKey) {
      alert("请填写 API Key");
      return;
    }

    if (
      !modelName ||
      modelName === "请先拉取或手动输入模型" ||
      modelName === "没有读取到模型，请手动输入"
    ) {
      alert("请选择或手动输入模型名");
      return;
    }

    if (saveBtn) {
      saveBtn.classList.add("is-loading");
      saveBtn.textContent = "保存中...";
    }

    try {
      /*
      清理之前重复保存的旧字段。
      注意：这里只清理旧 API/MiniMax 分散字段，不清理当前 modelList。
    */
      SettingStore.cleanupDuplicatedSettings();

      var list = SettingStore.get("modelList", []);

      if (!Array.isArray(list)) {
        list = [];
      }

      var existing = null;

      for (var i = 0; i < list.length; i++) {
        if (
          list[i].name === apiName &&
          list[i].url === apiUrl &&
          list[i].model === modelName
        ) {
          existing = list[i];
          break;
        }
      }

      var id;

      if (existing) {
        existing.key = apiKey;
        existing.temperature = temperature;
        existing.updatedAt = Date.now();
        id = existing.id;
      } else {
        id = createId();

        list.push({
          id: id,
          name: apiName,
          url: apiUrl,
          key: apiKey,
          model: modelName,
          temperature: temperature,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }

      /*
      最多保留 10 个模型，避免无限增长。
    */
      if (list.length > 10) {
        list = list.slice(list.length - 10);
      }

      var ok1 = SettingStore.set("modelList", list);
      var ok2 = SettingStore.set("activeModelId", id);

      if (!ok1 || !ok2) {
        throw new Error("localStorage 空间不足，写入失败");
      }

      state.models = list;
      state.activeModelId = id;
      state.temperature = temperature;

      ensureSelectOption(modelName);
      renderModelList();

      if (status) {
        status.textContent =
          "保存成功：" + modelName + "，温度 " + temperature.toFixed(1);
      }
    } catch (error) {
      console.error("保存模型失败：", error);

      if (status) {
        status.textContent = "保存失败：" + error.message;
      }

      alert("保存失败：" + error.message);
    } finally {
      if (saveBtn) {
        saveBtn.classList.remove("is-loading");
        saveBtn.textContent = "保存模型";
      }
    }
  }

  async function fetchModels() {
    var apiUrlInput = $("apiUrlInput");
    var apiKeyInput = $("apiKeyInput");
    var status = $("apiStatusText");
    var select = $("modelSelect");

    var apiUrl = apiUrlInput ? apiUrlInput.value.trim() : "";
    var apiKey = apiKeyInput ? apiKeyInput.value.trim() : "";

    if (!apiUrl) {
      alert("请先填写 API URL");
      return;
    }

    if (!select) return;

    if (status) status.textContent = "正在尝试拉取模型列表...";

    var url = apiUrl.replace(/\/$/, "") + "/models";

    try {
      var res = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: apiKey ? "Bearer " + apiKey : "",
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        throw new Error("HTTP " + res.status);
      }

      var data = await res.json();
      var models = normalizeModels(data);

      select.innerHTML = "";

      if (!models.length) {
        var empty = document.createElement("option");
        empty.value = "";
        empty.textContent = "没有读取到模型，请手动输入";
        select.appendChild(empty);
      } else {
        for (var i = 0; i < models.length; i++) {
          var option = document.createElement("option");
          option.value = models[i];
          option.textContent = models[i];
          select.appendChild(option);
        }
      }

      if (status)
        status.textContent = "模型列表拉取完成，共 " + models.length + " 个。";
    } catch (error) {
      console.warn("拉取模型失败：", error);

      if (status) {
        status.textContent =
          "拉取失败。可能是接口不支持 /models、跨域限制，或 API Key 不正确。你仍然可以手动输入模型名。";
      }
    }
  }

  function normalizeModels(data) {
    var result = [];

    if (data && Array.isArray(data.data)) {
      for (var i = 0; i < data.data.length; i++) {
        if (typeof data.data[i] === "string") {
          result.push(data.data[i]);
        } else if (data.data[i] && data.data[i].id) {
          result.push(data.data[i].id);
        }
      }
    }

    if (data && Array.isArray(data.models)) {
      for (var j = 0; j < data.models.length; j++) {
        if (typeof data.models[j] === "string") {
          result.push(data.models[j]);
        } else if (data.models[j] && data.models[j].id) {
          result.push(data.models[j].id);
        } else if (data.models[j] && data.models[j].name) {
          result.push(data.models[j].name);
        }
      }
    }

    return result;
  }

  async function testModel() {
    var testBtn = $("testModelBtn");
    var apiUrlInput = $("apiUrlInput");
    var apiKeyInput = $("apiKeyInput");
    var modelSelect = $("modelSelect");
    var manualModelInput = $("manualModelInput");
    var status = $("apiStatusText");

    var apiUrl = apiUrlInput ? apiUrlInput.value.trim() : "";
    var apiKey = apiKeyInput ? apiKeyInput.value.trim() : "";
    var selectedModel = modelSelect ? modelSelect.value.trim() : "";
    var manualModel = manualModelInput ? manualModelInput.value.trim() : "";

    if (
      !selectedModel &&
      modelSelect &&
      modelSelect.selectedOptions &&
      modelSelect.selectedOptions[0]
    ) {
      selectedModel = modelSelect.selectedOptions[0].textContent.trim();
    }

    var modelName = manualModel || selectedModel;
    var temperature = getTemperature();

    if (!apiUrl || !modelName) {
      alert("请填写 API URL，并选择或输入模型");
      return;
    }

    if (status) status.textContent = "正在快速测试模型...";
    if (testBtn) {
      testBtn.classList.add("is-loading");
      testBtn.textContent = "测试中...";
    }

    var url = apiUrl.replace(/\/$/, "") + "/chat/completions";
    var controller = new AbortController();
    var timer = setTimeout(function () {
      controller.abort();
    }, 12000);

    try {
      var res = await fetch(url, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: apiKey ? "Bearer " + apiKey : "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            {
              role: "user",
              content: "只回复 OK",
            },
          ],
          temperature: temperature,
          max_tokens: 3,
          stream: false,
        }),
      });

      clearTimeout(timer);

      if (!res.ok) {
        throw new Error("HTTP " + res.status);
      }

      if (status) {
        status.textContent =
          "测试成功，模型可用：" +
          modelName +
          "，温度 " +
          temperature.toFixed(1);
      }
    } catch (error) {
      clearTimeout(timer);
      console.warn("测试模型失败：", error);

      if (status) {
        if (error.name === "AbortError") {
          status.textContent = "测试超时。接口响应太慢，已自动停止。";
        } else {
          status.textContent =
            "测试失败。请检查 API URL、API Key、模型名，或接口是否兼容 OpenAI 格式。";
        }
      }
    } finally {
      if (testBtn) {
        testBtn.classList.remove("is-loading");
        testBtn.textContent = "测试模型";
      }
    }
  }

  function saveMinimax() {
    var groupId = $("minimaxGroupInput")
      ? $("minimaxGroupInput").value.trim()
      : "";
    var apiKey = $("minimaxKeyInput") ? $("minimaxKeyInput").value.trim() : "";
    var voiceId = $("minimaxVoiceInput")
      ? $("minimaxVoiceInput").value.trim()
      : "";
    var speed = $("minimaxSpeedInput") ? $("minimaxSpeedInput").value : "1";
    var previewText = $("minimaxPreviewText")
      ? $("minimaxPreviewText").value.trim()
      : "";

    if (!groupId) {
      alert("请填写 MiniMax Group ID");
      return;
    }

    if (!apiKey) {
      alert("请填写 MiniMax API Key");
      return;
    }

    if (!voiceId) {
      alert("请填写 Voice ID");
      return;
    }

    /*
    先清掉之前分散保存的重复字段。
  */
    SettingStore.cleanupDuplicatedSettings();

    var ok = SettingStore.set("minimax", {
      groupId: groupId,
      apiKey: apiKey,
      voiceId: voiceId,
      speed: speed,
      previewText: previewText,
      updatedAt: Date.now(),
    });

    if (!ok) {
      alert(
        "MiniMax 保存失败：localStorage 空间不足，请先删除多余模型或清理图片缓存。",
      );
      return;
    }

    alert("MiniMax 语音配置已保存");
  }

  function loadMinimaxToForm() {
    var config = SettingStore.get("minimax", getJSON(STORAGE_KEYS.minimax, {}));

    /*
    兼容之前分散保存的旧字段。
    读得到就回填，但新保存时只保存 minimax 一个对象。
  */
    var groupId = config.groupId || SettingStore.get("minimaxGroupId", "");
    var apiKey = config.apiKey || SettingStore.get("minimaxKey", "");
    var voiceId = config.voiceId || SettingStore.get("minimaxVoice", "");
    var speed = config.speed || SettingStore.get("minimaxSpeed", "1");
    var previewText =
      config.previewText ||
      SettingStore.get("minimaxPreviewText", "你好，我是星星机。");

    if ($("minimaxGroupInput")) {
      $("minimaxGroupInput").value = groupId;
    }

    if ($("minimaxKeyInput")) {
      $("minimaxKeyInput").value = apiKey;
    }

    if ($("minimaxVoiceInput")) {
      $("minimaxVoiceInput").value = voiceId;
    }

    if ($("minimaxSpeedInput")) {
      $("minimaxSpeedInput").value = speed;
    }

    if ($("minimaxPreviewText")) {
      $("minimaxPreviewText").value = previewText;
    }
  }

  function hexToUint8Array(hex) {
    var clean = String(hex || "").replace(/\s/g, "");

    if (clean.length % 2 !== 0) {
      clean = "0" + clean;
    }

    var array = new Uint8Array(clean.length / 2);

    for (var i = 0; i < clean.length; i += 2) {
      array[i / 2] = parseInt(clean.slice(i, i + 2), 16);
    }

    return array;
  }

  function base64ToUint8Array(base64) {
    var binary = atob(base64);
    var array = new Uint8Array(binary.length);

    for (var i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i);
    }

    return array;
  }

  function audioTextToBlob(audioText) {
    var text = String(audioText || "");

    /*
    MiniMax 常见返回是 hex。
    如果你的接口返回 base64，这里也兼容。
  */
    var isHex = /^[0-9a-fA-F]+$/.test(text);

    var bytes = isHex ? hexToUint8Array(text) : base64ToUint8Array(text);
    return new Blob([bytes], { type: "audio/mpeg" });
  }

  async function readResponseError(res) {
    var text = "";

    try {
      text = await res.text();
    } catch (error) {
      return "HTTP " + res.status;
    }

    if (!text) {
      return "HTTP " + res.status;
    }

    try {
      var json = JSON.parse(text);

      if (json.base_resp && json.base_resp.status_msg) {
        return json.base_resp.status_msg;
      }

      if (json.status_msg) {
        return json.status_msg;
      }

      if (json.message) {
        return json.message;
      }

      if (json.error && json.error.message) {
        return json.error.message;
      }

      return text.slice(0, 220);
    } catch (error) {
      return text.slice(0, 220);
    }
  }

  var previewAudioUrl = null;

  async function previewMinimaxVoice() {
    var btn = $("previewMinimaxBtn");
    var audio = $("minimaxPreviewAudio");
    var status = $("minimaxPreviewStatus");

    /*
    优先从表单读取。
    不强制要求先点保存。
  */
    var groupId = $("minimaxGroupInput")
      ? $("minimaxGroupInput").value.trim()
      : "";
    var apiKey = $("minimaxKeyInput") ? $("minimaxKeyInput").value.trim() : "";
    var voiceId = $("minimaxVoiceInput")
      ? $("minimaxVoiceInput").value.trim()
      : "";
    var speed = $("minimaxSpeedInput")
      ? parseFloat($("minimaxSpeedInput").value || "1")
      : 1;
    var text = $("minimaxPreviewText")
      ? $("minimaxPreviewText").value.trim()
      : "";

    if (!groupId) {
      alert("请填写 MiniMax Group ID");
      return;
    }

    if (!apiKey) {
      alert("请填写 MiniMax API Key");
      return;
    }

    if (!voiceId) {
      alert("请填写 Voice ID");
      return;
    }

    if (!text) {
      alert("请输入试听文字");
      return;
    }

    if (btn) {
      btn.classList.add("is-loading");
      btn.textContent = "合成中...";
    }

    if (status) {
      status.textContent = "正在合成语音，请稍候...";
    }

    try {
      /*
      改回你之前成功过的接口。
    */
      var apiUrl =
        "https://api.minimax.chat/v1/text_to_speech?GroupId=" +
        encodeURIComponent(groupId);

      var body = {
        model: "speech-01",
        text: text,
        voice_id: voiceId,
        speed: speed,
        vol: 1.0,
        pitch: 0,
      };

      var res = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + apiKey,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        var errData = await res.json().catch(function () {
          return {};
        });

        var msg =
          errData && errData.base_resp && errData.base_resp.status_msg
            ? errData.base_resp.status_msg
            : "HTTP " + res.status;

        throw new Error(msg);
      }

      /*
      成功版逻辑：直接读取 blob。
    */
      if (previewAudioUrl) {
        URL.revokeObjectURL(previewAudioUrl);
        previewAudioUrl = null;
      }

      var blob = await res.blob();
      previewAudioUrl = URL.createObjectURL(blob);

      if (audio) {
        audio.src = previewAudioUrl;
        audio.classList.add("is-show");
        audio.play().catch(function () {});
      }

      if (status) {
        status.textContent = "试听生成成功。";
      }
    } catch (error) {
      console.warn("MiniMax 试听失败：", error);

      if (status) {
        status.textContent = "试听失败：" + error.message;
      }
    } finally {
      if (btn) {
        btn.classList.remove("is-loading");
        btn.textContent = "试听声音";
      }
    }
  }

  /* ===============================
   屏幕调整 / 色调滤镜 / 顶部小组件
================================ */

  var clockWidgetTimer = null;

  function getDefaultScreenSettings() {
    return {
      filter: "none",
      offsetX: 0,
      offsetY: 0,
      scale: 1,
      hideStatusBar: false,
      hideDynamicIsland: false,
      topWidgetMode: "profile",
      timezone: "local",
      location: "Local",
      weather: "晴 24℃",
      nightMode: false,
      eyeMode: false,
    };
  }

  function getScreenSettings() {
    var defaults = getDefaultScreenSettings();
    var saved = SettingStore.get("screenConfig", null);

    if (!saved) {
      saved = getJSON(STORAGE_KEYS.screen, {});
    }

    var config = {};

    for (var key in defaults) {
      if (Object.prototype.hasOwnProperty.call(defaults, key)) {
        config[key] =
          saved && saved[key] !== undefined ? saved[key] : defaults[key];
      }
    }

    config.offsetX = parseInt(config.offsetX, 10);
    config.offsetY = parseInt(config.offsetY, 10);
    config.scale = parseFloat(config.scale);

    if (isNaN(config.offsetX)) config.offsetX = 0;
    if (isNaN(config.offsetY)) config.offsetY = 0;
    if (isNaN(config.scale)) config.scale = 1;

    return config;
  }

  function saveScreenSettings(config) {
    try {
      localStorage.removeItem(STORAGE_KEYS.screen);
    } catch (error) {}

    return SettingStore.set("screenConfig", config);
  }

  function getScreenFilterValue(name) {
    if (name === "vintage") {
      return "sepia(0.28) saturate(0.82) contrast(0.96) brightness(1.03)";
    }

    if (name === "dopamine") {
      return "saturate(1.45) contrast(1.05) brightness(1.06) hue-rotate(-4deg)";
    }

    if (name === "cream") {
      return "sepia(0.12) saturate(0.88) brightness(1.08) contrast(0.94)";
    }

    if (name === "cool") {
      return "saturate(0.9) brightness(1.08) contrast(1.03) hue-rotate(8deg)";
    }

    if (name === "film") {
      return "sepia(0.16) saturate(1.12) contrast(1.12) brightness(0.98)";
    }

    if (name === "cyber") {
      return "saturate(1.35) contrast(1.12) brightness(0.98) hue-rotate(18deg)";
    }

    return "none";
  }

  function applyScreenSettings(config) {
    var screen = $("phoneScreen");

    if (!screen) return;

    screen.style.transform =
      "translate(" +
      config.offsetX +
      "px, " +
      config.offsetY +
      "px) scale(" +
      config.scale +
      ")";

    screen.style.filter = getScreenFilterValue(config.filter);

    screen.classList.toggle("screen-hide-status", !!config.hideStatusBar);
    screen.classList.toggle("screen-hide-island", !!config.hideDynamicIsland);
    screen.classList.toggle("screen-night", !!config.nightMode);
    screen.classList.toggle("screen-eye", !!config.eyeMode);

    applyTopWidgetMode(config);
    updateScreenFormValueLabels(config);
  }

  function updateScreenFormValueLabels(config) {
    var xText = $("screenOffsetXValue");
    var yText = $("screenOffsetYValue");
    var scaleText = $("screenScaleValue");

    if (xText) xText.textContent = config.offsetX + "px";
    if (yText) yText.textContent = config.offsetY + "px";
    if (scaleText) scaleText.textContent = Number(config.scale).toFixed(2);
  }

  function loadScreenSettingsToForm() {
    var config = getScreenSettings();

    if ($("screenFilterSelect")) $("screenFilterSelect").value = config.filter;
    if ($("screenOffsetXInput")) $("screenOffsetXInput").value = config.offsetX;
    if ($("screenOffsetYInput")) $("screenOffsetYInput").value = config.offsetY;
    if ($("screenScaleInput")) $("screenScaleInput").value = config.scale;

    if ($("hideStatusBarInput"))
      $("hideStatusBarInput").checked = !!config.hideStatusBar;

    if ($("hideDynamicIslandInput"))
      $("hideDynamicIslandInput").checked = !!config.hideDynamicIsland;

    if ($("topWidgetModeSelect"))
      $("topWidgetModeSelect").value = config.topWidgetMode;

    if ($("clockTimezoneSelect"))
      $("clockTimezoneSelect").value = config.timezone;

    if ($("clockLocationInput"))
      $("clockLocationInput").value = config.location;

    if ($("clockWeatherInput")) $("clockWeatherInput").value = config.weather;

    if ($("screenNightModeInput"))
      $("screenNightModeInput").checked = !!config.nightMode;

    if ($("screenEyeModeInput"))
      $("screenEyeModeInput").checked = !!config.eyeMode;

    updateScreenFormValueLabels(config);
    updateClockPreview(config);
  }

  function readScreenSettingsFromForm() {
    var defaults = getDefaultScreenSettings();

    var config = {
      filter: $("screenFilterSelect")
        ? $("screenFilterSelect").value
        : defaults.filter,

      offsetX: $("screenOffsetXInput")
        ? parseInt($("screenOffsetXInput").value, 10)
        : defaults.offsetX,

      offsetY: $("screenOffsetYInput")
        ? parseInt($("screenOffsetYInput").value, 10)
        : defaults.offsetY,

      scale: $("screenScaleInput")
        ? parseFloat($("screenScaleInput").value)
        : defaults.scale,

      hideStatusBar: $("hideStatusBarInput")
        ? $("hideStatusBarInput").checked
        : defaults.hideStatusBar,

      hideDynamicIsland: $("hideDynamicIslandInput")
        ? $("hideDynamicIslandInput").checked
        : defaults.hideDynamicIsland,

      topWidgetMode: $("topWidgetModeSelect")
        ? $("topWidgetModeSelect").value
        : defaults.topWidgetMode,

      timezone: $("clockTimezoneSelect")
        ? $("clockTimezoneSelect").value
        : defaults.timezone,

      location: $("clockLocationInput")
        ? $("clockLocationInput").value.trim()
        : defaults.location,

      weather: $("clockWeatherInput")
        ? $("clockWeatherInput").value.trim()
        : defaults.weather,

      nightMode: $("screenNightModeInput")
        ? $("screenNightModeInput").checked
        : defaults.nightMode,

      eyeMode: $("screenEyeModeInput")
        ? $("screenEyeModeInput").checked
        : defaults.eyeMode,
    };

    if (isNaN(config.offsetX)) config.offsetX = 0;
    if (isNaN(config.offsetY)) config.offsetY = 0;
    if (isNaN(config.scale)) config.scale = 1;

    if (!config.location) config.location = defaults.location;
    if (!config.weather) config.weather = defaults.weather;

    return config;
  }

  function bindScreenSettings() {
    var ids = [
      "screenFilterSelect",
      "screenOffsetXInput",
      "screenOffsetYInput",
      "screenScaleInput",
      "hideStatusBarInput",
      "hideDynamicIslandInput",
      "topWidgetModeSelect",
      "clockTimezoneSelect",
      "clockLocationInput",
      "clockWeatherInput",
      "screenNightModeInput",
      "screenEyeModeInput",
    ];

    for (var i = 0; i < ids.length; i++) {
      var el = $(ids[i]);

      if (!el) continue;

      var eventName =
        el.tagName === "INPUT" && (el.type === "range" || el.type === "text")
          ? "input"
          : "change";

      el.addEventListener(eventName, function () {
        var config = readScreenSettingsFromForm();
        applyScreenSettings(config);
        updateClockPreview(config);
      });
    }

    var saveBtn = $("saveScreenSettingsBtn");
    var resetBtn = $("resetScreenSettingsBtn");

    if (saveBtn) {
      saveBtn.addEventListener("click", function () {
        var config = readScreenSettingsFromForm();
        var ok = saveScreenSettings(config);
        var status = $("screenSettingsStatus");

        applyScreenSettings(config);
        updateClockPreview(config);

        if (ok) {
          if (status) status.textContent = "屏幕设置已保存。";
          alert("屏幕设置已保存");
        } else {
          if (status) status.textContent = "保存失败：localStorage 空间不足。";
          alert("保存失败：localStorage 空间不足。");
        }
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        var ok = confirm("确定恢复默认屏幕设置吗？");

        if (!ok) return;

        var config = getDefaultScreenSettings();

        SettingStore.remove("screenConfig");

        try {
          localStorage.removeItem(STORAGE_KEYS.screen);
        } catch (error) {}

        loadScreenSettingsToForm();
        applyScreenSettings(config);
        updateClockPreview(config);

        var status = $("screenSettingsStatus");
        if (status) status.textContent = "已恢复默认屏幕设置。";
      });
    }
  }

  function getClockDate(config) {
    var now = new Date();

    if (!config || !config.timezone || config.timezone === "local") {
      return now;
    }

    try {
      var str = now.toLocaleString("en-US", {
        timeZone: config.timezone,
      });

      return new Date(str);
    } catch (error) {
      return now;
    }
  }

  function formatClockTime(config) {
    var date = getClockDate(config);
    var hh = String(date.getHours()).padStart(2, "0");
    var mm = String(date.getMinutes()).padStart(2, "0");

    return hh + ":" + mm;
  }

  function formatClockDate(config) {
    var date = getClockDate(config);
    var weeks = [
      "星期日",
      "星期一",
      "星期二",
      "星期三",
      "星期四",
      "星期五",
      "星期六",
    ];

    return (
      date.getFullYear() +
      "年" +
      (date.getMonth() + 1) +
      "月" +
      date.getDate() +
      "日 " +
      weeks[date.getDay()]
    );
  }

  function updateClockPreview(config) {
    if (!config) config = getScreenSettings();

    var timeEl = $("clockPreviewTime");
    var dateEl = $("clockPreviewDate");
    var metaEl = $("clockPreviewMeta");

    if (timeEl) timeEl.textContent = formatClockTime(config);
    if (dateEl) dateEl.textContent = formatClockDate(config);
    if (metaEl) metaEl.textContent = config.location + " · " + config.weather;
  }

  function ensureClockWidgetView() {
    var topWidget = $("topWidget");

    if (!topWidget) return null;

    var view = topWidget.querySelector(".clock-widget-view");

    if (!view) {
      view = document.createElement("div");
      view.className = "clock-widget-view";
      view.innerHTML =
        '<strong class="clock-widget-time" id="clockWidgetTime">19:50</strong>' +
        '<span class="clock-widget-date" id="clockWidgetDate">2026年6月24日 星期三</span>' +
        '<em class="clock-widget-meta" id="clockWidgetMeta">Local · 晴 24℃</em>';

      topWidget.appendChild(view);
    }

    return view;
  }

  function applyTopWidgetMode(config) {
    var topWidget = $("topWidget");

    if (!topWidget) return;

    if (config.topWidgetMode === "clock") {
      ensureClockWidgetView();
      topWidget.classList.add("is-clock-widget");
      startClockWidgetTimer();
      updateClockWidget(config);
    } else {
      topWidget.classList.remove("is-clock-widget");
      stopClockWidgetTimer();
    }
  }

  function updateClockWidget(config) {
    if (!config) config = getScreenSettings();

    var topWidget = $("topWidget");

    if (!topWidget || config.topWidgetMode !== "clock") return;

    ensureClockWidgetView();

    var timeEl = $("clockWidgetTime");
    var dateEl = $("clockWidgetDate");
    var metaEl = $("clockWidgetMeta");

    if (timeEl) timeEl.textContent = formatClockTime(config);
    if (dateEl) dateEl.textContent = formatClockDate(config);
    if (metaEl) metaEl.textContent = config.location + " · " + config.weather;

    updateClockPreview(config);
  }

  function startClockWidgetTimer() {
    if (clockWidgetTimer) return;

    clockWidgetTimer = setInterval(function () {
      var config = getScreenSettings();
      updateClockWidget(config);
    }, 1000);
  }

  function stopClockWidgetTimer() {
    if (clockWidgetTimer) {
      clearInterval(clockWidgetTimer);
      clockWidgetTimer = null;
    }
  }

  function bindApiButtons() {
    var fetchBtn = $("fetchModelsBtn");
    var testBtn = $("testModelBtn");
    var saveBtn = $("saveModelBtn");
    var saveMiniBtn = $("saveMinimaxBtn");
    var previewMiniBtn = $("previewMinimaxBtn");

    if (fetchBtn) fetchBtn.addEventListener("click", fetchModels);
    if (testBtn) testBtn.addEventListener("click", testModel);
    if (saveBtn) saveBtn.addEventListener("click", saveModel);
    if (saveMiniBtn) saveMiniBtn.addEventListener("click", saveMinimax);
    if (previewMiniBtn)
      previewMiniBtn.addEventListener("click", previewMinimaxVoice);
  }

  state.models = SettingStore.get("modelList", state.models || []);
  state.activeModelId = SettingStore.get(
    "activeModelId",
    state.activeModelId || "",
  );
  function loadState() {
    state.models = SettingStore.get("modelList", []);
    state.activeModelId = SettingStore.get("activeModelId", "");

    if (!Array.isArray(state.models)) {
      state.models = [];
    }

    if (state.activeModelId) {
      for (var i = 0; i < state.models.length; i++) {
        if (state.models[i].id === state.activeModelId) {
          fillModelToForm(state.models[i]);
          break;
        }
      }
    } else if (state.models.length) {
      state.activeModelId = state.models[0].id;
      SettingStore.set("activeModelId", state.activeModelId);
      fillModelToForm(state.models[0]);
    }

    if (isNaN(parseFloat(state.temperature))) {
      state.temperature = 0.7;
    }

    loadTemperatureToForm();
  }

  function bindSettingAppClick() {
    document.addEventListener(
      "click",
      function (event) {
        var appButton = event.target.closest(".app-button");
        if (!appButton) return;

        var text = appButton.textContent || "";

        if (text.indexOf("设置") !== -1) {
          event.preventDefault();
          event.stopPropagation();
          openSettings();
        }
      },
      true,
    );
  }

  function init() {
    loadState();

    /*
    页面启动时立即应用屏幕设置。
    这样刷新后滤镜、位置、隐藏状态栏、小组件模式都会保留。
  */
    applyScreenSettings(getScreenSettings());

    bindBackButton();
    bindSettingsCards();
    bindApiButtons();
    bindTemperatureInput();
    bindScreenSettings();
    bindSettingAppClick();

    renderModelList();
    updateClockWidget();
  }

  return {
    init: init,
    open: openSettings,
    close: closeSettings,
  };
})();

window.SettingsController = SettingsController;
