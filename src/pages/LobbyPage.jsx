import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../context/GameContext'
import { socket } from '../lib/socket'
import styles from './LobbyPage.module.css'

export default function LobbyPage() {
  const { player, roomState, clearPlayer } = useGame()
  const navigate = useNavigate()

  useEffect(() => {
    if (!player) {
      navigate('/join', { replace: true })
      return
    }

    function onGameStart({ game }) {
      navigate(`/game/${game}`)
    }
    function onGameReset() {
      // Stay in lobby when admin resets
    }

    socket.on('game:start', onGameStart)
    socket.on('game:reset', onGameReset)
    return () => {
      socket.off('game:start', onGameStart)
      socket.off('game:reset', onGameReset)
    }
  }, [player, navigate])

  function handleLeave() {
    clearPlayer()
    navigate('/')
  }

  const myId = player?.playerId
  const players = roomState?.players ?? []

  return (
    <div className={styles.page}>
      {/* Top bar */}
      <div className={styles.topBar}>
        <button className={styles.leaveBtn} onClick={handleLeave}>Quitter</button>
        <div className={styles.codeBox}>
          <span className={styles.codeLabel}>Code</span>
          <span className={styles.codeValue}>{player?.roomCode}</span>
        </div>
      </div>

      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.pulseWrap}>
          <div className={styles.pulseRing} />
          <div className={styles.pulseIcon}>🎤</div>
        </div>
        <h1 className={styles.title}>En attente…</h1>
        <p className={styles.sub}>L'animateur va bientôt lancer le jeu !</p>
        <div className={styles.myTag}>
          <span className={styles.myName}>{player?.name}</span>
          <span className={styles.myTeam}>· {player?.team}</span>
        </div>
      </div>

      {/* Player list */}
      <div className={styles.playerSection}>
        <h2 className={styles.sectionTitle}>
          Joueurs connectés
          <span className={styles.count}>{players.length}</span>
        </h2>
        <div className={styles.playerList}>
          {players.length === 0 && (
            <p className={styles.empty}>Tu es le premier arrivé !</p>
          )}
          {players.map(p => (
            <div
              key={p.id}
              className={`${styles.playerRow} ${p.id === myId ? styles.me : ''}`}
            >
              <span className={styles.avatar}>{p.name.charAt(0).toUpperCase()}</span>
              <span className={styles.playerName}>{p.name}</span>
              <span className={styles.playerTeam}>{p.team}</span>
              {p.id === myId && <span className={styles.youBadge}>Toi</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
