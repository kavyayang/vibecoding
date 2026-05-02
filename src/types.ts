/**
 * 类型定义 — 包含风险等级、Token 消耗、历史记录等新字段
 */

/** 风险等级 */
export type RiskLevel = 'high' | 'medium' | 'low';

/** 质检状态枚举 */
export type CheckStatus = 'match' | 'missing' | 'variance';

/** 单条条款比对记录 */
export interface ClauseRecord {
  id: string;
  title: string;
  status: CheckStatus;
  /** AI 置信度 0-100 */
  confidence: number;
  /** 采购结果原文 */
  sourceText: string;
  /** 合同文件原文（缺失时为空） */
  contractText: string;
  /** 差异词汇高亮 */
  highlights?: string[];
  /** 合规修正建议（Match 时为空） */
  suggestion: string;
  /** LLM 差异分析简述 */
  aiAnalysis: string;
  /** 是否为高风险关键条款 */
  isCrucial: boolean;
  /** 风险等级（用于合规分扣减计算） */
  riskLevel: RiskLevel;
}

/** KPI 指标卡片数据 */
export interface KPIData {
  /** 总体合规分 */
  complianceScore: number;
  /** 审核条款总数 */
  totalClauses: number;
  /** 高风险异常数 */
  highRiskCount: number;
  /** 系统处理耗时（秒） */
  processTimeSeconds: number;
  /** 相比人工节省时间（分钟） */
  timeSavedMinutes: number;
  /** 大模型 Token 消耗量 */
  currentTokens: number;
}

/** Toast 消息 */
export interface ToastMessage {
  id: number;
  text: string;
}

/** 已上传并解析完成的文件信息 */
export interface UploadedFile {
  fileName: string;
  fileType: 'pdf' | 'docx';
  text: string;
  charCount: number;
}

/** 质检历史记录 */
export interface HistoryRecord {
  /** 任务编号，如 RPT-2026-001 */
  taskId: string;
  /** 采购项目名称 */
  projectName: string;
  /** 质检时间 */
  checkTime: string;
  /** 总体合规分 */
  complianceScore: number;
  /** 风险情况简述 */
  riskSummary: string;
}

/** 页面视图标识 */
export type ViewState = 'login' | 'dashboard' | 'workspace' | 'history' | 'knowledge';

/** localStorage 持久化的单条审核记录 */
export interface StoredAuditEntry {
  record: HistoryRecord;
  clauses: ClauseRecord[];
  kpi: KPIData;
}

/** 法务红线——必检条款清单 */
export interface MandatoryChecks {
  breachOfContract: boolean;
  confidentiality: boolean;
  disputeResolution: boolean;
  dataSecurity: boolean;
  paymentTerms: boolean;
  warrantyTerms: boolean;
}

/** 可配置的质检规则 */
export interface RuleConfig {
  passThreshold: number;
  priceTolerance: number;
  mandatoryChecks: MandatoryChecks;
}

/** 常用规则模板 */
export interface RuleTemplate {
  id: string;
  name: string;
  config: RuleConfig;
}
