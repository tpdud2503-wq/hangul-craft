/**
 * 교실 수업용 로컬 웹 서버 (외부 npm 패키지 없이 Node.js 내장 모듈만 사용)
 * - 교실 Wi-Fi에서 스마트폰이나 태블릿으로 접속할 수 있게 지원
 * - 실행: node server.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = Number(process.env.PORT) || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  let reqPath;
  try {
    reqPath = decodeURIComponent(req.url.split('?')[0]);
  } catch (_) {
    res.writeHead(400);
    res.end('Bad Request');
    return;
  }
  if (reqPath === '/__classroom_config') {
    res.writeHead(200, { 'Content-Type': MIME_TYPES['.json'], 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ joinOrigin: `http://${getLocalIp()}:${PORT}` }));
    return;
  }
  if (reqPath === '/') reqPath = '/index.html';

  const relativePath = reqPath.replace(/^[/\\]+/, '');
  const filePath = path.resolve(__dirname, relativePath);
  if (!filePath.startsWith(__dirname + path.sep) || relativePath.split(/[/\\]/).some(part => part.startsWith('.'))) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('500 Server Error: ' + err.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

function getLocalIp() {
  const nets = os.networkInterfaces();
  const names = Object.keys(nets).sort((a, b) => {
    const priority = name => /virtual|vethernet|vmware|hyper-v/i.test(name) ? 3 :
      /wi-?fi|wireless|wlan/i.test(name) ? 0 : /ethernet/i.test(name) ? 1 : 2;
    return priority(a) - priority(b);
  });
  for (const name of names) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

server.listen(PORT, () => {
  const ip = getLocalIp();
  console.log('========================================================');
  console.log('🎓 훈민정음 집현전 공방 교실 웹 서버 시작!');
  console.log(`- 교사 컴퓨터(현재 PC) 접속: http://localhost:${PORT}`);
  console.log(`- 학생 태블릿/스마트폰 접속:  http://${ip}:${PORT}`);
  console.log('========================================================');
});
