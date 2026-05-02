import type { ClauseRecord, KPIData, HistoryRecord } from './types';
import { calculateScore } from './utils/scoring';
import type { RiskItem } from './utils/scoring';

/**
 * 大模型计费常量（每百万 Token 成本，单位：元）
 */
export const PRICE_PER_MILLION_TOKENS = 2.0;

/**
 * 默认 KPI 指标（LLM 分析前的空态占位值）
 */
export const defaultKPIData: KPIData = {
  complianceScore: 0,
  totalClauses: 0,
  highRiskCount: 0,
  processTimeSeconds: 0,
  timeSavedMinutes: 29,
  currentTokens: 0,
};

// ============================================================
// 合规分计算
// ============================================================

function extractRiskItems(clauses: ClauseRecord[]): {
  variances: RiskItem[];
  missing: RiskItem[];
} {
  const variances: RiskItem[] = [];
  const missing: RiskItem[] = [];

  for (const c of clauses) {
    if (c.status === 'match') continue;
    const item: RiskItem = { level: c.riskLevel, clauseId: c.id, clauseName: c.title };
    if (c.status === 'variance') variances.push(item);
    else if (c.status === 'missing') missing.push(item);
  }

  return { variances, missing };
}

/**
 * 根据 LLM 分析结果动态计算 KPI 指标（基准 100 分扣减法）
 */
export function computeKPIData(
  clauses: ClauseRecord[],
  processTimeSeconds: number,
  currentTokens: number,
): KPIData {
  const totalClauses = clauses.length;
  if (totalClauses === 0) return defaultKPIData;

  const { variances, missing } = extractRiskItems(clauses);
  const complianceScore = calculateScore(variances, missing);

  const highRiskCount = clauses.filter(
    (c) => c.riskLevel === 'high' && c.status !== 'match',
  ).length;

  return {
    complianceScore,
    totalClauses,
    highRiskCount,
    processTimeSeconds,
    timeSavedMinutes: 29,
    currentTokens,
  };
}

// ============================================================
// 质检历史记录 Mock 数据
// ============================================================

export const mockHistoryRecords: HistoryRecord[] = [
  {
    taskId: 'RPT-2026-001',
    projectName: '2025分行核心交换机集中采购',
    checkTime: '2026-05-01 14:30',
    complianceScore: 55,
    riskSummary: '2处高危, 3处中危',
  },
  {
    taskId: 'RPT-2026-002',
    projectName: '总行办公区弱电改造工程',
    checkTime: '2026-04-28 09:15',
    complianceScore: 88,
    riskSummary: '无高危, 1处低危',
  },
  {
    taskId: 'RPT-2026-003',
    projectName: '信用卡中心数据分析平台采购',
    checkTime: '2026-04-25 16:42',
    complianceScore: 72,
    riskSummary: '1处高危, 2处中危',
  },
  {
    taskId: 'RPT-2026-004',
    projectName: '分行智能柜台设备租赁项目',
    checkTime: '2026-04-20 11:08',
    complianceScore: 96,
    riskSummary: '无高危, 1处低危',
  },
];

// ============================================================
// 历史记录对应的 Mock 条款数据（用于「查看报告」功能）
// ============================================================

