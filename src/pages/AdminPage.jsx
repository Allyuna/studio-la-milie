import { useState, useEffect } from 'react'
import { useGame } from '../context/GameContext'
import styles from './AdminPage.module.css'

const MEDAL = ['🥇', '🥈', '🥉']

export default function AdminPage() {
  const {
    adminCode, roomState,
    createAdminRoom, rejoinAdmin, startGame, resetGame,
  } = useGame()

  const [view, setView]           = useState('setup')  // 'setup' | 'dashboard'
  const [rejoinInput, setRejoin]  = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [copied, setCopied]       = useState(false)

  // Auto-rejoin if we have a stored admin code
  useEffect(() => {
    if (adminCode) {
      rejoinAdmin(adminCode)
        .then(() => setView('dashboard'))
        .catch(() => {/* stored code is stale, stay on setup */})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleCreate() {
    setLoading(true)
    setError('')
    try {
      await createAdminRoom()
      setView('dashboard')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleRejoin() {
    const code = rejoinInput.trim().toUpperCase()
    if (!code) return
    setLoading(true)
    setError('')
    try {
      await rejoinAdmin(code)
      setView('dashboard')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(adminCode ?? '')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {/* ignore */}
  }

  const players   = roomState?.players ?? []
  const isPlaying = roomState?.status === 'playing'

  // ── Setup screen ──────────────────────────────────────────────────────────
  if (view === 'setup') {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.icon}>🎛️</div>
          <h1 className={styles.title}>Admin</h1>
          <p className={styles.sub}>Créer ou reprendre une session</p>

          <button className={styles.btn} onClick={handleCreate} disabled={loading}>
            + Créer une nouvelle partie
          </button>

          <div className={styles.divider}><span>ou rejoindre</span></div>

          <div className={styles.rejoinRow}>
            <input
              className={styles.input}
              placeholder="Code existant"
              value={rejoinInput}
              maxLength={6}
              onChange={e => setRejoin(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleRejoin()}
            />
            <button className={styles.btnSecondary} onClick={handleRejoin} disabled={loading}>
              Rejoindre
            </button>
          </div>

          {error && <p className={styles.error}>{error}</p>}
        </div>
      </div>
    )
  }

  // ── Dashboard screen ──────────────────────────────────────────────────────
  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.codeBlock}>
          <span className={styles.codeLabel}>Code de la partie</span>
          <button className={styles.codeValue} onClick={copyCode} title="Copier">
            {adminCode}
            <span className={styles.copyHint}>{copied ? '✓ Copié' : '⎘ Copier'}</span>
          </button>
        </div>
        <div className={`${styles.statusBadge} ${isPlaying ? styles.playing : styles.waiting}`}>
          {isPlaying ? '● En jeu' : '○ Attente'}
        </div>
      </div>

      {/* Controls */}
      <div className={styles.controls}>
        {!isPlaying ? (
          <button
            className={styles.startBtn}
            onClick={() => startGame('vocal')}
            disabled={players.length === 0}
          >
            🎤 Lancer — L'Échauffement de Freddie
          </button>
        ) : (
          <button className={styles.resetBtn} onClick={resetGame}>
            ↺ Réinitialiser les scores
          </button>
        )}
        <p className={styles.hint}>
          {players.length === 0
            ? 'En attente des joueurs…'
            : `${players.length} joueur${players.length > 1 ? 's' : ''} connecté${players.length > 1 ? 's' : ''}`}
        </p>
      </div>

      {/* Scoreboard */}
      <div className={styles.scoreboard}>
        <h2 className={styles.scoreTitle}>Classement en direct</h2>

        {players.length === 0 ? (
          <div className={styles.emptyBoard}>
            <p>Aucun joueur pour l'instant</p>
            <p className={styles.emptyHint}>
              Partagez le code <strong>{adminCode}</strong> pour que les joueurs rejoignent !
            </p>
          </div>
        ) : (
          <div className={styles.scoreList}>
            {players.map((p, i) => (
              <div
                key={p.id}
                className={`${styles.scoreRow} ${i === 0 ? styles.gold : i === 1 ? styles.silver : i === 2 ? styles.bronze : ''}`}
              >
                <span className={styles.rankIcon}>{MEDAL[i] ?? `#${i + 1}`}</span>
                <div className={styles.playerInfo}>
                  <span className={styles.pName}>{p.name}</span>
                  <span className={styles.pTeam}>{p.team}</span>
                </div>
                <span className={styles.pScore}>{p.score} <small>pts</small></span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
