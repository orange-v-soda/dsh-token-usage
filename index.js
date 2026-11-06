/**
 * Today's token usage — Host half.
 *
 * Folds every session in the corpus and serves the day's totals, broken down
 * per model, as JSON — plus a 6-week, day-by-day heatmap series (rows are
 * weeks, columns Monday to Sunday). Only `assistant/message` events carry
 * provider usage, and `inputTokens` counts cache misses while
 * `cacheReadTokens` counts cache hits, so the prompt total is
 * `inputTokens + cacheReadTokens`.
 *
 * A session's usage tuples are folded once and cached. Later refreshes reuse
 * the fold unless the session changed: a live session is detected by its log
 * length (`seq`), a stored one by the persistence revision. Only changed
 * sessions are read again, so a refresh costs one listing plus a stat pass
 * instead of replaying the whole corpus.
 */

/** Exact route the Client half fetches. */
const ROUTE = '/api/dsh-token-usage/today'

/** How long one aggregation stays valid. */
const CACHE_MS = 2_000

/** How long a fold stays usable when no revision can be observed. */
const UNVERIFIED_MAX_AGE_MS = 60_000

/** Heatmap height, in rows of Monday..Sunday. */
const HEATMAP_WEEKS = 6

/** Local midnight of the day containing `now`. */
function startOfToday(now) {
  const day = new Date(now)
  day.setHours(0, 0, 0, 0)
  return day.getTime()
}

function pad2(value) {
  return value < 10 ? `0${value}` : String(value)
}

/** `2026-11-06`, in local time. */
function dayKey(ts) {
  const day = new Date(ts)
  return `${day.getFullYear()}-${pad2(day.getMonth() + 1)}-${pad2(day.getDate())}`
}

/**
 * The heatmap window: `HEATMAP_WEEKS` whole weeks, ending with the week that
 * contains `now`, so the first cell is a Monday and the last is a Sunday.
 */
function heatmapWindow(now) {
  const monday = new Date(now)
  monday.setHours(0, 0, 0, 0)
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  const first = new Date(monday)
  first.setDate(first.getDate() - (HEATMAP_WEEKS - 1) * 7)

  const days = []
  for (let index = 0; index < HEATMAP_WEEKS * 7; index += 1) {
    const day = new Date(first)
    day.setDate(day.getDate() + index)
    days.push({ key: dayKey(day.getTime()), start: day.getTime() })
  }
  return { start: days[0].start, days }
}

function writeJson(res, status, body) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(JSON.stringify(body))
}

function emptyBucket() {
  return { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, totalTokens: 0, messages: 0 }
}

function cacheRateOf(bucket) {
  const prompt = bucket.inputTokens + bucket.cacheReadTokens
  return prompt > 0 ? bucket.cacheReadTokens / prompt : 0
}

/**
 * The usage tuples of one log: `[time, input, output, cacheRead, total,
 * provider, model]`. Kept compact so a fold can live in memory for weeks.
 * @param events - a session's complete raw event log.
 * @param since - drop events older than this timestamp.
 */
function collectUsage(events, since) {
  const tuples = []
  for (const event of events) {
    if (event.type !== 'assistant/message') continue
    if (event.time < since) continue
    const usage = event.data?.usage
    if (!usage || typeof usage.inputTokens !== 'number') continue
    const input = usage.inputTokens
    const output = typeof usage.outputTokens === 'number' ? usage.outputTokens : 0
    const cacheRead = typeof usage.cacheReadTokens === 'number' ? usage.cacheReadTokens : 0
    const total =
      typeof usage.totalTokens === 'number' ? usage.totalTokens : input + cacheRead + output
    const source = event.data?.message?.source ?? {}
    const provider = typeof source.provider === 'string' ? source.provider : 'unknown'
    const model = typeof source.model === 'string' ? source.model : 'unknown'
    tuples.push([event.time, input, output, cacheRead, total, provider, model])
  }
  return tuples
}

/** Stored-session revisions, or `undefined` when persistence cannot answer. */
async function revisionMap(persistence) {
  if (persistence === undefined || typeof persistence.list !== 'function') return undefined
  try {
    const snapshots = await persistence.list()
    const revisions = new Map()
    for (const snapshot of snapshots) {
      const id = snapshot?.header?.id
      if (typeof id === 'string') revisions.set(id, snapshot.revision)
    }
    return revisions
  } catch {
    return undefined
  }
}

/** Live sessions by id, or an empty map when the service is unavailable. */
function liveMap(sessions) {
  if (sessions === undefined || typeof sessions.list !== 'function') return new Map()
  try {
    const live = new Map()
    for (const session of sessions.list()) {
      const id = session?.header?.id
      if (typeof id === 'string') live.set(id, session)
    }
    return live
  } catch {
    return new Map()
  }
}

