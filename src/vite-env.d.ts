/// <reference types="vite/client" />

// 声明 pdfjs-dist worker 的 ?url 导入类型（Vite 静态资源导入）
declare module 'pdfjs-dist/build/pdf.worker.min.mjs?url' {
  const url: string;
  export default url;
}

// 声明环境变量类型
interface ImportMetaEnv {
  /** LLM API Key */
  readonly VITE_LLM_API_KEY: string;
  /** LLM API 端点（默认 DeepSeek） */
  readonly VITE_LLM_API_BASE?: string;
  /** LLM 模型名称（默认 deepseek-chat） */
  readonly VITE_LLM_MODEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
