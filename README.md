# novajs

> IoT 反应式内核。9KB min · 零依赖。
> 给烧了 MicroPython 的 ESP32 当 HTTP server 时的前端三件套之一。
> [SPEC.md](./SPEC.md) | [AGENTS.md](./AGENTS.md)

```html
<script src="novajs.js"></script>
<script>
  const data = nova({ count: 0, inc() { this.count++ } })
</script>

<button @click="inc()">+</button>
<span>{{ count }}</span>
```

That's it. No `el`, no `methods`, no `mounted`, no `app.$mount()`.

---

## ✨ 特点

- 🎯 **极简 API** — 只有 `nova()` / `nova.bind()` / `nova.http` 三个全局
- ⚡ **默认响应式** — 任何状态读写都自动追踪依赖，无需 `ref()` / `reactive()`
- 📝 **HTML-first** — 模板写在 HTML 里，JS 只管数据
- 🌐 **内置 HTTP** — `get/post/put/del/patch` 一个对象搞定
- 💾 **零依赖** — 单文件 ~5KB minified
- 🔌 **自动绑定** — `<input name="X">` 自动 model 到 `data.X`

---

## 🚀 5 分钟上手

### 1. 引入

```html
<script src="novajs.js"></script>
```

### 2. 声明数据

```js
const data = nova({
  count: 0,
  user: { name: 'alice' },
  devices: [],

  // 方法直接写在 data 上，this 自动指向 data
  inc () { this.count++ },
  async loadDevices () {
    this.devices = await nova.http.get('/api/devices')
  }
})
```

### 3. 写模板

```html
<h1>Hello {{ user.name }}</h1>
<p>{{ count * 2 }}</p>

<button @click="inc()">+</button>
<button @click="loadDevices()">加载</button>

<input model="user.name">                     <!-- 双向绑定 -->
<input name="brightness" type="range">         <!-- 自动 model（按 name） -->

<div if="count > 10">🔥 超过 10 了</div>

<ul>
  <li loop="(d, i) in devices" :key="d.id">
    {{ i + 1 }}. {{ d.name }}
  </li>
</ul>
```

---

## 📖 API 参考

### `nova(state?)`

声明全局响应式数据，返回 Proxy。

```js
const data = nova({ count: 0, name: 'alice' })
// 首次调用：创建 _data，扫描 DOM
// 后续调用：返回 _data（忽略 state 参数，除非显式传入新对象）
```

返回值 `data` 上挂载了几个内置方法：

| 方法 | 作用 |
|---|---|
| `data.$watch(key, cb)` | 监听某个字段变化 |
| `data.$set(obj, key, val)` | 显式触发响应式（一般不用） |

### `nova.bind(path, selector, options?)`

把数据路径绑定到 DOM（多数情况下你不需要这个——用 `id`/`name`/`model` 就够了）。

```js
nova.bind('user.name', '#display')             // 文本
nova.bind('brightness', 'input[type=range]')   // 表单值
nova.bind('rawHtml', '#content', { html: true })
```

### `nova.http.{get,post,put,patch,del}`

```js
const devices = await nova.http.get('/api/devices')
await nova.http.post('/api/devices', { name: 'sensor1' })
await nova.http.put('/api/devices/1', { value: 50 })
await nova.http.del('/api/devices/1')

// 带选项
await nova.http.get('/api/devices', {
  baseURL: 'https://api.example.com',
  timeout: 5000,
  headers: { Authorization: 'Bearer xxx' }
})
```

### `nova.debounce(fn, ms)`

返回防抖包装后的函数。

```js
const save = nova.debounce(async function () {
  await nova.http.put('/api/save', { value: this.value })
}, 400)

input.addEventListener('input', save)
```

### `nova.nextTick(fn)`

下一个 DOM 更新周期后执行。

---

## 📝 模板指令

| 指令 | 作用 | 示例 |
|---|---|---|
| `{{ expr }}` | 文本插值 | `{{ count + 1 }}` |
| `model` | 双向绑定 | `<input model="name">` |
| `if` | 条件渲染 | `<div if="ok">...</div>` |
| `show` | 显示/隐藏 | `<div show="ok">...</div>` |
| `loop` | 列表渲染 | `<li loop="(x, i) in xs">{{ i }}.{{ x }}</li>` |
| `:` | 属性绑定 | `<img :src="url">` |
| `@event` | 事件 | `<button @click="fn()">` |
| `name="X"` | 自动 model（表单元素） | `<input name="username">` |

### 事件修饰符

```html
<button @click.stop="fn">阻止冒泡</button>
<form @submit.prevent="fn">阻止默认</form>
<input @keyup.enter="fn">回车触发</input>
```

---

## 🎯 设计原则

1. **Always-live by default** — `{{ x }}` 永远是双向的，没有"一次渲染"
2. **Plain JS state** — 数据就是普通对象，Proxy 自动包装
3. **No `el` selector** — 默认扫描整个 document，无需指定根
4. **No `methods` block** — 方法就是数据上的函数
5. **No `mounted`/`updated`** — 没有生命周期钩子（用 `$watch` 替代）

---

## 📁 项目结构

```
novajs/
├── src/
│   └── novajs.js          ← 核心库（单文件 ~15KB，未压缩 ~5KB）
├── examples/
│   ├── 01-toggle.html          ← 单设备开关（novajs + nova-style）
│   ├── 02-slider.html          ← 滑块调光（防抖）
│   ├── 03-live-sensors.html    ← 实时传感器（轮询）
│   ├── 04-device-grid.html     ← 多设备网格（loop）
│   ├── 05-class-style.html     ← 动态 class / style
│   └── with-nova-ui/           ← 上面 5 个用 nova-ui 组件重写的版本
│       ├── 01-toggle.html
│       ├── 02-slider.html
│       ├── 03-live-sensors.html
│       ├── 04-device-grid.html
│       ├── 05-class-style.html
│       └── README.md           ← 重构说明（推荐先看）
├── SPEC.md                ← 设计规格（裸名指令、{data, funcs}、性能）
├── AGENTS.md              ← AI 助手项目指南
└── README.md              ← 本文件
```

> 💡 想看 novajs + nova-ui + nova-style 三件套怎么配合？打开 [`examples/with-nova-ui/`](./examples/with-nova-ui/) 里的 5 个 HTML，业务逻辑没变，HTML 用上了 `device-card` / `sensor-card` / `switch` / `status-dot` 等组件。

---

## 🆚 与其他框架对比

| | novajs | Petite-Vue | Alpine.js | Vue 3 |
|---|---|---|---|---|
| 上手时间 | 1 分钟 | 2 分钟 | 3 分钟 | 30 分钟 |
| 体积 | ~5KB | ~5KB | ~15KB | ~33KB |
| `el` 选择器 | ❌ 不要 | 需要 | ❌ 不要 | 需要 |
| `methods` 块 | ❌ 不要 | 需要 | ❌ 不要 | 需要 |
| 组件 | ❌ 单文件 | ✅ | ❌ | ✅ |
| 内置 HTTP | ✅ | ❌ | ❌ | ❌ |
| 双向绑定 | 默认 | `model` | `x-model` | `v-model` |

---

## 🛣️ 路线

- [x] v0.1 — 响应式 + `{{ }}` + `model` + `@event`
- [x] v0.2 — `if`
- [x] v0.3 — `loop`
- [x] v0.4 — `:bind` / `show`
- [x] v0.5 — 内置 `http`
- [ ] v0.6 — HTTP 拦截器 + 取消
- [ ] v1.0 — 文档站 + 测试 + 打包脚本

---

## 📜 License

MIT