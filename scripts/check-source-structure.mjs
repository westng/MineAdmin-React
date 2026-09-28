import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { projectRoot } from './public-files.mjs'

const sourceDirectories = new Set([
  'app',
  'assets',
  'components',
  'hooks',
  'layouts',
  'modules',
  'plugins',
  'provider',
  'router',
  'services',
  'store',
  'types',
  'utils',
])

/** Enforce source ownership and reject retired physical entry points. */
export function checkSourceStructure(root = projectRoot) {
  const failures = []
  const inspect = (directory, allowed) => {
    const absolute = path.join(root, directory)
    if (!existsSync(absolute)) return
    for (const entry of readdirSync(absolute, { withFileTypes: true })) {
      if (entry.name === '.DS_Store') continue
      if (!allowed(entry.name, entry.isDirectory())) failures.push(`${directory}/${entry.name}`)
    }
  }
  inspect('src', (name, directory) => directory && sourceDirectories.has(name))
  inspect('src/components', (name, directory) => directory && /^(ma-.+|reui|business)$/.test(name))
  inspect('src/hooks', (name, directory) =>
    directory
      ? ['auth', 'query', 'runtime', 'i18n', 'ui'].includes(name)
      : ['use-route.ts', 'use-dictionary.ts'].includes(name),
  )
  inspect('src/store', (name, directory) => directory && ['settings', 'tabs', 'keep-alive'].includes(name))
  inspect('src/provider', (name, directory) =>
    directory
      ? ['runtime', 'query', 'access', 'plugins', 'extensions'].includes(name)
      : ['index.ts', 'app-provider.tsx'].includes(name),
  )
  inspect('src/types', (name, directory) => !directory && ['api.ts', 'env.d.ts'].includes(name))
  for (const retired of [
    'src/app/runtime.ts',
    'src/app/create-runtime.ts',
    'src/app/bootstrap.tsx',
    'src/app/branding.ts',
    'src/app/menu-policy.ts',
    'src/app/application.css',
    'src/app/default-styles.css',
    'src/provider/query/client.ts',
    'src/provider/query/resource.ts',
    'src/provider/query/table-store.ts',
    'src/app/private',
    'src/layouts/provider.tsx',
    'src/layouts/uc.tsx',
    'src/layouts/components/bars/index.tsx',
    'src/router/component-registry.ts',
    'src/router/component-path.ts',
    'src/router/manifest.ts',
    'src/router/registry.ts',
    'src/router/route-assembly.ts',
    'src/router/static-routes/',
    'src/router/view-discovery.ts',
    'src/store/modules/useRouteStore.ts',
    'src/store/modules/useUserStore.ts',
    'src/store/modules/useMenuStore.ts',
    'src/store/modules/useResourceStore.ts',
    'src/utils/http.ts',
    'types/auto-imports.d.ts',
    'types/components.d.ts',
  ])
    if (existsSync(path.join(root, retired))) failures.push(retired)
  return failures
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const failures = checkSourceStructure()
  if (failures.length) {
    console.error(`Source layout contains retired or unclassified entries:\n${failures.join('\n')}`)
    process.exitCode = 1
  } else console.log('Source layout matches the approved physical directories; no retired entries')
}
