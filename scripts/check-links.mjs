// 构建期死链检查：爬取 dist 全部 HTML 里的 href/src，
// 内部链接（相对路径或 /base/ 前缀）必须能解析到 dist 内真实文件（目录式路由按 index.html 判定）。
// 外链（http/https）不在此检查——资源卡外链体检由 .github/workflows/link-health.yml 定期执行。
import { readdirSync, statSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname, resolve, sep, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const dist = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const BASE = '/knowledge-base'; // 与 astro.config.mjs 的 base 保持一致

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name.endsWith('.html')) out.push(p);
  }
  return out;
}

// URL 路径 → dist 内文件路径；目录式路由接受 index.html
function urlToDistFile(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  if (clean !== '/' && !clean.endsWith('/')) {
    const direct = join(dist, clean.replaceAll('/', sep));
    if (existsSync(direct) && statSync(direct).isFile()) return direct;
  }
  return join(dist, clean.replaceAll('/', sep), 'index.html');
}

function resolveHref(pageUrl, href) {
  if (href.startsWith(BASE + '/') || href === BASE) {
    return urlToDistFile(href.slice(BASE.length));
  }
  // 相对链接基于当前页目录式 URL 解析（与浏览器行为一致）；pageUrl 已是 file:// URL
  return fileURLToPath(new URL(href, pageUrl).href);
}

const SKIP = /^(https?:|mailto:|tel:|javascript:|data:)/;
const pages = walk(dist);
const errors = [];

for (const page of pages) {
  // dist 里的页面都是目录式路由（xxx/index.html），页面 URL 即所在目录
  const pageUrl = pathToFileURL(page).href.replace(/index\.html$/, '');
  // 剥离 script/style/注释，避免内联 JS 里的模板字符串被当作链接
  const cleaned = readFileSync(page, 'utf8')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');
  for (const m of cleaned.matchAll(/\b(?:href|src)="([^"]*)"/g)) {
    const href = m[1];
    if (!href || href.startsWith('#') || SKIP.test(href)) continue;
    let target;
    try {
      target = resolveHref(pageUrl, href);
    } catch {
      errors.push(`${rel(page)}  ->  无法解析的链接: ${href}`);
      continue;
    }
    if (!existsSync(target)) {
      errors.push(`${rel(page)}  ->  ${href}`);
    }
  }
}

function rel(page) {
  return relative(dist, page).replaceAll(sep, '/');
}

if (errors.length) {
  console.error(`\n死链检查失败：${errors.length} 处内部链接指向不存在的目标\n`);
  for (const e of [...new Set(errors)]) console.error('  ' + e);
  console.error('\n修复 content 中的互链/图片引用后重新构建。');
  process.exit(1);
}
console.log(`死链检查通过：${pages.length} 个页面，所有内部链接均有效。`);
