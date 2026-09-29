import path from 'node:path'

/**
 * Rebuild Vite's resolution graph after source files are added or removed.
 * Ordinary edits retain Fast Refresh; structural edits are batched into one restart.
 * @returns {import('vite').Plugin}
 */
export function sourceStructureHmr() {
  let sourceRoot = ''
  let timer

  return {
    name: 'mineadmin-source-structure-hmr',
    apply: 'serve',
    enforce: 'pre',
    configResolved(config) {
      sourceRoot = path.resolve(config.root, 'src')
    },
    hotUpdate({ type, file, server }) {
      if (type === 'update' || !/\.[cm]?[jt]sx?$/.test(file) || /\.d\.[cm]?ts$/.test(file)) return
      const relative = path.relative(sourceRoot, file)
      if (relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) return

      clearTimeout(timer)
      // Do not restart inside the hotUpdate promise: closing Vite waits for pending hooks.
      timer = setTimeout(() => {
        timer = undefined
        server.config.logger.info('[HMR] 源码文件结构已变化，重建模块图并刷新页面。')
        void server.restart().catch(error => {
          server.config.logger.error(`[HMR] 自动重启失败：${error.message}`)
        })
      }, 300)
      return []
    },
    closeBundle() {
      clearTimeout(timer)
      timer = undefined
    },
  }
}