/**
 * Sum the day's usage across the whole corpus, per model, and the heatmap
 * window's usage per day, re-reading only the sessions that changed.
 * @param query - the live `ctx.sessionQuery` service.
 * @param folds - per-session fold cache, owned by the plugin instance.
 * @param services - optional `sessionPersistence` and `sessions` services.
 */
async function aggregate(query, folds, services) {
  const now = Date.now()
  const today = startOfToday(now)
  const window = heatmapWindow(now)
  const listed = await query.listSessions()
  const revisions = await revisionMap(services.persistence)
  const live = liveMap(services.sessions)
  const present = new Set()
  const entries = []

  for (const record of listed) {
    const id = record?.header?.id
    if (typeof id !== 'string') continue
    present.add(id)

    const session = live.get(id)
    const revision =
      session !== undefined && session.seq !== undefined ? `live:${session.seq}` : revisions?.get(id)
    let fold = folds.get(id)

    if (fold === undefined || revision === undefined || fold.revision !== revision) {
      if (fold !== undefined && revision === undefined && now - fold.at < UNVERIFIED_MAX_AGE_MS) {
        entries.push(fold)
        continue
      }
      let snapshot
      try {
        snapshot = await query.readSession(id)
      } catch {
        continue
      }
      fold = { at: now, revision, tuples: collectUsage(snapshot.events, window.start) }
      folds.set(id, fold)
    }
    entries.push(fold)
  }

  for (const id of folds.keys()) if (!present.has(id)) folds.delete(id)

  const seen = new Set()
  const totals = emptyBucket()
  const byModel = new Map()
  const byDay = new Map(window.days.map((day) => [day.key, { totalTokens: 0, messages: 0 }]))

  for (const fold of entries) {
    let first = 0
    while (first < fold.tuples.length && fold.tuples[first][0] < window.start) first += 1
    if (first > 0) fold.tuples = fold.tuples.slice(first)

    for (const tuple of fold.tuples) {
      const [time, input, output, cacheRead, total, provider, model] = tuple
      // A forked session replays its source events; count each real call once.
      const fingerprint = `${time}:${input}:${output}:${cacheRead}`
      if (seen.has(fingerprint)) continue
      seen.add(fingerprint)

      const day = byDay.get(dayKey(time))
      if (day !== undefined) {
        day.totalTokens += total
        day.messages += 1
      }
      if (time < today) continue

      const key = `${provider}\u0000${model}`
      let bucket = byModel.get(key)
      if (bucket === undefined) {
        bucket = { provider, model, ...emptyBucket() }
        byModel.set(key, bucket)
      }

      for (const target of [totals, bucket]) {
        target.inputTokens += input
        target.outputTokens += output
        target.cacheReadTokens += cacheRead
        target.totalTokens += total
        target.messages += 1
      }
    }
  }

  const models = [...byModel.values()]
    .sort((a, b) => b.totalTokens - a.totalTokens)
    .map((bucket) => ({ ...bucket, cacheRate: cacheRateOf(bucket) }))

  return {
    ok: true,
    updatedAt: now,
    totalTokens: totals.totalTokens,
    inputTokens: totals.inputTokens,
    outputTokens: totals.outputTokens,
    cacheReadTokens: totals.cacheReadTokens,
    cacheRate: cacheRateOf(totals),
    models,
    days: window.days.map((day) => {
      const bucket = byDay.get(day.key)
      return { date: day.key, totalTokens: bucket.totalTokens, messages: bucket.messages }
    }),
  }
}

export const inject = ['webServer']

export function apply(ctx) {
  const folds = new Map()
  let cached
  let inflight

  const read = async () => {
    if (cached !== undefined && Date.now() - cached.at < CACHE_MS) return cached.value
    if (inflight === undefined) {
      const query = ctx.get('sessionQuery')
      const services = {
        persistence: ctx.get('sessionPersistence'),
        sessions: ctx.get('sessions'),
      }
      inflight = (query === undefined
        ? Promise.resolve({ ok: false, error: 'sessionQuery is not available' })
        : aggregate(query, folds, services).catch((error) => ({
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          }))
      ).then((value) => {
        cached = { at: Date.now(), value }
        inflight = undefined
        return value
      })
    }
    return inflight
  }

  ctx.effect(
    () =>
      ctx.webServer.register({
        kind: 'exact',
        path: ROUTE,
        handler: async (req, res) => {
          if (req.method !== 'GET') {
            writeJson(res, 405, { ok: false, error: 'method not allowed' })
            return
          }
          try {
            writeJson(res, 200, await read())
          } catch (error) {
            writeJson(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) })
          }
        },
      }),
    'token-usage-today: usage route',
  )
}
