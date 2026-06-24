var WidgetController = (function () {
  var TEXT_KEYS = {
    title: "widget.top.title",
    sub: "widget.top.sub",
    link: "widget.top.link",
    leftCaption: "widget.left.caption",
  };

  var IMAGE_KEYS = {
    topAvatar: "widget.image.top.avatar",
    left: "widget.image.left",
    right: "widget.image.right",
  };

  var boundTextInputs = [];

  function createRandomLink() {
    return (
      "https://star-" + Math.random().toString(36).slice(2, 8) + ".example.com"
    );
  }

  function saveText(key, value) {
    if (window.StarStorage && StarStorage.saveText) {
      StarStorage.saveText(key, value);
      return;
    }

    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.warn("文字保存失败：", key, error);
    }
  }

  async function getText(key, fallback) {
    if (window.StarStorage && StarStorage.getTextAsync) {
      return await StarStorage.getTextAsync(key, fallback);
    }

    if (window.StarStorage && StarStorage.getText) {
      return StarStorage.getText(key, fallback);
    }

    try {
      var value = localStorage.getItem(key);
      return value === null ? fallback : value;
    } catch (error) {
      return fallback;
    }
  }

  async function bindPersistentInput(inputId, key, fallback) {
    var input = document.getElementById(inputId);
    if (!input) return;

    var savedValue = await getText(key, fallback || "");
    input.value = savedValue;

    function save() {
      saveText(key, input.value);
    }

    input.addEventListener("input", save);
    input.addEventListener("change", save);
    input.addEventListener("blur", save);
    input.addEventListener("keyup", save);
    input.addEventListener("compositionend", save);

    boundTextInputs.push({
      el: input,
      key: key,
      type: "input",
    });
  }

  async function initTopWidget() {
    var titleInput = document.getElementById("topWidgetTitle");
    var subInput = document.getElementById("topWidgetSub");
    var linkInput = document.getElementById("topWidgetLink");
    var resetBtn = document.getElementById("topWidgetReset");

    var savedLink = await getText(TEXT_KEYS.link, "");
    var defaultLink = savedLink || createRandomLink();

    await bindPersistentInput("topWidgetTitle", TEXT_KEYS.title, "");
    await bindPersistentInput("topWidgetSub", TEXT_KEYS.sub, "");
    await bindPersistentInput("topWidgetLink", TEXT_KEYS.link, defaultLink);

    if (!savedLink) {
      saveText(TEXT_KEYS.link, defaultLink);
      if (linkInput) linkInput.value = defaultLink;
    }

    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        var newLink = createRandomLink();

        if (titleInput) titleInput.value = "";
        if (subInput) subInput.value = "";
        if (linkInput) linkInput.value = newLink;

        saveText(TEXT_KEYS.title, "");
        saveText(TEXT_KEYS.sub, "");
        saveText(TEXT_KEYS.link, newLink);
      });
    }
  }

  async function saveImageToStorage(imageKey, file) {
    if (!file) return;

    if (window.StarStorage && StarStorage.saveImage) {
      await StarStorage.saveImage(imageKey, file);
      return;
    }

    throw new Error(
      "StarStorage.saveImage 不存在，请检查 js/storage.js 是否正常加载",
    );
  }

  async function getImageFromStorage(imageKey) {
    if (window.StarStorage && StarStorage.getImage) {
      return await StarStorage.getImage(imageKey);
    }

    return null;
  }

  function setPreview(preview, picker, blobOrFile) {
    if (!preview || !picker || !blobOrFile) return;

    var url = URL.createObjectURL(blobOrFile);
    preview.src = url;
    picker.classList.add("has-image");
  }

  async function loadImage(imageKey, previewId, pickerId) {
    var preview = document.getElementById(previewId);
    var picker = document.getElementById(pickerId);

    if (!preview || !picker) return;

    try {
      var blob = await getImageFromStorage(imageKey);

      if (!blob) return;

      setPreview(preview, picker, blob);
    } catch (error) {
      console.warn("加载图片失败：", imageKey, error);
    }
  }

  function bindImageInput(inputId, previewId, pickerId, imageKey) {
    var input = document.getElementById(inputId);
    var preview = document.getElementById(previewId);
    var picker = document.getElementById(pickerId);

    if (!input || !preview || !picker) {
      console.warn("图片小组件绑定失败：", inputId, previewId, pickerId);
      return;
    }

    input.addEventListener("change", async function () {
      var file = input.files && input.files[0];

      if (!file) return;

      if (!file.type || file.type.indexOf("image/") !== 0) {
        alert("请选择图片文件");
        input.value = "";
        return;
      }

      try {
        await saveImageToStorage(imageKey, file);
        setPreview(preview, picker, file);
      } catch (error) {
        console.error("保存图片失败：", error);
        alert("图片保存失败，请检查浏览器是否允许网站存储数据。");
      }

      input.value = "";
    });

    loadImage(imageKey, previewId, pickerId);
  }

  async function initCaption() {
    var caption = document.getElementById("leftWidgetCaption");
    if (!caption) return;

    var savedCaption = await getText(TEXT_KEYS.leftCaption, "First Choice");
    caption.textContent = savedCaption;

    function saveCaption() {
      saveText(TEXT_KEYS.leftCaption, caption.textContent.trim());
    }

    caption.addEventListener("input", saveCaption);
    caption.addEventListener("blur", saveCaption);
    caption.addEventListener("keyup", saveCaption);
    caption.addEventListener("compositionend", saveCaption);

    boundTextInputs.push({
      el: caption,
      key: TEXT_KEYS.leftCaption,
      type: "contenteditable",
    });
  }

  function initImages() {
    bindImageInput(
      "topAvatarInput",
      "topAvatarPreview",
      "topAvatarButton",
      IMAGE_KEYS.topAvatar,
    );

    bindImageInput(
      "leftImageInput",
      "leftImagePreview",
      "leftImageButton",
      IMAGE_KEYS.left,
    );

    bindImageInput(
      "rightImageInput",
      "rightImagePreview",
      "rightImageButton",
      IMAGE_KEYS.right,
    );
  }

  function saveAllTextBeforeLeave() {
    for (var i = 0; i < boundTextInputs.length; i++) {
      var item = boundTextInputs[i];

      if (!item || !item.el) continue;

      if (item.type === "contenteditable") {
        saveText(item.key, item.el.textContent.trim());
      } else {
        saveText(item.key, item.el.value);
      }
    }
  }

  function bindBeforeLeaveSave() {
    window.addEventListener("beforeunload", saveAllTextBeforeLeave);
    window.addEventListener("pagehide", saveAllTextBeforeLeave);
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") {
        saveAllTextBeforeLeave();
      }
    });
  }

  async function init() {
    await initTopWidget();
    await initCaption();
    initImages();
    bindBeforeLeaveSave();
  }

  return {
    init: init,
  };
})();

window.WidgetController = WidgetController;
