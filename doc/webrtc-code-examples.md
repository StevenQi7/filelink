# WebRTC 文件传输代码示例

本文档提供了WebRTC点对点文件传输的关键代码示例，帮助开发者理解实现细节。

## 1. 设备ID和会话初始化

```typescript
// 生成唯一设备ID
const generateDeviceId = () => {
  const existingId = localStorage.getItem('webrtcDeviceId');
  if (existingId) {
    return existingId;
  }
  
  const newId = `device_${Math.random().toString(36).substring(2, 10)}`;
  localStorage.setItem('webrtcDeviceId', newId);
  return newId;
};

// 生成房间密码
const generateRoomCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// 创建新会话(发送方)
const createSession = async () => {
  try {
    // 发送方必须先选择文件
    if (selectedFiles.length === 0) {
      log('请先选择要发送的文件，再创建会话');
      return;
    }

    log('正在创建会话...');
    const code = generateRoomCode();
    setRoomCode(code);
    
    const response = await fetch('/api/session/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        deviceInfo: {
          id: deviceId,
          name: '发送设备',
          platform: 'web',
          version: '1.0'
        }
      }),
    });

    const data = await response.json();
    
    if (response.ok) {
      // 设置sessionId并保存到localStorage
      const sid = data.sessionId;
      setSessionId(sid);
      localStorage.setItem('webrtcSessionId', sid);
      
      // 设置角色，并存储到localStorage
      setRole('sender');
      localStorage.setItem('webrtcRole', 'sender');
      
      // 建立WebSocket连接
      connectWebSocket(sid);
    }
  } catch (error) {
    log(`创建会话错误: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// 加入会话(接收方)
