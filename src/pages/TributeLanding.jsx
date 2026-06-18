import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import styles from './TributeLanding.module.css'

const REVIEW_URL =
  'https://www.google.com/search?q=STUDIO+LA+MILIE+Avis&ludocid=190647908297517686&sei=XXsyarC1JcHpi-gP4tLo6As#lrd=0x0:0x2a55143333eaa76,3,,,'

export default function TributeLanding() {
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [status, setStatus] = useState('idle') // idle | submitting | success | error
  const [errorMsg, setErrorMsg] = useState('')
  const fileRef = useRef(null)

  function handlePhoto(e) {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 8 * 1024 * 1024) {
      setErrorMsg('La photo ne doit pas dépasser 8 Mo.')
      return
    }
    setPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
    setErrorMsg('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim() || !message.trim()) return
    setStatus('submitting')
    setErrorMsg('')

    try {
      let photo_url = null

      if (photo) {
        const ext = photo.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('tribute-photos')
          .upload(fileName, photo)
        if (uploadError) throw uploadError
        const { data } = supabase.storage.from('tribute-photos').getPublicUrl(fileName)
        photo_url = data.publicUrl
      }

      const { error } = await supabase
        .from('tributes')
        .insert({ name: name.trim(), message: message.trim(), photo_url })
      if (error) throw error

      setStatus('success')
    } catch {
      setErrorMsg('Une erreur est survenue. Veuillez réessayer.')
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className={styles.page}>
        <div className={`${styles.successCard} glass-card`}>
          <div className={styles.heart}>♥</div>
          <h2 className={`${styles.successTitle} grad-text`}>Merci !</h2>
          <p className={styles.successText}>
            Votre message a bien été transmis. Emilie va être touchée.
          </p>
          <div className={styles.divider} />
          <p className={styles.reviewPrompt}>
            Si vous avez aimé cette soirée, un avis Google nous aiderait énormément !
          </p>
          <a
            href={REVIEW_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={`${styles.reviewBtn} btn-primary`}
          >
            Laisser un avis Google
          </a>
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
        <h1 className={`${styles.title} grad-text`}>Mission Bonus</h1>
      </header>

      <div className={`${styles.messageCard} glass-card`}>
        <p className={styles.para}>
          Un grand bravo ! Vous avez réussi la mission ! Toute l'équipe du Studio La Milie
          vous félicite chaleureusement. Si vous êtes élève, merci pour cette belle saison
          sportive.
        </p>
        <p className={`${styles.para} ${styles.highlight}`}>
          Une dernière mission vous attend&nbsp;: laissez un petit mot pour notre Emilie.
          Elle n'est pas au courant — nous rassemblons vos messages en secret pour elle.
          Souvenirs, moments forts, réussites, pensées du cœur... tout est le bienvenu&nbsp;!
        </p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.field}>
          <label className={styles.label}>Votre prénom *</label>
          <input
            className={styles.input}
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ex : Sophie"
            maxLength={60}
            required
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Votre message pour Emilie *</label>
          <textarea
            className={`${styles.input} ${styles.textarea}`}
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Un souvenir, une réussite, un mot du cœur..."
            maxLength={800}
            rows={5}
            required
          />
          <span className={styles.charCount}>{message.length} / 800</span>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Une photo (facultatif)</label>
          <button
            type="button"
            className={styles.photoBtn}
            onClick={() => fileRef.current?.click()}
          >
            {photoPreview ? 'Changer la photo' : '+ Ajouter une photo'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handlePhoto}
            style={{ display: 'none' }}
          />
          {photoPreview && (
            <div className={styles.previewWrap}>
              <img src={photoPreview} className={styles.preview} alt="Aperçu" />
              <button
                type="button"
                className={styles.removePhoto}
                onClick={() => { setPhoto(null); setPhotoPreview(null) }}
                aria-label="Supprimer la photo"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {errorMsg && <p className={styles.error}>{errorMsg}</p>}

        <button
          type="submit"
          className={`${styles.submitBtn} btn-primary`}
          disabled={status === 'submitting' || !name.trim() || !message.trim()}
        >
          {status === 'submitting' ? 'Envoi en cours...' : 'Envoyer mon message'}
        </button>
      </form>
    </div>
  )
}
