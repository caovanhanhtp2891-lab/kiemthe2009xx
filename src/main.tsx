import React from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class AppErrorBoundary extends React.Component<
  {children: React.ReactNode},
  ErrorBoundaryState
> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = {hasError: false, message: ''};
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'Đã xảy ra lỗi không mong muốn.',
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-[#0B0908] text-[#F3EAD8] flex items-center justify-center p-6">
          <div className="max-w-md w-full border border-[#8B6B3E]/50 bg-[#17120F] p-6 text-center shadow-2xl">
            <h1 className="text-xl font-bold text-[#FDE68A] mb-2">
              Chân Khí Bị Gián Đoạn
            </h1>
            <p className="text-sm text-[#D6C7AE] mb-5">{this.state.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-5 py-2 bg-[#991B1B] hover:bg-[#B91C1C] text-[#FDE68A] font-semibold border border-[#F59E0B]/40 transition-colors cursor-pointer"
            >
              Tải Lại Giang Hồ
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>
);
