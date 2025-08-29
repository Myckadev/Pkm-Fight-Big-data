import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const API_BASE: string = (import.meta as any)?.env?.VITE_API_BASE ?? 'http://localhost:8000';

export const api = createApi({
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE,
    prepareHeaders: (headers) => {
      const token = localStorage.getItem('authToken');
      if (token) headers.set('authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ['Me', 'Pokedex', 'Favorites'],
  endpoints: () => ({}),
});
