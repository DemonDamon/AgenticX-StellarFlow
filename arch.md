
# Liquid Silk 技术架构文档

## 一、系统架构概览

```
Client Layer (Desktop/Mobile/TV)
        │
WebSocket Client Layer (sync.js)
        │
Core Application Layer
├── Three.js 3D Renderer (main.js)
├── MediaPipe Hands Gesture Engine (main.js)
        │
IndexedDB (Local Storage)
        │
WebSocket Server (server.js - Node.js)
```

---

## 二、技术栈详情

### 2.1 前端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Three.js | 0.160.0+ | 3D 渲染引擎 |
| MediaPipe Hands | 0.4+ | 手势识别 |
| WebGL | 2.0 | 图形渲染 |
| WebSocket | - | 实时通信 |
| IndexedDB | - | 本地存储 |

### 2.2 后端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Node.js | 18+ | 运行时环境 |
| ws | Latest | WebSocket 库 |

---

## 三、核心模块设计

### 3.1 Three.js 渲染模块

```
Scene (0x000814 background)
├── Camera (Perspective, FOV=60, z=50)
├── Renderer (WebGL, antialias=true)
└── ParticleSystem (InstancedMesh, 100k particles)
    └── ShaderMaterial (GLSL)
        ├── vertexShader (粒子运动逻辑)
        └── fragmentShader (菲涅尔边缘光效果)
```

### 3.2 手势识别模块

```
Camera Input → Hand Detection → Landmark Extraction → Gesture Analysis
                                                        │
                                   Particle Update ← State Sync
```

**手势关键点:**
- landmarks[4] - 拇指尖
- landmarks[8] - 食指尖 → 计算捏合距离
- landmarks[12] - 中指尖 → 计算旋转角度

### 3.3 WebSocket 同步模块

```
Master Device ──state-update──▶ Server ──state-sync──▶ Slave Device
```

**消息类型:**
- apply-master: 申请主设备
- state-update: 状态更新（主→服务器）
- state-sync: 状态同步（服务器→从）
- init-sync: 初始同步

**同步数据结构:**
```javascript
{
  particleDirection: [x, y],
  particleScale: 1.0,
  starRotation: 0.0,
  particleColor: "#ffffff"
}
```

### 3.4 性能优化模块

- LOD System (距离降级)
- OffscreenCanvas (Web Worker 渲染)
- BufferGeometry (减少传输开销)
- InstancedMesh (批量实例化)
- Auto Degradation (FPS < 50 时自动降级)

---

## 四、文件目录结构

```
liquid-silk/
├── client/
│   ├── index.html
│   ├── css/style.css
│   ├── js/
│   │   ├── main.js
│   │   ├── shaders.js
│   │   ├── sync.js
│   │   └── model-checker.js
│   └── models/
├── server/
│   ├── server.js
│   └── package.json
└── docs/
```

---

## 五、GLSL 着色器设计

### 顶点着色器
```glsl
uniform float time;
uniform vec2 direction;
uniform float scale;
attribute vec3 offset;
attribute float size;
varying vec3 vPosition;

void main() {
    vPosition = position * scale + offset + vec3(direction * time * 0.5, 0.0);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(vPosition, 1.0);
    gl_PointSize = size * scale;
}
```

### 片元着色器
```glsl
uniform vec3 color;
varying vec3 vPosition;

void main() {
    vec3 viewDir = normalize(cameraPosition - vPosition);
    vec3 normal = normalize(vPosition);
    float fresnel = pow(1.0 - dot(viewDir, normal), 3.0);
    vec3 finalColor = mix(color * 0.5, vec3(1.0, 1.0, 1.2), fresnel);
    gl_FragColor = vec4(finalColor, 0.8);
}
```

---

## 六、安全与容错

| 风险 | 应对措施 |
|------|----------|
| 摄像头权限滥用 | 本地处理不上传 |
| WebSocket 劫持 | 可选 WSS 加密 |

| 故障场景 | 处理策略 |
|----------|----------|
| 摄像头拒绝 | 提示用户授权 |
| WebSocket 断连 | 自动重连 |
| 性能不足 | 自动降级 |

