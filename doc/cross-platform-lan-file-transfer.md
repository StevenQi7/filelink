# 跨平台局域网文件传输方案设计

## 背景

当前的MultipeerConnectivity框架在iOS平台上存在不稳定问题，特别是在传输大文件时会出现"Not in connected state"错误。同时，需要支持iOS、Android和Web平台间的互相发现和文件传输功能。

## 技术选型

### 服务发现

| 平台 | 技术方案 | 说明 |
|------|---------|------|
| iOS | Network框架 (NWBrowser) | 替代MultipeerConnectivity，使用Bonjour/mDNS服务 |
| Android | NSD (Network Service Discovery) | Android原生的mDNS服务发现 |
| Web | mDNS.js或Web版Bonjour | JavaScript库，实现mDNS服务发现 |

### 文件传输

使用HTTP/WebSocket协议作为统一的传输层：
- 每个设备同时作为服务器和客户端
- 服务器用于接收文件
- 客户端用于发送文件

| 平台 | 服务器实现 | 客户端实现 |
|------|----------|----------|
| iOS | GCDWebServer或内置HTTP服务器 | URLSession |
| Android | NanoHTTPD或Ktor | OkHttp或Retrofit |
| Web | Node.js服务器(后端)或WebRTC(前端) | Fetch API或Axios |

## 详细架构

### 1. 设备发现流程

1. 应用启动时：
   - 启动本地HTTP服务器(随机端口或固定端口)
   - 通过mDNS注册服务(`_filelink._tcp`)
   - 服务数据包含设备名称、平台类型、支持的功能

2. 发现其他设备：
   - 搜索局域网中的`_filelink._tcp`服务
   - 解析服务信息，获取HTTP服务器地址
   - 建立设备列表，显示给用户

### 2. 连接建立流程

1. 用户选择目标设备后：
   - 向目标设备的HTTP服务器发送连接请求
   - 目标设备接收到请求后，通知用户接受或拒绝
   - 接受后建立WebSocket连接或保持HTTP连接状态

### 3. 文件传输流程

采用分块传输策略：

1. 发送端：
   - 读取文件元数据(名称、大小、类型等)
   - 将文件分割成固定大小的块(如1MB)
   - 逐块发送，每块包含块索引、总块数等信息
   - 所有块发送完毕后，发送完成标记

2. 接收端：
   - 接收文件元数据，创建临时文件
   - 接收数据块，按顺序写入临时文件
   - 接收完成后，验证文件完整性
   - 将临时文件移动到目标位置

### 4. 错误处理与恢复

1. 连接中断：
   - 定期发送心跳包检测连接状态
   - 断开后尝试自动重连
   - 支持断点续传

2. 传输错误：
   - 每个块带有校验和
   - 出错后可请求重传特定块
   - 设置超时机制与重试策略

## 平台实现细节

### iOS实现

#### 1. 网络服务架构

iOS端采用双模式网络服务架构：
- 局域网模式：使用Network框架(NWBrowser/NWListener)实现设备发现和直接连接
- 公网模式：使用WebRTC实现P2P连接，通过信令服务器辅助建立连接

```swift
// 网络服务管理器
class NetworkServiceManager {
    enum NetworkMode {
        case lan    // 局域网模式
        case webrtc // 公网模式
    }
    
    private var lanService: LANService?
    private var webRTCService: WebRTCService?
    private var currentMode: NetworkMode = .lan
    
    func startService(mode: NetworkMode) {
        currentMode = mode
        switch mode {
        case .lan:
            lanService = LANService()
            lanService?.start()
        case .webrtc:
            webRTCService = WebRTCService()
            webRTCService?.connect()
        }
    }
}
```

#### 2. 局域网实现

##### 2.1 服务发现与注册

