/**
 * Race any promise against a timeout. On timeout resolves `null` so callers
 * render fallback content FAST instead of hanging the whole page when the
 * database is slow or unreachable.
 *
 * Server renders must never await a wedged query indefinitely: one hanging
 * Supabase fetch stalls the route (Vercel function timeout, blank tab,
 * failed static generation). Wrap every build/request-time query batch and
 * treat `null` as "data unavailable — render without it".
 */
export function fetchWithTimeout<T>(task: PromiseLike<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), ms)
  })
  const run = Promise.resolve(task).then(
    (v) => {
      if (timer) clearTimeout(timer)
      return v as T | null
    },
    () => {
      if (timer) clearTimeout(timer)
      return null
    },
  )
  return Promise.race([run, timeout]).then((v) => {
    if (timer) clearTimeout(timer)
    return v
  })
}
