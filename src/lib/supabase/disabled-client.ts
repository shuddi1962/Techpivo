/**
 * A no-op Supabase client used when Supabase env vars are missing
 * (e.g. during `next build` on Cloudflare/Vercel without the vars set).
 * All reads return empty data; all writes are silent no-ops. This lets
 * prerendering complete without crashing, and the client still works at
 * runtime once the env vars are configured.
 * Intentionally imports nothing from Next.js so it can be imported from
 * any module, including pages and route handlers.
 */
class DisabledQueryBuilder {
  select(..._args: any[]) {
    return this
  }
  insert(..._args: any[]) {
    return this
  }
  update(..._args: any[]) {
    return this
  }
  delete(..._args: any[]) {
    return this
  }
  eq(..._args: any[]) {
    return this
  }
  neq(..._args: any[]) {
    return this
  }
  like(..._args: any[]) {
    return this
  }
  ilike(..._args: any[]) {
    return this
  }
  order(..._args: any[]) {
    return this
  }
  limit(..._args: any[]) {
    return this
  }
  range(..._args: any[]) {
    return this
  }
  single() {
    return Promise.resolve({ data: null, error: null })
  }
  maybeSingle() {
    return Promise.resolve({ data: null, error: null })
  }
  async then(resolve: (val: any) => void) {
    resolve({ data: null, error: null })
  }
}

class DisabledAuth {
  async getUser() {
    return { data: { user: null }, error: null }
  }
}

class DisabledClient {
  from(..._args: any[]) {
    return new DisabledQueryBuilder()
  }
  auth = new DisabledAuth()
  async rpc(..._args: any[]) {
    return { data: null, error: null }
  }
  channel(..._args: any[]) {
    return {
      subscribe: () => ({ unsubscribe: () => {} }),
      remove: () => {},
      on: () => ({}),
    }
  }
  removeChannel() {}
}

export function createDisabledClient() {
  return new DisabledClient()
}
