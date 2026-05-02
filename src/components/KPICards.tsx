import type { KPIData } from '../types';
import { getScoreColor, getScoreLabel } from '../utils/scoring';
import { PRICE_PER_MILLION_TOKENS } from '../mockData';
import RingProgress from './RingProgress';

interface KPICardsProps {
  data: KPIData;
  /** 打开规则配置抽屉的回调 — 仅 Card A 响应 */
  onOpenRuleDrawer?: () => void;
}

function KPICard({ children, accent = false }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <div
      className={`
        bg-white rounded-[4px] p-5 flex flex-col gap-2 shadow-sm
        border border-transparent hover:border-gray-200 transition-colors
        ${accent ? 'border-l-[3px]' : ''}
      `}
      style={accent ? { borderLeftColor: '#C8161D' } : undefined}
    >
      {children}
    </div>
  );
}

export default function KPICards({ data, onOpenRuleDrawer }: KPICardsProps) {
  const {
    complianceScore,
    totalClauses,
    highRiskCount,
    processTimeSeconds,
    timeSavedMinutes,
    currentTokens,
  } = data;

  const isEmpty = totalClauses === 0;
  const scoreColor = getScoreColor(complianceScore, isEmpty);
  const scoreLabel = getScoreLabel(complianceScore, isEmpty);

  // 动态计算大模型 API 费用（模块 2）
  const apiCost = ((currentTokens / 1_000_000) * PRICE_PER_MILLION_TOKENS).toFixed(4);

  return (
    <div className="grid grid-cols-4 gap-4 shrink-0">
      {/* 卡片 A：总体合规分 — 上下文规则配置入口 */}
      <button
        onClick={onOpenRuleDrawer}
        className={`
          bg-white rounded-[4px] p-5 flex flex-col gap-2 shadow-sm text-left
          border border-transparent
          transition-all duration-200
          ${onOpenRuleDrawer
            ? 'cursor-pointer hover:shadow-md hover:border-red-200'
            : 'cursor-default'
          }
        `}
        style={{ borderLeftWidth: '3px', borderLeftColor: '#C8161D' }}
      >
        {/* 标题行 + 齿轮引导 */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#6B7280] font-medium tracking-wide">
            总体合规分
          </span>
          {onOpenRuleDrawer && (
            <span className="flex items-center gap-1 text-[10px] text-[#B0B7C3] group-hover:text-[#6B7280] transition-colors">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              规则配置
            </span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-1">
            <span
              className="text-[32px] font-bold leading-none"
              style={{ color: scoreColor }}
            >
              {isEmpty ? '--' : complianceScore}
            </span>
            {!isEmpty && <span className="text-sm text-[#6B7280] font-medium">分</span>}
          </div>
          <RingProgress score={isEmpty ? 0 : complianceScore} />
        </div>
        <span className="text-[11px]" style={{ color: scoreColor }}>
          {scoreLabel}
        </span>
      </button>

      {/* 卡片 B：审核条款总数 */}
      <KPICard>
        <span className="text-xs text-[#6B7280] font-medium tracking-wide">
          审核条款总数
        </span>
        <div className="flex items-baseline gap-1">
          <span className="text-[32px] font-bold text-[#1F2937] leading-none">
            {isEmpty ? '--' : totalClauses}
          </span>
          {!isEmpty && <span className="text-sm text-[#6B7280] font-medium">条</span>}
        </div>
        <span
          className="text-[11px]"
          style={{ color: isEmpty ? '#9CA3AF' : highRiskCount > 0 ? '#DC2626' : '#059669' }}
        >
          {isEmpty ? '暂无数据' : `发现 ${highRiskCount} 处高风险异常`}
        </span>
      </KPICard>

      {/* 卡片 C：系统处理耗时 */}
      <KPICard>
        <span className="text-xs text-[#6B7280] font-medium tracking-wide">
          系统处理耗时
        </span>
        <div className="flex items-baseline gap-1">
          <span className="text-[32px] font-bold text-[#1F2937] leading-none">
            {isEmpty ? '--' : processTimeSeconds}
          </span>
          {!isEmpty && <span className="text-sm text-[#6B7280] font-medium">秒</span>}
        </div>
        <span className={`text-[11px] ${isEmpty ? 'text-[#9CA3AF]' : 'text-[#059669]'}`}>
          {isEmpty ? '等待分析' : `相比人工省时 ${timeSavedMinutes} 分钟`}
        </span>
      </KPICard>

      {/* 卡片 D：大模型算力消耗 — 动态 Token 计费（模块 2） */}
      <KPICard accent>
        <span className="text-xs text-[#6B7280] font-medium tracking-wide">
          本次大模型算力消耗
        </span>
        <div className="flex items-baseline gap-1">
          <span className="text-xs text-[#6B7280]">¥</span>
          <span
            className="text-[32px] font-bold leading-none"
            style={{ color: isEmpty ? '#9CA3AF' : '#C8161D' }}
          >
            {isEmpty ? '--' : apiCost}
          </span>
        </div>
        <span className={`text-[11px] ${isEmpty ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>
          {isEmpty ? '启动质检后核算' : `共消耗 ${currentTokens.toLocaleString()} Tokens`}
        </span>
      </KPICard>
    </div>
  );
}
