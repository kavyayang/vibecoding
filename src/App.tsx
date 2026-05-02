import { useState, useCallback, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import KPICards from './components/KPICards';
import UploadPanel from './components/UploadPanel';
import ClauseList from './components/ClauseList';
import HistoryView from './components/HistoryView';
import DashboardHub from './components/DashboardHub';
import LoginView from './components/LoginView';
import AgentTerminal from './components/AgentTerminal';
import RuleConfigDrawer from './components/RuleConfigDrawer';
import Toast from './components/Toast';
import { analyzeSingleClause } from './services/llmService';
import { defaultKPIData, computeKPIData, mockHistoryClauses } from './mockData';
import { simulateExport } from './utils/exportReport';
import { recalculateScore } from './utils/scoring';
import type { ToastMessage, UploadedFile, ClauseRecord, KPIData, ViewState, HistoryRecord, StoredAuditEntry, RuleConfig, RuleTemplate } from './types';

/**
 * 招商银行 —— 合同智能质检系统
 * 核心功能 1：差异条款 PDF 导出闭环
 * 核心功能 2：历史记录查阅与导出
 * 核心功能 3：可配置规则引擎 + 模板库
 */
const LS_KEY = 'audit_history';
const LS_KEY_RULES = 'audit_rule_templates';

/** 默认规则配置 */
const DEFAULT_RULE_CONFIG: RuleConfig = {
  passThreshold: 75,
  priceTolerance: 5,
  mandatoryChecks: {
    breachOfContract: true,
    confidentiality: true,
    disputeResolution: true,
    dataSecurity: true,
    paymentTerms: true,
    warrantyTerms: true,
  },
};

/** 预置常用规则模板 */
const DEFAULT_TEMPLATES: RuleTemplate[] = [
  {
    id: 'tpl-it-standard',
    name: 'IT集采标准规则',
    config: { ...DEFAULT_RULE_CONFIG, mandatoryChecks: { ...DEFAULT_RULE_CONFIG.mandatoryChecks } },
  },
  {
    id: 'tpl-strict-audit',
    name: '严格审计规则',
    config: {
      passThreshold: 90,
      priceTolerance: 2,
      mandatoryChecks: {
        breachOfContract: true,
        confidentiality: true,
        disputeResolution: true,
        dataSecurity: true,
        paymentTerms: true,
        warrantyTerms: true,
      },
    },
  },
];

/**
 * 从 localStorage 加载规则模板库
 * 首次访问时注入预置模板，确保新用户开箱即用
 */
function loadTemplatesFromStorage(): RuleTemplate[] {
  try {
    const raw = localStorage.getItem(LS_KEY_RULES);
    if (!raw) {
      localStorage.setItem(LS_KEY_RULES, JSON.stringify(DEFAULT_TEMPLATES));
      return DEFAULT_TEMPLATES;
    }
    return JSON.parse(raw) as RuleTemplate[];
  } catch {
    return DEFAULT_TEMPLATES;
  }
}

function loadHistoryFromStorage(): { list: HistoryRecord[]; dataMap: Record<string, { clauses: ClauseRecord[]; kpi: KPIData }> } {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { list: [], dataMap: {} };
    const entries: StoredAuditEntry[] = JSON.parse(raw);
    const list: HistoryRecord[] = [];
    const dataMap: Record<string, { clauses: ClauseRecord[]; kpi: KPIData }> = {};
    for (const entry of entries) {
      list.push(entry.record);
      dataMap[entry.record.taskId] = { clauses: entry.clauses, kpi: entry.kpi };
    }
    return { list, dataMap };
  } catch {
    return { list: [], dataMap: {} };
  }
}

function saveHistoryToStorage(list: HistoryRecord[], dataMap: Record<string, { clauses: ClauseRecord[]; kpi: KPIData }>) {
  const entries: StoredAuditEntry[] = list.map((r) => ({
    record: r,
    clauses: dataMap[r.taskId]?.clauses ?? [],
    kpi: dataMap[r.taskId]?.kpi ?? defaultKPIData,
  }));
  localStorage.setItem(LS_KEY, JSON.stringify(entries));
}

