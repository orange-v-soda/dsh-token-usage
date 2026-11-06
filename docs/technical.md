# 技术说明 / Technical Notes

面向维护者与 AI 的程序性描述：插件的数据来源、聚合算法、缓存策略与渲染结构。行为以代码为准。

## 1. 形态

一个 DSH bundle 包，Host 与 Client 两半：

| 文件 | 角色 |
| --- | --- |
| `index.js` | Host：注册 HTTP 路由，聚合会话日志 |
| `client.js` | Client：浏览器模块，注册两个 slot |
| `cordis.patch.yml` | bundle 补丁，插入 `token-usage-today` 一行 |
| `package.json` | `dsh.bundle.patch`、`dsh.client`（`platform: web`、`immediately: true`）、`dsh.engines.dsh` |

Client 模块格式为 `window.__ModuleLoader__.load({ id: 'dsh-token-usage', factory(require) })`，`id` 必须等于包名，React 经 `require('react')` 从宿主模块表取得。

## 2. 数据来源

- 会话枚举：`ctx.sessionQuery.listSessions()`，返回全部逻辑会话（活跃优先，其次是已落盘）。
- 会话读取：`ctx.sessionQuery.readSession(id)`，返回完整原始事件日志。
- 上下文服务（可选，缺失即降级）：`ctx.get('sessionQuery')`、`ctx.get('sessionPersistence')`、`ctx.get('sessions')`。

只有 `assistant/message` 事件带 provider 用量，字段位于 `event.data.usage`：

```
inputTokens      未命中缓存的输入 token
cacheReadTokens  命中缓存的输入 token
outputTokens     输出 token
totalTokens      缺省时按 inputTokens + cacheReadTokens + outputTokens 计算

event.data.message.source.provider / .model   模型归属
event.time                                     毫秒时间戳（本地时区解释）
```

## 3. 指标定义

```
promptTokens = inputTokens + cacheReadTokens
cacheRate    = cacheReadTokens / promptTokens        （promptTokens 为 0 时为 0）
```

面板顶部的「近 30 日」是最近 30 个自然日（含今天）的 `totalTokens` 之和；「今日」数字取今天本地零点之后的事件。

## 4. Host 聚合流程

```
GET /api/dsh-token-usage/today
  → 2s 结果缓存命中？直接返回
  → inflight 存在？复用同一个 Promise
  → aggregate():
      listed     = sessionQuery.listSessions()
      revisions  = sessionPersistence.list() → Map<id, revision>   （文件 stat 派生的版本号）
      live       = sessions.list() → Map<id, Session 实例>
      对每个会话:
        revision = 活跃会话 ? `live:${session.seq}` : revisions.get(id)
        fold 缓存命中（revision 相同）→ 直接复用
        否则 readSession(id) → collectUsage(events, windowStart) → 写回 fold 缓存
      按 listSessions 顺序合并所有 fold，全局指纹去重
      → 今日总计、按模型分组、6 周按天序列
```

**折叠缓存**：`Map<sessionId, { at, revision, tuples }>`，`tuples` 是 `[time, input, output, cacheRead, total, provider, model]` 紧凑数组，只保留热力图窗口（约 42 天）内的事件；窗口每天前移时顺带裁掉过期元组。会话从语料中消失即删除条目。

**失效条件**：

| 情况 | 行为 |
| --- | --- |
| 活跃会话 `seq` 变化 | 重读该会话（内存快照） |
| 已落盘会话 revision 变化 | 重读该会话（解压 + 解析 JSONL） |
| 两个服务都拿不到 revision | 该 fold 最多复用 60 秒（`UNVERIFIED_MAX_AGE_MS`） |
| 会话列表变化 | 新会话按新读处理，消失的会话删除缓存 |

**去重**：fork 出的会话会重放源事件，因此按 `${time}:${input}:${output}:${cacheRead}` 做全局指纹去重，同一真实调用只计一次。合并顺序沿用 `listSessions` 的返回顺序，保证语义稳定。

## 5. 输出契约

```jsonc
{
  "ok": true,
  "updatedAt": 1762345678901,      // 本次聚合完成时间
  "totalTokens": 0,                // 今日
  "inputTokens": 0,
  "outputTokens": 0,
  "cacheReadTokens": 0,
  "cacheRate": 0,                  // 0..1
  "models": [                       // 今日，按 totalTokens 降序
    { "provider": "", "model": "", "inputTokens": 0, "outputTokens": 0,
      "cacheReadTokens": 0, "totalTokens": 0, "messages": 0, "cacheRate": 0 }
  ],
  "days": [                         // 42 项，周一起算，最后一项是本周日
    { "date": "2026-11-06", "totalTokens": 0, "messages": 0 }
  ]
}
```

失败返回 `{ ok: false, error }`；非 GET 返回 405。响应头固定 `cache-control: no-store`。

## 6. Client 结构

- 注册 slot：`sidebar.footer.action`（`order: -10`）与 `shell.overlay`（`order: 50`）。
- 状态：模块内 `store`（`usage` / `open` / `wide`），组件用 `useSnapshot()` 订阅重渲染。
- 轮询：`setInterval` 5 秒一次；`document.visibilityState === 'hidden'` 或侧边栏折叠（`wide === false`）时跳过；`visibilitychange` 回到可见时立即补一次。只接受 `ok: true` 的响应，失败保留上一次数据。
- 面板：`position: fixed`，打开时按按钮 `getBoundingClientRect()` 定位到上方 8px；外部点击与 Esc 关闭。
- 热力图：7 列网格（周一至周日），5 档色阶按当天用量与窗口峰值的比值取 `0.25 / 0.5 / 0.75` 分界。
- 数字格式：`K / M / B` 保留一位小数，百分比保留一位小数。
- 文案：`ctx.get('locale')` 存在时注册 `token-usage` 命名空间（zh / en 两套字典），用 `bind()` 取翻译函数，`subscribe()` 在语言切换时触发重绘；服务缺失时退回按 `navigator.languages` 选字典。

## 7. 边界

- 时区按运行机器的本地时间切日，跨时区共享同一 DSH Home 时数字会按当前机器解释。
- 事件时间戳相同且 token 数完全一致的两次真实调用会被指纹去重吞掉一次；概率极低，换取的是 fork 重放的正确性。
- 单次聚合的代价是「一次会话列表 + 一次 revision 列表 + 变动会话的日志解析」，冷启动首次会解析全部窗口内会话。
- Host 只读，不写入任何会话事件，不发起外部网络请求。
