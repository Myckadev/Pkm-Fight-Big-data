import { api } from './base';

export type User = { id: number; email: string; username?: string };
type LoginReq = { email: string; password: string };
type RegisterReq = { email: string; password: string; username?: string };
type TokenResp = { access_token: string; token_type?: string };

export const authApi = api.injectEndpoints({
  endpoints: (builder) => ({
    me: builder.query<User, void>({
      query: () => ({ url: '/auth/me' }),
      providesTags: ['Me'],
    }),
    login: builder.mutation<TokenResp, LoginReq>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
    }),
    register: builder.mutation<TokenResp, RegisterReq>({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
    }),
  }),
});

export const { useMeQuery, useLoginMutation, useRegisterMutation } = authApi;
