# AGENTS.md — nova-js

> 给 AI 助手的项目指南。读这个文件就能上手这个项目。

## 一句话

**nova-js** 是一个 9KB 的反应式内核（Proxy + 模板指令），给 IoT 设备页面用。

## 目标平台

烧了 **MicroPython 的 ESP32** 当 HTTP server，把前端三件套（novajs.js + nova-style.css + nova-ui-elements.js）dump 到 flash 里，手机连上 WiFi 就能访问。

所以所有设计都围绕：

| 约束 | 体现 |
|---|---|
| 小 | 单文件 18KB 源码 / 9KB min |
| 快 | Proxy 追踪 + microtask 批量更新 |
| 精简 | 6 个指令，没 JSX、没虚拟 DOM、没生命周期 |
| IoT 场景 | 内置 `nova.http` 防呆调用、`debounce` 防滑块抖动 |

**不是** SPA 框架，不做大型工程。

## 跑通

```bash
cd nova-js
npm install                          # 安装 terser + vitepress
npm run build                        # src/novajs.js → src/novajs.min.js
npm test                             # 84 个测试
npm run docs:dev                     # 起 docs 站点（vitepress）
```

测试用 jsdom + vm.createContext（不是直接 require）：

```js
// test/helper.js 把脚本加载到隔离 VM context
const ctx = vm.createContext({ document, console, ... })
vm.runInContext(NOVA_JS_SOURCE, ctx)
vm.runInContext(NOVA_UI_SOURCE, ctx)
```

写新测试时模仿 `test/01-reactive.test.js` 的 setup()。

## 关键文件

```
nova-js/
├── AGENTS.md              ← 你正在看的
├── SPEC.md                ← 设计规格（API、原则、非目标）
├── README.md              ← 用户向
├── package.json           ← 三个脚本：build / docs:dev / test
├── src/
│   ├── novajs.js          ← 核心（一个文件所有逻辑）
│   └── novajs.min.js      ← terser 压缩产物，发布用
├── test/                  ← 只测反应式（HTTP/防抖/directive 都测）
│   ├── 01-reactive.test.js   Proxy / 嵌套响应 / 数组
│   ├── 02-template.test.js   指令（model/if/show/loop/bind/event）
│   ├── 03-http.test.js       nova.http 五个方法
│   └── 04-integration.test.js 真实场景（开关/轮询/乐观更新）
├── examples/
│   ├── 01-toggle.html      单设备开关
│   ├── 02-slider.html      滑块调光（防抖）
│   ├── 03-live-sensors.html 4 路传感器轮询
│   ├── 04-device-grid.html 多设备网格
│   ├── 05-class-style.html 动态 class / style
│   └── demos/              6 个指令的最小 demo
└── docs/                  ← VitePress 站点（中文）
```

## 核心约定

### 1. 指令是裸名，**没有 v- 前缀**

```html
<!-- ✅ 正确 -->
<input model="power">
<div if="count > 10">...</div>
<li loop="d in devices">...</li>

<!-- ❌ 错误 -->
<input v-model="power">
<div v-if="...">
```

### 2. `nova({data, funcs})` 是入口

```js
nova({
  data:  { count: 0, devices: [] },        // 响应式数据
  funcs: { increment () { this.count++ } } // 方法，this → proxy
})
```

- `data` 字段自动 Proxy
- `funcs` 不可枚举（`Object.keys(data)` 看不到）
- funcs 不能被赋值/删除（Proxy trap 阻止）

### 3. 表达式在 `with(data){}` 作用域

模板里 `{{ count }}` 等价 `data.count`。`@click="inc()"` 等价 `data.inc()`。

**禁止**在 funcs 里用 `data` / `funcs` / `methods` / `state` 当局部变量名，会撞 with-scope。

### 4. microtask 调度

```js
data.count = 1
data.count = 2
data.count = 3
// 同一个 tick 内只触发一次 DOM 更新
```

底层是 `Promise.resolve().then(flush)`。所有 effect 入队后批量执行。

### 5. `walk()` 跳过自定义元素

`walk()` 在 `processElement` 时跳过 `tagName` 含连字符的元素（自定义元素），避免误把它们当普通 DOM 处理。

如果加了新指令，要在这里加分支：见 `src/novajs.js` 的 `processElement`。

### 6. 测试要更新 nova-ui 时

nova-ui 测试在 `nova-frontend/nova-ui/test/`，**不在这里**。修改 nova-ui 时去那里跑测试。

## 改动会影响什么

| 改这个 | 也会影响 |
|---|---|
| `src/novajs.js` | 所有指令行为、所有 examples、所有 docs |
| 加新指令 | `processElement` + 新测试 + docs `guide/directives/` |
| 改 Proxy 行为 | 所有 84 个测试都可能挂 |
| 改 walk() | 自定义元素 / with-nova-ui demo 都受影响 |
| 改 `nova()` 签名 | API breaking，所有 examples 都要改 |

## 提交前 checklist

```bash
npm run build   # terser 不报错
npm test        # 84/84 ✅
```

如果有界面改动：

```bash
npm run docs:build   # VitePress 构建不报错
```

## 不要做的事

- ❌ 加 v- 前缀（已废弃，文档明确写了）
- ❌ 加组件（属于 nova-ui）
- ❌ 加 CSS（属于 nova-style）
- ❌ 加 chart（属于 nova-chart）
- ❌ 引入 Vue / React / 任何大型依赖
- ❌ 拆成多个文件（保持单文件 9KB）

## 调试技巧

```js
// 测试里 dump 当前 data 状态
console.log('data:', JSON.stringify(data))

// 看 effect 是否触发
data.$watch('count', (n, o) => console.log('count:', o, '->', n))

// 强制 flush
await ctx.tick()  // 等待 microtask

// 看 effect 队列
queue.size  // 模块变量，没暴露，要从源码里临时打印
```