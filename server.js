const http = require('http'), fs = require('fs'), path = require('path');
const { WebSocketServer } = require('ws');
const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || '';          // đặt biến môi trường này để bật quyền quản trị
const PUB = path.join(__dirname, 'public');

// ===== Đọc & kiểm tra levels.json: lỗi sẽ báo rõ ràng ngay khi khởi động =====
function loadLevels() {
  let L;
  try { L = JSON.parse(fs.readFileSync(path.join(__dirname, 'levels.json'), 'utf8')); }
  catch (e) { throw new Error('levels.json sai cú pháp JSON: ' + e.message); }
  if (!Array.isArray(L) || !L.length) throw new Error('levels.json phải là một danh sách có ít nhất 1 màn');
  L.forEach((lv, i) => {
    const at = 'Màn #' + (i + 1) + ': ';
    ['title', 'imageA', 'imageB'].forEach(k => { if (typeof lv[k] !== 'string' || !lv[k]) throw new Error(at + 'thiếu "' + k + '"'); });
    ['width', 'height'].forEach(k => { if (!(lv[k] > 0)) throw new Error(at + '"' + k + '" phải là số dương'); });
    ['imageA', 'imageB'].forEach(k => { if (!fs.existsSync(path.join(PUB, lv[k]))) throw new Error(at + 'không tìm thấy file public/' + lv[k]); });
    if (!Array.isArray(lv.diffs) || !lv.diffs.length) throw new Error(at + '"diffs" phải có ít nhất 1 điểm');
    lv.diffs.forEach((d, j) => { if (![d.x, d.y, d.r].every(Number.isFinite) || d.r <= 0) throw new Error(at + 'điểm #' + (j + 1) + ' cần x, y, r là số (r > 0)'); });
  });
  return L;
}
const LEVELS = loadLevels();

// ===== Phục vụ file tĩnh trong public/ (chống truy cập ngoài thư mục) =====
const TYPES = { '.html': 'text/html; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.css': 'text/css', '.js': 'text/javascript' };
const server = http.createServer((req, res) => {
  let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { res.writeHead(400); return res.end(); }
  if (p === '/health') return res.end('ok');
  if (p === '/') p = '/index.html';
  const file = path.join(PUB, path.normalize(p));
  if (!file.startsWith(PUB + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Không tìm thấy'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  });
});

// ===== Phòng chơi =====
const wss = new WebSocketServer({ server });
const rooms = new Map();   // roomId -> { players:Map, found:{}, level:0 }
const getRoom = id => { if (!rooms.has(id)) rooms.set(id, { players: new Map(), found: {}, level: 0 }); return rooms.get(id); };

function state(room) {
  const lv = LEVELS[room.level];
  return { t: 'state',
    level: { index: room.level, count: LEVELS.length, title: lv.title, imageA: lv.imageA, imageB: lv.imageB,
             width: lv.width, height: lv.height, total: lv.diffs.length },   // KHÔNG gửi toạ độ đáp án
    found: room.found,
    players: [...room.players].map(([pid, p]) => ({ pid, name: p.name, score: p.score })).sort((a, b) => b.score - a.score) };
}
function broadcast(room) {
  const msg = JSON.stringify(state(room));
  room.players.forEach(p => p.ws.readyState === 1 && p.ws.send(msg));
}
const done = room => Object.keys(room.found).length === LEVELS[room.level].diffs.length;

wss.on('connection', (ws, req) => {
  const u = new URL(req.url, 'http://x');
  const roomId = (u.searchParams.get('r') || 'main').slice(0, 30);
  const room = getRoom(roomId);
  const pid = Math.random().toString(36).slice(2, 10);
  let isAdmin = false;
  ws.isAlive = true; ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', raw => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (m.t === 'join') {
      isAdmin = !!ADMIN_KEY && m.key === ADMIN_KEY;
      room.players.set(pid, { name: String(m.name || '').trim().slice(0, 20) || 'Ẩn danh', ws, score: 0 });
      ws.send(JSON.stringify({ t: 'hello', pid, admin: isAdmin }));
      return broadcast(room);
    }
    const me = room.players.get(pid); if (!me) return;
    const lv = LEVELS[room.level];
    if (m.t === 'click') {
      const x = +m.x, y = +m.y;
      const hit = lv.diffs.findIndex((d, i) => !room.found[i] && Math.hypot(x - d.x, y - d.y) <= d.r);
      if (hit >= 0) {
        const d = lv.diffs[hit];
        room.found[hit] = { pid, name: me.name, x: d.x, y: d.y, r: d.r }; me.score++;
        ws.send(JSON.stringify({ t: 'hit' })); broadcast(room);
      } else ws.send(JSON.stringify({ t: lv.diffs.some((d, i) => room.found[i] && Math.hypot(x - d.x, y - d.y) <= d.r) ? 'dup' : 'miss' }));
    }
    if (m.t === 'next' && done(room)) { room.level = (room.level + 1) % LEVELS.length; room.found = {}; broadcast(room); }
    if (m.t === 'admin' && isAdmin) {
      if (m.op === 'level' && Number.isInteger(m.index) && LEVELS[m.index]) { room.level = m.index; room.found = {}; }
      if (m.op === 'scores') room.players.forEach(p => { p.score = 0; });
      if (m.op === 'restart') room.found = {};
      broadcast(room);
    }
  });
  ws.on('close', () => { room.players.delete(pid); room.players.size ? broadcast(room) : rooms.delete(roomId); });
});
setInterval(() => wss.clients.forEach(ws => { if (!ws.isAlive) return ws.terminate(); ws.isAlive = false; ws.ping(); }), 30000);

server.listen(PORT, () => console.log('Game chạy tại cổng ' + PORT + ' – ' + LEVELS.length + ' màn' + (ADMIN_KEY ? ' – quản trị: BẬT' : '')));
