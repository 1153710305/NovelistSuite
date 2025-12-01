import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * 组件属性接口
 */
interface Props {
  children?: ReactNode; // 子组件节点
}

/**
 * 组件状态接口
 */
interface State {
  hasError: boolean;    // 是否捕获到错误
  error: Error | null;  // 错误对象
}

/**
 * @class ErrorBoundary
 * @description 错误边界组件，用于捕获子组件树中的 JavaScript 错误，记录日志并显示备用 UI。
 */
export class ErrorBoundary extends React.Component<Props, State> {
  // 显式声明 props 以解决 TypeScript 报错 "Property 'props' does not exist on type 'ErrorBoundary'"
  declare props: Readonly<Props>;

  // 初始化组件状态
  public state: State = {
    hasError: false,
    error: null
  };

  /**
   * 生命周期：从错误中派生状态
   * 当后代组件抛出错误时调用，用于更新 state 以显示降级 UI。
   * @param error 抛出的错误
   */
  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  /**
   * 生命周期：捕获错误
   * 用于记录错误日志。
   * @param error 抛出的错误
   * @param errorInfo 错误相关信息（如组件栈）
   */
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught Error:", error);
    console.error("[ErrorBoundary] Component Stack:", errorInfo.componentStack);
  }

  /**
   * 渲染函数
   */
  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 p-6">
          <div className="bg-white p-8 rounded-xl shadow-2xl border border-slate-200 max-w-lg text-center">
            <div className="mx-auto w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6">
              <AlertTriangle className="text-red-500 h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">应用运行遇到严重错误</h2>
            <p className="text-slate-500 mb-6 text-sm">
                Fatal Application Error
            </p>
            
            <div className="bg-slate-900 text-slate-200 p-4 rounded-lg text-left font-mono text-xs mb-6 overflow-auto max-h-48">
              {this.state.error?.message || 'Unknown error'}
            </div>

            <div className="text-xs text-slate-400 mb-6">
               请按 <strong>F12</strong> 打开浏览器控制台 (Console) 查看详细日志。<br/>
               Please check browser console for detailed logs.
            </div>

            <button
              onClick={() => window.location.reload()}
              className="bg-teal-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-teal-700 transition-colors"
            >
              重新加载页面 (Reload)
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}