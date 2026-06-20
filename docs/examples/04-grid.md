# 04 设备网格

> 多种类型的设备（开关 / 调光 / 传感器）放在一个网格里，统一管理。

## 效果

<iframe src="/examples/04-device-grid.html" width="100%" height="700" frameborder="0" style="border-radius:8px"></iframe>

## 学到什么

| 指令 / API | 用法 |
|---|---|
| `loop` | 遍历 `devices` 数组 |
| `if` 多分支 | `if="d.type === 'switch'"` / `'dimmer'` / `'sensor'` |
| 派生 getter | `onCount` 自动响应 devices 变化 |
| 乐观更新 | 点开关立刻改本地，HTTP 失败回滚 |
| 防抖 + 调光 | 滑块拖动 300ms 才上报 |

## 核心代码

```js
const data = nova({
  data: {
    devices: [
      { id: 1, icon: '💡', name: '客厅灯', type: 'switch', on: false },
      { id: 2, icon: '🌀', name: '风扇',   type: 'dimmer', value: 50 },
      { id: 3, icon: '🌡', name: '温度',   type: 'sensor', value: 0, online: false }
    ]
  },
  funcs: {
    get onCount () {
      return this.devices.filter(d => d.on === true).length
    },

    async setPower (device, on) {
      device.on = on                       // 1. 立刻改本地
      try {
        await nova.http.post('/api/device/' + device.id + '/power', { on: on })
      } catch (e) {
        device.on = !on                   // 2. 失败回滚
      }
    },

    setDim: nova.debounce(function (device, val) {
      device.value = +val
      nova.http.put('/api/device/' + device.id + '/dim', { value: +val })
    }, 300)
  }
})
```

模板用 `loop` + `if` 多分支：

```html
<div loop="d in devices" class="card">
  <div if="d.type === 'switch'">
    <button @click="setPower(d, true)">开</button>
    <button @click="setPower(d, false)">关</button>
  </div>
  <div if="d.type === 'dimmer'">
    <input type="range" :value="d.value"
           @input="setDim(d, $event.target.value)">
  </div>
  <div if="d.type === 'sensor'">
    {{ d.online ? d.value.toFixed(1) : '--' }}
  </div>
</div>
```

## 关键模式

### ① `loop` + `if` 多分支（不要写 3 个独立 loop）

```html
<!-- ❌ 写 3 个 loop，每个过滤一种 type -->
<div loop="d in switches">...</div>
<div loop="d in dimmers">...</div>
<div loop="d in sensors">...</div>

<!-- ✅ 一个 loop + 3 个 if，更简单，DOM 更少 -->
<div loop="d in devices">
  <div if="d.type === 'switch'">...</div>
  <div if="d.type === 'dimmer'">...</div>
  <div if="d.type === 'sensor'">...</div>
</div>
```

### ② 乐观更新

```js
async setPower (device, on) {
  device.on = on                  // 1. 立刻改
  try {
    await nova.http.post('/api/...')
  } catch (e) {
    device.on = !on              // 2. 失败回滚
  }
}
```

按按钮的延迟容忍度 100ms，HTTP 普遍 200ms。**等服务器返回才更新 UI**会明显卡。

### ③ 派生数量用 getter

```js
get onCount () {
  return this.devices.filter(d => d.on === true).length
}
```

```html
<span>{{ onCount }} 台设备开启</span>
```

`onCount` 自动响应 `devices` 变化——加一个设备，`onCount` 自动重算，模板自动重渲。

### ④ 防抖 vs 不防抖

开关型设备（toggle）**不需要防抖**——用户一次只点一次。
调光型设备（slider）**必须防抖**——拖动期间可能改几十次值。

完整源码见 `examples/04-device-grid.html`。

## 下一步

- [05 动态 class / style](./05-class-style) — 纯 UI 演示