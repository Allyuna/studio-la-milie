import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../context/GameContext'
import styles from './VocalGame.module.css'

// ─── Freddie Mercury "Ay-Oh" Vocal Warm-up Sequence ──────────────────────────
// Ascending D4→A4, then descending back — faithful to the Live Aid warm-up
const SEQUENCE = [
  { note: 'D4',  freq: 293.66, dur: 2000, lyric: 'AY' },
  { note: 'D4',  freq: 293.66, dur: 2000, lyric: 'OH' },
  { note: 'E4',  freq: 329.63, dur: 2000, lyric: 'AY' },
  { note: 'E4',  freq: 329.63, dur: 2000, lyric: 'OH' },
  { note: 'F#4', freq: 369.99, dur: 2000, lyric: 'AY' },
  { note: 'F#4', freq: 369.99, dur: 2000, lyric: 'OH' },
  { note: 'G4',  freq: 392.00, dur: 2000, lyric: 'AY' },
  { note: 'G4',  freq: 392.00, dur: 2000, lyric: 'OH' },
  { note: 'A4',  freq: 440.00, dur: 2600, lyric: 'AAAY' },
  { note: 'A4',  freq: 440.00, dur: 2600, lyric: 'OH !' },
  { note: 'G4',  freq: 392.00, dur: 2000, lyric: 'AY' },
  { note: 'F#4', freq: 369.99, dur: 2000, lyric: 'OH' },
  { note: 'E4',  freq: 329.63, dur: 2000, lyric: 'AY' },
  { note: 'D4',  freq: 293.66, dur: 2500, lyric: 'OH ♪' },
]

const MAX_SCORE      = SEQUENCE.length * 100   // 1400 pts max
const TOLERANCE_CENTS = 100                    // ±1 semitone = hit
const GAUGE_RANGE     = 300                    // cents shown on gauge (±)

// ─── YIN pitch detection ──────────────────────────────────────────────────────
function detectPitch(analyser, sampleRate) {
  const SIZE = analyser.fftSize  // 2048
  const buf  = new Float32Array(SIZE)
  analyser.getFloatTimeDomainData(buf)

  // Silence check (RMS)
  let rms = 0
  for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i]
  if (Math.sqrt(rms / SIZE) < 0.012) return null

  const W = SIZE >> 1

  // Step 1 — difference function
  const df = new Float32Array(W)
  for (let tau = 1; tau < W; tau++) {
    for (let j = 0; j < W; j++) {
      const d = buf[j] - buf[j + tau]
      df[tau] += d * d
    }
  }

  // Step 2 — cumulative mean normalized difference function
  const cmndf = new Float32Array(W)
  cmndf[0] = 1
  let cumSum = 0
  for (let tau = 1; tau < W; tau++) {
    cumSum += df[tau]
    cmndf[tau] = df[tau] * tau / cumSum
  }

  // Step 3 — find first minimum below threshold
  const THRESHOLD = 0.15
  let tau = 2
  while (tau < W - 1) {
    if (cmndf[tau] < THRESHOLD) {
      while (tau + 1 < W && cmndf[tau + 1] < cmndf[tau]) tau++
      break
    }
    tau++
  }

  // Fallback: absolute minimum (looser threshold)
  if (tau >= W - 1 || cmndf[tau] >= 0.5) {
    let minV = Infinity, minT = -1
    for (let i = 2; i < W; i++) {
      if (cmndf[i] < minV) { minV = cmndf[i]; minT = i }
    }
    if (minV > 0.4 || minT < 2) return null
    tau = minT
  }

  // Step 4 — parabolic interpolation
  let better = tau
  if (tau > 1 && tau < W - 1) {
    const x0 = cmndf[tau - 1], x1 = cmndf[tau], x2 = cmndf[tau + 1]
    const denom = 2 * (2 * x1 - x0 - x2)
    if (denom !== 0) better = tau + (x0 - x2) / denom
  }

  const freq = sampleRate / better
  // Clamp to sane vocal range (60 Hz – 1200 Hz)
  return freq >= 60 && freq <= 1200 ? freq : null
}

