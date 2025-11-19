
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("%c[ErrorBoundary] Uncaught Error:", 'color: red; font-weight: bold; font-size: 14px;', error);
    console.error("[ErrorBoundary] Component Stack:", errorInfo.componentStack);
  }

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
