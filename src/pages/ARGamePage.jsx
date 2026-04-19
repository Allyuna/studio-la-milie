import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useLang, useT } from '../App'
import styles from './ARGamePage.module.css'

export default function ARGamePage() {
  const { lang, setLang } = useLang()
  const t = useT()
  const navigate = useNavigate()
  const [done, setDone] = useState(false)

  // Check localStorage on mount (returned from ar.html)
  useEffect(() => {
    if (localStorage.getItem('ce_code_mission5')) {
      setDone(true)
    }
  }, [])

  // Also check when URL has ?status=complete
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('status') === 'complete' || localStorage.getItem('ce_code_mission5')) {
      setDone(true)
    }
  }, [])

  function launchAR() {
    window.location.href = '/ar.html'
  }

  return (
    <div className={styles.page}>

      {/* Header */}
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => navigate('/')}>
          {t.back}
        </button>
        <button
          className={styles.langBtn}
          onClick={() => setLang(prev => prev === 'fr' ? 'en' : 'fr')}
        >
          {t.lang_btn}
        </button>
      </div>

      {/* Progress indicator */}
      <div className={styles.progress}>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: '33%' }} />
        </div>
        <span className={styles.progressLabel}>{t.mission_label}</span>
      </div>

      {/* Mission card */}
      <main className={styles.main}>
        <div className={styles.badge}>{t.ar_type}</div>
        <h1 className={styles.title}>{t.mission_title}</h1>

        {/* AR preview frame */}
        <div className={styles.arFrame}>
          <div className={styles.arFrameCorner + ' ' + styles.tl} />
          <div className={styles.arFrameCorner + ' ' + styles.tr} />
          <div className={styles.arFrameCorner + ' ' + styles.bl} />
          <div className={styles.arFrameCorner + ' ' + styles.br} />
          <div className={styles.arIcon}>📷</div>
          <div className={styles.arHint}>AR</div>
        </div>

        <p className={styles.desc}>{t.mission_desc}</p>

        {/* Clue hint */}
        <div className={styles.hint + ' glass-card'}>
          <span className={styles.hintIcon}>💡</span>
          <span className={styles.hintText}>
            {lang === 'fr'
              ? 'Cherchez le logo Studio La Milie affiché dans la salle'
              : 'Look for the Studio La Milie logo displayed in the venue'}
          </span>
        </div>

        {/* State: done or launch */}
        {done ? (
          <div className={styles.doneBox}>
            <div className={styles.doneCheck}>✓</div>
            <h2 className={styles.doneTitle}>{t.mission_done}</h2>
            <p className={styles.doneSub}>{t.mission_done_sub}</p>
            <button className="btn-primary" onClick={() => navigate('/')}>
              {t.mission_next}
            </button>
          </div>
        ) : (
          <button className={styles.launchBtn} onClick={launchAR}>
            {t.mission_cta}
          </button>
        )}
      </main>
    </div>
  )
}
