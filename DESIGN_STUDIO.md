
# InkFlow Studio: 写作工作室详细设计文档 (Detailed Design Document)

## 1. 概述 (Overview)

**InkFlow Studio (写作工作室)** 是本系统的核心作业车间。与传统的线性聊天界面不同，Studio 被设计为一个**“上下文感知型副驾驶 (Context-Aware Co-Pilot)”**。

在这个模块中，用户扮演“创意总监”的角色，而 AI 则作为执行引擎（架构师、起草者、编辑）。核心设计哲学是 **“结构先于内容 (Structure First, Content Second)”**。AI 不仅仅生成文本，而是先生成结构化的元数据（8-Map 体系），再基于这些结构生成正文。

## 2. 核心架构：8-Map 体系 (The 8-Map System)

为了解决长篇小说生成中的“遗忘”和“逻辑崩坏”问题，Studio 引入了 8 个维度的结构化数据树。这些树状结构存储在 `StudioRecord.architecture` 中。

| 维度 (Map Type) | 作用 | AI 上下文注入逻辑 |
| :--- | :--- | :--- |
| **World (世界观)** | 定义地理、历史、物理法则 | 全局注入。确保物理规则一致。 |
| **System (体系)** | 定义力量等级、升级条件 | 强一致性注入。防止主角等级混乱。 |
| **Mission (任务)** | 角色当前状态、任务线 | 动态注入。确保剧情推动符合当前目标。 |
| **Character (角色)** | 角色关系、性格、外貌 | 按需注入。避免名字张冠李戴。 |
| **Anchor (锚点)** | 伏笔、关键物品、悬念 | 关键节点注入。确保伏笔回收。 |
| **Structure (分卷)** | 宏观节奏控制 (卷/幕) | 规划层。指导 AI 控制字数和节奏。 |
| **Events (事件流)** | 关键转折点 (Plot Points) | 剧情层。指导章节内的冲突走向。 |
| **Chapters (细纲)** | 执行序列 | 包含具体的章节标题和单章梗概。 |

## 3. AI 智能体协作 (AI Agents Collaboration)

Studio 内部由四个专门的 AI 逻辑模块组成，通过 `GeminiService` 进行交互：

### A. 趋势分析师 (The Trend Analyst)
*   **输入**: Dashboard 聚合的外部数据（社交媒体热榜、小说排行榜）。
*   **动作**: 综合分析，提取单一的 `TrendFocus` 关键词（例如：“赛博修仙”、“规则怪谈”）。
*   **输出**: 一个高层级的题材指令，注入给灵感引擎。

### B. 灵感引擎 (The Inspiration Engine)
*   **模型**: Gemini 2.5 Flash (侧重速度与发散性)。
*   **功能**: `generateDailyStories`
*   **机制**:
    1.  接收 `TrendFocus` 和用户设定的偏好（男频/女频）。
    2.  生成 5 个结构化的灵感卡片。
    3.  每张卡片包含特定的 **“网文元数据 (Web Novel Metas)”**：
        *   *Golden Finger (金手指)*: 核心作弊器/优势。
        *   *Cool Point (爽点)*: 情绪价值来源。
        *   *Burst Point (爆点)*: 核心冲突高潮。
*   **输出**: 点击卡片后，生成一个新的 `StudioRecord`。

### C. 架构师 (The Architect)
*   **模型**: Gemini 3 Pro (侧重复杂逻辑推理)。
*   **功能**: `generateNovelArchitecture`
*   **职责**: 将灵感卡片中的短文本扩展为上述的 **8-Map 树状结构**。
*   **流程**: 它不是一次性生成所有内容，而是递归生成。
    *   Step 1: 生成世界观根节点。
    *   Step 2: 生成角色列表。
    *   Step 3: 生成前 10 章的细纲。

### D. 起草者 (The Drafter)
*   **模型**: Gemini 2.5 Flash / 3 Pro (视配置而定)。
*   **功能**: `generateChapterContent`
*   **上下文清洗与结构化 (Context Scrubbing)**: 详见下文第 8 节。
*   **生成逻辑**:
    *   Input: 当前章节节点 (`OutlineNode`)。
    *   Context: 经过清洗的 World + Character + 上一章结尾。
    *   Prompt: `基于[清洗后的世界观]和[上一章结尾]，撰写[当前章节梗概]`。

## 4. 交互设计与视图 (UX & View Modes)

Studio 提供四种视图，对应创作的不同阶段：

1.  **Quick Tools (快速工具)**:
    *   **场景**: 灵感碎片记录、段落润色。
    *   **功能**: 提供“续写”、“重写”、“润色”三个快捷按钮。不依赖复杂架构，开箱即用。

