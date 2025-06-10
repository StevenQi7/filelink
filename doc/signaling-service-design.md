# FileLink 公网传输信令服务设计

## 概述

FileLink应用的公网传输功能采用WebRTC协议实现点对点文件传输，需要一个信令服务来辅助建立连接。本文档详细描述了该信令服务的功能和接口设计。

## 基本功能

### 1. 会话管理
- 创建传输会话（根据6位密码生成唯一会话ID）
- 加入现有会话（接收方通过密码加入）
- 会话状态维护和超时管理

### 2. 信令交换
- 交换SDP（会话描述协议）信息
- 交换ICE候选信息
- 传输连接状态更新

### 3. 文件元数据交换
- 传输文件列表和元数据
- 传输进度同步

## API接口设计

### 1. 会话管理接口

#### 1.1 创建会话

```
POST /session/create
```

**请求体**:
```json
{
  "code": "6位数字密码",
  "deviceInfo": {
    "id": "发送设备ID",
    "name": "设备名称",
    "platform": "ios",
    "version": "应用版本"
  },
  "expiresIn": 1800  // 会话有效期（秒），默认30分钟
}
```

**响应**:
```json
{
  "sessionId": "会话唯一标识",
  "status": "created",
  "expiresAt": "过期时间戳"
}
```

#### 1.2 加入会话

```
POST /session/join
```

**请求体**:
```json
{
  "code": "6位数字密码",
  "deviceInfo": {
    "id": "接收设备ID",
    "name": "设备名称",
    "platform": "ios",
    "version": "应用版本"
  }
}
```

**响应**:
```json
{
  "sessionId": "会话唯一标识",
  "status": "joined",
  "peerInfo": {
    "id": "对方设备ID",
    "name": "对方设备名称",
    "platform": "对方平台"
  }
}
```

#### 1.3 会话心跳

```
POST /session/{sessionId}/heartbeat
```

**请求体**:
```json
{
  "deviceId": "设备ID"
}
```

**响应**:
```json
{
  "status": "active",
  "expiresAt": "更新后的过期时间戳"
}
```

#### 1.4 关闭会话

```
POST /session/{sessionId}/close
```

**请求体**:
```json
{
  "deviceId": "设备ID",
  "reason": "关闭原因"
}
```

**响应**:
```json
{
  "status": "closed"
}
```

### 2. WebRTC信令接口

#### 2.1 发送SDP提议

```
POST /session/{sessionId}/offer
```

**请求体**:
```json
{
  "deviceId": "发送设备ID",
  "sdp": "SDP提议内容"
}
```

**响应**:
```json
{
  "status": "delivered"
}
```

#### 2.2 发送SDP应答

```
POST /session/{sessionId}/answer
```

**请求体**:
```json
{
  "deviceId": "接收设备ID",
  "sdp": "SDP应答内容"
}
```

**响应**:
```json
{
  "status": "delivered"
}
```

#### 2.3 发送ICE候选

```
POST /session/{sessionId}/ice-candidate
```

**请求体**:
```json
{
  "deviceId": "设备ID",
  "candidate": "ICE候选信息"
}
```

**响应**:
```json
{
  "status": "delivered"
}
```

### 3. 文件传输相关接口

#### 3.1 文件信息同步

```
POST /session/{sessionId}/files
```

**请求体**:
```json
{
  "deviceId": "发送设备ID",
  "files": [
    {
      "name": "文件名",
      "originalName": "原始文件名",
      "size": 文件大小,
      "type": "文件类型"
    }
  ]
}
```

**响应**:
```json
{
  "status": "received"
}
```

#### 3.2 传输状态更新

```
POST /session/{sessionId}/transfer-status
```

**请求体**:
```json
{
  "deviceId": "设备ID",
  "status": "transferring|completed|failed|cancelled",
  "progress": 0.75,  // 如果是transferring状态
  "error": "错误信息"  // 如果是failed状态
}
```

**响应**:
```json
{
  "status": "updated"
}
```

## 实时通信通道

除了REST API接口外，信令服务还提供WebSocket实时通信通道：

```
WebSocket连接: wss://signaling-server/ws/{sessionId}/{deviceId}
```

### WebSocket消息类型

#### 1. 会话状态更新

```json
{
  "type": "session_update",
  "status": "active|waiting|joined|expired|closed",
  "timestamp": "时间戳"
}
```

#### 2. 对等方加入/离开

```json
{
  "type": "peer_event",
  "event": "joined|left",
  "peer": {
    "id": "对方设备ID",
    "name": "对方设备名称",
    "platform": "对方平台"
  }
}
```

#### 3. SDP交换

```json
{
  "type": "sdp",
  "subtype": "offer|answer",
  "sdp": "SDP内容",
  "from": "发送设备ID"
}
```

#### 4. ICE候选交换

```json
{
  "type": "ice_candidate",
  "candidate": "ICE候选信息",
  "from": "发送设备ID"
}
```

#### 5. 传输状态更新

```json
{
  "type": "transfer_update",
  "status": "preparing|transferring|completed|failed|cancelled",
  "progress": 0.5,  // 可选
  "from": "发送设备ID"
}
```

## 安全考虑

### 1. 传输加密
- 所有HTTP请求和WebSocket连接都使用TLS/SSL加密
- WebRTC数据通道已内置加密

### 2. 会话安全
- 6位随机密码提供基本的访问控制
- 会话具有有效期限（默认30分钟）
- 设备ID验证防止第三方干扰

### 3. 服务限流
- 对API请求实施速率限制
- 对单个IP地址的会话数量设置上限

## 部署考虑

### 1. 服务器要求
- Node.js或Go等轻量级服务器适合实现
- 需要支持WebSocket的环境
- 低延迟、高可用性配置

### 2. 扩展性
- 使用Redis等工具存储会话状态以支持水平扩展
- 负载均衡多个信令服务器实例

### 3. 监控
- 会话创建率和活跃度监控
- 错误率和延迟监控
- 资源使用监控

## 与FileLink应用集成

### 1. iOS客户端集成
- 在NetworkService中添加WebRTC连接支持
- 实现公网传输模式下的信令服务连接逻辑
- 使用生成的6位密码建立会话

### 2. 会话流程
1. 发送方生成6位密码并创建会话
2. 接收方输入密码加入会话
3. 通过信令服务交换WebRTC所需的信息
4. 建立P2P连接后开始直接传输文件
5. 文件传输完成后关闭会话

## 附录

### 错误码定义

| 错误码 | 描述 |
|-------|------|
| 1001 | 会话不存在 |
| 1002 | 密码错误 |
| 1003 | 会话已过期 |
| 1004 | 设备ID验证失败 |
| 2001 | SDP格式错误 |
| 2002 | ICE候选格式错误 |
| 3001 | 文件元数据格式错误 |
| 9001 | 服务内部错误 | 