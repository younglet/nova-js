# 部署到 ESP32 + MicroPython server

> 把 novajs + 你的页面写进 ESP32 flash，手机连 WiFi 就能访问。
> 完整流程：烧 MicroPython 固件 → 写 server.py → dump 前端文件 → 浏览器访问。

## 0. 前提

| 硬件 | 说明 |
|---|---|
| ESP32 开发板 | WROOM-32 / WROVER / S3 都行，**至少 4MB flash** |
| USB 数据线 | 一定要数据线，不是只充电的 |
| 浏览器 | **Chrome / Edge / Opera**（Safari / Firefox 没有 Web Serial） |

## 1. 烧 MicroPython 固件

```bash
# 一次性：装 esptool
pip install esptool

# 擦 flash（警告：会清空 ESP32 上所有数据）
esptool.py --chip esp32 --port /dev/ttyUSB0 erase_flash

# 烧 MicroPython 1.20+ 固件
# 从 https://micropython.org/download/esp32/ 下载 .bin
esptool.py --chip esp32 --port /dev/ttyUSB0 \
  --baud 460800 write_flash -z 0x1000 esp32-20230426-v1.20.0.bin
```

Windows 上 `/dev/ttyUSB0` 换成 `COM3`（设备管理器看具体端口）。

## 2. 写 MicroPython HTTP server

最简版（够 novajs + 静态文件用）：

```python
# main.py — 写到 ESP32 根目录
import network, socket, os

# 起 AP 模式（手机连这个 WiFi）
ap = network.WLAN(network.AP_IF)
ap.active(True)
ap.config(essid='ESP32-nova', password='12345678')
print('AP IP:', ap.ifconfig()[0])

# 文件 MIME 映射
MIME = {
    '.html': 'text/html', '.js': 'application/javascript',
    '.css': 'text/css', '.svg': 'image/svg+xml',
    '.png': 'image/png', '.json': 'application/json',
    '': 'application/octet-stream'
}

def send_file(conn, path):
    if path == '/': path = '/static/index.novajs.html'
    try:
        with open(path, 'rb') as f:
            data = f.read()
        ext = os.path.splitext(path)[1]
        conn.send('HTTP/1.1 200 OK\r\nContent-Type: ' + MIME.get(ext, 'text/plain') +
                  '\r\nContent-Length: ' + str(len(data)) + '\r\nConnection: close\r\n\r\n')
        conn.send(data)
    except OSError:
        conn.send('HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n')
    conn.close()

# 起 socket server
s = socket.socket()
s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
s.bind(('0.0.0.0', 80))
s.listen(5)
while True:
    conn, _ = s.accept()
    req = conn.recv(1024).decode()
    path = req.split(' ')[1] if ' ' in req else '/'
    print('GET', path)
    send_file(conn, path)
```

把这段保存成 `main.py`，用 `mpremote` 或 Thonny 传到 ESP32：

```bash
mpremote connect /dev/ttyUSB0 fs cp main.py :main.py
mpremote connect /dev/ttyUSB0 reset
```

## 3. 用浏览器一键写前端文件

最省事的办法 — 文档站里的"下载到 ESP32"按钮（见各页面顶部 iframe）。

也可以手动：

1. 启一个静态文件服务：
   ```bash
   cd nova-js
   python3 -m http.server 8000 --directory src
   ```
2. 浏览器打开 `http://localhost:8000/examples/04-flasher.html`（如有）或自己写一个调用 `ESP32Serial` 的页面
3. 点"连接 ESP32" → 选串口 → 自动写 `/static/novajs.min.js` + `/static/index.novajs.html`

## 4. 验证

1. 手机连 ESP32 的 WiFi（`ESP32-nova` / 密码 `12345678`）
2. 浏览器打开 `http://192.168.4.1/`（AP 默认 IP）
3. 应该看到你的页面

## 5. 文件结构（ESP32 flash 上）

```
/                          ← MicroPython 系统区
├── boot.py                ← 启动脚本（可选）
├── main.py                ← 你的 HTTP server
└── static/                ← 静态文件（前端三件套）
    ├── index.novajs.html  ← 入口 HTML（注意前缀）
    ├── novajs.min.js      ← 13 KB
    └── (其他资源)
```

> 同一块 ESP32 烧多个项目（novajs + nova-ui + nova-chart）时，HTML 用 `index.<name>.html` 前缀区分，互不覆盖。

## 6. 调试

| 现象 | 原因 | 修法 |
|---|---|---|
| 手机连不上 WiFi | AP 没起 | 看 main.py 是不是跑了，看串口输出 |
| 浏览器访问 404 | 文件没写到 /static/ | 重跑 3 步 |
| 页面 CSS/JS 加载 404 | 路径错 | 入口 HTML 里 `<link>` / `<script>` 用相对路径 |
| 手机能连但页面打不开 | 浏览器自动重定向到 no-internet 页 | 弹窗选"保持连接"或访问 `http://192.168.4.1/nosignal` |
| 想看设备 IP | AP 模式默认 192.168.4.1 | 改 `ap.ifconfig()` 输出 |

## 7. 升级到 STA 模式（连家里 WiFi）

```python
# main.py 里加：
sta = network.WLAN(network.STA_IF)
sta.active(True)
sta.connect('your-home-wifi', 'password')
while not sta.isconnected():
    import time; time.sleep(0.5)
print('STA IP:', sta.ifconfig()[0])
```

之后手机/电脑和 ESP32 在同一 WiFi 下，浏览器开 `http://<sta-ip>/` 即可。

## 8. 用 esptool.py（备选）

不想用 Web Serial 的话，直接用 mpremote / rshell 写文件：

```bash
# mpremote
mpremote connect /dev/ttyUSB0 fs cp src/novajs.min.js :static/novajs.min.js

# 整个目录
mpremote connect /dev/ttyUSB0 fs cp -r src/ :static/
```

或者用 Thonny / uPyCraft IDE 的 GUI 文件管理器手动拖。
