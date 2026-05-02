import { useState } from 'react';
import type { ClauseRecord, CheckStatus } from '../types';

interface ClauseAccordionProps {
  record: ClauseRecord;
  onMarkError: (id: string) => void;
  onAcceptFix: (id: string) => void;
}

/** 状态标签配置映射 */
const STATUS_CONFIG: Record<CheckStatus, { label: string; textColor: string; bgColor: string }> = {
  match: { label: 'Match — 一致', textColor: '#059669', bgColor: '#D1FAE5' },
  missing: { label: 'Missing — 缺失', textColor: '#D97706', bgColor: '#FEF3C7' },
  variance: { label: 'Variance — 差异', textColor: '#DC2626', bgColor: '#FEE2E2' },
};

/** 展开/收起箭头图标 */
const ChevronIcon = ({ expanded }: { expanded: boolean }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

export default function ClauseAccordion({ record, onMarkError, onAcceptFix }: ClauseAccordionProps) {
  const [expanded, setExpanded] = useState(false);
  const { title, status, confidence, sourceText, contractText, highlights, suggestion, aiAnalysis, isCrucial } = record;
  const config = STATUS_CONFIG[status];

  /** 高亮差异词汇 —— 将指定词汇包裹在 <mark> 标签中 */
  const renderHighlightedText = (text: string) => {
    if (!highlights || highlights.length === 0) return text;

    const pattern = highlights.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const regex = new RegExp(`(${pattern})`, 'g');
    const parts = text.split(regex);

    return parts.map((part, i) => {
      const isHighlight = highlights.some((h) => h === part);
      return isHighlight ? (
        <mark
          key={i}
          style={{ backgroundColor: '#FEE2E2', color: '#DC2626', padding: '1px 2px', borderRadius: '2px' }}
        >
          {part}
        </mark>
      ) : (
        <span key={i}>{part}</span>
      );
    });
  };

  return (
    <div
      className="bg-white rounded-[4px] shadow-sm border overflow-hidden transition-colors"
      style={{ borderColor: isCrucial && status !== 'match' ? '#FECACA' : '#F3F4F6' }}
    >
      {/* -------- Card Header：折叠状态 -------- */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left"
      >
        {/* 左侧：条款名称 + 展开箭头 + 高风险标记 */}
        <div className="flex items-center gap-2 min-w-0">
          <ChevronIcon expanded={expanded} />
          <span className="text-sm font-medium text-[#1F2937] truncate">{title}</span>
          {/* 高风险关键条款标记 */}
          {isCrucial && (
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-[4px] shrink-0"
              style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}
            >
              关键
            </span>
          )}
        </div>

        {/* 右侧：状态标签 + AI置信度 */}
        <div className="flex items-center gap-3 shrink-0 ml-4">
          {/* 状态标签 */}
          <span
            className="text-[11px] font-medium px-2 py-0.5 rounded-[4px] whitespace-nowrap"
            style={{ color: config.textColor, backgroundColor: config.bgColor }}
          >
            {config.label}
          </span>
          {/* AI 置信度 */}
          <span className="text-[11px] text-[#6B7280] whitespace-nowrap">
            AI 置信度 {confidence}%
          </span>
        </div>
      </button>

      {/* -------- Card Body：展开状态 -------- */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-50">
          <div className="grid grid-cols-1 gap-4 mt-4">
            {/* 第零行：AI 差异分析（优先展示，让法务快速理解问题） */}
            <div>
              <span className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wide">
                AI 语义分析
              </span>
              <div
                className="mt-1 p-3 rounded-[4px] text-sm leading-relaxed"
                style={{
                  backgroundColor: status === 'match' ? '#F0FDF4' : '#FFF7ED',
                  color: status === 'match' ? '#059669' : '#1F2937',
                  borderLeft: `3px solid ${config.textColor}`,
                }}
              >
                {aiAnalysis}
              </div>
            </div>

            {/* 第一行：采购结果原文 */}
            <div>
              <span className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wide">
                采购结果原文
              </span>
              <div className="mt-1 p-3 bg-[#F9FAFB] rounded-[4px] text-sm text-[#1F2937] leading-relaxed">
                {sourceText}
              </div>
            </div>

            {/* 第二行：合同文件原文 */}
            <div>
              <span className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wide">
                合同文件原文
              </span>
              <div className="mt-1 p-3 bg-[#F9FAFB] rounded-[4px] text-sm text-[#1F2937] leading-relaxed">
                {status === 'missing' ? (
                  <span className="text-[#D97706] italic">（该条款在合同文件中缺失）</span>
                ) : (
                  renderHighlightedText(contractText)
                )}
              </div>
            </div>

            {/* 第三行：多智能体合规修正建议（仅非 Match 状态展示） */}
            {status !== 'match' && (
              <div>
                <span className="text-[11px] font-medium text-[#6B7280] uppercase tracking-wide">
                  多智能体合规修正建议
                </span>
                <div
                  className="mt-1 p-3 rounded-[4px] text-sm leading-relaxed whitespace-pre-line"
                  style={{
                    borderLeft: '3px solid #C8161D',
                    backgroundColor: '#FFF5F5',
                    color: '#1F2937',
                  }}
                >
                  {suggestion}
                </div>
              </div>
            )}
          </div>

          {/* -------- 底部操作按钮：人机协同闭环 -------- */}
          <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-gray-100">
            {/* 次级按钮：标为误判 */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMarkError(record.id);
              }}
              className="
                px-4 py-1.5 text-sm font-medium text-[#6B7280] rounded-[4px]
                border border-gray-300 hover:border-gray-400 hover:text-[#1F2937]
                transition-colors bg-white
              "
            >
              标为误判
            </button>

            {/* 主按钮：采纳建议 — 招行红 */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAcceptFix(record.id);
              }}
              className="
                px-4 py-1.5 text-sm font-medium text-white rounded-[4px]
                transition-colors
              "
              style={{ backgroundColor: '#C8161D' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#A01217';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#C8161D';
              }}
            >
              采纳建议
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
