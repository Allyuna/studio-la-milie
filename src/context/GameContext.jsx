import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { socket } from '../lib/socket'

const GameContext = createContext(null)

const PLAYER_KEY = 'slm_player'   // { name, team, roomCode, playerId }
const ADMIN_KEY  = 'slm_admin'    // roomCode string

export function GameProvider({ children }) {
  const [player, setPlayerState]   = useState(() => {
    try { return JSON.parse(localStorage.getItem(PLAYER_KEY)) } catch { return null }
  })
  const [adminCode, setAdminCodeState] = useState(
    () => localStorage.getItem(ADMIN_KEY) ?? null
  )
  const [roomState, setRoomState] = useState(null)

  // Keep global room:update listener alive for the whole session
  useEffect(() => {
    socket.on('room:update', setRoomState)
    return () => socket.off('room:update', setRoomState)
  }, [])

  // ── Helpers ──────────────────────────────────────────────────────────────
  function savePlayer(data) {
    setPlayerState(data)
    localStorage.setItem(PLAYER_KEY, JSON.stringify(data))
  }

  function clearPlayer() {
    setPlayerState(null)
    localStorage.removeItem(PLAYER_KEY)
    socket.disconnect()
  }

  function saveAdminCode(code) {
    setAdminCodeState(code)
    localStorage.setItem(ADMIN_KEY, code)
  }

  // ── Player actions ───────────────────────────────────────────────────────
  function joinRoom({ code, name, team }) {
    if (!socket.connected) socket.connect()
    return new Promise((resolve, reject) => {
      socket.emit('player:join', { code, name, team }, res => {
        if (res.ok) {
          savePlayer({ name, team, roomCode: res.state.code, playerId: res.playerId })
          setRoomState(res.state)
          resolve(res)
        } else {
          reject(new Error(res.error ?? 'Erreur de connexion'))
        }
      })
    })
  }

  function submitScore(score) {
    socket.emit('player:score', { score })
  }

  // ── Admin actions ────────────────────────────────────────────────────────
  function createAdminRoom() {
    if (!socket.connected) socket.connect()
    return new Promise((resolve, reject) => {
      socket.emit('admin:create', res => {
        if (res.ok) { saveAdminCode(res.code); resolve(res.code) }
        else reject(new Error('Impossible de créer la partie'))
      })
    })
  }

  function rejoinAdmin(code) {
    if (!socket.connected) socket.connect()
    return new Promise((resolve, reject) => {
      socket.emit('admin:rejoin', { code }, res => {
        if (res.ok) { setRoomState(res.state); resolve(res.state) }
        else reject(new Error(res.error ?? 'Room introuvable'))
      })
    })
  }

  function startGame(game = 'vocal') {
    socket.emit('admin:start', { game })
  }

  function resetGame() {
    socket.emit('admin:reset')
  }

  return (
    <GameContext.Provider value={{
      player, roomState, adminCode,
      joinRoom, submitScore, clearPlayer,
      createAdminRoom, rejoinAdmin, startGame, resetGame,
    }}>
      {children}
    </GameContext.Provider>
  )
}

export function useGame() {
  return useContext(GameContext)
}
