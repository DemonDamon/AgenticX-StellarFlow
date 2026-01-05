/**
 * Stellar Flow 主逻辑文件
 * 宇宙恒河砂砾效果 - 深邃星空粒子系统
 * 使用自定义着色器实现发光圆形恒星粒子
 */

let scene, camera, renderer;
let particleMesh, starsMesh;
let animationId;
let particlePositions;
let particleSizes;

// 摄像机状态
let cameraState = {
  baseZ: 90,           // 基础Z位置（稍远一点，留出深入空间）
  currentZ: 90,        // 当前Z位置
  targetZ: 90,         // 目标Z位置
  minZ: 3,             // 最小Z（最深入内核，几乎到中心）
  maxZ: 140            // 最大Z（最远）
};

// 优化后的粒子参数
const PARTICLE_COUNT = 20000;
const STARS_COUNT = 4000;

let particleSystemState = {
  action: "idle",
  handOpenness: 0,
  handSpeed: 0,
  handDirection: [0, 0],
  momentum: { x: 0, y: 0, z: 0 },
  angularVelocity: { x: 0, y: 0, z: 0 },
  targetPosition: { x: 0, y: 0, z: 0 },
  currentPosition: { x: 0, y: 0, z: 0 },
  expansion: 1.0,
  focus: 0.0,
  warpSpeed: 0.0,
  rotation: { x: 0, y: 0, z: 0 },
  hue: 0.62,
  isStopped: false
};

let time = 0;
let waveTime = 0;

// ============================================
// 自定义着色器 - 发光圆形恒星粒子
// ============================================

const starVertexShader = `
  attribute float size;
  attribute vec3 customColor;
  varying vec3 vColor;
  varying float vSize;
  
  void main() {
    vColor = customColor;
    vSize = size;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (400.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const starFragmentShader = `
  varying vec3 vColor;
  varying float vSize;
  
  void main() {
    // 计算到中心的距离
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);
    
    // 丢弃圆形外的片元
    if (dist > 0.5) discard;
    
    // 创建发光效果 - 中心亮，边缘暗
    float coreGlow = 1.0 - smoothstep(0.0, 0.15, dist);      // 明亮核心
    float innerGlow = 1.0 - smoothstep(0.0, 0.35, dist);     // 内层光晕
    float outerGlow = 1.0 - smoothstep(0.0, 0.5, dist);      // 外层柔光
    
    // 组合发光层
    float glow = coreGlow * 0.8 + innerGlow * 0.5 + outerGlow * 0.3;
    
    // 添加微弱的闪烁
    float twinkle = 0.95 + 0.05 * sin(vSize * 100.0);
    
    // 最终颜色
    vec3 finalColor = vColor * glow * twinkle;
    
    // 中心更亮（白色核心）
    finalColor += vec3(1.0, 1.0, 1.0) * coreGlow * 0.3;
    
    // Alpha 基于距离衰减
    float alpha = outerGlow * 0.9;
    
    gl_FragColor = vec4(finalColor, alpha);
  }
