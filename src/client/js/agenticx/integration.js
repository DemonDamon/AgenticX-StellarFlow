/**
 * AgenticX 集成文件
 * 将多智能体系统集成到现有的 Liquid Silk 项目中
 */

/**
 * 初始化 AgenticX 系统并集成到现有代码
 */
async function initAgenticX(gestureHandler) {
  console.log('[AgenticX] 初始化多智能体系统...');

  // 创建 AgenticX 实例
  const agenticx = new AgenticX({
    enableAI: true,
    enableLearning: true
  });

  // 注册所有智能体
  const gestureAgent = new GestureAgent(agenticx.messageBus, gestureHandler);
  const particleFlowAgent = new ParticleFlowAgent(agenticx.messageBus);
  const colorAgent = new ColorAgent(agenticx.messageBus);
  const performanceAgent = new PerformanceAgent(agenticx.messageBus);

  agenticx.registerAgent(gestureAgent);
  agenticx.registerAgent(particleFlowAgent);
  agenticx.registerAgent(colorAgent);
  agenticx.registerAgent(performanceAgent);

  // 启动系统
  await agenticx.start();

  // 将 AgenticX 实例挂载到全局，方便访问
  window.agenticx = agenticx;

  // 订阅粒子更新消息，更新 Three.js 渲染
  agenticx.messageBus.subscribe('particle-update', {
    name: 'ThreeJSRenderer',
    async onMessage(message) {
      if (window.updateParticleState) {
        const payload = message.payload;
        window.updateParticleState({
          action: 'agent-update',
          momentum: payload.momentum,
          angularVelocity: payload.angularVelocity,
          expansion: payload.expansion,
          focus: payload.focus,
          warpSpeed: payload.warpSpeed,
          targetPosition: payload.targetPosition
        });
      }
    }
  });

  // 订阅色彩更新消息
  agenticx.messageBus.subscribe('color-update', {
    name: 'ThreeJSRenderer',
    async onMessage(message) {
      const color = message.payload;
      // 更新粒子系统色彩（需要在 main.js 中实现）
      if (window.updateParticleColor) {
        window.updateParticleColor(color.hue, color.saturation, color.lightness);
      }
    }
  });

  // 定期更新粒子流动智能体（动画循环）
  function updateAgenticX() {
    if (agenticx && agenticx.isRunning) {
      const particleFlowAgent = agenticx.getAgent('ParticleFlowAgent');
      if (particleFlowAgent) {
        particleFlowAgent.update(0.016); // 假设60FPS
      }
    }
    requestAnimationFrame(updateAgenticX);
  }
  updateAgenticX();

  // 定期发送时间更新（用于色彩智能体）
  setInterval(() => {
    agenticx.messageBus.publish({
      from: 'System',
      type: 'time-update',
      payload: { hour: new Date().getHours() }
    });
  }, 60000); // 每分钟更新一次

  console.log('[AgenticX] 多智能体系统集成完成！');
  return agenticx;
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initAgenticX };
} else {
  window.initAgenticX = initAgenticX;
}

