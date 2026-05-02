import { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================
// 类型定义
// ============================================================

interface AgentTerminalProps {
  logs: string[];
  /** 当前所处步骤 (0-3)，驱动顶部步骤条高亮 */
  currentStep: number;
}

interface TimelineEntry {
  icon: string;
  message: string;
  highlight?: string;
  style: 'default' | 'green' | 'orange' | 'blue';
}

// ============================================================
// 常量
// ============================================================

const STEPS = [
  { label: '规则引擎加载', icon: '⚙️' },
  { label: '文档结构透视', icon: '📄' },
  { label: '逐条语义比对', icon: '⚡️' },
  { label: '智能修正与汇总', icon: '📊' },
];

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ============================================================
// 日志行解析器 — 将原始日志字符串映射为 Timeline 条目
// ============================================================

function parseLine(line: string): TimelineEntry {
  // [Observation] → 绿色成功态
  if (line.startsWith('[Observation]')) {
    const msg = line.replace('[Observation] ', '');
    return { icon: '✅', message: msg, style: 'green' };
  }

  // [Thought] → 橙色推理态
  if (line.startsWith('[Thought]')) {
    const msg = line.replace('[Thought] ', '');
    // 提取 ⚠ 后面的关键信息作为 highlight
    const warnMatch = msg.match(/⚠\s*(?:警告！)?\s*(.+)/);
    if (warnMatch) {
      return { icon: '🧠', message: 'Agent 深度推演', highlight: warnMatch[1], style: 'orange' };
    }
    return { icon: '🧠', message: msg, style: 'orange' };
  }

  // [Action] → 按子类型分发
  if (line.startsWith('[Action]')) {
    const body = line.replace('[Action] ', '');

    // 文档解析
    if (body.startsWith('parse_document')) {
      const detail = body.replace('parse_document -> ', '');
      return { icon: '📄', message: detail, style: 'default' };
    }

    // 条款比对
    if (body.startsWith('compare_terms')) {
      const match = body.match(/「(.+?)」/);
      return {
        icon: '⚡️',
        message: '正在比对',
        highlight: match?.[1],
        style: 'blue',
      };
    }

    // 深度诊断
    if (body.startsWith('deep_analyze') || body.includes('deep_analyze')) {
      const detail = body.replace('动态触发: deep_analyze ', '').replace('deep_analyze -> ', '');
      return { icon: '🔬', message: detail, style: 'orange' };
    }

    // 报告生成
    if (body.startsWith('generate_report')) {
      const detail = body.replace('generate_report -> ', '');
      return { icon: '📊', message: detail, style: 'default' };
    }

    // 通用 Action fallback
    return { icon: '🔄', message: body, style: 'default' };
  }

  // [System] → 灰色系统信息
  if (line.startsWith('[System]')) {
    const msg = line.replace('[System] ', '').replace('▸ ', '');
    return { icon: '⚙️', message: msg, style: 'default' };
  }

  // 兜底
  return { icon: '•', message: line, style: 'default' };
}

// ============================================================
// 内联 SVG 图标（避免外部依赖）
// ============================================================

function SparkleIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke={active ? '#C8161D' : '#D1D5DB'} strokeWidth="1.8"
      className={active ? 'animate-spin' : ''}
    >
      <path d="M12 2l1.5 5.5L19 9l-5.5 1.5L12 16l-1.5-5.5L5 9l5.5-1.5z" />
      <path d="M18 15l1 3 3 1-3 1-1 3-1-3-3-1 3-1z" opacity="0.5" />
    </svg>
  );
}

// ============================================================
// 组件主体
// ============================================================

