import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { firebaseConfig } from './firebase.js'
import './index.css'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const config = encodeURIComponent(JSON.stringify(firebaseConfig))
    navigator.serviceWorker.register(`/service-worker.js?firebaseConfig=${config}`).catch(error => {
      console.error('Não foi possível registrar o service worker:', error)
    })
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)