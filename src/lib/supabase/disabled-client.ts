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
  private result: any = { data: null, error: null }

  private self(): this {
    return this
  }

  select(..._args: any[]) {
    return this
  }
  insert(..._args: any[]) {
    return this
  }
  upsert(..._args: any[]) {
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
  gt(..._args: any[]) {
    return this
  }
  lt(..._args: any[]) {
    return this
  }
  gte(..._args: any[]) {
    return this
  }
  lte(..._args: any[]) {
    return this
  }
  like(..._args: any[]) {
    return this
  }
  ilike(..._args: any[]) {
    return this
  }
  is(..._args: any[]) {
    return this
  }
  in(..._args: any[]) {
    return this
  }
  contains(..._args: any[]) {
    return this
  }
  containedBy(..._args: any[]) {
    return this
  }
  range(..._args: any[]) {
    return this
  }
  textSearch(..._args: any[]) {
    return this
  }
  filter(..._args: any[]) {
    return this
  }
  or(..._args: any[]) {
    return this
  }
  not(..._args: any[]) {
    return this
  }
  order(..._args: any[]) {
    return this
  }
  limit(..._args: any[]) {
    return this
  }
  offset(..._args: any[]) {
    return this
  }
  single() {
    return Promise.resolve(this.result)
  }
  maybeSingle() {
    return Promise.resolve(this.result)
  }
  then(resolve: (val: any) => void) {
    resolve(this.result)
  }
}

class DisabledAuth {
  async getUser() {
    return { data: { user: null }, error: null }
  }
  async getSession() {
    return { data: { session: null }, error: null }
  }
}

class DisabledRealtime {
  channel(..._args: any[]) {
    return {
      subscribe: () => ({ unsubscribe: () => {} }),
      remove: () => {},
      on: () => ({}),
      send: () => {},
    }
  }
  removeChannel() {}
  removeAllChannels() {}
}

class DisabledStorage {
  from(..._args: any[]) {
    return {
      upload: async () => ({ data: null, error: null }),
      download: async () => ({ data: null, error: null }),
      remove: async () => ({ data: null, error: null }),
      createSignedUrl: async () => ({ data: { signedUrl: '' }, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: '' } }),
      list: async () => ({ data: null, error: null }),
    }
  }
}

class DisabledClient {
  from(..._args: any[]) {
    return new DisabledQueryBuilder()
  }
  rpc(..._args: any[]) {
    return Promise.resolve({ data: null, error: null })
  }
  auth = new DisabledAuth()
  storage = new DisabledStorage()
  realtime = new DisabledRealtime()
  channel(..._args: any[]) {
    return {
      subscribe: () => ({ unsubscribe: () => {} }),
      remove: () => {},
      on: () => ({}),
      send: () => {},
    }
  }
  removeChannel() {}
  removeAllChannels() {}
}

export function createDisabledClient() {
  return new DisabledClient()
}
