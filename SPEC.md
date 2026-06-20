# SPEC.md — novajs

> 极简反应式内核。IoT 设备前端用。

## 1. 定位

**novajs** 是给烧了 MicroPython 的 **ESP32** 当 HTTP server 时用的前端反应式内核。

约束：

- **小** — 单文件 9KB min
- **快** — Proxy 追踪 + microtask 批量 DOM 更新
- **精简** — 6 个指令，没 JSX / Virtual DOM / 组件生命周期
- **IoT 场景** — 内置 `nova.http`、`debounce`、`$watch`，适配轮询 / 滑块 / 设备开关

**不是** SPA 框架。

## 2. 设计原则

1. **HTML-first** — 模板写在 HTML 里，JS 只管数据
2. **Always-live** — `{{ count }}` 永远是双向绑定的，没有"一次渲染"
3. **Plain JS state** — 状态就是普通对象，Proxy 包装，无心智负担
4. **No v- 前缀** — 指令裸名（`model` / `if` / `loop`），避免和 HTML 属性冲突
5. **`data` 和 `funcs` 分开** — HTTP 写入物理上不可能误碰方法
6. **单文件零依赖** — 一个 `<script>` 就能用

## 3. 6 个指令（裸名）

| 指令 | 作用 | 示例 |
|---|---|---|
| `{{ }}` | 文本插值 | `<span>{{ count }}</span>` |
| `model` | 双向绑定 | `<input model="name">` |
| `if` | 条件渲染（节点级） | `<div if="count > 10">...</div>` |
| `show` | 显隐（保留节点） | `<div show="ok">...</div>` |
| `loop` | 列表渲染 | `<li loop="d in devices">...</li>` |
| `:attr` | 属性绑定 | `<img :src="url">` |
| `@event` | 事件 | `<button @click="inc()">` |

**没有 `v-if` / `v-for` / `v-model`**。故意。

## 4. 入口 API

```js
nova({
  data:  { count: 0, devices: [] },        // 响应式数据
  funcs: {                                  // 方法，this → proxy
    increment () { this.count++ },
    async load () {
      this.devices = await nova.http.get('/api/devices')
    }
  }
})
```

### data

- 字段在初始化时声明，自动 Proxy 包装
- 嵌套对象 / 数组自动深响应
- `funcs` 不可枚举（`Object.keys(data)` 看不到）
- **不可赋值 / 删除 funcs**（Proxy trap 阻止）

### funcs

- 写在 `data.funxxx` 上不报错（运行时找不到），但不是响应式的
- `this` 指向整个 data proxy（可读写 data、调用其他 funcs）
- `$watch` 回调里 `this` **不指向** data（用闭包变量访问）

## 5. 全局 API

```js
nova.http.get(url, options?)              // GET
nova.http.post(url, body, options?)       // POST
nova.http.put(url, body, options?)        // PUT
nova.http.patch(url, body, options?)     // PATCH
nova.http.del(url, options?)             // DELETE

nova.debounce(fn, ms)                    // 防抖包装
nova.nextTick(fn)                        // 下个 microtask
nova.bind(path, selector, options?)       // 程序化绑定
nova._data                                // 当前 data proxy（暴露给自定义元素）
nova.dom(selector)                        // document.querySelector 简写
nova.interval(fn, ms) → {start, stop}     // 可控定时器
nova.timeout(fn, ms) → {start, cancel}    // 可控一次性定时器
nova.poll(url, ms, ns?)                   // 轮询 GET 写入 data[ns]；返回 { stop, start, ns }
nova.resource(url, ns)                    // CRUD 资源代理；返回 { list, get, post, put, del, _fetch, ... }
nova.update(ns)                           // 手动触发资源刷新
nova.fmt.time(ts, pattern?)               // 'HH:mm:ss' / 'YYYY-MM-DD HH:mm' ...
nova.fmt.date(ts)                         // 'YYYY-MM-DD'
nova.fmt.datetime(ts)                     // 'YYYY-MM-DD HH:mm:ss'
nova.fmt.number(n, decimals?)             // 定点数 '24.6'
nova.fmt.percent(n, decimals?)            // 百分比 '50%'
nova.fmt.bytes(n)                         // '1.2 MB' / '345 B' / 自动进位
```