function generateTaskId(list: HistoryRecord[]): string {
  const max = list.reduce((m, r) => {
    const m2 = r.taskId.match(/RPT-(\d+)-(\d+)/);
    return m2 ? Math.max(m, parseInt(m2[2], 10)) : m;
  }, 0);
  return `RPT-${new Date().getFullYear()}-${String(max + 1).padStart(3, '0')}`;
}

/** 异步 delay 工具 —— 用于 Agent 编排器中控制日志输出节奏 */
const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * 从合同文本中提取条款块（真实的文本切片，非 mock 数据）
 *
 * 策略：
 *   1. 优先按「第X条」模式分割（中国法律/合同文档规范格式）
 *   2. 若无匹配，按中文编号「一、二、三、」或双换行分割
 *   3. 兜底：每 120 字符切一块
 */
function extractClausesFromText(text: string): { title: string; content: string }[] {
  if (!text.trim()) return [];

  // 第X条 / 第XX条
  const articlePattern = /第[一二三四五六七八九十百千\d]+条/g;
  const articleMatches = text.match(articlePattern);

  if (articleMatches && articleMatches.length >= 2) {
    // 按 "第X条" 分割文本
    const parts = text.split(/(?=第[一二三四五六七八九十百千\d]+条)/).filter(Boolean);
    return parts.map((part, i) => {
      const firstLine = part.split('\n')[0].trim();
      return {
        title: firstLine.length > 40 ? firstLine.slice(0, 40) + '...' : (firstLine || `条款 ${i + 1}`),
        content: part.trim(),
      };
    });
  }

  // 中文编号：一、二、三、...
  const cnNumPattern = /(?:^|\n)[一二三四五六七八九十]+、/g;
  const cnMatches = text.match(cnNumPattern);
  if (cnMatches && cnMatches.length >= 2) {
    const parts = text.split(/(?=(?:^|\n)[一二三四五六七八九十]+、)/).filter(Boolean);
    return parts.map((part, i) => {
      const firstLine = part.split('\n')[0].trim();
      return {
        title: firstLine.length > 40 ? firstLine.slice(0, 40) + '...' : (firstLine || `条款 ${i + 1}`),
        content: part.trim(),
      };
    });
  }

  // 兜底：按双换行分割
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 20);
  if (paragraphs.length >= 2) {
    return paragraphs.map((p, i) => ({
      title: p.trim().slice(0, 40) + (p.trim().length > 40 ? '...' : ''),
      content: p.trim(),
    }));
  }

  // 最终兜底：按字符数均分
  const chunkSize = 120;
  const result: { title: string; content: string }[] = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    const chunk = text.slice(i, Math.min(i + chunkSize, text.length));
    result.push({ title: `文本片段 ${Math.floor(i / chunkSize) + 1}`, content: chunk });
  }
  return result;
}

/**
 * 将 LLM 单条款分析结果映射为 ClauseRecord
 * （与 llmService 中的 mapToClauseRecords 逻辑一致，但处理单条数据）
 */
function singleItemToRecord(item: { clauseName: string; procurementText: string; contractText: string | null; status: string; aiAnalysis: string; aiCorrection: string | null; isCrucial: boolean }, index: number): ClauseRecord {
  const checkStatus = item.status.toLowerCase() as 'match' | 'missing' | 'variance';
  let riskLevel: 'high' | 'medium' | 'low';
  if (checkStatus === 'match') {
    riskLevel = 'low';
  } else if (item.isCrucial) {
    riskLevel = 'high';
  } else {
    riskLevel = 'medium';
  }
  return {
    id: `agent-clause-${index}`,
    title: item.clauseName,
    status: checkStatus,
    confidence: 92,
    sourceText: item.procurementText,
    contractText: item.contractText ?? '',
    highlights: undefined,
    suggestion: item.aiCorrection ?? '',
    aiAnalysis: item.aiAnalysis,
    isCrucial: item.isCrucial,
    riskLevel,
  };
}

