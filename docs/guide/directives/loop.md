# 列表 `loop`

> 按数组渲染一组元素。改数组（push/splice/整体替换）→ 列表自动重渲。

## 效果

<iframe src="/examples/demos/loop.html" width="100%" height="380" frameborder="0" style="border-radius:8px"></iframe>

试试：
- 在输入框敲回车 → 添加设备
- 点"全关" → 批量改状态
- 点单个按钮 → flip 那一项

## 代码

```html
<ul>
  <li loop="d in devices">
    <span>{{ d.icon }}</span>
    <span>{{ d.name }}</span>
    <button @click="flip(d)">{{ d.on ? '开' : '关' }}</button>
  </li>
</ul>

<script src="../src/novajs.js"></script>
<script>
  nova({
    data: {
      devices: [
        { icon: '💡', name: '客厅灯', on: true },
        { icon: '🌀', name: '风扇',   on: false }
      ]
    },
    funcs: {
      flip (d) { d.on = !d.on }
    }
  })
</script>
```

## 语法

```html
loop="item in list"
loop="(item, index) in list"
```

第二个 `index` 从 `0` 开始：

```html
<li loop="(d, i) in devices">
  {{ i + 1 }}. {{ d.name }}
</li>
<!-- 输出：1. 客厅灯 / 2. 风扇 -->
```

## 关键事实

### ① 改数组 → 自动重渲

```js
nova({ data: { devices: [{ name: 'A' }] } })

devices.push({ name: 'B' })      // ✅ 触发 length 变化 → 加一行
devices.splice(0, 1)             // ✅ 触发 length 变化 → 删一行
devices[0].name = 'X'            // ✅ 触发 item 字段变化 → 那一行更新
devices = []                     // ✅ 整体替换 → 全删
```

### ② 不做节点复用（简单但够用）

novajs **每次改 list 都重建整个列表**。不依赖 `:key` 做 diff。

```html
<!-- 不写 :key 也能工作 -->
<li loop="d in devices">{{ d.name }}</li>

<!-- 写了 :key 也不报错（属性会设到节点上） -->
<li loop="d in devices" :key="d.id">{{ d.name }}</li>
```

代价：列表很大（>1000 项）+ 频繁更新 → 会卡。**对 IoT 设备列表（通常 < 50 项）完全够用**。

### ③ 子作用域是 child scope

```html
<li loop="d in devices">
  {{ d.name }}    <!-- ✅ 通过 d 访问 -->
  {{ name }}      <!-- ❌ name 不在 item scope 里，会查到 data.name -->
</li>
```

`name` 不会 undefined，它会查到 `data.name`（如果有的话）。要避免混淆，**item 名要够独特**：

```js
// ❌ 用 devices 当 item 名会和外层冲突
nova({ data: { devices: [...] }, funcs: { showDevices () {...} } })

// ✅ 用 dev / d / item 等短名
nova({ data: { devices: [...] }, funcs: { showDevices () {...} } })
<li loop="dev in devices">
```

### ④ `name` 自动绑定在 loop 内失效

```html
<!-- ❌ 在 loop 里 name 自动绑找不到字段 -->
<li loop="d in devices">
  <input name="brightness">  <!-- brightness 在 d 里还是外层 data 里？模糊 -->
</li>

<!-- ✅ 必须用 model + 完整路径 -->
<li loop="d in devices">
  <input model="d.brightness">
</li>
```

### ⑤ 嵌套 loop

```html
<div loop="grp in groups">
  <h3>{{ grp.name }}</h3>
  <div loop="d in grp.items">
    {{ d.name }}
  </div>
</div>
```

数据：
```js
nova({
  data: {
    groups: [
      { name: '客厅', items: [{ name: '灯' }, { name: '空调' }] },
      { name: '卧室', items: [{ name: '灯' }] }
    ]
  }
})
```

## 触发更新的方式

| 操作 | 触发？ | 备注 |
|---|---|---|
| `arr.push(x)` | ✅ | length 变 |
| `arr.splice(i, n)` | ✅ | length 变 |
| `arr.sort()` / `.reverse()` | ✅ | length 不变但 Proxy 触发 |
| `arr[0] = x` | ✅ | length + 0 下标都触发 |
| `arr.length = 0` | ✅ | length 变 |
| `arr = newArr` | ✅ | 整个数组字段重设 |

⚠️ 修改**未在 data 里声明**的属性 → 不会触发响应式：

```js
nova({ data: { devices: [] } })

// ❌ devices 已经有，所以 ok
data.devices.push(...)

// 但如果你这样：
nova({ data: {} })
data.devices = [...]  // ✅ ok，因为 devices 现在是 data 字段
```

## 性能提示

### 列表大小

- < 50 项：随便用
- 50-500 项：注意**避免高频更新**（每秒改多次）
- > 500 项：考虑分页 / 虚拟滚动 / 用 `<table>` + 局部 loop

### 高频更新的替代

如果数据来自 WebSocket / 轮询，**别在 loop 内逐项更新**，整体替换：

```js
// ❌ 慢：每条 WebSocket 消息触发一次整个列表重建
ws.onmessage = (e) => {
  const update = JSON.parse(e.data)
  const item = data.devices.find(d => d.id === update.id)
  item.value = update.value
}

// ✅ 快：批量更新用局部路径
ws.onmessage = (e) => {
  const update = JSON.parse(e.data)
  data['dev_' + update.id] = update.value  // 单字段更新，不重建列表
}
```

## 常见错误

### ❌ 忘了用 `loop` 而是复制粘贴

```html
<!-- ❌ 不会自动重复 -->
<li>{{ devices[0].name }}</li>
<li>{{ devices[1].name }}</li>

<!-- ✅ -->
<li loop="d in devices">{{ d.name }}</li>
```

### ❌ loop 内的事件 handler 写法

```html
<!-- ✅ 传 item 进去 -->
<button @click="flip(d)">flip</button>
<button @click="setPower(d, true)">开</button>

<!-- ❌ 闭包捕获容易踩坑 -->
<button @click="d.on = !d.on">flip</button>  <!-- 也行但是单行 -->
```

## 下一步

- [属性绑定 :](./bind) — 动态 class / style
- [事件 @](./event) — 事件处理细节