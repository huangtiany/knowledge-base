import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

// 页面侧读取受控标签清单（构建期 Node 环境）；内容校验在 content.config.ts，
// 两处共用 content/tags.yaml 这一个事实源。
export function loadTags(): { ai: string[]; backend: string[]; front: string[] } {
  const tagsPath = path.resolve(process.cwd(), 'content/tags.yaml');
  return YAML.parse(fs.readFileSync(tagsPath, 'utf8'));
}
