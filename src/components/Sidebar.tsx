import type { ViewState } from '../types';

/** 首页图标 */
const IconHome = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

/** 质检历史图标 */
const IconHistory = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

/** 知识库图标 */
const IconBook = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
  </svg>
);

const NAV_ITEMS: { id: ViewState; icon: () => JSX.Element; label: string }[] = [
  { id: 'dashboard', icon: IconHome, label: '首页' },
  { id: 'history', icon: IconHistory, label: '质检历史' },
  { id: 'knowledge', icon: IconBook, label: '知识库' },
];

interface SidebarProps {
  activeTab: ViewState;
  onTabChange: (tab: ViewState) => void;
}

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <aside
      className="h-screen flex flex-col items-center bg-[#111827] py-5 shrink-0 select-none"
      style={{ width: 64 }}
    >
      {/* 招商银行 Logo */}
      <div
        className="w-9 h-9 rounded-md flex items-center justify-center mb-8"
        style={{ backgroundColor: '#C8161D' }}
      >
        <span className="text-white text-sm font-bold leading-none">招</span>
      </div>

      {/* 导航图标列表 */}
      <nav className="flex flex-col items-center gap-3">
        {NAV_ITEMS.map(({ id, icon: Icon, label }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              title={label}
              className={`
                w-10 h-10 flex items-center justify-center rounded-md transition-colors duration-200
                ${isActive ? 'text-white' : 'text-gray-500 hover:text-gray-300'}
              `}
              style={isActive ? { backgroundColor: 'rgba(200, 22, 29, 0.35)' } : undefined}
            >
              <Icon />
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