`;

// 背景星星着色器
const bgStarVertexShader = `
  attribute float size;
  attribute vec3 customColor;
  varying vec3 vColor;
  
  void main() {
    vColor = customColor;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const bgStarFragmentShader = `
  varying vec3 vColor;
  
  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);
    
    if (dist > 0.5) discard;
    
    // 简单的发光效果
    float glow = 1.0 - smoothstep(0.0, 0.5, dist);
    float core = 1.0 - smoothstep(0.0, 0.2, dist);
    
    vec3 finalColor = vColor * (glow * 0.6 + core * 0.4);
    finalColor += vec3(1.0) * core * 0.2;
    
    gl_FragColor = vec4(finalColor, glow * 0.85);
  }
`;

function initThreeJS() {
  console.log("开始初始化 Three.js 场景...");
  scene = new THREE.Scene();
  
  // 深邃太空背景色
  scene.background = new THREE.Color(0x000005);
  scene.fog = new THREE.FogExp2(0x000108, 0.001);
  
  camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 2000);
  camera.position.z = cameraState.baseZ;
  cameraState.currentZ = cameraState.baseZ;
  cameraState.targetZ = cameraState.baseZ;
  
  renderer = new THREE.WebGLRenderer({ 
    antialias: true, 
    alpha: true,
    powerPreference: "high-performance"
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  document.getElementById("canvas-container").appendChild(renderer.domElement);
  
  createStarfield();
  createParticleSystem();
  
  window.addEventListener("resize", onWindowResize);
  animate();
  console.log("Three.js 场景初始化完成！");
}

/**
 * 创建深邃星空背景 - 使用自定义着色器
 */
function createStarfield() {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(STARS_COUNT * 3);
  const colors = new Float32Array(STARS_COUNT * 3);
  const sizes = new Float32Array(STARS_COUNT);
  
  for (let i = 0; i < STARS_COUNT; i++) {
    const i3 = i * 3;
    
    // 球形分布
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const radius = 300 + Math.random() * 800;
    
    positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i3 + 2] = radius * Math.cos(phi) - 300;
    
    // 多样化的星星颜色
    const starType = Math.random();
    if (starType > 0.95) {
      // 蓝巨星
      colors[i3] = 0.7; colors[i3 + 1] = 0.85; colors[i3 + 2] = 1.0;
      sizes[i] = 2.5 + Math.random() * 3;
    } else if (starType > 0.85) {
      // 黄色恒星
      colors[i3] = 1.0; colors[i3 + 1] = 0.95; colors[i3 + 2] = 0.7;
      sizes[i] = 1.5 + Math.random() * 2;
    } else if (starType > 0.7) {
      // 红矮星
      colors[i3] = 1.0; colors[i3 + 1] = 0.6; colors[i3 + 2] = 0.5;
      sizes[i] = 1.0 + Math.random() * 1.5;
    } else {
      // 白色星星
      const brightness = 0.7 + Math.random() * 0.3;
      colors[i3] = brightness;
      colors[i3 + 1] = brightness;
      colors[i3 + 2] = brightness + 0.15;
      sizes[i] = 0.8 + Math.random() * 1.5;
    }
  }
  
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("customColor", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
  
  const material = new THREE.ShaderMaterial({
    uniforms: {},
    vertexShader: bgStarVertexShader,
    fragmentShader: bgStarFragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  
  starsMesh = new THREE.Points(geometry, material);
  scene.add(starsMesh);
}

/**
 * 创建核心粒子系统 - 发光圆形恒星
 */
function createParticleSystem() {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const colors = new Float32Array(PARTICLE_COUNT * 3);
  const sizes = new Float32Array(PARTICLE_COUNT);
  particlePositions = new Float32Array(PARTICLE_COUNT * 3);
  particleSizes = new Float32Array(PARTICLE_COUNT);
  
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const i3 = i * 3;
    
    // 球形星云分布（中心密集）
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const radius = Math.pow(Math.random(), 0.5) * 60;
    
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);
    
    positions[i3] = x;
    positions[i3 + 1] = y;
    positions[i3 + 2] = z;
    particlePositions[i3] = x;
    particlePositions[i3 + 1] = y;
    particlePositions[i3 + 2] = z;
    
    // 深邃的蓝紫色星空色系
    const distRatio = radius / 60;
    const hueBase = 0.58 + distRatio * 0.15;
    const saturation = 0.6 + Math.random() * 0.25;
    const lightness = 0.5 + Math.random() * 0.3;
    
    // 少量暖色恒星点缀
    let hue = hueBase;
    if (Math.random() > 0.97) {
      hue = 0.05 + Math.random() * 0.08; // 橙红色
      sizes[i] = 2.5 + Math.random() * 2;
    } else if (Math.random() > 0.94) {
      hue = 0.12 + Math.random() * 0.05; // 黄色
      sizes[i] = 2.0 + Math.random() * 1.5;
    } else {
      sizes[i] = 1.0 + Math.random() * 2.0;
    }
    
    const color = new THREE.Color().setHSL(hue, saturation, lightness);
    colors[i3] = color.r;
    colors[i3 + 1] = color.g;
    colors[i3 + 2] = color.b;
    
    particleSizes[i] = sizes[i];
  }
  
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('customColor', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  
  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 }
    },
    vertexShader: starVertexShader,
    fragmentShader: starFragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  
  particleMesh = new THREE.Points(geometry, material);
  scene.add(particleMesh);
}

function updateParticleState(state) {
  if (state.action) particleSystemState.action = state.action;
  if (state.handOpenness !== undefined) particleSystemState.handOpenness = state.handOpenness;
  if (state.handSpeed !== undefined) particleSystemState.handSpeed = state.handSpeed;
  if (state.handDirection) particleSystemState.handDirection = state.handDirection;

  // 从手势获取深度和速度信息
  const handDepth = state.handDepth || 0;
  const handApproachSpeed = state.handApproachSpeed || 0;
  const diveIntensity = state.diveIntensity || 0;
  const handIsStatic = state.handIsStatic || false;

  switch (state.action) {
    case "expand":
      particleSystemState.isStopped = false;
      
      // ============ 扩张效果 ============
      // 基础扩张速度：远处张开手也能看到明显扩张
      const baseExpandSpeed = 0.02;  // 基础速度（远处时）
      
      // 手越近、移动越快 → 扩张越快
      // handDepth: 0(远) ~ 1(近)
      // handApproachSpeed: 手靠近的速度
      const depthBonus = handDepth * 0.05;  // 手越近，扩张越快
      const approachBonus = Math.max(0, handApproachSpeed) * 2;  // 靠近速度加成
      
      const expandSpeed = baseExpandSpeed + depthBonus + approachBonus;
      
      // 直接增加 expansion，不用 lerp 太多
      particleSystemState.expansion = Math.min(
        particleSystemState.expansion + expandSpeed, 
        4.0  // 最大扩张到4倍
      );
      
      particleSystemState.focus = Math.max(particleSystemState.focus - 0.03, 0);
      particleSystemState.hue = 0.58;
      
      // ============ 摄像机深入 ============
      // 基于 expansion 和 手靠近速度 来决定深入程度
      // 手靠近越快 → 视角深入越快
      
      const expansionDive = (particleSystemState.expansion - 1.0) * 20;  // 扩张带来的深入
      const approachDive = Math.max(0, handApproachSpeed) * 500;  // 靠近速度带来的深入
      const depthDive = handDepth * 30;  // 手的深度带来的深入
      
      const targetCameraZ = cameraState.baseZ - expansionDive - approachDive - depthDive;
      
      // 摄像机移动速度：静止时慢，移动时快
      const baseCameraSpeed = 0.02;
      const cameraMoveSpeed = baseCameraSpeed + Math.max(0, handApproachSpeed) * 3;
      
      cameraState.targetZ = Math.max(targetCameraZ, cameraState.minZ);
      
      // 调试日志（更频繁输出）
      if (Math.random() < 0.25) {
        console.log(`🌌 [Expand] exp:${particleSystemState.expansion.toFixed(2)} scale:${particleSystemState.expansion.toFixed(2)}x depth:${handDepth.toFixed(2)} approach:${handApproachSpeed.toFixed(4)} camZ:${cameraState.currentZ.toFixed(0)}→${cameraState.targetZ.toFixed(0)}`);
      }
      break;
      
    case "focus":
      particleSystemState.isStopped = false;
      
      // 聚合速度
      const focusSpeed = handIsStatic ? 0.01 : 0.05;
      
      // 直接增加 focus
      particleSystemState.focus = Math.min(particleSystemState.focus + focusSpeed, 0.9);
      particleSystemState.expansion = Math.max(particleSystemState.expansion - 0.02, 0.4);
      particleSystemState.hue = 0.72;
      
      // 摄像机后退，看全貌
      cameraState.targetZ = cameraState.baseZ + particleSystemState.focus * 35;
      cameraState.targetZ = Math.min(cameraState.targetZ, cameraState.maxZ);
      
      if (Math.random() < 0.2) {
        console.log(`🌌 [Focus] focus:${particleSystemState.focus.toFixed(2)} camZ:${cameraState.currentZ.toFixed(0)}→${cameraState.targetZ.toFixed(0)}`);
      }
      break;
      
    case "hold":
      // 保持当前状态 - 几乎不变化
      particleSystemState.isStopped = false;
      // 极缓慢的自然变化（呼吸感）
      // 不改变 expansion/focus/cameraZ
      break;
      
    case "swipe":
      particleSystemState.isStopped = false;
      particleSystemState.hue = 0.65;
      break;
      
    case "punch":
      particleSystemState.isStopped = false;
      particleSystemState.warpSpeed = Math.min(particleSystemState.warpSpeed + 0.12, 0.5);
      particleSystemState.hue = 0.55;
      break;
      
    case "move":
      particleSystemState.isStopped = false;
      if (state.position) {
        const maxMove = 30;
        particleSystemState.targetPosition.x = Math.max(-maxMove, Math.min(maxMove, (state.position.x - 0.5) * 60));
        particleSystemState.targetPosition.y = Math.max(-maxMove, Math.min(maxMove, -(state.position.y - 0.5) * 60));
      }
      particleSystemState.hue = 0.60;
      break;
      
    case "idle":
      particleSystemState.isStopped = false;
      // 非常缓慢地回归自然状态
      particleSystemState.expansion = lerp(particleSystemState.expansion, 1.0, 0.008);
      particleSystemState.focus = lerp(particleSystemState.focus, 0, 0.008);
      particleSystemState.warpSpeed = lerp(particleSystemState.warpSpeed, 0, 0.008);
      particleSystemState.hue = lerp(particleSystemState.hue, 0.62, 0.005);
      // 摄像机缓慢回归
      cameraState.targetZ = lerp(cameraState.targetZ, cameraState.baseZ, 0.008);
      break;
      
    default:
      // 未知状态 - 保持不变
      break;
  }
}

window.updateParticleState = updateParticleState;

function lerp(start, end, factor) {
  return start + (end - start) * factor;
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  animationId = requestAnimationFrame(animate);
  time += 0.016;
  waveTime += 0.005;

  if (particleSystemState.isStopped) {
    renderer.render(scene, camera);
    return;
  }

  // 摄像机平滑移动 - 更快响应
  const cameraDist = Math.abs(cameraState.targetZ - cameraState.currentZ);
  // 距离越大，速度越快（线性增加）
  const cameraLerpSpeed = Math.min(0.1, 0.015 + cameraDist * 0.003);
  cameraState.currentZ = lerp(cameraState.currentZ, cameraState.targetZ, cameraLerpSpeed);
  camera.position.z = cameraState.currentZ;

  // 动量衰减
  particleSystemState.momentum.x *= 0.96;
  particleSystemState.momentum.y *= 0.96;
  particleSystemState.momentum.z *= 0.96;

  // 位置平滑过渡
  particleSystemState.currentPosition.x = lerp(particleSystemState.currentPosition.x, particleSystemState.targetPosition.x, 0.025);
  particleSystemState.currentPosition.y = lerp(particleSystemState.currentPosition.y, particleSystemState.targetPosition.y, 0.025);

  if (particleMesh) {
    const positions = particleMesh.geometry.attributes.position.array;
    const colors = particleMesh.geometry.attributes.customColor.array;
    const sizes = particleMesh.geometry.attributes.size.array;

    // 更新着色器时间
    particleMesh.material.uniforms.time.value = time;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      const ox = particlePositions[i3];
      const oy = particlePositions[i3 + 1];
      const oz = particlePositions[i3 + 2];
      const dist = Math.sqrt(ox * ox + oy * oy + oz * oz);
      const normalizedDist = dist / 60;

      // 柔和的波动
      const wave1 = Math.sin(waveTime + normalizedDist * 1.2) * 0.5;
      const wave2 = Math.cos(waveTime * 0.7 + ox * 0.012) * 0.4;

      const expandFactor = particleSystemState.expansion;
      const focusFactor = particleSystemState.focus;
      
      // 聚焦时形成紧密的球体
      let focusScale = 1 - focusFactor * 0.8;
      // 扩张效果更明显：直接使用 expansion 作为缩放因子
      let expandScale = expandFactor;

      let px = ox * focusScale * expandScale;
      let py = oy * focusScale * expandScale;
      let pz = oz * focusScale * expandScale;

      // 柔和波动（聚焦时减弱）
      const waveStrength = 1 - focusFactor * 0.7;
      px += wave1 * waveStrength;
      py += Math.sin(waveTime * 0.4 + normalizedDist * 1.5) * 0.5 * waveStrength;
      pz += wave2 * waveStrength;

      // 穿梭效果
      if (particleSystemState.warpSpeed > 0.01) {
        const warp = particleSystemState.warpSpeed * 6;
        pz += warp * Math.sin(time * 5 + i * 0.0006);
        py += warp * Math.cos(time * 5 + i * 0.0006) * 0.15;
      }

      // 位置偏移
      px += particleSystemState.currentPosition.x * 0.06;
      py += particleSystemState.currentPosition.y * 0.06;

      // 微弱呼吸脉动
      const breathing = 1 + Math.sin(time * 0.25) * 0.015;

      positions[i3] = px * breathing;
      positions[i3 + 1] = py * breathing;
      positions[i3 + 2] = pz * breathing;

      // 颜色更新
      let baseHue = particleSystemState.hue;
      let baseSaturation = 0.6;
      let baseLightness = 0.55;
      
      if (window.agenticx) {
        const colorAgent = window.agenticx.getAgent('ColorAgent');
        if (colorAgent) {
          const colorState = colorAgent.getState();
          baseHue = colorState.hue || baseHue;
          baseSaturation = colorState.saturation || baseSaturation;
          baseLightness = colorState.lightness || baseLightness;
        }
      }
      
      // 柔和的色彩变化
      const hueVariation = Math.sin(time * 0.4 + i * 0.00006) * 0.04;
      const saturation = baseSaturation + Math.sin(time * 0.15 + i * 0.0001) * 0.08;
      const lightness = baseLightness + Math.sin(waveTime * 0.6 + i * 0.00015) * 0.06;
      const hue = baseHue + hueVariation + normalizedDist * 0.06;
      
      const color = new THREE.Color().setHSL(hue, Math.min(saturation, 0.85), Math.min(lightness, 0.7));
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
      
      // 粒子大小微调（闪烁感）
      const sizeFlicker = 1 + Math.sin(time * 2 + i * 0.01) * 0.1;
      sizes[i] = particleSizes[i] * sizeFlicker;
    }

    particleMesh.geometry.attributes.position.needsUpdate = true;
    particleMesh.geometry.attributes.customColor.needsUpdate = true;
    particleMesh.geometry.attributes.size.needsUpdate = true;
    
    // 极缓慢的自转
    particleMesh.rotation.y = time * 0.006;
  }

  if (starsMesh) {
    starsMesh.rotation.y += 0.00005;
    starsMesh.rotation.x = Math.sin(time * 0.04) * 0.015;
  }

  renderer.render(scene, camera);
}

