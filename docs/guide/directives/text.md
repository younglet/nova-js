# 文本插值 `{{ }}`

> 把 data 里的值塞进 HTML 文本里。所有表达式都在 `with(data){}` 作用域求值，直接写字段名就行。

## 效果

<div class="demo-box">
  <div class="demo-card">
    <p>Hello, <b>{{ name }}</b>!</p>
    <p>温度：<b>{{ temp }}°C</b></p>
    <p>状态：<b>{{ online ? '🟢 在线' : '🔴 离线' }}</b></p>
  </div>
</div>

<iframe src="/examples/demos/text.html" width="100%" height="180" frameborder="0" style="border-radius:8px;margin-top:12px"></iframe>

试试改下面的 data：

```html
<input model="name" placeholder="改名字">
<input model="temp" type="number" placeholder="温度">
<button model="online" type="checkbox">在线</button>
```

## 代码

```html
<p>Hello, <b>{{ name }}</b>!</p>
<p>温度：<b>{{ temp }}°C</b></p>
<p>状态：<b>{{ online ? '🟢 在线' : '🔴 离线' }}</b></p>

<script src="../src/novajs.js"></script>
<script>
  nova({ data: { name: 'alice',
    temp: 24.5,
    online: true } })
</script>
```

## 细节

### 表达式作用域 = `with(data){...}`

模板里直接写 `name`、`user.name`、`devices[0].name`，不用加 `data.` 前缀。**事件回调里也一样**。

```html
{{ count + 1 }}
{{ user.name.toUpperCase() }}
{{ devices.filter(d => d.on).length }}
{{ online ? '开' : '关' }}
```

### `undefined` / `null` 显示空字符串

```html
{{ missing }}  <!-- ""  -->
{{ null }}     <!-- "" -->
{{ 0 }}        <!-- "0" ← 注意 0 不是空 -->
```

### `String(v)` 转换

数字、布尔、对象最终都转字符串。对象会变成 `[object Object]`——如果你想显示对象内容，自己 toString：

```js
nova({ data: { user: { name: 'alice', toString () { return this.name } } } })
{{ user }}  <!-- "alice" -->
```

### 多次插值混排

```html
<span>{{ onCount }} / {{ devices.length }} 台开启</span>
<!-- 输出：3 / 5 台开启 -->
```

### 不会重复渲染

novajs **没有 `v-once`**——所有 `{{ }}` 都是 live 的。如果你真的想锁住值，自己包：

```js
nova({ data: { time: Date.now() } })  // 只在初始化时算一次，之后改 time 才会变
```

### 改 `data.xxx` 自动重渲

```js
nova({ data: { count: 0 } })
// DOM: <span>{{ count }}</span> → 显示 "0"

data.count = 99
// DOM 自动变成 "99"，不用手写 update
```

### 怎么实现的（30 秒版）

1. 解析 `{{ count }}` → 编译成 `with(data){ return count }`
2. 包成 effect 执行一次：读 `data.count` → 自动订阅 `count` 的变化
3. `data.count = 99` → Proxy.set 触发 → effect 重跑 → DOM 更新

### 常见错误

```html
<!-- ❌ 想用全局变量 -->
{{ window.innerWidth }}     <!-- window 不在 with 里 -->
{{ Date.now() }}            <!-- 也不行 -->

<!-- ✅ 放进 data -->
nova({ data: { width: window.innerWidth, now: Date.now() } })
{{ width }} {{ now }}
```

## 下一步

- [双向绑定 model](./model) — 表单元素 ↔ data
- [条件 if / show](./if-show) — 显隐切换