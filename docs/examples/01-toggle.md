# 01 单设备开关

> 最小的 IoT 控件：一个按钮，控制一盏灯。

## 效果

<iframe src="/examples/01-toggle.html" width="100%" height="500" frameborder="0" style="border-radius:8px"></iframe>

## 学到什么

| 指令 / API | 用法 |
|---|---|
| `model` | 按钮 disabled 状态跟 `busy` 同步 |
| `@click` | 点击调用 `toggle()` |
| `:class` | 开关颜色根据 `power` 切换 |
| `if` | 通讯中显示"⏳"提示 |
| `nova.http.post` | 发送 toggle 请求 |

## 代码骨架

```html
<button @click="toggle()"
        :disabled="busy"
        :class="power ? 'on-style' : 'off-style'">
  ⏻
</button>

<div if="busy">⏳ 通讯中…</div>

<script src="../src/novajs.js"></script>
<script>
  const data = nova({
    data: {
      device: { id: 'light-001', name: '客厅吸顶灯' },
      power: false,
      busy: false
    },
    funcs: {
      async toggle () {
        this.busy = true
        try {
          await nova.http.post('/api/device/' + this.device.id + '/toggle')
          this.power = !this.power
        } finally {
          this.busy = false
        }
      }
    }
  })
</script>
```

完整源码见 `examples/01-toggle.html`。

## 关键模式

### ① busy flag 防止重复点击

```js
funcs: {
  async toggle () {
    if (this.busy) return     // 防止网络慢时用户连点
    this.busy = true
    try {
      // ...
    } finally {
      this.busy = false       // 不管成功失败都关
    }
  }
}
```

### ② 模板里用三元表达式切 class

```html
:class="power ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'"
```

### ③ `if` 比 `show` 更合适

按钮状态切换**不频繁**（用户不会一秒点 10 次），用 `if` 移除节点更轻量；如果是 loading spinner 这种一秒切 60 次的，用 `show`。

## 下一步

- [02 滑块调光](./02-slider) — 学防抖上报