`nova.http` 基于 fetch：

- 自动 JSON 解析
- 超时：默认 10s，可配
- 非 2xx 抛 `Error("HTTP 4xx ...")`

## 6. 反应式原理

### 依赖追踪

```js
nova({ data: { count: 0 } })
// 1. walk() 扫描文档，编译 {{ count }} 为 with(data){ return count }
// 2. 包成 effect(fn) 首次执行，读 data.count → track → 把 effect 加入 'count' 的订阅列表
// 3. data.count = 1 → Proxy.set → trigger → 所有订阅 'count' 的 effect 入队
// 4. microtask flush → 批量更新 DOM
```

### 调度

```js
data.count = 1
data.count = 2
data.count = 3
// 同一个 tick 内只触发一次 DOM 更新
```

底层 `Promise.resolve().then(flush)`。

## 7. 关键实现细节

### `walk()` 跳过自定义元素

```js
if (node.nodeType === 1 && node.tagName.indexOf('-') !== -1) continue
```

避免误把 `<nova-switch show="x">` 的 `show` 属性当 `show` 指令处理。

### 自定义元素和 walk 的互动

`nova-ui-elements.js` 通过监听 `nova-ready` 自定义事件，同步自定义元素和 `nova()` 初始化时序：

```js
// novajs.js
nova._data = _data
setTimeout(() => {
  document.dispatchEvent(new CustomEvent('nova-ready', { detail: { data: _data } }))
}, 0)

// nova-ui-elements.js
document.addEventListener('nova-ready', e => {
  // 绑定 <nova-switch model="power"> 等
})
```

### `nova.data`（公开引用）

```js
// src/novajs.js 内部
function nova(config, ns) {
  // 首次创建，后续合并到 nova.data
  if (nova.data) { /* merge */ }
  else { nova.data = reactive(...) }
}
```

通过 `nova.data` 和 `nova._data`（别名）暴露。

## 8. 不做的事（明确）

- ❌ Virtual DOM / diff 算法
- ❌ 组件生命周期钩子（mounted / updated）
- ❌ 单文件组件（.vue / .svelte）
- ❌ JSX / TSX
- ❌ SSR / Hydration
- ❌ Router / 状态管理库
- ❌ 编译时优化（Babel / Vite 插件）
- ❌ Tree-shaking 分包
- ❌ `v-*` 前缀（已废弃，故意裸名）
- ❌ 函数式组件 API（属于 nova-ui）

## 9. 性能特征

| 操作 | 复杂度 |
|---|---|
| 读 data.xxx | O(1) |
| 写 data.xxx | O(订阅者数) |
| microtask flush | O(所有待更新 effect) |
| walk() 启动 | O(文档 DOM 节点数) |
| 新指令编译 | O(模板字符串长度) |

ESP32 上 100 个 effect 的 flush 在几 ms 内完成。

## 10. 项目结构

```
nova-js/
├── AGENTS.md           ← AI 助手指南
├── SPEC.md             ← 本文件
├── README.md
├── package.json        ← build / docs / test 脚本
├── src/
│   ├── novajs.js       ← 核心
│   └── novajs.min.js   ← 压缩
├── test/               ← 84 个测试
├── examples/           ← 5 个完整例子 + 6 个指令 demo
└── docs/               ← VitePress 文档
```

## 11. 配套生态

| 项目 | 职责 | 大小 |
|---|---|---|
| novajs | 反应式内核 | 9 KB min |
| nova-style | 原子 CSS | 12 KB |
| nova-ui | 静态 + 动态组件 | 12 KB CSS + 11 KB JS |
| nova-chart | 图表 | 18 KB |

整套 ~62 KB，能扔进 4MB flash 的 ESP32。

novajs 只做反应式。组件归 nova-ui，CSS 工具类归 nova-style，图表归 nova-chart。