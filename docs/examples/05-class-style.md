# 05 动态 class / style

> 10 个 demo 展示 `:class` 三种语法 + `:style` 对象 / 字符串。

## 效果

<iframe src="/examples/05-class-style.html" width="100%" height="900" frameborder="0" style="border-radius:8px"></iframe>

## 学到什么

| 场景 | 语法 |
|---|---|
| 对象语法 | `:class="{ on: power, warn: error }"` |
| 数组语法 | `:class="['base', power ? 'on' : 'off']"` |
| 数组 + 对象混合 | `:class="['base', { on: power }]"` |
| 字符串 | `:class="statusText"` |
| style 对象 | `:style="{ width: w + '%', background: color }"` |
| style 字符串 | `:style="'width: ' + w + '%; background: red'"` |
| 与静态合并 | `class="..." :class="..."` 两者都生效 |

## 核心代码

```html
<!-- 对象语法：键是 class 名，值是布尔 -->
<div :class="{ on: power, off: !power, warn: error }">

<!-- 数组语法：字符串 + 条件 -->
<div :class="['base', power ? 'on' : 'off', warn ? 'warn' : '']">

<!-- 数组里嵌对象 -->
<div :class="['base', { on: power, warn: error }]">

<!-- 字符串 -->
<div :class="statusText">  <!-- "on warn" -->
```

```js
// statusText 是 data 里的 getter
get statusText () {
  const t = []
  if (this.on) t.push('on')
  if (this.warn) t.push('warn')
  if (!this.on && !this.warn) t.push('off')
  return t.join(' ')
}
```

## 关键模式

### ① 三种语法怎么选

| 场景 | 推荐 |
|---|---|
| 简单开 / 关切换 | 对象语法 |
| 多个 class 拼条件 | 数组语法 |
| 基础 class + 动态切换 | 数组 + 对象混合 |
| 整个 class 字符串已经算好 | 字符串语法 |

### ② 与静态 `class` 合并（不覆盖）

```html
<div class="device-card" :class="{ 'device-card-on': device.on }">
```

- `device.on = true`  → `class="device-card device-card-on"`
- `device.on = false` → `class="device-card"`

静态 `class` **保留**，动态 `:class` **叠加**——不会互相覆盖。

### ③ `:style` 对象 vs 字符串

```html
<!-- 对象：推荐 -->
<div :style="{
  width: brightness + '%',
  background: 'radial-gradient(...)',
  opacity: 0.3 + brightness / 130
}">

<!-- 字符串：动态拼接整段 -->
<div :style="'width: ' + brightness + '%; background: ' + color">
```

对象语法**值是 `null` / `undefined` 会移除该 CSS 属性**——可以做条件样式：

```js
data: { shadow: null }   // 无阴影
```

```html
<div :style="{ boxShadow: shadow }">
  <!-- null 时不设置 box-shadow -->
</div>
```

### ④ 布尔属性的特殊处理

```html
<button :disabled="busy">
```

| `busy` | 结果 |
|---|---|
| `true` | `<button disabled>` |
| `false` / `null` / `undefined` | `<button>`（属性被移除）|

完整源码见 `examples/05-class-style.html`。

## 全部例子跑完啦

- [01 单设备开关](./01-toggle) ✅
- [02 滑块调光](./02-slider) ✅
- [03 实时传感器](./03-sensors) ✅
- [04 设备网格](./04-grid) ✅
- [05 动态 class / style](./05-class-style) ✅

回到 [案例总览](./)。