2.  **Story Map (故事导图)**:
    *   **场景**: 架构设计、设定修改。
    *   **可视化**: 基于 D3.js 的思维导图。
    *   **操作**: 点击节点可编辑名称、描述，或触发 AI 生成子节点。

3.  **Manuscript (稿件箱)**:
    *   **场景**: 概览所有章节、调整章节顺序。
    *   **形式**: 网格化的文件列表，显示字数统计。

4.  **Editor (沉浸式编辑器)**:
    *   **场景**: 正文撰写、精修。
    *   **核心功能 - "AI Modify"**:
        *   这是连接“架构”与“正文”的桥梁。
        *   当用户在编辑器中点击“AI Modify”时，系统会读取最新的 8-Map 数据作为上下文。
        *   **效果**: 如果用户刚刚在导图中修改了配角的名字，使用 AI 重写正文时，正文中的名字会自动更正，无需手动查找替换。

## 5. 数据流转图 (Data Flow)

```mermaid
graph TD
    User[用户] -->|选择来源| TrendAgent[趋势分析师]
    TrendAgent -->|生成关键词| Inspiration[灵感引擎]
    Inspiration -->|输出灵感卡片| User
    User -->|选择卡片| Architect[架构师]
    
    subgraph "8-Map 上下文引擎"
        Architect -->|生成| WorldMap[世界观树]
        Architect -->|生成| CharMap[角色树]
        Architect -->|生成| ChapterMap[章节细纲]
    end
    
    User -->|选择章节节点| Scrubber[清洗模型 (Flash-Lite)]
    WorldMap -->|原始上下文| Scrubber
    CharMap -->|原始上下文| Scrubber
    
    Scrubber -->|1. 结构化 JSON<br>2. 去重<br>3. 模糊词精确化| CleanContext[清洗后的上下文]
    
    CleanContext --> Drafter[起草者]
    Drafter -->|生成正文| Editor[编辑器]
```

## 6. 关键技术实现细节

### 6.1 RAG (检索增强生成) 与向量化
*   **Embedding**: 使用 `text-embedding-004` 模型。
*   **策略**: 当 8-Map 数据量过大（超过 Token 限制）时，系统启用本地 RAG 模式。
*   **流程**:
    1.  将所有 Map 节点扁平化并向量化。
    2.  将“当前章节梗概”向量化作为 Query。
    3.  计算余弦相似度，提取 Top-K 相关节点（例如：只提取当前章节出场的角色和涉及的地点）。
    4.  仅将这些相关节点送入 `Cleaner Model` 进行清洗，然后生成。

### 6.2 时序防火墙与数据防污染 (Time-Travel Prevention)
这是一个关键的逻辑机制，用于防止 RAG 检索到未来的剧情。
*   **问题**: 如果在写第 5 章时，RAG 检索了所有章节，可能会检索到第 10 章的“主角死亡”，导致 AI 在第 5 章就写死了主角。
*   **解决方案**: `getPastContextNodes(root, currentId)`
    *   该函数会对剧情类导图（Chapters, Events, Mission, Structure）进行扁平化处理。
    *   找到当前正在生成的节点 ID。
    *   **物理切断**：只返回该节点及其之前的所有节点。位于其后的节点（未来的剧情）会被直接丢弃，不参与 RAG 索引。
    *   全局设定类导图（World, Character, System）则不受此限制，全量参与检索。

## 7. AI 工作流详解 (AI Workflows)

为了确保用户理解 AI 的工作原理，以下详细拆解了**“生成正文”**和**“重绘导图”**的内部数据流转逻辑。在任务监控台 (Task Monitor) 中，您可以看到这三个关键部分：**System**、**Context** 和 **Prompt**。

### 7.1 生成正文 (Generate Draft) 工作流

此功能用于根据大纲节点（如章节名、梗概）自动撰写小说正文。

*   **1. System Instruction (固定系统设定)**
    *   **来源**: 全局身份设置 (Global Persona)。
    *   **内容**: 定义 AI 的身份（如“资深网文主编”）。包含语气、文风偏好、以及硬性的输出语言要求（如“必须使用简体中文”）。
    *   **作用**: 确保所有输出的一致性，防止 AI 角色跳脱。

*   **2. Context (动态上下文)**
    *   **来源**: 自动组装，包含以下三层：
        *   **Core Metadata (核心元数据)**: 提取自灵感卡片。包括书名、分类、爽点 (Cool Point)、爆点 (Burst Point) 和金手指设定。这确保了正文不会偏离最初的商业卖点。
        *   **Selected Maps (关联导图)**: 用户手动勾选或 RAG 自动检索的思维导图内容（如世界观、角色表）。
        *   **Previous Chapter (上文)**: 上一章的结尾内容（最后 2000 字左右）。用于确保剧情连贯，实现“无缝衔接”。
    *   **格式**: 结构化文本块，例如 `[CORE_METADATA] ... [WORLD_SETTING] ...`。

