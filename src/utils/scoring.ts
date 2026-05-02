/**
 * 合规分计算引擎 —— scoring.ts
 *
 * 采用"基准 100 分扣减法"：每发现一处风险按等级扣分，最低 0 分。
 */

import type { ClauseRecord, RuleConfig } from '../types';

/** 风险等级 */
export type RiskLevel = 'high' | 'medium' | 'low';

/** 单条风险记录 */
export interface RiskItem {
  level: RiskLevel;
  clauseId: string;
  clauseName: string;
}

/** 各等级扣分权重 */
const DEDUCTION: Record<RiskLevel, number> = {
  high: 15,
  medium: 8,
  low: 3,
};

/**
 * 纯函数：基于风险项列表计算合规分
 *
 * @param variances — 差异条款风险列表
 * @param missing    — 缺失条款风险列表
 * @returns 最终合规分（0–100）
 */
export function calculateScore(variances: RiskItem[], missing: RiskItem[]): number {
  const allRisks = [...variances, ...missing];
  const totalDeduction = allRisks.reduce((sum, item) => sum + DEDUCTION[item.level], 0);
  return Math.max(0, 100 - totalDeduction);
}

/** 合规分数颜色映射 */
export function getScoreColor(score: number, isEmpty: boolean): string {
  if (isEmpty) return '#9CA3AF';
  if (score >= 85) return '#059669';
  if (score >= 60) return '#D97706';
  return '#C8161D';
}

/** 合规分状态文案 */
export function getScoreLabel(score: number, isEmpty: boolean): string {
  if (isEmpty) return '等待上传文件并启动智能质检';
  if (score >= 85) return '合规状态良好';
  if (score >= 60) return '合规风险预警，请重点关注中高危条款';
  return '合规风险极高，触发系统阻断';
}

/** 环形进度条颜色（配合 RingProgress 组件） */
export function getRingColor(score: number): string {
  if (score >= 85) return '#059669';
  if (score >= 60) return '#D97706';
  return '#DC2626';
}

// ============================================================
// 规则引擎重算 —— 基于已有比对结果 + 新规则配置实时重打分
// ============================================================

/**
 * 关键词 → 必检类别映射
 * 通过条款标题的语义关键词判断其属于哪个法务红线类别
 */
const MANDATORY_KEYWORDS: Record<keyof RuleConfig['mandatoryChecks'], string[]> = {
  breachOfContract: ['违约', '赔偿', '罚则', '违约金', '赔偿上限'],
  confidentiality: ['保密', '商业秘密', '机密', 'NDA'],
  disputeResolution: ['争议', '管辖', '仲裁', '诉讼', '法律适用'],
  dataSecurity: ['数据安全', '个人信息', '隐私', '信息保护', '网络安全'],
  paymentTerms: ['付款', '支付', '结算', '货款', '预付款'],
  warrantyTerms: ['质保', '保修', '维护', '售后', '缺陷责任'],
};

/**
 * 判断某条款是否命中给定的必检红线
 */
function matchesAnyMandatory(title: string, checks: RuleConfig['mandatoryChecks']): boolean {
  for (const [key, keywords] of Object.entries(MANDATORY_KEYWORDS)) {
    if (!checks[key as keyof typeof checks]) continue;
    for (const kw of keywords) {
      if (title.includes(kw)) return true;
    }
  }
  return false;
}

/**
 * 【纯函数】基于已有 ClauseRecord 数组与新规则配置重新计算合规分
 *
 * 逻辑：
 *   1. 跳过 Match 条款（不计入扣分）
 *   2. 对每条非 Match 条款，按原始 riskLevel 取基础扣分值
 *   3. 如果条款命中用户启用的「必检红线」，扣分权重 ×2（红线加倍）
 *   4. 价格容差：若条款标题含「价格/金额/报价」且 riskLevel 为 medium，
 *      在容差范围内可降级为 low（体现商务谈判弹性）
 *   5. 总分 = max(0, 100 - 总扣分)
 *
 * @param clauses - LLM 已返回的条款比对结果
 * @param config  - 用户当前设定的规则配置
 * @returns 重算后的合规分（0–100）
 */
export function recalculateScore(clauses: ClauseRecord[], config: RuleConfig): number {
  let totalDeduction = 0;

  for (const clause of clauses) {
    if (clause.status === 'match') continue;

    let effectiveLevel: RiskLevel = clause.riskLevel;

    // 价格容差降级：中等风险的价格条款在容差阈值内从宽处理
    if (
      config.priceTolerance > 0 &&
      effectiveLevel === 'medium' &&
      /价格|金额|报价|总价|单价/.test(clause.title)
    ) {
      effectiveLevel = 'low';
    }

    let deduction = DEDUCTION[effectiveLevel];

    // 必检红线翻倍：命中用户启用的法务红线类别时，扣分权重 ×2
    if (matchesAnyMandatory(clause.title, config.mandatoryChecks)) {
      deduction *= 2;
    }

    totalDeduction += deduction;
  }

  return Math.max(0, 100 - totalDeduction);
}