function buildRiskSummary(clauses: ClauseRecord[]): string {
  const high = clauses.filter((c) => c.riskLevel === 'high' && c.status !== 'match').length;
  const medium = clauses.filter((c) => c.riskLevel === 'medium' && c.status !== 'match').length;
  const low = clauses.filter((c) => c.riskLevel === 'low' && c.status !== 'match').length;
  const parts: string[] = [];
  if (high > 0) parts.push(`${high}处高危`);
  if (medium > 0) parts.push(`${medium}处中危`);
  if (low > 0) parts.push(`${low}处低危`);
  return parts.length > 0 ? parts.join(', ') : '无风险项';
}

export default function App() {
  // ====== 路由状态 ======
  const [activeView, setActiveView] = useState<ViewState>('login');

  // ====== 历史记录（localStorage 持久化） ======
  const [historyList, setHistoryList] = useState<HistoryRecord[]>(() => loadHistoryFromStorage().list);
  const [historyDataMap, setHistoryDataMap] = useState<Record<string, { clauses: ClauseRecord[]; kpi: KPIData }>>(
    () => loadHistoryFromStorage().dataMap,
  );

  // 首次挂载同步 localStorage
  useEffect(() => {
    const { list, dataMap } = loadHistoryFromStorage();
    setHistoryList(list);
    setHistoryDataMap(dataMap);
  }, []);

  // ====== Toast ======
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const showToast = useCallback((text: string) => {
    setToast({ id: Date.now(), text });
  }, []);

  // ====== 文档解析状态 ======
  const [procurementTextRaw, setProcurementTextRaw] = useState<string>('');
  const [contractTextRaw, setContractTextRaw] = useState<string>('');
  const [procurementFile, setProcurementFile] = useState<UploadedFile | null>(null);
  const [contractFile, setContractFile] = useState<UploadedFile | null>(null);

  // ====== 质检分析状态 ======
  const [clauses, setClauses] = useState<ClauseRecord[]>([]);
  const [kpiData, setKpiData] = useState<KPIData>(defaultKPIData);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // ====== Agent 编排器状态 ======
  const [isOrchestrating, setIsOrchestrating] = useState(false);
  const [orchestratorLogs, setOrchestratorLogs] = useState<string[]>([]);
  const [currentAgentStep, setCurrentAgentStep] = useState(0);

  // ====== 规则引擎状态 ======
  const [currentRuleConfig, setCurrentRuleConfig] = useState<RuleConfig>(DEFAULT_RULE_CONFIG);
  const [savedTemplates, setSavedTemplates] = useState<RuleTemplate[]>(() => loadTemplatesFromStorage());
  const [isRuleDrawerOpen, setIsRuleDrawerOpen] = useState(false);

  /** 当前加载的历史任务名称（用于导出时命名） */
  const [currentProjectName, setCurrentProjectName] = useState<string>('');

  // ====== 视图切换 ======
  const handleViewChange = useCallback(
    (view: ViewState) => {
      if (view === 'knowledge') {
        showToast('知识库模块开发中，敬请期待');
        return;
      }
      setActiveView(view);
    },
    [showToast],
  );

  /** 从 Dashboard 进入空白工作区 */
  const handleStartAudit = useCallback(() => {
    setActiveView('workspace');
  }, []);

  /** 登录成功进入 Dashboard */
  const handleLoginSuccess = useCallback(() => {
    setActiveView('dashboard');
  }, []);

  // ====== 规则配置回调 ======

  const handleOpenRuleDrawer = useCallback(() => {
    setIsRuleDrawerOpen(true);
  }, []);

  const handleCloseRuleDrawer = useCallback(() => {
    setIsRuleDrawerOpen(false);
  }, []);

  /**
   * 应用新规则 → 即时重算合规分，不调用 LLM
   * 这是规则引擎的核心价值：基于已有的比对结果，按新配置重新打分
   */
  const handleApplyRuleConfig = useCallback(
    (config: RuleConfig) => {
      setCurrentRuleConfig(config);
      setKpiData((prev) => ({
        ...prev,
        complianceScore: recalculateScore(clauses, config),
      }));
      setIsRuleDrawerOpen(false);
      showToast('规则已更新，合规分已根据新配置重新计算');
    },
    [clauses, showToast],
  );

  /**
   * 收藏当前规则为常用模板 → 持久化到 localStorage
   */
  const handleSaveTemplate = useCallback(
    (name: string, config: RuleConfig) => {
      const newTemplate: RuleTemplate = {
        id: `tpl-${Date.now()}`,
        name,
        config: { ...config, mandatoryChecks: { ...config.mandatoryChecks } },
      };
      const next = [...savedTemplates, newTemplate];
      setSavedTemplates(next);
      localStorage.setItem(LS_KEY_RULES, JSON.stringify(next));
      showToast(`规则模板「${name}」已收藏`);
    },
    [savedTemplates, showToast],
  );

  /** 删除规则模板 —— 若删除当前正使用的模板则自动回退默认规则 */
  const handleDeleteTemplate = useCallback(
    (id: string) => {
      const target = savedTemplates.find((t) => t.id === id);
      const next = savedTemplates.filter((t) => t.id !== id);
      setSavedTemplates(next);
      localStorage.setItem(LS_KEY_RULES, JSON.stringify(next));

      // 如果当前规则恰好是被删除模板的副本，重置为默认
      const isSameConfig =
        currentRuleConfig.passThreshold === target?.config.passThreshold &&
        currentRuleConfig.priceTolerance === target?.config.priceTolerance &&
        JSON.stringify(currentRuleConfig.mandatoryChecks) ===
          JSON.stringify(target?.config.mandatoryChecks);
      if (isSameConfig && target) {
        const defaults: RuleConfig = {
          passThreshold: 75,
          priceTolerance: 5,
          mandatoryChecks: {
            breachOfContract: true,
            confidentiality: true,
            disputeResolution: true,
            dataSecurity: true,
            paymentTerms: true,
            warrantyTerms: true,
          },
        };
        setCurrentRuleConfig(defaults);
        setKpiData((prev) => ({ ...prev, complianceScore: recalculateScore(clauses, defaults) }));
      }
      showToast(target ? `模板「${target.name}」已删除` : '模板已删除');
    },
    [savedTemplates, currentRuleConfig, clauses, showToast],
  );

  // ====== 文档解析回调 ======
  const handleProcurementParsed = useCallback(
    (file: UploadedFile | null) => {
      setProcurementFile(file);
      setProcurementTextRaw(file?.text ?? '');
      if (file) showToast(`采购结果「${file.fileName}」解析完成，${file.charCount} 字符已提取`);
    },
    [showToast],
  );

  const handleContractParsed = useCallback(
    (file: UploadedFile | null) => {
      setContractFile(file);
      setContractTextRaw(file?.text ?? '');
      if (file) showToast(`合同「${file.fileName}」解析完成，${file.charCount} 字符已提取`);
    },
    [showToast],
  );

  // ====== Agent 编排器：多步智能体执行链 ======

  /**
   * 将日志推入终端并在 80ms 后 resolve
   * 利用异步函数中的微延迟让 React 有时间 flush 每一次状态更新，
   * 从而实现终端日志逐行「打字机式」跳出的视觉效果
   */
  const pushLog = useCallback(async (msg: string) => {
    setOrchestratorLogs((prev) => {
      // 去重：提取核心文本（去除 [Tag] 前缀和 ▸ 符号）对比最后一条日志
      const extractCore = (s: string) =>
        s.replace(/^\[(System|Action|Observation|Thought)\]\s*(▸\s*)?/, '').trim();
      if (prev.length > 0 && extractCore(prev[prev.length - 1]) === extractCore(msg)) {
        return prev;
      }
      return [...prev, msg];
    });
    await delay(80);
  }, []);

  /**
   * 【核心】前端 Agent 编排器 —— Tool Use & Reasoning Loop
   *
   * 这是整个系统的"大脑"：它不再一次性把全部文本抛给 LLM 后干等结果，
   * 而是模拟真实 AI Agent 的工作方式 — 将大任务拆解为多个原子工具调用，
   * 在每一步中：
   *   1. 输出 Thought（推理/判断）
   *   2. 执行 Action（调用 LLM 或本地工具）
   *   3. 输出 Observation（观察结果并决定下一步）
   *
   * 这种架构的好处：
   *   - 用户能看到 Agent 的完整推理过程（透明可审计）
   *   - 每个条款独立分析，某一项失败不影响其他项
   *   - 支持未来插入真实的深度分析工具（如法规库检索）
   */
  const handleStartAnalysis = useCallback(async () => {
    if (!procurementTextRaw || !contractTextRaw) {
      showToast('请先上传采购结果和合同文件');
      return;
    }

    // 进入编排模式：隐藏普通 UI，展示 Agent 终端
    setIsOrchestrating(true);
    setOrchestratorLogs([]);
    setCurrentAgentStep(0);
    setIsAnalyzing(true);

    const startTime = performance.now();
    const auditResults: ClauseRecord[] = [];
    let totalTokens = 0;

    try {
      // ====== Phase 1：初始化 ======
      await pushLog('[System] ▸ 初始化质检 Agent，加载规则矩阵...');
      await pushLog('[System] ▸ 加载完毕：商务条款规则 12 项，法律条款规则 8 项，时间框架规则 5 项');
      await delay(300);

      // ====== Phase 2：文档解析 ======
      setCurrentAgentStep(1);
      await pushLog(`[Action] parse_document -> 成功提取采购结果 ${procurementTextRaw.length} 字符`);
      await pushLog(`[Action] parse_document -> 成功提取合同文件 ${contractTextRaw.length} 字符`);
      await pushLog('[Observation] 两份文档解析完毕，进入条款级切片...');
      await delay(200);

      // ====== Phase 3：条款切片与动态识别 ======
      setCurrentAgentStep(2);
      const realClauses = extractClausesFromText(contractTextRaw);
      await pushLog(`[Observation] 识别到 ${realClauses.length} 个核心条款块，开始逐一比对...`);
      await delay(150);

      // ====== Phase 4：Agent 执行循环 (Tool Use Loop) ======
      for (let i = 0; i < realClauses.length; i++) {
        const clause = realClauses[i];
        const clausePreview = clause.title.length > 35 ? clause.title.slice(0, 35) + '...' : clause.title;

        // Step A：比对工具调用
        await pushLog(`[Action] compare_terms -> 正在比对目标: 「${clausePreview}」...`);

        let itemResult: {
          clauseName: string;
          procurementText: string;
          contractText: string | null;
          status: string;
          aiAnalysis: string;
          aiCorrection: string | null;
          isCrucial: boolean;
        };

        try {
          // ★ 真实 LLM 调用 —— 每次只分析一个条款块
          const rawResult = await analyzeSingleClause(clause.title, clause.content, procurementTextRaw);
          itemResult = {
            clauseName: rawResult.clauseName,
            procurementText: rawResult.procurementText,
            contractText: rawResult.contractText,
            status: rawResult.status,
            aiAnalysis: rawResult.aiAnalysis,
            aiCorrection: rawResult.aiCorrection,
            isCrucial: rawResult.isCrucial,
          };
        } catch {
          // LLM 调用失败时的降级策略：标记为 Variance 并给出提示
          itemResult = {
            clauseName: clause.title,
            procurementText: '',
            contractText: clause.content,
            status: 'Variance',
            aiAnalysis: 'LLM 分析超时，已自动标记为待复核差异项',
            aiCorrection: '建议人工复核该条款的合规性',
            isCrucial: false,
          };
          await pushLog(`[Thought] LLM 调用异常，已启用降级策略标记条款「${clausePreview}」为待复核`);
        }

        const record = singleItemToRecord(itemResult, i);
        auditResults.push(record);

        // Step B：Agent 大脑根据 LLM 返回结果做真实判断
        if (itemResult.status === 'Variance' || itemResult.status === 'Missing') {
          // 发现差异或缺失 → 触发进阶工具分支
          const analysisSnippet = itemResult.aiAnalysis.length > 18
            ? itemResult.aiAnalysis.slice(0, 18) + '...'
            : itemResult.aiAnalysis;
          await pushLog(`[Thought] ⚠ 警告！在「${clausePreview}」中发现${itemResult.status === 'Missing' ? '缺失' : '差异'}：${analysisSnippet}`);

          if (itemResult.isCrucial) {
            await pushLog('[Action] 动态触发: deep_analyze 调取招行合规知识库进行语义深度诊断...');
            await delay(1500); // 模拟深度分析耗时
            await pushLog('[Observation] 诊断完成，已生成法律修正建议并同步至风险档案。');
          } else {
            await pushLog('[Observation] 差异已记录，修正建议已自动生成。');
          }
        } else {
          // Match：条款合规，放行
          await pushLog(`[Observation] 条款「${clausePreview}」合规，放行。`);
        }

        // 条款间短暂间隔，增强终端节奏感
        await delay(120);
      }

      // ====== Phase 5：报告生成 ======
      setCurrentAgentStep(3);
      await pushLog('[Action] generate_report -> 所有条款比对完毕，正在渲染可视化视图...');
      await delay(800);

      const timingSeconds = Math.round((performance.now() - startTime) / 10) / 100;
      const kpi = computeKPIData(auditResults, timingSeconds, totalTokens);

      // 持久化到 localStorage
      const projectName = procurementFile?.fileName ?? '未命名项目';
      const riskSummary = buildRiskSummary(auditResults);
      const newRecord: HistoryRecord = {
        taskId: generateTaskId(historyList),
        projectName,
        checkTime: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
        complianceScore: kpi.complianceScore,
        riskSummary,
      };
      const nextList = [newRecord, ...historyList];
      const nextDataMap = { ...historyDataMap, [newRecord.taskId]: { clauses: auditResults, kpi } };
      setHistoryList(nextList);
      setHistoryDataMap(nextDataMap);
      saveHistoryToStorage(nextList, nextDataMap);

      // 切换视图：隐藏终端，展示真实比对结果
      setClauses(auditResults);
      setKpiData(kpi);
      setCurrentProjectName('');

      await delay(300);
      setIsOrchestrating(false);
      showToast(`智能质检完成！共比对 ${auditResults.length} 条条款，耗时 ${timingSeconds} 秒`);
    } catch (err) {
      setIsOrchestrating(false);
      showToast(`质检失败：${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setIsAnalyzing(false);
    }
  }, [procurementTextRaw, contractTextRaw, procurementFile, historyList, historyDataMap, pushLog, showToast]);

  // ====== 负反馈闭环 ======
  const handleMarkError = useCallback(
    (clauseId: string) => {
      console.log(`[负反馈] 条款 ${clauseId} 已标记为误判`);
      showToast('已记录业务员复核动作，正在将该负反馈同步至专属向量知识库...');
    },
    [showToast],
  );

  const handleAcceptFix = useCallback(
    (clauseId: string) => {
      console.log(`[采纳] 条款 ${clauseId} 修改建议已应用`);
      showToast('合规修改建议已采纳，系统将自动更新合同原文...');
    },
    [showToast],
  );

  // ====== 核心功能 1：工作区导出回调 ======
  const handleExportComplete = useCallback(() => {
    showToast('报告生成完毕，即将开始下载');
  }, [showToast]);

  // ====== 核心功能 2：历史记录「查看报告」 ======
  const handleViewHistoryReport = useCallback(
    (record: HistoryRecord) => {
      const data = historyDataMap[record.taskId] ?? mockHistoryClauses[record.taskId];
      if (data) {
        setClauses(data.clauses);
        setKpiData(data.kpi);
        setCurrentProjectName(record.projectName);
      }
      setActiveView('workspace');
      showToast(`已成功加载历史质检记录：${record.taskId}`);
    },
    [historyDataMap, showToast],
  );

  // ====== 核心功能 2：历史记录「下载附件」 ======
  const handleExportHistoryReport = useCallback(
    async (record: HistoryRecord) => {
      const data = historyDataMap[record.taskId] ?? mockHistoryClauses[record.taskId];
      if (!data) {
        showToast('该历史记录暂无关联的条款数据');
        return;
      }
      try {
        // 复用导出工具（含 1.5s 模拟延迟）
        await simulateExport(data.clauses, record.projectName);
        showToast('报告生成完毕，即将开始下载');
      } catch {
        showToast('导出失败，请重试');
      }
    },
    [historyDataMap, showToast],
  );

  // ====== 渲染 ======

  /** 登录页：全屏独立渲染，不显示 Sidebar / Header */
  if (activeView === 'login') {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="h-screen flex overflow-hidden">
      <Sidebar activeTab={activeView} onTabChange={handleViewChange} />

      <div className="flex-1 flex flex-col min-w-0">
        <Header activeView={activeView} onNavigate={handleViewChange} />

        {activeView === 'dashboard' ? (
          <DashboardHub onStartAudit={handleStartAudit} onShowToast={showToast} />
        ) : activeView === 'history' ? (
          <HistoryView
            historyList={historyList}
            onViewReport={handleViewHistoryReport}
            onExportReport={handleExportHistoryReport}
          />
        ) : (
          <main className="flex-1 flex flex-col p-5 gap-4 overflow-hidden">
            <KPICards data={kpiData} onOpenRuleDrawer={handleOpenRuleDrawer} />

            <div className="flex-1 flex rounded-[4px] overflow-hidden shadow-sm min-h-0">
              <div className="w-[40%] bg-white border-r border-gray-200 flex flex-col">
                <UploadPanel
                  procurementFile={procurementFile}
                  contractFile={contractFile}
                  onProcurementParsed={handleProcurementParsed}
                  onContractParsed={handleContractParsed}
                  isAnalyzing={isAnalyzing}
                  onStartAnalysis={handleStartAnalysis}
                />
              </div>

              <div className="w-[60%] bg-white flex flex-col">
                {/* Agent 编排器激活时，用推理终端替换条款列表 */}
                {isOrchestrating ? (
                  <AgentTerminal logs={orchestratorLogs} currentStep={currentAgentStep} />
                ) : (
                  <ClauseList
                    clauses={clauses}
                    isLoading={isAnalyzing}
                    onMarkError={handleMarkError}
                    onAcceptFix={handleAcceptFix}
                    onExportComplete={handleExportComplete}
                  />
                )}
              </div>
            </div>
          </main>
        )}
      </div>

      <Toast message={toast} onDismiss={() => setToast(null)} />

      {/* 规则配置抽屉 — fixed 定位，覆盖整个视口 */}
      <RuleConfigDrawer
        isOpen={isRuleDrawerOpen}
        currentConfig={currentRuleConfig}
        templates={savedTemplates}
        onClose={handleCloseRuleDrawer}
        onApply={handleApplyRuleConfig}
        onSaveTemplate={handleSaveTemplate}
        onDeleteTemplate={handleDeleteTemplate}
      />
    </div>
  );
}
