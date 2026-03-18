import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { DatasetsProvider } from '@/app/store/DatasetsContext'
import { MainPage } from '@/pages/main'

export function App() {
  return (
    <BrowserRouter>
      <DatasetsProvider>
        <Routes>
          <Route path="/" element={<MainPage />} />
        </Routes>
      </DatasetsProvider>
    </BrowserRouter>
  )
}