```swift
class LANService {
    private var browser: NWBrowser?
    private var listener: NWListener?
    private var connections: [NWConnection] = []
    private let queue = DispatchQueue(label: "com.filelink.lan")
    
    // 服务类型定义
    private let serviceType = "_filelink._tcp"
    private let serviceDomain = "local"
    
    func start() {
        startAdvertising()
        startBrowsing()
    }
    
    private func startAdvertising() {
        let parameters = NWParameters()
        parameters.includePeerToPeer = true
        
        // 添加TXT记录
        let txtRecord = ["platform": "ios",
                        "device": UIDevice.current.name,
                        "version": "1.0"]
        
        do {
            listener = try NWListener(using: parameters)
            listener?.service = NWListener.Service(name: UIDevice.current.name,
                                                type: serviceType,
                                                domain: serviceDomain,
                                                txtRecord: txtRecord)
            
            listener?.stateUpdateHandler = { [weak self] state in
                self?.handleListenerState(state)
            }
            
            listener?.newConnectionHandler = { [weak self] connection in
                self?.handleNewConnection(connection)
            }
            
            listener?.start(queue: queue)
        } catch {
            print("Failed to create listener: \(error)")
        }
    }
    
    private func startBrowsing() {
        let parameters = NWParameters()
        parameters.includePeerToPeer = true
        
        let browser = NWBrowser(for: .bonjour(type: serviceType, domain: serviceDomain),
                              using: parameters)
        
        browser.stateUpdateHandler = { [weak self] state in
            self?.handleBrowserState(state)
        }
        
        browser.browseResultsChangedHandler = { [weak self] results, changes in
            self?.handleBrowserResults(results)
        }
        
        browser.start(queue: queue)
        self.browser = browser
    }
}
```

##### 2.2 文件传输服务

```swift
class FileTransferService {
    enum TransferError: Error {
        case invalidFile
        case transferFailed
        case connectionLost
    }
    
    // 文件发送
    func sendFile(_ fileURL: URL, to peer: Peer) async throws {
        guard let fileData = try? Data(contentsOf: fileURL) else {
            throw TransferError.invalidFile
        }
        
        // 准备文件元数据
        let metadata = FileMetadata(
            name: fileURL.lastPathComponent,
            size: fileData.count,
            type: fileURL.pathExtension,
            timestamp: Date()
        )
        
        // 分块传输
        let chunkSize = 32768 // 32KB
        let chunks = fileData.chunks(ofSize: chunkSize)
        
        for (index, chunk) in chunks.enumerated() {
            let packet = FilePacket(
                metadata: index == 0 ? metadata : nil,
                chunkIndex: index,
                totalChunks: chunks.count,
                data: chunk
            )
            
            try await send(packet, to: peer)
        }
    }
    
    // 文件接收
    private var receivingFiles: [String: FileReceiver] = [:]
    
    func handleIncomingPacket(_ packet: FilePacket, from peer: Peer) {
        let fileId = "\(peer.id)-\(packet.metadata?.name ?? "")"
        
        if let metadata = packet.metadata {
            // 新文件传输开始
            receivingFiles[fileId] = FileReceiver(metadata: metadata)
        }
        
        guard let receiver = receivingFiles[fileId] else { return }
        receiver.receiveChunk(packet.data, at: packet.chunkIndex)
        
        if receiver.isComplete {
            receiver.saveFile()
            receivingFiles.removeValue(forKey: fileId)
        }
    }
}
```

#### 3. WebRTC实现

##### 3.1 信令服务连接

```swift
class WebRTCService {
    private var webRTCClient: WebRTCClient?
    private var signalClient: SignalingClient?
    
    func connect() {
        // 连接信令服务器
        signalClient = SignalingClient(url: Configuration.signalingServerURL)
        signalClient?.connect()
        
        // 创建WebRTC客户端
        webRTCClient = WebRTCClient(iceServers: Configuration.defaultIceServers)
        webRTCClient?.delegate = self
        
        // 设置信令回调
        signalClient?.onSignal = { [weak self] signal in
            self?.handleSignal(signal)
        }
    }
}

extension WebRTCService: WebRTCClientDelegate {
    func webRTCClient(_ client: WebRTCClient, didDiscoverLocalCandidate candidate: RTCIceCandidate) {
        // 发送ICE候选到对等端
        signalClient?.send(candidate: candidate)
    }
    
    func webRTCClient(_ client: WebRTCClient, didChangeConnectionState state: RTCIceConnectionState) {
        // 处理连接状态变化
        switch state {
        case .connected:
            print("WebRTC Connected")
        case .disconnected, .failed:
            print("WebRTC Connection lost")
        default:
            break
        }
    }
}
```

##### 3.2 WebRTC文件传输

