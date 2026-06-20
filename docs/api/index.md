---
title: JS API
---

# JS API

> novajs 暴露给 JS 侧的全部接口。

## 全局

| 名称 | 类型 | 说明 |
|---|---|---|
| [`nova(config)`](./nova) | 函数 | 入口。声明响应式数据 + funcs，返回 proxy |
| `nova.http` | 对象 | 内置 HTTP 客户端（get/post/put/patch/del） |
| `nova.debounce(fn, ms)` | 函数 | 防抖包装 |
| `nova.nextTick(fn)` | 函数 | 等下一个 microtask |
| `nova.bind(path, sel, opts?)` | 函数 | 程序化绑定（多数情况用不到）|
| `nova._data` | Proxy | 当前 data proxy（暴露给自定义元素）|

## proxy 上的方法

| 名称 | 类型 | 说明 |
|---|---|---|
| `data.$watch(key, cb)` | 函数 | 监听字段变化 |
| `data.field` | 任意 | data 字段读写，自动响应 |
| `data.method()` | 任意 | 调用 funcs 里的方法 |

## 文件

| 文件名 | min 后 | 说明 |
|---|---|---|
| `src/novajs.js` | 9 KB | 反应式内核 |

> 组件（CSS + 自定义元素）见 [nova-ui 仓库](https://github.com/)。

## 使用

```html
<script src="novajs.min.js"></script>
```

## 接下来

- [`nova()`](./nova) — 入口函数
- [`data.$watch`](./watch) — 变化监听
- [`nova.http`](./http) — HTTP 客户端
- [`nova.debounce / nextTick / bind`](./utils) — 工具函数