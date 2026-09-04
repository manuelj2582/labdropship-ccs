import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App'
import Catalog from './pages/Catalog'
import Ecom from './pages/Ecom'
import Landing from './pages/Landing'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/catalogo" element={<Catalog />} />
        <Route path="/catalogo/:category" element={<Catalog />} />
        <Route path="/ecom" element={<Ecom />} />
        <Route path="/app/*" element={<App />} />
        <Route path="*" element={<Landing />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
