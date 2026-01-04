/**
 * WebSocket 同步逻辑
 */

let socket;
let isMaster = false;
const statusEl = document.getElementById("status");
const masterBtn = document.getElementById("apply-master");

/**
 * 初始化 WebSocket 连接
 */
function initWebSocket() {
  socket = new WebSocket("ws://localhost:8081");

  socket.onopen = () => {
    statusEl.textContent = "连接状态：已连接";
    console.log("WebSocket 已连接");
  };

  socket.onmessage = (e) => {
    const data = JSON.parse(e.data);
    console.log("收到消息：", data.type);

    switch (data.type) {
      case "init-sync":
        console.log("初始同步：", data.data);
        updateParticleSystem(data.data);
        break;
      case "state-sync":
        if (!isMaster) {
          console.log("状态同步：", data.data);
          updateParticleSystem(data.data);
        }
        break;
      case "master-ok":
        isMaster = true;
        statusEl.textContent = "连接状态：已连接（主设备）";
        console.log("已设为主设备");
        break;
    }
  };

  socket.onclose = () => {
    statusEl.textContent = "连接状态：已断开，重试中...";
    isMaster = false;
    console.log("WebSocket 已断开，3秒后重连...");
    setTimeout(initWebSocket, 3000);
  };

  socket.onerror = (err) => {
    statusEl.textContent = "连接状态：错误";
    console.error("WebSocket 错误：", err);
  };
}

/**
 * 发送状态到服务端
 */
function sendState(state) {
  if (isMaster && socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: "state-update",
      payload: state
    }));
    console.log("发送状态更新：", state);
  }
}

// 申请主设备
masterBtn.addEventListener("click", () => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: "apply-master" }));
    console.log("申请主设备...");
  }
});

/**
 * 粒子系统更新函数（由 main.js 实现）
 */
function updateParticleSystem(state) {
  console.log("更新粒子系统：", state);
}

// 页面加载后初始化
window.addEventListener("load", () => {
  console.log("页面加载完成，初始化 WebSocket...");
  initWebSocket();
});
