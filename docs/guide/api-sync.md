# 数据同步 API

> `nova.poll()` — 轮询 / `nova.api()` — API 绑定 / `nova.update()` — 手动刷新

## nova.poll(url, interval, ns?)

轮询接口，自动开始，服务端字段平铺到命名空间。

```js
nova.poll('/api/sensors', 3000, 'sensors')
```

```html
<!-- 服务端返回 { temp: 25, humid: 60 }，直接可用 -->
<span>{{ sensors.temp }}°C</span>
<span>{{ sensors.humid }}%</span>

<!-- 内部字段 _ 前缀 -->
<span if="sensors._loading">刷新中…</span>
<span if="sensors._error">{{ sensors._error }}</span>
```

### 手动控制

```js
nova.data.sensors._stop()   // 暂停轮询
nova.data.sensors._start()  // 恢复
nova.data.sensors._fetch()  // 立即拉取一次
nova.update('sensors')      // 等价上行
```

### 内部字段

| 字段 | 说明 |
|---|---|
| `_loading` | 请求中 |
| `_error` | 错误信息 |
| `_fetch()` | 手动拉取 |
| `_start()` | 开始轮询 |
| `_stop()` | 停止轮询 |

---

## nova.api(url, ns?)

绑定一个 REST 接口到命名空间，提供 `get` / `post` / `put` / `delete` 方法，数据存在 `value` 里。

```js
nova.api('/api/msg', 'msg')
```

```html
<p>{{ msg.value }}</p>
<input model="v">
<button @click="msg.post(v)">POST</button>
<button @click="msg.put(v)">PUT</button>
<button @click="msg.delete()">DELETE</button>
```

### 方法

| 方法 | HTTP | 说明 |
|---|---|---|
| `get()` | GET | 拉取数据，存到 `value` |
| `post(body)` | POST | 创建/发送数据 |
| `put(body)` | PUT | 更新数据 |
| `delete()` | DELETE | 删除/清空数据 |

### 内部字段

| 字段 | 说明 |
|---|---|
| `value` | GET 获取的数据 |
| `_loading` | 请求中 |
| `_error` | 错误信息 |

---

## nova.update(ns?)

手动刷新命名空间：

```js
nova.update('sensors')   // 调 sensors.get()
nova.update()            // 调根级 get()
```
