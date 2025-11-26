
# InkFlow AI - Novelist Suite

**InkFlow AI** is a comprehensive, local-first intelligent creative suite designed specifically for web novel authors. Leveraging the power of Google Gemini models, it provides end-to-end support ranging from market trend analysis and viral hit deconstruction to daily inspiration generation, structural design, and assisted drafting.

## 🌟 Key Features

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

3.  **Writing Studio**
    *   **Daily Inspiration**: AI generates 10 fresh story concepts daily based on current market trends.
    *   **Quick Tools**: Instant Rewrite, Polish, and Continue functions for drafts.
    *   **Manuscript System**: Integrated folder management for chapters.
    *   **8-Map Architecture**: A unique node-based system connecting World Settings, Power Systems, Characters, and Plot Outlines directly to the writing process.

4.  **Story Architect**
    *   **Blueprint Mode**: Visual mind map editing for high-level story structure.
    *   **Cover Studio**: AI art generation for novel covers using diverse styles (Xianxia, Cyberpunk, etc.).

---

## 🏗 System Design & AI Architecture

InkFlow AI is built on a **React + TypeScript** frontend that communicates directly with the **Google Gemini API**. It follows a "Local-First" architecture where all user data (stories, outlines, history) is stored in the browser's `localStorage`, ensuring privacy and offline capability for viewing.

### The "InkFlow Engine"

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

## 🛠 Tech Stack

*   **Frontend**: React 19, TypeScript, Vite
*   **Styling**: Tailwind CSS
*   **Icons**: Lucide React
*   **Visualization**: D3.js (Mind Maps), Recharts (Charts)
*   **AI**: Google GenAI SDK (`@google/genai`)

---

## 💻 Installation & Setup

### Prerequisites
*   **Node.js**: v18.0.0+ (LTS recommended).
*   **API Key**: A valid Google AI Studio API Key.

### Quick Start

1.  **Clone Repository**
    ```bash
    git clone https://github.com/your-username/inkflow-ai.git
    cd inkflow-ai
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Configure API Key**
    Create a `.env` file in the root directory:
    ```env
    API_KEY=your_google_api_key_here
    ```

4.  **Run Development Server**
    ```bash
    npm start
    ```
    Access the app at `http://localhost:5173`.

---

## 📦 Deployment

Build for production (generates `dist/` folder):
```bash
npm run build
```

The output is a static SPA (Single Page Application) that can be hosted on Nginx, Vercel, Netlify, or GitHub Pages.

---

**License**: MIT
**Developer**: InkFlow Team
