import assert from 'node:assert/strict'
import { mkdtemp, mkdir, realpath, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { sourceStructureHmr } from '../scripts/vite-source-structure-hmr.mjs'
import { isPublicFile } from '../scripts/public-files.mjs'

const pause = ms => new Promise(resolve => setTimeout(resolve, ms))

test('开发配置依赖和 HMR 回归测试进入框架发布清单', () => {
  assert.ok(isPublicFile('scripts/vite-source-structure-hmr.mjs'))
  assert.ok(isPublicFile('scripts/vite-source-structure-hmr.d.mts'))
  assert.ok(isPublicFile('tests/framework-vite-hmr.test.mjs'))
})
async function until(check) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (await check()) return
    await pause(100)
  }
  assert.fail('Timed out waiting for Vite HMR')
}

test('入口 tsx/ts 双向迁移自动恢复，普通编辑保留 HMR，非源码文件不重启', async t => {
  const directory = await realpath(await mkdtemp(path.join(os.tmpdir(), 'mineadmin-hmr-')))
  const source = path.join(directory, 'src')
  await mkdir(path.join(source, 'icon'), { recursive: true })
  await writeFile(path.join(source, 'icon/index.tsx'), 'export function Icon(){ return <span>original</span> }')
  await writeFile(
    path.join(source, 'consumer.tsx'),
    "import { Icon } from './icon'; export function Consumer(){return <Icon/>}",
  )
  let starts = 0
  const updates = []
  const server = await createServer({
    configFile: false,
    root: directory,
    cacheDir: path.join(directory, 'cache'),
    logLevel: 'silent',
    optimizeDeps: { noDiscovery: true, include: [] },
    resolve: { alias: { react: path.resolve('node_modules/react') } },
    plugins: [
      react(),
      sourceStructureHmr(),
      {
        name: 'observe-test-server',
        configureServer(instance) {
          starts++
          const send = instance.environments.client.hot.send.bind(instance.environments.client.hot)
          instance.environments.client.hot.send = (...args) => {
            updates.push(args[0])
            return send(...args)
          }
        },
      },
    ],
    server: { port: 0, open: false, fs: { allow: [directory, path.resolve('node_modules')] } },
  })
  t.after(async () => {
    await server.close()
    await rm(directory, { recursive: true, force: true })
  })
  await server.listen()
  await server.transformRequest('/src/consumer.tsx')
  await server.transformRequest('/src/icon/index.tsx')
  await pause(400)

  await writeFile(path.join(source, 'icon/index.tsx'), 'export function Icon(){ return <span>edited</span> }')
  await until(() => updates.some(event => event?.type === 'update'))
  assert.match((await server.transformRequest('/src/icon/index.tsx')).code, /edited/)
  assert.equal(starts, 1)

  await mkdir(path.join(source, 'icon/components'))
  await writeFile(path.join(source, 'icon/components/icon.tsx'), 'export function Icon(){return <span>moved</span>}')
  await writeFile(path.join(source, 'icon/index.ts'), "export { Icon } from './components/icon'")
  await rm(path.join(source, 'icon/index.tsx'))
  await until(() => starts === 2 && !server._restartPromise)
  const forward = await server.transformRequest('/src/consumer.tsx')
  assert.match(forward.code, /\/src\/icon\/index\.ts["?]/)
  assert.doesNotMatch(forward.code, /\/src\/icon\/index\.tsx/)

  await server.transformRequest('/src/icon/index.ts')
  await writeFile(path.join(source, 'icon/index.tsx'), 'export function Icon(){return <span>restored</span>}')
  await rm(path.join(source, 'icon/index.ts'))
  await until(() => starts === 3 && !server._restartPromise)
  assert.match((await server.transformRequest('/src/consumer.tsx')).code, /\/src\/icon\/index\.tsx["?]/)
  assert.match((await server.transformRequest('/src/icon/index.tsx')).code, /restored/)

  await writeFile(path.join(source, 'notes.md'), 'not a module')
  await writeFile(path.join(source, 'types.d.ts'), 'declare const example: string')
  await mkdir(path.join(directory, 'docs'))
  await writeFile(path.join(directory, 'docs/example.ts'), 'export const example = 1')
  await pause(700)
  assert.equal(starts, 3)
})
