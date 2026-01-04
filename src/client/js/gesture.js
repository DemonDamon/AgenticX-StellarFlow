/**
 * MediaPipe 手势识别模块
 * 支持多种手势：食指停止、摊开手掌、握拳、快速扇动、前冲拳
 */

// 手势状态追踪
let gestureState = {
  prevIndexPos: { x: 0.5, y: 0.5 },
  prevPinchDistance: 0.5,
  isInitialized: false,
  velocityHistory: [],
  currentGesture: "idle",
  momentum: { x: 0, y: 0, z: 0 },
  handOpenness: 0
};

const CONFIG = {
  SWIPE_SPEED_THRESHOLD: 0.03,
  SLOW_SPEED_THRESHOLD: 0.01,
  FIST_THRESHOLD: 0.15,
  OPEN_PALM_THRESHOLD: 0.25,
  MOMENTUM_DECAY: 0.98,
  VELOCITY_HISTORY_SIZE: 5,
  INDEX_EXTENDED_THRESHOLD: 0.15
};

// 检测食指是否伸直（停止手势）
function isIndexFingerExtended(landmarks) {
  const indexTip = landmarks[8];
  const indexMcp = landmarks[5];
  const indexExtension = Math.hypot(indexTip.x - indexMcp.x, indexTip.y - indexMcp.y, indexTip.z - indexMcp.z);

  const otherFingers = [[12, 9], [16, 13], [20, 17]];
  let otherCount = 0;
  for (const [tip, base] of otherFingers) {
    const ext = Math.hypot(landmarks[tip].x - landmarks[base].x, landmarks[tip].y - landmarks[base].y, landmarks[tip].z - landmarks[base].z);
    if (ext > CONFIG.INDEX_EXTENDED_THRESHOLD) otherCount++;
  }

  return indexExtension > CONFIG.INDEX_EXTENDED_THRESHOLD && otherCount <= 1;
}

function detectGesture(landmarks) {
  const fingerTips = [4, 8, 12, 16, 20];
  const fingerBases = [2, 5, 9, 13, 17];
  let totalFingerExtension = 0;
  for (let i = 0; i < 5; i++) {
    const tip = landmarks[fingerTips[i]];
    const base = landmarks[fingerBases[i]];
    totalFingerExtension += Math.hypot(tip.x - base.x, tip.y - base.y, tip.z - base.z);
  }
  const avgFingerExtension = totalFingerExtension / 5;
  gestureState.handOpenness = avgFingerExtension;

  if (avgFingerExtension < CONFIG.FIST_THRESHOLD) return "fist";
  if (avgFingerExtension > CONFIG.OPEN_PALM_THRESHOLD) return "open_palm";
  return "idle";
}

function detectHandSpeed(currentPos, prevPos) {
  const deltaX = currentPos.x - prevPos.x;
  const deltaY = currentPos.y - prevPos.y;
  return { speed: Math.hypot(deltaX, deltaY), deltaX, deltaY };
}

function updateMomentum(deltaX, deltaY, speed) {
  gestureState.velocityHistory.push({ x: deltaX, y: deltaY, speed, time: Date.now() });
  if (gestureState.velocityHistory.length > CONFIG.VELOCITY_HISTORY_SIZE) {
    gestureState.velocityHistory.shift();
  }
}

function getAverageVelocity() {
  if (gestureState.velocityHistory.length === 0) return { x: 0, y: 0, speed: 0 };
  let sumX = 0, sumY = 0, sumSpeed = 0;
  for (const v of gestureState.velocityHistory) {
    sumX += v.x; sumY += v.y; sumSpeed += v.speed;
  }
  const len = gestureState.velocityHistory.length;
  return { x: sumX / len, y: sumY / len, speed: sumSpeed / len };
}

