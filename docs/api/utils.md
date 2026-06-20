# 工具函数

> `nova.debounce` / `nova.nextTick` / `nova.bind`

## `nova.debounce(fn, ms)`

防抖包装。

### 签名

```js
nova.debounce(fn, ms) → Function
```

### 行为

调用返回的函数后**等待 `ms` 毫秒**，如果期间没再次调用，则触发 `fn`。连续调用只触发最后一次。

```js
const save = nova.debounce(function () {
  console.log('saved!')
}, 400)

save()   // 400ms 后输出 "saved!"
save()   // 重置计时器
save()   // 重置计时器 → 400ms 后输出 "saved!"（只一次）
```

### `this` 绑定

`this` 指向**调用时所在的上下文**（通过 `.apply`）：

```js
const data = nova({ data: { x: 0 } })

const increment = nova.debounce(function () { this.x++ }, 300)

input.addEventListener('input', increment)
// this = input 元素（事件回调里的 this）

// 要 this = data，写成：
input.addEventListener('input', function () { data.x = data.x + 1 })
// 或包成 funcs：
nova({
  data: { x: 0 },
  funcs: {
    debouncedInc: nova.debounce(function () { this.x++ }, 300)
  }
})
```

### 典型用法

slider 防抖上报（最常用）：

```js
nova({
  data:  { brightness: 50 },
  funcs: {
    save: nova.debounce(async function () {
      await nova.http.put('/api/dim/1', { value: this.brightness })
    }, 400)
  }
})

data.$watch('brightness', function () { data.save() })
```

完整示例见 [examples/02-slider.html](../examples/02-slider.html)。

---

## `nova.nextTick(fn)`

下一个 microtask 执行回调（等当前 tick 的所有 data 变化生效后）。

### 签名

```js
nova.nextTick(fn) → Promise
```

### 用法

```js
data.count = 99
nova.nextTick(function () {
  // 此时 DOM 已反映 count = 99
  console.log(document.querySelector('.count').textContent)  // "99"
})
```

### 返回 Promise

也可以 `await`：

```js
data.count = 99
await nova.nextTick()
// DOM 已更新
```

底层是 `Promise.resolve().then(fn)`。

### 典型用法

"改完 data 后立即读 DOM"——比如自动 focus、滚动到指定位置：

```js
nova({
  data:  { activeTab: 'home' },
  funcs: {
    switchTab (name) {
      this.activeTab = name
      nova.nextTick(function () {
        const element = document.querySelector('#' + name)
        element.focus()
        element.scrollIntoView({ behavior: 'smooth' })
      })
    }
  }
})
```

---

## `nova.bind(path, selector, options?)`

**程序化绑定**——多数情况**用不到**，靠 `id` / `name` / `model` / `@event` 自动就够了。

### 签名

```js
nova.bind(path, selector, options?)
```

- **`path`**：字符串，data 字段路径
- **`selector`**：CSS selector 或 DOM 元素
- **`options.if`**：字符串，条件表达式
- **`options.html`**：boolean，是否用 `innerHTML`

### 文本绑定

```js
nova.bind('user.name', '#display')
// 等价于 <span id="display">{{ user.name }}</span>
```

### 表单值双向绑定

```js
nova.bind('username', 'input[name=username]')
// 等价于 <input name="username" model="username">
```

### 条件渲染

```js
nova.bind('count', '#badge', { if: 'count > 10' })
// count > 10 时显示
```

### 原始 HTML

```js
nova.bind('rawHtml', '#content', { html: true })
// 等价于 <div id="content" innerHTML="{{ rawHtml }}"></div>
// ⚠️ 注意 XSS
```

### 适用场景

只在以下情况用 `nova.bind`：

1. **动态插入的 DOM**——`nova()` 初始化时不在页面里
2. **JS 控制**——不想写模板
3. **第三方 widget 容器**——你没法改 HTML，只能调 JS

```js
// 动态插入的列表项
function addDevice (device) {
  const div = document.createElement('div')
  div.className = 'device-card'
  document.body.appendChild(div)

  nova.bind('device.name', div.querySelector('.name'))
  nova.bind('device.power', div.querySelector('.switch input'))
}
```

### 完整示例

```js
// 仪表盘 widget，每个图表独立绑定
nova({
  data: { temperature: 24.5, humidity: 58 }
})

nova.bind('temperature', '#temp-display')
nova.bind('humidity', '#humid-display')

// 动态加载的 widget
async function loadWidgets () {
  const response = await fetch('/api/widgets')
  const widgets = await response.json()

  widgets.forEach(function (w) {
    const container = document.getElementById('widget-' + w.id)
    container.innerHTML = '<span class="value"></span>'

    nova.bind('widgetValues.' + w.id, container.querySelector('.value'))
  })
}
```

## 接下来

- [`nova()`](./nova)
- [`data.$watch`](./watch)
- [`nova.http`](./http)