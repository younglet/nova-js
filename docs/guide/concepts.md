# 核心概念

> 用 novajs 之前要理解的 4 件事：反应式数据、表达式作用域、effect 自动追踪、microtask 调度。

## ① 反应式数据 = 普通 JS 对象

`nova({data, funcs})` 返回的是一个 **Proxy**。你读写任何字段，都会被自动追踪：

```js
const data = nova({
  data:  { count: 0, user: { name: 'alice' } },
  funcs: { /* 方法 */ }
})

data.count           // 读：触发依赖追踪
data.count = 1       // 写：触发更新通知
data.user.name = 'bob'  // 嵌套对象也是 Proxy，自动响应
```

**不需要 `ref()`、`reactive()`、`state.xxx`**。对象就是对象，Proxy 包一下就响应式。

### 数组也响应式

```js
data.devices.push(x)        // ✅ 触发 length 变化
data.devices.splice(0, 1)   // ✅
data.devices[0] = x         // ✅
data.devices = []           // ✅ 整体替换
```

数组方法（`push` / `splice` / `sort` / `reverse`）和下标赋值都会被拦截。

### 嵌套对象深响应式

```js
const data = nova({ data: { user: { profile: { name: 'alice' } } } })
data.user.profile.name = 'bob'  // 三层嵌套也响应
```

`nova()` 递归包装所有对象字段。

## ② 表达式都在 `with(data){}` 作用域

模板里的 `{{ }}` / `:attr` / `@event` / `model` / `if` / `loop` 表达式，都是在 **`with(data){}` 里求值**。所以：

```html
{{ count }}              <!-- 等价 data.count -->
{{ user.name }}          <!-- data.user.name -->
{{ items.length }}       <!-- data.items.length -->
{{ on ? '开' : '关' }}   <!-- data.on -->
```

**事件回调也一样**——`@click="increment()"` 里的 `increment` 解析为 `data.increment`：

```html
<button @click="increment()">+1</button>     <!-- data.increment() -->
<button @click="count = count + 1">+1</button> <!-- data.count = data.count + 1 -->
<button @click="async load()">加载</button>   <!-- data.load() -->
```

副作用：`with` 会让 JS 引擎稍慢（V8 已优化），但模板场景几乎察觉不到。

### 模板里调全局变量

```html
<!-- ❌ 全局变量不在 with 里 -->
{{ window.innerWidth }}
{{ Date.now() }}

<!-- ✅ 放进 data -->
nova({ data: { width: window.innerWidth, now: Date.now() } })
{{ width }} {{ now }}
```

## ③ Effect = 数据 → DOM 的桥

**"模板里的某个表达式依赖了哪些字段"** 是怎么知道的？答案是 **effect**。

```js
function effect(fn) {
  var eff = makeEff(fn)
  activeEffect = eff
  fn()        // 第一次执行：fn 里读 data.xxx 会触发 track，把 eff 加到 xxx 的订阅列表
  activeEffect = null
}
```

每次 `data.xxx` 被读，Proxy.get 都会调用 `track()`：
- 当前有没有正在执行的 effect？
- 有 → 把 effect 加到 `data.xxx` 的订阅列表

每次 `data.xxx` 被写，Proxy.set 调用 `trigger()`：
- 遍历 `data.xxx` 的订阅列表
- 让每个 effect 重跑（DOM 更新）

**完全自动，你不用管**。

## ④ Microtask 调度（合并多次更新）

如果一个 tick 里改了 100 个字段，会触发 100 个 effect 重跑吗？

**不会**。novajs 把多次更新合并成一次 DOM 重渲：

```js
data.count = 1
data.count = 2
data.count = 3
// 只触发一次 DOM 更新（microtask 调度）
```

底层是 `Promise.resolve().then(flush)`：

```js
function makeEff(fn) {
  return {
    _fn: fn,
    _sched: function () {
      if (queue.has(this)) return
      queue.add(this)
      if (!scheduled) {
        scheduled = true
        Promise.resolve().then(flush)  // 推到下一个 microtask
      }
    }
  }
}
```

所以**同步代码里多次改 data，只会有一次 DOM 重渲**。但同步代码里**读取的字段会全部被追踪**——因为 effect 第一次跑时还没合并。

## ⑤ 没有生命周期

novajs **没有 `mounted` / `updated` / `beforeDestroy` / `created`**。

如果需要"在 X 变化时做 Y"，用 `data.$watch(key, cb)`：

```js
const data = nova({ data: { brightness: 50 } })

data.$watch('brightness', function (newVal, oldVal) {
  console.log('brightness:', oldVal, '→', newVal)
})
```

如果需要"等 DOM 更新完再做"，用 `nova.nextTick(fn)`：

```js
data.count = 99
nova.nextTick(() => {
  // 此时 DOM 已经反映 count = 99
})
```

## ⑥ 单例 + 整页扫描

一个页面只能调一次 `nova(state)`（第二次返回同一个 `_data`）。初始化时扫描 `document.body`：

```js
const data = nova({ data: { count: 0 } })  // 首次：创建 + 扫描 DOM + 注册 effects
const data2 = nova({ data: { count: 1 } }) // 后续：返回同一个 _data，state 被忽略
```

不需要指定根元素（没有 `el: '#app'`）。整个 document 自动扫描。

## 这些设计的好处 / 代价

| 决策 | 好处 | 代价 |
|---|---|---|
| 自动 Proxy 包装 | 不写 ref/reactive | 修改**未在 data 里声明**的属性不响应 |
| `with(data)` | 模板里少写 `data.` | 调试器栈不直观（Vue 也这样）|
| Effect 自动追踪 | 不写 watch / computed | 大量字段被追踪时首次渲染稍慢 |
| Microtask 调度 | 多次改 data 只渲染一次 | `await` 后才看得到效果（其实也是好处）|
| 单例 | 一个 nova 跑全局 | 多页面隔离需要手动重置 |

## 下一步

- [5 分钟上手](./getting-started) — 把上面这些串起来跑通一个例子
- [指令速查](./directives/text) — 6 个指令每个一页