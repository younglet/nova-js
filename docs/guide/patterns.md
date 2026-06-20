---
title: 常用模式
---

# 常用模式

> IoT 场景的几个高频模式：防抖上报、$watch、乐观更新、HTTP 错误处理、loading state、表单验证。

## 防抖上报（slider 必备）

拖滑块时**不应该每个值都发 HTTP**。novajs 跟很多 UI 库不一样——**没有 `.lazy` / `.debounce` 修饰符**。自己包一层：

```js
nova({
  data:  { brightness: 50 },
  funcs: {
    // 写方法时顺便包防抖
    save: nova.debounce(async function () {
      await nova.http.put('/api/dim/1', { value: this.brightness })
    }, 400)
  }
})

// 监听变化触发（用 $watch）
data.$watch('brightness', function () { data.save() })
```

完整示例见 [02-slider.html](../examples/02-slider.html)。

**为什么不用 `model` 自带防抖**：
- 防抖语义因场景而异（400ms / 1000ms / 节流 vs 防抖）
- 让用户**显式写**，调试时一眼看出"哦有防抖"
- 也方便测——`data.save()` 直接调用就能测

## $watch（变化回调）

```js
const data = nova({
  data:  { count: 0, user: { name: 'alice' } },
  funcs: { onChange (newValue, oldValue) { /* ... */ } }
})

// 浅字段
data.$watch('count', data.onChange)

// 嵌套路径
data.$watch('user.name', data.onChange)

// 数组 length（push/splice 都会触发）
data.$watch('devices.length', data.onChange)
```

**回调里 `this` 不指向 data**——这是 Go 风格的 API：

```js
funcs: {
  // ✅ 用闭包变量
  onCountChange (newValue) {
    data.updateServer(newValue)
  }

  // ❌ 别期望 this = data
  // onCountChange (newValue) { this.updateServer(newValue) }
}
```

## 乐观更新（设备开关必备）

```js
nova({
  data:  { devices: [{ id: 1, on: false }] },
  funcs: {
    async toggle (device) {
      // 1. 立刻改本地状态（UI 立即响应）
      device.on = !device.on

      try {
        // 2. 发请求
        await nova.http.post('/api/device/' + device.id + '/power', { on: device.on })
      } catch (e) {
        // 3. 失败回滚
        device.on = !device.on
        console.error(e)
      }
    }
  }
})
```

**为什么**：用户点开关的延迟容忍度是 100ms，但 HTTP 请求平均 200ms。如果等服务器返回才更新 UI，按钮会有明显卡顿。

## 轮询（nova.poll）

一行搞定，自动开始，字段平铺：

```js
nova({ data: { ... } })
nova.poll('/api/sensors', 3000, 'sensors')
```

```html
<span>{{ sensors.temp }}°C</span>
<span if="sensors._loading">刷新中…</span>
<span if="sensors._error">{{ sensors._error }}</span>
```

手动控制：

```js
nova.data.sensors._stop()     // 暂停
nova.data.sensors._start()    // 恢复
nova.update('sensors')        // 立即刷新
```

## CRUD（nova.resource）

乐观更新，失败回滚：

```js
nova({ data: { ... } })
nova.resource('/api/devices', 'devices')
```

```html
<div loop="d in devices.list">
  <span :class="d._pending ? 'dim' : ''">{{ d.name }}</span>
  <button @click="devices._update(d.id, {name: d.name + '★'})">改名</button>
  <button @click="devices._delete(d.id)">删除</button>
</div>
<input model="newName">
<button @click="addDevice()">添加</button>
```

```js
funcs: {
  addDevice() {
    this.devices._create({ name: this.newName })
    this.newName = ''
  }
}
```

## 多实例 & 命名空间

```js
// 分块初始化，自动合并
nova({ data: { count: 0 } })
nova({ data: { name: 'world' } })
nova({ data: { temp: 25 } }, 'sensors')

// nova.data.count → 0
// nova.data.name → 'world'
// nova.data.sensors.temp → 25

// 多面板（各自独立 DOM 范围）
nova({ root: '#panel-a', data: { ... } })
nova({ root: '#panel-b', data: { ... } })
```

## 时间格式化

```html
{{ nova.fmt.date(ts) }}            <!-- 2026-06-20 -->
{{ nova.fmt.time(ts) }}            <!-- 14:30:45 -->
{{ nova.fmt.datetime(ts) }}        <!-- 2026-06-20 14:30:45 -->
{{ nova.fmt.time(ts, 'HH:mm') }}   <!-- 14:30 -->
```

`nova.fmt` 是全局工具，模板表达式里直接用。

## HTTP 错误处理

novajs 的 `nova.http` 在非 2xx 时**直接抛错**：

```js
try {
  const data = await nova.http.get('/api/x')
} catch (e) {
  // e.message = "HTTP 404 Not Found"
  console.error(e.message)
}
```

把错误绑到 data 上，让模板显示：

```js
nova({
  data:  { items: [], error: '' },
  funcs: {
    async load () {
      this.error = ''
      try {
        const r = await nova.http.get('/api/items')
        this.items = r
      } catch (e) {
        this.error = e.message
      }
    }
  }
})
```

```html
<button @click="load()">加载</button>
<div if="error" class="text-red-500">{{ error }}</div>
```

## Loading state

```js
funcs: {
  async save () {
    this.busy = true
    try {
      await nova.http.put('/api/x', this.form)
      this.msg = '保存成功'
    } finally {
      this.busy = false   // 不管成功失败都关
    }
  }
}
```

```html
<button @click="save()" :disabled="busy">
  {{ busy ? '保存中…' : '保存' }}
</button>
```

## 表单验证

novajs **不内置验证**——自己写，逻辑直接放 funcs 里：

```js
nova({
  data:  { form: { email: '', password: '' } },
  funcs: {
    validateEmail (value) {
      if (!value) return '必填'
      if (!/.+@.+\..+/.test(value)) return '格式不对'
      return ''
    },
    canSubmit () {
      return !this.validateEmail(this.form.email) && this.form.password.length >= 6
    }
  }
})
```

```html
<input model="form.email" :class="{ 'border-red-500': validateEmail(form.email) }">
<span class="text-red-500 text-xs">{{ validateEmail(form.email) }}</span>
<button :disabled="!canSubmit()" @click="submit()">注册</button>
```

## 表单重置

```js
const originalForm = { name: '', email: '' }

const data = nova({
  data:  { form: { ...originalForm } },
  funcs: {
    reset () { this.form = { ...originalForm } }
  }
})
```

## 多步表单

用 `show` 保留 input 内容，用变量控制当前步骤：

```html
<div show="step === 1">
  <input model="form.name">
</div>
<div show="step === 2">
  <input model="form.phone">
</div>

<button @click="step = step + 1" :disabled="step === 3">下一步</button>
```

切换 step 不会销毁 input（因为是 show 不是 if），已填的值不会丢。

## 接下来

- [FAQ](./faq) — 常见问题
- [API 文档](../api/) — 完整 JS API 参考