import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../context/GameContext'
import styles from './JoinPage.module.css'

export default function JoinPage() {
  const { joinRoom } = useGame()
  const navigate = useNavigate()
  const [form, setForm] = useState({ code: '', name: '', team: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const { code, name, team } = form
    if (!code.trim() || !name.trim() || !team.trim()) {
      setError('Tous les champs sont requis.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await joinRoom({ code: code.toUpperCase().trim(), name, team })
      // If game already in progress, go straight to it
      if (res.state?.status === 'playing' && res.state?.game) {
        navigate(`/game/${res.state.game}`)
      } else {
        navigate('/lobby')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <button className={styles.back} onClick={() => navigate('/')}>← Retour</button>

      <div className={styles.card}>
        <div className={styles.icon}>🎤</div>
        <h1 className={styles.title}>Rejoindre la partie</h1>
        <p className={styles.sub}>Entre le code donné par l'animateur</p>

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <div className={styles.field}>
            <label htmlFor="code">Code de la partie</label>
            <input
              id="code"
              className={`${styles.input} ${styles.codeInput}`}
              type="text"
              placeholder="EX: AB3K7"
              maxLength={6}
              autoCapitalize="characters"
              autoComplete="off"
              value={form.code}
              onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="name">Ton prénom</label>
            <input
              id="name"
              className={styles.input}
              type="text"
              placeholder="Freddie"
              maxLength={30}
              autoComplete="off"
              value={form.name}
              onChange={set('name')}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="team">Nom de ton équipe</label>
            <input
              id="team"
              className={styles.input}
              type="text"
              placeholder="Queen"
              maxLength={30}
              autoComplete="off"
              value={form.team}
              onChange={set('team')}
            />
          </div>

          {error && <p className={styles.error} role="alert">{error}</p>}

          <button className={styles.btn} type="submit" disabled={loading}>
            {loading ? 'Connexion…' : 'Rejoindre →'}
          </button>
        </form>
      </div>
    </div>
  )
}