export default function AgentTerminal({ logs, currentStep }: AgentTerminalProps) {
  // —— 打字机状态 ——
  const [completedLogs, setCompletedLogs] = useState<string[]>([]);
  const [currentTypingLog, setCurrentTypingLog] = useState('');
  const [cursorVisible, setCursorVisible] = useState(true);

  // —— 计时器 ——
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // —— Refs ——
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const processedCountRef = useRef(0);
  const processingRef = useRef(false);
  const abortRef = useRef(false);

  // ====== 计时器：从第一条日志出现时开始计时 ======
  useEffect(() => {
    if (logs.length > 0 && !timerRef.current) {
      const start = Date.now();
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - start) / 1000));
      }, 200);
    }
    if (logs.length === 0 && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
      setElapsed(0);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [logs.length]);

  // ====== 光标闪烁 ======
  useEffect(() => {
    const tick = setInterval(() => setCursorVisible((v) => !v), 530);
    return () => clearInterval(tick);
  }, []);

  // ====== 自动滚动 ======
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [completedLogs, currentTypingLog]);

  // ====== 打字机引擎 ======
  const typeLine = useCallback(async (line: string) => {
    for (let i = 0; i <= line.length; i++) {
      if (abortRef.current) return;
      setCurrentTypingLog(line.slice(0, i));
      await delay(16);
    }
  }, []);

  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    abortRef.current = false;

    while (processedCountRef.current < logs.length) {
      if (abortRef.current) { processingRef.current = false; return; }
      const line = logs[processedCountRef.current];
      await typeLine(line);
      if (abortRef.current) { processingRef.current = false; return; }
      setCompletedLogs((prev) => [...prev, line]);
      setCurrentTypingLog('');
      processedCountRef.current++;
      if (processedCountRef.current < logs.length && !abortRef.current) {
        await delay(250 + Math.random() * 400);
      }
    }
    processingRef.current = false;
  }, [logs, typeLine]);

  // ====== 日志变化 → 消费队列 ======
  useEffect(() => {
    if (logs.length === 0) {
      abortRef.current = true;
      processedCountRef.current = 0;
      processingRef.current = false;
      setCompletedLogs([]);
      setCurrentTypingLog('');
      return;
    }
    processQueue();
    return () => {
      abortRef.current = true;
      const t = setTimeout(() => { processingRef.current = false; }, 50);
      return () => clearTimeout(t);
    };
  }, [logs.length, processQueue]);

  const isActive = currentTypingLog.length > 0 || processingRef.current;

  // ====== 辅助渲染 ======

  function formatTime(s: number): string {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }

  function entryStyle(e: TimelineEntry): string {
    switch (e.style) {
      case 'green': return 'text-emerald-700';
      case 'orange': return 'text-amber-700';
      case 'blue': return 'text-blue-700';
      default: return 'text-gray-700';
    }
  }

  function highlightStyle(e: TimelineEntry): string {
    switch (e.style) {
      case 'blue': return 'text-blue-600 font-semibold';
      case 'orange': return 'text-amber-600 font-medium';
      default: return '';
    }
  }

  // ====== 渲染 ======
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* ================================================================ */}
        {/* 标题栏 */}
        {/* ================================================================ */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <SparkleIcon active={isActive} />
            <span className="text-[13px] font-medium text-gray-700">
              多智能体联合审查中{isActive ? '...' : ''}
            </span>
            {!isActive && completedLogs.length > 0 && (
              <span className="text-[11px] text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">
                已完成
              </span>
            )}
          </div>
          <span className="text-[12px] text-gray-400 font-mono tabular-nums">
            {formatTime(elapsed)}
          </span>
        </div>

        {/* ================================================================ */}
        {/* 全局步骤条 */}
        {/* ================================================================ */}
        <div className="flex items-center px-5 py-3 border-b border-gray-50 bg-gray-50/50 shrink-0 gap-0">
          {STEPS.map((step, i) => {
            const done = i < currentStep;
            const active = i === currentStep;
            return (
              <div key={step.label} className="flex items-center flex-1 last:flex-none">
                {/* 步骤节点 */}
                <div className="flex items-center gap-1.5">
                  <span
                    className={`
                      inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px]
                      transition-colors duration-300
                      ${done
                        ? 'bg-emerald-100 text-emerald-600'
                        : active
                          ? 'bg-red-50 text-[#C8161D] ring-2 ring-red-100'
                          : 'bg-gray-100 text-gray-400'
                      }
                    `}
                  >
                    {done ? '✓' : step.icon}
                  </span>
                  <span
                    className={`
                      text-[11px] whitespace-nowrap transition-colors duration-300
                      ${active ? 'text-[#C8161D] font-semibold' : done ? 'text-gray-500' : 'text-gray-400'}
                    `}
                  >
                    {step.label}
                  </span>
                </div>
                {/* 连接线 */}
                {i < STEPS.length - 1 && (
                  <div className="flex-1 mx-2 h-px bg-gray-200">
                    <div
                      className="h-full bg-[#C8161D] transition-all duration-500"
                      style={{ width: i < currentStep ? '100%' : '0%' }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ================================================================ */}
        {/* 日志时间线 */}
        {/* ================================================================ */}
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto px-5 py-4 space-y-2.5"
        >
          {/* 空态 */}
          {completedLogs.length === 0 && !currentTypingLog && (
            <div className="flex items-center gap-3 text-gray-400 py-2">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-pulse" />
              <span className="text-[13px]">等待任务调度...</span>
            </div>
          )}

          {/* 已完成的条目 — 带 fade-in 动画 */}
          {completedLogs.map((line, i) => {
            const entry = parseLine(line);
            return (
              <div
                key={i}
                className="flex items-start gap-3 animate-[fadeSlideIn_0.35s_ease-out]"
              >
                {/* 图标 */}
                <span className="text-[15px] leading-6 shrink-0 mt-px">{entry.icon}</span>
                {/* 内容 */}
                <div className="flex-1 min-w-0">
                  <span className={`text-[13px] leading-6 ${entryStyle(entry)}`}>
                    {entry.message}
                  </span>
                  {entry.highlight && (
                    <>
                      {' '}
                      <span className={`text-[13px] leading-6 ${highlightStyle(entry)}`}>
                        {entry.highlight}
                      </span>
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {/* 当前正在打字的行 — 打字机动画 */}
          {currentTypingLog && (() => {
            const entry = parseLine(currentTypingLog);
            return (
              <div className="flex items-start gap-3">
                <span className="text-[15px] leading-6 shrink-0 mt-px">{entry.icon}</span>
                <div className="flex-1 min-w-0">
                  <span className={`text-[13px] leading-6 ${entryStyle(entry)}`}>
                    {entry.message}
                  </span>
                  {entry.highlight && (
                    <>
                      {' '}
                      <span className={`text-[13px] leading-6 ${highlightStyle(entry)}`}>
                        {entry.highlight}
                      </span>
                    </>
                  )}
                  <span
                    className={`
                      inline-block ml-0.5 w-[7px] h-[15px] align-text-bottom
                      bg-[#C8161D] transition-opacity duration-100
                      ${cursorVisible ? 'opacity-100' : 'opacity-30'}
                    `}
                  />
                </div>
              </div>
            );
          })()}

          {/* 底部哨兵 */}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}
