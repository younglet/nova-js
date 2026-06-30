---
title: 案例
---

# 5 个跑得通的例子

> 从单设备开关到多设备网格，覆盖 IoT 常见场景。源码在 `examples/` 目录，双击 HTML 就能跑。

## 目录

| # | 案例 | 学到什么 |
|:--:|---|---|
| 01 | [单设备开关](./01-toggle) | `model` + `@click` + HTTP toggle，最小 IoT 控件 |
| 02 | [滑块调光](./02-slider) | `name` 自动绑 + `nova.debounce` 防抖上报 |
| 03 | [实时传感器](./03-sensors) | 4 路 sensor 卡片 + 轮询 + 异常处理 |
| 04 | [设备网格](./04-grid) | `loop` 多类型设备 + 乐观更新 + 状态点 |
| 05 | [动态 class / style](./05-class-style) | `:class` 三种语法 + `:style` 对象语法 |

> 组件用 nova-ui 的 `<nova-*>` 自定义元素（开关 / 滑块 / 旋钮 / 输入掩码 / 弹窗），看 [nova-ui 文档](https://github.com/younglet/nova-ui)。

## 跑起来

```bash
# 任何静态服务器都行
cd nova-js
npx serve .
```

然后打开 `http://localhost:3000/examples/01-toggle.html`。

或者**双击 HTML 文件直接打开**——nova-js 单文件、零依赖，不需要构建工具。

## 怎么看

每个案例的源代码都做了 mock 后端（随机延迟 + 假数据），所以**完全离线能跑**。

想接真实 API？改下面这段：

```js
// 把 mock 删掉
;(function () {
  // nova.http.get = async function (url) { ... }
  // nova.http.post = async function (url, body) { ... }
})()
```

改成 fetch 到真实地址即可。

## 接下来

- [01 单设备开关](./01-toggle) — 从最简单的一个开始