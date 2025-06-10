# WebRTC 文件传输实施指南

本指南提供了在应用中集成 WebRTC 点对点文件传输功能的步骤和最佳实践。

## 1. 前期准备

### 1.1 技术栈选择

* **前端框架**: React、Vue 或 Angular 均可，本实现基于 React + Next.js
* **WebRTC 库**: 使用原生 WebRTC API，无需额外库
* **信令服务**: Socket.IO 用于信令交换
* **服务端**: Node.js 处理会话管理和信令转发

### 1.2 环境配置

确保你的开发和生产环境满足以下要求：

* 支持 HTTPS（WebRTC 在生产环境中需要安全上下文）
* 现代浏览器支持（Chrome 60+, Firefox 55+, Safari 11+, Edge 79+）
* Node.js 14+ 运行环境

## 2. 系统设计

### 2.1 核心组件

1. **会话管理模块**
   * 创建和管理传输会话
   * 生成和验证房间密码
   * 处理设备加入/离开逻辑

2. **信令服务**
   * 转发 SDP 信息和 ICE 候选
   * 通知会话成员状态变化
   * 处理连接请求和文件信息转发

3. **WebRTC 连接管理**
   * 初始化和维护 RTCPeerConnection
   * 处理 SDP 交换和 ICE 候选收集
   * 创建和管理数据通道

4. **文件传输模块**
   * 文件选择和元信息生成
   * 分块传输实现
   * 进度跟踪和错误处理

5. **用户界面**
   * 角色选择（发送方/接收方）
   * 文件选择和确认界面
   * 传输进度显示

### 2.2 数据流

```
发送方                        信令服务器                       接收方
  |                              |                              |
  |--- 选择文件 ----|              |                              |
  |                 |             |                              |
  |--- 创建会话 ---------------> 存储会话                           |
  |<-- 返回会话ID和密码 ------------|                              |
  |                               |                              |
  |--- WebSocket连接 -----------> 建立连接                         |
  |<-- 连接确认 -------------------|                              |
  |                               |                              |
  |                               |<-- 输入密码加入会话 ------------|
  |                               |--- 验证并返回会话ID ----------->|
  |                               |                              |
  |                               |<-- WebSocket连接 -------------|
  |                               |--- 连接确认 ----------------->|
  |                               |                              |
  |<---------------------- 通知有新设备加入/请求连接 ------------------|
  |                               |                              |
  |--- 初始化WebRTC并创建Offer ---->|--- 转发Offer ---------------->|
  |                               |                              |
  |                               |<-- 创建并发送Answer ------------|
  |<-- 转发Answer -----------------|                              |
  |                               |                              |
  |--- 收集并发送ICE候选 ---------->|--- 转发ICE候选 -------------->|
  |<-- 收集并发送ICE候选 ------------|<-- 收集并发送ICE候选 ----------|
  |                               |                              |
  |======== WebRTC连接建立（P2P直接通信）========|                  |
  |                                                              |
  |--- 发送文件信息 -------------------------------------------->|
  |<-- 确认接收文件 --------------------------------------------|
  |                                                              |
  |--- 分块发送文件数据 ---------------------------------------->|
  |--- 发送文件结束标志 ---------------------------------------->|
  |                                                              |
```

## 3. 实施步骤

### 3.1 后端实现

1. **创建会话管理API**

```javascript
// 创建Express路由或Next.js API路由
app.post('/api/session/create', (req, res) => {
  const { code, deviceInfo } = req.body;
  // 生成会话ID并存储会话信息
  const sessionId = generateUniqueId();
  sessions.set(code, { id: sessionId, members: [deviceInfo] });
  res.json({ sessionId });
});

app.post('/api/session/join', (req, res) => {
  const { code, deviceInfo } = req.body;
  // 查找会话并添加成员
  const session = sessions.get(code);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  session.members.push(deviceInfo);
  res.json({ sessionId: session.id });
});
```

2. **设置Socket.IO信令服务**

```javascript
io.on('connection', (socket) => {
  const { sessionId, deviceId } = socket.handshake.query;
  
  // 加入会话房间
  if (sessionId) socket.join(sessionId);
  
  // 通知会话成员有新设备加入
  socket.to(sessionId).emit('peer', { event: 'joined', deviceId });
  
  // 处理offer
  socket.on('offer', (data) => {
    socket.to(sessionId).emit('offer', { ...data, from: deviceId });
  });
  
  // 处理answer
  socket.on('answer', (data) => {
    socket.to(sessionId).emit('answer', { ...data, from: deviceId });
  });
  
  // 处理ICE候选
  socket.on('ice_candidate', (data) => {
    socket.to(sessionId).emit('ice_candidate', { ...data, from: deviceId });
  });
  
  // 其他信令事件...
});
```

### 3.2 前端实现

1. **设备ID和会话管理**

