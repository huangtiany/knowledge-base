// 两个一级栏目的元信息（文案与设计稿一致）
export const DOMAINS = {
  ai: {
    key: 'ai',
    name: 'AI / Agent',
    desc: '大模型原理、Agent 框架、RAG、微调与工具调用。这是我接下来一年的主攻方向之一。',
    glyph: '智',
    short: 'AI',
  },
  stack: {
    key: 'stack',
    name: '全栈开发',
    desc: 'Java 语言、Spring 生态、数据库、中间件与工程实践。夯实后端基本功，向全栈走。',
    glyph: '工',
    short: '全栈',
  },
} as const;

export type DomainKey = keyof typeof DOMAINS;