function centsOff(freq, target) {
  if (!freq || !target || freq <= 0) return null
  return 1200 * Math.log2(freq / target)
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function VocalGame() {
  const navigate  = useNavigate()
  const { player, submitScore } = useGame()

  const [phase,       setPhase]       = useState('intro')   // intro|playing|done
  const [noteIdx,     setNoteIdx]     = useState(0)
  const [cents,       setCents]       = useState(null)
  const [finalScore,  setFinalScore]  = useState(0)
  const [liveScore,   setLiveScore]   = useState(0)

  // Refs — readable inside RAF without stale closures
  const audioCtxRef   = useRef(null)
  const analyserRef   = useRef(null)
  const rafRef        = useRef(null)
  const timeoutRef    = useRef(null)
  const noteIdxRef    = useRef(0)
  const noteStartRef  = useRef(0)
  const hitFramesRef  = useRef(0)
  const totalFramesRef= useRef(0)
  const scoreRef      = useRef(0)
  const phaseRef      = useRef('intro')

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current)
      clearTimeout(timeoutRef.current)
      audioCtxRef.current?.close()
    }
  }, [])

  // ── Sequence logic ──────────────────────────────────────────────────────
  const advanceNote = useCallback((idx) => {
    if (phaseRef.current !== 'playing') return

    if (idx >= SEQUENCE.length) {
      // Game over
      phaseRef.current = 'done'
      setPhase('done')
      cancelAnimationFrame(rafRef.current)
      const score = Math.round(scoreRef.current)
      setFinalScore(score)
      submitScore(score)
      return
    }

    noteIdxRef.current  = idx
    hitFramesRef.current   = 0
    totalFramesRef.current = 0
    noteStartRef.current   = performance.now()
    setNoteIdx(idx)

    timeoutRef.current = setTimeout(() => {
      // Score this note: fraction of frames within tolerance × 100 pts
      const pct = totalFramesRef.current > 0
        ? hitFramesRef.current / totalFramesRef.current
        : 0
      scoreRef.current += pct * 100
      setLiveScore(Math.round(scoreRef.current))
      advanceNote(idx + 1)
    }, SEQUENCE[idx].dur)
  }, [submitScore])

  // ── Pitch detection loop (RAF) ───────────────────────────────────────────
  const startPitchLoop = useCallback(() => {
    function loop() {
      rafRef.current = requestAnimationFrame(loop)
      const analyser = analyserRef.current
      const ctx      = audioCtxRef.current
      if (!analyser || !ctx) return

      const freq = detectPitch(analyser, ctx.sampleRate)
      const note = SEQUENCE[noteIdxRef.current]
      if (!note) return

      totalFramesRef.current++
      const c = centsOff(freq, note.freq)
      setCents(c)
      if (c !== null && Math.abs(c) <= TOLERANCE_CENTS) {
        hitFramesRef.current++
      }
    }
    loop()
  }, [])

  // ── Start: request mic then begin ────────────────────────────────────────
  async function handleStart() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false },
        video: false,
      })
      const AudioCtx = window.AudioContext ?? window.webkitAudioContext
      const ctx      = new AudioCtx()
      const src      = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize               = 2048
      analyser.smoothingTimeConstant = 0.8
      src.connect(analyser)

      audioCtxRef.current = ctx
      analyserRef.current = analyser

      scoreRef.current = 0
      setLiveScore(0)
      phaseRef.current = 'playing'
      setPhase('playing')
      advanceNote(0)
      startPitchLoop()
    } catch {
      alert(
        'Impossible d\'accéder au microphone.\n' +
        'Autorise l\'accès dans les réglages de ton navigateur.'
      )
    }
  }

  // ── Replay ───────────────────────────────────────────────────────────────
  function handleReplay() {
    cancelAnimationFrame(rafRef.current)
    clearTimeout(timeoutRef.current)
    scoreRef.current = 0
    setLiveScore(0)
    phaseRef.current = 'playing'
    setPhase('playing')
    setNoteIdx(0)
    setCents(null)
    advanceNote(0)
    startPitchLoop()
  }

  // ── Derived values ───────────────────────────────────────────────────────
  const note       = SEQUENCE[noteIdx]
  const isHit      = cents !== null && Math.abs(cents) <= TOLERANCE_CENTS
  const isPerfect  = cents !== null && Math.abs(cents) <= 40
  // Gauge: map ±GAUGE_RANGE cents to 0–100%
  const gaugePos   = cents !== null
    ? Math.max(2, Math.min(98, 50 + (cents / GAUGE_RANGE) * 50))
    : 50

  const noteProgress = note
    ? Math.min(1, (performance.now() - noteStartRef.current) / note.dur)
    : 0

  const scoreMsg =
    finalScore >= MAX_SCORE * 0.85 ? '🏆 Freddie serait fier de toi !' :
    finalScore >= MAX_SCORE * 0.60 ? '👏 Superbe prestation !' :
    finalScore >= MAX_SCORE * 0.35 ? '🎤 Tu progresses !' :
    '🎸 Continue à t\'entraîner !'

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className={styles.page}>

      {/* ── INTRO ── */}
      {phase === 'intro' && (
        <div className={styles.intro}>
          <div className={styles.fredIcon}>🎤</div>
          <h1 className={styles.title}>L'Échauffement<br />de Freddie</h1>
          <p className={styles.sub}>
            Imite les notes vocales de Freddie Mercury !<br />
            Chante <strong>AY-OH</strong> en suivant les notes affichées.
          </p>
          {player && (
            <div className={styles.playerTag}>
              {player.name} · <span>{player.team}</span>
            </div>
          )}
          <div className={styles.rules}>
            <div className={styles.ruleRow}>🎙️ <span>Autorise l'accès au microphone</span></div>
            <div className={styles.ruleRow}>🎵 <span>Chante la note affichée en disant AY ou OH</span></div>
            <div className={styles.ruleRow}>🟢 <span>La jauge verte = tu es dans la bonne note</span></div>
            <div className={styles.ruleRow}>⭐ <span>Plus tu restes juste, plus tu marques</span></div>
          </div>
          <button className={styles.startBtn} onClick={handleStart}>
            🎙️ Autoriser le micro & commencer
          </button>
          <button className={styles.backBtn} onClick={() => navigate('/lobby')}>
            ← Retour au lobby
          </button>
        </div>
      )}

      {/* ── PLAYING ── */}
      {phase === 'playing' && note && (
        <div className={styles.game}>
          {/* Global progress */}
          <div className={styles.topBar}>
            <span className={styles.noteCounter}>{noteIdx + 1} / {SEQUENCE.length}</span>
            <div className={styles.globalProg}>
              <div
                className={styles.globalProgFill}
                style={{ width: `${((noteIdx + 1) / SEQUENCE.length) * 100}%` }}
              />
            </div>
            <span className={styles.livePts}>{liveScore} pts</span>
          </div>

          {/* Main note card */}
          <div className={`${styles.noteCard} ${isHit ? (isPerfect ? styles.perfect : styles.hit) : ''}`}>
            <div className={styles.noteName}>{note.note}</div>
            <div className={styles.lyric}>{note.lyric}</div>
            {isHit && <div className={styles.hitLabel}>{isPerfect ? '✨ PARFAIT' : '✓ JUSTE'}</div>}
          </div>

          {/* Pitch gauge */}
          <div className={styles.gaugeSection}>
            <div className={styles.gaugeTrack}>
              {/* Green "hit zone" in center */}
              <div className={styles.hitZone} />
              {/* Cursor */}
              <div
                className={`${styles.cursor} ${isHit ? styles.cursorHit : ''}`}
                style={{ left: `${gaugePos}%` }}
              />
            </div>
            <div className={styles.gaugeLabels}>
              <span>↓ grave</span>
              <span className={styles.justLabel}>Juste !</span>
              <span>aigu ↑</span>
            </div>
          </div>

          {/* Note duration bar */}
          <div className={styles.durationBar}>
            <div
              className={styles.durationFill}
              style={{ width: `${noteProgress * 100}%` }}
            />
          </div>

          {/* Upcoming notes */}
          <div className={styles.upcoming}>
            <span className={styles.upcomingLabel}>Prochaines notes</span>
            <div className={styles.upcomingList}>
              {SEQUENCE.slice(noteIdx + 1, noteIdx + 4).map((n, i) => (
                <div key={i} className={styles.upcomingItem} style={{ opacity: 1 - i * 0.3 }}>
                  <span className={styles.upcomingNote}>{n.note}</span>
                  <span className={styles.upcomingLyric}>{n.lyric}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── DONE ── */}
      {phase === 'done' && (
        <div className={styles.done}>
          <div className={styles.doneIcon}>⭐</div>
          <h1 className={styles.doneTitle}>Bravo !</h1>
          <div className={styles.scoreCircle}>
            <span className={styles.scoreNum}>{finalScore}</span>
            <span className={styles.scoreDen}>/ {MAX_SCORE} pts</span>
          </div>
          <p className={styles.scoreMsg}>{scoreMsg}</p>
          <div className={styles.scoreBar}>
            <div
              className={styles.scoreBarFill}
              style={{ width: `${(finalScore / MAX_SCORE) * 100}%` }}
            />
          </div>
          <div className={styles.doneActions}>
            <button className={styles.startBtn} onClick={handleReplay}>
              🔄 Rejouer
            </button>
            <button className={styles.backBtn} onClick={() => navigate('/lobby')}>
              🏆 Voir le classement
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
