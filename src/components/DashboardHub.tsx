/**
 * 合同智能质检 — 导航中枢 Dashboard
 * 按业务类型分组展示合同场景卡片，引导用户进入质检工作区
 */

interface ScenarioCard {
  category: string;
  title: string;
  desc: string;
  icon: () => JSX.Element;
  active: boolean;
}

/* ---------- 场景图标组件 ---------- */

const IconIT = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

const IconEngineering = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
);

const IconService = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const IconFinance = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="1" y="4" width="22" height="16" rx="2" />
    <line x1="1" y1="10" x2="23" y2="10" />
  </svg>
);

const SCENARIOS: ScenarioCard[] = [
  {
    category: '信息技术类',
    title: 'IT软硬件设备采购合同',
    desc: '覆盖交换机、服务器、智能柜台等设备采购场景的条款合规审核',
    icon: IconIT,
    active: true,
  },
  {
    category: '工程建设类',
    title: '弱电改造与装修工程合同',
    desc: '针对总行/分行办公区弱电改造、装饰装修工程合同的专项质检',
    icon: IconEngineering,
    active: false,
  },
  {
    category: '服务类',
    title: '技术服务与外包合同',
    desc: '包含软件开发、系统运维、技术咨询等服务类合同的条款比对',
    icon: IconService,
    active: false,
  },
  {
    category: '金融类',
    title: '金融产品与服务协议',
    desc: '面向信用卡、理财、托管等金融服务协议的合规审查',
    icon: IconFinance,
    active: false,
  },
];

interface DashboardHubProps {
  onStartAudit: () => void;
  onShowToast: (text: string) => void;
}

export default function DashboardHub({ onStartAudit, onShowToast }: DashboardHubProps) {
  const handleCardClick = (active: boolean) => {
    if (active) {
      onStartAudit();
    } else {
      onShowToast('该业务场景的规则引擎正在训练中，敬请期待');
    }
  };

  return (
    <main className="flex-1 flex flex-col p-5 overflow-hidden">
      {/* 页面标题 */}
      <div className="mb-6 shrink-0">
        <h1 className="text-lg font-semibold text-[#1F2937]">合同智能质检</h1>
        <p className="text-[13px] text-[#9CA3AF] mt-1">
          请选择本次待审核的业务场景，系统将加载对应的合同规则引擎
        </p>
      </div>

      {/* 场景卡片网格 — 2×2 */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-2 gap-5 max-w-[880px]">
          {SCENARIOS.map((scenario) => (
            <button
              key={scenario.title}
              onClick={() => handleCardClick(scenario.active)}
              disabled={!scenario.active}
              className={`
                group relative flex flex-col items-start gap-3 p-6 rounded-lg border-2
                text-left transition-all duration-200
                ${scenario.active
                  ? 'bg-white border-gray-200 hover:border-[#C8161D] hover:shadow-md hover:-translate-y-0.5 cursor-pointer'
                  : 'bg-gray-50 border-gray-100 opacity-60 cursor-not-allowed select-none'
                }
              `}
            >
              {/* 类别标签 */}
              <span
                className={`
                  text-[10px] font-medium tracking-wider uppercase px-2 py-0.5 rounded-[3px]
                  ${scenario.active
                    ? 'text-[#C8161D] bg-[#FEE2E2]'
                    : 'text-[#9CA3AF] bg-gray-200'
                  }
                `}
              >
                {scenario.category}
              </span>

              {/* 图标 + 标题 */}
              <div
                className={`
                  flex items-center gap-3
                  ${scenario.active ? 'text-[#1F2937]' : 'text-[#D1D5DB]'}
                `}
              >
                <div
                  className={`
                    w-11 h-11 flex items-center justify-center rounded-md
                    ${scenario.active ? 'text-[#C8161D]' : 'text-[#D1D5DB]'}
                  `}
                  style={scenario.active ? { backgroundColor: '#FFF1F1' } : { backgroundColor: '#F3F4F6' }}
                >
                  <scenario.icon />
                </div>
                <span className="text-[15px] font-medium">{scenario.title}</span>
              </div>

              {/* 描述 */}
              <p className="text-[12px] text-[#9CA3AF] leading-relaxed">
                {scenario.desc}
              </p>

              {/* 状态标识 */}
              <div
                className={`
                  flex items-center gap-1.5 mt-1 text-[11px] font-medium
                  ${scenario.active ? 'text-[#059669]' : 'text-[#9CA3AF]'}
                `}
              >
                {scenario.active ? (
                  <>
                    <div className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
                    可启动质检
                  </>
                ) : (
                  <>
                    <div className="w-1.5 h-1.5 rounded-full bg-[#D1D5DB]" />
                    规则引擎训练中
                  </>
                )}
              </div>

              {/* 活跃卡片的 hover 右下角箭头 */}
              {scenario.active && (
                <svg
                  className="
                    absolute right-4 bottom-4 w-4 h-4 text-[#D1D5DB]
                    group-hover:text-[#C8161D] group-hover:translate-x-0.5
                    transition-all duration-200
                  "
                  width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              )}
            </button>
          ))}
        </div>

        {/* 底部提示 */}
        <p className="text-[11px] text-[#D1D5DB] mt-6 max-w-[880px]">
          更多业务场景持续接入中，请联系法务合规部开通专属合同规则引擎
        </p>
      </div>
    </main>
  );
}
