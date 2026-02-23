import React from 'react'
import ReactDOM from 'react-dom/client'
import './assets/main.css'
import App from './App'
import Widget from './Widget.jsx' // Ensure you create this file next!

// TypeScript needs to know this element definitely exists, so we add 'as HTMLElement'
const rootElement = document.getElementById('root') as HTMLElement

const root = ReactDOM.createRoot(rootElement)

// Check the URL Hash to decide what to render
if (window.location.hash === '#widget') {
  // Render the Transparent Widget
  root.render(
    <React.StrictMode>
      <Widget />
    </React.StrictMode>
  )
} else {
  // Render the Main Dashboard
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}