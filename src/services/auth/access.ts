export interface AccessSubject {
  roles: readonly string[]
  permissions: readonly string[]
  userInfo: { username?: string; id?: number } | null
}
export interface AccessPolicy {
  permission?: string | string[]
  role?: string | string[]
  user?: string | string[]
}
function matches(actual: readonly string[], expected: unknown) {
  if (expected === undefined) return true
  const values = Array.isArray(expected) ? expected : [expected]
  if (!values.length || values.some(value => typeof value !== 'string' || !value.trim())) return false
  return actual.includes('*') || values.some(value => actual.includes(value))
}
export function evaluateAccess(policy: AccessPolicy, subject: AccessSubject) {
  if (!policy || typeof policy !== 'object' || Array.isArray(policy)) return false
  if (Object.keys(policy).some(key => !['permission', 'role', 'user'].includes(key))) return false
  if (policy.user !== undefined) {
    const users = Array.isArray(policy.user) ? policy.user : [policy.user]
    if (!users.length || users.some(value => typeof value !== 'string' || !value.trim())) return false
  }
  return (
    matches(subject.permissions, policy.permission) &&
    matches(subject.roles, policy.role) &&
    (policy.user === undefined ||
      Boolean(
        subject.userInfo?.username &&
        (typeof policy.user === 'string' ? [policy.user] : Array.isArray(policy.user) ? policy.user : []).includes(
          subject.userInfo.username,
        ),
      ))
  )
}
