export async function copyText(value: string) {
  if (!navigator.clipboard) return false
  await navigator.clipboard.writeText(value)
  return true
}

export default copyText
