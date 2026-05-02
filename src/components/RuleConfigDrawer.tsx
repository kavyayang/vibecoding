import { useState, useEffect } from 'react';
import type { RuleConfig, RuleTemplate } from '../types';

/** 必检条款清单的显示定义 */
const MANDATORY_ITEMS: { key: keyof RuleConfig['mandatoryChecks']; label: string; desc: string }[] = [
  { key: 'breachOfContract', label: '违约责任条款', desc: '违约金比例、赔偿上限等' },
  { key: 'confidentiality', label: '保密协议条款', desc: '保密义务、商业秘密保护' },
  { key: 'disputeResolution', label: '争议管辖条款', desc: '诉讼/仲裁约定、管辖法院' },
  { key: 'dataSecurity', label: '数据安全条款', desc: '个人信息保护、数据跨境' },
  { key: 'paymentTerms', label: '付款条件条款', desc: '付款节点、比例、结算方式' },
  { key: 'warrantyTerms', label: '质保与售后条款', desc: '质保期限、维护响应时效' },
];

interface RuleConfigDrawerProps {
  isOpen: boolean;
  currentConfig: RuleConfig;
  templates: RuleTemplate[];
  onClose: () => void;
  onApply: (config: RuleConfig) => void;
  onSaveTemplate: (name: string, config: RuleConfig) => void;
  onDeleteTemplate: (id: string) => void;
}

