const express = require('express')
const { createServer } = require('http')
const { Server } = require('socket.io')
const cors = require('cors')

const app = express()
app.use(cors({ origin: '*' }))
app.use(express.json())

const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
})

// ─── In-memory store ──────────────────────────────────────────────────────────
// Room: { code, adminSocketId, players: Map<socketId, Player>, status, game }
// Player: { id, name, team, score }
const rooms = new Map()

function genCode(len = 5) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code
  do {
    code = Array.from({ length: len }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('')
  } while (rooms.has(code))
  return code
}

/** Serialise a room to a plain object safe to send to clients */
function roomDTO(room) {
  return {
    code: room.code,
    status: room.status,   // 'waiting' | 'playing' | 'ended'
    game: room.game,       // null | 'vocal'
    players: [...room.players.values()]
      .map(p => ({ id: p.id, name: p.name, team: p.team, score: p.score }))
      .sort((a, b) => b.score - a.score),
  }
}

// ─── Socket events ────────────────────────────────────────────────────────────
io.on('connection', socket => {
  console.log(`[+] ${socket.id}`)

  // ── Admin: create a new room ──────────────────────────────────────────────
  socket.on('admin:create', cb => {
    const code = genCode()
    rooms.set(code, {
      code,
      adminSocketId: socket.id,
      players: new Map(),
      status: 'waiting',
      game: null,
    })
    socket.join(`room:${code}`)
    socket.data = { role: 'admin', roomCode: code }
    console.log(`[Room] Created ${code}`)
    cb?.({ ok: true, code })
  })

  // ── Admin: reconnect to an existing room ─────────────────────────────────
  socket.on('admin:rejoin', ({ code }, cb) => {
    const room = rooms.get(code)
    if (!room) return cb?.({ ok: false, error: 'Room not found' })
    room.adminSocketId = socket.id
    socket.join(`room:${code}`)
    socket.data = { role: 'admin', roomCode: code }
    cb?.({ ok: true, state: roomDTO(room) })
  })

  // ── Admin: start game ────────────────────────────────────────────────────
  socket.on('admin:start', ({ game = 'vocal' }, cb) => {
    const { roomCode } = socket.data || {}
    const room = rooms.get(roomCode)
    if (!room || room.adminSocketId !== socket.id) return cb?.({ ok: false })
    room.status = 'playing'
    room.game = game
    io.to(`room:${roomCode}`).emit('game:start', { game })
    io.to(`room:${roomCode}`).emit('room:update', roomDTO(room))
    cb?.({ ok: true })
  })

  // ── Admin: reset room ────────────────────────────────────────────────────
  socket.on('admin:reset', cb => {
    const { roomCode } = socket.data || {}
    const room = rooms.get(roomCode)
    if (!room || room.adminSocketId !== socket.id) return cb?.({ ok: false })
    room.status = 'waiting'
    room.game = null
    room.players.forEach(p => { p.score = 0 })
    io.to(`room:${roomCode}`).emit('game:reset')
    io.to(`room:${roomCode}`).emit('room:update', roomDTO(room))
    cb?.({ ok: true })
  })

  // ── Player: join room with code ──────────────────────────────────────────
  socket.on('player:join', ({ code, name, team }, cb) => {
    const upperCode = String(code).toUpperCase().trim()
    const room = rooms.get(upperCode)
    if (!room) return cb?.({ ok: false, error: 'Code invalide. Vérifie et réessaie.' })

    const player = {
      id: socket.id,
      name: String(name).trim().slice(0, 30) || 'Anonyme',
      team: String(team).trim().slice(0, 30) || 'Sans équipe',
      score: 0,
    }
    room.players.set(socket.id, player)
    socket.join(`room:${upperCode}`)
    socket.data = { role: 'player', roomCode: upperCode, playerId: socket.id }

    console.log(`[Player] ${player.name} (${player.team}) → room ${upperCode}`)
    io.to(`room:${upperCode}`).emit('room:update', roomDTO(room))

    cb?.({ ok: true, playerId: socket.id, state: roomDTO(room) })
  })

  // ── Player: submit/update score ──────────────────────────────────────────
  socket.on('player:score', ({ score }, cb) => {
    const { roomCode, playerId } = socket.data || {}
    const room = rooms.get(roomCode)
    if (!room || !playerId) return cb?.({ ok: false })
    const player = room.players.get(playerId)
    if (!player) return cb?.({ ok: false })

    player.score = Math.max(player.score, Math.round(Number(score) || 0))
    io.to(`room:${roomCode}`).emit('room:update', roomDTO(room))
    cb?.({ ok: true })
  })

  // ── Disconnect / leave ───────────────────────────────────────────────────
  socket.on('disconnect', () => {
    console.log(`[-] ${socket.id}`)
    const { role, roomCode, playerId } = socket.data || {}
    if (role === 'player' && roomCode && playerId) {
      const room = rooms.get(roomCode)
      if (room) {
        room.players.delete(playerId)
        io.to(`room:${roomCode}`).emit('room:update', roomDTO(room))
      }
    }
    // Admin disconnecting keeps the room alive so they can rejoin
  })
})

// ─── REST helpers ─────────────────────────────────────────────────────────────
app.get('/api/room/:code', (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase())
  if (!room) return res.status(404).json({ error: 'Room not found' })
  res.json(roomDTO(room))
})

app.get('/health', (_req, res) => res.json({ ok: true }))

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001
httpServer.listen(PORT, () => console.log(`\n🎤  Server listening on http://localhost:${PORT}\n`))