```javascript
// 生成或获取设备ID
const getDeviceId = () => {
  let id = localStorage.getItem('deviceId');
  if (!id) {
    id = 'device_' + Math.random().toString(36).substring(2, 9);
    localStorage.setItem('deviceId', id);
  }
  return id;
};

// 创建会话
const createSession = async () => {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const response = await fetch('/api/session/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, deviceInfo: { id: getDeviceId() } })
  });
  const data = await response.json();
  // 保存会话信息并建立WebSocket连接
  localStorage.setItem('sessionId', data.sessionId);
  localStorage.setItem('role', 'sender');
  connectWebSocket(data.sessionId);
  return { code, sessionId: data.sessionId };
};

// 加入会话
const joinSession = async (code) => {
  const response = await fetch('/api/session/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, deviceInfo: { id: getDeviceId() } })
  });
  const data = await response.json();
  // 保存会话信息并建立WebSocket连接
  localStorage.setItem('sessionId', data.sessionId);
  localStorage.setItem('role', 'receiver');
  connectWebSocket(data.sessionId);
  return { sessionId: data.sessionId };
};
```

2. **WebRTC连接初始化**

```javascript
// 初始化WebRTC连接
const initWebRTC = (isSender) => {
  const connection = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  });
  
  // 如果是发送方，创建数据通道
  if (isSender) {
    const channel = connection.createDataChannel('fileChannel');
    setupDataChannel(channel);
  }
  
  // 如果是接收方，监听数据通道
  connection.ondatachannel = (event) => {
    setupDataChannel(event.channel);
  };
  
  // 设置ICE候选处理
  connection.onicecandidate = (event) => {
    if (event.candidate) {
      // 发送ICE候选到对方
      socket.emit('ice_candidate', { candidate: event.candidate });
    }
  };
  
  // 设置连接状态变化监听
  connection.onconnectionstatechange = () => {
    console.log('Connection state:', connection.connectionState);
  };
  
  return connection;
};
```

3. **SDP交换实现**

```javascript
// 创建并发送offer
const createOffer = async (connection) => {
  try {
    // 创建SDP offer
    const offer = await connection.createOffer();
    await connection.setLocalDescription(offer);
    
    // 发送offer到对方
    socket.emit('offer', { sdp: offer });
  } catch (error) {
    console.error('Error creating offer:', error);
  }
};

// 处理收到的offer
const handleOffer = async (offer) => {
  try {
    // 确保WebRTC连接已初始化
    const connection = rtcConnection || initWebRTC(false);
    
    // 设置远程描述(offer)
    await connection.setRemoteDescription(new RTCSessionDescription(offer.sdp));
    
    // 创建answer
    const answer = await connection.createAnswer();
    await connection.setLocalDescription(answer);
    
    // 发送answer到对方
    socket.emit('answer', { sdp: answer });
  } catch (error) {
    console.error('Error handling offer:', error);
  }
};

// 处理收到的answer
const handleAnswer = async (answer) => {
  try {
    // 设置远程描述(answer)
    await rtcConnection.setRemoteDescription(new RTCSessionDescription(answer.sdp));
  } catch (error) {
    console.error('Error handling answer:', error);
  }
};
```

4. **数据通道和文件传输**

```javascript
// 设置数据通道
const setupDataChannel = (channel) => {
  channel.onopen = () => {
    console.log('Data channel open');
    // 存储数据通道引用
    dataChannelRef.current = channel;
    
    // 如果是发送方且有文件，发送文件信息
    if (localStorage.getItem('role') === 'sender' && selectedFiles.length > 0) {
      sendFileInfo();
    }
  };
  
  channel.onmessage = (event) => {
    // 处理收到的消息
    if (typeof event.data === 'string') {
      // 处理JSON消息
      const data = JSON.parse(event.data);
      handleChannelMessage(data);
    } else {
      // 处理二进制数据(文件块)
      processFileChunk(event.data);
    }
  };
};

// 发送文件信息
const sendFileInfo = () => {
  const fileInfo = selectedFiles.map(file => ({
    id: generateFileId(),
    name: file.name,
    size: file.size,
    type: file.type
  }));
  
  dataChannelRef.current.send(JSON.stringify({
    type: 'files_info',
    files: fileInfo
  }));
};

// 发送文件
const sendFile = (file, fileId) => {
  const chunkSize = 16 * 1024; // 16KB
  let offset = 0;
  const reader = new FileReader();
  
  // 发送文件开始消息
  dataChannelRef.current.send(JSON.stringify({
    type: 'file-start',
    fileId,
    name: file.name,
    size: file.size
  }));
  
  reader.onload = (e) => {
    if (dataChannelRef.current.readyState === 'open') {
      // 发送文件块
      dataChannelRef.current.send(e.target.result);
      
      // 更新进度
      offset += e.target.result.byteLength;
      updateProgress(fileId, (offset / file.size) * 100);
      
      // 继续读取下一块或完成发送
      if (offset < file.size) {
        readNextChunk();
      } else {
        // 发送文件结束消息
        dataChannelRef.current.send(JSON.stringify({
          type: 'file-end',
          fileId
        }));
      }
    }
  };
  
  const readNextChunk = () => {
    const slice = file.slice(offset, offset + chunkSize);
    reader.readAsArrayBuffer(slice);
  };
  
  // 开始读取
  readNextChunk();
};
```