function stopAnimation() {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
}

window.updateParticleSystem = function(state) {
  updateParticleState(state);
};

window.updateParticleColor = function(hue, saturation, lightness) {
  particleSystemState.hue = hue;
  console.log(`[ColorAgent] 更新色彩: H=${hue.toFixed(2)}, S=${saturation.toFixed(2)}, L=${lightness.toFixed(2)}`);
};

window.addEventListener("load", async () => {
  console.log("main.js: 页面加载完成");
  if (typeof initStorage === "function") {
    try {
      await initStorage();
      if (typeof loadSettings === "function") {
        const savedSettings = await loadSettings();
        console.log("已加载保存的配置：", savedSettings);
      }
    } catch (error) {
      console.error("状态持久化初始化失败：", error);
    }
  }
  initThreeJS();
  
  if (typeof initAgenticXClient === "function") {
    try {
      window.agenticxClient = await initAgenticXClient(
        'http://localhost:8001',
        'ws://localhost:8001/ws'
      );
      console.log("✅ AgenticX Python 后端客户端已连接");
      
      window.agenticxClient.onMessageType('particle-update', (message) => {
        if (typeof updateParticleState === "function") {
          updateParticleState(message.payload);
        }
      });
      
      window.agenticxClient.onMessageType('color-update', (message) => {
        if (typeof updateParticleColor === "function") {
          const color = message.payload;
          updateParticleColor(color.hue, color.saturation, color.lightness);
        }
      });
      
    } catch (error) {
      console.warn("AgenticX Python 后端连接失败，将使用本地处理:", error);
      console.log("提示：请确保 Python AgenticX 服务端正在运行 (python agenticx_server/main.py)");
    }
  }
  
  if (typeof initGesture === "function") {
    console.log("初始化手势识别...");
    const gestureSuccess = await initGesture();
    if (gestureSuccess) {
      console.log("手势识别已启动");
    } else {
      console.log("使用模拟手势模式");
    }
  }
});

window.addEventListener("beforeunload", () => {
  if (typeof saveSettings === "function") {
    saveSettings({}).catch(err => {
      console.error("保存配置失败：", err);
    });
  }
});
