/**
 * GLSL 着色器代码
 * 适配 THREE.Points 渲染
 */

// 顶点着色器
const vertexShader = `
uniform float time;
uniform vec2 direction;
uniform float scale;

attribute float size;
varying vec3 vPosition;

void main() {
  vPosition = position;

  // 添加流动效果
  vec3 pos = position;
  pos.x += direction.x * time * 0.05;
  pos.y += direction.y * time * 0.05;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // 粒子大小随距离缩放
  gl_PointSize = size * scale * (300.0 / -mvPosition.z);
}
`;

// 片元着色器
const fragmentShader = `
uniform vec3 color;
uniform float time;

varying vec3 vPosition;

void main() {
  // 创建圆形粒子
  vec2 center = gl_PointCoord - 0.5;
  float dist = length(center);
  if (dist > 0.5) discard;

  // 边缘柔化
  float alpha = 1.0 - smoothstep(0.2, 0.5, dist);

  // 添加闪烁效果
  float twinkle = sin(time * 3.0 + vPosition.x * 0.01) * 0.3 + 0.7;

  // 基础颜色
  vec3 finalColor = color * twinkle;

  // 添加边缘发光
  float glow = 1.0 - smoothstep(0.0, 0.5, dist);
  finalColor += vec3(0.3, 0.3, 0.5) * glow;

  gl_FragColor = vec4(finalColor, alpha * 0.8);
}
`;