async function initGesture() {
  console.log("初始化手势识别...");
  try {
    if (typeof Hands === "undefined") {
      startSimulatedGesture();
      return false;
    }
    const hands = new Hands({ locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}` });
    hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
    hands.onResults(onGestureResults);

    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" } });
    const videoElement = document.createElement("video");
    videoElement.srcObject = stream;
    videoElement.autoplay = true;
    videoElement.style.display = "none";
    document.body.appendChild(videoElement);
    await new Promise((resolve) => { videoElement.onloadedmetadata = () => { videoElement.play(); resolve(); }; });

    const canvasElement = document.createElement("canvas");
    canvasElement.style.cssText = "position:fixed;top:10px;right:10px;width:160px;height:120px;border:2px solid rgba(100,200,255,0.5);border-radius:8px;opacity:0.8;zIndex:100;transform:scaleX(-1);";
    canvasElement.id = "camera-preview";
    document.body.appendChild(canvasElement);
    const ctx = canvasElement.getContext('2d');

    async function processFrame() {
      ctx.save(); ctx.scale(-1, 1);
      ctx.drawImage(videoElement, -canvasElement.width, 0, canvasElement.width, canvasElement.height);
      ctx.restore();
      await hands.send({ image: videoElement });
      requestAnimationFrame(processFrame);
    }
    processFrame();
    return true;
  } catch (error) {
    console.error("手势识别初始化失败：", error);
    startSimulatedGesture();
    return false;
  }
}

// 手势处理器对象（用于 AgenticX 集成）
const gestureHandler = {
  onGestureDetected: null, // 由 AgenticX 设置
  onResults: null // 兼容原有接口
};

function onGestureResults(results) {
  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    const landmarks = results.multiHandLandmarks[0];
    const palmCenter = landmarks[9];
    const currentPos = { x: palmCenter.x, y: palmCenter.y };

    if (!gestureState.isInitialized) {
      gestureState.prevIndexPos = currentPos;
      gestureState.isInitialized = true;
      console.log("手势初始化：手掌中心位置", currentPos);
      return;
    }

    // 如果 AgenticX 客户端已连接，使用后端智能体处理
    if (window.agenticxClient && window.agenticxClient.isConnected) {
      // 将手势数据发送到 Python AgenticX 后端
      handleGestureWithAgenticX(landmarks, palmCenter, currentPos, gestureState.prevIndexPos);
      gestureState.prevIndexPos = currentPos;
      return;
    }
    
    // 如果本地 AgenticX 已启用，优先使用智能体处理
    if (gestureHandler.onGestureDetected) {
      gestureHandler.onGestureDetected({
        landmarks: landmarks,
        palmCenter: palmCenter,
        currentPos: currentPos,
        prevPos: gestureState.prevIndexPos
      });
    }

    // 优先检测停止手势
    if (isIndexFingerExtended(landmarks)) {
      const newState = { action: "stop", gestureType: "stop", handSpeed: 0, handDirection: [0, 0] };
      console.log("☝️ 停止手势 - 粒子静止");
      if (typeof updateParticleState === "function") updateParticleState(newState);
      if (typeof sendState === "function") sendState(newState);
      gestureState.prevIndexPos = currentPos;
      return;
    }

    const gestureType = detectGesture(landmarks);
    const { speed, deltaX, deltaY } = detectHandSpeed(currentPos, gestureState.prevIndexPos);
    updateMomentum(deltaX, deltaY, speed);
    const avgVelocity = getAverageVelocity();

    const newState = {
      gestureType: gestureType,
      handOpenness: gestureState.handOpenness,
      handSpeed: speed,
      handDirection: [deltaX, -deltaY],
      momentum: { ...gestureState.momentum }
    };

    if (speed > CONFIG.SWIPE_SPEED_THRESHOLD) {
      newState.action = "swipe";
      newState.momentum = { x: avgVelocity.x * 50, y: avgVelocity.y * 50, z: 0 };
      console.log("🌊 快速扇动！动量", newState.momentum);
    } else if (speed > CONFIG.SLOW_SPEED_THRESHOLD) {
      newState.action = "move";
      newState.position = { x: currentPos.x, y: currentPos.y };
      console.log("👋 缓慢移动");
    } else {
      newState.action = "idle";
      if (gestureType === "open_palm") {
        newState.action = "expand";
        console.log("✋ 摊开手掌 - 发散");
      } else if (gestureType === "fist") {
        if (Math.abs(deltaY) > 0.02) {
          newState.action = "punch";
          newState.punchDirection = deltaY > 0 ? 1 : -1;
          console.log("👊 前冲拳 - 穿梭");
        } else {
          newState.action = "focus";
          console.log("✊ 握拳 - 聚焦");
        }
      }
    }

    // 兼容原有接口（如果 AgenticX 未启用）
    if (!gestureHandler.onGestureDetected) {
      if (typeof updateParticleState === "function") updateParticleState(newState);
      if (typeof sendState === "function") sendState(newState);
    }
    gestureState.prevIndexPos = currentPos;
    gestureState.currentGesture = gestureType;
  }
}

// 导出手势处理器
window.gestureHandler = gestureHandler;

function startSimulatedGesture() {
  console.log("启动模拟手势模式");
  let time = 0;
  setInterval(() => {
    time += 0.02;
    const gestureCycle = Math.floor(time / 6) % 6;
    let newState = {};
    switch (gestureCycle) {
      case 0: newState = { action: "stop", gestureType: "stop", handSpeed: 0, handDirection: [0, 0] }; break;
      case 1: newState = { action: "expand", gestureType: "open_palm", handOpenness: 0.3, handSpeed: 0.005, handDirection: [0, 0] }; break;
      case 2: newState = { action: "focus", gestureType: "fist", handOpenness: 0.1, handSpeed: 0.005, handDirection: [0, 0] }; break;
      case 3: newState = { action: "swipe", gestureType: "idle", handSpeed: 0.05, handDirection: [Math.sin(time) * 0.05, 0], momentum: { x: Math.sin(time) * 2, y: 0, z: 0 } }; break;
      case 4: newState = { action: "punch", gestureType: "fist", punchDirection: 1, handSpeed: 0.04, handDirection: [0, 0.03] }; break;
      case 5: newState = { action: "move", gestureType: "idle", handSpeed: 0.008, handDirection: [Math.cos(time) * 0.01, Math.sin(time) * 0.01], position: { x: 0.5 + Math.sin(time) * 0.2, y: 0.5 + Math.cos(time) * 0.2 } }; break;
    }
    if (typeof updateParticleState === "function") updateParticleState(newState);
    if (typeof sendState === "function") sendState(newState);
  }, 50);
}

/**
 * 使用 AgenticX 后端处理手势
 */
async function handleGestureWithAgenticX(landmarks, palmCenter, currentPos, prevPos) {
  try {
    // 转换 landmarks 格式
    const landmarksData = landmarks.map(lm => ({
      x: lm.x,
      y: lm.y,
      z: lm.z,
      visibility: lm.visibility || 1.0
    }));
    
    // 调用后端智能体分析手势
    const result = await window.agenticxClient.analyzeGesture(
      landmarksData,
      { x: palmCenter.x, y: palmCenter.y, z: palmCenter.z },
      currentPos,
      prevPos
    );
    
    console.log('[AgenticX] 手势分析结果:', result);
    
    // 根据智能体的分析结果更新粒子系统
    if (result && typeof updateParticleState === "function") {
      const newState = {
        action: result.gesture,
        gestureType: result.gesture,
        handSpeed: result.intensity,
        handDirection: result.direction,
        prediction: result.prediction
      };
      
      updateParticleState(newState);
      
      // 如果启用了同步，发送状态
      if (typeof sendState === "function") {
        sendState(newState);
      }
    }
    
    // 调用粒子流动智能体
    if (result.gesture !== 'idle') {
      const particleResult = await window.agenticxClient.updateParticle(
        result.gesture,
        result.intensity,
        result.direction
      );
      
      if (particleResult && typeof updateParticleState === "function") {
        updateParticleState({
          action: 'agent-update',
          momentum: particleResult.momentum,
          angularVelocity: particleResult.angular_velocity,
          expansion: particleResult.expansion,
          focus: particleResult.focus,
          warpSpeed: particleResult.warp_speed
        });
      }
    }
    
    // 调用色彩智能体
    const colorResult = await window.agenticxClient.changeColor(result.gesture);
    if (colorResult && typeof updateParticleColor === "function") {
      updateParticleColor(colorResult.hue, colorResult.saturation, colorResult.lightness);
    }
    
  } catch (error) {
    console.error('[AgenticX] 手势处理失败:', error);
    // 降级到本地处理
    gestureState.prevIndexPos = currentPos;
  }
}

window.initGesture = initGesture;
