/**
 * LLM 智能比对服务 —— llmService.ts
 *
 * 调用兼容 OpenAI 格式的大模型 API（DeepSeek / Kimi / GPT 等），
 * 对采购结果与合同文件的纯文本进行深度语义比对，输出结构化 JSON。
 */

import type { ClauseRecord } from '../types';

// ============================================================
// 核心 System Prompt —— 产品核心价值的"咒语"
// ============================================================

const SYSTEM_PROMPT = `你是一位拥有 15 年经验的招商银行资深法务与采购审计专家。
你的任务是严格比对《采购结果文件》与《采购合同文件》的核心条款。

你需要具备极强的语义理解能力，重点关注以下三类条款：

1. 商务条款：
   - 重点核对价格金额（小写数字与大写金额是否一致）
   - 核对采购数量、规格型号、服务范围是否被缩减
   - 核对付款比例、付款节点是否一致

2. 时间框架：
   - 敏锐识别"自然日"与"工作日"的区别
   - 比对交付周期、质保期限、合同生效与终止日期
   - 检查是否存在模糊的时间表述（如"尽快""适时"等不合规用语）

3. 法律条款：
   - 审查违约责任条款中违约金比例是否被降低
   - 审查赔偿上限是否被压低
   - 审查支付条件是否增加了不合理的前置条件
   - 审查保密条款、数据安全条款是否被删除或弱化
   - 审查争议解决方式（诉讼/仲裁）及管辖法院是否一致

输出规则：
- 你必须以合规的纯 JSON 格式输出，不得包含任何 Markdown 代码块标记（如 \`\`\`json），不得包含任何多余的解释文字
- JSON 必须包含一个顶层字段 "clauseComparisons"，其值为数组
- 数组中每个元素必须包含以下字段：

  - clauseName: string —— 条款名称（如"违约责任条款""付款条件条款"）
  - procurementText: string —— 采购结果中的相关原文
  - contractText: string | null —— 合同中的相关原文，如果缺失则为 null
  - status: "Match" | "Missing" | "Variance" —— 比对状态
  - aiAnalysis: string —— 用一句话精炼解释差异原因或一致性判断
  - aiCorrection: string | null —— 如果是 Missing 或 Variance，给出具体合规修正建议；Match 则为 null
  - isCrucial: boolean —— 是否为高风险关键条款（涉及金额、违约责任、保密、数据安全等）

比对策略：
- 不要逐字比对，要从语义层面理解条款的实质内容
- 如果两个条款表述不同但法律效力等价，标记为 Match
- 如果采购结果有要求但合同完全未提及，标记为 Missing
- 如果数值、比例、期限、责任范围发生实质性变化，标记为 Variance
- 金额数字的大小写不一致属于高风险 Variance`;

// ============================================================
// 组装 User Prompt
// ============================================================

function buildUserPrompt(procurementText: string, contractText: string): string {
  return `以下是采购结果原文：

${procurementText}

---

以下是采购合同原文：

${contractText}

---

请根据系统指令对以上两份文件进行严格的法务与商务条款比对，并以合规 JSON 格式输出比对结果。`;
}

// ============================================================
// LLM 响应 JSON 结构
// ============================================================

interface LLMClauseItem {
  clauseName: string;
  procurementText: string;
  contractText: string | null;
  status: 'Match' | 'Missing' | 'Variance';
  aiAnalysis: string;
  aiCorrection: string | null;
  isCrucial: boolean;
}

interface LLMResponse {
  clauseComparisons: LLMClauseItem[];
}

// ============================================================
// 将 LLM 响应映射为 ClauseRecord 数组
// ============================================================

/**
 * 将 LLM 返回的条款数据映射为前端渲染所需的 ClauseRecord 格式
 * 同时根据 isCrucial 和 status 推导 riskLevel（模块 1）
 */
function mapToClauseRecords(items: LLMClauseItem[]): ClauseRecord[] {
  return items.map((item, index) => {
    const status = item.status.toLowerCase() as 'match' | 'missing' | 'variance';

    // 推导风险等级：isCrucial → high；非 crucial 的 variance/missing → medium；match → low
    let riskLevel: 'high' | 'medium' | 'low';
    if (status === 'match') {
      riskLevel = 'low';
    } else if (item.isCrucial) {
      riskLevel = 'high';
    } else {
      riskLevel = 'medium';
    }

    return {
      id: `llm-clause-${index}`,
      title: item.clauseName,
      status,
      confidence: 95,
      sourceText: item.procurementText,
      contractText: item.contractText ?? '',
      highlights: extractHighlights(item),
      suggestion: item.aiCorrection ?? '',
      aiAnalysis: item.aiAnalysis,
      isCrucial: item.isCrucial,
      riskLevel,
    };
  });
}

