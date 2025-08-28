import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { api } from './api/base';
import PokedexList from './pages/PokedexList';
import PokemonDetail from './pages/PokemonDetail';
import { AppBar, Toolbar, Typography, Container, Box } from '@mui/material';

const store = configureStore({
  reducer: { [api.reducerPath]: api.reducer },
  middleware: (gDM) => gDM().concat(api.middleware),
});

export default function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <AppBar position="sticky">
          <Toolbar>
            <Typography variant="h6" component={Link} to="/" style={{ color:'#fff', textDecoration:'none', fontWeight:800 }}>
              Poké-Lakehouse
            </Typography>
          </Toolbar>
        </AppBar>
        <Box sx={{ minHeight:'100vh', bgcolor:'#fafafa' }}>
          <Container maxWidth="lg">
            <Routes>
              <Route path="/" element={<PokedexList />} />
              <Route path="/pokemon/:dex" element={<PokemonDetail />} />
            </Routes>
          </Container>
        </Box>
      </BrowserRouter>
    </Provider>
  );
}
