import { useEffect, useMemo } from 'react'

export function useObjectUrl(file) {
  const url = useMemo(() => {
    if (!file) return ''
    return URL.createObjectURL(file)
  }, [file])

  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url)
  }, [url])

  return url
}