export const mockHistoryClauses: Record<string, { clauses: ClauseRecord[]; kpi: KPIData }> = {
  'RPT-2026-001': {
    clauses: [
      {
        id: 'hist-001-01', title: '违约责任与赔偿上限条款', status: 'variance',
        confidence: 98, sourceText: '逾期每日按总金额0.5%支付违约金，上限15%。',
        contractText: '逾期每日按总金额0.05%支付违约金，上限5%。',
        highlights: ['0.05%', '5%'],
        suggestion: '修改违约金比例至0.5%/日，上限恢复至15%，弥补实际损失超出部分。',
        aiAnalysis: '违约金比例从0.5%被大幅压低至0.05%，赔偿上限从15%降至5%，存在严重履约风险。',
        isCrucial: true, riskLevel: 'high',
      },
      {
        id: 'hist-001-02', title: '付款条件条款', status: 'variance',
        confidence: 96, sourceText: '设备到货验收合格后30个自然日内支付95%货款。',
        contractText: '设备到货验收合格后90个自然日内支付95%货款。',
        highlights: ['90'],
        suggestion: '将付款期限从90日恢复为30个自然日，避免采购方资金占用过长。',
        aiAnalysis: '付款期限从30日被延长至90日，明显对卖方有利，采购方资金占用成本增加。',
        isCrucial: true, riskLevel: 'high',
      },
      {
        id: 'hist-001-03', title: '数据安全与保密条款', status: 'missing',
        confidence: 97, sourceText: '卖方须遵守《个人信息保护法》相关规定，承担永久保密义务。',
        contractText: '',
        suggestion: '在合同附则中补充完整保密条款，明确永久保密义务及违约责任。',
        aiAnalysis: '采购结果明确要求保密条款，但合同文件完全缺失此项。',
        isCrucial: true, riskLevel: 'high',
      },
      {
        id: 'hist-001-04', title: '质保期限条款', status: 'variance',
        confidence: 94, sourceText: '设备整机质保期为到货验收合格之日起36个月。',
        contractText: '设备整机质保期为到货验收合格之日起12个月。',
        highlights: ['12'],
        suggestion: '将质保期从12个月恢复为36个月，或在商务谈判中争取不低于24个月的质保期。',
        aiAnalysis: '质保期从36个月缩减至12个月，与行业标准及采购需求存在较大偏差。',
        isCrucial: false, riskLevel: 'medium',
      },
      {
        id: 'hist-001-05', title: '验收标准条款', status: 'match',
        confidence: 99, sourceText: '按GB/T 28041-2011标准执行加电验收，到货5个工作日内完成。',
        contractText: '按GB/T 28041-2011标准执行加电验收，到货5个工作日内完成。',
        suggestion: '', aiAnalysis: '验收标准条款双方文本完全一致，无需修改。',
        isCrucial: false, riskLevel: 'low',
      },
    ],
    kpi: { complianceScore: 55, totalClauses: 5, highRiskCount: 3, processTimeSeconds: 12.3, timeSavedMinutes: 29, currentTokens: 14580 },
  },
  'RPT-2026-002': {
    clauses: [
      {
        id: 'hist-002-01', title: '设备清单与规格条款', status: 'match',
        confidence: 99, sourceText: '弱电改造包含综合布线、监控、门禁三系统，详见附件清单。',
        contractText: '弱电改造包含综合布线、监控、门禁三系统，详见附件清单。',
        suggestion: '', aiAnalysis: '规格条款完全一致。', isCrucial: false, riskLevel: 'low',
      },
      {
        id: 'hist-002-02', title: '施工安全管理条款', status: 'variance',
        confidence: 93, sourceText: '施工方须为所有施工人员购买足额意外伤害保险，保额不低于100万元/人。',
        contractText: '施工方须为施工人员购买意外伤害保险，保额不低于50万元/人。',
        highlights: ['50'],
        suggestion: '将保险保额恢复至100万元/人，降低采购方安全生产连带责任风险。',
        aiAnalysis: '保险保额由100万降低至50万，在发生安全事故时可能不足以覆盖全部损失。',
        isCrucial: false, riskLevel: 'medium',
      },
      {
        id: 'hist-002-03', title: '工期与违约金条款', status: 'match',
        confidence: 97, sourceText: '总工期60个工作日，逾期每日按合同总额0.3%支付违约金。',
        contractText: '总工期60个工作日，逾期每日按合同总额0.3%支付违约金。',
        suggestion: '', aiAnalysis: '工期与违约金条款一致。', isCrucial: false, riskLevel: 'low',
      },
    ],
    kpi: { complianceScore: 88, totalClauses: 3, highRiskCount: 0, processTimeSeconds: 8.1, timeSavedMinutes: 29, currentTokens: 8920 },
  },
  'RPT-2026-003': {
    clauses: [
      {
        id: 'hist-003-01', title: '软件授权与知识产权条款', status: 'variance',
        confidence: 95, sourceText: '平台源代码及文档知识产权归买方所有，卖方须提供完整源码。',
        contractText: '平台使用权授予买方，源代码及知识产权归卖方所有。',
        highlights: ['使用权', '归卖方所有'],
        suggestion: '明确约定平台为委托开发，知识产权归采购方所有，卖方交付完整源码。',
        aiAnalysis: '知识产权归属被完全逆转——从买方所有变更为卖方所有，属于核心商务条款的实质性篡改。',
        isCrucial: true, riskLevel: 'high',
      },
      {
        id: 'hist-003-02', title: '数据迁移与交接条款', status: 'missing',
        confidence: 94, sourceText: '项目验收后卖方须在15个工作日内完成全部数据迁移并配合系统切换。',
        contractText: '',
        suggestion: '补充数据迁移条款，明确15个工作日时限及卖方配合义务，防止项目交付后无法使用。',
        aiAnalysis: '采购结果要求的数据迁移义务在合同中完全缺失，可能导致项目交付后数据不可用。',
        isCrucial: false, riskLevel: 'medium',
      },
      {
        id: 'hist-003-03', title: '售后服务响应条款', status: 'variance',
        confidence: 92, sourceText: '提供7×24小时技术支持，重大故障2小时内到场处置。',
        contractText: '提供5×8小时技术支持，重大故障24小时内到场处置。',
        highlights: ['5×8', '24'],
        suggestion: '恢复7×24小时响应标准，重大故障到场时限缩短至2小时。',
        aiAnalysis: '服务等级从7×24降为5×8，故障响应从2小时放宽至24小时，严重影响业务连续性。',
        isCrucial: false, riskLevel: 'medium',
      },
    ],
    kpi: { complianceScore: 72, totalClauses: 3, highRiskCount: 1, processTimeSeconds: 9.7, timeSavedMinutes: 29, currentTokens: 11200 },
  },
  'RPT-2026-004': {
    clauses: [
      {
        id: 'hist-004-01', title: '设备租赁期限与续租条款', status: 'match',
        confidence: 99, sourceText: '租赁期限3年，到期前60日双方协商续租事宜，同等条件下承租方优先续租。',
        contractText: '租赁期限3年，到期前60日双方协商续租事宜，同等条件下承租方优先续租。',
        suggestion: '', aiAnalysis: '租赁与续租条款完全一致。', isCrucial: false, riskLevel: 'low',
      },
      {
        id: 'hist-004-02', title: '维护保养责任条款', status: 'variance',
        confidence: 91, sourceText: '出租方负责全部设备的定期维护保养，每季度巡检不少于1次。',
        contractText: '出租方负责设备维护保养，每半年巡检1次。',
        highlights: ['半年'],
        suggestion: '将巡检频次从半年恢复为每季度1次，确保设备故障早发现早处置。',
        aiAnalysis: '巡检频次从每季度降为每半年，设备故障风险暴露窗口增大一倍。',
        isCrucial: false, riskLevel: 'low',
      },
    ],
    kpi: { complianceScore: 96, totalClauses: 2, highRiskCount: 0, processTimeSeconds: 5.4, timeSavedMinutes: 29, currentTokens: 6100 },
  },
};
