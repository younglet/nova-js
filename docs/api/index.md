---
title: JS API
---

# JS API

> novajs 暴露给 JS 侧的全部接口。

## 核心

| 名称 | 类型 | 说明 |
|---|---|---|
| [`nova(config, ns?)`](./nova) | 函数 | 入口。声明响应式数据 + funcs，返回 proxy |
| `nova.data` | Proxy | 当前实例的 data proxy |
| `nova._data` | Proxy | 向后兼容，指向 `nova.data` |

## 数据同步

| 名称 | 类型 | 说明 |
|---|---|---|
| [`nova.poll(url, interval, ns?)`](./utils#novapoll--novaresource) | 函数 | 轮询，自动开始，字段平铺 |
| [`nova.resource(url, ns?)`](./utils#novapoll--novaresource) | 函数 | CRUD + 乐观更新 + 回滚 |
| [`nova.update(ns?)`](./utils#novaupdate) | 函数 | 手动刷新命名空间 |

## HTTP

| 名称 | 类型 | 说明 |
|---|---|---|
| `nova.http.get/post/put/patch/del` | 函数 | 内置 HTTP 客户端 |

## 工具

| 名称 | 类型 | 说明 |
|---|---|---|
| [`nova.debounce(fn, ms)`](./utils#novadebounce) | 函数 | 防抖 |
| [`nova.interval(fn, ms)`](./utils#novainterval--novatimeout) | 函数 | 托管定时器 → `{start, stop}` |
| [`nova.timeout(fn, ms)`](./utils#novainterval--novatimeout) | 函数 | 托管超时 → `{start, cancel}` |
| [`nova.nextTick(fn)`](./utils#novanexttick) | 函数 | 下一个 microtask |
| [`nova.bind(path, sel, opts?)`](./utils#novabind) | 函数 | 程序化绑定 |
| [`nova.fmt`](./utils#novafmt) | 对象 | 日期时间格式化 |
| [`nova.dom(sel)`](./utils#novadom) | 函数 | 元素查询 |

## proxy 上的方法

| 名称 | 类型 | 说明 |
|---|---|---|
| [`data.$watch(key, cb)`](./watch) | 函数 | 监听字段变化 |
| `data.field` | 任意 | 读写，自动响应式 |
| `data.method()` | 任意 | 调用 funcs 方法 |

## 使用

```html
<script src="novajs.min.js"></script>
```
