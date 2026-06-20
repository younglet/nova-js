# 数据同步 API

> `nova.poll()` — 轮询 / `nova.resource()` — CRUD / `nova.update()` — 手动刷新

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

## nova.resource(url, ns?)

CRUD 接口，自动拉取列表，乐观更新 + 失败回滚。

```js
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

### 乐观更新

`_create`、`_update`、`_delete` 先改本地 UI 再发 HTTP，失败自动回滚。同步中的项会带 `_pending: true`。

### 方法

| 方法 | 说明 |
|---|---|
| `_fetch()` | 拉取列表 |
| `_create(body)` | 乐观添加 |
| `_update(id, body)` | 乐观更新 |
| `_delete(id)` | 乐观删除 |

---

## nova.update(ns?)

手动刷新命名空间：

```js
nova.update('sensors')   // 调 sensors._fetch()
nova.update()            // 调根级 _fetch()
```
