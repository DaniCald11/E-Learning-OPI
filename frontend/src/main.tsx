import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createTheme, CssBaseline, ThemeProvider } from '@mui/material'
import App from './app/App'
const query = new QueryClient()
const theme = createTheme({ palette: { primary: { main: '#184b72' }, background: { default: '#f4f7fa' } }, typography: { fontFamily: 'system-ui, sans-serif' } })
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><ThemeProvider theme={theme}><CssBaseline />
  <QueryClientProvider client={query}><BrowserRouter><App /></BrowserRouter></QueryClientProvider>
</ThemeProvider></React.StrictMode>)
