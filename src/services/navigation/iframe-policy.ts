export interface IframePolicy {
  allowedOrigins: readonly string[]
  sandbox: string
}
export const defaultIframePolicy: IframePolicy = { allowedOrigins: [], sandbox: 'allow-scripts allow-forms' }
export function resolveIframeSource(source: string, policy: IframePolicy): string | null {
  try {
    const url = new URL(source)
    if (
      !['https:', 'http:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      !policy.allowedOrigins.includes(url.origin)
    )
      return null
    return url.href
  } catch {
    return null
  }
}
