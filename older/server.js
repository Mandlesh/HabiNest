// Minimal static server for the public/ folder (no external dependencies)

const http = require('http')
const path = require('path')
const fs = require('fs')

const PORT = process.env.PORT || 5173
const PUBLIC_DIR = path.join(__dirname, 'public')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
}

function send(res, code, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(code, { 'Content-Type': type })
  res.end(body)
}

http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split('?')[0])
  let filePath = path.join(PUBLIC_DIR, urlPath)

  // Default to index.html for root or directory requests
  if (urlPath === '/' || urlPath.endsWith('/')) {
    filePath = path.join(filePath, 'index.html')
  }

  // Prevent path traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    return send(res, 400, 'Bad Request')
  }

  fs.stat(filePath, (err, stat) => {
    if (err) {
      // SPA fallback to index.html for unknown routes
      const fallback = path.join(PUBLIC_DIR, 'index.html')
      return fs.readFile(fallback, (err2, data2) => {
        if (err2) return send(res, 404, 'Not Found')
        send(res, 200, data2, MIME['.html'])
      })
    }

    if (stat.isDirectory()) {
      filePath = path.join(filePath, 'index.html')
    }

    fs.readFile(filePath, (err3, data) => {
      if (err3) return send(res, 404, 'Not Found')
      const ext = path.extname(filePath).toLowerCase()
      send(res, 200, data, MIME[ext] || 'application/octet-stream')
    })
  })
}).listen(PORT, () => {
  console.log(`HabiNest static server running at http://localhost:${PORT}`)
})
