window.__ModuleLoader__.load({
  id: '@orange-v-soda/dsh-token-usage',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const ENDPOINT = '/api/dsh-token-usage/today'
    const REFRESH_MS = 5_000
    const NAMESPACE = 'token-usage'

    const MODEL_TONES = ['#5C83AA', '#C0705F', '#6E9A76', '#B2914C', '#8677A8', '#5E9A9A']

    /** GitHub's contribution ramp in blue: neutral empty, then four blues. */
    const HEAT_TONES = [
      'rgba(120, 130, 140, 0.14)',
      '#BFD9F2',
      '#7DAEE0',
      '#4C86C6',
      '#2B5F9E',
    ]

    /** English month abbreviations, used by the `dayLabel` template. */
    const MONTHS = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ]

    /** Monday-first order, matching the heatmap's column order. */
    const WEEKDAY_INDEXES = [0, 1, 2, 3, 4, 5, 6]

    const MESSAGES = {
      zh: {
        today: '今日',
        input: '输入',
        output: '输出',
        cache: '缓存',
        modelShare: '模型占比',
        last6Weeks: '近 6 周用量',
        title30: '近 30 日 token 用量',
        titleToday: '今日 token 用量',
        empty: '近 30 日还没有用量',
        less: '少',
        more: '多',
        noUsage: '无用量',
        cellDetail: '{tokens} · {calls} 次调用',
        dayLabel: '{month}月{day}日 {weekday}',
        buttonTitle: '今日用量 {tokens} · 缓存比例 {rate}',
        panelLabel: 'token 用量明细',
        modelTip: '{provider} · 调用 {calls} 次 · 缓存率 {rate}',
        'weekday.0': '一',
        'weekday.1': '二',
        'weekday.2': '三',
        'weekday.3': '四',
        'weekday.4': '五',
        'weekday.5': '六',
        'weekday.6': '日',
        'weekdayFull.0': '周一',
        'weekdayFull.1': '周二',
        'weekdayFull.2': '周三',
        'weekdayFull.3': '周四',
        'weekdayFull.4': '周五',
        'weekdayFull.5': '周六',
        'weekdayFull.6': '周日',
      },
      en: {
        today: 'Today',
        input: 'Input',
        output: 'Output',
        cache: 'Cache',
        modelShare: 'By model',
        last6Weeks: 'Last 6 weeks',
        title30: 'Token usage · last 30 days',
        titleToday: 'Token usage · today',
        empty: 'No usage in the last 30 days',
        less: 'Less',
        more: 'More',
        noUsage: 'no usage',
        cellDetail: '{tokens} · {calls} calls',
        dayLabel: '{monthName} {day}, {weekday}',
        buttonTitle: 'Today {tokens} · cache {rate}',
        panelLabel: 'Token usage details',
        modelTip: '{provider} · {calls} calls · cache {rate}',
        'weekday.0': 'Mon',
        'weekday.1': 'Tue',
        'weekday.2': 'Wed',
        'weekday.3': 'Thu',
        'weekday.4': 'Fri',
        'weekday.5': 'Sat',
        'weekday.6': 'Sun',
        'weekdayFull.0': 'Mon',
        'weekdayFull.1': 'Tue',
        'weekdayFull.2': 'Wed',
        'weekdayFull.3': 'Thu',
        'weekdayFull.4': 'Fri',
        'weekdayFull.5': 'Sat',
        'weekdayFull.6': 'Sun',
      },
    }

    const CSS = `
      .dsh-token-usage__button {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        box-sizing: border-box;
        width: 100%;
        min-width: 0;
        margin: 0;
        padding: 7px 12px;
        border: 0;
        border-radius: 8px;
        background: transparent;
        color: var(--dsw-alias-label-secondary);
        font: inherit;
        font-size: 13px;
        line-height: 18px;
        white-space: nowrap;
        font-variant-numeric: tabular-nums;
        cursor: pointer;
      }
      .dsh-token-usage__button:hover {
        background: var(--dsw-alias-bg-layer-2);
      }
      .dsh-token-usage__button:focus-visible {
        outline: 2px solid var(--dsw-alias-brand-primary);
        outline-offset: -2px;
      }
      .dsh-token-usage__group {
        display: flex;
        align-items: center;
        gap: 4px;
        min-width: 0;
      }
      .dsh-token-usage__icon {
        flex: none;
        width: 14px;
        height: 14px;
        opacity: 0.65;
      }
      .dsh-token-usage__value {
        color: var(--dsw-alias-label-primary);
        font-weight: 500;
      }
      .dsh-token-usage__panel {
        position: fixed;
        z-index: 60;
        box-sizing: border-box;
        pointer-events: auto;
        padding: 10px 12px 12px;
        border: 1px solid var(--dsw-alias-border-l1);
        border-radius: 12px;
        background: var(--dsw-alias-bg-overlay);
        background: color-mix(in srgb, var(--dsw-alias-bg-overlay) 86%, transparent);
        -webkit-backdrop-filter: blur(16px) saturate(120%);
        backdrop-filter: blur(16px) saturate(120%);
        box-shadow: 0 12px 32px color-mix(in srgb, var(--dsw-alias-label-primary) 14%, transparent);
        color: var(--dsw-alias-label-secondary);
        font-size: 13px;
        line-height: 20px;
        font-variant-numeric: tabular-nums;
      }
      .dsh-token-usage__head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 10px;
      }
      .dsh-token-usage__head-title {
        font-size: 12px;
        letter-spacing: 0.2px;
      }
      .dsh-token-usage__head-value {
        color: var(--dsw-alias-label-primary);
        font-size: 17px;
        font-weight: 600;
        line-height: 22px;
        letter-spacing: 0.2px;
      }
      .dsh-token-usage__section {
        margin-top: 12px;
      }
      .dsh-token-usage__section-title {
        margin-bottom: 6px;
        color: var(--dsw-alias-label-secondary);
        font-size: 11px;
        line-height: 15px;
        letter-spacing: 0.2px;
      }
      .dsh-token-usage__stats {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
      }
      .dsh-token-usage__stat {
        display: flex;
        align-items: center;
        flex-direction: column;
        gap: 1px;
        min-width: 0;
        text-align: center;
      }
      .dsh-token-usage__stat-label {
        color: var(--dsw-alias-label-secondary);
        font-size: 11px;
        line-height: 15px;
        letter-spacing: 0.2px;
      }
      .dsh-token-usage__stat-value {
        overflow: hidden;
        color: var(--dsw-alias-label-primary);
        font-size: 13px;
        font-weight: 500;
        line-height: 18px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .dsh-token-usage__models-section {
        margin-top: 14px;
        padding-top: 12px;
        border-top: 1px solid var(--dsw-alias-border-l1);
      }
      .dsh-token-usage__disclosure {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        width: 100%;
        padding: 0;
        border: 0;
        background: transparent;
        color: var(--dsw-alias-label-secondary);
        font: inherit;
        font-size: 11px;
        line-height: 15px;
        letter-spacing: 0.2px;
        cursor: pointer;
      }
      .dsh-token-usage__disclosure:hover {
        color: var(--dsw-alias-label-primary);
      }
      .dsh-token-usage__disclosure:focus-visible {
        outline: 2px solid var(--dsw-alias-brand-primary);
        outline-offset: 2px;
        border-radius: 4px;
      }
      .dsh-token-usage__chevron {
        flex: none;
        font-size: 10px;
        line-height: 1;
        transform: rotate(-90deg);
        transition: transform 150ms ease;
      }
      .dsh-token-usage__chevron--open {
        transform: rotate(0deg);
      }
      .dsh-token-usage__models {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 8px;
      }
      .dsh-token-usage__model-line {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 8px;
        font-size: 11px;
        line-height: 15px;
      }
      .dsh-token-usage__model-name {
        min-width: 0;
        overflow: hidden;
        color: var(--dsw-alias-label-secondary);
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .dsh-token-usage__model-value {
        flex: none;
        color: var(--dsw-alias-label-primary);
        font-weight: 500;
      }
      .dsh-token-usage__model-track {
        height: 3px;
        margin-top: 5px;
        overflow: hidden;
        border-radius: 999px;
        background: rgba(120, 130, 140, 0.14);
      }
      .dsh-token-usage__model-fill {
        height: 100%;
        border-radius: 999px;
      }
      .dsh-token-usage__empty {
        padding-top: 10px;
        font-size: 12px;
      }
      .dsh-token-usage__heatmap {
        display: grid;
        grid-template-columns: repeat(7, 26px);
        gap: 4px;
        justify-content: center;
        width: 100%;
      }
      .dsh-token-usage__heatmap-day {
        color: var(--dsw-alias-label-secondary);
        font-size: 10px;
        line-height: 14px;
        text-align: center;
      }
      .dsh-token-usage__heatmap-cell {
        position: relative;
        height: 26px;
        border-radius: 3px;
      }
      .dsh-token-usage__heatmap-cell:hover {
        z-index: 3;
      }
      .dsh-token-usage__heatmap-cell::after {
        content: attr(data-tip);
        position: absolute;
        left: 50%;
        bottom: calc(100% + 8px);
        z-index: 3;
        padding: 5px 8px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 6px;
        background: #1f2328;
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.22);
        color: #ffffff;
        font-size: 11px;
        line-height: 15px;
        text-align: center;
        white-space: pre;
        opacity: 0;
        pointer-events: none;
        transform: translate(-50%, 2px);
        transition: opacity 100ms ease, transform 120ms ease;
      }
      .dsh-token-usage__heatmap-cell::before {
        content: '';
        position: absolute;
        left: 50%;
        bottom: calc(100% + 4px);
        z-index: 3;
        border-style: solid;
        border-width: 4px 4px 0;
        border-color: #1f2328 transparent transparent;
        opacity: 0;
        pointer-events: none;
        transform: translateX(-50%);
        transition: opacity 100ms ease;
      }
      .dsh-token-usage__heatmap-cell:hover::after {
        opacity: 1;
        transform: translate(-50%, 0);
      }
      .dsh-token-usage__heatmap-cell:hover::before {
        opacity: 1;
      }
      .dsh-token-usage__section-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        margin-bottom: 6px;
      }
      .dsh-token-usage__section-head .dsh-token-usage__section-title {
        margin-bottom: 0;
      }
      .dsh-token-usage__heat-legend {
        display: flex;
        align-items: center;
        gap: 3px;
        color: var(--dsw-alias-label-secondary);
        font-size: 10px;
        line-height: 12px;
      }
      .dsh-token-usage__heat-swatch {
        width: 8px;
        height: 8px;
        border-radius: 2px;
      }
    `

    /** Browser language, used until the Client locale service answers. */
    function detectLanguage() {
      if (typeof navigator === 'undefined') return 'en'
      const tags =
        Array.isArray(navigator.languages) && navigator.languages.length > 0
          ? navigator.languages
          : [navigator.language]
      for (const value of tags) {
        const tag = String(value ?? '').toLowerCase()
        if (tag.startsWith('zh')) return 'zh'
        if (tag.startsWith('en')) return 'en'
      }
      return 'en'
    }

    let language = detectLanguage()

    function interpolate(template, params) {
      if (params === undefined) return template
      return template.replace(/\{(\w+)\}/g, (match, name) =>
        name in params ? String(params[name]) : match,
      )
    }

    /** Fallback translator; replaced by the Client locale service when present. */
    let t = (key, params) => {
      const dict = MESSAGES[language] ?? MESSAGES.en
      return interpolate(dict[key] ?? MESSAGES.en[key] ?? key, params)
    }

    /** 18100312 -> 18.1M */
    function formatTokens(value) {
      const n = typeof value === 'number' && Number.isFinite(value) ? value : 0
      const [unit, suffix] = n >= 1e9 ? [1e9, 'B'] : n >= 1e6 ? [1e6, 'M'] : n >= 1e3 ? [1e3, 'K'] : [1, '']
      if (unit === 1) return String(Math.round(n))
      return `${(n / unit).toFixed(1)}${suffix}`
    }

    /** 0.9744 -> 97.4% */
    function formatRate(rate) {
      const n = typeof rate === 'number' && Number.isFinite(rate) ? rate : 0
      return `${(n * 100).toFixed(1)}%`
    }

    /** `2026-11-06` -> `11月6日 周五` / `Nov 6, Fri` */
    function dayLabel(date, index) {
      const month = Number(date.slice(5, 7))
      const day = Number(date.slice(8, 10))
      return t('dayLabel', {
        month,
        monthName: MONTHS[month - 1] ?? String(month),
        day,
        weekday: t(`weekdayFull.${index % 7}`),
      })
    }

    /** Today as `2026-11-06`, local time. */
    function todayKey() {
      const now = new Date()
      const month = now.getMonth() + 1
      const day = now.getDate()
      return `${now.getFullYear()}-${month < 10 ? `0${month}` : month}-${day < 10 ? `0${day}` : day}`
    }

    function heatLevel(value, max) {
      if (!(value > 0)) return 0
      const ratio = max > 0 ? value / max : 1
      if (ratio <= 0.25) return 1
      if (ratio <= 0.5) return 2
      if (ratio <= 0.75) return 3
      return 4
    }

    function createStore() {
      const state = { usage: null, open: false, wide: true }
      const listeners = new Set()
      const emit = () => {
        for (const listener of [...listeners]) listener()
      }
      return {
        state,
        notify: emit,
        setOpen(next) {
          if (state.open !== next) {
            state.open = next
            emit()
          }
        },
        setUsage(next) {
          state.usage = next
          emit()
        },
        setWide(next) {
          if (state.wide !== next) {
            state.wide = next
            emit()
          }
        },
        subscribe(listener) {
          listeners.add(listener)
          return () => {
            listeners.delete(listener)
          }
        },
      }
    }

    const store = createStore()

    function useSnapshot() {
      const [, bump] = React.useState(0)
      React.useEffect(() => store.subscribe(() => bump((n) => n + 1)), [])
      return store.state
    }

    function usageIcon() {
      return h(
        'svg',
        { className: 'dsh-token-usage__icon', viewBox: '0 0 14 14', 'aria-hidden': 'true' },
        h('rect', { key: 'a', x: 1.5, y: 8, width: 2.6, height: 4.5, rx: 1.3, fill: 'currentColor' }),
        h('rect', { key: 'b', x: 5.7, y: 5, width: 2.6, height: 7.5, rx: 1.3, fill: 'currentColor' }),
        h('rect', { key: 'c', x: 9.9, y: 2, width: 2.6, height: 10.5, rx: 1.3, fill: 'currentColor' }),
      )
    }

    function cacheIcon() {
      return h(
        'svg',
        { className: 'dsh-token-usage__icon', viewBox: '0 0 14 14', 'aria-hidden': 'true' },
        h('path', { key: 'top', d: 'M7 1.8 12.2 4.6 7 7.4 1.8 4.6Z', fill: 'currentColor', opacity: 0.9 }),
        h('path', {
          key: 'bottom',
          d: 'M2.4 7.4 7 9.9l4.6-2.5',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.3,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          opacity: 0.55,
        }),
      )
    }

    function modelTone(index) {
      return MODEL_TONES[index % MODEL_TONES.length]
    }

    /** Six rows of weeks, each row running Monday to Sunday. */
    function heatmap(days) {
      const max = days.reduce((peak, day) => Math.max(peak, day.totalTokens || 0), 0)
      return h(
        'div',
        { className: 'dsh-token-usage__heatmap' },
        WEEKDAY_INDEXES.map((index) =>
          h(
            'div',
            { key: `head-${index}`, className: 'dsh-token-usage__heatmap-day' },
            t(`weekday.${index}`),
          ),
        ),
        days.map((day, index) => {
          const tokens = day.totalTokens || 0
          const calls = day.messages || 0
          const detail =
            tokens > 0 ? t('cellDetail', { tokens: formatTokens(tokens), calls }) : t('noUsage')
          return h('div', {
            key: day.date,
            className: 'dsh-token-usage__heatmap-cell',
            style: { background: HEAT_TONES[heatLevel(tokens, max)] },
            'data-tip': `${dayLabel(day.date, index)}\n${detail}`,
            'aria-hidden': 'true',
          })
        }),
      )
    }

    function UsageButton(props) {
      const snapshot = useSnapshot()
      const wide = props.wide !== false
      const usage = snapshot.usage

      React.useEffect(() => {
        store.setWide(wide)
        if (!wide && store.state.open) store.setOpen(false)
      }, [wide])

      if (!wide || usage === null) return null

      return h(
        'button',
        {
          type: 'button',
          className: 'dsh-token-usage__button',
          'data-dsh-token-usage': '',
          'aria-haspopup': 'dialog',
          'aria-expanded': snapshot.open ? 'true' : 'false',
          title: t('buttonTitle', {
            tokens: formatTokens(usage.totalTokens),
            rate: formatRate(usage.cacheRate),
          }),
          onClick: () => store.setOpen(!store.state.open),
        },
        h('style', { key: 'style' }, CSS),
        h(
          'span',
          { key: 'usage', className: 'dsh-token-usage__group' },
          usageIcon(),
          h('span', null, t('today')),
          h('span', { className: 'dsh-token-usage__value' }, formatTokens(usage.totalTokens)),
        ),
        h(
          'span',
          { key: 'cache', className: 'dsh-token-usage__group' },
          cacheIcon(),
          h('span', null, t('cache')),
          h('span', { className: 'dsh-token-usage__value' }, formatRate(usage.cacheRate)),
        ),
      )
    }

    function UsagePopover() {
      const snapshot = useSnapshot()
      const open = snapshot.open
      const usage = snapshot.usage
      const panelRef = React.useRef(null)
      const [position, setPosition] = React.useState(null)
      const [modelsOpen, setModelsOpen] = React.useState(false)

      React.useLayoutEffect(() => {
        if (!open) return undefined
        const anchor = document.querySelector('[data-dsh-token-usage]')
        const rect = anchor instanceof HTMLElement ? anchor.getBoundingClientRect() : null
        setPosition(
          rect === null
            ? { left: 12, bottom: 96 }
            : { left: Math.max(12, Math.round(rect.left)), bottom: Math.round(window.innerHeight - rect.top + 8) },
        )
        const onKeyDown = (event) => {
          if (event.key === 'Escape') store.setOpen(false)
        }
        const onPointerDown = (event) => {
          const target = event.target
          if (panelRef.current !== null && target instanceof Node && panelRef.current.contains(target)) return
          if (target instanceof Element && target.closest('[data-dsh-token-usage]') !== null) return
          store.setOpen(false)
        }
        window.addEventListener('keydown', onKeyDown)
        document.addEventListener('mousedown', onPointerDown, true)
        return () => {
          window.removeEventListener('keydown', onKeyDown)
          document.removeEventListener('mousedown', onPointerDown, true)
        }
      }, [open])

      if (!open || usage === null) return null

      const models = Array.isArray(usage.models) ? usage.models : []
      const days = Array.isArray(usage.days) && usage.days.length % 7 === 0 ? usage.days : []
      const spot = position === null ? { left: 12, bottom: 96 } : position

      const stats = [
        { key: 'input', label: t('input'), value: usage.inputTokens || 0 },
        { key: 'output', label: t('output'), value: usage.outputTokens || 0 },
        { key: 'cache', label: t('cache'), value: usage.cacheReadTokens || 0 },
      ]
      const modelTotal = models.reduce((sum, model) => sum + (model.totalTokens || 0), 0)

      const modelsSection = models.length === 0
        ? null
        : h(
            'div',
            { key: 'models', className: 'dsh-token-usage__section dsh-token-usage__models-section' },
            h(
              'button',
              {
                type: 'button',
                className: 'dsh-token-usage__disclosure',
                'aria-expanded': modelsOpen ? 'true' : 'false',
                onClick: () => setModelsOpen((value) => !value),
              },
              h('span', null, t('modelShare')),
              h(
                'span',
                {
                  className: `dsh-token-usage__chevron${modelsOpen ? ' dsh-token-usage__chevron--open' : ''}`,
                },
                '▾',
              ),
            ),
            modelsOpen
              ? h(
                  'div',
                  { className: 'dsh-token-usage__models' },
                  models.map((model, index) => {
                    const value = model.totalTokens || 0
                    const share = modelTotal > 0 ? (value / modelTotal) * 100 : 0
                    return h(
                      'div',
                      {
                        key: `${model.provider}/${model.model}/${index}`,
                        title: t('modelTip', {
                          provider: model.provider,
                          calls: model.messages,
                          rate: formatRate(model.cacheRate),
                        }),
                      },
                      h(
                        'div',
                        { className: 'dsh-token-usage__model-line' },
                        h('span', { className: 'dsh-token-usage__model-name' }, model.model),
                        h('span', { className: 'dsh-token-usage__model-value' }, formatTokens(value)),
                      ),
                      h(
                        'div',
                        { className: 'dsh-token-usage__model-track' },
                        h('div', {
                          className: 'dsh-token-usage__model-fill',
                          style: { width: `${share}%`, background: modelTone(index) },
                        }),
                      ),
                    )
                  }),
                )
              : null,
          )

      const recent = days.filter((day) => day.date <= todayKey()).slice(-30)
      const headline = days.length === 0
        ? usage.totalTokens
        : recent.reduce((sum, day) => sum + (day.totalTokens || 0), 0)

      return h(
        'div',
        {
          ref: panelRef,
          role: 'dialog',
          'aria-label': t('panelLabel'),
          className: 'dsh-token-usage__panel',
          style: { left: `${spot.left}px`, bottom: `${spot.bottom}px`, width: '300px' },
        },
        h(
          'div',
          { key: 'head', className: 'dsh-token-usage__head' },
          h(
            'span',
            { className: 'dsh-token-usage__head-title' },
            days.length === 0 ? t('titleToday') : t('title30'),
          ),
          h('span', { className: 'dsh-token-usage__head-value' }, formatTokens(headline)),
        ),
        days.length === 0 && models.length === 0
          ? h('div', { key: 'empty', className: 'dsh-token-usage__empty' }, t('empty'))
          : h(
              'div',
              { key: 'sections' },
              days.length === 0
                ? null
                : h(
                    'div',
                    { key: 'heat', className: 'dsh-token-usage__section' },
                    h(
                      'div',
                      { className: 'dsh-token-usage__section-head' },
                      h('span', { className: 'dsh-token-usage__section-title' }, t('last6Weeks')),
                      h(
                        'span',
                        { className: 'dsh-token-usage__heat-legend' },
                        h('span', null, t('less')),
                        HEAT_TONES.map((tone, index) =>
                          h('span', {
                            key: `heat-swatch-${index}`,
                            className: 'dsh-token-usage__heat-swatch',
                            style: { background: tone },
                          }),
                        ),
                        h('span', null, t('more')),
                      ),
                    ),
                    heatmap(days),
                  ),
              h(
                'div',
                { key: 'mix', className: 'dsh-token-usage__section' },
                h(
                  'div',
                  { className: 'dsh-token-usage__stats' },
                  stats.map((stat) =>
                    h(
                      'div',
                      { key: stat.key, className: 'dsh-token-usage__stat' },
                      h('span', { className: 'dsh-token-usage__stat-label' }, stat.label),
                      h('span', { className: 'dsh-token-usage__stat-value' }, formatTokens(stat.value)),
                    ),
                  ),
                ),
              ),
              modelsSection,
            ),
      )
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        const locale = ctx.get('locale')
        if (locale !== undefined && typeof locale.register === 'function' && typeof locale.bind === 'function') {
          ctx.effect(() => locale.register(NAMESPACE, MESSAGES), 'token-usage: locale')
          t = locale.bind(NAMESPACE)
          const syncLanguage = () => {
            const snapshot = typeof locale.getSnapshot === 'function' ? locale.getSnapshot() : undefined
            const active = snapshot?.active
            if (typeof active === 'string' && active !== '') {
              language = active.toLowerCase().startsWith('zh') ? 'zh' : 'en'
            }
          }
          syncLanguage()
          ctx.effect(
            () =>
              locale.subscribe(() => {
                syncLanguage()
                store.notify()
              }),
            'token-usage: locale sync',
          )
        }

        ctx.effect(() => {
          let stopped = false
          const refresh = () => {
            if (stopped) return
            if (store.state.wide === false) return
            if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
            fetch(ENDPOINT, { headers: { accept: 'application/json' } })
              .then((response) => (response.ok ? response.json() : null))
              .then((body) => {
                if (stopped || body === null) return
                if (body.ok === true) store.setUsage(body)
              })
              .catch(() => {})
          }
          const onVisibility = () => {
            if (document.visibilityState === 'visible') refresh()
          }
          refresh()
          const timer = setInterval(refresh, REFRESH_MS)
          document.addEventListener('visibilitychange', onVisibility)
          return () => {
            stopped = true
            clearInterval(timer)
            document.removeEventListener('visibilitychange', onVisibility)
          }
        }, 'token-usage-today: usage poll')

        ctx.slots.inject('sidebar.footer.action', () =>
          ctx.slots.register(
            { name: 'sidebar.footer.action', id: 'token-usage-today', order: -10 },
            UsageButton,
          ),
        )

        ctx.slots.inject('shell.overlay', () =>
          ctx.slots.register(
            { name: 'shell.overlay', id: 'token-usage-today-popover', order: 50 },
            UsagePopover,
          ),
        )
      },
    }
  },
})
