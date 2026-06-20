# 03 实时传感器

> 4 路传感器（温度 / 湿度 / 光照 / 电压）每 3 秒轮询一次，掉线时自动标红。

## 效果

<iframe src="/examples/03-sensors.html" width="100%" height="620" frameborder="0" style="border-radius:8px"></iframe>

## 学到什么

| 指令 / API | 用法 |
|---|---|
| 嵌套对象 | `temp: { value, online }` 一个 sensor 一个对象 |
| `show` + `if` | 通讯状态条用 show，导航用 if |
| 轮询模式 | `setInterval(poll, 3000)` + 立即拉一次 |
| 错误处理 | HTTP 失败时把 `online` 设 false |

## 核心代码

```js
const data = nova({
  data: {
    intervalSec: 3,
    paused: false,
    online: false,
    temp:  { value: 0, online: false },
    humid: { value: 0, online: false },
    lux:   { value: 0, online: false },
    volt:  { value: 0, online: false }
  },
  funcs: {
    async poll () {
      if (this.paused) return
      try {
        const response = await nova.http.get('/api/sensors')
        this.temp  = { value: response.temp,  online: true }
        this.humid = { value: response.humid, online: true }
        this.lux   = { value: response.lux,   online: true }
        this.volt  = { value: response.volt,  online: true }
        this.online = true
        this.updatedAt = new Date().toLocaleTimeString()
      } catch (e) {
        // 网络失败 → 全部标离线
        this.temp.online  = false
        this.humid.online = false
        this.lux.online   = false
        this.volt.online  = false
        this.online = false
      }
    }
  }
})

data.poll()                                    // 立即拉一次
setInterval(function () { data.poll() }, 3000) // 每 3s 一次
```

## 关键模式

### ① 嵌套对象做"组合状态"

```js
temp: { value: 0, online: false }
```

把一个传感器的所有状态打包成对象。修改单个字段 `temp.value = 24` 触发响应，修改整个 `temp = {...}` 也触发响应。

### ② pause 标志停止轮询

```js
if (this.paused) return   // 不发请求、不改 data
```

不是 `clearInterval`——暂停后还能恢复，不用重新 `setInterval`。

### ③ 错误时单独标 `online = false`

```js
} catch (e) {
  this.temp.online = false  // 别的字段不动
}
```

`value` 保留最后一次成功的数据——UI 显示数值 + 红色"离线"标，比"清零"更友好。

完整源码见 `examples/03-live-sensors.html`。

## 下一步

- [04 设备网格](./04-grid) — 学 `loop` + 乐观更新