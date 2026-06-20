# `nova(config)`

> 入口函数。声明响应式数据 + funcs，扫描 document 绑定指令，返回 proxy。

## 签名

```js
nova({ data?, funcs? }) → Proxy
```

## 参数

### `config.data`（可选）

普通 JS 对象。**任何字段都会变成响应式**。

```js
nova({
  data: {
    count: 0,
    user: { name: 'alice' },        // 嵌套对象自动响应
    devices: [1, 2, 3],             // 数组自动响应
    get activeCount () {            // getter 是计算属性
      return this.devices.filter(d => d.active).length
    }
  }
})
```

### `config.funcs`（可选）

方法集合。`this` 自动绑定到 data proxy。

```js
nova({
  data: { count: 0 },
  funcs: {
    increment () { this.count++ },
    async load () {
      this.items = await nova.http.get('/api/x')
    },
    save: nova.debounce(async function () {
      await nova.http.put('/api/save', this)
    }, 400)
  }
})
```

## 返回值

data proxy——一个 Proxy 对象，**所有读写都自动追踪依赖**。

```js
const data = nova({ data: { count: 0 } })

data.count           // 读：触发 track
data.count = 1       // 写：触发 trigger + DOM 更新
data.user.name = 'x' // 嵌套对象也是 Proxy
```

## 行为细节

### 单例

第二次调用 `nova(config)` 返回**同一个 proxy**：

```js
const a = nova({ data: { x: 0 } })
const b = nova({ data: { x: 99 } })
a === b   // true
```

**第二次传的 config 整个被忽略**（但不会报错，方便测试或 HMR 时重置）。

### 自动扫描 document

调用 `nova()` 时**立即扫描 `document.body`**，绑定所有 `{{ }}` / `model` / `if` / `loop` 等。

如果脚本在 `<head>` 里加载，DOMContentLoaded 时再扫一次（捕获动态插入的元素）。

### funcs 的不可枚举性

funcs 不出现在 `Object.keys(data)`、`for...in`、`JSON.stringify` 里：

```js
Object.keys(data)                    // ['count', 'user', 'devices', ...]  不含 funcs
JSON.stringify(data)                 // {"count":0,"user":{...},"devices":[...]}
Object.getOwnPropertyDescriptor(data, 'increment').enumerable  // false
```

**好处**：可以直接 `JSON.stringify(data)` 存 localStorage。

### 防止误覆盖 funcs

```js
data.increment = () => {}     // ❌ 抛 TypeError（strict mode）
delete data.increment         // ❌ 抛 TypeError
```

这两个操作都过不了 Proxy 的 set/delete trap。

### `__methods__` 内部接口

```js
data.__methods__  // { increment: function, ... }
```

内部接口，给 `loop` 子作用域拷贝 funcs 用。**不要在业务代码里用**。

## 完整示例

```js
// 完整定义一个 IoT 设备控制 app
const data = nova({
  data: {
    device: { id: 'light-1', name: '客厅灯' },
    power: false,
    busy: false,
    error: ''
  },
  funcs: {
    async toggle () {
      if (this.busy) return
      this.busy = true
      this.error = ''
      try {
        await nova.http.post('/api/device/' + this.device.id + '/toggle')
        this.power = !this.power
      } catch (e) {
        this.error = e.message
      } finally {
        this.busy = false
      }
    }
  }
})
```

## 接下来

- [`data.$watch`](./watch)
- [`nova.http`](./http)
- [工具函数](./utils)