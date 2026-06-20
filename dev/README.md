# dev/ — 手动测试工具

> 这个目录是 nova-js 的**手动测试工具集**，不属于库本身。
> 单元测试在 `../test/`，覆盖率足够；这里只放需要人工操作的工具。

## 文件

| 文件 | 用途 | 启动 |
|---|---|---|
| `test-manual.html` | 浏览器手测页面，6 大类功能（基础 / 模板 / HTTP / 防抖 / 资源 / 工具） | 直接打开或经 mock server 一起用 |
| `mock-server.js` | Node 模拟 ESP32 接口，提供 `/api/sensors`、`/api/devices` CRUD | `node dev/mock-server.js` |

## 典型流程

```bash
# 终端 1：起 mock server
node dev/mock-server.js
# 听到 'Mock API running at http://0.0.0.0:5000'

# 终端 2 或浏览器：打开手测页
# Windows
start dev/test-manual.html
# macOS
open dev/test-manual.html

# 浏览器控制台输入：
nova.poll('/api/sensors', 3000, 'sensors')
nova.resource('/api/devices', 'devices')
```

## 什么时候来这里

- ✅ 加了新指令（model/if/show/loop/bind/event/…），在 `test-manual.html` 加一栏试一下
- ✅ 改了 `nova.http`，跟 mock server 联调
- ✅ 改 Proxy 行为，先看 `test-manual.html` 跟单元测试是否一致
- ❌ 普通开发不需要碰，跑 `npm test` 就行

## 不参与

- 库打包（terser 只看 `src/`）
- 文档站（VitePress 看 `docs/`）
- npm publish（如果将来要的话）
