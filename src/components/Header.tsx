import type { ViewState } from '../types';

const THIRD_LEVEL_LABEL: Record<Exclude<ViewState, 'login' | 'dashboard'>, string> = {
  workspace: 'IT软硬件设备采购合同审核',
  history: '质检历史记录',
  knowledge: '质检规则配置',
};

interface HeaderProps {
  activeView: ViewState;
  onNavigate: (view: ViewState) => void;
}

/** 面包屑分隔符 — 统一浅灰 */
function Sep() {
  return <span className="text-[#D1D5DB] select-none">/</span>;
}

/**
 * 顶部全局状态栏
 * 左侧：状态驱动动态面包屑
 * 右侧：操作人信息
 */
export default function Header({ activeView, onNavigate }: HeaderProps) {
  const isOnDashboard = activeView === 'dashboard';

  return (
    <header
      className="h-[60px] bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0"
      style={{ borderBottomColor: '#E5E7EB' }}
    >
      {/* 面包屑导航 */}
      <nav className="flex items-center gap-2 text-sm">
        {/* L1：固定父级 */}
        <span className="text-[#B0B7C3]">智审合规助手</span>
        <Sep />

        {/* L2：合同智能质检 — 非中枢页时可点击回退 */}
        {isOnDashboard ? (
          <span className="text-[#1F2937] font-medium">合同智能质检</span>
        ) : (
          <button
            onClick={() => onNavigate('dashboard')}
            className="text-[#6B7280] hover:text-[#C8161D] transition-colors cursor-pointer"
          >
            合同智能质检
          </button>
        )}

        {/* L3：当前视图 — 仅非中枢页展示 */}
        {!isOnDashboard && (
          <>
            <Sep />
            <span className="text-[#1F2937] font-medium">
              {THIRD_LEVEL_LABEL[activeView]}
            </span>
          </>
        )}
      </nav>

      {/* 操作人信息 */}
      <div className="flex items-center gap-3">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#059669]" />
        </span>
        <span className="text-sm text-[#1F2937] font-medium">法务专员 - 张三</span>
        <div className="w-8 h-8 rounded-full bg-[#E5E7EB] flex items-center justify-center text-xs text-[#6B7280] font-medium">
          张
        </div>
      </div>
    </header>
  );
}
