/**
 * 质检报告导出工具 —— exportReport.ts
 *
 * 生成 .txt 纯文本报告并触发浏览器下载。
 */

import type { ClauseRecord } from '../types';

// ============================================================
// 辅助
// ============================================================

const STATUS_LABEL: Record<string, string> = {
  match: '一致',
  missing: '缺失',
  variance: '差异',
};

const RISK_LABEL: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

function timestamp(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export function getReportableClauses(clauses: ClauseRecord[]): ClauseRecord[] {
  return clauses.filter((c) => c.status !== 'match');
}

// ============================================================
// 纯文本报告构建
// ============================================================

function buildTextReport(clauses: ClauseRecord[], projectName?: string): string {
  const reportable = getReportableClauses(clauses);
  const lines: string[] = [];

  lines.push('═'.repeat(68));
  lines.push('  招商银行 —— 合同智能质检差异条款报告');
  lines.push('═'.repeat(68));
  lines.push('');
  lines.push(`  项目名称：${projectName ?? '当前质检任务'}`);
  lines.push(`  导出时间：${timestamp()}`);
  lines.push(`  总条款数：${clauses.length} 条`);
  lines.push(`  差异条款：${clauses.filter((c) => c.status === 'variance').length} 处`);
  lines.push(`  缺失条款：${clauses.filter((c) => c.status === 'missing').length} 处`);
  lines.push('');
  lines.push('─'.repeat(68));

  for (let i = 0; i < reportable.length; i++) {
    const r = reportable[i];
    lines.push('');
    lines.push(`【条款 ${i + 1}】${r.title}`);
    lines.push(`  状态：${STATUS_LABEL[r.status]} | 风险等级：${RISK_LABEL[r.riskLevel]} | AI 置信度：${r.confidence}%`);
    lines.push(`  差异分析：${r.aiAnalysis}`);
    lines.push('');
    lines.push(`  ┌─ 采购结果原文`);
    lines.push(`  │  ${r.sourceText}`);
    lines.push(`  └─ 合同文件原文`);
    if (r.status === 'missing') {
      lines.push(`     （该条款在合同文件中缺失）`);
    } else {
      lines.push(`     ${r.contractText}`);
    }
    if (r.suggestion) {
      lines.push('');
      lines.push(`  合规修正建议：`);
      lines.push(`  ${r.suggestion}`);
    }
    lines.push('');
    lines.push('─'.repeat(68));
  }

  lines.push('');
  lines.push('  报告由招商银行合同智能质检系统自动生成');
  lines.push('  本报告仅供内部审计参考，不具法律效力');
  lines.push('═'.repeat(68));

  return lines.join('\n');
}

// ============================================================
// 触发浏览器下载 .txt 文件
// ============================================================

export function downloadReportFile(clauses: ClauseRecord[], projectName?: string): void {
  const content = buildTextReport(clauses, projectName);
  const blob = new Blob(['﻿' + content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const safeName = (projectName ?? '质检报告').replace(/[\/\\:*?"<>|]/g, '-');
  const fileName = `${safeName}_差异条款报告_${timestamp().replace(/[: ]/g, '-')}.txt`;

  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================================
// 主导出入口：模拟加载 → 触发下载
// ============================================================

export async function simulateExport(
  clauses: ClauseRecord[],
  projectName?: string,
): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 1500));
  downloadReportFile(clauses, projectName);
}
