import { useState } from 'react';

interface LoginViewProps {
  onLoginSuccess: () => void;
}

const FEATURES = [
  {
    label: '强监管合规',
    desc: '契合《数据安全法》与银保监会数字化指引',
    icon: 'shield',
  },
  {
    label: 'Agent 驱动',
    desc: '独创"解析—比对—审查—建议"智能体工作流',
    icon: 'brain',
  },
  {
    label: '核心机密保护',
    desc: '私有化部署支持，智能剥离敏感水印与印章',
    icon: 'lock',
  },
];

/* 左侧特性列表 SVG 图标 */
function FeatureIcon({ type }: { type: string }) {
  const cls = 'w-[18px] h-[18px] shrink-0 mt-0.5';
  switch (type) {
    case 'shield':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="#C8161D" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
    case 'brain':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="#C8161D" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="3" />
          <line x1="12" y1="3" x2="12" y2="9" />
          <line x1="12" y1="15" x2="12" y2="21" />
          <line x1="3" y1="12" x2="9" y2="12" />
          <line x1="15" y1="12" x2="21" y2="12" />
          <line x1="5.64" y1="5.64" x2="9.9" y2="9.9" />
          <line x1="14.1" y1="14.1" x2="18.36" y2="18.36" />
          <line x1="5.64" y1="18.36" x2="9.9" y2="14.1" />
          <line x1="14.1" y1="9.9" x2="18.36" y2="5.64" />
        </svg>
      );
    case 'lock':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="#C8161D" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          <circle cx="12" cy="16" r="1" />
        </svg>
      );
    default:
      return null;
  }
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [loggingIn, setLoggingIn] = useState(false);
  const [remember, setRemember] = useState(false);

  const handleLogin = () => {
    if (loggingIn) return;
    setLoggingIn(true);
    setTimeout(() => {
      onLoginSuccess();
    }, 800);
  };

  return (
    <div className="h-screen w-full flex overflow-hidden">
      {/* ========== 左侧：品牌与愿景区 ========== */}
      <section className="w-[55%] bg-slate-900 flex flex-col justify-center px-16 relative overflow-hidden">
        {/* 径向渐变：从右上角提亮 */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black pointer-events-none" />

        {/* 微弱网格纹理叠加层 */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        <div className="relative z-10 flex flex-col gap-12 max-w-lg">
          {/* Logo + 系统简称 */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#C8161D' }}>
              <span className="text-white text-base font-bold">招</span>
            </div>
            <span className="text-[#94A3B8] text-[12px] tracking-[0.25em] font-medium uppercase">
              CMB SMART AUDIT
            </span>
          </div>

          {/* 核心标语 */}
          <div className="flex flex-col gap-3">
            <h1 className="text-[44px] font-bold text-white tracking-wide leading-tight">
              智审合规助手
            </h1>
            <p className="text-[#94A3B8] text-[15px] leading-relaxed">
              基于多智能体协同的金融级采购风控平台
            </p>
          </div>

          {/* 亮点提炼 */}
          <ul className="flex flex-col gap-5">
            {FEATURES.map((f) => (
              <li key={f.label} className="flex items-start gap-3">
                <FeatureIcon type={f.icon} />
                <div>
                  <span className="text-[#CBD5E1] text-[14px] font-medium">{f.label}</span>
                  <span className="text-[#64748B] text-[13px] ml-2">{f.desc}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ========== 右侧：员工登录卡片区 ========== */}
      <section className="w-[45%] bg-white flex items-center justify-center">
        <div className="w-full max-w-[360px] flex flex-col gap-6">
          {/* 标题 */}
          <div className="flex flex-col gap-1.5">
            <h2 className="text-2xl font-bold text-[#1F2937]">行内统一身份认证</h2>
            <p className="text-[13px] text-[#9CA3AF]">请使用招商银行内网工号登录</p>
          </div>

          {/* 表单 */}
          <div className="flex flex-col gap-4">
            {/* 员工工号 */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-[#6B7280]">员工工号 / 统一认证码</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <input
                  type="text"
                  defaultValue="zhangsan"
                  placeholder="请输入员工工号"
                  className="
                    w-full pl-9 pr-3 py-2.5 text-[14px] rounded-[6px] border border-gray-300 bg-white
                    outline-none transition-all duration-200
                    focus:border-[#C8161D] focus:ring-1 focus:ring-[#FECACA]
                    placeholder:text-[#D1D5DB]
                  "
                />
              </div>
            </div>

            {/* 密码 */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-[#6B7280]">密码</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <input
                  type="password"
                  defaultValue="••••••••"
                  placeholder="请输入密码"
                  className="
                    w-full pl-9 pr-3 py-2.5 text-[14px] rounded-[6px] border border-gray-300 bg-white
                    outline-none transition-all duration-200
                    focus:border-[#C8161D] focus:ring-1 focus:ring-[#FECACA]
                    placeholder:text-[#D1D5DB]
                  "
                />
              </div>
            </div>

            {/* 记住工号 + 忘记密码 */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <button
                  role="checkbox"
                  aria-checked={remember}
                  onClick={() => setRemember((v) => !v)}
                  className={`
                    w-4 h-4 flex items-center justify-center rounded-[3px] border
                    transition-colors duration-150
                    ${remember
                      ? 'bg-[#C8161D] border-[#C8161D]'
                      : 'bg-white border-gray-300 hover:border-[#C8161D]'
                    }
                  `}
                >
                  {remember && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
                <span className="text-[12px] text-[#6B7280]">记住工号</span>
              </label>
              <button className="text-[12px] text-[#9CA3AF] hover:text-[#C8161D] transition-colors">
                忘记密码？/ 联系 IT 支持
              </button>
            </div>

            {/* 登录按钮 */}
            <button
              onClick={handleLogin}
              disabled={loggingIn}
              className={`
                w-full flex items-center justify-center gap-2 py-2.5 rounded-[6px] text-[15px] font-medium
                transition-all duration-200 mt-1
                ${loggingIn
                  ? 'bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed shadow-none'
                  : 'bg-[#C8161D] text-white hover:bg-[#B11218] active:scale-[0.99] shadow-lg shadow-red-500/30'
                }
              `}
            >
              {loggingIn ? (
                <>
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  正在验证...
                </>
              ) : (
                '登录系统'
              )}
            </button>
          </div>

          {/* 底部提示 */}
          <p className="text-[11px] text-[#D1D5DB] text-center">
            仅限行内授权人员使用 · 登录行为将记录在案
          </p>
        </div>
      </section>
    </div>
  );
}
