import { createContext, useContext, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import ARGamePage from './pages/ARGamePage'

// ── i18n ──────────────────────────────────────────────────────────────────
const translations = {
  fr: {
    home_title:      'Color Escape',
    home_sub:        'Le jeu interactif de la soirée',
    home_desc:       'Résolvez 15 énigmes au fil des performances. Scannez, trouvez, découvrez.',
    home_cta:        'Commencer l\'aventure',
    mission_label:   'Mission 5 sur 15',
    mission_title:   'Le Code Secret',
    mission_desc:    'Un code a été dissimulé dans la salle. Trouvez le logo Studio La Milie et pointez votre caméra dessus pour révéler le secret.',
    mission_cta:     '📷 Lancer la caméra',
    mission_done:    '✓ Code trouvé !',
    mission_done_sub:'Vous avez découvert le code 473.',
    mission_next:    'Continuez le jeu →',
    back:            '← Retour',
    lang_btn:        'EN',
    ar_type:         'Mission AR',
  },
  en: {
    home_title:      'Color Escape',
    home_sub:        "Tonight's interactive game",
    home_desc:       'Solve 15 puzzles throughout the performances. Scan, find, discover.',
    home_cta:        'Start the adventure',
    mission_label:   'Mission 5 of 15',
    mission_title:   'The Secret Code',
    mission_desc:    'A code has been hidden in the venue. Find the Studio La Milie logo and point your camera at it to reveal the secret.',
    mission_cta:     '📷 Launch camera',
    mission_done:    '✓ Code found!',
    mission_done_sub:'You discovered the code 473.',
    mission_next:    'Continue the game →',
    back:            '← Back',
    lang_btn:        'FR',
    ar_type:         'AR Mission',
  },
}

export const LangContext = createContext({ lang: 'fr', setLang: () => {} })
export const useLang    = () => useContext(LangContext)
export const useT       = () => { const { lang } = useLang(); return translations[lang] }

// ── App ───────────────────────────────────────────────────────────────────
function App() {
  const [lang, setLang] = useState('fr')
  return (
    <LangContext.Provider value={{ lang, setLang }}>
      <BrowserRouter>
        <Routes>
          <Route path="/"           element={<Home />}      />
          <Route path="/mission/ar" element={<ARGamePage />} />
        </Routes>
      </BrowserRouter>
    </LangContext.Provider>
  )
}

export default App
