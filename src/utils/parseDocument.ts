/**
 * 通用文档解析工具 —— parseDocument.ts
 *
 * 支持 PDF（pdfjs-dist）与 DOCX（mammoth）两种格式的文本提取。
 * 包含清洗逻辑：去除多余空行、异常空格、不可见字符，输出连续干净的纯文本。
 */

import * as pdfjsLib from 'pdfjs-dist';

// ====== PDF.js Worker 配置（Vite 环境） ======
// 使用 ?url 后缀让 Vite 解析为 worker 文件的静态资源 URL
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

import mammoth from 'mammoth';

// ============================================================
// 文本清洗
// ============================================================

/**
 * 清洗提取出的原始文本：
 * 1. 将回车/换行统一为 \n
 * 2. 将连续 3 个及以上的换行压缩为双换行（段落分隔）
 * 3. 去除行首行尾多余空格
 * 4. 移除零宽字符等不可见控制字符
 * 5. 将连续空格压缩为单个空格
 */
function cleanText(raw: string): string {
  return raw
    // 统一换行符
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // 移除零宽字符 & 不可见控制字符（保留常见空白）
    .replace(/[​‌‍﻿]/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    // 将连续 3+ 换行压缩为双换行（段落间保留一个空行）
    .replace(/\n{3,}/g, '\n\n')
    // 去除每行首尾空格
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    // 将连续多个空格压缩为一个
    .replace(/[ \t]{2,}/g, ' ')
    // 再次压缩可能因 trim 产生的连续空行
    .replace(/\n{3,}/g, '\n\n')
    // 去除首尾空行
    .trim();
}

// ============================================================
// PDF 解析
// ============================================================

/**
 * 解析 PDF 文件，提取所有页面的文本并拼接
 */
async function parsePDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pageTexts: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    // 将 TextItem 按阅读顺序拼接
    const pageText = content.items
      .map((item) => {
        // pdfjs 的 TextItem 有 str 属性；如果是 TextMarkedContent 则忽略
        if ('str' in item) {
          return item.str;
        }
        return '';
      })
      .join(' ');

    pageTexts.push(pageText);
  }

  return pageTexts.join('\n');
}

// ============================================================
// DOCX 解析
// ============================================================

/**
 * 解析 DOCX 文件，提取纯文本内容
 */
async function parseDOCX(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value; // mammoth 已返回纯文本
}

// ============================================================
// 统一入口
// ============================================================

/** 支持的文件 MIME 类型映射 */
const MIME_TO_EXT: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};

/** 根据文件扩展名兜底判断 */
function detectFormat(file: File): 'pdf' | 'docx' | null {
  // 优先用 MIME
  const mime = MIME_TO_EXT[file.type];
  if (mime === 'pdf' || mime === 'docx') return mime;

  // 兜底：用文件名后缀
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) return 'pdf';
  if (name.endsWith('.docx')) return 'docx';

  return null;
}

/** 解析结果 */
export interface ParseResult {
  /** 提取出的纯文本 */
  text: string;
  /** 文件名 */
  fileName: string;
  /** 文件类型 */
  fileType: 'pdf' | 'docx';
  /** 文本字符数 */
  charCount: number;
}

/**
 * 通用文档解析入口
 *
 * @param file — 用户上传的 File 对象
 * @returns 包含清洗后文本和元信息的 ParseResult
 * @throws 若文件格式不支持则抛出错误
 */
export async function parseDocument(file: File): Promise<ParseResult> {
  const format = detectFormat(file);

  if (!format) {
    throw new Error(
      `不支持的文件格式：${file.type || file.name}。请上传 PDF 或 DOCX 文件。`,
    );
  }

  let rawText: string;

  if (format === 'pdf') {
    rawText = await parsePDF(file);
  } else {
    rawText = await parseDOCX(file);
  }

  const text = cleanText(rawText);

  console.log(
    `[parseDocument] 解析完成 — 文件: ${file.name} | 类型: ${format} | 字符数: ${text.length}`,
  );
  console.log(`[parseDocument] 文本预览（前 300 字符）:\n${text.slice(0, 300)}…\n`);

  return {
    text,
    fileName: file.name,
    fileType: format,
    charCount: text.length,
  };
}
