import { useNavigate } from 'react-router-dom'
import { useLang, useT } from '../App'
import styles from './Home.module.css'

export default function Home() {
  const { setLang } = useLang()
  const t = useT()
  const navigate = useNavigate()

  const missions = [
    {
      badge: t.ar_type,
      label: t.mission_label,
      title: t.mission_title,
      href:  '/ar.html',
    },
    {
      badge: t.draw_badge,
      label: t.draw_label,
      title: t.draw_title,
      href:  '/draw.html',
    },
    {
      badge: t.quiz_badge,
      label: t.quiz_label,
      title: t.quiz_title,
      href:  '/quiz.html',
    },
  ]

  function goTo(href) {
    // Hard navigate so the page always reloads fresh (resets all progress)
    window.location.href = href
  }

  return (
    <div className={styles.page}>

      {/* Language toggle */}
      <button
        className={styles.langBtn}
        onClick={() => setLang(prev => prev === 'fr' ? 'en' : 'fr')}
        aria-label="Switch language"
      >
        {t.lang_btn}
      </button>

      {/* Hero */}
      <header className={styles.hero}>
        <div className={styles.logoWrap}>
          <img src="/logo.jpg" alt="Studio La Milie" className={styles.logo} />
        </div>
        <h1 className={styles.title + ' grad-text'}>{t.home_title}</h1>
        <p className={styles.sub}>{t.home_sub}</p>
        <p className={styles.desc}>{t.home_desc}</p>
      </header>

      {/* Mission cards */}
      <main className={styles.main}>
        {missions.map((m, i) => (
          <div
            key={i}
            className={styles.missionCard}
            onClick={() => goTo(m.href)}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && goTo(m.href)}
          >
            <div className={styles.missionBadge}>{m.badge}</div>
            <div className={styles.missionNum}>{m.label}</div>
            <h2 className={styles.missionTitle}>{m.title}</h2>
            <div className={styles.missionArrow}>→</div>
          </div>
        ))}
      </main>

    </div>
  )
}
