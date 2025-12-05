# InkFlow Server

InkFlow AI 小说创作助手的后端服务。

## 功能特性

- ✅ API Key 安全管理（后端存储，前端不可见）
- ✅ API Key 池轮换机制
- ✅ 并发任务调度
- ✅ 任务队列管理
- ✅ 实时任务进度推送
- ✅ 管理后台界面

## 快速开始

### 1. 安装依赖

```bash
cd server
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env`，并配置您的 Gemini API Keys：

```bash
cp .env.example .env
```

编辑 `.env` 文件，添加您的 API Keys：

```
GEMINI_API_KEYS=your-api-key-1,your-api-key-2,your-api-key-3
```

### 3. 启动服务器

开发模式（自动重启）：

```bash
npm run dev
```

生产模式：

```bash
npm start
```

## API 端点

### 健康检查

```
GET /health
```

### API 信息

```
GET /api/info
```

## 目录结构

```
server/
├── src/
│   ├── index.js           # 服务器入口
│   ├── routes/            # 路由定义
│   ├── controllers/       # 控制器
│   ├── services/          # 业务逻辑
│   ├── models/            # 数据模型
│   ├── middleware/        # 中间件
│   ├── utils/             # 工具函数
│   └── config/            # 配置文件
├── data/                  # 数据库文件
├── .env                   # 环境变量（不提交）
├── .env.example           # 环境变量模板
└── package.json           # 项目配置
```

## 开发者

InkFlow Team

## 许可证

MIT