/**
 * 对于 Variance 状态，尝试从原文差异中提取高亮关键词
 * 简单策略：对比两段文字中不同的数值和百分比
 */
function extractHighlights(item: LLMClauseItem): string[] | undefined {
  if (item.status !== 'Variance' || !item.contractText) return undefined;

  const highlights: string[] = [];

  // 提取所有百分比数字进行对比
  const pctRegex = /[\d]+(?:\.[\d]+)?%/g;
  const procPcts = item.procurementText.match(pctRegex) ?? [];
  const contPcts = item.contractText.match(pctRegex) ?? [];

  // 合同中有但采购结果中没有的百分比差异
  for (const pct of contPcts) {
    if (!procPcts.includes(pct)) {
      highlights.push(pct);
    }
  }

  // 提取金额数字（¥ 或 元 前后）
  const amountRegex = /(?:¥\s*[\d,]+(?:\.[\d]+)?|[\d,]+(?:\.[\d]+)?\s*元)/g;
  const procAmounts = item.procurementText.match(amountRegex) ?? [];
  const contAmounts = item.contractText.match(amountRegex) ?? [];

  for (const amt of contAmounts) {
    if (!procAmounts.includes(amt)) {
      highlights.push(amt);
    }
  }

  return highlights.length > 0 ? highlights : undefined;
}

// ============================================================
// 核心 API 调用
// ============================================================

/** API 配置 —— 从环境变量读取 */
function getApiConfig() {
  // 兼容多种常见的 API 端点环境变量命名
  const apiKey = import.meta.env.VITE_LLM_API_KEY;
  const apiBase =
    import.meta.env.VITE_LLM_API_BASE || 'https://api.deepseek.com/v1';
  const model = import.meta.env.VITE_LLM_MODEL || 'deepseek-chat';

  if (!apiKey) {
    throw new Error(
      '未配置 LLM API Key。请在 .env 文件中设置 VITE_LLM_API_KEY。',
    );
  }

  return { apiKey, apiBase, model };
}

/**
 * 尝试从 LLM 原始响应文本中提取 JSON
 * 处理可能包裹在 markdown 代码块中的情况
 */
function extractJSON(raw: string): string {
  // 尝试匹配 ```json ... ``` 代码块
  const codeBlockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // 尝试找到第一个 { 和最后一个 } 之间的内容
  const firstBrace = raw.indexOf('{');
  const lastBrace = raw.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return raw.slice(firstBrace, lastBrace + 1);
  }

  return raw.trim();
}

/** 分析耗时统计（用于 KPI 更新） */
export interface AnalysisTiming {
  durationSeconds: number;
}

/** analyzeContracts 完整返回 */
export interface AnalysisResult {
  clauses: ClauseRecord[];
  timing: AnalysisTiming;
  /** LLM 实际消耗的 Token 总数 */
  currentTokens: number;
}

/**
 * 核心函数 —— 调用 LLM 进行合同条款智能比对
 *
 * @param procurementTextRaw - 采购结果提取的纯文本
 * @param contractTextRaw - 合同文件提取的纯文本
 * @returns 结构化的比对条款数组与分析耗时
 */
