/**
 * MediaPipe 手势识别模块
 * 支持手势：摊开手掌（放大）、握拳（缩小）
 * 新增：手的远近（Z轴）控制视角深入速度
 */

// 手势状态追踪
let gestureState = {
  prevPos: { x: 0.5, y: 0.5, z: 0 },
  isInitialized: false,
  velocityHistory: [],
  currentGesture: "idle",
  momentum: { x: 0, y: 0, z: 0 },
  handOpenness: 0,
  // 防抖状态
  lastGestureTime: 0,
  gestureStableCount: 0,
  lastStableGesture: "idle",
  // 手离开检测
  handPresent: false,
  lastHandPresentTime: 0,
  // Z轴（远近）追踪
  prevZ: 0,
  zVelocityHistory: [],
  handDepth: 0,        // 手的深度（0=远, 1=近）
  handApproachSpeed: 0 // 手靠近的速度
};

// 配置
const CONFIG = {
  SWIPE_SPEED_THRESHOLD: 0.10,
  SLOW_SPEED_THRESHOLD: 0.035,
  FIST_THRESHOLD: 0.08,          // 更低阈值，更严格判断握拳
  OPEN_PALM_THRESHOLD: 0.12,     // 更低阈值，更容易触发张开手
  MOMENTUM_DECAY: 0.92,
  VELOCITY_HISTORY_SIZE: 10,
  GESTURE_DEBOUNCE_MS: 80,       // 更快响应
  GESTURE_STABLE_COUNT: 1,       // 立即响应
  MAX_SPEED_CLAMP: 0.15,
  // Z轴相关配置
  Z_VELOCITY_HISTORY_SIZE: 6,
  Z_SPEED_THRESHOLD: 0.001,
  HAND_LEAVE_DELAY_MS: 300,
  STATIC_THRESHOLD: 0.006,
  // 调试开关
  DEBUG_LOG: true
};

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

/**
 * 检测手的移动速度（包括Z轴）
 */
function detectHandSpeed3D(currentPos, prevPos) {
  const deltaX = currentPos.x - prevPos.x;
  const deltaY = currentPos.y - prevPos.y;
  const deltaZ = (currentPos.z || 0) - (prevPos.z || 0);
  
  const speed2D = Math.hypot(deltaX, deltaY);
  const speed = Math.min(speed2D, CONFIG.MAX_SPEED_CLAMP);
  
  return { speed, deltaX, deltaY, deltaZ };
}

/**
 * 更新Z轴速度历史
 */
function updateZVelocity(deltaZ) {
  gestureState.zVelocityHistory.push({ z: deltaZ, time: Date.now() });
  if (gestureState.zVelocityHistory.length > CONFIG.Z_VELOCITY_HISTORY_SIZE) {
    gestureState.zVelocityHistory.shift();
  }
}

/**
 * 获取平均Z轴速度（手靠近/远离的速度）
 */
function getAverageZVelocity() {
  if (gestureState.zVelocityHistory.length === 0) return 0;
  
  let sum = 0;
  for (const v of gestureState.zVelocityHistory) {
    sum += v.z;
  }
  return sum / gestureState.zVelocityHistory.length;
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
    sumX += v.x;
    sumY += v.y;
    sumSpeed += v.speed;
  }
  const len = gestureState.velocityHistory.length;
  return { x: sumX / len, y: sumY / len, speed: sumSpeed / len };
}

/**
 * 判断手是否静止
 */
function isHandStatic() {
  const avgVel = getAverageVelocity();
  const avgZVel = Math.abs(getAverageZVelocity());
  return avgVel.speed < CONFIG.STATIC_THRESHOLD && avgZVel < CONFIG.Z_SPEED_THRESHOLD;
}

/**
 * 手势防抖处理
 */
function processGestureWithDebounce(detectedGesture) {
  const now = Date.now();
  
  if (detectedGesture === gestureState.lastStableGesture) {
    gestureState.gestureStableCount++;
  } else {
    gestureState.gestureStableCount = 1;
    gestureState.lastStableGesture = detectedGesture;
  }
  
  if (gestureState.gestureStableCount >= CONFIG.GESTURE_STABLE_COUNT &&
      (now - gestureState.lastGestureTime) > CONFIG.GESTURE_DEBOUNCE_MS) {
    gestureState.lastGestureTime = now;
    return detectedGesture;
  }
  
  return gestureState.currentGesture || "idle";
}

