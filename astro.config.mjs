// @ts-check
import { defineConfig } from 'astro/config';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeSlug from 'rehype-slug';
import { rehypeMathDisplay } from './src/plugins/rehype-math-display.mjs';
import { cbBarTransformer } from './src/plugins/shiki-cb-bar.mjs';
import { rehypeCbBar } from './src/plugins/rehype-cb-bar.mjs';
import { rehypeH2Numbering } from './src/plugins/rehype-h2-numbering.mjs';
import { rehypeImgFigure } from './src/plugins/rehype-img-figure.mjs';

// 站点 base 单一来源：site 配置与 rehype 插件共用，避免两处漂移
const BASE = '/knowledge-base';

// 项目站：https://huangtiany.github.io/knowledge-base/
// base 必须与仓库名一致；所有页面链接经 Astro 自动带前缀。
export default defineConfig({
  site: 'https://huangtiany.github.io',
  base: BASE + '/',
  markdown: {
    // 代码高亮：Shiki 构建期内联样式；主题按设计稿 tk-* 配色定制
    shikiConfig: {
      theme: {
        name: 'gezhi-dark',
        type: 'dark',
        colors: {
          'editor.background': '#1E2530',
          'editor.foreground': '#D7DEE8',
        },
        tokenColors: [
          { scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: '#5D6B7C', fontStyle: 'italic' } },
          { scope: ['keyword', 'keyword.control', 'storage', 'storage.type'], settings: { foreground: '#C792EA' } },
          { scope: ['string', 'string.quoted'], settings: { foreground: '#9ECE8C' } },
          { scope: ['entity.name.function', 'support.function', 'meta.function-call', 'variable.function'], settings: { foreground: '#82AAFF' } },
          { scope: ['constant.numeric', 'constant.language', 'constant.character'], settings: { foreground: '#F0A45D' } },
          { scope: ['entity.name.type', 'support.type', 'support.class', 'entity.name.class'], settings: { foreground: '#FFCB6B' } },
          { scope: ['variable', 'meta.variable', 'source'], settings: { foreground: '#D7DEE8' } },
        ],
      },
      transformers: [cbBarTransformer()],
    },
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeSlug, rehypeKatex, rehypeMathDisplay, rehypeImgFigure, rehypeCbBar, rehypeH2Numbering],
  },
});
