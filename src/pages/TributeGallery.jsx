import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import styles from './TributeGallery.module.css'

export default function TributeGallery() {
  const [tributes, setTributes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('tributes')
        .select('id, name, message, photo_url, created_at')
        .eq('is_public', true)
        .order('created_at', { ascending: true })
      setTributes(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.spinner} />
      </div>
    )
  }

  if (tributes.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.logoWrap}>
          <img src="/logo.jpg" alt="Studio La Milie" className={styles.logo} />
        </div>
        <h1 className={`${styles.pageTitle} grad-text`}>Pour Emilie</h1>
        <div className={`${styles.emptyCard} glass-card`}>
          <div className={styles.emptyHeart}>♥</div>
          <p className={styles.emptyText}>Les messages arrivent bientôt...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.logoWrap}>
          <img src="/logo.jpg" alt="Studio La Milie" className={styles.logo} />
        </div>
        <h1 className={`${styles.pageTitle} grad-text`}>Pour Emilie</h1>
        <p className={styles.subtitle}>
          {tributes.length} message{tributes.length > 1 ? 's' : ''} du cœur
        </p>
      </header>

      <div className={styles.grid}>
        {tributes.map(t => (
          <div key={t.id} className={`${styles.card} glass-card`}>
            {t.photo_url && (
              <img src={t.photo_url} alt="" className={styles.cardPhoto} />
            )}
            <div className={styles.cardBody}>
              <p className={styles.cardMessage}>{t.message}</p>
              <span className={styles.cardName}>— {t.name}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
