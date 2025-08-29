import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { Box } from '@mui/material';

import { api } from './api/base';
import PokedexList from './pages/PokedexList';
import PokemonDetail from './pages/PokemonDetail';

import AuthProvider from './auth/AuthProvider';
import RequireAuthRoute from './auth/RequireAuthRoute';
import Teambuilder from './pages/TeamBuilder';
import Showdown from "./pages/Showdown";

const store = configureStore({
  reducer: { [api.reducerPath]: api.reducer },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(api.middleware),
});

export default function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <AuthProvider>
          <Box sx={{ height: '100%' }}>
            <Routes>
              <Route path="/" element={<PokedexList />} />
              <Route path="/pokemon/:dex" element={<PokemonDetail />} />
              <Route
                path="/teambuilder"
                element={
                  <RequireAuthRoute>
                    <Teambuilder />
                  </RequireAuthRoute>
                }
              />
              <Route
                path="/showdown"
                element={
                  <RequireAuthRoute>
                    <Showdown />
                  </RequireAuthRoute>
                }
              />
            </Routes>
          </Box>
        </AuthProvider>
      </BrowserRouter>
    </Provider>
  );
}
