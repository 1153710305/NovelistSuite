
# InkFlow AI - 个人小说生成系统

InkFlow AI 是一款专为网络小说创作者打造的轻量级、本地化优先的智能辅助系统。利用 Google Gemini 强大的模型能力，提供市场趋势分析、爆款拆解、每日灵感生成、大纲设计及正文辅助写作等全流程支持。

## 🌟 核心特性

1.  **仪表盘 (Dashboard)**
    *   实时聚合中国主流小说平台（起点、番茄、晋江等）的流派热度指数。
    *   追踪各大社交媒体（抖音、B站、微博）的热门梗和话题。
    *   可视化展示平台流量份额。

2.  **市场趋势 (Market)**
    *   模拟榜单查看，支持按分类筛选。
    *   一键拆解榜单爆款小说。

3.  **拆书实验室 (Lab) - [后台异步运行]**
    *   **爆款因子分析**：识别黄金三章、爽点、期待感。
    *   **节奏分析**：检测情节推进速度。
    *   **角色分析**：剖析人物动机与性格弧光。
    *   *支持后台挂机分析，页面切换不中断。*

4.  **写作工作室 (Studio) - [后台异步运行]**
    *   **每日灵感**：结合今日热点，AI 自动生成 10 个短篇脑洞。
    *   **AI 工具箱**：续写、改写（画面感增强）、润色功能。
    *   *支持后台生成，您可以边看报表边等结果。*

5.  **故事架构师 (Architect) - [后台异步运行]**
    *   **思维导图**：输入一句话脑洞，AI 自动生成“书-卷-章”三级可视化大纲。
    *   **正文生成**：点击大纲节点，直接生成对应章节草稿。
    *   *大纲生成支持后台运行。*

6.  **本地化与隐私**
    *   **纯中文优化**：界面、提示词、数据源均针对中文语境优化。
    *   **本地存储**：大纲、草稿、历史记录均保存在浏览器 LocalStorage，保护您的创意隐私。

---

## 🛠 技术栈

*   **前端框架**: React 19 + TypeScript
*   **构建工具**: Vite
*   **UI 库**: Tailwind CSS, Lucide React
*   **可视化**: Recharts (图表), D3.js (思维导图)
*   **AI SDK**: Google GenAI SDK (Gemini)

---

## 💻 环境准备与安装指南

### 0. 前置要求
无论您使用何种操作系统，请确保您的电脑已安装以下环境：
*   **Node.js**: 推荐 v18.0.0 或更高版本 (LTS 版本最佳)。
    *   *验证*: 终端输入 `node -v`
*   **Git**: 用于克隆项目代码。
    *   *验证*: 终端输入 `git --version`
*   **Gemini API Key**: 您需要一个 Google AI Studio 的 API 密钥。

---

### 🐧 Linux / 🍎 macOS 安装部署

**1. 获取代码**
打开终端 (Terminal)，运行以下命令：
```bash
# 克隆仓库
git clone https://github.com/your-username/inkflow-ai.git

# 进入项目目录
cd inkflow-ai
```

**2. 安装依赖**
```bash
npm install
```

**3. 配置环境变量 (API Key)**
你有两种方式配置 API Key：

*   **方式 A: 创建 .env 文件 (推荐)**
    在项目根目录创建 `.env` 文件：
    ```bash
    touch .env
    ```
    使用文本编辑器打开 `.env` 并写入：
    ```text
    API_KEY=你的_Gemini_API_Key_粘贴在这里
    ```

*   **方式 B: 临时环境变量 (仅本次会话有效)**
    ```bash
    export API_KEY=你的_Gemini_API_Key
    ```

**4. 启动开发服务器**
```bash
npm start
```
*   终端将显示访问地址，通常为 `http://localhost:5173`。
*   按住 `Ctrl` 点击链接或在浏览器输入即可访问。

---

### 🪟 Windows 安装部署

**1. 获取代码**
打开 PowerShell 或 命令提示符 (CMD)：
```powershell
# 克隆仓库
git clone https://github.com/your-username/inkflow-ai.git

# 进入项目目录
cd inkflow-ai
```

**2. 安装依赖**
```powershell
npm install
```

**3. 配置环境变量 (API Key)**

*   **方式 A: 创建 .env 文件 (推荐)**
    在项目根目录手动创建一个名为 `.env` 的文件 (注意文件名前面有个点)。
    使用记事本打开，写入：
    ```text
    API_KEY=你的_Gemini_API_Key_粘贴在这里
    ```

*   **方式 B: PowerShell 设置环境变量**
    ```powershell
    $env:API_KEY="你的_Gemini_API_Key"
    ```

*   **方式 C: CMD 设置环境变量**
    ```cmd
    set API_KEY=你的_Gemini_API_Key
    ```

**4. 启动开发服务器**
```powershell
npm start
```
*   看到 `VITE vX.X.X  ready in X ms` 表示启动成功。
*   打开浏览器访问 `http://localhost:5173`。

---

## ❓ 常见问题与故障排除 (Troubleshooting)

**Q1: 启动时报错 `Error: API Key not found`**
*   **原因**: 系统未能读取到环境变量。
*   **解决**: 确保项目根目录下有 `.env` 文件，且内容格式正确（`API_KEY=xyz...`，不要有空格或引号）。如果是 Windows，确保文件扩展名不是 `.env.txt`。

**Q2: `npm install` 报错或卡住**
*   **原因**: 网络问题或镜像源访问受限。
*   **解决**: 尝试切换 npm 镜像源：
    ```bash
    npm config set registry https://registry.npmmirror.com
    ```
    然后重新运行 `npm install`。

**Q3: 端口 5173 被占用**
*   **现象**: 终端提示 `Port 5173 is in use`。
*   **解决**: Vite 会自动尝试下一个端口（如 5174）。直接查看终端输出的新地址即可。

**Q4: 页面白屏或 AI 无响应**
*   **原因**: API Key 无效、额度耗尽，或网络无法连接 Google API。
*   **解决**:
    1. 打开浏览器控制台 (F12 -> Console)，查看是否有红色报错。
    2. 检查 API Key 是否在 Google AI Studio 启用。
    3. 确保网络环境可以访问 Google 服务。

**Q5: 在 Linux 上遇到 `EACCES` 权限错误**
*   **解决**: 避免使用 `root` 用户运行 npm。如果必须，修改目录权限：
    ```bash
    sudo chown -R $USER:$(id -gn $USER) .
    ```

---

## 📦 生产环境构建与部署

如果您想将此项目部署到服务器（如 Nginx）或静态托管平台：

1.  **构建**
    ```bash
    npm run build
    ```
    此命令会在项目根目录生成 `dist/` 文件夹，其中包含所有静态资源。

2.  **部署**
    将 `dist/` 文件夹内的所有内容上传至您的 Web 服务器根目录。

    *   **Nginx 配置示例**:
        ```nginx
        server {
            listen 80;
            server_name example.com;
            root /usr/share/nginx/html; # 指向上传的 dist 目录
            index index.html;

            # 解决 SPA 路由刷新 404 问题
            location / {
                try_files $uri $uri/ /index.html;
            }
        }
        ```

---

**License**: MIT
**Developer**: InkFlow Team
