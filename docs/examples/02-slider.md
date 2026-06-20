# 02 滑块调光

> 拖滑块调节亮度，停止 400ms 才发一次 HTTP，避免拖动时疯狂请求。

## 效果

<iframe src="/examples/02-slider.html" width="100%" height="500" frameborder="0" style="border-radius:8px"></iframe>

## 学到什么

| 指令 / API | 用法 |
|---|---|
| `name` 自动绑 | `<input type="range" name="brightness">` 自动绑 data.brightness |
| `nova.debounce` | 400ms 内多次调用只触发最后一次 |
| `data.$watch` | 监听 brightness 变化触发 save |
| `:style` 对象 | 动态生成 gradient + boxShadow |

## 核心代码

```js
const data = nova({
  data: {
    brightness: 50,
    syncing: false,
    lastSync: '--:--:--'
  },
  funcs: {
    save: nova.debounce(async function () {
      this.syncing = true
      try {
        await nova.http.put('/api/dim/' + this.light.id, { value: this.brightness })
        this.lastSync = new Date().toLocaleTimeString()
      } finally {
        this.syncing = false
      }
    }, 400)
  }
})

data.$watch('brightness', function () { data.save() })
```

## 关键模式

### ① `name` 自动绑

```html
<input type="range" name="brightness">
```

只要 input 有 `name` 属性 + data 上有同名字段，**自动双向绑**。不用写 `model="brightness"`。

> ⚠️ 在 `loop` 内失效（每个 item 是 child scope，name 自动绑找不到字段）。loop 内必须显式 `model="d.field"`。

### ② 防抖 vs 节流

```js
// 防抖：等用户停下来才触发（适合 slider）
nova.debounce(save, 400)   // 拖动结束 400ms 后才 save

// 节流：每 N ms 最多触发一次（适合滚动事件）
// novajs 没内置，自己用 setTimeout 实现
```

novajs **只有 debounce，没 throttle**——slider / search 几乎都是 debounce 场景。

### ③ `$watch` 的妙用

```js
data.$watch('brightness', function () { data.save() })
```

不是直接 `@input="data.save()"`——是因为：
- `$watch` 只在**值真正变化**时触发（重复设同一个值不会）
- 解耦了"DOM 事件"和"业务逻辑"——以后把 slider 换成旋钮，逻辑不用改

完整源码见 `examples/02-slider.html`。

## 下一步

- [03 实时传感器](./03-sensors) — 学轮询 + 错误处理