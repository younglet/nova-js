# `nova(config, ns?)`

> 入口函数。声明响应式数据 + funcs，扫描 DOM 绑定指令，返回 proxy。

## 签名

```js
nova({ data?, funcs?, root? }, ns?) → Proxy
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
    }
  }
})
```

### `config.root`（可选）

限定 DOM 扫描范围：

```js
nova({ root: '#panel-a', data: { ... } })
```

### `ns`（可选）

命名空间，用于合并模式。`nova({ data: { x: 1 } }, 'ns')` 存入 `nova.data.ns.x`。

## 返回值

data proxy——所有读写都自动追踪依赖。

```js
const data = nova({ data: { count: 0 } })

data.count           // 读：触发 track
data.count = 1       // 写：触发 trigger + DOM 更新
```

## 多实例 & 合并

多次调用 `nova()` **不会覆盖**，而是合并到同一个实例：

```js
nova({ data: { count: 0 } })
nova({ data: { name: 'world' } })
// nova.data 同时有 count 和 name

nova({ data: { temp: 25 } }, 'sensors')
// nova.data.sensors.temp = 25
```

`nova.data` 永远指向当前实例。

## 行为细节

### 自动扫描 DOM

调用 `nova()` 时**立即扫描 `document.body`**（或 `config.root`），绑定所有 `{{ }}` / `model` / `if` / `loop` 等。

### funcs 不可枚举

不出现在 `Object.keys(data)`、`for...in`、`JSON.stringify` 里。

### 防误覆盖

```js
data.increment = () => {}     // ❌ 第一次调用时抛 warn
delete data.increment         // ❌ 同上
```

## 完整示例

```js
// 分块初始化
nova({ data: { count: 0, name: 'world' } })

// 挂载同步
nova.poll('/api/sensors', 3000, 'sensors')
nova.resource('/api/devices', 'devices')

// 追加 funcs
nova({
  funcs: {
    toggle() { this.count++ }
  }
})
```