const DEFAULT_CONFIG: RuleConfig = {
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

/**
 * 规则配置抽屉 —— 上下文设置（Contextual Settings）
 *
 * 设计理念：
 *   不通过全局路由导航到独立的"规则配置页"，而是通过 KPI 卡片上的触发器
 *   从右侧滑入一个半屏抽屉。这样用户在查看数据的同时即可调整规则，
 *   调整结果即时反馈到 KPI 合规分上，形成"所见即所得"的上下文闭环。
 *
 * 数据持久化：
 *   模板通过 localStorage 保存在父组件，本组件仅负责 UI 交互，
 *   通过回调将用户意图向上传递（onApply / onSaveTemplate）。
 */
export default function RuleConfigDrawer({
  isOpen,
  currentConfig,
  templates,
  onClose,
  onApply,
  onSaveTemplate,
  onDeleteTemplate,
}: RuleConfigDrawerProps) {
  /** 抽屉内编辑中的规则副本（每次打开时从 currentConfig 同步） */
  const [draft, setDraft] = useState<RuleConfig>(currentConfig);
  /** 模板下拉选中值 */
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  /** 收藏弹窗的可见性 */
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  /** 收藏模板名称 */
  const [saveName, setSaveName] = useState('');

  // 每次抽屉打开时，将当前生效规则同步到编辑副本
  useEffect(() => {
    if (isOpen) {
      setDraft({ ...currentConfig, mandatoryChecks: { ...currentConfig.mandatoryChecks } });
      setSelectedTemplateId('');
      setShowSaveDialog(false);
      setSaveName('');
    }
  }, [isOpen, currentConfig]);

  /** 模板选中 → 回填表单 */
  const handleSelectTemplate = (id: string) => {
    setSelectedTemplateId(id);
    const tpl = templates.find((t) => t.id === id);
    if (tpl) {
      setDraft({ ...tpl.config, mandatoryChecks: { ...tpl.config.mandatoryChecks } });
    }
  };

  /** 应用规则 → 回调父组件触发重算 */
  const handleApply = () => {
    onApply(draft);
  };

  /** 收藏模板 → 弹出命名对话框 */
  const handleSavePrompt = () => {
    setSaveName('');
    setShowSaveDialog(true);
  };

  /** 确认收藏 */
  const handleSaveConfirm = () => {
    const name = saveName.trim();
    if (!name) return;
    onSaveTemplate(name, draft);
    setShowSaveDialog(false);
  };

  /** 重置为默认规则 */
  const handleReset = () => {
    setDraft({ ...DEFAULT_CONFIG, mandatoryChecks: { ...DEFAULT_CONFIG.mandatoryChecks } });
  };

  // ============================================================
  // 渲染
  // ============================================================

  return (
    <>
      {/* 遮罩层 */}
      <div
        onClick={onClose}
        className={`
          fixed inset-0 z-40 bg-black/30
          transition-opacity duration-300
          ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        `}
      />

      {/* 抽屉本体 */}
      <aside
        className={`
          fixed top-0 right-0 z-50 h-full w-[400px] bg-white shadow-2xl
          flex flex-col
          transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* ===== 头部 ===== */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-[15px] font-semibold text-[#1F2937]">质检风控规则配置</h2>
            <p className="text-[11px] text-[#9CA3AF] mt-0.5">调整后即时重算，无需重新调用大模型</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* ===== 模板选择区 ===== */}
        {templates.length > 0 && (
          <div className="px-5 py-3 border-b border-gray-50 shrink-0">
            <label className="text-[11px] font-medium text-[#6B7280] mb-1.5 block">
              加载常用规则库
            </label>
            <div className="flex items-center gap-2">
              <select
                value={selectedTemplateId}
                onChange={(e) => handleSelectTemplate(e.target.value)}
                className="
                  flex-1 px-3 py-2 text-[13px] rounded-[6px] border border-gray-200
                  bg-white outline-none transition-colors
                  focus:border-[#C8161D] focus:ring-1 focus:ring-[#FECACA]
                  text-[#1F2937]
                "
              >
                <option value="">— 选择已保存的规则模板 —</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              {selectedTemplateId && (
                <button
                  onClick={() => {
                    onDeleteTemplate(selectedTemplateId);
                    setSelectedTemplateId('');
                  }}
                  title="删除此模板"
                  className="
                    shrink-0 w-9 h-9 flex items-center justify-center
                    rounded-[6px] text-gray-400 hover:text-red-500
                    hover:bg-red-50 transition-colors
                  "
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ===== 规则表单区 ===== */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">

          {/* 区块 A：计分策略 */}
          <section>
            <h3 className="text-[12px] font-semibold text-[#1F2937] mb-3 flex items-center gap-2">
              <span className="w-1 h-3 rounded-full bg-[#C8161D]" />
              计分策略
            </h3>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] text-[#6B7280] font-medium">
                总体合格分数线
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={50}
                  max={100}
                  step={5}
                  value={draft.passThreshold}
                  onChange={(e) => setDraft((d) => ({ ...d, passThreshold: Number(e.target.value) }))}
                  className="flex-1 accent-[#C8161D]"
                />
                <span className="text-[13px] font-bold text-[#1F2937] w-10 text-right">
                  {draft.passThreshold}
                </span>
              </div>
              <p className="text-[10px] text-[#B0B7C3]">
                低于此分数的合同将被系统阻断或标记为"需人工复核"
              </p>
            </div>
          </section>

          {/* 区块 B：商务容差 */}
          <section>
            <h3 className="text-[12px] font-semibold text-[#1F2937] mb-3 flex items-center gap-2">
              <span className="w-1 h-3 rounded-full bg-[#D97706]" />
              商务容差
            </h3>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] text-[#6B7280] font-medium">
                价格偏差阈值容忍度
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={20}
                  step={1}
                  value={draft.priceTolerance}
                  onChange={(e) => setDraft((d) => ({ ...d, priceTolerance: Number(e.target.value) }))}
                  className="flex-1 accent-[#D97706]"
                />
                <span className="text-[13px] font-bold text-[#1F2937] w-10 text-right">
                  {draft.priceTolerance}%
                </span>
              </div>
              <p className="text-[10px] text-[#B0B7C3]">
                价格条款偏差在此范围内视为"商务可接受"，降一级风险处理
              </p>
            </div>
          </section>

          {/* 区块 C：法务红线 — 必检条款清单 */}
          <section>
            <h3 className="text-[12px] font-semibold text-[#1F2937] mb-3 flex items-center gap-2">
              <span className="w-1 h-3 rounded-full bg-[#DC2626]" />
              法务红线 — 必检条款清单
            </h3>
            <p className="text-[10px] text-[#B0B7C3] mb-3">
              开启后，命中该类型的非合规条款扣分权重 ×2
            </p>
            <div className="space-y-2.5">
              {MANDATORY_ITEMS.map(({ key, label, desc }) => (
                <label
                  key={key}
                  className="flex items-center justify-between px-3 py-2.5 rounded-[6px] border border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="flex flex-col">
                    <span className="text-[12px] font-medium text-[#1F2937]">{label}</span>
                    <span className="text-[10px] text-[#B0B7C3]">{desc}</span>
                  </div>
                  {/* Switch 开关 */}
                  <button
                    role="switch"
                    aria-checked={draft.mandatoryChecks[key]}
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        mandatoryChecks: {
                          ...d.mandatoryChecks,
                          [key]: !d.mandatoryChecks[key],
                        },
                      }))
                    }
                    className={`
                      relative inline-flex h-5 w-9 shrink-0 rounded-full
                      transition-colors duration-200
                      ${draft.mandatoryChecks[key] ? 'bg-[#C8161D]' : 'bg-gray-200'}
                    `}
                  >
                    <span
                      className={`
                        inline-block h-4 w-4 rounded-full bg-white shadow-sm
                        transition-transform duration-200 mt-0.5
                        ${draft.mandatoryChecks[key] ? 'translate-x-[18px]' : 'translate-x-[2px]'}
                      `}
                    />
                  </button>
                </label>
              ))}
            </div>
          </section>
        </div>

        {/* ===== 底部操作区（悬浮） ===== */}
        <div className="shrink-0 px-5 py-4 border-t border-gray-100 bg-white flex flex-col gap-3">
          {/* 第一行：收藏 + 重置 */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSavePrompt}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-[#6B7280] rounded-[6px] border border-gray-200 hover:text-[#C8161D] hover:border-[#C8161D] transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              收藏为常用规则
            </button>
            <button
              onClick={handleReset}
              className="text-[11px] text-[#B0B7C3] hover:text-[#6B7280] transition-colors"
            >
              重置默认
            </button>
          </div>

          {/* 第二行：应用按钮 */}
          <button
            onClick={handleApply}
            className="w-full py-2.5 rounded-[6px] text-[14px] font-medium bg-[#C8161D] text-white hover:bg-[#B11218] active:scale-[0.99] transition-all"
          >
            应用规则并重新计算
          </button>
        </div>

        {/* ===== 收藏命名弹窗 ===== */}
        {showSaveDialog && (
          <>
            <div
              className="fixed inset-0 z-[60] bg-black/20"
              onClick={() => setShowSaveDialog(false)}
            />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] bg-white rounded-lg shadow-2xl p-5 w-[300px] flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-[#1F2937]">保存常用规则模板</h3>
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="请输入模板名称，如：IT集采标准规则"
                autoFocus
                className="
                  w-full px-3 py-2 text-[13px] rounded-[6px] border border-gray-300
                  outline-none focus:border-[#C8161D] focus:ring-1 focus:ring-[#FECACA]
                "
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveConfirm(); }}
              />
              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={() => setShowSaveDialog(false)}
                  className="px-3 py-1.5 text-[12px] text-[#6B7280] rounded-[6px] hover:bg-gray-100 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveConfirm}
                  className="px-4 py-1.5 text-[12px] font-medium text-white bg-[#C8161D] rounded-[6px] hover:bg-[#B11218] transition-colors"
                >
                  确认保存
                </button>
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
