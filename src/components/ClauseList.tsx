import { useState, useMemo } from 'react';
import type { ClauseRecord } from '../types';
import { simulateExport } from '../utils/exportReport';
import ClauseAccordion from './ClauseAccordion';

type FilterType = 'Risk' | 'Variance' | 'Missing' | 'Match';

interface ClauseListProps {
  clauses: ClauseRecord[];
  isLoading: boolean;
  onMarkError: (id: string) => void;
  onAcceptFix: (id: string) => void;
  /** 导出成功后回调（用于上层弹 Toast） */
  onExportComplete?: () => void;
}

const FILTER_OPTIONS: { key: FilterType; label: string; activeClass: string }[] = [
  { key: 'Risk', label: '风险项', activeClass: 'bg-orange-50 text-orange-600 border-orange-200' },
  { key: 'Variance', label: '差异', activeClass: 'bg-red-50 text-red-600 border-red-200' },
  { key: 'Missing', label: '缺失', activeClass: 'bg-yellow-50 text-yellow-600 border-yellow-200' },
  { key: 'Match', label: '一致', activeClass: 'bg-green-50 text-green-600 border-green-200' },
];

/**
 * 条款差异比对列表 —— 右栏
 * 异常驱动过滤 Tabs + 导出闭环
 */
export default function ClauseList({
  clauses,
  isLoading,
  onMarkError,
  onAcceptFix,
  onExportComplete,
}: ClauseListProps) {
  const hasData = clauses.length > 0;
  const [exporting, setExporting] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('Risk');

  const counts = useMemo(() => {
    const match = clauses.filter((c) => c.status === 'match').length;
    const variance = clauses.filter((c) => c.status === 'variance').length;
    const missing = clauses.filter((c) => c.status === 'missing').length;
    return { match, variance, missing, risk: variance + missing };
  }, [clauses]);

  const displayClauses = useMemo(() => {
    if (activeFilter === 'Risk') return clauses.filter((c) => c.status === 'variance' || c.status === 'missing');
    return clauses.filter((c) => {
      if (activeFilter === 'Variance') return c.status === 'variance';
      if (activeFilter === 'Missing') return c.status === 'missing';
      return c.status === 'match';
    });
  }, [clauses, activeFilter]);

  /** 触发导出流程：Loading → 延迟 → 下载 → Toast */
  const handleExport = async () => {
    if (!hasData || exporting) return;
    setExporting(true);
    try {
      await simulateExport(clauses);
      onExportComplete?.();
    } catch {
      // 模拟导出不会失败；保留 catch 以防未来接入真实 API
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 shrink-0">
        <span className="text-sm font-medium text-[#1F2937] shrink-0">条款差异比对</span>

        <div className="flex items-center gap-3">
          {/* 过滤 Tabs — 胶囊按钮组 */}
          {!hasData && !isLoading ? null : isLoading ? (
            <span className="text-[11px] text-[#9CA3AF] animate-pulse">
              AI 正在进行分析比对...
            </span>
          ) : (
            <div className="flex items-center gap-1 bg-gray-100 rounded-md p-0.5">
              {FILTER_OPTIONS.map(({ key, label, activeClass }) => {
                const isActive = activeFilter === key;
                const count =
                  key === 'Risk' ? counts.risk : key === 'Variance' ? counts.variance : key === 'Missing' ? counts.missing : counts.match;
                return (
                  <button
                    key={key}
                    onClick={() => setActiveFilter(key)}
                    className={`
                      text-[11px] font-medium px-2.5 py-1 rounded-[5px] border border-transparent
                      transition-colors duration-150 whitespace-nowrap
                      ${isActive
                        ? activeClass
                        : 'text-gray-500 hover:bg-gray-200/70'
                      }
                    `}
                  >
                    {label}&nbsp;{count}
                  </button>
                );
              })}
            </div>
          )}

          {/* 导出按钮 — Loading 状态 */}
          <button
            onClick={handleExport}
            disabled={!hasData || exporting}
            className={`
              flex items-center gap-1.5 px-3 py-1 text-[11px] font-medium rounded-[4px]
              border transition-colors shrink-0 min-w-[160px] justify-center
              ${hasData && !exporting
                ? 'border-gray-300 text-[#4B5563] hover:text-[#C8161D] hover:border-[#C8161D]'
                : 'border-gray-200 text-[#D1D5DB] cursor-not-allowed'
              }
            `}
          >
            {exporting ? (
              <>
                {/* 加载 Spinner */}
                <svg
                  className="animate-spin"
                  width="13" height="13" viewBox="0 0 24 24" fill="none"
                >
                  <circle cx="12" cy="12" r="10" stroke="#D1D5DB" strokeWidth="3" />
                  <path
                    d="M12 2a10 10 0 0 1 10 10"
                    stroke="#9CA3AF" strokeWidth="3" strokeLinecap="round"
                  />
                </svg>
                正在生成报告...
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                导出完整质检报告
              </>
            )}
          </button>
        </div>
      </div>

      {/* 列表区域 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-[4px] shadow-sm border border-gray-100 p-4 animate-pulse"
              >
                <div className="flex items-center justify-between">
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="flex gap-3">
                    <div className="h-5 bg-gray-200 rounded w-20" />
                    <div className="h-5 bg-gray-200 rounded w-24" />
                  </div>
                </div>
              </div>
            ))}
            <p className="text-center text-[11px] text-[#9CA3AF] py-4 animate-pulse">
              正在深度分析法律与商务条款差异...
            </p>
          </>
        ) : hasData ? (
          <>
            {displayClauses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                <p className="text-sm text-[#9CA3AF]">
                  {activeFilter === 'Risk' ? '当前无风险项' : activeFilter === 'Variance' ? '当前无差异条款' : activeFilter === 'Missing' ? '当前无缺失条款' : '当前无一致条款'}
                </p>
                <p className="text-[11px] text-[#D1D5DB]">切换上方过滤标签查看其他类别</p>
              </div>
            ) : (
              <>
                {displayClauses.map((record) => (
                  <ClauseAccordion
                    key={record.id}
                    record={record}
                    onMarkError={onMarkError}
                    onAcceptFix={onAcceptFix}
                  />
                ))}
                <p className="text-center text-[11px] text-[#9CA3AF] py-4">
                  —— 以上为当前筛选类别全部条款比对结果 ——
                </p>
              </>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3">
            <svg
              width="40" height="40" viewBox="0 0 24 24" fill="none"
              stroke="#D1D5DB" strokeWidth="1.5"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            <p className="text-sm text-[#9CA3AF]">
              请上传两份文档并点击"开始智能质检"
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
