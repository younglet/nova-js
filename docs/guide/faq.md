---
title: FAQ
---

# FAQ

> 常见问题和回答。

## 设计类

### 为什么指令是裸名（`if` / `loop`），不是 `v-if` / `v-for`？

两个考虑：

1. **不撞 HTML 属性**。`for` 已经是 `<label for="id">` 的属性了，再加 `v-for` 是不得已。裸名天然没这个问题。

2. **更短**。模板里出现频率最高的指令，每次省 2 个字符（`v-`），长模板累计可观。

### 为什么 `data` 和 `funcs` 分开？

```js
nova({
  data:  { devices: [...] },
  funcs: { load () { ... } }
})
```

**安全 + 清晰**：

- HTTP 响应赋给 `this.devices = response` 时，物理上不可能误改 funcs（它们不在 data namespace 里）
- `Object.keys(data)` 不会列出 funcs（它们不可枚举）
- `JSON.stringify(data)` 直接拿到纯数据，不用 `delete` 方法
- 读配置时一眼分清"哪些是数据哪些是行为"

### 为什么没有 `methods` / `actions` / `state` 这些选项？

novajs **不模仿 Vue/Pinia**——它是独立的小内核。

- 没有 `methods` 因为 nova 已经有了 funcs（更短、更中性）
- 没有 `state` 因为整个 data 都是 state，不需要再分一层
- 没有 `actions` 因为 funcs 既能改 state 也能读 state，没必要再细分

### 为什么没有 `computed`？

`get xxx() { ... }` 直接写在 data 里就是计算属性：

```js
nova({
  data: {
    items: [1, 2, 3],
    get itemCount () { return this.items.length }
  }
})
```

`{{ itemCount }}` 自动响应 `items` 变化。

### 为什么没有生命周期钩子（mounted / updated）？

novajs 的反应式 + `$watch` 能覆盖大多数需求：

```js
// 替代 mounted
data.$watch('ready', function () { /* ... */ })

// 替代 updated（"改完后做"）
nova.nextTick(function () { /* DOM 已更新 */ })
```

如果确实需要"组件创建时做一次"，在 `nova()` 调用之后直接写：

```js
const data = nova({ ... })
// 这里 DOM 已经绑定完成
data.fetchInitial()
```

### 为什么单例？

novajs 假设一个页面 = 一个应用。多实例支持会让 API 复杂化（每个 binding 要知道"哪个 data"）。

如果需要多个隔离的应用，把不同 nova 实例塞进不同的 DOM 树 / shadow DOM 里，**用 IIFE 包住**：

```js
;(function () {
  const data = nova({ ... })  // IIFE 内是独立的
  // ...
})()
```

## 使用类

### 修改未在 data 里声明的属性不响应

```js
nova({ devices: [{ name: 'a' }] })
data.devices[0].on = true   // ✅ on 是 data 里已有的
data.newField = 'x'         // ❌ newField 不在 data 里
```

**解决**：初始化时把字段都声明好：

```js
nova({ devices: [{ name: 'a', on: false }] })
```

### `:style` 里的 `display: flex` 被 `show` 覆盖

`show` 内部就是 `el.style.display = ''` 或 `'none'`，会覆盖行内 style。

**解决**：用 `:style` 表达完整：

```html
<div :style="{ display: ok ? 'flex' : 'none' }">
```

### `v-for` / `v-if` 写错了没报错

novajs 没 `v-for` / `v-if`——你可能在用旧文档。看 [指令速查](./directives/text)。

### `with(data)` 在严格模式报错

novajs 内部把表达式编译成 `with(data){...}`。如果你的页面有 `'use strict'`，且 funcs 里有同名局部变量，会报错。

**解决**：funcs 里别用 `data` / `funcs` / `methods` / `state` 当局部变量名。

### `nova()` 第二次调用返回什么？

返回**同一个 data proxy**，第二次传的 state 被忽略（除非显式传入不同对象）。

```js
const a = nova({ count: 0 })
const b = nova({ count: 99 })  // 返回的还是 a
a.count === b.count  // true
```

这是设计——**整页只一个 data**。

### `JSON.stringify(data)` 没有 funcs？

对，funcs 是**不可枚举**的，不在 stringify 输出里。所以可以直接 `localStorage.setItem('app', JSON.stringify(data))`。

### `this` 在 funcs 里指向什么？

**指向 data proxy**（不是 funcs 对象）：

```js
funcs: {
  increment () {
    this.count++      // ✅ this.count = data.count
    this.otherFunc()  // ✅ this.otherFunc = funcs.otherFunc
  }
}
```

但在 `$watch` 回调里 `this` **不指向 data**——避免歧义：

```js
data.$watch('count', function (newValue, oldValue) {
  console.log(newValue, oldValue)
  // this === undefined（或全局，取决于严格模式）
  // 用闭包变量：data.doSomething()
})
```

## 性能类

### 列表多大开始卡？

经验值：

- < 50 项：随便用
- 50-500 项：注意别每秒改多次
- > 500 项：考虑分页或虚拟滚动

novajs **不做节点复用**，每次改 list 都重建整个列表——比 Vue 的 diff 慢，但代码量小 10 倍。

### 高频更新怎么优化？

```js
// ❌ 慢：每个 WebSocket 消息触发整个列表重建
ws.onmessage = function (e) {
  const update = JSON.parse(e.data)
  data.devices[0].value = update.value
}

// ✅ 快：只改单字段
ws.onmessage = function (e) {
  const update = JSON.parse(e.data)
  data['dev_' + update.id] = update.value
}
```

或用 `$watch` + 节流：

```js
let pending = {}
ws.onmessage = function (e) {
  Object.assign(pending, JSON.parse(e.data))
}
data.$watch('pending', function () {
  // debounced flush
})
```

### effect 不重渲

99% 是因为**没读到 data 字段**：

```js
effect(function () {
  // ❌ 没用 data，effect 不知道要重跑
  document.title = 'static'

  // ✅ 读了 data，effect 知道要重跑
  document.title = data.title
})
```

## 接下来

- [API 文档](../api/) — 完整 JS API 参考
- [5 个完整案例](../examples/) — 真实 IoT 场景