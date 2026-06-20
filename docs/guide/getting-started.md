---
title: 5 分钟上手
---

# 5 分钟上手

> 跑通你的第一个 novajs 应用。

<iframe src="/examples/flasher.html" width="100%" height="280" frameborder="0" style="border-radius:8px;margin-bottom:24px"></iframe>

## 步骤 ①：引入脚本

```html
<script src="novajs.js"></script>
```

`novajs.js` 8.6KB（minified），单文件、零依赖。下载丢进项目即可。

## 步骤 ②：声明数据

```html
<script>
  nova({
    data:  { count: 0 },
    funcs: { increment () { this.count++ } }
  })
</script>
```

调用 `nova({...})`：
- 创建 Proxy（自动响应式）
- 扫描 document，绑定 `{{ }}` / `:attr` / `@event` 等指令
- 数据挂在 `nova.data` 上，也可以 `const data = nova(...)` 接返回值

**`data` 里是数据，`funcs` 里是方法**——两者物理隔离。

多次调用 `nova()` 自动合并，支持命名空间：

```js
nova({ data: { count: 0 } })
nova({ data: { name: 'world' } })
// nova.data.count → 0, nova.data.name → 'world'

nova.poll('/api/sensors', 3000, 'sensors')  // 一行接入轮询
nova.resource('/api/devices', 'devices')     // 一行接入 CRUD
```

## 步骤 ③：写模板

```html
<button @click="increment()">+1</button>
<span>{{ count }}</span>
```

就这两行。点按钮 → `funcs.increment()` → `data.count++` → `{{ count }}` 自动重渲。

## 完整跑起来

把下面代码存成 `hello.html`，双击打开就能跑：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>novajs hello</title>
</head>
<body>
  <h1>Hello, {{ name }}!</h1>
  <p>你点了 {{ count }} 次</p>

  <button @click="increment()">+1</button>
  <button @click="count = 0">重置</button>

  <input model="name" placeholder="你的名字">

  <script src="novajs.js"></script>
  <script>
    nova({
      data:  { count: 0, name: 'world' },
      funcs: { increment () { this.count++ } }
    })
  </script>
</body>
</html>
```

试试：
- 点 `+1` → 数字加 1
- 点 `重置` → 数字归零
- 在输入框输入 → 标题实时变化

## 接下来

- [核心概念](./concepts) — 理解 Proxy / effect / microtask 是怎么工作的
- [指令速查](./directives/text) — 6 个指令一页一个 demo
- [5 个完整案例](../examples/) — IoT 真实场景