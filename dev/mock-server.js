// mock-server.js — 给 test-manual.html 提供测试接口
// 用法: node mock-server.js
// 然后打开 test-manual.html，fetch 换成真实接口

const http = require('http')

const HOST = '0.0.0.0'
const PORT = 5000

// 传感器数据（模拟波动）
let sensorData = { temp: 25.3, humid: 62, ts: Date.now() }

// 设备列表
let devices = [
  { id: 1, name: '客厅灯' },
  { id: 2, name: '空调' },
  { id: 3, name: '窗帘' }
]
let nextId = 4

function json(res, code, data) {
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  })
  res.end(JSON.stringify(data))
}

const server = http.createServer(function (req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') return json(res, 204, '')

  const url = new URL(req.url, 'http://' + req.headers.host)
  const path = url.pathname

  // ─── 传感器轮询 ───
  if (path === '/api/sensors') {
    // 模拟温度波动
    sensorData.temp = +(25 + Math.sin(Date.now() / 5000) * 3 + Math.random() * 0.5).toFixed(1)
    sensorData.humid = +(60 + Math.cos(Date.now() / 8000) * 10 + Math.random() * 2).toFixed(0)
    sensorData.ts = Date.now()
    return json(res, 200, sensorData)
  }

  // ─── 设备 CRUD ───
  if (path === '/api/devices') {
    if (req.method === 'GET') {
      return json(res, 200, devices)
    }
    if (req.method === 'POST') {
      let body = ''
      req.on('data', function (c) { body += c })
      req.on('end', function () {
        try {
          const item = JSON.parse(body)
          item.id = nextId++
          devices.push(item)
          json(res, 201, item)
        } catch (e) {
          json(res, 400, { error: e.message })
        }
      })
      return
    }
  }

  // PUT /api/devices/:id
  const devMatch = path.match(/^\/api\/devices\/(\d+)$/)
  if (devMatch) {
    const id = parseInt(devMatch[1])
    const idx = devices.findIndex(function (d) { return d.id === id })

    if (req.method === 'PUT') {
      if (idx < 0) return json(res, 404, { error: 'not found' })
      let body = ''
      req.on('data', function (c) { body += c })
      req.on('end', function () {
        try {
          const patch = JSON.parse(body)
          devices[idx] = Object.assign(devices[idx], patch)
          json(res, 200, devices[idx])
        } catch (e) {
          json(res, 400, { error: e.message })
        }
      })
      return
    }

    if (req.method === 'DELETE') {
      if (idx < 0) return json(res, 404, { error: 'not found' })
      devices.splice(idx, 1)
      return json(res, 200, { ok: true })
    }
  }

  json(res, 404, { error: 'not found' })
})

server.listen(PORT, HOST, function () {
  console.log('Mock API running at http://' + HOST + ':' + PORT)
  console.log('  GET  /api/sensors      — 传感器数据（温度湿度波动）')
  console.log('  GET  /api/devices      — 设备列表')
  console.log('  POST /api/devices      — 添加设备')
  console.log('  PUT  /api/devices/:id  — 更新设备')
  console.log('  DEL  /api/devices/:id  — 删除设备')
  console.log()
  console.log('打开 test-manual.html，在浏览器控制台输入:')
  console.log('  nova.poll(\'/api/sensors\', 3000, \'sensors\')')
  console.log('  nova.resource(\'/api/devices\', \'devices\')')
  console.log('  nova.update(\'sensors\')')   // 等价 sensors._fetch()
  console.log('  nova.update(\'devices\')')   // 等价 devices._fetch()
})
