import { useState } from 'react';
import type { HistoryRecord } from '../types';

/**
 * 质检历史记录表格视图（模块 5）
 * 核心功能 2：「查看报告」→ 切换 workspace + 加载数据
 *           「下载附件」→ 触发导出闭环
 */

function ScoreTag({ score }: { score: number }) {
  const color = score >= 85 ? '#059669' : score >= 60 ? '#D97706' : '#DC2626';
  const bg = score >= 85 ? '#D1FAE5' : score >= 60 ? '#FEF3C7' : '#FEE2E2';
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-[4px] text-[11px] font-medium"
      style={{ color, backgroundColor: bg }}
    >
      {score}分
    </span>
  );
}

interface HistoryViewProps {
  historyList: HistoryRecord[];
  onViewReport: (record: HistoryRecord) => void;
  onExportReport: (record: HistoryRecord) => void;
}

export default function HistoryView({ historyList, onViewReport, onExportReport }: HistoryViewProps) {
  const [search, setSearch] = useState('');
  /** 跟踪当前正在导出的任务编号（用于按钮 Loading 态） */
  const [exportingTaskId, setExportingTaskId] = useState<string | null>(null);

  const filtered = historyList.filter(
    (r) =>
      r.taskId.toLowerCase().includes(search.toLowerCase()) ||
      r.projectName.toLowerCase().includes(search.toLowerCase()),
  );

  /** 空状态：尚无任何审核记录 */
  if (historyList.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-5 gap-5">
        <svg
          width="56" height="56" viewBox="0 0 24 24" fill="none"
          stroke="#D1D5DB" strokeWidth="1.2"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <div className="text-center">
          <p className="text-sm font-medium text-[#9CA3AF]">暂无质检历史记录</p>
          <p className="text-[12px] text-[#D1D5DB] mt-1">
            完成首次智能质检后，记录将自动保存于此
          </p>
        </div>
      </div>
    );
  }

  const handleExport = (record: HistoryRecord) => {
    if (exportingTaskId) return;
    setExportingTaskId(record.taskId);
    onExportReport(record);
    // 模拟导出完成后恢复按钮状态（实际由父组件控制，这里提供 fallback）
    setTimeout(() => setExportingTaskId(null), 1800);
  };

  return (
    <div className="flex-1 flex flex-col p-5 overflow-hidden">
      {/* 顶部：标题 + 搜索框 */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <h2 className="text-base font-semibold text-[#1F2937]">质检历史记录</h2>
        <div className="relative">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]"
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="输入任务编号或项目名称搜索"
            className="
              w-72 pl-8 pr-3 py-1.5 text-[13px] rounded-[4px] border border-gray-300
              bg-white outline-none transition-colors
              focus:border-[#C8161D] focus:ring-1 focus:ring-[#FECACA]
              placeholder:text-[#B0B7C3]
            "
          />
        </div>
      </div>

      {/* 表格容器 */}
      <div className="flex-1 overflow-auto bg-white rounded-[4px] shadow-sm border border-gray-100">
        <table className="w-full text-[13px] border-collapse">
          <thead>
            <tr className="bg-gray-50 text-[#6B7280] text-[11px] font-medium uppercase tracking-wide">
              <th className="text-left px-4 py-2.5 w-[140px]">任务编号</th>
              <th className="text-left px-4 py-2.5">采购项目名称</th>
              <th className="text-left px-4 py-2.5 w-[150px]">质检时间</th>
              <th className="text-center px-4 py-2.5 w-[100px]">总体合规分</th>
              <th className="text-left px-4 py-2.5 w-[140px]">风险情况</th>
              <th className="text-center px-4 py-2.5 w-[160px]">操作</th>
            </tr>
          </thead>

          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-16 text-[#9CA3AF] text-sm">
                  未找到匹配的质检记录
                </td>
              </tr>
            ) : (
              filtered.map((record) => (
                <tr
                  key={record.taskId}
                  className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors"
                >
                  <td className="px-4 py-3 text-[#1F2937] font-medium">{record.taskId}</td>
                  <td className="px-4 py-3 text-[#1F2937]">{record.projectName}</td>
                  <td className="px-4 py-3 text-[#6B7280] text-[12px]">{record.checkTime}</td>
                  <td className="px-4 py-3 text-center"><ScoreTag score={record.complianceScore} /></td>
                  <td className="px-4 py-3 text-[#1F2937] text-[12px]">{record.riskSummary}</td>

                  {/* 操作列：查看报告 + 下载附件 */}
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-4">
                      {/* 查看报告 — 切换至 home 并加载历史数据 */}
                      <button
                        onClick={() => onViewReport(record)}
                        className="text-[#4B5563] hover:text-[#C8161D] text-[12px] transition-colors"
                      >
                        查看报告
                      </button>

                      {/* 下载附件 — 触发导出闭环 */}
                      <button
                        onClick={() => handleExport(record)}
                        disabled={exportingTaskId === record.taskId}
                        className={`
                          text-[12px] transition-colors flex items-center gap-1
                          ${exportingTaskId === record.taskId
                            ? 'text-[#B0B7C3] cursor-not-allowed'
                            : 'text-[#4B5563] hover:text-[#C8161D]'
                          }
                        `}
                      >
                        {exportingTaskId === record.taskId ? (
                          <>
                            <svg className="animate-spin" width="11" height="11" viewBox="0 0 24 24" fill="none">
                              <circle cx="12" cy="12" r="10" stroke="#D1D5DB" strokeWidth="3" />
                              <path d="M12 2a10 10 0 0 1 10 10" stroke="#9CA3AF" strokeWidth="3" strokeLinecap="round" />
                            </svg>
                            导出中
                          </>
                        ) : (
                          '下载附件'
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
