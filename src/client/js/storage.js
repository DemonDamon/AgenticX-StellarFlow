/**
 * 状态持久化模块
 * 功能点7: IndexedDB 存储用户配置
 */

// 数据库名称
const DB_NAME = "LiquidSilkDB";
const DB_VERSION = 1;
const STORE_NAME = "userSettings";

// 默认配置
const DEFAULT_SETTINGS = {
  particleDirection: [0, 0],
  particleScale: 1.0,
  starRotation: 0.0,
  particleColor: "#ffffff",
  gestureSensitivity: 1.0,
  particleCount: 100000
};

let db = null;

/**
 * 初始化 IndexedDB
 */
function initStorage() {
  return new Promise((resolve, reject) => {
    console.log("初始化 IndexedDB...");

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error("IndexedDB 打开失败：", request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      console.log("IndexedDB 初始化成功");
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = database.createObjectStore(STORE_NAME, { keyPath: "id" });
        objectStore.createIndex("id", "id", { unique: true });
        console.log("创建对象存储：", STORE_NAME);
      }
    };
  });
}

/**
 * 保存用户配置
 */
function saveSettings(settings) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("IndexedDB 未初始化"));
      return;
    }

    const transaction = db.transaction([STORE_NAME], "readwrite");
    const objectStore = transaction.objectStore(STORE_NAME);

    const data = {
      id: "current",
      timestamp: Date.now(),
      ...settings
    };

    const request = objectStore.put(data);

    request.onsuccess = () => {
      console.log("配置已保存：", data);
      resolve(data);
    };

    request.onerror = () => {
      console.error("保存配置失败：", request.error);
      reject(request.error);
    };
  });
}

/**
 * 加载用户配置
 */
function loadSettings() {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("IndexedDB 未初始化"));
      return;
    }

    const transaction = db.transaction([STORE_NAME], "readonly");
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.get("current");

    request.onsuccess = () => {
      const data = request.result;
      if (data) {
        console.log("配置已加载：", data);
        resolve(data);
      } else {
        console.log("未找到保存的配置，使用默认值");
        resolve(DEFAULT_SETTINGS);
      }
    };

    request.onerror = () => {
      console.error("加载配置失败：", request.error);
      reject(request.error);
    };
  });
}

/**
 * 导出配置（JSON 格式）
 */
function exportSettings() {
  return loadSettings().then(settings => {
    const json = JSON.stringify(settings, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `liquid-silk-settings-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log("配置已导出");
    return settings;
  });
}

/**
 * 导入配置（从 JSON 文件）
 */
function importSettings(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const settings = JSON.parse(e.target.result);
        saveSettings(settings).then(resolve).catch(reject);
      } catch (error) {
        reject(new Error("配置文件格式错误"));
      }
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

/**
 * 清除所有配置
 */
function clearSettings() {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("IndexedDB 未初始化"));
      return;
    }

    const transaction = db.transaction([STORE_NAME], "readwrite");
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.clear();

    request.onsuccess = () => {
      console.log("配置已清除");
      resolve();
    };

    request.onerror = () => {
      console.error("清除配置失败：", request.error);
      reject(request.error);
    };
  });
}

// 导出函数
window.initStorage = initStorage;
window.saveSettings = saveSettings;
window.loadSettings = loadSettings;
window.exportSettings = exportSettings;
window.importSettings = importSettings;
window.clearSettings = clearSettings;
