import { api } from './base';

export type Favorite = {
  pokedex_number: number;
  name?: string;
  type1?: string;
  type2?: string | null;
  sprite?: string | null;
};

export const favoritesApi = api.injectEndpoints({
  endpoints: (b) => ({
    getFavorites: b.query<Favorite[], void>({
      query: () => ({ url: '/favorites' }),
      providesTags: ['Favorites'],
    }),
    addFavorite: b.mutation<{ ok: boolean }, { pokedex_number: number }>({
      query: (body) => ({ url: '/favorites', method: 'POST', body }),
      invalidatesTags: ['Favorites'],
    }),
    removeFavorite: b.mutation<void, number>({
      query: (dex) => ({ url: `/favorites/${dex}`, method: 'DELETE' }),
      invalidatesTags: ['Favorites'],
    }),
  }),
});

export const {
  useGetFavoritesQuery,
  useAddFavoriteMutation,
  useRemoveFavoriteMutation,
} = favoritesApi;
