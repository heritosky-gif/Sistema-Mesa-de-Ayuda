import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { InstitucionProvider } from './context/InstitucionProvider'
import { AuthProvider } from './context/AuthContext'
import { OficiosProvider } from './context/oficiosContext'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <InstitucionProvider>
        <AuthProvider>
          <OficiosProvider>
            <App />
          </OficiosProvider>
        </AuthProvider>
      </InstitucionProvider>
    </BrowserRouter>
  </StrictMode>
)