const joinSession = async () => {
  try {
    if (!roomCode || roomCode.length !== 6) {
      log('请输入6位房间密码');
      return;
    }

    log('正在加入会话...');
    
    const response = await fetch('/api/session/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: roomCode,
        deviceInfo: {
          id: deviceId,
          name: '接收设备',
          platform: 'web',
          version: '1.0'
        }
      }),
    });

    const data = await response.json();
    
    if (response.ok) {
      // 设置sessionId并保存到localStorage
      const sid = data.sessionId;
      setSessionId(sid);
      localStorage.setItem('webrtcSessionId', sid);
      
      // 设置角色，并存储到localStorage
      setRole('receiver');
      localStorage.setItem('webrtcRole', 'receiver');
      
      // 建立WebSocket连接
      connectWebSocket(sid);
      
      // 2秒后发送连接请求
      setTimeout(() => {
        log('发送连接请求...');
        requestConnection();
      }, 2000);
    }
  } catch (error) {
    log(`加入会话错误: ${error instanceof Error ? error.message : String(error)}`);
  }
};
```

## 2. WebSocket连接管理

```typescript
// WebSocket连接
const connectWebSocket = (sessionId: string) => {
  // 检查是否已经有活跃连接
  if (socketRef.current && socketRef.current.connected) {
    log('断开现有WebSocket连接');
    socketRef.current.disconnect();
  }
  
  // 记录连接时间，避免频繁重连
  const lastConnectTime = parseInt(localStorage.getItem('lastSocketConnectTime') || '0');
  const now = Date.now();
  if (lastConnectTime && (now - lastConnectTime < 2000)) {
    log('连接尝试过于频繁，等待间隔...');
    return;
  }
  localStorage.setItem('lastSocketConnectTime', now.toString());
  
  // 生成唯一连接ID
  const connectionId = Math.random().toString(36).substring(2, 10);
  log(`正在创建新的WebSocket连接到会话 ${sessionId}...`);
  log(`创建Socket连接 [${connectionId}]...`);
  
  // 动态导入socket.io-client
  import('socket.io-client').then(io => {
    const newSocket = io.default('/', {
      query: {
        sessionId,
        deviceId,
        connectionId
      }
    });
    
    // 设置事件监听
    log(`为Socket ${newSocket.id} 设置事件监听器 [${connectionId.substring(0, 4)}]`);
    
    // 连接成功事件
    newSocket.on('connect', () => {
      log(`WebSocket已连接，ID: ${newSocket.id} [${connectionId}]`);
      socketRef.current = newSocket;
      
      // 设置所有Socket事件监听器
      setupSocketEventListeners(newSocket);
    });
    
    // 连接错误事件
    newSocket.on('connect_error', (error: any) => {
      log(`WebSocket连接错误: ${error.message}`);
    });
    
    // 断开连接事件
    newSocket.on('disconnect', (reason: string) => {
      log(`WebSocket断开连接: ${reason}`);
      
      // 30秒后尝试重连
      setTimeout(() => {
        if (!socketRef.current || !socketRef.current.connected) {
          log('尝试重新连接WebSocket...');
          const sid = localStorage.getItem('webrtcSessionId');
          if (sid) {
            connectWebSocket(sid);
          }
        }
      }, 30000);
    });
  }).catch(err => {
    log(`导入Socket.io失败: ${err.message}`);
  });
};
```

## 3. WebRTC连接建立

```typescript
// 初始化WebRTC连接
const initWebRTC = (isSender = true) => {
  try {
    log(`初始化WebRTC连接，角色: ${isSender ? '发送方' : '接收方'}`);
    
    // 创建RTCPeerConnection
    const conn = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });
    
    // 作为发送方，创建数据通道
    if (isSender) {
      const dataChannel = conn.createDataChannel('testChannel', {
        ordered: true
      });
      
      // 设置数据通道事件处理
      setupDataChannel(dataChannel);
    }
    
    // ICE候选收集事件
    conn.onicecandidate = (event) => {
      if (event.candidate) {
        // 收集到新的ICE候选
        const candidate = event.candidate;
        log(`收集到ICE候选: ${candidate.candidate.substring(0, 40)}...`);
        
        // 添加到本地收集的候选列表
        setCollectedIceCandidates(prev => [...prev, candidate]);
        
        // 如果WebSocket已连接，发送给对方
        if (socketRef.current && socketRef.current.connected) {
          socketRef.current.emit('ice_candidate', { candidate });
        }
      } else {
        log('ICE候选收集完成');
      }
    };
    
    // ICE连接状态变化事件
    conn.oniceconnectionstatechange = () => {
      log(`ICE连接状态: ${conn.iceConnectionState}`);
      updateConnectionDetails(conn);
    };
    
    // ICE收集状态变化事件
    conn.onicegatheringstatechange = () => {
      log(`ICE收集状态: ${conn.iceGatheringState}`);
      updateConnectionDetails(conn);
    };
    
    // 连接状态变化事件
    conn.onconnectionstatechange = () => {
      log(`连接状态变化: ${conn.connectionState}`);
      updateConnectionDetails(conn);
      
      if (conn.connectionState === 'connected') {
        setStatus('connected');
      } else if (conn.connectionState === 'failed' || conn.connectionState === 'disconnected' || conn.connectionState === 'closed') {
        setStatus('disconnected');
      }
    };
    
    // 信令状态变化事件
    conn.onsignalingstatechange = () => {
      log(`信令状态: ${conn.signalingState}`);
      updateConnectionDetails(conn);
    };
    
    // 数据通道事件(接收方)
    conn.ondatachannel = (event) => {
      log('收到数据通道');
      setupDataChannel(event.channel);
    };
    
    // 更新本地连接对象
    updateLocalConnection(conn);
    return conn;
  } catch (error) {
    log(`初始化WebRTC连接失败: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
};

// 创建并发送SDP Offer
const createOffer = async (connection: RTCPeerConnection) => {
  try {
    // 确保有活跃的WebRTC连接
    const conn = connection || rtcConnectionRef.current;
    if (!conn) {
      log('没有活跃的WebRTC连接，无法创建Offer');
      return;
    }
    
    // 确保有会话ID
    const sid = localStorage.getItem('webrtcSessionId') || sessionId;
    if (!sid) {
      log('未找到会话ID，无法发送Offer');
      return;
    }
    
    // 创建SDP Offer
    log('创建SDP Offer...');
    const offer = await conn.createOffer();
    
    // 设置本地描述
    log('设置本地描述 (Offer)...');
    await conn.setLocalDescription(offer);
    
    // 等待完成ICE收集
    if (conn.iceGatheringState !== 'complete') {
      log('等待ICE候选收集完成...');
      await new Promise<void>(resolve => {
        const checkState = () => {
          if (conn.iceGatheringState === 'complete') {
            resolve();
          } else {
            setTimeout(checkState, 200);
          }
        };
        checkState();
      });
    }
    
    // 发送Offer到对方
    log('通过WebSocket发送Offer');
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('offer', { 
        sdp: conn.localDescription,
        sessionId: sid
      });
      log('Offer已发送');
    } else {
      log('WebSocket未连接，无法发送Offer');
      
      // 尝试重新连接WebSocket
      connectWebSocket(sid);
    }
  } catch (error) {
    log(`创建Offer失败: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// 接收Offer并创建Answer
const setRemoteOfferAndCreateAnswer = async (offer: RTCSessionDescriptionInit): Promise<boolean> => {
  try {
    log('WebRTC连接已创建，设置远程描述并发送Answer');
    
    // 确保有活跃的WebRTC连接
    if (!rtcConnectionRef.current) {
      log('初始化接收方WebRTC连接');
      initWebRTC(false);
    }
    
    const conn = rtcConnectionRef.current;
    if (!conn) {
      log('WebRTC连接不存在，无法处理Offer');
      return false;
    }
    
    // 设置远程描述(Offer)
    log('设置远程描述 (Offer)...');
    await conn.setRemoteDescription(new RTCSessionDescription(offer));
    log('信令状态: ' + conn.signalingState);
    log('远程描述设置成功');
    
    // 创建Answer
    log('创建SDP Answer...');
    const answer = await conn.createAnswer();
    
    // 设置本地描述(Answer)
    await conn.setLocalDescription(answer);
    log('信令状态: ' + conn.signalingState);
    log('本地描述设置成功 (Answer)');
    
    // 发送Answer
    if (socketRef.current && socketRef.current.connected) {
      log('通过WebSocket发送Answer');
      socketRef.current.emit('answer', { sdp: answer });
      log('Answer已发送');
    } else {
      log('WebSocket未连接，无法发送Answer');
    }
    
    return true;
  } catch (error) {
    log(`处理Offer错误: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
};
```

## 4. 数据通道和文件传输

```typescript
// 设置数据通道事件处理
const setupDataChannel = (dataChannel: RTCDataChannel) => {
  dataChannel.onopen = () => {
    log(`数据通道已打开: ${dataChannel.label}`);
    setChannel(dataChannel);
    updateConnectionDetails(localConnection, 'open');
    
    // 如果是发送方且有文件信息，发送文件信息
    const currentRole = localStorage.getItem('webrtcRole') || role;
    if (currentRole === 'sender' && fileInfo.length > 0) {
      log('数据通道已打开，立即发送文件信息...');
      
      // 延迟一点时间再发送，确保对方的监听器已经设置好
      setTimeout(() => {
        try {
          dataChannel.send(JSON.stringify({
            type: 'files_info',
            files: fileInfo
          }));
          log(`已发送 ${fileInfo.length} 个文件的信息到接收方`);
        } catch (error) {
          log(`发送文件信息失败: ${error instanceof Error ? error.message : String(error)}`);
        }
      }, 1000);
    }
  };
  
  dataChannel.onclose = () => {
    log('数据通道已关闭');
    setChannel(null);
    updateConnectionDetails(localConnection, 'closed');
  };
  
  dataChannel.onmessage = (event) => {
    // 尝试解析JSON消息
    try {
      const data = JSON.parse(event.data);
      
      if (data.type === 'file-confirm') {
        if (data.confirmed) {
          log('接收方已确认接收文件，开始传输...');
          sendAllFiles();
        } else {
          log('接收方拒绝接收文件');
        }
      } else if (data.type === 'files_info') {
        log(`通过数据通道收到文件信息: ${data.files.length} 个文件`);
        setFileInfo(data.files);
        setShowFileConfirm(true);
      } 
      // ... 其他消息类型处理
    } catch (error) {
      // 如果不是JSON，可能是二进制数据（文件块）
      if (event.data instanceof ArrayBuffer || event.data instanceof Blob) {
        processFileChunk(event.data);
      } else {
        log(`收到纯文本消息: ${event.data}`);
      }
    }
  };
};

// 发送文件
const sendFile = (file: File, fileIndex: number) => {
  if (!channel || channel.readyState !== 'open') {
    log('数据通道未打开，无法发送文件');
    return;
  }
  
  const fileId = fileInfo[fileIndex]?.id || `file_${Math.random().toString(36).substring(2, 10)}`;
  log(`开始发送文件: ${file.name}, 大小: ${formatBytes(file.size)}`);
  
  // 发送文件开始信息
  channel.send(JSON.stringify({
    type: 'file-start',
    fileId,
    name: file.name,
    size: file.size,
    type: file.type
  }));
  
  // 读取并分块发送文件
  let offset = 0;
  const chunkSize = 16 * 1024; // 16KB
  const reader = new FileReader();
  
  reader.onload = (e) => {
    if (e.target?.result) {
      // 发送数据块
      if (channel.readyState === 'open') {
        const data = e.target.result;
        
        if (data instanceof ArrayBuffer) {
          try {
            channel.send(data);
            
            // 更新进度
            offset += data.byteLength;
            const progress = Math.min(Math.round((offset / file.size) * 100), 100);
            setTransferProgress(prev => ({
              ...prev,
              [fileId]: progress
            }));
            
            // 继续读取下一块
            if (offset < file.size) {
              readNextChunk();
            } else {
              // 文件发送完成
              channel.send(JSON.stringify({
                type: 'file-end',
                fileId
              }));
              log(`文件发送完成: ${file.name}`);
              
              // 开始发送下一个文件
              if (fileIndex < selectedFiles.length - 1) {
                sendFile(selectedFiles[fileIndex + 1], fileIndex + 1);
              }
            }
          } catch (error) {
            log(`发送文件块失败: ${error instanceof Error ? error.message : String(error)}`);
          }
        } else {
          log('不支持的数据类型');
        }
      } else {
        log(`数据通道已关闭，无法发送文件`);
      }
    }
  };
  
  reader.onerror = (error) => {
    log(`读取文件错误: ${error}`);
  };
  
  // 读取文件块
  const readNextChunk = () => {
    const slice = file.slice(offset, offset + chunkSize);
    reader.readAsArrayBuffer(slice);
  };
  
  // 开始读取
  readNextChunk();
};

// 处理接收的文件块
const processFileChunk = (data: ArrayBuffer | Blob) => {
  // 确保有当前正在接收的文件
  if (!currentReceivingFile) {
    log('收到文件块，但没有正在接收的文件信息');
    return;
  }
  
  // 将数据转换为ArrayBuffer
  const processData = (arrayBuffer: ArrayBuffer) => {
    // 更新接收的数据
    currentFileChunks.push(arrayBuffer);
    currentReceivedBytes += arrayBuffer.byteLength;
    
    // 更新进度
    const progress = Math.min(Math.round((currentReceivedBytes / currentReceivingFile.size) * 100), 100);
    setReceivingFiles(prev => ({
      ...prev,
      [currentReceivingFile.id]: {
        ...prev[currentReceivingFile.id],
        progress,
        receivedBytes: currentReceivedBytes
      }
    }));
  };
  
  // 处理不同数据类型
  if (data instanceof ArrayBuffer) {
    processData(data);
  } else if (data instanceof Blob) {
    // 将Blob转换为ArrayBuffer
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result instanceof ArrayBuffer) {
        processData(e.target.result);
      }
    };
    reader.readAsArrayBuffer(data);
  }
};

// 处理文件下载
const downloadFile = (fileId: string) => {
  const fileData = receivingFiles[fileId];
  if (!fileData || !fileData.chunks || fileData.progress < 100) {
    log(`文件 ${fileId} 不存在或未接收完成`);
    return;
  }
  
  // 合并所有文件块
  const chunksArray = fileData.chunks;
  const blob = new Blob(chunksArray, { type: fileData.type || 'application/octet-stream' });
  
  // 创建下载链接
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileData.name;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  
  // 清理
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
  
  log(`文件下载完成: ${fileData.name}`);
};
```

## 5. 信令服务器实现

```javascript
// server/lib/socket.js

// 会话成员管理
const sessionMembers = new Map();

// 设置Socket.IO事件处理
io.on('connection', (socket) => {
  const { sessionId, deviceId } = socket.handshake.query;
  
  if (!sessionId || !deviceId) {
    socket.emit('error', { message: 'Missing sessionId or deviceId' });
    socket.disconnect();
    return;
  }
  
  console.log(`Device ${deviceId} connected to session ${sessionId}`);
  
  // 将设备添加到会话成员列表
  if (!sessionMembers.has(sessionId)) {
    sessionMembers.set(sessionId, new Map());
  }
  sessionMembers.get(sessionId).set(deviceId, socket.id);
  
  // 获取当前会话成员数量
  const membersCount = sessionMembers.get(sessionId).size;
  
  // 发送连接状态信息
  socket.emit('connection_status', {
    status: 'connected',
    message: '你已成功连接到信令服务器',
    sessionId,
    deviceId,
    roomMembers: membersCount
  });
  
  // 通知现有成员有新设备加入
  socket.to(Array.from(sessionMembers.get(sessionId).values()))
    .emit('peer', {
      event: 'joined',
      deviceId,
      sessionId
    });
  
  // 处理offer事件
  socket.on('offer', (data) => {
    console.log(`Received offer from ${deviceId}`);
    
    // 广播offer到会话中的其他成员
    for (const [memberId, socketId] of sessionMembers.get(sessionId).entries()) {
      if (memberId !== deviceId) {
        io.to(socketId).emit('offer', {
          sdp: data.sdp,
          from: deviceId
        });
      }
    }
  });
  
  // 处理answer事件
  socket.on('answer', (data) => {
    console.log(`Received answer from ${deviceId}`);
    
    // 广播answer到会话中的其他成员
    for (const [memberId, socketId] of sessionMembers.get(sessionId).entries()) {
      if (memberId !== deviceId) {
        io.to(socketId).emit('answer', {
          sdp: data.sdp,
          from: deviceId
        });
      }
    }
  });
  
  // 处理ICE候选
  socket.on('ice_candidate', (data) => {
    console.log(`Received ICE candidate from ${deviceId}`);
    
    // 广播ICE候选到会话中的其他成员
    for (const [memberId, socketId] of sessionMembers.get(sessionId).entries()) {
      if (memberId !== deviceId) {
        io.to(socketId).emit('ice_candidate', {
          candidate: data.candidate,
          from: deviceId
        });
      }
    }
  });
  
  // 处理连接请求
  socket.on('request_connection', (data) => {
    console.log(`Connection request from ${deviceId}`);
    
    // 广播连接请求到会话中的其他成员
    for (const [memberId, socketId] of sessionMembers.get(sessionId).entries()) {
      if (memberId !== deviceId) {
        io.to(socketId).emit('request_connection', {
          deviceId,
          sessionId
        });
      }
    }
  });
  
  // 处理文件信息
  socket.on('files_info', (data) => {
    console.log(`Files info from ${deviceId}: ${JSON.stringify(data).substring(0, 100)}...`);
    
    // 广播文件信息到会话中的其他成员
    for (const [memberId, socketId] of sessionMembers.get(sessionId).entries()) {
      if (memberId !== deviceId) {
        io.to(socketId).emit('files_info', data);
      }
    }
  });
  
  // 处理断开连接
  socket.on('disconnect', () => {
    console.log(`Device ${deviceId} disconnected from session ${sessionId}`);
    
    // 从会话成员列表中删除
    if (sessionMembers.has(sessionId)) {
      sessionMembers.get(sessionId).delete(deviceId);
      
      // 如果会话没有成员了，删除会话
      if (sessionMembers.get(sessionId).size === 0) {
        sessionMembers.delete(sessionId);
      } else {
        // 通知其他成员有设备离开
        for (const socketId of sessionMembers.get(sessionId).values()) {
          io.to(socketId).emit('peer', {
            event: 'left',
            deviceId,
            sessionId
          });
        }
      }
    }
  });
});
```

## 6. 会话管理API

```javascript
// server/api/session/create.js
export async function POST(request) {
  try {
    const data = await request.json();
    const { code, deviceInfo } = data;
    
    if (!code || !deviceInfo || !deviceInfo.id) {
      return Response.json({ error: 'Missing required data' }, { status: 400 });
    }
    
    // 生成会话ID
    const sessionId = generateSessionId();
    
    // 存储会话信息到数据库或内存
    sessions.set(code, {
      id: sessionId,
      code,
      createdAt: new Date(),
      creator: deviceInfo,
      members: [deviceInfo]
    });
    
    return Response.json({ sessionId });
  } catch (error) {
    console.error('Session creation error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// server/api/session/join.js
export async function POST(request) {
  try {
    const data = await request.json();
    const { code, deviceInfo } = data;
    
    if (!code || !deviceInfo || !deviceInfo.id) {
      return Response.json({ error: 'Missing required data' }, { status: 400 });
    }
    
    // 查找会话
    const session = sessions.get(code);
    if (!session) {
      return Response.json({ error: 'Session not found' }, { status: 404 });
    }
    
    // 添加成员到会话
    session.members.push(deviceInfo);
    
    return Response.json({ 
      sessionId: session.id,
      creator: session.creator
    });
  } catch (error) {
    console.error('Session join error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

更多详细的实现代码可参考项目源代码，本文档仅提供关键部分的代码示例以帮助理解。 