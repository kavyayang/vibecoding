import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { parseDocument } from '../utils/parseDocument';
import type { UploadedFile } from '../types';

// ============================================================
// 单文件上传区域子组件
// ============================================================

interface SingleDropzoneProps {
  label: string;
  acceptHint: string;
  uploaded: UploadedFile | null;
  parsing: boolean;
  onFileParsed: (file: UploadedFile) => void;
  onClear: () => void;
  onParseError: (fileName: string, error: string) => void;
  onParsingStart: () => void;
}

function SingleDropzone({
  label,
  acceptHint,
  uploaded,
  parsing,
  onFileParsed,
  onClear,
  onParseError,
  onParsingStart,
}: SingleDropzoneProps) {
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      const file = acceptedFiles[0];
      onParsingStart();
      try {
        const result = await parseDocument(file);
        onFileParsed({
          fileName: result.fileName,
          fileType: result.fileType,
          text: result.text,
          charCount: result.charCount,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '未知解析错误';
        onParseError(file.name, msg);
      }
    },
    [onFileParsed, onParseError, onParsingStart],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxFiles: 1,
    disabled: parsing,
  });

  // 已上传成功态（模块 3：右侧增加「重新上传」按钮）
  if (uploaded) {
    return (
      <div className="rounded-[4px] border px-4 py-4 bg-white">
        <div className="flex items-center gap-3">
          {/* 绿色成功图标 */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: '#D1FAE5' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[#1F2937] truncate">{uploaded.fileName}</p>
            <p className="text-[11px] text-[#6B7280]">
              {uploaded.fileType.toUpperCase()} · {uploaded.charCount.toLocaleString()} 字符
            </p>
          </div>
          {/* 重新上传按钮 — 悬浮样式，hover 变深 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="text-[11px] text-[#B0B7C3] hover:text-[#4B5563] transition-colors shrink-0 flex items-center gap-1"
            title="重新上传"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            重新上传
          </button>
        </div>
      </div>
    );
  }

  // 解析中态
  if (parsing) {
    return (
      <div className="rounded-[4px] border-2 border-gray-200 px-4 py-4 bg-white">
        <div className="flex items-center gap-3">
          <svg className="animate-spin shrink-0" width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#E5E7EB" strokeWidth="3" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="#C8161D" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <span className="text-sm text-[#6B7280]">正在解析文件…</span>
        </div>
      </div>
    );
  }

  // 默认空态
  return (
    <div
      {...getRootProps()}
      className={`
        rounded-[4px] border-2 border-dashed px-4 py-5
        flex flex-col items-center justify-center gap-1 cursor-pointer
        transition-colors bg-white
        ${isDragActive ? 'border-[#C8161D]' : 'border-gray-300 hover:border-gray-400'}
      `}
      style={isDragActive ? { backgroundColor: '#FFF5F5' } : undefined}
    >
      <input {...getInputProps()} />
      <svg
        width="24" height="24" viewBox="0 0 24 24" fill="none"
        stroke={isDragActive ? '#C8161D' : '#9CA3AF'} strokeWidth="1.5" className="mb-1"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
      <p className="text-sm font-medium text-[#1F2937]">{label}</p>
      <p className="text-[11px] text-[#9CA3AF]">{acceptHint}</p>
    </div>
  );
}

// ============================================================
// 上传面板容器
// ============================================================

interface UploadPanelProps {
  procurementFile: UploadedFile | null;
  contractFile: UploadedFile | null;
  onProcurementParsed: (file: UploadedFile | null) => void;
  onContractParsed: (file: UploadedFile | null) => void;
  isAnalyzing: boolean;
  onStartAnalysis: () => void;
}

export default function UploadPanel({
  procurementFile,
  contractFile,
  onProcurementParsed,
  onContractParsed,
  isAnalyzing,
  onStartAnalysis,
}: UploadPanelProps) {
  const [parsingProcurement, setParsingProcurement] = useState(false);
  const [parsingContract, setParsingContract] = useState(false);
  const [watermarkEnabled, setWatermarkEnabled] = useState(false);

  const bothReady = procurementFile !== null && contractFile !== null;

  return (
    <div className="flex flex-col h-full">
      {/* 标题栏 */}
      <div className="flex flex-col px-4 py-3 bg-white border-b border-gray-100 shrink-0 gap-1.5">
        <div className="flex items-center">
          <span className="text-sm font-medium text-[#1F2937]">文档智能透视</span>
          <span className="text-[11px] text-[#9CA3AF] ml-2">上传文件后自动提取纯文本</span>
        </div>

        {/* 模块 3：抗水印 Switch 开关 */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <span className="text-[11px] text-[#6B7280]">
            开启抗印章/水印干扰解析（针对进阶复杂文档）
          </span>
          <button
            role="switch"
            aria-checked={watermarkEnabled}
            onClick={() => setWatermarkEnabled(!watermarkEnabled)}
            className={`
              relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200
              ${watermarkEnabled ? '' : 'bg-gray-300'}
            `}
            style={watermarkEnabled ? { backgroundColor: '#C8161D' } : undefined}
          >
            <span
              className={`
                inline-block h-[18px] w-[18px] rounded-full bg-white shadow-sm
                transition-transform duration-200 mt-[1px]
                ${watermarkEnabled ? 'translate-x-[17px]' : 'translate-x-[1px]'}
              `}
            />
          </button>
        </label>
      </div>

      {/* 双上传区域 */}
      <div className="flex-1 flex flex-col gap-4 p-4 bg-[#F9FAFB] overflow-auto">
        {/* 采购结果上传 */}
        <div>
          <p className="text-[11px] font-medium text-[#6B7280] mb-2 tracking-wide">采购结果文件</p>
          <SingleDropzone
            label="上传采购结果 (PDF / DOCX)"
            acceptHint="拖放文件至此处，或点击选择"
            uploaded={procurementFile}
            parsing={parsingProcurement}
            onFileParsed={(f) => { setParsingProcurement(false); onProcurementParsed(f); }}
            onClear={() => onProcurementParsed(null)}
            onParseError={(fileName, err) => {
              setParsingProcurement(false);
              console.error(`[UploadPanel] 采购结果解析失败 — ${fileName}: ${err}`);
              alert(`解析失败：${err}`);
            }}
            onParsingStart={() => setParsingProcurement(true)}
          />
        </div>

        {/* 合同文件上传 */}
        <div>
          <p className="text-[11px] font-medium text-[#6B7280] mb-2 tracking-wide">采购合同文件</p>
          <SingleDropzone
            label="上传采购合同 (PDF / DOCX)"
            acceptHint="拖放文件至此处，或点击选择"
            uploaded={contractFile}
            parsing={parsingContract}
            onFileParsed={(f) => { setParsingContract(false); onContractParsed(f); }}
            onClear={() => onContractParsed(null)}
            onParseError={(fileName, err) => {
              setParsingContract(false);
              console.error(`[UploadPanel] 合同文件解析失败 — ${fileName}: ${err}`);
              alert(`解析失败：${err}`);
            }}
            onParsingStart={() => setParsingContract(true)}
          />
        </div>

        {/* 解析状态摘要 */}
        {(procurementFile || contractFile) && (
          <div
            className="mt-2 p-3 rounded-[4px] text-[11px]"
            style={
              bothReady
                ? { backgroundColor: '#ECFDF5', color: '#059669' }
                : { backgroundColor: '#F3F4F6', color: '#6B7280' }
            }
          >
            <div className="flex items-center gap-1.5 font-medium mb-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              文本提取状态
            </div>
            <ul className="space-y-0.5 ml-[18px]">
              {procurementFile && (
                <li>采购结果：「{procurementFile.fileName}」— {procurementFile.charCount.toLocaleString()} 字符已就绪</li>
              )}
              {contractFile && (
                <li>采购合同：「{contractFile.fileName}」— {contractFile.charCount.toLocaleString()} 字符已就绪</li>
              )}
              {bothReady && (
                <li className="font-medium mt-1" style={{ color: '#059669' }}>两份文档均已就绪，可启动大模型比对分析</li>
              )}
            </ul>
          </div>
        )}

        {/* "开始智能质检" 按钮 */}
        <div className="mt-auto pt-2">
          {isAnalyzing ? (
            <div
              className="w-full flex flex-col items-center gap-3 py-5 px-4 rounded-[4px]"
              style={{ backgroundColor: '#FFF5F5' }}
            >
              <svg className="animate-spin" width="32" height="32" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#FEE2E2" strokeWidth="3" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="#C8161D" strokeWidth="3" strokeLinecap="round" />
              </svg>
              <p className="text-sm font-medium text-[#1F2937]">正在深度分析法律与商务条款差异...</p>
              <p className="text-[11px] text-[#6B7280]">AI 正在逐条比对，预计耗时 5–15 秒</p>
            </div>
          ) : (
            <button
              onClick={onStartAnalysis}
              disabled={!bothReady}
              className="w-full py-2.5 text-sm font-medium rounded-[4px] transition-all duration-200 flex items-center justify-center gap-2"
              style={
                bothReady
                  ? { backgroundColor: '#C8161D', color: '#FFFFFF' }
                  : { backgroundColor: '#E5E7EB', color: '#9CA3AF', cursor: 'not-allowed' }
              }
              onMouseEnter={(e) => { if (bothReady) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#A01217'; }}
              onMouseLeave={(e) => { if (bothReady) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#C8161D'; }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              开始智能质检
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