```swift
class WebRTCFileTransfer {
    private var dataChannel: RTCDataChannel?
    private let webRTCClient: WebRTCClient
    
    init(webRTCClient: WebRTCClient) {
        self.webRTCClient = webRTCClient
        setupDataChannel()
    }
    
    private func setupDataChannel() {
        let config = RTCDataChannelConfiguration()
        config.isOrdered = true
        
        dataChannel = webRTCClient.createDataChannel(
            "fileTransfer",
            configuration: config
        )
        
        dataChannel?.delegate = self
    }
    
    // 发送文件
    func sendFile(_ fileURL: URL) async throws {
        guard let channel = dataChannel, channel.readyState == .open else {
            throw TransferError.connectionLost
        }
        
        // 读取文件
        guard let fileData = try? Data(contentsOf: fileURL) else {
            throw TransferError.invalidFile
        }
        
        // 发送文件元数据
        let metadata = FileMetadata(
            name: fileURL.lastPathComponent,
            size: fileData.count,
            type: fileURL.pathExtension,
            timestamp: Date()
        )
        
        let metadataPacket = FilePacket(
            metadata: metadata,
            chunkIndex: 0,
            totalChunks: 0,
            data: Data()
        )
        
        try await send(metadataPacket)
        
        // 分块发送文件数据
        let chunks = fileData.chunks(ofSize: 16384) // 16KB chunks
        for (index, chunk) in chunks.enumerated() {
            let packet = FilePacket(
                metadata: nil,
                chunkIndex: index,
                totalChunks: chunks.count,
                data: chunk
            )
            try await send(packet)
        }
    }
}

extension WebRTCFileTransfer: RTCDataChannelDelegate {
    func dataChannelDidChangeState(_ dataChannel: RTCDataChannel) {
        print("DataChannel state changed: \(dataChannel.readyState)")
    }
    
    func dataChannel(_ dataChannel: RTCDataChannel, didReceiveMessageWith buffer: RTCDataBuffer) {
        // 处理接收到的数据
        handleIncomingData(buffer.data)
    }
}
```

#### 4. 数据模型

```swift
struct FileMetadata: Codable {
    let name: String
    let size: Int
    let type: String
    let timestamp: Date
}

struct FilePacket: Codable {
    let metadata: FileMetadata?
    let chunkIndex: Int
    let totalChunks: Int
    let data: Data
}

struct Peer: Identifiable {
    let id: String
    let name: String
    let platform: String
    let address: String
    let port: Int
}

class FileReceiver {
    private let metadata: FileMetadata
    private var receivedChunks: [Int: Data] = [:]
    private let fileManager = FileManager.default
    
    var isComplete: Bool {
        // 检查是否所有分块都已接收
        true
    }
    
    init(metadata: FileMetadata) {
        self.metadata = metadata
    }
    
    func receiveChunk(_ data: Data, at index: Int) {
        receivedChunks[index] = data
    }
    
    func saveFile() {
        // 将接收到的文件保存到本地
    }
}
```

#### 5. 配置与工具

```swift
struct Configuration {
    static let signalingServerURL = URL(string: "wss://your-signaling-server.com")!
    
    static let defaultIceServers = [
        "stun:stun.l.google.com:19302",
        "stun:stun1.l.google.com:19302"
    ]
}

extension Data {
    func chunks(ofSize size: Int) -> [Data] {
        var chunks: [Data] = []
        var offset = 0
        
        while offset < count {
            let chunkSize = Swift.min(size, count - offset)
            let chunk = self[offset..<offset + chunkSize]
            chunks.append(chunk)
            offset += chunkSize
        }
        
        return chunks
    }
}
```

### Android实现