async function initGesture() {
  console.log("初始化手势识别...");
  try {
    if (typeof Hands === "undefined") {
      startSimulatedGesture();
      return false;
    }
    
    const hands = new Hands({ 
      locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}` 
    });
    
    hands.setOptions({ 
      maxNumHands: 1, 
      modelComplexity: 1, 
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6
    });
    
    hands.onResults(onGestureResults);

    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        width: { ideal: 1280 }, 
        height: { ideal: 720 }, 
        facingMode: "user" 
      } 
    });
    
    const videoElement = document.createElement("video");
    videoElement.srcObject = stream;
    videoElement.autoplay = true;
    videoElement.style.display = "none";
    document.body.appendChild(videoElement);
    
    await new Promise((resolve) => { 
      videoElement.onloadedmetadata = () => { 
        videoElement.play(); 
        resolve(); 
      }; 
    });

    const canvasElement = document.createElement("canvas");
    canvasElement.style.cssText = `
      position: fixed;
      top: 16px;
      right: 16px;
      width: 180px;
      height: 135px;
      border: 1px solid rgba(100, 150, 255, 0.3);
      border-radius: 12px;
      opacity: 0.7;
      z-index: 100;
      transform: scaleX(-1);
      box-shadow: 0 4px 20px rgba(0, 20, 60, 0.5);
    `;
    canvasElement.id = "camera-preview";
    document.body.appendChild(canvasElement);
    const ctx = canvasElement.getContext('2d');

    async function processFrame() {
      ctx.save();
      ctx.scale(-1, 1);
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

const gestureHandler = {
  onGestureDetected: null,
  onResults: null
};

function onGestureResults(results) {
  const now = Date.now();
  
  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    const landmarks = results.multiHandLandmarks[0];
    const palmCenter = landmarks[9];
    
    // 获取手的3D位置（Z值表示远近）
    // MediaPipe Z值：负值更近，正值更远
    const currentPos = { 
      x: palmCenter.x, 
      y: palmCenter.y, 
      z: palmCenter.z || 0
    };
    
    // 标记手存在
    gestureState.handPresent = true;
    gestureState.lastHandPresentTime = now;

    if (!gestureState.isInitialized) {
      gestureState.prevPos = currentPos;
      gestureState.prevZ = currentPos.z;
      gestureState.isInitialized = true;
      console.log("手势初始化：手掌位置", currentPos);
      return;
    }

    // 如果 AgenticX 客户端已连接，异步处理但不等待（避免卡住）
    if (window.agenticxClient && window.agenticxClient.isConnected) {
      // 不等待 AgenticX 响应，同时执行本地处理
      handleGestureWithAgenticX(landmarks, palmCenter, currentPos, gestureState.prevPos)
        .catch(err => console.warn('[AgenticX] 请求失败，使用本地处理:', err.message));
      // 不再 return，继续执行本地手势处理
    }
    
    if (gestureHandler.onGestureDetected) {
      gestureHandler.onGestureDetected({
        landmarks: landmarks,
        palmCenter: palmCenter,
        currentPos: currentPos,
        prevPos: gestureState.prevPos
      });
    }

    // 检测手势类型
    const rawGestureType = detectGesture(landmarks);
    const gestureType = processGestureWithDebounce(rawGestureType);
    
    // 计算3D速度
    const { speed, deltaX, deltaY, deltaZ } = detectHandSpeed3D(currentPos, gestureState.prevPos);
    updateMomentum(deltaX, deltaY, speed);
    updateZVelocity(deltaZ);
    
    const avgVelocity = getAverageVelocity();
    const avgZVelocity = getAverageZVelocity();
    
    // 计算手的深度（0=远, 1=近）
    // MediaPipe Z 范围大约 -0.3 到 0.1
    const handDepth = Math.max(0, Math.min(1, (-currentPos.z + 0.1) / 0.4));
    gestureState.handDepth = handDepth;
    
    // 计算手靠近的速度（负deltaZ表示靠近）
    const approachSpeed = -avgZVelocity;
    gestureState.handApproachSpeed = approachSpeed;
    
    // 判断手是否静止
    const handIsStatic = isHandStatic();

    const newState = {
      gestureType: gestureType,
      handOpenness: gestureState.handOpenness,
      handSpeed: speed,
      handDirection: [deltaX, -deltaY],
      momentum: { ...gestureState.momentum },
      // 新增：深度和靠近速度信息
      handDepth: handDepth,
      handApproachSpeed: approachSpeed,
      handIsStatic: handIsStatic
    };

    // 调试日志：实时显示手势数据（更高采样率）
    if (CONFIG.DEBUG_LOG && Math.random() < 0.3) { // 30% 采样率
      console.log(`[手势] openness:${gestureState.handOpenness.toFixed(3)} threshold:${CONFIG.OPEN_PALM_THRESHOLD} depth:${handDepth.toFixed(2)} zSpeed:${approachSpeed.toFixed(4)} type:${gestureType}`);
    }

    // 根据手势类型和状态决定动作
    // 简化逻辑：只要手张开超过阈值就触发 expand
    const isExpanding = gestureType === "open_palm" || gestureState.handOpenness > CONFIG.OPEN_PALM_THRESHOLD;
    const isFocusing = gestureType === "fist" || gestureState.handOpenness < CONFIG.FIST_THRESHOLD;
    
    if (isExpanding) {
      newState.action = "expand";
      // 深入速度基于：手的深度 + 手靠近速度 + 手张开程度
      const openFactor = Math.max(0, (gestureState.handOpenness - CONFIG.OPEN_PALM_THRESHOLD) * 5);
      newState.diveIntensity = handDepth * 0.6 + Math.max(0, approachSpeed) * 30 + openFactor * 0.3;
      
      // 每次 expand 都输出（20% 采样避免刷屏）
      if (Math.random() < 0.2) {
        console.log(`✋ 张开手掌 [expand] openness:${gestureState.handOpenness.toFixed(3)} depth:${handDepth.toFixed(2)} approach:${approachSpeed.toFixed(4)} dive:${newState.diveIntensity.toFixed(2)}`);
      }
    } else if (isFocusing) {
      newState.action = "focus";
      if (Math.random() < 0.2) {
        console.log(`✊ 握拳 [focus] openness:${gestureState.handOpenness.toFixed(3)}`);
      }
    } else {
      // 中间状态：保持
      newState.action = "hold";
      if (Math.random() < 0.05) {
        console.log(`🖐️ 中间状态 [hold] openness:${gestureState.handOpenness.toFixed(3)}`);
      }
    }

    if (!gestureHandler.onGestureDetected) {
      if (typeof updateParticleState === "function") updateParticleState(newState);
      if (typeof sendState === "function") sendState(newState);
    }
    
    gestureState.prevPos = currentPos;
    gestureState.currentGesture = gestureType;
    
  } else {
    // 没有检测到手 - 不触发任何动作，保持当前状态
    // 只有在手离开超过一定时间后才标记为不存在
    if (gestureState.handPresent && (now - gestureState.lastHandPresentTime) > CONFIG.HAND_LEAVE_DELAY_MS) {
      gestureState.handPresent = false;
      // 清空速度历史，但不触发状态变化
      gestureState.velocityHistory = [];
      gestureState.zVelocityHistory = [];
      console.log("👋 手已离开画面 - 保持当前状态");
    }
    
    // 重要：手离开时不发送任何状态更新，保持画面稳定
    // 不再调用 updateParticleState({ action: "idle" })
  }
}

window.gestureHandler = gestureHandler;

function startSimulatedGesture() {
  console.log("启动模拟手势模式（演示深入内核效果）");
  let time = 0;
  let phase = 0;
  
  setInterval(() => {
    time += 0.02;
    phase = Math.floor(time / 10) % 4;
    let newState = {};
    
    switch (phase) {
      case 0:
        // 保持状态
        newState = { 
          action: "hold", 
          gestureType: "idle", 
          handSpeed: 0, 
          handDirection: [0, 0],
          handDepth: 0.3,
          handApproachSpeed: 0,
          handIsStatic: true
        };
        break;
      case 1:
        // 张开手并靠近 - 快速深入
        const approach = (Math.sin(time * 2) + 1) * 0.5;
        newState = { 
          action: "expand", 
          gestureType: "open_palm", 
          handOpenness: 0.3, 
          handSpeed: 0.01, 
          handDirection: [0, 0],
          handDepth: 0.3 + approach * 0.5,
          handApproachSpeed: Math.cos(time * 2) * 0.01,
          diveIntensity: approach * 0.8,
          handIsStatic: false
        };
        break;
      case 2:
        // 静止保持
        newState = { 
          action: "hold", 
          gestureType: "open_palm", 
          handSpeed: 0, 
          handDirection: [0, 0],
          handDepth: 0.6,
          handApproachSpeed: 0,
          handIsStatic: true
        };
        break;
      case 3:
        // 握拳缩小
        newState = { 
          action: "focus", 
          gestureType: "fist", 
          handOpenness: 0.1, 
          handSpeed: 0.005, 
          handDirection: [0, 0],
          handDepth: 0.5,
          handApproachSpeed: 0,
          handIsStatic: false
        };
        break;
    }
    
    if (typeof updateParticleState === "function") updateParticleState(newState);
    if (typeof sendState === "function") sendState(newState);
  }, 50);
}

async function handleGestureWithAgenticX(landmarks, palmCenter, currentPos, prevPos) {
  try {
    const landmarksData = landmarks.map(lm => ({
      x: lm.x,
      y: lm.y,
      z: lm.z,
      visibility: lm.visibility || 1.0
    }));
    
    const result = await window.agenticxClient.analyzeGesture(
      landmarksData,
      { x: palmCenter.x, y: palmCenter.y, z: palmCenter.z },
      currentPos,
      prevPos
    );
    
    if (result && typeof updateParticleState === "function") {
      let action = result.gesture;
      if (action === "stop" || action === "swipe") {
        action = "idle";
      }
      
      // 计算深度信息
      const handDepth = Math.max(0, Math.min(1, (-currentPos.z + 0.1) / 0.4));
      const approachSpeed = gestureState.handApproachSpeed;
      
      const newState = {
        action: action,
        gestureType: action,
        handSpeed: Math.min(result.intensity, CONFIG.MAX_SPEED_CLAMP),
        handDirection: result.direction,
        prediction: result.prediction,
        handDepth: handDepth,
        handApproachSpeed: approachSpeed,
        diveIntensity: action === "expand" ? handDepth * 0.5 + Math.max(0, approachSpeed) * 20 : 0
      };
      
      updateParticleState(newState);
      
      if (typeof sendState === "function") {
        sendState(newState);
      }
    }
    
    if (result.gesture !== 'idle' && result.gesture !== 'stop' && result.gesture !== 'swipe') {
      const particleResult = await window.agenticxClient.updateParticle(
        result.gesture,
        Math.min(result.intensity, CONFIG.MAX_SPEED_CLAMP),
        result.direction
      );
      
      if (particleResult && typeof updateParticleState === "function") {
        updateParticleState({
          action: 'agent-update',
          momentum: particleResult.momentum,
          angularVelocity: { x: 0, y: 0, z: 0 },
          expansion: particleResult.expansion,
          focus: particleResult.focus,
          warpSpeed: Math.min(particleResult.warp_speed, 0.6)
        });
      }
    }
    
    const colorResult = await window.agenticxClient.changeColor(result.gesture);
    if (colorResult && typeof updateParticleColor === "function") {
      updateParticleColor(colorResult.hue, colorResult.saturation, colorResult.lightness);
    }
    
  } catch (error) {
    console.error('[AgenticX] 手势处理失败:', error);
    gestureState.prevPos = currentPos;
  }
}

window.initGesture = initGesture;
