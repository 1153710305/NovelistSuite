
import React, { createContext, useContext, useState, useEffect } from 'react';
import { saveToStorage, loadFromStorage, STORAGE_KEYS } from './services/storageService';

export type Language = 'en' | 'zh' | 'ja' | 'es' | 'fr' | 'de';

const translations: Record<Language, any> = {
  en: {
    nav: {
      dashboard: 'Dashboard',
      market: 'Market Trends',
      lab: 'Deconstruct Lab',
      studio: 'Writing Studio',
      architect: 'Story Architect',
      powered: 'Powered by Gemini'
    },
    settings: {
        title: 'Settings',
        language: 'Language',
        model: 'AI Model',
        modelHelp: 'Lite (Fast), Flash (Balanced), Pro (Smart)',
        resetGuide: 'Reset Guide'
    },
    sources: {
        title: 'Data Sources',
        label: 'Select platforms for trend analysis:',
        douyin: 'Douyin',
        kuaishou: 'Kuaishou',
        bilibili: 'Bilibili',
        baidu: 'Baidu',
        weibo: 'Weibo',
        xiaohongshu: 'Xiaohongshu',
        fanqie: 'Fanqie',
        qidian: 'Qidian',
        jinjiang: 'Jinjiang',
        zhihu: 'Zhihu',
        all: 'All Sources'
    },
    dashboard: {
      welcome: 'Welcome back, Author.',
      subtitle: "Here is today's literary landscape overview.",
      topGenre: 'Top Genre',
      hotTrope: 'Hot Trope',
      dailyGoal: 'Daily Goal',
      wordsWritten: 'Words written today',
      genreIndex: 'Genre Heat Index',
      platformShare: 'Platform Market Share',
      trending: 'this week',
      trendingPlatforms: 'Trending on 3 platforms',
      heat: 'Heat',
      readCount: 'Reads',
      source: 'Source',
      socialIntel: 'Social Media Intelligence (Top 20)',
      rank: 'Rank',
      topic: 'Topic/Meme',
      change: 'Change',
      timeRange: 'Time Range',
      selectPlatform: 'Platform',
      weekly: 'Weekly',
      monthly: 'Monthly',
      historical: 'All Time',
      trafficBreakdown: 'Traffic Breakdown',
      activeUsers: 'MAU (Est.)',
      growth: 'Growth'
    },
    market: {
      title: 'Market Leaderboard',
      allCategories: 'All Categories',
      hotScore: 'Hot Score',
      deconstruct: 'Deconstruct',
      platform: 'Platform',
      author: 'Author'
    },
    lab: {
      sourceText: 'Source Text',
      analyzeBtn: 'Analyze Text',
      analyzing: 'Deconstructing...',
      viralFactors: 'Hit Factor Report',
      pacing: 'Pacing Analysis',
      characters: 'Character Study',
      placeholder: 'Paste a chapter or segment from a popular novel here to analyze...',
      emptyState: 'Run analysis to identify Golden Chapters, Hooks, and more.',
      modes: {
          viral: 'Viral Factors',
          pacing: 'Pacing',
          chars: 'Characters'
      }
    },
    studio: {
      tabDaily: 'Daily Inspiration',
      tabTools: 'AI Editor Tools',
      dailyGenTitle: 'Daily Generator',
      dailyGenDesc: 'Generate 10 fresh short story concepts based on today\'s trends.',
      trendLabel: 'Trend Focus (Optional)',
      trendPlaceholder: 'e.g., Cyberpunk, Enemies to Lovers...',
      generateBtn: 'Generate 10 Stories',
      generating: 'Generating...',
      emptyDaily: 'Your daily dose of inspiration will appear here.',
      toolContinue: 'Continue',
      toolRewrite: 'Rewrite',
      toolPolish: 'Polish',
      toolPlaceholder: 'Paste your draft here...',
      processing: 'Processing...',
      emptyTool: 'AI output will appear here...'
    },
    architect: {
      placeholder: "Enter your novel premise (e.g., 'A chef discovers his knives can cut through time')...",
      designBtn: 'Design Outline',
      tip: 'Click a node to view details or generate content.',
      description: 'Description',
      content: 'Content',
      generateDraft: 'Generate Draft',
      writing: 'Writing...',
      noContent: 'No content generated yet.',
      types: {
          book: 'Book',
          act: 'Act',
          chapter: 'Chapter',
          scene: 'Scene'
      }
    },
    mindmap: {
      empty: 'Generate an outline to view the map'
    },
    onboarding: {
        skip: 'Skip Tour',
        next: 'Next',
        finish: 'Get Started',
        steps: {
            welcome: { title: 'Welcome to InkFlow AI', desc: 'Your personal AI-powered novel creation studio. Let\'s take a quick tour.' },
            dashboard: { title: 'Dashboard', desc: 'View your writing progress and current market trends at a glance.' },
            market: { title: 'Market Analysis', desc: 'Explore hot novels from major platforms and analyze their success.' },
            lab: { title: 'Deconstruct Lab', desc: 'Use AI to analyze writing styles, pacing, and viral factors from any text.' },
            studio: { title: 'Writing Studio', desc: 'Generate daily inspiration, or use AI to rewrite, polish, and continue your stories.' },
            architect: { title: 'Story Architect', desc: 'Build complex story structures with visual mind maps and generate chapters directly from the outline.' },
            settings: { title: 'Global Settings', desc: 'Switch languages or choose between different Gemini models (Flash for speed, Pro for complex reasoning).' }
        }
    }
  },
  zh: {
    nav: {
      dashboard: '仪表盘',
      market: '市场趋势',
      lab: '拆书实验室',
      studio: '写作工作室',
      architect: '故事架构师',
      powered: '由 Gemini 驱动'
    },
    settings: {
        title: '设置',
        language: '语言 / Language',
        model: 'AI 模型',
        modelHelp: 'Lite (极速), Flash (平衡), Pro (智能)',
        resetGuide: '重置引导'
    },
    sources: {
        title: '数据来源',
        label: '选择趋势分析平台：',
        douyin: '抖音',
        kuaishou: '快手',
        bilibili: 'B站',
        baidu: '百度',
        weibo: '微博',
        xiaohongshu: '小红书',
        fanqie: '番茄',
        qidian: '起点',
        jinjiang: '晋江',
        zhihu: '知乎',
        all: '全选'
    },
    dashboard: {
      welcome: '欢迎回来，作者。',
      subtitle: '这是今天的文学概况。',
      topGenre: '热门流派',
      hotTrope: '热门梗',
      dailyGoal: '每日目标',
      wordsWritten: '今日字数',
      genreIndex: '流派热度指数',
      platformShare: '平台流量份额',
      trending: '本周',
      trendingPlatforms: '3个平台热推',
      heat: '热度',
      readCount: '阅读',
      source: '来源',
      socialIntel: '主流社交平台热梗 Top 20',
      rank: '排名',
      topic: '话题/梗',
      change: '变化',
      timeRange: '统计周期',
      selectPlatform: '选择平台',
      weekly: '本周',
      monthly: '本月',
      historical: '历史累计',
      trafficBreakdown: '流量详细分布',
      activeUsers: '月活 (预估)',
      growth: '增长率'
    },
    market: {
      title: '市场排行榜',
      allCategories: '所有分类',
      hotScore: '热度值',
      deconstruct: '拆解分析',
      platform: '平台',
      author: '作者'
    },
    lab: {
      sourceText: '原文',
      analyzeBtn: '分析文本',
      analyzing: '正在拆解...',
      viralFactors: '爆款因子报告',
      pacing: '节奏分析',
      characters: '角色研究',
      placeholder: '在此粘贴热门小说的章节或片段以进行分析...',
      emptyState: '运行分析以识别黄金三章、钩子等。',
      modes: {
          viral: '爆款因子',
          pacing: '节奏',
          chars: '角色'
      }
    },
    studio: {
      tabDaily: '每日灵感',
      tabTools: 'AI 编辑工具',
      dailyGenTitle: '每日生成器',
      dailyGenDesc: '根据今日趋势生成 10 个新鲜的短篇小说创意。',
      trendLabel: '趋势焦点 (可选)',
      trendPlaceholder: '例如：赛博朋克，死对头...',
      generateBtn: '生成 10 个故事',
      generating: '生成中...',
      emptyDaily: '您的每日灵感将显示在这里。',
      toolContinue: '续写',
      toolRewrite: '改写',
      toolPolish: '润色',
      toolPlaceholder: '在此粘贴您的草稿...',
      processing: '处理中...',
      emptyTool: 'AI 输出将显示在这里...'
    },
    architect: {
      placeholder: "输入小说前提（例如：“一位厨师发现他的刀可以切开时间”）...",
      designBtn: '设计大纲',
      tip: '点击节点查看详情或生成内容。',
      description: '描述',
      content: '正文',
      generateDraft: '生成草稿',
      writing: '写作中...',
      noContent: '暂无生成内容。',
      types: {
          book: '书名',
          act: '卷/幕',
          chapter: '章节',
          scene: '场景'
      }
    },
    mindmap: {
      empty: '生成大纲以查看思维导图'
    },
    onboarding: {
        skip: '跳过',
        next: '下一步',
        finish: '开始使用',
        steps: {
            welcome: { title: '欢迎来到 InkFlow AI', desc: '您的个人 AI 小说创作工作室。让我们快速了解一下功能。' },
            dashboard: { title: '仪表盘', desc: '一目了然地查看您的写作进度和当前市场趋势。' },
            market: { title: '市场趋势', desc: '探索各大平台的热门小说并分析其成功原因。' },
            lab: { title: '拆书实验室', desc: '使用 AI 分析任何文本的写作风格、节奏和爆款因子。' },
            studio: { title: '写作工作室', desc: '获取每日灵感，或使用 AI 续写、改写和润色您的故事。' },
            architect: { title: '故事架构师', desc: '使用可视化思维导图构建复杂的故事结构，并直接从大纲生成章节。' },
            settings: { title: '全局设置', desc: '切换语言或选择不同的 Gemini 模型（Flash 速度快，Pro 适合复杂推理）。' }
        }
    }
  },
  ja: {
    nav: {
      dashboard: 'ダッシュボード',
      market: '市場トレンド',
      lab: '分解ラボ',
      studio: '執筆スタジオ',
      architect: 'ストーリー設計',
      powered: 'Powered by Gemini'
    },
    settings: {
        title: '設定',
        language: '言語 / Language',
        model: 'AI モデル',
        modelHelp: 'Lite (高速), Flash (バランス), Pro (高性能)',
        resetGuide: 'ガイドをリセット'
    },
    sources: {
        title: 'データソース',
        label: 'トレンド分析用のプラットフォームを選択：',
        douyin: 'Douyin (TikTok)',
        kuaishou: 'Kuaishou',
        bilibili: 'Bilibili',
        baidu: 'Baidu',
        weibo: 'Weibo',
        xiaohongshu: 'Xiaohongshu',
        fanqie: 'Fanqie',
        qidian: 'Qidian',
        jinjiang: 'Jinjiang',
        zhihu: 'Zhihu',
        all: 'すべて'
    },
    dashboard: {
      welcome: 'おかえりなさい、作家さん。',
      subtitle: '今日の文学界の概況です。',
      topGenre: 'トップジャンル',
      hotTrope: '人気の設定',
      dailyGoal: '毎日の目標',
      wordsWritten: '今日の執筆文字数',
      genreIndex: 'ジャンル人気指数',
      platformShare: 'プラットフォームシェア',
      trending: '今週',
      trendingPlatforms: '3つの主要サイトでトレンド',
      heat: '注目度',
      readCount: '読者数',
      source: 'ソース',
      socialIntel: 'SNSトレンドトップ20',
      rank: '順位',
      topic: 'トピック',
      change: '変動',
      timeRange: '期間',
      selectPlatform: 'サイト選択',
      weekly: '週間',
      monthly: '月間',
      historical: '累計',
      trafficBreakdown: 'トラフィック詳細',
      activeUsers: 'MAU (推定)',
      growth: '成長率'
    },
    market: {
      title: '市場ランキング',
      allCategories: '全カテゴリー',
      hotScore: '注目度',
      deconstruct: '分解・分析',
      platform: 'サイト',
      author: '作者'
    },
    lab: {
      sourceText: '原文',
      analyzeBtn: 'テキストを分析',
      analyzing: '分析中...',
      viralFactors: 'ヒット要素レポート',
      pacing: 'ペース配分分析',
      characters: 'キャラクター研究',
      placeholder: '人気の小説の章や一節をここに貼り付けて分析します...',
      emptyState: '分析を実行して、ヒットの法則やフックを特定します。',
      modes: {
          viral: 'ヒット要素',
          pacing: 'ペース配分',
          chars: 'キャラクター'
      }
    },
    studio: {
      tabDaily: '毎日のインスピレーション',
      tabTools: 'AI 編集ツール',
      dailyGenTitle: 'デイリージェネレーター',
      dailyGenDesc: '今日のトレンドに基づいて、10個の新しい短編小説のアイデアを生成します。',
      trendLabel: 'トレンドフォーカス（任意）',
      trendPlaceholder: '例：サイバーパンク、悪役令嬢...',
      generateBtn: 'アイデアを10個生成',
      generating: '生成中...',
      emptyDaily: '毎日のインスピレーションがここに表示されます。',
      toolContinue: '続きを書く',
      toolRewrite: 'リライト',
      toolPolish: '推敲',
      toolPlaceholder: 'ここにドラフトを貼り付けてください...',
      processing: '処理中...',
      emptyTool: 'AIの出力がここに表示されます...'
    },
    architect: {
      placeholder: "小説の前提を入力してください（例：「シェフが時間を切り裂く包丁を発見する」）...",
      designBtn: 'アウトラインを作成',
      tip: 'ノードをクリックして詳細を表示したり、コンテンツを生成したりします。',
      description: '説明',
      content: '本文',
      generateDraft: 'ドラフトを生成',
      writing: '執筆中...',
      noContent: '生成されたコンテンツはまだありません。',
      types: {
          book: 'タイトル',
          act: '章/幕',
          chapter: 'チャプター',
          scene: 'シーン'
      }
    },
    mindmap: {
      empty: 'アウトラインを生成してマインドマップを表示'
    },
    onboarding: {
        skip: 'スキップ',
        next: '次へ',
        finish: '始める',
        steps: {
            welcome: { title: 'InkFlow AIへようこそ', desc: 'あなたの個人的なAI小説創作スタジオです。機能を簡単にご紹介します。' },
            dashboard: { title: 'ダッシュボード', desc: '執筆の進捗状況と現在の市場トレンドを一目で確認できます。' },
            market: { title: '市場分析', desc: '主要プラットフォームの人気小説を探索し、その成功要因を分析します。' },
            lab: { title: '分解ラボ', desc: 'AIを使用して、あらゆるテキストの文体、ペース、ヒット要素を分析します。' },
            studio: { title: '執筆スタジオ', desc: '毎日のインスピレーションを得たり、AIを使って物語の続きを書いたり、推敲したりできます。' },
            architect: { title: 'ストーリー設計', desc: '視覚的なマインドマップで複雑な物語構造を構築し、アウトラインから直接チャプターを生成します。' },
            settings: { title: '全体設定', desc: '言語を切り替えたり、異なるGeminiモデル（高速なFlash、複雑な推論向けのPro）を選択したりできます。' }
        }
    }
  },
  es: {
    nav: {
      dashboard: 'Tablero',
      market: 'Tendencias',
      lab: 'Laboratorio',
      studio: 'Estudio',
      architect: 'Arquitecto',
      powered: 'Potenciado por Gemini'
    },
    settings: {
        title: 'Ajustes',
        language: 'Idioma',
        model: 'Modelo IA',
        modelHelp: 'Lite (Rápido), Flash (Balance), Pro (Inteligente)',
        resetGuide: 'Reiniciar Guía'
    },
    sources: {
        title: 'Fuentes de Datos',
        label: 'Seleccionar plataformas:',
        douyin: 'Douyin',
        kuaishou: 'Kuaishou',
        bilibili: 'Bilibili',
        baidu: 'Baidu',
        weibo: 'Weibo',
        xiaohongshu: 'Xiaohongshu',
        fanqie: 'Fanqie',
        qidian: 'Qidian',
        jinjiang: 'Jinjiang',
        zhihu: 'Zhihu',
        all: 'Todas'
    },
    dashboard: {
      welcome: 'Bienvenido, Autor.',
      subtitle: "Panorama literario de hoy.",
      topGenre: 'Género Top',
      hotTrope: 'Tropo Popular',
      dailyGoal: 'Meta Diaria',
      wordsWritten: 'Palabras hoy',
      genreIndex: 'Índice de Popularidad',
      platformShare: 'Cuota de Plataforma',
      trending: 'esta semana',
      trendingPlatforms: 'Tendencia en 3 plataformas',
      heat: 'Calor',
      readCount: 'Lecturas',
      source: 'Fuente',
      socialIntel: 'Inteligencia Social (Top 20)',
      rank: 'Rango',
      topic: 'Tema',
      change: 'Cambio',
      timeRange: 'Periodo',
      selectPlatform: 'Plataforma',
      weekly: 'Semanal',
      monthly: 'Mensual',
      historical: 'Histórico',
      trafficBreakdown: 'Desglose de Tráfico',
      activeUsers: 'MAU (Est.)',
      growth: 'Crecimiento'
    },
    market: {
      title: 'Líderes del Mercado',
      allCategories: 'Todas las Categorías',
      hotScore: 'Puntuación',
      deconstruct: 'Deconstruir',
      platform: 'Plataforma',
      author: 'Autor'
    },
    lab: {
      sourceText: 'Texto Fuente',
      analyzeBtn: 'Analizar Texto',
      analyzing: 'Deconstruyendo...',
      viralFactors: 'Factores Virales',
      pacing: 'Ritmo',
      characters: 'Personajes',
      placeholder: 'Pega un capítulo o segmento aquí para analizar...',
      emptyState: 'Ejecuta el análisis para identificar ganchos y factores de éxito.',
      modes: {
          viral: 'Viral',
          pacing: 'Ritmo',
          chars: 'Personajes'
      }
    },
    studio: {
      tabDaily: 'Inspiración Diaria',
      tabTools: 'Herramientas IA',
      dailyGenTitle: 'Generador Diario',
      dailyGenDesc: 'Genera 10 ideas de historias cortas basadas en tendencias.',
      trendLabel: 'Enfoque (Opcional)',
      trendPlaceholder: 'ej. Cyberpunk, Enemies to Lovers...',
      generateBtn: 'Generar 10 Historias',
      generating: 'Generando...',
      emptyDaily: 'Tu dosis diaria de inspiración aparecerá aquí.',
      toolContinue: 'Continuar',
      toolRewrite: 'Reescribir',
      toolPolish: 'Pulir',
      toolPlaceholder: 'Pega tu borrador aquí...',
      processing: 'Procesando...',
      emptyTool: 'La salida de la IA aparecerá aquí...'
    },
    architect: {
      placeholder: "Introduce la premisa de tu novela...",
      designBtn: 'Diseñar Esquema',
      tip: 'Haz clic en un nodo para ver detalles.',
      description: 'Descripción',
      content: 'Contenido',
      generateDraft: 'Generar Borrador',
      writing: 'Escribiendo...',
      noContent: 'Sin contenido generado aún.',
      types: {
          book: 'Libro',
          act: 'Acto',
          chapter: 'Capítulo',
          scene: 'Escena'
      }
    },
    mindmap: {
      empty: 'Genera un esquema para ver el mapa'
    },
    onboarding: {
        skip: 'Saltar',
        next: 'Siguiente',
        finish: 'Empezar',
        steps: {
            welcome: { title: 'Bienvenido a InkFlow AI', desc: 'Tu estudio personal de creación de novelas impulsado por IA.' },
            dashboard: { title: 'Tablero', desc: 'Vista rápida de tu progreso y tendencias.' },
            market: { title: 'Análisis de Mercado', desc: 'Explora novelas populares y analiza su éxito.' },
            lab: { title: 'Laboratorio', desc: 'Analiza estilos de escritura y factores virales.' },
            studio: { title: 'Estudio de Escritura', desc: 'Genera inspiración o usa IA para reescribir y pulir.' },
            architect: { title: 'Arquitecto', desc: 'Construye estructuras complejas y genera capítulos.' },
            settings: { title: 'Ajustes Globales', desc: 'Cambia el idioma o el modelo Gemini.' }
        }
    }
  },
  fr: {
    nav: {
      dashboard: 'Tableau de bord',
      market: 'Tendances',
      lab: 'Laboratoire',
      studio: 'Studio',
      architect: 'Architecte',
      powered: 'Propulsé par Gemini'
    },
    settings: {
        title: 'Paramètres',
        language: 'Langue',
        model: 'Modèle IA',
        modelHelp: 'Lite (Rapide), Flash (Équilibré), Pro (Intelligent)',
        resetGuide: 'Réinitialiser le guide'
    },
    sources: {
        title: 'Sources de données',
        label: 'Sélectionner les plateformes :',
        douyin: 'Douyin',
        kuaishou: 'Kuaishou',
        bilibili: 'Bilibili',
        baidu: 'Baidu',
        weibo: 'Weibo',
        xiaohongshu: 'Xiaohongshu',
        fanqie: 'Fanqie',
        qidian: 'Qidian',
        jinjiang: 'Jinjiang',
        zhihu: 'Zhihu',
        all: 'Toutes'
    },
    dashboard: {
      welcome: 'Bienvenue, Auteur.',
      subtitle: "Aperçu du paysage littéraire d'aujourd'hui.",
      topGenre: 'Genre Top',
      hotTrope: 'Trope Populaire',
      dailyGoal: 'Objectif Quotidien',
      wordsWritten: 'Mots écrits',
      genreIndex: 'Indice de Popularité',
      platformShare: 'Part de Trafic',
      trending: 'cette semaine',
      trendingPlatforms: 'Tendance sur 3 plateformes',
      heat: 'Chaleur',
      readCount: 'Lectures',
      source: 'Source',
      socialIntel: 'Intelligence Sociale (Top 20)',
      rank: 'Rang',
      topic: 'Sujet',
      change: 'Changement',
      timeRange: 'Période',
      selectPlatform: 'Plateforme',
      weekly: 'Hebdo',
      monthly: 'Mensuel',
      historical: 'Historique',
      trafficBreakdown: 'Détail du Trafic',
      activeUsers: 'MAU (Est.)',
      growth: 'Croissance'
    },
    market: {
      title: 'Classement Marché',
      allCategories: 'Toutes Catégories',
      hotScore: 'Score',
      deconstruct: 'Déconstruire',
      platform: 'Plateforme',
      author: 'Auteur'
    },
    lab: {
      sourceText: 'Texte Source',
      analyzeBtn: 'Analyser',
      analyzing: 'Analyse en cours...',
      viralFactors: 'Facteurs Viraux',
      pacing: 'Rythme',
      characters: 'Personnages',
      placeholder: 'Collez un chapitre ici pour analyser...',
      emptyState: 'Lancez l\'analyse pour identifier les points forts.',
      modes: {
          viral: 'Viral',
          pacing: 'Rythme',
          chars: 'Personnages'
      }
    },
    studio: {
      tabDaily: 'Inspiration',
      tabTools: 'Outils IA',
      dailyGenTitle: 'Générateur Quotidien',
      dailyGenDesc: 'Générez 10 idées d\'histoires basées sur les tendances.',
      trendLabel: 'Tendance (Optionnel)',
      trendPlaceholder: 'ex: Cyberpunk...',
      generateBtn: 'Générer 10 Histoires',
      generating: 'Génération...',
      emptyDaily: 'Votre dose d\'inspiration apparaîtra ici.',
      toolContinue: 'Continuer',
      toolRewrite: 'Réécrire',
      toolPolish: 'Peaufiner',
      toolPlaceholder: 'Collez votre brouillon ici...',
      processing: 'Traitement...',
      emptyTool: 'La sortie IA apparaîtra ici...'
    },
    architect: {
      placeholder: "Entrez la prémisse de votre roman...",
      designBtn: 'Concevoir',
      tip: 'Cliquez sur un nœud pour voir les détails.',
      description: 'Description',
      content: 'Contenu',
      generateDraft: 'Générer Brouillon',
      writing: 'Écriture...',
      noContent: 'Aucun contenu généré.',
      types: {
          book: 'Livre',
          act: 'Acte',
          chapter: 'Chapitre',
          scene: 'Scène'
      }
    },
    mindmap: {
      empty: 'Générez un plan pour voir la carte'
    },
    onboarding: {
        skip: 'Passer',
        next: 'Suivant',
        finish: 'Commencer',
        steps: {
            welcome: { title: 'Bienvenue sur InkFlow AI', desc: 'Votre studio de création de romans personnel propulsé par l\'IA.' },
            dashboard: { title: 'Tableau de bord', desc: 'Visualisez vos progrès et les tendances actuelles.' },
            market: { title: 'Analyse de Marché', desc: 'Explorez les romans populaires et analysez leur succès.' },
            lab: { title: 'Laboratoire', desc: 'Analysez le style et les facteurs viraux de n\'importe quel texte.' },
            studio: { title: 'Studio', desc: 'Générez de l\'inspiration ou utilisez l\'IA pour réécrire et peaufiner.' },
            architect: { title: 'Architecte', desc: 'Construisez des structures complexes et générez des chapitres.' },
            settings: { title: 'Paramètres', desc: 'Changez de langue ou choisissez votre modèle Gemini.' }
        }
    }
  },
  de: {
    nav: {
      dashboard: 'Dashboard',
      market: 'Markttrends',
      lab: 'Dekonstruktionslabor',
      studio: 'Schreibstudio',
      architect: 'Story-Architekt',
      powered: 'Powered by Gemini'
    },
    settings: {
        title: 'Einstellungen',
        language: 'Sprache',
        model: 'KI-Modell',
        modelHelp: 'Lite (Schnell), Flash (Ausgewogen), Pro (Intelligent)',
        resetGuide: 'Anleitung zurücksetzen'
    },
    sources: {
        title: 'Datenquellen',
        label: 'Plattformen auswählen:',
        douyin: 'Douyin',
        kuaishou: 'Kuaishou',
        bilibili: 'Bilibili',
        baidu: 'Baidu',
        weibo: 'Weibo',
        xiaohongshu: 'Xiaohongshu',
        fanqie: 'Fanqie',
        qidian: 'Qidian',
        jinjiang: 'Jinjiang',
        zhihu: 'Zhihu',
        all: 'Alle'
    },
    dashboard: {
      welcome: 'Willkommen zurück, Autor.',
      subtitle: "Hier ist der heutige literarische Überblick.",
      topGenre: 'Top-Genre',
      hotTrope: 'Heißer Trope',
      dailyGoal: 'Tagesziel',
      wordsWritten: 'Geschriebene Wörter',
      genreIndex: 'Genre-Popularitätsindex',
      platformShare: 'Plattform-Anteil',
      trending: 'diese Woche',
      trendingPlatforms: 'Trending auf 3 Plattformen',
      heat: 'Hitze',
      readCount: 'Gelesen',
      source: 'Quelle',
      socialIntel: 'Social Media Intelligenz (Top 20)',
      rank: 'Rang',
      topic: 'Thema',
      change: 'Änderung',
      timeRange: 'Zeitraum',
      selectPlatform: 'Plattform',
      weekly: 'Wöchentlich',
      monthly: 'Monatlich',
      historical: 'Gesamt',
      trafficBreakdown: 'Verkehrsaufschlüsselung',
      activeUsers: 'MAU (Geschätzt)',
      growth: 'Wachstum'
    },
    market: {
      title: 'Marktführer',
      allCategories: 'Alle Kategorien',
      hotScore: 'Hot Score',
      deconstruct: 'Dekonstruieren',
      platform: 'Plattform',
      author: 'Autor'
    },
    lab: {
      sourceText: 'Quelltext',
      analyzeBtn: 'Text analysieren',
      analyzing: 'Analysieren...',
      viralFactors: 'Viral-Faktoren',
      pacing: 'Pacing',
      characters: 'Charaktere',
      placeholder: 'Fügen Sie hier ein Kapitel ein...',
      emptyState: 'Führen Sie eine Analyse durch.',
      modes: {
          viral: 'Viral',
          pacing: 'Pacing',
          chars: 'Charaktere'
      }
    },
    studio: {
      tabDaily: 'Tägliche Inspiration',
      tabTools: 'KI-Tools',
      dailyGenTitle: 'Täglicher Generator',
      dailyGenDesc: 'Generieren Sie 10 kurze Story-Ideen.',
      trendLabel: 'Trendfokus (Optional)',
      trendPlaceholder: 'z.B. Cyberpunk...',
      generateBtn: '10 Stories generieren',
      generating: 'Generieren...',
      emptyDaily: 'Ihre tägliche Inspiration erscheint hier.',
      toolContinue: 'Fortsetzen',
      toolRewrite: 'Umschreiben',
      toolPolish: 'Polieren',
      toolPlaceholder: 'Fügen Sie Ihren Entwurf hier ein...',
      processing: 'Verarbeitung...',
      emptyTool: 'KI-Ausgabe erscheint hier...'
    },
    architect: {
      placeholder: "Geben Sie Ihre Romanprämisse ein...",
      designBtn: 'Gliederung entwerfen',
      tip: 'Klicken Sie auf einen Knoten für Details.',
      description: 'Beschreibung',
      content: 'Inhalt',
      generateDraft: 'Entwurf generieren',
      writing: 'Schreiben...',
      noContent: 'Noch kein Inhalt generiert.',
      types: {
          book: 'Buch',
          act: 'Akt',
          chapter: 'Kapitel',
          scene: 'Szene'
      }
    },
    mindmap: {
      empty: 'Gliederung generieren, um die Karte zu sehen'
    },
    onboarding: {
        skip: 'Überspringen',
        next: 'Weiter',
        finish: 'Starten',
        steps: {
            welcome: { title: 'Willkommen bei InkFlow AI', desc: 'Ihr persönliches KI-gestütztes Roman-Studio.' },
            dashboard: { title: 'Dashboard', desc: 'Überblick über Ihren Schreibfortschritt.' },
            market: { title: 'Marktanalyse', desc: 'Erforschen Sie heiße Romane und analysieren Sie deren Erfolg.' },
            lab: { title: 'Dekonstruktionslabor', desc: 'Analysieren Sie Schreibstil und Viral-Faktoren.' },
            studio: { title: 'Schreibstudio', desc: 'Generieren Sie Inspiration oder nutzen Sie KI-Tools.' },
            architect: { title: 'Story-Architekt', desc: 'Bauen Sie komplexe Strukturen und generieren Sie Kapitel.' },
            settings: { title: 'Einstellungen', desc: 'Wechseln Sie die Sprache oder das Gemini-Modell.' }
        }
    }
  }
};

