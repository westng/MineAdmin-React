import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { createServer } from 'vite'

test('达人日志的字段列布局实际进入 Vite CSS，忽略业务目录不会使内容退化为竖排', async () => {
  const source = await readFile(
    new URL('../src/modules/creator/allocation/views/components/AllocationLogEntry.tsx', import.meta.url),
    'utf8',
  )
  // 从业务文件读取类名，避免测试文件本身让 Tailwind 扫描到原本遗漏的样式。
  const columns = [
    ...new Set(
      [...source.matchAll(/className="([^"]+)"/g)]
        .flatMap(match => match[1].split(/\s+/))
        .filter(candidate => candidate.includes('grid-cols-[')),
    ),
  ]
  assert.ok(columns.length > 0, '日志需要明确的字段列布局')

  const server = await createServer({
    logLevel: 'error',
    server: { middlewareMode: true, hmr: false, watch: null, preTransformRequests: false },
  })
  try {
    const result = await server.transformRequest('/src/assets/styles/globals.css')
    const encoded = result?.code.match(/const __vite__css = (".*")/)
    assert.ok(encoded, 'Vite 必须生成真实样式表')
    const css = JSON.parse(encoded[1])
    for (const candidate of columns) {
      const selector = '.' + candidate.replace(/([^A-Za-z0-9_-])/g, '\\$1')
      const start = css.indexOf(selector)
      assert.notEqual(start, -1, `缺少字段布局样式：${candidate}`)
      const block = css.slice(css.indexOf('{', start), css.indexOf('}', start))
      const expected = candidate.slice(candidate.indexOf('[') + 1, -1).replaceAll('_', ' ')
      assert.ok(
        block.replaceAll(/\s/g, '').includes(`grid-template-columns:${expected}`.replaceAll(/\s/g, '')),
        `字段列声明无效：${candidate}`,
      )
    }
  } finally {
    await server.close()
  }
})
