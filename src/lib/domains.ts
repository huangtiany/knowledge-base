// 三个一级栏目的元信息（文案与设计稿一致）
export const DOMAINS = {
  ai: {
    key: 'ai',
    name: 'AI / Agent',
    desc: '大模型原理、Agent 框架、RAG、微调与工具调用。这是我接下来一年的主攻方向之一。',
    glyph: '智',
    short: 'AI',
  },
  backend: {
    key: 'backend',
    name: '后端',
    desc: 'Java 语言、Spring 生态、数据库、中间件与工程实践。从前端出发补齐的服务端基本功。',
    glyph: '工',
    short: '后端',
  },
  front: {
    key: 'front',
    name: '前端',
    desc: 'HTML/CSS、JavaScript/TypeScript、浏览器原理、Vue 与 React、工程化与性能。吃饭的家伙，也成体系地整理。',
    glyph: '页',
    short: '前端',
  },
} as const;

export type DomainKey = keyof typeof DOMAINS;
