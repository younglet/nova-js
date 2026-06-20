---
layout: home

hero:
  name: novajs
  text: Tiny reactive kernel for ESP32.
  tagline: 9KB min · 零依赖 · 烧 MicroPython 的 ESP32 当 server 时的前端反应式内核
  actions:
    - theme: brand
      text: 5 分钟上手
      link: /guide/getting-started
    - theme: alt
      text: 看 5 个例子
      link: /examples/
    - theme: alt
      text: GitHub
      link: https://github.com/

features:
  - title: 极小
    icon: 🪶
    details: 核心 9KB minified，零依赖，零构建。引入一行 script 就让 HTML 活起来。
  - title: 简单
    icon: 🎯
    details: 裸名指令（model / if / loop），没有 ref()/reactive()，没有 mounted 钩子。声明数据 + 写模板 = 完事。
  - title: 反应式
    icon: ⚡
    details: Proxy 自动追踪依赖，模板自动重渲。改 data.xxx → DOM 自动变；输入 → data 自动写。
  - title: 物联网优先
    icon: 📡
    details: 内置 nova.http、防抖、$watch。slider 自动防抖上报、设备开关乐观更新、传感器轮询，IoT 场景全包。
  - title: 裸名指令
    icon: ✏️
    details: 6 个指令裸名（model / if / show / loop / :attr / @event），没有 v- 前缀，不撞 HTML 属性名。
  - title: 单例 + 零构建
    icon: 📦
    details: 单个 nova() 跑全局，单文件引入。不需要 Vite/Webpack/babel，浏览器开箱即用。
---

## 一段代码长啥样

```html
<script src="novajs.js"></script>

<div class="device-card">
  <div class="device-card-title">{{ device.name }}</div>
  <input model="brightness" type="range">
  <span show="busy">上报中…</span>
</div>

<script>
  nova({
    data: {
      device: { name: '客厅灯' },
      brightness: 50,
      busy: false
    },
    funcs: {
      save: nova.debounce(async function () {
        this.busy = true
        await nova.http.put('/api/dim/1', { value: this.brightness })
        this.busy = false
      }, 400)
    }
  })
</script>
```

就这样。**没有 v- 前缀、没有 ref()/reactive()、没有 el 选项**。

## 它小到什么程度

- 核心 **~5KB** minified
- 启动 / 解析 / 重渲都在毫秒级
- 1KB 内存就够跑一个 sensor-card
- 单文件引入，**不需要构建工具**

## 下一步

- [5 分钟上手](./guide/getting-started) — 跑通第一个 reactive 例子
- [指令速查](./guide/directives/text) — 6 个指令一页一个 demo
- [5 个完整案例](./examples/) — 抄一个改一改就能用