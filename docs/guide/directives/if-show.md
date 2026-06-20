# 条件 `if` / `show`

> 两个指令都是"按条件显示"，但**底层行为不同**：一个删 DOM，一个藏 DOM。

## 效果

<iframe src="/examples/demos/if-show.html" width="100%" height="220" frameborder="0" style="border-radius:8px"></iframe>

点按钮切换 `busy`：
- **`if`**：节点从 DOM 中**移除** / 插入
- **`show`**：节点**永远在**，只是 `display: none`

按 F12 看 DOM 区别。

## 代码

```html
<button model="busy">{{ busy ? '停止' : '开始' }}</button>

<div if="busy">⏳ 通讯中…</div>
<div show="busy">📡 状态指示</div>

<script src="../src/novajs.js"></script>
<script>nova({ data: { busy: false } })</script>
```

## 怎么选

| 场景 | 推荐 | 理由 |
|---|---|---|
| 切换不频繁 + 节点内容多 | `if` | 不渲染时不占 DOM，初始化更快 |
| 频繁切换（每秒多次）| `show` | 切换只是改一个 CSS 属性，无重建开销 |
| 需要保留输入框内容 | `show` | input 的 value 不会因为 DOM 移除而丢 |
| 第一次要触发 ref / 视频播放 | `if` | show 隐藏时也会执行这些副作用 |

**简单规则**：表单 + 频繁切换 → `show`；其余大多数情况 → `if`。

## `if` 的细节

### 没有 `else` 分支

`if` 没有 `else` 分支。要写多分支，用**嵌套 `if`**：

```html
<!-- ❌ 不支持 -->
<div if="status === 'a'">A</div>
<!-- 没有 else / else-if -->

<!-- ✅ 嵌套 if -->
<div if="status === 'a'">A</div>
<div if="status === 'b'">B</div>
<div if="status !== 'a' && status !== 'b'">C</div>
```

或者用 `{{ }}` 表达式 + 三元：

```html
<span>{{ status === 'a' ? 'A' : status === 'b' ? 'B' : 'C' }}</span>
```

### `if` 表达式支持任意 JS

`if="..."` 里的字符串是 JS 表达式，在 `with(data){}` 里求值：

```html
<div if="user && user.isAdmin">管理员菜单</div>
<div if="items.length > 0">共 {{ items.length }} 项</div>
<div if="!busy && loaded">已就绪</div>
```

### 父节点的 `if` 切换时，子节点整个销毁/重建

```html
<div if="showPanel">
  <input model="name">  <!-- panel 消失时输入框也消失，再出现时是空的 -->
</div>
```

如果想保留输入框内容 → 用 `show`。

## `show` 的细节

### 底层只是改 `display`

```js
el.style.display = expr ? '' : 'none'
```

意味着 `display: flex` 这种写法会被 `show` 覆盖。要保留 flex：

```html
<div class="d-flex" style="display:flex" show="ok">...</div>
<!-- ✅ style="display:flex" 会先执行，show 把 display 改成 '' 也能恢复 -->
```

或者直接用 `:style` 控制：

```html
<div :style="{ display: ok ? 'flex' : 'none' }">...</div>
```

### 隐藏的节点还是会执行 `{{ }}` / `@event`

`show` 只是 CSS 隐藏，模板里的表达式照样运行、事件照样监听。这是好事——隐藏的 input 仍然在更新 `data`。

```html
<div show="false">
  <input model="hidden">
</div>
<!-- input 仍在同步 data.hidden，只是不可见 -->
```

## 常见误区

### ① 用 `if` 保留表单状态

```html
<!-- ❌ 切换步骤会丢失已填内容 -->
<div if="step === 1"><input model="form.name"></div>
<div if="step === 2"><input model="form.phone"></div>

<!-- ✅ 用 show -->
<div show="step === 1"><input model="form.name"></div>
<div show="step === 2"><input model="form.phone"></div>
```

### ② 在 `if` 内引用未挂载的子节点

`if` 内的子节点**在条件不满足时不存在**，不要在 JS 里 query：

```js
// ❌ busy = false 时这个元素根本不在 DOM
document.querySelector('#spinner').remove()

// ✅ 用 if/show 控制
```

### ③ `if` 表达式忘了引号

```html
<!-- ❌ if 是字符串，里面别忘了引号 -->
<div if="status == 'ok'">...</div>

<!-- 但 if 表达式本身要引号包起来 -->
<div if="status === 'ok'">...</div>
```

## 下一步

- [列表 loop](./loop) — 遍历数组
- [属性绑定 :](./bind) — 动态 class / style