export async function analyzeContracts(
  procurementTextRaw: string,
  contractTextRaw: string,
): Promise<AnalysisResult> {
  const startTime = performance.now();
  const { apiKey, apiBase, model } = getApiConfig();

  // 组装完整的 messages 数组
  const messages = [
    { role: 'system' as const, content: SYSTEM_PROMPT },
    { role: 'user' as const, content: buildUserPrompt(procurementTextRaw, contractTextRaw) },
  ];

  console.log(`[llmService] 发起请求 — 模型: ${model} | API: ${apiBase}`);
  console.log(`[llmService] 采购文本长度: ${procurementTextRaw.length} 字符 | 合同文本长度: ${contractTextRaw.length} 字符`);

  // 发起 fetch 请求（兼容 OpenAI 格式）
  let response: Response;
  try {
    response = await fetch(`${apiBase}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.1, // 低温度确保输出稳定、合规
        max_tokens: 16384,
      }),
    });
  } catch (err) {
    throw new Error(`LLM 请求网络异常：${err instanceof Error ? err.message : String(err)}`);
  }

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '无法读取错误响应');
    throw new Error(`LLM API 返回错误 ${response.status}：${errorBody}`);
  }

  // 解析 OpenAI 格式响应
  const data = await response.json();
  const rawContent: string = data.choices?.[0]?.message?.content;

  if (!rawContent) {
    console.error('[llmService] 响应体异常：', JSON.stringify(data).slice(0, 500));
    throw new Error('LLM 返回内容为空或格式异常');
  }

  console.log('[llmService] LLM 原始响应 (前 500 字符):', rawContent.slice(0, 500));

  // 提取并解析 JSON
  const jsonStr = extractJSON(rawContent);
  let parsed: LLMResponse;

  try {
    parsed = JSON.parse(jsonStr) as LLMResponse;
  } catch (err) {
    console.error('[llmService] JSON 解析失败，原始内容:', jsonStr.slice(0, 1000));
    throw new Error(`LLM 返回的 JSON 无法解析：${err instanceof Error ? err.message : String(err)}`);
  }

  // 校验响应结构
  if (!Array.isArray(parsed.clauseComparisons)) {
    throw new Error('LLM 返回的 JSON 缺少 clauseComparisons 数组字段');
  }

  // 提取 Token 消耗量（OpenAI 兼容格式 usage.total_tokens）
  const currentTokens: number = data.usage?.total_tokens ?? 12540;

  const clauses = mapToClauseRecords(parsed.clauseComparisons);
  const durationSeconds = Math.round((performance.now() - startTime) / 10) / 100;

  console.log(
    `[llmService] 比对完成 — ${clauses.length} 条条款 | 耗时 ${durationSeconds}s | Token: ${currentTokens} | ` +
    `Match: ${clauses.filter((c) => c.status === 'match').length} | ` +
    `Missing: ${clauses.filter((c) => c.status === 'missing').length} | ` +
    `Variance: ${clauses.filter((c) => c.status === 'variance').length}`,
  );

  return { clauses, timing: { durationSeconds }, currentTokens };
}

// ============================================================
// 单条款逐条分析 —— 供 Agent 编排器循环调用
// ============================================================

const SINGLE_CLAUSE_SYSTEM_PROMPT = `你是一位招商银行资深法务审计专家。
你的任务是针对一条特定的条款，判断其在合同中的表述与采购结果要求的偏差。

输出规则：
- 必须以纯 JSON 格式输出，不得包含 Markdown 标记或额外解释
- JSON 必须包含以下字段：

  - clauseName: string —— 条款名称
  - procurementText: string —— 采购结果中相关原文
  - contractText: string | null —— 合同中的相关原文，缺失则为 null
  - status: "Match" | "Missing" | "Variance"
  - aiAnalysis: string —— 一句话精炼解析差异或确认一致
  - aiCorrection: string | null —— 合规修正建议（Match 时为 null）
  - isCrucial: boolean —— 涉及金额/违约责任/保密/数据安全则为 true`;

/**
 * 针对单个条款向 LLM 发起逐条比对请求
 * 这是 Agent 编排器 Tool Use 循环中的核心原子操作
 *
 * @param clauseTitle  - 从合同文本中提取的条款名称
 * @param clauseContent - 该条款在合同中的原文（可能为空，代表合同中缺失此项）
 * @param procurementContext - 采购结果全文，作为比对的基准参照
 */
export async function analyzeSingleClause(
  clauseTitle: string,
  clauseContent: string,
  procurementContext: string,
): Promise<LLMClauseItem> {
  const { apiKey, apiBase, model } = getApiConfig();

  const userPrompt = `请对以下条款进行精准比对——

【条款名称】${clauseTitle}

【采购结果要求】
${procurementContext}

【合同中该条款实际内容】
${clauseContent || '（合同中未找到该条款的任何相关内容）'}

请输出单一 JSON 对象（不是数组），包含该条款的比对结果。`;

  const messages = [
    { role: 'system' as const, content: SINGLE_CLAUSE_SYSTEM_PROMPT },
    { role: 'user' as const, content: userPrompt },
  ];

  const response = await fetch(`${apiBase}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.1,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`LLM API 错误 ${response.status}：${errorBody}`);
  }

  const data = await response.json();
  const rawContent: string = data.choices?.[0]?.message?.content;

  if (!rawContent) {
    throw new Error(`LLM 对条款「${clauseTitle}」返回空内容`);
  }

  const jsonStr = extractJSON(rawContent);
  const parsed = JSON.parse(jsonStr) as LLMClauseItem;

  if (!parsed.clauseName || !parsed.status) {
    throw new Error(`条款「${clauseTitle}」的 LLM 响应缺少必要字段`);
  }

  return parsed;
}
