import assert from 'node:assert/strict'
import { mkdtempSync, readdirSync, existsSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { createServer } from 'vite'
import { Window } from 'happy-dom'
import axios from 'axios'

test('BioTech plugins and module entry files resolve through the same public path contract', async () => {
  const window = new Window({
    url: 'http://localhost/',
    settings: { disableCSSFileLoading: true, disableJavaScriptFileLoading: true, disableIframePageLoading: true },
  })
  for (const key of ['window', 'document', 'localStorage', 'navigator', 'MutationObserver'])
    Object.defineProperty(globalThis, key, { value: key === 'window' ? window : window[key], configurable: true })
  const requests = []
  const previousAdapter = axios.defaults.adapter
  axios.defaults.adapter = async config => {
    requests.push(config.method)
    throw new Error('Network blocked in plugin integration test')
  }
  const cacheDir = mkdtempSync(path.join(os.tmpdir(), 'biotech-plugin-test-'))
  let server, runtime, dispose
  try {
    server = await createServer({
      mode: 'test',
      cacheDir,
      server: { middlewareMode: true, hmr: false, open: false },
      appType: 'custom',
      logLevel: 'error',
    })
    const { bootstrap } = await server.ssrLoadModule('/src/app/bootstrap.ts')
    ;({ runtime } = await server.ssrLoadModule('/src/app/runtime/instance.ts'))
    const entries = []
    if (existsSync('src/plugins'))
      for (const vendor of readdirSync('src/plugins', { withFileTypes: true }).filter(v => v.isDirectory())) {
        for (const folder of readdirSync(`src/plugins/${vendor.name}`, { withFileTypes: true }).filter(v =>
          v.isDirectory(),
        )) {
          for (const ext of ['ts', 'tsx']) {
            const file = `src/plugins/${vendor.name}/${folder.name}/index.${ext}`
            if (existsSync(file))
              entries.push({
                directory: `${vendor.name}/${folder.name}`,
                plugin: (await server.ssrLoadModule(`/${file}`)).default,
              })
          }
        }
      }
    const modulePages = readdirSync('src/modules', { recursive: true }).filter(
      file => /(?:^|\/)views\/(?:[^/]+\/)*index\.(tsx|jsx)$/.test(file) && !/\/(?:components|hooks|data)\//.test(file),
    )
    for (let cycle = 0; cycle < 2; cycle++) {
      dispose = await bootstrap()
      assert.deepEqual(runtime.plugins.getErrors(), {})
      assert.equal(runtime.tableCellRenderers.get().has('west/cell-enhance'), true)
      assert.ok(runtime.proTableToolbars.get().size > 0)
      assert.ok(runtime.publicRoutes.getSnapshot().some(route => route.path === '/login/feishu/callback'))
      const slots = runtime.slots.getSnapshot()
      for (const slot of ['auth.methods', 'account.bindings', 'notifications', 'account.preferences', 'shell.overlays'])
        assert.ok(
          slots.some(entry => entry.slot === slot),
          slot,
        )
      for (const { directory, plugin } of entries)
        assert.equal(runtime.plugins.isEnabled(directory), plugin.config.enable, directory)
      for (const file of modulePages) {
        const component = file.replace(/\.(tsx|jsx)$/, '')
        assert.ok(runtime.views.has(component, 'modules/'), component)
        assert.ok((await server.ssrLoadModule(`/src/modules/${file}`)).default, component)
      }
      for (const { directory, plugin } of entries.filter(entry => entry.plugin.config.enable)) {
        const viewRoot = `src/plugins/${directory}/views`
        if (!existsSync(viewRoot)) continue
        for (const file of readdirSync(viewRoot, { recursive: true }).filter(
          file => /(?:^|\/)index\.(tsx|jsx)$/.test(file) && !/(?:^|\/)(?:components|hooks|data)\//.test(file),
        )) {
          const component = `${directory}/views/${file.replace(/\.(tsx|jsx)$/, '')}`
          assert.ok(runtime.views.has(component, 'plugins/'), component)
          assert.ok((await server.ssrLoadModule(`/${viewRoot}/${file}`)).default, component)
        }
        for (const view of plugin.views ?? [])
          assert.ok(
            runtime.navigation.getState().routes.some(route => route.path === view.path),
            view.path,
          )
      }
      assert.equal(requests.length, 0)
      dispose()
      dispose = undefined
      assert.equal(runtime.plugins.list().length, 0)
      assert.equal(runtime.tableCellRenderers.get().size, 0)
      assert.equal(runtime.proTableToolbars.get().size, 0)
      assert.equal(runtime.slots.getSnapshot().length, 0)
      assert.equal(runtime.publicRoutes.getSnapshot().length, 0)
      assert.equal(
        runtime.navigation.getState().routes.some(route => route.path === '/mine-crontab'),
        false,
      )
    }
    console.log(`Resolved ${modulePages.length} module entry pages and ${entries.length} plugin entries`)
  } finally {
    dispose?.()
    runtime?.dispose()
    await server?.close()
    axios.defaults.adapter = previousAdapter
    rmSync(cacheDir, { recursive: true, force: true })
    await window.happyDOM.abort()
    window.close()
  }
})
