
# InkFlow AI - 智能小说创作套件 (Novelist Suite)

**InkFlow AI** 是一款专为网络小说作者打造的本地优先（Local-First）智能创作系统。它深度集成了 Google Gemini API，提供从市场趋势分析、灵感爆发、结构设计到正文辅助写作的全流程支持。

## 🛠 技术栈与开发环境

### 核心技术
*   **开发语言**: TypeScript (v5.x)
*   **前端框架**: React 19
*   **构建工具**: Vite
*   **样式方案**: Tailwind CSS
*   **AI 模型库**: `@google/genai` (Google Gemini SDK)
*   **状态管理**: React Context API + Hooks
*   **数据持久化**: Browser LocalStorage (无后端架构)
*   **可视化**: D3.js (思维导图), Recharts (数据图表)

### 开发环境要求
*   **Node.js**: v18.0.0 或更高版本
*   **包管理器**: npm 或 yarn
*   **API Key**: 需要有效的 Google AI Studio API Key (支持 Gemini 2.5/3.0 模型)

## 📂 项目结构说明

```text
/
├── components/         # 通用 UI 组件
│   ├── Layout.tsx      # 应用主布局框架
│   ├── MindMap.tsx     # D3.js 思维导图组件
│   ├── TaskMonitor.tsx # 全局后台任务监控器
│   └── ...
├── contexts/           # 全局状态管理
│   └── AppContext.tsx  # 核心状态 (设置, 任务队列, 全局数据)
├── pages/              # 路由页面模块
│   ├── Dashboard.tsx   # 仪表盘 (数据分析)
│   ├── Studio.tsx      # 写作工作室 (核心功能)
│   ├── Architect.tsx   # 故事架构师 (大纲设计)
│   ├── Market.tsx      # 市场拆解
│   ├── Workflow.tsx    # 自动化工作流
│   └── ...
├── services/           # 业务逻辑服务层
│   ├── geminiService.ts # Google Gemini API 交互核心
│   ├── storageService.ts # 本地存储封装
│   └── logger.ts       # 系统日志服务
├── types.ts            # TypeScript 类型定义 (核心数据模型)
├── i18n.tsx            # 国际化配置
├── index.tsx           # 应用入口
└── App.tsx             # 根组件与路由分发
```

## 🌟 核心功能模块

### 1. 写作工作室 (Studio)
核心创作界面。采用 **"8-图架构体系" (8-Map Architecture)**，将小说结构化为世界观、角色、剧情等 8 个维度的思维导图。AI 在生成正文时会自动检索这些导图作为上下文，保证长篇连载的逻辑一致性。

### 2. 故事架构师 (Architect)
专注于大纲设计的模块。支持递归式的内容扩展（如：从“书名”生成“分卷”，再生成“章节”，最后生成“场景”）。

### 3. 市场与实验室 (Market & Lab)
通过模拟爬虫数据分析市场热点。实验室功能支持输入任意小说片段，AI 将分析其“爆款因子”、“节奏密度”和“角色弧光”。

### 4. 任务监控台 (Task Monitor)
实时监控所有后台 AI 任务的状态。
- **Token 消耗统计**: 详细展示输入 (Input) 和输出 (Output) 的 Token 数量，帮助优化成本。
- **错误诊断**: 捕获 API 错误详情，区分网络超时、配额不足或内容拦截，并提供原始错误日志。
- **调试模式**: 可查看发送给 AI 的完整 Prompt、System Instruction 和上下文数据。
- **自动重试 (Retry)**: 针对失败任务，提供一键重试功能，并对网络超时进行自动优化。

### 5. 自动化工作流 (Workflow)
实验性功能。允许用户输入一个核心创意，系统自动完成从大纲设计到分章撰写的全自动化流程。

## 🚀 快速开始

1.  **安装依赖**:
    ```bash
    npm install
    ```
2.  **启动开发服**:
    ```bash
    npm start
    ```
3.  **配置密钥**:
    项目启动后，系统会自动读取环境变量中的 `API_KEY`。在生产环境中，请确保构建环境包含此变量。

---
**开发者**: InkFlow Team
**版本**: v1.7.6
**许可证**: MIT
