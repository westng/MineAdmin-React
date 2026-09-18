import { defaultIframePolicy, type IframePolicy } from '@/services/navigation/iframe-policy'
let policy = defaultIframePolicy
export const getIframePolicy = () => policy
/** Configure once at startup. Only the deployment/application chooses trusted origins. */
export function configureIframePolicy(value: IframePolicy) {
  const allowedOrigins = value.allowedOrigins.map(origin => {
    const url = new URL(origin)
    if (!['https:', 'http:'].includes(url.protocol) || url.origin !== origin || url.username || url.password)
      throw new Error('Invalid iframe origin')
    return origin
  })
  if (/\ballow-same-origin\b/.test(value.sandbox)) throw new Error('Iframe same-origin privilege is not supported')
  const previous = policy
  policy = Object.freeze({ allowedOrigins: Object.freeze(allowedOrigins), sandbox: value.sandbox })
  const installed = policy
  return () => {
    if (policy === installed) policy = previous
  }
}
