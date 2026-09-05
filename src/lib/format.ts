// 日期展示格式：设计稿用 MM-DD（列表/资源卡）与完整 ISO 日期（文章页）。
// 内容日期统一按 UTC 解析（frontmatter 的 date 无时区），展示不做时区换算。
export function formatShortDate(date: Date): string {
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${m}-${d}`;
}

export function formatFullDate(date: Date): string {
  const y = date.getUTCFullYear();
  return `${y}-${formatShortDate(date)}`;
}
