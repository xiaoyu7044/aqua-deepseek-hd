// @ts-nocheck
/**
 * aqua-deepseek-hd — DeepSeek Harness (HD) 插件
 * 在 HD 界面注入 DeepSeek API 价格鱼缸浮窗（白底深色鱼蓝水，匹配 HD 主题）。
 * 依赖 aqua-deepseek 包提供 widget JS 文件。
 *
 * 安装：dsh plugin --profile web add aqua-deepseek-hd
 */
import { defineTool } from '@deepseek-ai/dsh-tools'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import https from 'node:https'

export const name = 'aqua-deepseek-hd'
export const inject = ['tools', 'webServer']

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
const PRICING_URL = 'https://api-docs.deepseek.com/zh-cn/quick_start/pricing/'

function fetchUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': UA } }, (res) => {
      let data = ''
      res.on('data', (c) => data += c)
      res.on('end', () => resolve(data))
    }).on('error', reject)
  })
}

function parsePricing(html: string): any {
  const rows = html.split('<tr')
  const priceRows: number[][] = []
  for (const row of rows) {
    if (row.includes('空闲时段') || row.includes('高峰时段')) {
      const values = [...row.matchAll(/([\d.]+)元/g)].map(m => parseFloat(m[1]))
      if (values.length === 3) priceRows.push(values)
    }
  }
  if (priceRows.length !== 6) return null
  const segMatch = html.match(/高峰时段为北京时间\s*(\d{1,2})(?::\d{2})?\s*-\s*(\d{1,2})(?::\d{2})?\s*[、,，]\s*(\d{1,2})(?::\d{2})?\s*-\s*(\d{1,2})(?::\d{2})?/)
  const segments = segMatch ? [[+segMatch[1], +segMatch[2]], [+segMatch[3], +segMatch[4]]] : [[9, 12], [14, 18]]
  const models: any = {}
  const keys = ['flash', 'pro', 'vision']
  const names: Record<string, string> = { flash: 'DeepSeek-V4-Flash', pro: 'DeepSeek-V4-Pro', vision: 'DeepSeek-V4-Flash-Vision-Exp' }
  const rowOrder: [string, string][] = [['cacheHit', 'off'], ['cacheHit', 'peak'], ['cacheMiss', 'off'], ['cacheMiss', 'peak'], ['output', 'off'], ['output', 'peak']]
  for (let i = 0; i < keys.length; i++) {
    const m: any = {}
    for (let j = 0; j < rowOrder.length; j++) {
      const [cat, sub] = rowOrder[j]
      if (!m[cat]) m[cat] = {}
      m[cat][sub] = priceRows[j][i]
    }
    models[keys[i]] = { name: names[keys[i]], ...m }
  }
  return { models, segments, weekendOff: html.includes('周末') }
}

/** 从 aqua-deepseek 包读取 widget JS */
function loadWidget(): string {
  try {
    // 优先从依赖包读取
    const require = createRequire(import.meta.url)
    const pkgPath = require.resolve('aqua-deepseek/deepseek-price-widget.js')
    return readFileSync(pkgPath, 'utf-8')
  } catch {
    // fallback：同目录
    try {
      return readFileSync(new URL('./deepseek-price-widget.js', import.meta.url), 'utf-8')
    } catch {
      return ''
    }
  }
}

export function apply(ctx: any): void {
  // ---- 1. 注入鱼缸浮窗到 HD 页面 ----
  const widgetCode = loadWidget()
  if (widgetCode) {
    const widgetPath = '/plugins/aqua-deepseek-hd/widget.js'
    ctx.webServer.register({
      kind: 'exact' as const,
      path: widgetPath,
      handler: (_req: any, res: any) => {
        res.writeHead(200, {
          'Content-Type': 'application/javascript; charset=utf-8',
          'Cache-Control': 'public, max-age=3600',
        })
        res.end(widgetCode)
      },
    })

    ctx.on('webserver/index-inject', (table: any[]) => {
      // HD 主题 CSS 变量覆盖（白底深色文字蓝色强调）
      table.push({
        kind: 'style' as const,
        text: `#ds-price-widget-host{--card:#f9fafb;--card2:#f5f6f7;--border:rgba(0,0,0,.1);--border2:rgba(0,0,0,.06);--text:#0f1115;--text-secondary:#61666b;--text-tertiary:#81858c;--accent:rgb(65,118,230);--accent2:rgb(50,100,200);--warn:rgb(230,130,50);--green:rgb(50,180,80);--shadow:0 2px 8px rgba(0,0,0,.08);}`,
      })
      // HD 专属鱼缸主题（深色鱼 + 蓝水）
      table.push({
        kind: 'script' as const,
        placement: 'head' as const,
        text: `window.__AQUA_THEME__='hd';window.AQUA_THEMES=window.AQUA_THEMES||{};window.AQUA_THEMES.hd={fishColor:'#1a1d21',deadColor:'#81858c',waterRGB:'65,118,230',decorations:[]};`,
      })
      // 加载浮窗
      table.push({
        kind: 'script-src' as const,
        placement: 'body' as const,
        src: widgetPath,
      })
    })
  }

  // ---- 2. 注册 aqua_price 工具 ----
  ctx.tools.register(defineTool({
    name: 'aqua_price',
    description: '查询 DeepSeek API 实时价格（峰谷时段、各模型价格）。可选返回浮窗 JS 源码或设置主题。',
    parameters: {
      action: {
        type: 'string',
        description: 'pricing=查价格（默认）, widget=返回浮窗JS源码, theme=设置主题',
      },
      theme: {
        type: 'string',
        description: '主题名（action=theme 时必填）: default/winter/autumn/spring',
      }
    },
    output: {
      schema: { type: 'string' },
      render: (_args: any, value: any) => [{ type: 'text', text: String(value) }],
    },
    async execute({ action, theme }: { action?: string; theme?: string }) {
      const act = action || 'pricing'
      if (act === 'widget') return `🐟 Aqua DeepSeek 浮窗已注入 HD 页面（HD 主题自动适配）`
      if (act === 'theme') {
        const valid = ['default', 'winter', 'autumn', 'spring']
        if (!theme || !valid.includes(theme)) return `❌ 无效主题。可选: ${valid.join(', ')}`
        return `🎨 主题 "${theme}" 设置方式：浏览器控制台执行 window.__AQUA_THEME__ = '${theme}'; location.reload();`
      }
      try {
        const html = await fetchUrl(PRICING_URL)
        const data = parsePricing(html)
        if (!data) return '❌ 官网价格解析失败'
        const lines = ['🐟 DeepSeek API 实时价格（官网）\n']
        lines.push(`高峰时段: ${data.segments.map((s: number[]) => s[0] + ':00-' + s[1] + ':00').join(', ')}`)
        lines.push(`周末全天半价: ${data.weekendOff ? '是' : '否'}\n`)
        for (const [key, model] of Object.entries(data.models) as [string, any][]) {
          lines.push(`【${model.name}】`)
          lines.push(`  输入·缓存命中:  空闲 ¥${model.cacheHit.off}  高峰 ¥${model.cacheHit.peak}`)
          lines.push(`  输入·缓存未命中: 空闲 ¥${model.cacheMiss.off}  高峰 ¥${model.cacheMiss.peak}`)
          lines.push(`  输出:          空闲 ¥${model.output.off}  高峰 ¥${model.output.peak}`)
          lines.push('')
        }
        return lines.join('\n')
      } catch (e: any) {
        return `❌ 抓取失败: ${e.message}`
      }
    }
  }))
}
