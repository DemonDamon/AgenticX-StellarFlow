"""
AgenticX 服务端 - 为动态壁纸项目提供智能体服务
使用 FastAPI 提供 HTTP API 和 WebSocket 支持
"""

import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Dict, Any, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# AgenticX 导入
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../myWork/AgenticX'))

from agenticx.core.agent import Agent
from agenticx.core.agent_executor import AgentExecutor
from agenticx.llms.litellm_provider import LiteLLMProvider

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# 使用 lifespan 替代已弃用的 on_event
@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时初始化智能体
    await init_agents()
    yield
    # 关闭时清理资源（如果需要）
    logger.info("应用关闭")


# FastAPI 应用
app = FastAPI(
    title="AgenticX Wallpaper Service",
    version="1.0.0",
    lifespan=lifespan
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境应限制具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket 连接管理
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket 连接已建立，当前连接数: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(f"WebSocket 连接已断开，当前连接数: {len(self.active_connections)}")
    
    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)
    
    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.error(f"广播消息失败: {e}")

manager = ConnectionManager()

# 智能体实例（延迟初始化）
# Agent 和 AgentExecutor 分离，符合 AgenticX 的设计模式
gesture_agent: Optional[Agent] = None
particle_flow_agent: Optional[Agent] = None
color_agent: Optional[Agent] = None
agent_executor: Optional[AgentExecutor] = None  # 共享一个 executor

# 请求/响应模型
class GestureAnalysisRequest(BaseModel):
    landmarks: list[Dict[str, float]]
    palm_center: Dict[str, float]
    current_pos: Dict[str, float]
    prev_pos: Dict[str, float]

class GestureAnalysisResponse(BaseModel):
    gesture: str
    intensity: float
    direction: list[float]
    confidence: float
    prediction: str

class ParticleUpdateRequest(BaseModel):
    gesture: str
    intensity: float
    direction: list[float]

class ParticleUpdateResponse(BaseModel):
    direction: list[float]
    expansion: float
    focus: float
    warp_speed: float
    momentum: Dict[str, float]
    angular_velocity: Dict[str, float]

class ColorChangeRequest(BaseModel):
    gesture: Optional[str] = None
    theme: Optional[str] = None
    hue: Optional[float] = None

class ColorChangeResponse(BaseModel):
    hue: float
    saturation: float
    lightness: float
    theme: str

# 初始化智能体
async def init_agents():
    """初始化所有智能体"""
    global gesture_agent, particle_flow_agent, color_agent, agent_executor
    
    try:
        # 使用 LiteLLM 提供 LLM（可以根据需要配置）
        llm_provider = LiteLLMProvider(model="gpt-3.5-turbo")
        
        # 创建共享的 AgentExecutor（不传 agent，agent 在 run 时传入）
        agent_executor = AgentExecutor(
            llm_provider=llm_provider
        )
        
        # 创建手势识别智能体
        gesture_agent = Agent.fast_construct(
            name="GestureAgent",
            role="手势识别专家",
            goal="识别用户手势并转换为视觉控制指令",
            organization_id="wallpaper-app",
            llm_config_name="default"
        )
        
        # 创建粒子流动智能体
        particle_flow_agent = Agent.fast_construct(
            name="ParticleFlowAgent",
            role="粒子系统控制专家",
            goal="控制粒子系统的流动、收缩、延展效果",
            organization_id="wallpaper-app",
            llm_config_name="default"
        )
        
        # 创建色彩控制智能体
        color_agent = Agent.fast_construct(
            name="ColorAgent",
            role="色彩设计专家",
            goal="智能控制粒子色彩、光晕、渐变效果",
            organization_id="wallpaper-app",
            llm_config_name="default"
        )
        
        logger.info("所有智能体初始化完成")
        
    except Exception as e:
        logger.error(f"智能体初始化失败: {e}")
        # 使用简化版本（不依赖 LLM）
        logger.info("使用简化模式（无 LLM）")

# API 端点
@app.get("/")
async def root():
    return {"message": "AgenticX Wallpaper Service", "status": "running"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.post("/api/gesture/analyze", response_model=GestureAnalysisResponse)
async def analyze_gesture(request: GestureAnalysisRequest):
    """分析手势数据"""
    try:
        # 简化的手势识别逻辑（实际应调用智能体）
        landmarks = request.landmarks
        if not landmarks:
            raise HTTPException(status_code=400, detail="手势数据为空")
        
        # 计算手势特征
        gesture = "idle"
        intensity = 0.5
        direction = [0.0, 0.0]
        confidence = 0.8
        prediction = "unknown"
        
        # TODO: 调用 GestureAgent 进行智能分析
        # 正确的调用方式：executor.run(agent, task)
        # if agent_executor and gesture_agent:
        #     from agenticx.core.task import Task
        #     task = Task(description="分析手势数据...")
        #     result = agent_executor.run(gesture_agent, task)
        
        return GestureAnalysisResponse(
            gesture=gesture,
            intensity=intensity,
            direction=direction,
            confidence=confidence,
            prediction=prediction
        )
    except Exception as e:
        logger.error(f"手势分析失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/particle/update", response_model=ParticleUpdateResponse)
async def update_particle(request: ParticleUpdateRequest):
    """更新粒子状态"""
    try:
        # TODO: 调用 ParticleFlowAgent
        return ParticleUpdateResponse(
            direction=request.direction,
            expansion=1.0,
            focus=0.0,
            warp_speed=0.0,
            momentum={"x": 0, "y": 0, "z": 0},
            angular_velocity={"x": 0, "y": 0, "z": 0}
        )
    except Exception as e:
        logger.error(f"粒子更新失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/color/change", response_model=ColorChangeResponse)
async def change_color(request: ColorChangeRequest):
    """改变色彩主题"""
    try:
        # TODO: 调用 ColorAgent
        themes = {
            "cosmic": {"hue": 0.6, "saturation": 0.8, "lightness": 0.6},
            "ocean": {"hue": 0.55, "saturation": 0.9, "lightness": 0.5},
            "fire": {"hue": 0.05, "saturation": 1.0, "lightness": 0.6},
            "ice": {"hue": 0.5, "saturation": 0.7, "lightness": 0.8},
        }
        
        theme = request.theme or "cosmic"
        color = themes.get(theme, themes["cosmic"])
        
        return ColorChangeResponse(
            hue=request.hue or color["hue"],
            saturation=color["saturation"],
            lightness=color["lightness"],
            theme=theme
        )
    except Exception as e:
        logger.error(f"色彩更改失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# WebSocket 端点
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket 实时通信"""
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            logger.info(f"收到 WebSocket 消息: {data}")
            
            # 处理消息并广播响应
            # TODO: 解析消息并调用相应的智能体
            
            response = {"type": "ack", "message": "收到消息"}
            await manager.send_personal_message(str(response), websocket)
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        logger.info("WebSocket 连接断开")

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )

