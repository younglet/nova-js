# `nova.http`

> 内置 HTTP 客户端。`get` / `post` / `put` / `patch` / `del` 五个方法。

## 签名

```js
nova.http.get(url, options?)
nova.http.post(url, body?, options?)
nova.http.put(url, body?, options?)
nova.http.patch(url, body?, options?)
nova.http.del(url, options?)
```

返回 `Promise`。

## 用法

```js
// GET
const data = await nova.http.get('/api/devices')
console.log(data)

// POST（自动 JSON.stringify body）
const result = await nova.http.post('/api/devices', { name: 'sensor1' })

// PUT / PATCH 类似
await nova.http.put('/api/devices/1', { value: 50 })
await nova.http.patch('/api/devices/1', { name: '新名字' })

// DELETE（无 body）
await nova.http.del('/api/devices/1')
```

## 返回值

- `Content-Type: application/json` → `res.json()`，返回对象
- 其他 → `res.text()`，返回字符串

## 错误处理

非 2xx 响应**直接抛错**：

```js
try {
  await nova.http.get('/api/missing')
} catch (e) {
  console.error(e.message)   // "HTTP 404 Not Found"
}
```

## options

| 选项 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `baseURL` | string | `''` | 拼到 url 前面 |
| `timeout` | number | — | 毫秒数，超时 Abort |
| `headers` | object | `{Content-Type: application/json}` | 合并到请求头 |

### baseURL

```js
const result = await nova.http.get('/users', { baseURL: 'https://api.example.com' })
// 实际请求：GET https://api.example.com/users
```

### timeout

```js
await nova.http.get('/api/slow', { timeout: 5000 })
// 5 秒未响应 → AbortController 触发 reject
```

### headers

```js
await nova.http.get('/api/private', {
  headers: { Authorization: 'Bearer xxx' }
})
// 请求头：Content-Type: application/json, Authorization: Bearer xxx
```

## 完整示例

### 列表 + 详情

```js
nova({
  data:  { devices: [], selectedDevice: null },
  funcs: {
    async loadDevices () {
      this.devices = await nova.http.get('/api/devices')
    },
    async loadDetail (id) {
      this.selectedDevice = await nova.http.get('/api/devices/' + id)
    },
    async create (form) {
      const newDevice = await nova.http.post('/api/devices', form)
      this.devices.push(newDevice)
    },
    async update (id, patch) {
      await nova.http.patch('/api/devices/' + id, patch)
    },
    async remove (id) {
      await nova.http.del('/api/devices/' + id)
      this.devices = this.devices.filter(d => d.id !== id)
    }
  }
})
```

### 超时 + 重试

```js
funcs: {
  async fetchWithRetry (url, attempt = 0) {
    try {
      return await nova.http.get(url, { timeout: 3000 })
    } catch (e) {
      if (attempt < 3 && /timeout|5\d\d/.test(e.message)) {
        await new Promise(function (r) { setTimeout(r, 1000 * (attempt + 1)) })
        return this.fetchWithRetry(url, attempt + 1)
      }
      throw e
    }
  }
}
```

## 拦截器 / 取消请求

novajs **没有拦截器、没取消 API**——这些在 IoT 场景用得少。要取消就用 `AbortController` 自己写：

```js
const controller = new AbortController()
setTimeout(() => controller.abort(), 5000)

fetch('/api/x', { signal: controller.signal }).then(...)
```

如果你需要拦截器（AOP 风格的 auth header、retry、logging），自己包一层：

```js
async function authGet (url, options) {
  return nova.http.get(url, {
    ...options,
    headers: { ...options && options.headers, Authorization: 'Bearer ' + getToken() }
  })
}
```

## 实现细节

- 底层是 `fetch`
- POST/PUT/PATCH 自动 `JSON.stringify(body)`
- 响应解析靠 `Content-Type` header
- AbortController 处理 timeout
- 错误带 HTTP 状态码：`Error("HTTP 404 Not Found")`

## 接下来

- [`nova()`](./nova)
- [`data.$watch`](./watch)
- [工具函数](./utils)