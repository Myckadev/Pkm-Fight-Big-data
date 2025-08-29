import ReactDOM from 'react-dom/client'
import App from './App'
import { CssBaseline, GlobalStyles } from '@mui/material'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <>
    <CssBaseline />
    <GlobalStyles styles={{
      'html, body, #root': { height: '100%', overflow: 'hidden' },
      'body': { backgroundColor: '#fafafa' }
    }} />
    <App />
  </>
)
