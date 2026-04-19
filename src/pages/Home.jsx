import { useNavigate } from 'react-router-dom'
import { useLang, useT } from '../App'
import styles from './Home.module.css'

export default function Home() {
  const { setLang } = useLang()
  const t = useT()
  const navigate = useNavigate()

  // Check if AR mission was already completed
  const arDone = !!localStorage.getItem('ce_code_mission5')

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

      {/* Mission card */}
      <main className={styles.main}>
        <div
          className={styles.missionCard + (arDone ? ' ' + styles.done : '')}
          onClick={() => navigate('/mission/ar')}
          role="button"
          tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && navigate('/mission/ar')}
        >
          <div className={styles.missionBadge}>{t.ar_type}</div>
          <div className={styles.missionNum}>{t.mission_label}</div>
          <h2 className={styles.missionTitle}>{t.mission_title}</h2>
          {arDone && <div className={styles.doneTag}>✓ {t.mission_done}</div>}
          <div className={styles.missionArrow}>→</div>
        </div>
      </main>

      {/* Start CTA */}
      <footer className={styles.footer}>
        <button className="btn-primary" onClick={() => navigate('/mission/ar')}>
          {t.home_cta}
        </button>
      </footer>

    </div>
  )
}
