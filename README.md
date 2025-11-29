
# InkFlow AI - Novelist Suite

[English](#english) | [中文](#chinese)

---

<a name="english"></a>
## 🇬🇧 English: InkFlow AI - Novelist Suite

**InkFlow AI** is a comprehensive, local-first intelligent creative suite designed specifically for web novel authors. Leveraging the power of Google Gemini models, it provides end-to-end support ranging from market trend analysis and viral hit deconstruction to daily inspiration generation, structural design, and assisted drafting.

### 🌟 Key Features

1.  **Dashboard**
    *   **Data Aggregation**: Real-time aggregation of genre heat indices from major Chinese platforms (Qidian, Fanqie, Jinjiang).
    *   **Social Intelligence**: Tracking trending tropes and memes on social media (Douyin, Bilibili, Weibo).
    *   **Visual Analytics**: Platform traffic share and user demographics visualization.

2.  **Market & Analysis**
    *   **Rankings Simulation**: View simulated rankings filtered by category.
    *   **Deconstruction Lab**: AI-powered analysis of any novel link.
        *   *Viral Factor Analysis*: Identifies the "Golden 3 Chapters", hooks, and engagement drivers.
        *   *Pacing Analysis*: Visualizes plot progression speed.
        *   *Character Arc*: Analyzes protagonist motivation and growth.

3.  **Writing Studio (Collaboration Studio)**
    *   **Daily Inspiration**: Uses Dashboard trend data to generate 10 fresh story concepts daily.
        *   **Targeted Generation**: Supports selecting target audience (Male/Female Frequency).
        *   **Rich Metadata**: Generates detailed tags including Major Category (e.g., Western Fantasy), Theme (e.g., Derivative), Character Archetype (e.g., Harem, Emperor), and Plot Type (e.g., God-slaying).
    *   **8-Map Architecture**: A unique, deep-linking node system that connects World Settings, Power Systems, Characters, and Plot Outlines.
    *   **Context-Aware Drafting**: The "Bridge" system injects relevant World/Character details into the AI prompt when drafting specific chapters, ensuring consistency.
    *   **AI Co-pilot**: Inline rewriting, polishing, and illustration generation within the editor.
    *   *For a detailed breakdown of the Studio architecture, see [DESIGN_STUDIO.md](DESIGN_STUDIO.md).*

4.  **Story Architect**
    *   **Blueprint Mode**: Visual mind map editing for high-level story structure.
    *   **Cover Studio**: AI art generation for novel covers using diverse styles (Xianxia, Cyberpunk, etc.).

### 🏗 System Design & AI Architecture

InkFlow AI is built on a **React + TypeScript** frontend that communicates directly with the **Google Gemini API**. It follows a "Local-First" architecture where all user data (stories, outlines, history) is stored in the browser's `localStorage`, ensuring privacy and offline capability for viewing.

#### The "InkFlow Engine"

The core logic resides in `services/geminiService.ts`, which acts as the orchestration layer between the UI and the AI models.

**1. Data Flow Pipeline**
```mermaid
[User Input] -> [Service Layer] -> [Prompt Engineering] -> [Gemini API] -> [Response Parsing] -> [State/Storage]
```

**2. The 8-Map Context System**
Unlike generic chat assistants, InkFlow uses a structured context injection system. A novel is defined by 8 distinct Mind Maps:
1.  **World**: Geography, History, Laws.
2.  **System**: Power hierarchy, Leveling rules (The "Cool Point System").
3.  **Mission**: Main quest lines and side quests.
4.  **Character**: Relationships, Stats, Arcs.
5.  **Anchor**: Key items/memories (Memory Anchors).
6.  **Structure**: High-level Acts/Volumes.
7.  **Events**: Major turning points.
8.  **Chapters**: The actual scene-by-scene outline.

**Collaborative AI Workflow**:
*   **Context Extraction**: When the user requests to "Generate Draft" for a specific Chapter Node, the system recursively traverses the `World` and `Character` maps.
*   **Prompt Assembly**: It combines the *Static Context* (World/Chars) + *Dynamic Context* (Current Chapter Outline) + *Style Instructions*.
*   **Generation**: Gemini generates the text ensuring consistency with the defined architecture.

### AI Function Collaboration

*   **Trend -> Inspiration**: The `Dashboard` analyzes trends -> feeds keywords to `Studio` -> `Studio` generates daily inspiration cards.
*   **Card -> Architecture**: Clicking "Generate Story" on an inspiration card passes the metadata (Golden Finger, Trope) to the `Architect` service to build the initial 8-Map structure.
*   **Architecture -> Manuscript**: Nodes in the `Chapters` map are linked to the `Manuscript` view. Generating content in the map automatically creates a file in the manuscript folder.

---

<a name="chinese"></a>
## 🇨🇳 中文: InkFlow AI - 个人AI小说生成系统

**InkFlow AI** 是专为网络小说作者打造的综合性、本地优先的智能创作套件。利用 Google Gemini 模型的强大功能，它提供从市场趋势分析、爆款拆解到每日灵感生成、结构设计和辅助写作的全流程支持。

### 🌟 核心功能

1.  **仪表盘 (Dashboard)**
    *   **数据聚合**: 实时聚合来自起点、番茄、晋江等主流中文平台的热度指数。
    *   **社交情报**: 追踪抖音、B站、微博上的热门梗和话题。
    *   **可视化分析**: 平台流量份额和用户画像可视化。

2.  **市场与分析 (Market & Analysis)**
    *   **榜单模拟**: 查看按分类过滤的模拟排行榜。
    *   **拆书实验室**: AI 驱动的小说链接拆解分析。
        *   *爆款因子分析*: 识别“黄金三章”、钩子和爽点。
        *   *节奏分析*: 可视化情节推进速度。
        *   *角色弧光*: 分析主角动机和成长路径。

3.  **写作工作室 (Collaboration Studio)**
    *   **每日灵感**: 利用仪表盘趋势数据，每日生成 10 个新鲜的故事创意。
        *   **定向生成**: 支持选择目标读者（男频/女频）。
        *   **丰富标签**: 生成详细的标签，包括主分类（如西方奇幻、东方仙侠）、主题（如衍生、仕途、都市异能）、角色原型（如多女主、皇帝）和情节类型（如斩神衍生、西游衍生）。
    *   **8-图架构体系**: 一个独特的深度链接节点系统，连接世界观设定、力量体系、角色和情节大纲。
    *   **上下文感知写作**: “桥梁”系统在撰写特定章节时，会将相关的世界/角色细节注入 AI 提示词中，确保一致性。
    *   **AI 副驾驶**: 编辑器内的行内重写、润色和插图生成。
    *   *有关工作室架构的详细分析，请参阅 [DESIGN_STUDIO.md](DESIGN_STUDIO.md)。*

4.  **故事架构师 (Story Architect)**
    *   **蓝图模式**: 用于高层故事结构的思维导图编辑。
    *   **封面工作室**: 使用多种风格（仙侠、赛博朋克等）生成小说封面 AI 艺术。

### 🏗 系统设计与 AI 架构

InkFlow AI 基于 **React + TypeScript** 前端构建，直接与 **Google Gemini API** 通信。它遵循“本地优先”架构，所有用户数据（故事、大纲、历史记录）均存储在浏览器的 `localStorage` 中，确保隐私和离线查看能力。

#### "InkFlow 引擎"

核心逻辑位于 `services/geminiService.ts` 中，充当 UI 和 AI 模型之间的编排层。

**1. 数据流管道**
```mermaid
[用户输入] -> [服务层] -> [提示词工程] -> [Gemini API] -> [响应解析] -> [状态/存储]
```

**2. 8-图上下文系统**
与通用聊天助手不同，InkFlow 使用结构化的上下文注入系统。一部小说由 8 个独特的思维导图定义：
1.  **世界 (World)**: 地理、历史、法则。
2.  **体系 (System)**: 力量等级、升级规则（“爽点体系”）。
3.  **任务 (Mission)**: 主线任务和支线任务。
4.  **角色 (Character)**: 关系、属性、弧光。
5.  **锚点 (Anchor)**: 关键物品/记忆（记忆锚点）。
6.  **结构 (Structure)**: 高层卷/幕。
7.  **事件 (Events)**: 主要转折点。
8.  **章节 (Chapters)**: 实际的分场大纲。

**协作 AI 工作流**:
*   **上下文提取**: 当用户请求为特定章节节点“生成草稿”时，系统会递归遍历 `World` 和 `Character` 导图。
*   **提示词组装**: 它结合了 *静态上下文* (世界/角色) + *动态上下文* (当前章节大纲) + *风格指令*。
*   **生成**: Gemini 生成确本文本，确保与定义的架构一致。

### AI 功能联动

*   **趋势 -> 灵感**: `仪表盘` 分析趋势 -> 向 `工作室` 提供关键词 -> `工作室` 生成每日灵感卡片。
*   **卡片 -> 架构**: 点击灵感卡片上的“生成小说”，将元数据（金手指、梗）传递给 `架构师` 服务，以构建初始的 8-图结构。
*   **架构 -> 正文**: `Chapters` 导图中的节点链接到 `正文` 视图。在导图中生成内容会自动在正文文件夹中创建文件。

---

## 🛠 技术栈 (Tech Stack)

*   **前端**: React 19, TypeScript, Vite
*   **样式**: Tailwind CSS
*   **图标**: Lucide React
*   **可视化**: D3.js (思维导图), Recharts (图表)
*   **AI**: Google GenAI SDK (`@google/genai`)

---

## 💻 安装与设置 (Installation)

### 先决条件
*   **Node.js**: v18.0.0+ (推荐 LTS)。
*   **API Key**: 有效的 Google AI Studio API Key。

### 快速开始

1.  **克隆仓库**
    ```bash
    git clone https://github.com/your-username/inkflow-ai.git
    cd inkflow-ai
    ```

2.  **安装依赖**
    ```bash
    npm install
    ```

3.  **配置 API Key**
    在根目录创建一个 `.env` 文件：
    ```env
    API_KEY=your_google_api_key_here
    ```

4.  **运行开发服务器**
    ```bash
    npm start
    ```
    访问应用： `http://localhost:5173`。

---

## 📦 部署 (Deployment)

构建生产版本（生成 `dist/` 文件夹）：
```bash
npm run build
```

输出是一个静态 SPA（单页应用），可以托管在 Nginx、Vercel、Netlify 或 GitHub Pages 上。

---

**License**: MIT
**Developer**: InkFlow Team
