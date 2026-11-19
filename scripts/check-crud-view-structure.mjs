import path from 'node:path'
import ts from 'typescript'

const configTypes = /\bMa(?:ProTableColumns|TableColumn|SearchItem|FormItem)\b/
const factoryName = /^(?:get\w*(?:Columns|SearchItems|FormItems|FormSections)|tableColumns|searchItems)$/
const componentKinds = new Map([
  ['MaTable', 'table'],
  ['MaProTable', 'table'],
  ['MaForm', 'form'],
  ['MaSearch', 'search'],
])

function nameOf(node) {
  if (!node) return ''
  if (ts.isIdentifier(node) || ts.isStringLiteral(node)) return node.text
  if (ts.isPropertyAccessExpression(node)) return node.name.text
  return ''
}

function unwrap(node) {
  while (node && (ts.isAsExpression(node) || ts.isSatisfiesExpression(node) || ts.isParenthesizedExpression(node)))
    node = node.expression
  return node
}

function configKind(type) {
  if (!type) return null
  if (/Ma(?:ProTableColumns|TableColumn)\b/.test(type)) return 'table'
  if (/MaSearchItem\b/.test(type)) return 'search'
  if (/MaFormItem\b/.test(type)) return 'form'
  return null
}

function objectKind(node) {
  if (!ts.isObjectLiteralExpression(node)) return null
  const keys = new Set(node.properties.map(property => nameOf(property.name)))
  if (keys.has('cellRender') || keys.has('operationConfigure')) return 'table'
  if (keys.has('prop') && (keys.has('render') || keys.has('component') || keys.has('itemProps'))) return 'form'
  if (keys.has('prop') && keys.has('label'))
    return ['width', 'minWidth', 'sortable', 'columnDef'].some(key => keys.has(key)) ? 'table' : 'field'
  return null
}

function arrayKind(node) {
  node = unwrap(node)
  if (!node || !ts.isArrayLiteralExpression(node)) return null
  return node.elements.map(unwrap).map(objectKind).find(Boolean) ?? null
}

function insideMemo(node, memoNames) {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (ts.isCallExpression(parent) && memoNames.has(nameOf(parent.expression))) return true
  }
  return false
}

function hasOwnJsx(node) {
  if (!node) return false
  if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node)) return true
  // A handler may contain a nested renderer without itself running during render.
  if (ts.isFunctionLike(node)) return false
  return ts.forEachChild(node, hasOwnJsx) ?? false
}

function inRenderOrModuleScope(node) {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (ts.isJsxAttribute(parent) && /^on[A-Z]/.test(nameOf(parent.name))) return false
    if (ts.isFunctionLike(parent)) {
      const name = nameOf(parent.name) || (ts.isVariableDeclaration(parent.parent) ? nameOf(parent.parent.name) : '')
      if (/^(?:[A-Z]|use[A-Z])/.test(name) || hasOwnJsx(parent.body)) return true
      if (name) return false
      // Named handlers and inline callbacks are deferred; map/IIFE callbacks in a render
      // expression still inherit the containing component's render scope.
      if (ts.isPropertyAssignment(parent.parent) && /^on[A-Z]/.test(nameOf(parent.parent.name))) return false
      if (
        ts.isCallExpression(parent.parent) &&
        /^use(?:Effect|LayoutEffect|Callback|EffectEvent)$/.test(nameOf(parent.parent.expression))
      )
        return false
    }
  }
  return true
}

function isOperation(node) {
  return node.properties.some(property => {
    if (!ts.isPropertyAssignment(property)) return false
    const key = nameOf(property.name)
    let value = unwrap(property.initializer)
    if (key === 'label' && ts.isCallExpression(value)) value = value.arguments[0]
    return (
      value &&
      ts.isStringLiteral(value) &&
      ((key === 'type' && value.text === 'operation') ||
        (key === 'prop' && /^(?:operation|actions?)$/.test(value.text)) ||
        (key === 'label' && /^(?:操作|Actions?|Operation)$/i.test(value.text)))
    )
  })
}

