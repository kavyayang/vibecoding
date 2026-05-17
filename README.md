# 招商银行合同智能质检系统

基于大语言模型（LLM）的采购合同智能质检平台，自动比对采购结果与合同文件的条款差异，输出合规评分与修正建议。

## 核心功能

- **双文档上传解析** — 支持 PDF / DOCX 格式，自动提取并清洗文本，分别上传采购结果与合同文件进行比对。
- **LLM 智能条款比对** — 调用 DeepSeek（兼容 OpenAI 格式）大模型，从语义层面比对商务条款、时间框架和法律条款，识别 Match / Missing / Variance 三种状态。
- **Agent 编排器** — 前端实现 Tool Use & Reasoning Loop，逐条款独立调用 LLM 分析，完整展示推理过程（Thought → Action → Observation），单条失败不影响其他条款。
- **合规分引擎** — 基于「基准 100 分扣减法」，高风险 -15 分、中风险 -8 分、低风险 -3 分，支持必检红线翻倍扣分和价格容差降级。
- **可配置规则引擎** — 自定义合格阈值、价格容差、必检条款类别；支持规则模板的收藏、切换与删除，规则变更后即时重算合规分。
- **质检历史记录** — 自动持久化到本地存储，支持查看历史报告与导出差异条款 TXT 文件。
- **差异报告导出** — 一键生成包含原文对比、差异分析和修正建议的纯文本报告。

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | React 18 + TypeScript |
| 构建 | Vite 6 |
| 样式 | Tailwind CSS 3 |
| 文档解析 | pdfjs-dist 4（PDF）+ mammoth 1.8（DOCX） |
| 文件上传 | react-dropzone |
| LLM 集成 | DeepSeek Chat API（兼容 OpenAI 格式） |

## 快速开始

### 环境要求

- Node.js >= 18
- npm >= 9

### 安装与运行

```bash
# 安装依赖
npm install

# 配置环境变量（复制 .env.example 并填入 API Key）
cp .env.example .env

# 启动开发服务器
npm run dev

# 生产构建
npm run build

# 预览生产构建
npm run preview
```

### 环境变量

在 `.env` 文件中配置以下变量：

```env
# LLM API Key（必填）
VITE_LLM_API_KEY=sk-your-api-key

# LLM API 端点（可选，默认 DeepSeek）
VITE_LLM_API_BASE=https://api.deepseek.com/v1

# LLM 模型名称（可选，默认 deepseek-chat）
VITE_LLM_MODEL=deepseek-chat
```

系统兼容所有 OpenAI 格式的 API，可替换为 Kimi、GPT 等模型。

## 项目结构

```
src/
├── App.tsx                     # 应用主入口，状态管理与路由
├── main.tsx                    # ReactDOM 挂载
├── types.ts                    # 全局类型定义
├── index.css                   # Tailwind + 全局样式
├── mockData.ts                 # Mock 数据与 KPI 计算
├── components/
│   ├── LoginView.tsx           # 登录页
│   ├── DashboardHub.tsx        # 工作台首页
│   ├── Sidebar.tsx             # 侧边导航
│   ├── Header.tsx              # 顶栏
│   ├── KPICards.tsx            # KPI 指标卡片
│   ├── UploadPanel.tsx         # 双文档上传面板
│   ├── ClauseList.tsx          # 条款比对结果列表
│   ├── ClauseAccordion.tsx     # 单条款详情展开
│   ├── RingProgress.tsx        # 环形进度条
│   ├── AgentTerminal.tsx       # Agent 编排器终端
│   ├── HistoryView.tsx         # 历史记录页
│   ├── RuleConfigDrawer.tsx    # 规则配置抽屉
│   └── Toast.tsx               # 消息提示
├── services/
│   └── llmService.ts           # LLM API 调用与 System Prompt
└── utils/
    ├── parseDocument.ts        # PDF/DOCX 文档解析
    ├── scoring.ts              # 合规分计算引擎
    └── exportReport.ts         # 报告导出工具
```

## 合规评分逻辑

系统采用「基准 100 分扣减法」：

| 风险等级 | 扣分 |
|----------|------|
| 高风险（涉及金额、违约责任、保密等） | -15 |
| 中风险（一般条款差异） | -8 |
| 低风险（已匹配条款） | -3 |

额外规则：
- **必检红线翻倍** — 命中用户启用的法务红线类别时，扣分权重 ×2
- **价格容差降级** — 价格条款的中风险在容差范围内降为低风险处理
- 总分最低为 0 分

## 使用流程

1. **登录** — 输入员工编号与密码进入系统
2. **上传文档** — 分别上传采购结果文件和合同文件（PDF / DOCX）
3. **启动质检** — 点击「启动智能质检」，Agent 编排器逐条款调用 LLM 进行比对
4. **查看结果** — 查看 KPI 指标卡片、条款比对列表，展开详情查看差异分析与修正建议
5. **调整规则** — 在规则配置抽屉中调整合格阈值或切换模板，合规分即时重算
6. **导出报告** — 一键生成差异条款报告并下载为 TXT 文件

## License

Internal use — 招商银行
