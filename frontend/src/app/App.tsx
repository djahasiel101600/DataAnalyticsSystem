import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { DatasetsProvider } from '@/app/store/DatasetsContext'
import { OperationConfigProvider } from '@/app/store/OperationConfigContext'
import { MainPage } from '@/pages/main'

export function App() {
  return (
    <BrowserRouter>
      <OperationConfigProvider>
        <DatasetsProvider>
          <Routes>
            <Route path="/" element={<MainPage />} />
          </Routes>
        </DatasetsProvider>
      </OperationConfigProvider>
    </BrowserRouter>
  )
}
