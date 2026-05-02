import { useEffect } from 'react';
import type { ToastMessage } from '../types';

interface ToastProps {
  message: ToastMessage | null;
  onDismiss: () => void;
}

/**
 * 全局 Toast 轻提示
 * 用于负反馈沉淀闭环的人机协同交互反馈
 */
export default function Toast({ message, onDismiss }: ToastProps) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDismiss, 2800);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 toast-enter">
      <div
        className="flex items-center gap-3 px-5 py-3 rounded-[4px] shadow-lg text-sm font-medium text-white"
        style={{ backgroundColor: '#1F2937' }}
      >
        {/* 对勾图标 */}
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#059669"
          strokeWidth="2"
          className="shrink-0"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span>{message.text}</span>
      </div>
    </div>
  );
}
