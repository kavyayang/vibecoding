/**
 * 环形进度条微型组件
 * 用于 KPI 卡片中展示合规分数
 * 颜色根据分数动态变化：≥85 绿色，60~84 橙黄，<60 招行红（模块 1）
 */
interface RingProgressProps {
  /** 分数 0-100 */
  score: number;
  /** 环形直径 px */
  size?: number;
  /** 线条宽度 px */
  strokeWidth?: number;
}

export default function RingProgress({
  score,
  size = 52,
  strokeWidth = 5,
}: RingProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;

  /** 根据分数决定环形颜色（模块 1 阈值） */
  const getColor = () => {
    if (score <= 0) return '#E5E7EB';
    if (score >= 85) return '#059669';
    if (score >= 60) return '#D97706';
    return '#DC2626';
  };

  const color = getColor();

  return (
    <svg width={size} height={size} className="shrink-0">
      {/* 背景圆环 */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#E5E7EB"
        strokeWidth={strokeWidth}
      />
      {/* 进度圆环 */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="ring-animate"
        style={{
          transition: 'stroke-dashoffset 1.2s ease-out',
        }}
      />
    </svg>
  );
}
