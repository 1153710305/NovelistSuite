/**
 * @file index.tsx
 * @description 应用程序的入口文件。
 * 
 * ## 主要功能
 * 1. **应用初始化**: 负责挂载 React 应用到 DOM。
 * 2. **错误边界**: 顶层包裹 `ErrorBoundary` 以捕获渲染过程中的致命错误。
 * 3. **日志记录**: 在启动阶段记录关键的生命周期事件。
 * 
 * ## 开发注意
 * - 这是 Webpack/Vite 的构建入口。
 * - 样式表 (Tailwind) 通过 CDN 在 index.html 引入，此处主要处理逻辑挂载。
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Logger } from './services/logger';

try {
  // 记录启动日志
  Logger.info('Startup', '正在初始化应用程序...', { timestamp: new Date().toISOString() });

  const rootElement = document.getElementById('root');
  
  // 致命错误检查：确保 HTML 中存在挂载点
  if (!rootElement) {
    const errorMsg = "致命错误: 无法找到 id 为 'root' 的根元素。应用无法挂载。";
    Logger.error('Startup', errorMsg);
    // 在页面上直接显示错误，因为 React 还没加载
    document.body.innerHTML = `<div style="color: red; padding: 20px; font-family: sans-serif;"><h1>启动错误</h1><p>${errorMsg}</p></div>`;
    throw new Error(errorMsg);
  }

  Logger.info('Startup', 'DOM 根元素已找到。');

  const root = ReactDOM.createRoot(rootElement);
  Logger.info('Startup', 'React Root 已创建，准备渲染组件树...');

  // 渲染应用
  // StrictMode: 开发模式下会双重调用生命周期以检测副作用
  // ErrorBoundary: 捕获子组件树中的 JS 错误
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );

  Logger.info('Startup', 'React 渲染指令已发送。');

} catch (e: any) {
  Logger.error('Startup', '引导过程中捕获未处理异常:', { error: e.message });
}