/** Inspect source text, including files excluded from Git; this never executes a view. */
export function inspectCrudViews(files) {
  const parsed = files.map(({ file, source }) => ({
    file: file.split(path.sep).join('/'),
    source: ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX),
  }))
  const aliases = new Map()
  let hasConfiguration = false
  for (const { file, source } of parsed) {
    const names = new Map(componentKinds)
    for (const statement of source.statements) {
      if (
        !ts.isImportDeclaration(statement) ||
        !/\/ma-(?:(?:pro-)?table|form|search)$/.test(statement.moduleSpecifier.text)
      )
        continue
      const imports = statement.importClause?.namedBindings
      if (imports && ts.isNamedImports(imports))
        for (const item of imports.elements)
          if (componentKinds.has(item.propertyName?.text ?? item.name.text))
            names.set(item.name.text, componentKinds.get(item.propertyName?.text ?? item.name.text))
    }
    aliases.set(file, names)
    const visit = node => {
      if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && names.has(nameOf(node.tagName)))
        hasConfiguration = true
      ts.forEachChild(node, visit)
    }
    visit(source)
  }

  const failures = new Set()
  for (const { file, source } of parsed) {
    const inData = file.includes('/views/data/')
    const canonical = /^get(?:TableColumns|SearchItems|FormItems)\.tsx?$/.test(path.basename(file))
    const memoNames = new Set(['useMemo'])
    const hookNames = new Set()
    for (const statement of source.statements) {
      if (!ts.isImportDeclaration(statement) || statement.moduleSpecifier.text !== 'react') continue
      const imports = statement.importClause?.namedBindings
      if (imports && ts.isNamedImports(imports))
        for (const item of imports.elements) {
          const original = item.propertyName?.text ?? item.name.text
          if (original === 'useMemo') memoNames.add(item.name.text)
          if (/^use[A-Z]/.test(original)) hookNames.add(item.name.text)
        }
    }
    const fail = (node, message) => {
      const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1
      failures.add(`${file}:${line}: ${message}`)
    }
    const configuration = (node, kind) => {
      // A default Input only needs prop/label; without a type, use its canonical file to disambiguate.
      if (kind === 'field') kind = /^get(?:FormItems|SearchItems)\.tsx?$/.test(path.basename(file)) ? 'form' : 'table'
      if (!inData) fail(node, 'complete table/search/form configuration belongs in views/data factories')
      else if (
        (kind === 'table' && path.basename(file) !== 'getTableColumns.tsx') ||
        (kind === 'search' && !/^getSearchItems\.tsx?$/.test(path.basename(file))) ||
        (kind === 'form' && !/^get(?:FormItems|SearchItems)\.tsx?$/.test(path.basename(file)))
      )
        fail(node, 'use getTableColumns.tsx, getSearchItems.ts(x), or getFormItems.ts(x) for complete configuration')
    }
    const visit = node => {
      if (inData && canonical) {
        if (
          ts.isCallExpression(node) &&
          (/^use[A-Z]/.test(nameOf(node.expression)) || hookNames.has(nameOf(node.expression)))
        )
          fail(node, 'configuration factories must be pure; move Hooks into views/components')
        if (
          ts.isImportDeclaration(node) &&
          !node.importClause?.isTypeOnly &&
          /(?:^@application$|\/(?:default-application|runtime\/instance)$)/.test(node.moduleSpecifier.text)
        )
          fail(node, 'configuration factories receive dependencies; do not import the default application')
      }
      if (ts.isObjectLiteralExpression(node) && isOperation(node)) {
        if (node.properties.some(property => nameOf(property.name) === 'cellRender'))
          fail(node, "operation columns use type: 'operation' and operationConfigure.actions, not cellRender")
      }
      if (hasConfiguration) {
        if (ts.isArrayLiteralExpression(node)) {
          const kind = arrayKind(node)
          if (kind) configuration(node, kind)
        }
        if (ts.isVariableDeclaration(node) && node.initializer) {
          const value = unwrap(node.initializer)
          const kind =
            (ts.isArrayLiteralExpression(value) || ts.isArrowFunction(value) || ts.isFunctionExpression(value)
              ? configKind(node.type?.getText(source))
              : null) ?? arrayKind(value)
          if (kind) configuration(node, kind)
        }
        if (ts.isFunctionDeclaration(node) && node.body && configTypes.test(node.type?.getText(source) ?? ''))
          configuration(node, configKind(node.type.getText(source)))
        if (ts.isPropertyAssignment(node)) {
          const name = nameOf(node.name)
          if (name === 'operationConfigure') configuration(node, 'table')
          if (['tableColumns', 'searchItems'].includes(name)) {
            const value = unwrap(node.initializer)
            if (ts.isArrayLiteralExpression(value) && value.elements.length)
              configuration(node, name === 'tableColumns' ? 'table' : 'search')
          }
        }
        if (ts.isJsxAttribute(node) && ['columns', 'items'].includes(nameOf(node.name))) {
          const tag = node.parent.parent
          const component = nameOf(tag.tagName)
          if (aliases.get(file).has(component)) {
            const value = unwrap(node.initializer?.expression)
            if (value && ts.isArrayLiteralExpression(value) && value.elements.length)
              configuration(node, aliases.get(file).get(component))
          }
        }
        if (!inData && ts.isCallExpression(node)) {
          if (
            factoryName.test(nameOf(node.expression)) &&
            !/\.current\??\./.test(node.expression.getText(source)) &&
            !insideMemo(node, memoNames) &&
            inRenderOrModuleScope(node)
          )
            fail(node, 'build dynamic configuration with useMemo and complete dependencies')
          if (
            ts.isPropertyAccessExpression(node.expression) &&
            /(?:columns|items)$/i.test(node.expression.expression.getText(source)) &&
            ['push', 'unshift', 'splice'].includes(node.expression.name.text) &&
            node.arguments.some(argument => objectKind(unwrap(argument)))
          )
            fail(node, 'do not append configuration in a view; pass its conditions to the data factory')
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(source)
  }
  return [...failures]
}
