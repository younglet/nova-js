# 事件 `@event`

> 把 DOM 事件（click / input / change / submit 等）绑到 data 上的表达式。

## 效果

<iframe src="/examples/demos/event.html" width="100%" height="540" frameborder="0" style="border-radius:8px"></iframe>

## 代码

```html
<button @click="increment()">+1</button>
<button @click="count = count + 1">直接改 data</button>
<input @input="onSearch($event.target.value)">

<script src="../src/novajs.js"></script>
<script>
  nova({
    data: { count: 0 },
    funcs: {
      increment () { this.count++ },
      onSearch (value) { /* ... */ }
    }
  })
</script>
```

## 四种写法

### ① 调方法

```html
<button @click="increment()">+1</button>
```

最清晰。`@click` 里的字符串是 JS 语句，需要 `()` 调用。

### ② 直接改 data

```html
<button @click="count = count + 1">+1</button>
```

简单场景不需要单独的方法。

### ③ 拿 `$event`

```html
<input @input="onSearch($event.target.value)">
<form @submit="onSubmit($event)">...</form>
```

`$event` 是原生 DOM 事件对象。复杂逻辑在 `funcs.onSearch` 里实现。

### ④ inline 表达式

```html
<button @click="paused = !paused">toggle</button>
<button @click="async load()">加载</button>
```

任何合法 JS 语句都行。

## 事件修饰符（不支持）

```html
<!-- ❌ 这些都无效 -->
<button @click.stop="fn">
<form @submit.prevent="fn">
<input @keyup.enter="fn">

<!-- ✅ 自己在回调里写 -->
<button @click="onClick($event)">  function onClick (e) { e.stopPropagation(); fn() }
<form @submit="onSubmit($event)">  function onSubmit (e) { e.preventDefault(); ... }
<input @keyup="onKey($event)">     function onKey (e) { if (e.key === 'Enter') fn() }
```

novajs 不实现修饰符，**只在回调里手动写**——更显式，调试也容易。

## 常见错误

### ① 忘了 `()`

```html
<!-- ❌ 把方法引用赋给 click handler（不调用）-->
<button @click="increment">+1</button>

<!-- ✅ 必须 () 调用 -->
<button @click="increment()">+1</button>
```

### ② 用了箭头函数（丢失 `this`）

```js
funcs: {
  // ❌ 箭头函数 this 不指向 data
  increment: () => { this.count++ }

  // ✅ 普通函数
  increment () { this.count++ }
}
```

### ③ 异步错误

```js
funcs: {
  async load () {
    const r = await nova.http.get('/api/x')  // 抛错会冒泡
    this.data = r
  }
}
```

novajs **会自动捕获 promise 错误并 `console.error`**——不会让整个 click handler 崩掉。

## 下一步

- [patterns](../patterns) — 防抖、$watch、乐观更新等实战模式
- [API 文档](../../api/) — `nova.debounce` / `data.$watch` 等