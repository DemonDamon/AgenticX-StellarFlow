/**
 * Liquid Silk 主逻辑文件
 * 完整手势控制系统 + 停止手势
 */

let scene, camera, renderer;
let particleMesh, starsMesh;
let animationId;
let particlePositions;

const PARTICLE_COUNT = 10000;
const STARS_COUNT = 1000;

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
  hue: 0.6,
  isStopped: false
};

let time = 0;
let waveTime = 0;

function initThreeJS() {
  console.log("开始初始化 Three.js 场景...");
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000510);
  scene.fog = new THREE.FogExp2(0x000510, 0.002);
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 50;
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  document.getElementById("canvas-container").appendChild(renderer.domElement);
  createStarfield();
  createParticleSystem();
  window.addEventListener("resize", onWindowResize);
  animate();
  console.log("Three.js 场景初始化完成！");
}

function createStarfield() {
  const starsGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(STARS_COUNT * 3);
  const colors = new Float32Array(STARS_COUNT * 3);
  for (let i = 0; i < STARS_COUNT; i++) {
    const i3 = i * 3;
    positions[i3] = (Math.random() - 0.5) * 600;
    positions[i3 + 1] = (Math.random() - 0.5) * 600;
    positions[i3 + 2] = (Math.random() - 0.5) * 400 - 150;
    const starType = Math.random();
    if (starType > 0.9) { colors[i3] = 0.6; colors[i3 + 1] = 0.8; colors[i3 + 2] = 1.0; }
    else if (starType > 0.7) { colors[i3] = 1.0; colors[i3 + 1] = 0.9; colors[i3 + 2] = 0.6; }
    else { colors[i3] = 1.0; colors[i3 + 1] = 1.0; colors[i3 + 2] = 1.0; }
  }
  starsGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  starsGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const starsMaterial = new THREE.PointsMaterial({ size: 2, sizeAttenuation: true, transparent: true, opacity: 0.9, vertexColors: true, blending: THREE.AdditiveBlending });
  starsMesh = new THREE.Points(starsGeometry, starsMaterial);
  scene.add(starsMesh);
}

function createParticleSystem() {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const colors = new Float32Array(PARTICLE_COUNT * 3);
  particlePositions = new Float32Array(PARTICLE_COUNT * 3);
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const i3 = i * 3;
    const radius = Math.random() * 100;
    const angle = Math.random() * Math.PI * 2;
    const height = (Math.random() - 0.5) * 200;
    const x = Math.cos(angle) * radius;
    const y = height;
    const z = Math.sin(angle) * radius;
    positions[i3] = x;
    positions[i3 + 1] = y;
    positions[i3 + 2] = z;
    particlePositions[i3] = x;
    particlePositions[i3 + 1] = y;
    particlePositions[i3 + 2] = z;
    const hue = 0.5 + Math.random() * 0.15;
    const color = new THREE.Color().setHSL(hue, 0.8, 0.6);
    colors[i3] = color.r;
    colors[i3 + 1] = color.g;
    colors[i3 + 2] = color.b;
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({ size: 2.0, sizeAttenuation: true, transparent: true, opacity: 0.8, vertexColors: true, blending: THREE.AdditiveBlending, depthWrite: false });
  particleMesh = new THREE.Points(geometry, material);
  scene.add(particleMesh);
}