const I18nContext = createContext<any>(null);

export const I18nProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [lang, setLangState] = useState<Language>('en');

  useEffect(() => {
    const savedSettings = loadFromStorage(STORAGE_KEYS.SETTINGS);
    if (savedSettings && savedSettings.lang && translations[savedSettings.lang as Language]) {
        setLangState(savedSettings.lang);
    } else {
        const browserLang = navigator.language.split('-')[0] as Language;
        if (translations[browserLang]) {
            setLangState(browserLang);
        }
    }
  }, []);

  const setLang = (newLang: Language) => {
      setLangState(newLang);
      const savedSettings = loadFromStorage(STORAGE_KEYS.SETTINGS) || {};
      saveToStorage(STORAGE_KEYS.SETTINGS, { ...savedSettings, lang: newLang });
  }

  const t = (path: string) => {
    const keys = path.split('.');
    let current: any = translations[lang] || translations['en'];
    for (const key of keys) {
      if (current[key] === undefined) {
          // Fallback to English if key missing
          let fallback = translations['en'];
          for (const k of keys) {
              if (fallback[k] === undefined) return path;
              fallback = fallback[k];
          }
          return fallback;
      }
      current = current[key];
    }
    return current;
  };

  const getToolLabel = (mode: string) => {
     if (lang === 'zh') return mode === 'continue' ? '续写' : mode === 'rewrite' ? '改写' : '润色';
     if (lang === 'ja') return mode === 'continue' ? '続きを書く' : mode === 'rewrite' ? 'リライト' : '推敲';
     return t(`studio.tool${mode.charAt(0).toUpperCase() + mode.slice(1)}`);
  };

  const getProcessLabel = (mode: string) => {
      return `AI ${getToolLabel(mode)}`;
  }

  return (
    <I18nContext.Provider value={{ lang, setLang, t, getToolLabel, getProcessLabel }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => useContext(I18nContext);
