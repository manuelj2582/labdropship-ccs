import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App'
import Catalog from './pages/Catalog'
import Ecom from './pages/Ecom'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/catalogo" element={<Catalog />} />
        <Route path="/catalogo/:category" element={<Catalog />} />
        <Route path="/ecom" element={<Ecom />} />
        <Route path="/*" element={<App />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