function updateParticleState(state) {
  if (state.action) particleSystemState.action = state.action;
  if (state.handOpenness !== undefined) particleSystemState.handOpenness = state.handOpenness;
  if (state.handSpeed !== undefined) particleSystemState.handSpeed = state.handSpeed;
  if (state.handDirection) particleSystemState.handDirection = state.handDirection;

  switch (state.action) {
    case "stop":
      particleSystemState.isStopped = true;
      particleSystemState.hue = 0.3;
      console.log("粒子停止运动");
      break;
    case "expand":
      particleSystemState.isStopped = false;
      particleSystemState.expansion = Math.min(particleSystemState.expansion + 0.1, 3.0);
      particleSystemState.focus = Math.max(particleSystemState.focus - 0.1, 0);
      particleSystemState.hue = 0.55;
      break;
    case "focus":
      particleSystemState.isStopped = false;
      particleSystemState.focus = Math.min(particleSystemState.focus + 0.1, 1.0);
      particleSystemState.expansion = Math.max(particleSystemState.expansion - 0.1, 0.5);
      particleSystemState.hue = 0.0;
      break;
    case "swipe":
      particleSystemState.isStopped = false;
      if (state.momentum) {
        particleSystemState.momentum = state.momentum;
        if (Math.abs(state.momentum.x) > Math.abs(state.momentum.y)) {
          particleSystemState.angularVelocity.y = state.momentum.x * 0.5;
        } else {
          particleSystemState.angularVelocity.x = state.momentum.y * 0.5;
        }
      }
      particleSystemState.hue = 0.75;
      break;
    case "punch":
      particleSystemState.isStopped = false;
      particleSystemState.warpSpeed = Math.min(particleSystemState.warpSpeed + 0.3, 1.0);
      particleSystemState.hue = 0.15;
      break;
    case "move":
      particleSystemState.isStopped = false;
      if (state.position) {
        particleSystemState.targetPosition.x = (state.position.x - 0.5) * 100;
        particleSystemState.targetPosition.y = -(state.position.y - 0.5) * 100;
      }
      particleSystemState.hue = 0.45;
      break;
    case "idle":
    default:
      particleSystemState.isStopped = false;
      particleSystemState.expansion = lerp(particleSystemState.expansion, 1.0, 0.05);
      particleSystemState.focus = lerp(particleSystemState.focus, 0, 0.05);
      particleSystemState.warpSpeed = lerp(particleSystemState.warpSpeed, 0, 0.02);
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
  waveTime += 0.02;

  if (particleSystemState.isStopped) {
    renderer.render(scene, camera);
    return;
  }

  particleSystemState.momentum.x *= 0.98;
  particleSystemState.momentum.y *= 0.98;
  particleSystemState.momentum.z *= 0.98;
  particleSystemState.angularVelocity.x *= 0.97;
  particleSystemState.angularVelocity.y *= 0.97;
  particleSystemState.angularVelocity.z *= 0.97;

  particleSystemState.currentPosition.x = lerp(particleSystemState.currentPosition.x, particleSystemState.targetPosition.x, 0.05);
  particleSystemState.currentPosition.y = lerp(particleSystemState.currentPosition.y, particleSystemState.targetPosition.y, 0.05);

  particleSystemState.rotation.x += particleSystemState.angularVelocity.x;
  particleSystemState.rotation.y += particleSystemState.angularVelocity.y;
  particleSystemState.rotation.z += particleSystemState.angularVelocity.z;

  if (particleMesh) {
    const positions = particleMesh.geometry.attributes.position.array;
    const colors = particleMesh.geometry.attributes.color.array;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      const ox = particlePositions[i3];
      const oy = particlePositions[i3 + 1];
      const oz = particlePositions[i3 + 2];
      const dist = Math.sqrt(ox * ox + oy * oy + oz * oz);
      const normalizedDist = dist / 100;

      const wave1 = Math.sin(waveTime + normalizedDist * 2) * 2;
      const wave2 = Math.cos(waveTime * 1.3 + ox * 0.02) * 1.5;

      const expandFactor = particleSystemState.expansion;
      const focusFactor = particleSystemState.focus;
      let focusScale = 1 - focusFactor * 0.7;
      let expandScale = 1 + (expandFactor - 1) * 0.5;

      let px = ox * focusScale * expandScale;
      let py = oy * focusScale * expandScale;
      let pz = oz * focusScale * expandScale;

      px += wave1;
      py += Math.sin(waveTime * 0.7 + normalizedDist * 3) * 2;
      pz += wave2;

      if (particleSystemState.warpSpeed > 0.01) {
        const warp = particleSystemState.warpSpeed * 20;
        pz += warp * Math.sin(time * 10 + i * 0.001);
        py += warp * Math.cos(time * 10 + i * 0.001) * 0.3;
      }

      px += particleSystemState.currentPosition.x * 0.1;
      py += particleSystemState.currentPosition.y * 0.1;

      const breathing = 1 + Math.sin(time * 0.5) * 0.05;

      positions[i3] = px * breathing;
      positions[i3 + 1] = py * breathing;
      positions[i3 + 2] = pz * breathing;

      // 如果 AgenticX ColorAgent 存在，使用智能体控制的色彩
      let baseHue = particleSystemState.hue;
      let baseSaturation = 0.7;
      let baseLightness = 0.5;
      
      if (window.agenticx) {
        const colorAgent = window.agenticx.getAgent('ColorAgent');
        if (colorAgent) {
          const colorState = colorAgent.getState();
          baseHue = colorState.hue || baseHue;
          baseSaturation = colorState.saturation || baseSaturation;
          baseLightness = colorState.lightness || baseLightness;
        }
      }
      
      const hueVariation = Math.sin(time + i * 0.0001) * 0.1;
      const saturation = baseSaturation + Math.sin(time * 0.3 + i * 0.0002) * 0.2;
      const lightness = baseLightness + Math.sin(waveTime + i * 0.0003) * 0.2;
      const hue = baseHue + hueVariation + normalizedDist * 0.15;
      const color = new THREE.Color().setHSL(hue, saturation, lightness);
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
    }

    particleMesh.geometry.attributes.position.needsUpdate = true;
    particleMesh.geometry.attributes.color.needsUpdate = true;
    particleMesh.rotation.x = particleSystemState.rotation.x;
    particleMesh.rotation.y = time * 0.05 + particleSystemState.rotation.y;
    particleMesh.rotation.z = particleSystemState.rotation.z;
  }

  if (starsMesh) {
    starsMesh.rotation.y += 0.0002;
    starsMesh.rotation.x = Math.sin(time * 0.1) * 0.1;
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

// 添加色彩更新函数（供 AgenticX ColorAgent 调用）
window.updateParticleColor = function(hue, saturation, lightness) {
  particleSystemState.hue = hue;
  // 可以在动画循环中使用这些值更新粒子颜色
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
  
  // 初始化 AgenticX Python 后端客户端
  if (typeof initAgenticXClient === "function") {
    try {
      window.agenticxClient = await initAgenticXClient(
        'http://localhost:8001',
        'ws://localhost:8001/ws'
      );
      console.log("✅ AgenticX Python 后端客户端已连接");
      
      // 注册 WebSocket 消息处理器
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
