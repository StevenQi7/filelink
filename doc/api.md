# FileLink API 文档

## 概述

FileLink 是一个基于 WebRTC 的安全文件传输系统，支持点对点传输和中继传输。本文档描述了系统的 API 接口和使用方法。

## 会话 ID 格式

会话 ID 采用 6 位字母和数字的组合，例如：`A1B2C3`。

## WebSocket 信令服务器

### 连接信息

- 开发环境：`ws://localhost:8001`
- 生产环境：`wss://your-domain.com/ws`

### 消息类型

#### 客户端到服务器 (CPKT)

| 类型 | 值 | 说明 |
|-----|-----|-----|
| LOGIN | 0 | 登录请求 |
| OFFER | 1 | WebRTC offer |
| ANSWER | 2 | WebRTC answer |
| CANDIDATE | 3 | ICE candidate |
| RELAY | 4 | 中继数据 |
| SWITCH_TO_FALLBACK | 5 | 切换到中继模式 |
| SWITCH_TO_FALLBACK_ACK | 6 | 确认切换到中继模式 |
| P2P_FAILED | 7 | P2P 连接失败 |

#### 服务器到客户端 (SPKT)

| 类型 | 值 | 说明 |
|-----|-----|-----|
| OFFER | 11 | WebRTC offer |
| ANSWER | 12 | WebRTC answer |
| CANDIDATE | 13 | ICE candidate |
| RELAY | 14 | 中继数据 |
| SWITCH_TO_FALLBACK | 15 | 切换到中继模式 |
| SWITCH_TO_FALLBACK_ACK | 16 | 确认切换到中继模式 |
| P2P_FAILED | 17 | P2P 连接失败 |
| RELAY_BUDGET | 99 | 中继数据包预算 |

## 客户端 API

### 创建会话

```javascript
const session = await FileLink.createSession({
  onProgress: (progress) => {
    console.log(`传输进度: ${progress}%`);
  },
  onFileList: (files) => {
    console.log('文件列表:', files);
  }
});

// 获取分享链接
const shareLink = session.getShareLink();
```

### 加入会话

```javascript
const session = await FileLink.joinSession(shareLink, {
  onProgress: (progress) => {
    console.log(`传输进度: ${progress}%`);
  },
  onFileList: (files) => {
    console.log('文件列表:', files);
  }
});
```

### 发送文件

```javascript
// 单个文件
await session.sendFile(file);

// 多个文件
await session.sendFiles([file1, file2, file3]);
```

### 接收文件

```javascript
session.onFileReceived = (file) => {
  // 处理接收到的文件
  console.log('收到文件:', file.name);
};
```

## 加密说明

系统使用 AES-GCM 256位加密，每个会话使用唯一的加密密钥。密钥通过分享链接安全传输。

## 错误处理

所有 API 调用都可能抛出以下错误：

- `ConnectionError`: 连接失败
- `SessionError`: 会话错误
- `TransferError`: 传输错误
- `EncryptionError`: 加密错误

## 移动端接入指南

### Android

1. 使用 WebRTC Android SDK
2. 实现 WebSocket 客户端
3. 使用 Crypto 库进行加密

### iOS

1. 使用 WebRTC iOS SDK
2. 实现 WebSocket 客户端
3. 使用 CryptoKit 进行加密

## 示例代码

### Android 示例

```kotlin
// 创建会话
val session = FileLink.createSession(
    onProgress = { progress -> 
        Log.d("FileLink", "Progress: $progress%")
    },
    onFileList = { files ->
        Log.d("FileLink", "Files: $files")
    }
)

// 获取分享链接
val shareLink = session.getShareLink()

// 发送文件
session.sendFile(file)
```

### iOS 示例

```swift
// 创建会话
let session = try await FileLink.createSession(
    onProgress: { progress in
        print("Progress: \(progress)%")
    },
    onFileList: { files in
        print("Files: \(files)")
    }
)

// 获取分享链接
let shareLink = session.getShareLink()

// 发送文件
try await session.sendFile(file)
``` 