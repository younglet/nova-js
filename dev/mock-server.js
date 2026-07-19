// mock-server.js — 给 test-manual.html 提供测试接口
// 用法: node mock-server.js
// 然后打开 test-manual.html，fetch 换成真实接口

const http = require('http')

const HOST = '0.0.0.0'
const PORT = 5000

// 传感器数据（模拟波动）
let sensorData = { temp: 25.3, humid: 62, ts: Date.now() }
let msg = 'hello'

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
  if (req.method === 'OPTIONS') return json(res, 204, '')

  const url = new URL(req.url, 'http://' + req.headers.host)
  const path = url.pathname

  // ─── 传感器轮询 ───
  if (path === '/api/sensors') {
    sensorData.temp = +(25 + Math.sin(Date.now() / 5000) * 3 + Math.random() * 0.5).toFixed(1)
    sensorData.humid = +(60 + Math.cos(Date.now() / 8000) * 10 + Math.random() * 2).toFixed(0)
    sensorData.ts = Date.now()
    return json(res, 200, sensorData)
  }

  // ─── 单值 API ───
  if (path === '/api/msg') {
    if (req.method === 'GET') {
      return json(res, 200, msg)
    }
    let body = ''
    req.on('data', function (c) { body += c })
    req.on('end', function () {
      try {
        if (req.method === 'POST' || req.method === 'PUT') {
          msg = JSON.parse(body)
          return json(res, req.method === 'POST' ? 201 : 200, msg)
        }
        if (req.method === 'DELETE') {
          msg = ''
          return json(res, 200, '')
        }
        json(res, 405, { error: 'method not allowed' })
      } catch (e) {
        json(res, 400, { error: e.message })
      }
    })
    return
  }

  json(res, 404, { error: 'not found' })
})

server.listen(PORT, HOST, function () {
  console.log('Mock API running at http://' + HOST + ':' + PORT)
  console.log('  GET  /api/sensors      — 传感器数据')
  console.log('  GET/POST/PUT/DEL /api/msg — 单值 API')
  console.log()
  console.log('打开 test-manual.html，在浏览器控制台输入:')
  console.log('  nova.poll(\'/api/sensors\', 3000, \'sensors\')')
  console.log('  nova.api(\'/api/msg\', \'msg\')')
  console.log('  nova.update(\'sensors\')')
  console.log('  nova.update(\'msg\')')
})
