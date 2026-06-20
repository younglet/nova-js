# 双向绑定 `model`

> 表单元素 ↔ data 自动同步。输入触发 → data 自动更新；data 变了 → 输入框自动反映。

## 效果

<iframe src="/examples/demos/model.html" width="100%" height="340" frameborder="0" style="border-radius:8px"></iframe>

四种表单元素都支持：text 输入、checkbox 开关、select 下拉、range 滑块。
最后一行用 `JSON.stringify(...)` 把 data 状态实时显示出来。

## 代码

```html
<input type="text" model="name">
<input type="checkbox" model="power">
<select model="city">
  <option value="bj">北京</option>
</select>
<input type="range" name="brightness" min="0" max="100">  <!-- name 自动绑 -->

<script src="../src/novajs.js"></script>
<script>
  nova({
    data: {
      name: 'alice',
      power: true,
      city: 'beijing',
      brightness: 50
    }
  })
</script>
```

## 三种写法

### ① `model="字段"`（显式）

```html
<input model="username">
```

**最清楚**，一看就知道绑哪个字段。

### ② `name="字段"`（隐式，只对表单元素生效）

```html
<input name="brightness" type="range">
```

**最省事**——只要 `<input name="X">` 且 data 上有 `X`，自动双向绑定。

⚠️ **loop 内部不能用 `name` 自动绑**。在 `loop` 列表项里，每个 item 是独立的 child scope，`name` 在 item scope 里找不到字段。必须用显式 `model="d.field"`：

```html
<li loop="d in devices">
  <input model="d.name">  <!-- ✅ 用 model -->
  <!-- <input name="d.name"> 不行 -->
</li>
```

### ③ `:value` + `@input`（手动拼，最啰嗦）

```html
<input :value="name" @input="name = $event.target.value">
```

**只在你需要精细控制时用**（比如要 debounce、要 format）。

## 事件选择

novajs 自动根据元素类型选事件：

| 元素 | 监听事件 | 取值 |
|---|---|---|
| `<input type="text">` / `<input type="range">` / `<textarea>` | `input` | `el.value` |
| `<input type="checkbox">` | `change` | `el.checked`（布尔）|
| `<input type="radio">` | `change` | `el.value` |
| `<select>` | `change` | `el.value` |

写入方向相反：`checkbox` 写 `el.checked`，其余写 `el.value`。

## checkbox 的特殊行为

`model` 绑定的字段是**布尔**：

```js
nova({ data: { power: false } })
```

```html
<input type="checkbox" model="power">
```

勾选 → `data.power = true`，取消 → `data.power = false`。**不要用字符串**：

```js
// ❌ 不会正常工作
nova({ data: { power: 'false' } })

// ✅
nova({ data: { power: false } })
```

如果你想把多个 checkbox 绑到同一个数组（"已选标签"那种），手动写：

```html
<input type="checkbox" :checked="tags.includes('a')" @change="toggle('a', $event.target.checked)">
```

## select 的 v-model 等价

novajs 用 `model` 替代了 Vue 的 `v-model`，**用法完全一样**：

```html
<select model="city">
  <option value="">请选择</option>
  <option value="bj">北京</option>
  <option value="sh">上海</option>
</select>
```

`data.city = 'beijing'` 时，select 自动选中"北京"；用户切换选项，`data.city` 自动更新。

## 嵌套路径

```js
nova({ data: { user: { name: 'alice' } } })
```

```html
<input model="user.name">  <!-- ✅ 点号路径 -->
```

修改输入框 → `data.user.name` 自动更新；改 `data.user.name` → 输入框跟着变。

## radio group

novajs 没有 `radio` 专属语法，用普通 + `model` 即可：

```html
<label><input type="radio" model="theme" value="light"> 浅色</label>
<label><input type="radio" model="theme" value="dark"> 深色</label>
```

⚠️ 这种用法需要在 js 里提前给 `theme` 一个初始值（不然未选时 `theme === undefined`）。

## 细节

### 与 `with(data){}` 作用域的互动

`model` 里的字符串是 JS 表达式，在 `with(data){}` 里求值：

```html
<!-- ✅ 嵌套路径 -->
<input model="user.profile.name">

<!-- ✅ 计算路径 -->
<input model="items[0].value">

<!-- ❌ 模板字符串 -->
<input model="`user.name`">  <!-- 这是字符串字面量，不是路径 -->
```

### 何时改用 `$watch`

model 自动双向，但**只同步 `data ↔ DOM`**。如果你要在"data 改变时做副作用"（如上报、调其他方法），用 `$watch`：

```js
const data = nova({ data: { brightness: 50 } })
data.$watch('brightness', function () {
  // 拖滑块时触发（但 $watch 不防抖，自己加 debounce）
  save()
})
```

或者用防抖方法（更 IoT）：

```js
nova({ data: { brightness: 50,
  save: nova.debounce(async function () {
    await nova.http.put('/api/dim', { value: this.brightness } })
  }, 400)
})
data.$watch('brightness', () => data.save())
```

→ 完整模式见 [patterns.md](../patterns#防抖上报)

## 下一步

- [条件 if / show](./if-show) — 显隐切换
- [列表 loop](./loop) — 遍历渲染