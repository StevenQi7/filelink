# FileLink - 跨平台文件传输应用

FileLink是一款支持全平台的文件传输应用，提供局域网和公网两种传输模式，致力于实现安全、快速、便捷的文件传输体验。无论是局域网内设备之间的文件互传，还是远程跨网络的文件共享，FileLink都能提供简单高效的解决方案。

![FileLink Logo](https://via.placeholder.com/800x400?text=FileLink+App)

## 📋 目录

- [产品特点](#产品特点)
- [支持平台](#支持平台)
- [项目结构](#项目结构)
- [功能演示](#功能演示)
- [安装指南](#安装指南)
- [开发指南](#开发指南)
- [原型设计](#原型设计)
- [未来规划](#未来规划)
- [许可协议](#许可协议)

## 🌟 产品特点

- **双模式传输**：支持局域网直连和公网传输两种模式
- **无需注册**：使用即传，无需账号注册和登录
- **安全传输**：端到端加密，保障数据传输安全
- **跨平台支持**：Windows、macOS、Linux、iOS、Android全平台支持
- **简洁界面**：直观易用的操作界面，极简操作流程
- **高速传输**：优化的传输协议，局域网内接近网卡极限速度
- **断点续传**：支持传输中断后继续传输，无需重新开始

## 💻 支持平台

- **桌面端**：Windows、macOS、Linux
- **移动端**：iOS、Android
- **Web端**：主流浏览器支持

## 📁 项目结构

```
FileLink/
├── desktop/             # 桌面端应用
│   ├── css/             # 桌面端样式
│   ├── js/              # 桌面端脚本
│   ├── pages/           # 桌面端页面
│   └── index.html       # 桌面端入口
│
├── mobile/              # 移动端应用
│   ├── css/             # 移动端样式
│   ├── js/              # 移动端脚本
│   ├── pages/           # 移动端页面
│   └── index.html       # 移动端入口
│
├── js/                  # 公共JavaScript脚本
├── css/                 # 公共样式文件
├── pages/               # 公共页面文件
│
├── Prototypes/          # 界面原型设计文件
│   ├── Desktop/         # 桌面端原型
│   └── Mobile/          # 移动端原型
│
├── index.html           # 项目主入口
└── requirements.md      # 需求文档
```

## 🚀 功能演示

### 局域网传输

1. 打开应用，自动扫描同一局域网内的设备
2. 选择目标设备，点击"发送文件"
3. 选择要传输的文件或文件夹
4. 接收方确认接收
5. 开始传输并显示实时进度

### 公网传输

1. 点击"创建连接"或在未选择设备的情况下点击"发送文件"
2. 生成6位连接密码
3. 分享密码给接收方
4. 接收方输入密码建立连接
5. 选择要传输的文件
6. 开始传输并显示实时进度

## 📥 安装指南

目前项目处于原型阶段，可以通过以下方式预览：

1. 克隆仓库：
   ```
   git clone https://github.com/yourusername/filelink.git
   ```

2. 打开项目主页：
   ```
   cd filelink
   open index.html
   ```

3. 选择移动端或桌面端进行预览

## 👨‍💻 开发指南

### 环境要求

- 现代浏览器（Chrome、Firefox、Safari、Edge等）
- 支持ES6+的JavaScript环境

### 本地开发

1. 修改HTML、CSS或JavaScript文件
2. 在浏览器中打开相应页面查看效果
3. 使用浏览器开发者工具进行调试

## 🎨 原型设计

项目包含完整的界面原型设计，位于`Prototypes`文件夹：

- **桌面端原型**：`Prototypes/Desktop/`目录下的文件
- **移动端原型**：`Prototypes/Mobile/`目录下的文件

可以直接在浏览器中打开这些HTML文件查看和交互原型设计。

## 🔮 未来规划

- **群组传输**：支持同时向多个设备发送文件
- **远程文件管理**：在设备间远程浏览和管理文件
- **传输历史**：记录和管理历史传输记录
- **智能分类**：自动对传输文件进行分类和管理
- **云端备份**：可选的云端备份和同步功能

## 📄 许可协议

本项目采用 [MIT 许可证](LICENSE)。

# FileLink 信令服务器

这是一个基于 WebRTC 的 FileLink 应用的信令服务器，用于支持设备间的文件传输。

## 功能特性

- 会话管理：创建、加入、维护和关闭传输会话
- WebRTC 信令：支持 SDP 交换和 ICE 候选传递
- 文件传输状态同步：跟踪文件传输进度
- WebSocket 实时通信：设备间的实时状态更新

## 技术栈

- Node.js
- Next.js：服务端渲染框架
- Express：HTTP 服务器
- Socket.IO：WebSocket 通信
- 自定义会话和信令处理

## 安装

```bash
# 克隆仓库
git clone https://github.com/your-username/filelink.git
cd filelink/server

# 安装依赖
npm install
```

## 配置

在项目根目录创建 `.env` 文件:

```
PORT=3000
NODE_ENV=development
SESSION_TIMEOUT=600000  # 会话超时时间（毫秒）
```

## 运行

```bash
# 开发模式
npm run dev

# 生产模式
npm run build
npm start
```

服务将在 http://localhost:3000 （或环境变量中配置的端口）上启动。

## API 端点

### 会话管理

- `POST /api/session/create` - 创建新的传输会话
- `POST /api/session/join` - 加入现有会话
- `POST /api/session/{sessionId}/heartbeat` - 保持会话活跃
- `POST /api/session/{sessionId}/close` - 关闭会话

### WebRTC 信令

- `POST /api/session/{sessionId}/offer` - 发送 SDP 提议
- `POST /api/session/{sessionId}/answer` - 发送 SDP 应答
- `POST /api/session/{sessionId}/ice-candidate` - 发送 ICE 候选

### 文件传输

- `POST /api/session/{sessionId}/files` - 同步文件信息
- `POST /api/session/{sessionId}/transfer-status` - 更新传输状态

### WebSocket

- `ws://[host]/ws` - WebSocket 连接地址（需要 `sessionId` 和 `deviceId` 查询参数）

## 测试页面

访问 http://localhost:3000/test.html 可以打开测试页面，用于验证服务器功能。

## 部署

服务器可以部署到任何支持 Node.js 的环境，如 Vercel、Heroku、AWS 或自托管服务器。

确保配置正确的环境变量，特别是在生产环境中。

## 许可证

MIT