*   **3. Prompt (具体指令)**
    *   **来源**: 用户操作 + 提示词库。
    *   **内容**: 具体的任务指令。例如：“撰写《第一章：重生》的正文。梗概：主角醒来发现回到了十年前。文风要求：赛博朋克风，强调压抑感。”
    *   **作用**: 指挥 AI 执行具体的写作任务。

## 8. AI 结构化与确定性清洗详解 (AI Structured & Deterministic Scrubbing)

这是 InkFlow AI 最核心的技术之一，旨在解决 AI 长篇写作中的“幻觉”、“吃书”（前后设定不一致）以及上下文窗口膨胀问题。

### 8.1 原理 (Principle)
我们使用轻量级模型 (Flash-Lite) 作为一个“中间层清洁工”。在将庞大的背景资料（Context）发送给主力写作模型前，先对其进行一轮预处理。

*   **输入**: 自然语言描述的杂乱背景资料。
*   **处理**: 模型被要求提取事实 (Facts) 和实体 (Entities)，并强制转换为压缩的 JSON 格式。
*   **指令核心**: "Remove fluff, keep facts. Replace ambiguous terms with precise values."

### 8.2 作用 (Function)
1.  **去修饰 (De-fluffing)**: 删除形容词、感叹词和文学描写，只保留逻辑事实。这大大节省了 Token。
2.  **去模糊 (Disambiguation)**: 强制 AI 将“大概”、“左右”、“可能”等模糊词替换为精确数值。这避免了长篇连载中的逻辑漂移。
3.  **结构化 (Structuring)**: 将文本转为 `[ENTS]` (实体) 和 `[FACTS]` (事实) 标签，方便主力模型快速索引。

### 8.3 效果 (Effect)
使用此技术后，上下文体积通常可**减少 40% - 60%**，且主力模型的逻辑一致性显著提高。

### 8.4 如何验证？ (How to Verify)
用户可以在系统中直观地看到清洗过程和结果：

1.  开启 **"节点检查器" (Inspector)** 中的 **"AI 结构化与确定性清洗" (Optimize Context)** 开关。
2.  点击 **"生成草稿"**。
3.  打开屏幕右下角的 **"任务监控台" (Task Monitor)**。
4.  在对应的 "Drafting" 任务卡片上，点击 **"对比 (Comparison)"** 按钮（紫色图标）。
5.  系统会并排展示 **"Original Context" (原始上下文)** 和 **"Optimized Context" (清洗后上下文)**。

### 8.5 如何判断成功/失败？ (Success Criteria)

**成功的迹象**:
*   **压缩率**: 清洗后的字符数显著少于原始字符数。
*   **格式**: 内容变成了 `[ENTS]: ... [FACTS]: ...` 或紧凑的 JSON 格式。
*   **去模糊**: 原始文本中的 "村口大概有一百米" 变成了 "村口: 距离100m"。
*   **保留**: 核心专有名词（如人名、地名、等级名）完好无损。

**失败的迹象 (Bad Case)**:
*   **过度清洗**: 关键的人名或设定丢失。
*   **指令残留**: 输出中包含了 "Ignore instructions" 或 "Here is the JSON" 等 AI 的废话。
*   **幻觉**: AI 编造了原始文本中没有的数据（例如给无名路人甲起了名字）。

### 8.6 实例说明 (Example)

**Input (Raw Context - 原始上下文):**
> 主角林凡大概十八九岁的样子，长得还算清秀。他手里拿着一把看起来很破旧的铁剑，剑身生锈了，大概有三尺长。他住在青云门的外门弟子宿舍，这里的环境很差，屋顶都漏雨了。隔壁住着王胖子，是他的死党，体重大概两百斤左右。

**Output (Scrubbed Context - 清洗后):**
> [ENTS]: 林凡(主角, 19岁, 外貌清秀); 铁剑(物品, 状态:破旧/生锈, 长度:3尺); 王胖子(配角, 关系:死党, 体重:200斤); 青云门外门宿舍(地点, 状态:破损/漏雨).
> [FACTS]: 林凡持有铁剑; 林凡与王胖子是邻居.

**分析**:
*   "大概十八九岁" -> "19岁" (确定性)
*   "看起来很破旧...剑身生锈了" -> "状态:破旧/生锈" (去修饰)
*   "大概有三尺长" -> "长度:3尺" (结构化)
*   字符数从 105 缩减为 65 (压缩率 ~38%)，且逻辑更加清晰，方便 AI 引用。
