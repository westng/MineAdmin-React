export function createObjectUrl(file: Blob) {
  return URL.createObjectURL(file)
}

export function revokeObjectUrl(url: string) {
  URL.revokeObjectURL(url)
}

export function downloadResource(url: string, filename?: string) {
  const anchor = document.createElement('a')
  anchor.href = url
  if (filename) anchor.download = filename
  anchor.rel = 'noreferrer'
  anchor.target = '_blank'
  anchor.click()
}
