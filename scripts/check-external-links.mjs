// 资源卡与 roadmap 外链体检：
//   node scripts/check-external-links.mjs
// 收集两个 resources.yaml 与两个 roadmap.md 里的所有 http(s) 链接，
// HEAD（失败降级 GET）检测可达性，死链/超时输出报告并以非零码退出。
// CI 里由 .github/workflows/link-health.yml 每周执行；本地也可随时手跑。
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TIMEOUT_MS = 15000;
const CONCURRENCY = 8;
const RETRIES = 2;

function collect() {
  const found = new Map(); // url -> { where: Set<string>, title?: string }
  const add = (url, where, title) => {
    if (!/^https?:\/\//.test(url)) return;
    if (!found.has(url)) found.set(url, { where: new Set(), title });
    found.get(url).where.add(where);
  };
  for (const dom of ['ai', 'stack']) {
    const cards = YAML.parse(readFileSync(resolve(root, `content/${dom}/resources.yaml`), 'utf8'));
    for (const card of cards) add(card.url, `${dom}/resources.yaml`, card.title);
    const md = readFileSync(resolve(root, `content/${dom}/roadmap.md`), 'utf8');
    for (const m of md.matchAll(/https?:\/\/[^\s)）\]>"']+/g)) {
      add(m[0].replace(/[.,;]+$/, ''), `${dom}/roadmap.md`);
    }
  }
  return found;
}

async function probe(url) {
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'HEAD',
        redirect: 'follow',
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { 'user-agent': 'gezhi-link-check/1.0 (personal knowledge base)' },
      });
      if (res.status < 400) return { ok: true, status: res.status };
      // 一些站点拒绝 HEAD，用 GET 重试一次
      if (attempt < RETRIES || res.status === 405 || res.status === 501) {
        const get = await fetch(url, {
          redirect: 'follow',
          signal: AbortSignal.timeout(TIMEOUT_MS),
          headers: { 'user-agent': 'gezhi-link-check/1.0 (personal knowledge base)' },
        });
        if (get.status < 400) return { ok: true, status: get.status };
        return { ok: false, status: get.status, reason: `HTTP ${get.status}` };
      }
      return { ok: false, status: res.status, reason: `HTTP ${res.status}` };
    } catch (err) {
      if (attempt >= RETRIES) {
        return { ok: false, status: 0, reason: err?.name === 'TimeoutError' ? '超时' : err?.cause?.code ?? err?.message ?? '网络错误' };
      }
    }
  }
}

const links = [...collect().entries()];
console.log(`外链体检：共 ${links.length} 个链接，并发 ${CONCURRENCY}，超时 ${TIMEOUT_MS / 1000}s\n`);

const results = new Array(links.length);
let cursor = 0;
async function worker() {
  while (cursor < links.length) {
    const i = cursor++;
    const [url] = links[i];
    results[i] = [url, await probe(url)];
    process.stdout.write(`\r  已检查 ${i + 1}/${links.length}`);
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
console.log('\n');

const dead = results.filter(([, r]) => !r.ok);
if (dead.length === 0) {
  console.log('全部链接可达。');
} else {
  console.error(`发现 ${dead.length} 个不可达链接：\n`);
  for (const [url, r] of dead) {
    const meta = links.find(([u]) => u === url)?.[1];
    const where = [...meta.where].join(', ');
    console.error(`  [${r.reason}]  ${url}`);
    console.error(`      出现于: ${where}${meta.title ? `（${meta.title}）` : ''}`);
  }
  process.exit(1);
}
