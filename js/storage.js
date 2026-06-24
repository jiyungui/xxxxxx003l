var StarStorage = (function () {
  var DB_NAME = "star-phone-db";
  var DB_VERSION = 2;
  var IMAGE_STORE = "images";
  var TEXT_STORE = "texts";

  function openDB() {
    return new Promise(function (resolve, reject) {
      if (!("indexedDB" in window)) {
        reject(new Error("当前浏览器不支持 IndexedDB"));
        return;
      }

      var request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = function () {
        var db = request.result;

        if (!db.objectStoreNames.contains(IMAGE_STORE)) {
          db.createObjectStore(IMAGE_STORE, {
            keyPath: "key",
          });
        }

        if (!db.objectStoreNames.contains(TEXT_STORE)) {
          db.createObjectStore(TEXT_STORE, {
            keyPath: "key",
          });
        }
      };

      request.onsuccess = function () {
        resolve(request.result);
      };

      request.onerror = function () {
        reject(request.error);
      };

      request.onblocked = function () {
        reject(new Error("IndexedDB 被阻止，请关闭其他页面后重试"));
      };
    });
  }

  async function saveImage(key, file) {
    var db = await openDB();

    return new Promise(function (resolve, reject) {
      var tx = db.transaction(IMAGE_STORE, "readwrite");
      var store = tx.objectStore(IMAGE_STORE);

      store.put({
        key: key,
        blob: file,
        type: file.type,
        name: file.name,
        size: file.size,
        updatedAt: Date.now(),
      });

      tx.oncomplete = function () {
        db.close();
        resolve(true);
      };

      tx.onerror = function () {
        db.close();
        reject(tx.error);
      };

      tx.onabort = function () {
        db.close();
        reject(tx.error || new Error("图片保存事务中断"));
      };
    });
  }

  async function getImage(key) {
    var db = await openDB();

    return new Promise(function (resolve, reject) {
      var tx = db.transaction(IMAGE_STORE, "readonly");
      var store = tx.objectStore(IMAGE_STORE);
      var request = store.get(key);

      request.onsuccess = function () {
        var record = request.result;
        db.close();
        resolve(record ? record.blob : null);
      };

      request.onerror = function () {
        db.close();
        reject(request.error);
      };
    });
  }

  async function removeImage(key) {
    var db = await openDB();

    return new Promise(function (resolve, reject) {
      var tx = db.transaction(IMAGE_STORE, "readwrite");
      var store = tx.objectStore(IMAGE_STORE);

      store.delete(key);

      tx.oncomplete = function () {
        db.close();
        resolve(true);
      };

      tx.onerror = function () {
        db.close();
        reject(tx.error);
      };
    });
  }

  async function saveTextToDB(key, value) {
    var db = await openDB();

    return new Promise(function (resolve, reject) {
      var tx = db.transaction(TEXT_STORE, "readwrite");
      var store = tx.objectStore(TEXT_STORE);

      store.put({
        key: key,
        value: String(value),
        updatedAt: Date.now(),
      });

      tx.oncomplete = function () {
        db.close();
        resolve(true);
      };

      tx.onerror = function () {
        db.close();
        reject(tx.error);
      };

      tx.onabort = function () {
        db.close();
        reject(tx.error || new Error("文字保存事务中断"));
      };
    });
  }

  async function getTextFromDB(key, fallback) {
    var db = await openDB();

    return new Promise(function (resolve, reject) {
      var tx = db.transaction(TEXT_STORE, "readonly");
      var store = tx.objectStore(TEXT_STORE);
      var request = store.get(key);

      request.onsuccess = function () {
        var record = request.result;
        db.close();

        if (record && typeof record.value === "string") {
          resolve(record.value);
        } else {
          resolve(fallback);
        }
      };

      request.onerror = function () {
        db.close();
        reject(request.error);
      };
    });
  }

  function saveText(key, value) {
    var textValue = String(value);

    try {
      localStorage.setItem(key, textValue);
    } catch (error) {
      console.warn("localStorage 保存失败，改用 IndexedDB：", error);
    }

    return saveTextToDB(key, textValue).catch(function (error) {
      console.warn("IndexedDB 文字保存失败：", error);
    });
  }

  function getText(key, fallback) {
    try {
      var value = localStorage.getItem(key);
      return value === null ? fallback : value;
    } catch (error) {
      return fallback;
    }
  }

  async function getTextAsync(key, fallback) {
    try {
      var localValue = localStorage.getItem(key);

      if (localValue !== null) {
        return localValue;
      }
    } catch (error) {
      console.warn("localStorage 读取失败，改用 IndexedDB：", error);
    }

    try {
      return await getTextFromDB(key, fallback);
    } catch (error) {
      console.warn("IndexedDB 文字读取失败：", error);
      return fallback;
    }
  }

  return {
    saveImage: saveImage,
    getImage: getImage,
    removeImage: removeImage,

    saveText: saveText,
    getText: getText,
    getTextAsync: getTextAsync,
  };
})();

window.StarStorage = StarStorage;
