# 属性绑定 `:attr`

> 把 data 里的值绑到 HTML 属性。`:src`、`:class`、`:style`、`:disabled`、`:href`……都可以。

## 效果

<iframe src="/examples/demos/bind.html" width="100%" height="440" frameborder="0" style="border-radius:8px"></iframe>

试试拖滑块改颜色、宽度、透明度——上方色块实时变。
温度数值改 badge 颜色（`{ warn: ... }` 语法），checkbox 控制 power badge。

## 代码

```html
<!-- 基础属性 -->
<img :src="user.avatar" :alt="user.name">
<a :href="'/devices/' + d.id">查看</a>
<button :disabled="busy">保存</button>

<!-- :class 三种语法 -->
<div :class="{ on: power, off: !power }">
<div :class="['base', power ? 'on' : 'off']">
<div :class="statusText">   <!-- "on warn" -->

<!-- :style 对象 / 字符串 -->
<div :style="{ width: w + '%', background: color }">
<div :style="'width: ' + w + '%'">
```

## `:class` 三种语法

### ① 对象语法（最常用）

```html
<div :class="{ active: power, disabled: !power, warn: hasError }">
```

键是 class 名，值是 truthy/falsy。

### ② 数组语法

```html
<div :class="['base', power ? 'on' : 'off', warn ? 'warn' : '']">
```

支持条件字符串，也支持嵌套对象：

```html
<div :class="['base', { active: power, disabled: !power }]">
```

### ③ 字符串语法

```html
<div :class="statusText">  <!-- statusText = 'on warn' -->
```

最直接，但通常用对象/数组更灵活。

### 与静态 class 合并

模板里的静态 `class` 和动态 `:class` **会叠加**：

```html
<div class="device-card" :class="{ 'device-card-on': d.on }">
```

```js
// d.on = true → class="device-card device-card-on"
// d.on = false → class="device-card"
```

**叠加而不覆盖**，所以可以放心加静态 class。

### `null` / `false` / `undefined` 视为空

```js
nova({ data: { extra: null, flag: false } })
```

```html
<div :class="extra">  <!-- 不加任何 class -->
<div :class="flag ? 'on' : ''">  <!-- 同上 -->
```

## `:style` 两种语法

### ① 对象语法（推荐）

```html
<div :style="{
  width: brightness + '%',
  background: color,
  opacity: 0.3 + brightness / 130,
  boxShadow: '0 0 ' + brightness/3 + 'px #fbbf24'
}">
```

值是 `null` / `undefined` → 该 CSS 属性被移除：

```js
nova({ data: { shadow: null } })
```

```html
<div :style="{ boxShadow: shadow }">  <!-- 不设置 box-shadow -->
```

### ② 字符串语法

```html
<div :style="'width: ' + brightness + '%; background: ' + color">
```

适合简单场景 / 动态拼接整段样式。

### 与静态 style 合并

静态 `style="..."` 和动态 `:style="{...}"` 合并，**同名属性 :style 覆盖**：

```html
<div style="padding: 20px; border: 2px solid #cbd5e1;"
     :style="{ borderColor: on ? '#10b981' : '#ef4444',
                background: on ? '#ecfdf5' : '#fef2f2' }">
```

CSS 变量写法：

```html
<div :style="{ '--brightness': brightness + '%' }">
  <!-- 用 CSS 引用 var(--brightness) 做径向渐变等 -->
</div>
```

## 布尔属性

novajs 按 HTML 标准处理布尔属性：

| `:xxx` 值 | 行为 |
|---|---|
| `true` | 加属性（无值）|
| `false` / `null` / `undefined` | **移除**属性 |
| 字符串 | 加属性，值 = 字符串 |

```js
nova({ data: { busy: true, disabled: false, label: '保存' } })
```

```html
<button :disabled="busy">{{ label }}</button>
<!-- busy=true  → <button disabled>保存</button>
     busy=false → <button>保存</button> -->
```

### 常见布尔属性

`disabled` / `checked` / `selected` / `readonly` / `required` / `hidden` / `autofocus` / `multiple` / `open`...

## 其他属性

### `:href` / `:src` / `:alt`

```html
<a :href="'/devices/' + d.id">查看 {{ d.name }}</a>
<img :src="device.avatar" :alt="device.name">
```

### `:data-*`

```html
<div :data-id="device.id" :data-room="device.room">
```

### `:title`

```html
<span :title="errMsg">{{ shortMsg }}</span>
```

## 细节

### `:xxx` vs `{{ }}` 的区别

| | `:xxx` | `{{ }}` |
|---|---|---|
| 作用 | 改元素**属性** | 改元素**文本内容** |
| 例子 | `:src="url"` | `{{ url }}` |
| 触发 | 表达式变化 → 重设属性 | 表达式变化 → 重设 textContent |

不要混：
```html
<!-- ❌ 想动态 src 写成了 {{ }} -->
<img src="{{ url }}">

<!-- ✅ -->
<img :src="url">
```

### 不要绑到 `id` / `class` 字符串拼接

```html
<!-- ❌ 重复绑定 class 字符串 -->
<div :class="'base ' + (active ? 'on' : 'off')">
<!-- 跟静态 class 合并会失效（会被 :class 整个覆盖掉基础 class） -->

<!-- ✅ 用数组语法 -->
<div class="base" :class="{ on: active, off: !active }">
```

### 不要绑 `style` 字符串到 :class

```html
<!-- ❌ -->
<div :class="'color: red'">

<!-- ✅ -->
<div :style="{ color: 'red' }">
```

## 下一步

- [事件 @](./event) — 事件处理
- [patterns](../patterns) — 防抖、$watch、HTTP 实战