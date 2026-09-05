// @ts-check
import { defineConfig } from 'astro/config';

// 项目站：https://huangtiany.github.io/knowledge-base/
// base 必须与仓库名一致；所有页面链接经 Astro 自动带前缀。
export default defineConfig({
  site: 'https://huangtiany.github.io',
  base: '/knowledge-base/',
});