### 3.3 用户界面实现

1. **角色选择界面**

```jsx
<div className="grid grid-cols-2 gap-4">
  <div className="border p-4 rounded">
    <h2 className="text-lg font-bold mb-3">发送文件</h2>
    <input 
      type="file" 
      multiple 
      onChange={handleFileSelect} 
      className="mb-3"
    />
    {selectedFiles.length > 0 && (
      <>
        <div className="text-sm mb-3">
          已选择 {selectedFiles.length} 个文件
        </div>
        <button 
          onClick={createSession}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          创建传输会话
        </button>
      </>
    )}
  </div>
  
  <div className="border p-4 rounded">
    <h2 className="text-lg font-bold mb-3">接收文件</h2>
    <input
      type="text"
      placeholder="输入6位房间密码"
      value={roomCode}
      onChange={(e) => setRoomCode(e.target.value)}
      className="mb-3 px-3 py-2 border rounded w-full"
    />
    <button
      onClick={() => joinSession(roomCode)}
      className="bg-green-500 text-white px-4 py-2 rounded w-full"
      disabled={!roomCode || roomCode.length !== 6}
    >
      加入传输会话
    </button>
  </div>
</div>
```

2. **文件确认对话框**

```jsx
{showFileConfirm && fileInfo.length > 0 && (
  <div className="bg-yellow-50 border p-4 rounded mb-4">
    <h3 className="font-bold mb-2">发送方请求发送以下文件:</h3>
    <ul className="mb-3">
      {fileInfo.map(file => (
        <li key={file.id} className="mb-1">
          {file.name} ({formatBytes(file.size)})
        </li>
      ))}
    </ul>
    <div className="flex gap-2">
      <button
        onClick={() => confirmReceiveFiles(true)}
        className="bg-green-500 text-white px-3 py-1 rounded"
      >
        接收文件
      </button>
      <button
        onClick={() => confirmReceiveFiles(false)}
        className="bg-red-500 text-white px-3 py-1 rounded"
      >
        拒绝接收
      </button>
    </div>
  </div>
)}
```

3. **传输进度显示**

```jsx
{Object.entries(transferProgress).map(([fileId, progress]) => {
  const file = fileInfo.find(f => f.id === fileId);
  return (
    <div key={fileId} className="mb-2">
      <div className="flex justify-between text-sm mb-1">
        <span>{file?.name}</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-600 h-2 rounded-full" 
          style={{width: `${progress}%`}}
        ></div>
      </div>
    </div>
  );
})}
```

## 4. 测试和部署

### 4.1 本地测试

1. **使用同一设备测试**
   * 在两个不同的浏览器或隐私窗口中打开应用
   * 在一个窗口中创建会话，在另一个窗口中加入会话

2. **使用多设备测试**
   * 确保应用在本地网络中可访问（如使用ngrok或本地https服务器）
   * 在不同设备上访问应用并测试文件传输

### 4.2 生产部署

1. **HTTPS配置**
   * 确保生产环境使用HTTPS（WebRTC要求）
   * 配置适当的SSL证书

2. **信令服务器扩展**
   * 考虑使用WebSocket服务的扩展方案
   * 适当的负载均衡和故障转移策略

3. **ICE服务器配置**
   * 配置TURN服务器以处理NAT穿透问题
   * 示例配置:
     ```javascript
     const configuration = {
       iceServers: [
         { urls: 'stun:stun.l.google.com:19302' },
         { 
           urls: 'turn:your-turn-server.com:3478',
           username: 'username',
           credential: 'password'
         }
       ]
     };
     ```

## 5. 性能优化和安全考虑

### 5.1 性能优化

1. **大文件处理**
   * 增加对文件大小的检查和限制
   * 考虑实现断点续传功能
   * 优化分块大小（16KB-64KB之间较为理想）

2. **并行传输**
   * 对于多文件传输，考虑并行传输策略
   * 监控带宽使用并动态调整传输速率

### 5.2 安全考虑

1. **数据加密**
   * WebRTC默认加密数据传输
   * 考虑对敏感文件添加额外的端到端加密

2. **会话验证**
   * 增强房间密码安全性，考虑使用一次性密码
   * 增加会话过期机制

3. **权限控制**
   * 添加用户确认步骤，防止未经授权的文件传输
   * 实现文件传输限制（类型、大小等）

## 6. 故障排除

### 常见问题及解决方案

1. **连接建立失败**
   * 检查两端的网络连接
   * 确认信令服务器是否正常工作
   * 考虑添加TURN服务器处理NAT穿透

2. **数据传输中断**
   * 实现检测和重新连接机制
   * 添加传输超时处理

3. **文件接收不完整**
   * 实现文件校验（如使用哈希值）
   * 添加重新传输机制

4. **浏览器兼容性问题**
   * 添加浏览器特性检测
   * 考虑为不支持的浏览器提供备选方案

按照本指南的步骤和最佳实践，您可以在应用中实现可靠、高效的WebRTC点对点文件传输功能。根据您的具体需求和应用特性，可能需要进一步调整和优化实现细节。 