import fs from 'node:fs';
import path from 'node:path';
import { defineCollection, z } from 'astro:content';
import { file, glob } from 'astro/loaders';
import YAML from 'yaml';

// —— 受控标签清单（content/tags.yaml）：全站唯一事实源 ——
// 构建期读取；形状不合法直接抛错，让构建失败。
function loadTagList() {
  const tagsPath = path.resolve(process.cwd(), 'content/tags.yaml');
  const raw = YAML.parse(fs.readFileSync(tagsPath, 'utf8'));
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('content/tags.yaml 必须是包含 ai / stack 两组的映射');
  }
  const groups = {};
  for (const dom of ['ai', 'stack'] as const) {
    const list = raw[dom];
    if (!Array.isArray(list) || list.some((t) => typeof t !== 'string' || !t.trim())) {
      throw new Error(`tags.yaml 的 ${dom} 组必须是字符串数组`);
    }
    groups[dom] = list;
  }
  return groups;
}

const TAGS = loadTagList();
const TAG_SET = new Set([...TAGS.ai, ...TAGS.stack]);

// 文章 frontmatter 最小集：title / date / tags 必填，summary 可选；
// related: false 表示不渲染文末「相关笔记」框（路线图这类枢纽页互链太多，渲染出来是噪音）
const articleSchema = z.object({
  title: z.string().min(1, 'title 必填'),
  date: z.coerce.date(),
  tags: z
    .array(z.string())
    .min(1, 'tags 必填：打标只从 tags.yaml 清单选')
    .refine((tags) => tags.every((t) => TAG_SET.has(t)), {
      message: `存在 tags.yaml 清单外的标签（可用：${[...TAG_SET].join('、')}）`,
    }),
  summary: z.string().optional(),
  related: z.boolean().optional(),
});

// 资源卡：title / url / summary / date 必填，source 可选（缺省由页面从 url 提取域名）；
// tags 可选（资源收藏页按标签分组的依据），打标规则与文章一致：只从 tags.yaml 清单选
const resourceSchema = z.object({
  title: z.string().min(1, 'title 必填'),
  url: z.string().url(),
  summary: z.string().min(1, 'summary 必填：一句话摘要'),
  date: z.coerce.date(),
  source: z.string().optional(),
  tags: z
    .array(z.string())
    .refine((tags) => tags.every((t) => TAG_SET.has(t)), {
      message: `存在 tags.yaml 清单外的标签（可用：${[...TAG_SET].join('、')}）`,
    })
    .optional(),
});

const articles = (name: 'ai' | 'stack') =>
  defineCollection({
    loader: glob({ pattern: '**/*.md', base: `./content/${name}` }),
    schema: articleSchema,
  });

const resources = (name: 'ai' | 'stack') =>
  defineCollection({
    loader: file(`./content/${name}/resources.yaml`, {
      parser: (text: string) => {
        const items = YAML.parse(text);
        if (!Array.isArray(items)) throw new Error(`${name}/resources.yaml 必须是资源卡数组`);
        return items.map((item, i) => ({ ...item, id: `${item.date}-res-${i + 1}` }));
      },
    }),
    schema: resourceSchema,
  });

export const collections = {
  ai: articles('ai'),
  stack: articles('stack'),
  aiResources: resources('ai'),
  stackResources: resources('stack'),
};
