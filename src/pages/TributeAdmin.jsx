import { useEffect, useState } from 'react'
import JSZip from 'jszip'
import { supabaseAdmin } from '../lib/supabase'
import styles from './TributeAdmin.module.css'

const PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD ?? 'lamilie2026'

export default function TributeAdmin() {
  const [authed, setAuthed] = useState(
    () => sessionStorage.getItem('tribute_admin') === '1'
  )
  const [input, setInput] = useState('')
  const [wrongPw, setWrongPw] = useState(false)

  const [tributes, setTributes] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [zipping, setZipping] = useState(false)

  function login(e) {
    e.preventDefault()
    if (input === PASSWORD) {
      sessionStorage.setItem('tribute_admin', '1')
      setAuthed(true)
      setWrongPw(false)
    } else {
      setWrongPw(true)
    }
  }

  useEffect(() => {
    if (!authed) return
    async function load() {
      const { data } = await supabaseAdmin
        .from('tributes')
        .select('*')
        .order('created_at', { ascending: false })
      setTributes(data ?? [])
      setLoading(false)
    }
    load()
  }, [authed])

  async function togglePublic(tribute) {
    setSaving(tribute.id)
    const { error } = await supabaseAdmin
      .from('tributes')
      .update({ is_public: !tribute.is_public })
      .eq('id', tribute.id)
    if (!error) {
      setTributes(prev =>
        prev.map(t => t.id === tribute.id ? { ...t, is_public: !t.is_public } : t)
      )
    }
    setSaving(null)
  }

  async function publishAll() {
    setSaving('all')
    const { error } = await supabaseAdmin
      .from('tributes')
      .update({ is_public: true })
      .eq('is_public', false)
    if (!error) {
      setTributes(prev => prev.map(t => ({ ...t, is_public: true })))
    }
    setSaving(null)
  }

  async function deleteTribute(id) {
    setSaving(id)
    const { error } = await supabaseAdmin
      .from('tributes')
      .delete()
      .eq('id', id)
    if (!error) {
      setTributes(prev => prev.filter(t => t.id !== id))
    }
    setSaving(null)
    setConfirmDelete(null)
  }

  function exportJSON() {
    const data = tributes.map(t => ({
      nom: t.name,
      message: t.message,
      photo: t.photo_url ?? '',
      date: new Date(t.created_at).toLocaleString('fr-FR'),
    }))
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'messages-emilie.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  function exportCSV() {
    const rows = [
      ['Nom', 'Message', 'Photo', 'Date'],
      ...tributes.map(t => [
        `"${t.name.replace(/"/g, '""')}"`,
        `"${t.message.replace(/"/g, '""')}"`,
        t.photo_url ?? '',
        new Date(t.created_at).toLocaleString('fr-FR'),
      ]),
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'messages-emilie.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function downloadPhotos() {
    const withPhotos = tributes.filter(t => t.photo_url)
    if (withPhotos.length === 0) return
    setZipping(true)
    const zip = new JSZip()
    await Promise.all(
      withPhotos.map(async (t, i) => {
        try {
          const res = await fetch(t.photo_url)
          const blob = await res.blob()
          const ext = t.photo_url.split('.').pop().split('?')[0] || 'jpg'
          const safeName = t.name.replace(/[^a-zA-Z0-9À-ɏ]/g, '_')
          zip.file(`${String(i + 1).padStart(2, '0')}_${safeName}.${ext}`, blob)
        } catch { /* skip failed photo */ }
      })
    )
    const content = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(content)
    const a = document.createElement('a')
    a.href = url
    a.download = 'photos-emilie.zip'
    a.click()
    URL.revokeObjectURL(url)
    setZipping(false)
  }

  if (!authed) {
    return (
      <div className={styles.page}>
        <div className={`${styles.loginCard} glass-card`}>
          <h2 className={`${styles.loginTitle} grad-text`}>Admin</h2>
          <p className={styles.loginSub}>Messages pour Emilie</p>
          <form className={styles.loginForm} onSubmit={login}>
            <input
              className={styles.input}
              type="password"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Mot de passe"
              autoFocus
            />
            {wrongPw && <p className={styles.error}>Mot de passe incorrect.</p>}
            <button type="submit" className={`${styles.loginBtn} btn-primary`}>
              Entrer
            </button>
          </form>
        </div>
      </div>
    )
  }

  const publicCount = tributes.filter(t => t.is_public).length
  const total = tributes.length

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={`${styles.title} grad-text`}>Messages pour Emilie</h1>
        <p className={styles.stats}>
          {publicCount} / {total} publiés sur la galerie
        </p>
        <div className={styles.headerActions}>
          {publicCount < total && (
            <button
              className={`${styles.publishAllBtn} btn-primary`}
              onClick={publishAll}
              disabled={saving === 'all'}
            >
              {saving === 'all' ? 'Publication...' : 'Tout publier'}
            </button>
          )}
          {total > 0 && (
            <div className={styles.exportGroup}>
              <button className={styles.exportBtn} onClick={exportCSV}>
                Exporter CSV
              </button>
              <button className={styles.exportBtn} onClick={exportJSON}>
                Exporter JSON
              </button>
              {tributes.some(t => t.photo_url) && (
                <button
                  className={`${styles.exportBtn} ${styles.exportPhotos}`}
                  onClick={downloadPhotos}
                  disabled={zipping}
                >
                  {zipping ? 'Préparation...' : 'Télécharger les photos (.zip)'}
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {loading ? (
        <div className={styles.spinner} />
      ) : total === 0 ? (
        <div className={`${styles.emptyCard} glass-card`}>
          <p className={styles.emptyText}>Aucun message pour l'instant.</p>
        </div>
      ) : (
        <div className={styles.list}>
          {tributes.map(t => (
            <div
              key={t.id}
              className={`${styles.card} glass-card ${t.is_public ? styles.cardPublic : ''}`}
            >
              <div className={styles.cardTop}>
                <div className={styles.cardMeta}>
                  <span className={styles.cardName}>{t.name}</span>
                  <span className={styles.cardDate}>
                    {new Date(t.created_at).toLocaleDateString('fr-FR', {
                      day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className={styles.cardActions}>
                  <button
                    className={`${styles.toggleBtn} ${t.is_public ? styles.toggleOn : styles.toggleOff}`}
                    onClick={() => togglePublic(t)}
                    disabled={saving === t.id}
                  >
                    {saving === t.id ? '...' : t.is_public ? 'Publié' : 'Masqué'}
                  </button>
                  {confirmDelete === t.id ? (
                    <div className={styles.confirmRow}>
                      <span className={styles.confirmLabel}>Supprimer ?</span>
                      <button
                        className={styles.confirmYes}
                        onClick={() => deleteTribute(t.id)}
                        disabled={saving === t.id}
                      >
                        Oui
                      </button>
                      <button
                        className={styles.confirmNo}
                        onClick={() => setConfirmDelete(null)}
                      >
                        Non
                      </button>
                    </div>
                  ) : (
                    <button
                      className={styles.deleteBtn}
                      onClick={() => setConfirmDelete(t.id)}
                      aria-label="Supprimer"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {t.photo_url && (
                <img src={t.photo_url} className={styles.cardPhoto} alt="" />
              )}

              <p className={styles.cardMessage}>{t.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
