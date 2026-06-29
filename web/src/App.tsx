import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import MonstersPage from './pages/MonstersPage'
import ItemsPage from './pages/ItemsPage'
import WeaponsPage from './pages/WeaponsPage'
import ArmorSetsPage from './pages/ArmorSetsPage'
import ArmorSkillsPage from './pages/ArmorSkillsPage'
import DecorationsPage from './pages/DecorationsPage'
import QuestsPage from './pages/QuestsPage'
import TrainingSchoolPage from './pages/TrainingSchoolPage'
import GatheringPage from './pages/GatheringPage'
import ComboListPage from './pages/ComboListPage'
import TreasuresPage from './pages/TreasuresPage'
import KitchenPage from './pages/KitchenPage'
import TrenyaPage from './pages/TrenyaPage'
import PokkePage from './pages/PokkePage'
import GrannyPage from './pages/GrannyPage'
import VeggiePage from './pages/VeggiePage'
import ComradesPage from './pages/ComradesPage'
import AwardsPage from './pages/AwardsPage'
import BookmarksPage from './pages/BookmarksPage'
import NotesPage from './pages/NotesPage'
import AboutPage from './pages/AboutPage'

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/monsters" replace />} />
          <Route path="monsters"    element={<MonstersPage />} />
          <Route path="monsters/:id" element={<MonstersPage />} />
          <Route path="weapons"     element={<WeaponsPage />} />
          <Route path="weapons/:id" element={<WeaponsPage />} />
          <Route path="armorsets"   element={<ArmorSetsPage />} />
          <Route path="armorsets/:id" element={<ArmorSetsPage />} />
          <Route path="armorskills" element={<ArmorSkillsPage />} />
          <Route path="armorskills/:id" element={<ArmorSkillsPage />} />
          <Route path="decorations" element={<DecorationsPage />} />
          <Route path="decorations/:id" element={<DecorationsPage />} />
          <Route path="quests"      element={<QuestsPage />} />
          <Route path="training"    element={<TrainingSchoolPage />} />
          <Route path="gathering"   element={<GatheringPage />} />
          <Route path="gathering/:slug" element={<GatheringPage />} />
          <Route path="items"       element={<ItemsPage />} />
          <Route path="items/:name" element={<ItemsPage />} />
          <Route path="combolist"   element={<ComboListPage />} />
          <Route path="treasures"   element={<TreasuresPage />} />
          <Route path="kitchen"     element={<KitchenPage />} />
          <Route path="trenya"      element={<TrenyaPage />} />
          <Route path="pokke"       element={<PokkePage />} />
          <Route path="pokke/:area" element={<PokkePage />} />
          <Route path="granny"      element={<GrannyPage />} />
          <Route path="veggie"      element={<VeggiePage />} />
          <Route path="comrades"    element={<ComradesPage />} />
          <Route path="awards"      element={<AwardsPage />} />
          <Route path="bookmarks"   element={<BookmarksPage />} />
          <Route path="notes"       element={<NotesPage />} />
          <Route path="about"       element={<AboutPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
