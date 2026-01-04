/**
 * Liquid Silk WebSocket Server
 * 负责多设备间的状态同步
 */

const WebSocket = require('ws');

const PORT = process.env.PORT || 8081;
const wss = new WebSocket.Server({ port: PORT });

// 存储所有连接的客户端
const clients = new Set();

// 缓存主设备状态
let masterState = {
  particleDirection: [0, 0],
  particleScale: 1.0,
  starRotation: 0.0,
  particleColor: '#ffffff'
};

/**
 * 广播状态到所有从设备
 * @param {Object} data - 要广播的数据
 */
function broadcastToSlaves(data) {
  clients.forEach(client => {
    if (client.role === 'slave' && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

/**
 * 处理客户端连接
 */
wss.on('connection', (ws) => {
  console.log(`[${new Date().toISOString()}] 新客户端连接，当前连接数：${clients.size + 1}`);

  // 默认角色为从设备
  ws.role = 'slave';
  clients.add(ws);

  // 连接成功后立即同步最新主状态
  ws.send(JSON.stringify({
    type: 'init-sync',
    data: masterState
  }));

  /**
   * 处理客户端消息
   */
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log(`[${new Date().toISOString()}] 收到消息类型：${data.type}`);

      switch (data.type) {
        case 'apply-master':
          // 单主模式：重置其他客户端角色
          clients.forEach(client => client.role = 'slave');
          ws.role = 'master';
          ws.send(JSON.stringify({ type: 'master-ok' }));
          console.log('新主设备已生效');
          break;

        case 'state-update':
          if (ws.role === 'master') {
            masterState = data.payload;
            broadcastToSlaves({ type: 'state-sync', data: masterState });
          }
          break;

        default:
          console.log(`未知消息类型：${data.type}`);
      }
    } catch (err) {
      console.error(`[${new Date().toISOString()}] 消息解析失败：`, err);
    }
  });

  /**
   * 处理客户端断开
   */
  ws.on('close', () => {
    console.log(`[${new Date().toISOString()}] 客户端断开，当前连接数：${clients.size - 1}`);
    clients.delete(ws);

    // 如果断开的是主设备，清除主状态
    if (ws.role === 'master') {
      ws.role = 'slave';
    }
  });

  /**
   * 处理客户端错误
   */
  ws.on('error', (err) => {
    console.error(`[${new Date().toISOString()}] 客户端错误：`, err);
  });
});

/**
 * 优雅关闭
 */
process.on('SIGINT', () => {
  console.log('\n正在关闭服务器...');
  wss.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});

console.log(`═══════════════════════════════════════════════════`);
console.log(`  Liquid Silk 同步服务已启动`);
console.log(`  端口：${PORT}`);
console.log(`  等待客户端连接...`);
console.log(`═══════════════════════════════════════════════════`);