```kotlin
// 服务发现示例
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo

class LANDiscoveryService(context: Context) {
    private val nsdManager = context.getSystemService(Context.NSD_SERVICE) as NsdManager
    private val serviceName = "FileLink"
    private val serviceType = "_filelink._tcp."
    
    fun discoverServices() {
        val discoveryListener = object : NsdManager.DiscoveryListener {
            override fun onDiscoveryStarted(serviceType: String) {
                println("Discovery started")
            }
            
            override fun onServiceFound(serviceInfo: NsdServiceInfo) {
                println("Service found: ${serviceInfo.serviceName}")
                nsdManager.resolveService(serviceInfo, object : NsdManager.ResolveListener {
                    override fun onResolveFailed(serviceInfo: NsdServiceInfo, errorCode: Int) {
                        println("Resolve failed: $errorCode")
                    }
                    
                    override fun onServiceResolved(serviceInfo: NsdServiceInfo) {
                        println("Resolved: ${serviceInfo.host}:${serviceInfo.port}")
                        // 连接到服务
                    }
                })
            }
            
            // 其他必要的回调方法...
        }
        
        nsdManager.discoverServices(serviceType, NsdManager.PROTOCOL_DNS_SD, discoveryListener)
    }
    
    fun registerService(port: Int) {
        val serviceInfo = NsdServiceInfo().apply {
            serviceName = this@LANDiscoveryService.serviceName
            serviceType = this@LANDiscoveryService.serviceType
            port = port
        }
        
        val registrationListener = object : NsdManager.RegistrationListener {
            override fun onServiceRegistered(serviceInfo: NsdServiceInfo) {
                println("Service registered: ${serviceInfo.serviceName}")
            }
            
            override fun onRegistrationFailed(serviceInfo: NsdServiceInfo, errorCode: Int) {
                println("Registration failed: $errorCode")
            }
            
            // 其他必要的回调方法...
        }
        
        nsdManager.registerService(serviceInfo, NsdManager.PROTOCOL_DNS_SD, registrationListener)
    }
}

// 文件传输示例
fun sendFile(file: File, serverUrl: String) {
    val client = OkHttpClient()
    
    val requestBody = MultipartBody.Builder()
        .setType(MultipartBody.FORM)
        .addFormDataPart(
            "file", file.name,
            file.asRequestBody("application/octet-stream".toMediaType())
        )
        .build()
    
    val request = Request.Builder()
        .url(serverUrl)
        .post(requestBody)
        .build()
    
    client.newCall(request).execute().use { response ->
        if (!response.isSuccessful) {
            throw IOException("Unexpected response $response")
        }
        println("File sent successfully")
    }
}
```

### Web实现

```javascript
// 使用WebRTC进行P2P连接和文件传输
// 注: 需要信令服务器来帮助建立连接

// 连接建立
const pc = new RTCPeerConnection();

// 发送数据通道
const sendChannel = pc.createDataChannel("fileTransfer");
sendChannel.onopen = () => {
  console.log("Data channel open");
  // 可以开始传输文件
};

// 接收数据通道
pc.ondatachannel = (event) => {
  const receiveChannel = event.channel;
  receiveChannel.onmessage = (event) => {
    // 处理接收到的数据
    console.log("Received message:", event.data);
  };
};

// 发送文件示例
async function sendFile(file) {
  const chunkSize = 16384; // 16KB 块大小
  const fileReader = new FileReader();
  let offset = 0;
  
  // 发送文件元数据
  const metadata = {
    name: file.name,
    type: file.type,
    size: file.size,
    totalChunks: Math.ceil(file.size / chunkSize)
  };
  sendChannel.send(JSON.stringify({ type: "metadata", data: metadata }));
  
  // 分块读取和发送文件
  fileReader.onload = (e) => {
    console.log(`Sending chunk: ${offset/chunkSize + 1}/${metadata.totalChunks}`);
    sendChannel.send(e.target.result);
    offset += e.target.result.byteLength;
    
    if (offset < file.size) {
      readChunk();
    } else {
      // 文件发送完成
      sendChannel.send(JSON.stringify({ type: "complete" }));
    }
  };
  
  const readChunk = () => {
    const slice = file.slice(offset, offset + chunkSize);
    fileReader.readAsArrayBuffer(slice);
  };
  
  readChunk();
}
```

## 兼容性和限制

1. iOS限制：
   - 后台运行受限
   - 需要适当权限(本地网络权限)

2. Android限制：
   - 不同版本的NSD行为可能不同
   - 需要网络权限

3. Web限制：
   - 需要HTTPS环境才能使用某些API
   - WebRTC需要信令服务器
   - mDNS直接访问需要特殊权限

## 优化建议

1. 传输效率：
   - 使用WebSocket而非HTTP长轮询
   - 考虑压缩大文件
   - 动态调整块大小

2. 用户体验：
   - 提供传输进度显示
   - 支持多文件队列传输
   - 保存常用设备列表

3. 安全性：
   - 考虑添加端到端加密
   - 实现设备认证机制
   - 传输前后验证文件完整性

## 实施路线图

1. 第一阶段：iOS实现
   - 替换MultipeerConnectivity，改用Network框架
   - 实现基本HTTP服务器
   - 测试iOS设备间传输

2. 第二阶段：Android实现
   - 实现Android版服务发现
   - 实现文件传输功能
   - 测试Android与iOS互通

3. 第三阶段：Web实现
   - 实现Web版发现与传输
   - 测试所有平台互通

4. 第四阶段：优化
   - 添加更多功能
   - 提高稳定性
   - 完善用户体验

## 可扩展功能

1. 多文件传输和文件夹传输
2. 文本和剪贴板内容直接共享
3. 设备分组和权限管理
4. 传输历史记录和重传功能
5. 内容预览和筛选 