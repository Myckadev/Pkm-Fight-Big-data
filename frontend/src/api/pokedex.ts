import { api } from './base';

export interface PokemonListItem {
  pokedex_number: number;
  name: string;
  type1: string;
  type2?: string | null;
  total_stats: number;
  is_legendary: boolean;
  generation: string;
  sprite_front?: string | null;
}
export interface PokemonListResponse {
  total: number; page: number; page_size: number; results: PokemonListItem[];
}
export interface PokemonDetail {
  dex: number; name: string;
  types: string[];
  stats: { hp:number; atk:number; def:number; spa:number; spd:number; spe:number; total:number; };
  sprites: { front?: string|null; back?: string|null };
  species: any;
  matchups: Record<string, number>;
  moves: { name:string; type:string; power:number|null; accuracy:number|null; pp:number|null; priority:number; damage_class:string; effect?:string|null }[];
  learnsets: { move:string; learn_method:string; level_learned_at:number|null; version_group:string; generation:string|null }[];
  evolutions: { nodes:string[]; edges:any[] };
}

export const pokedexApi = api.injectEndpoints({
  endpoints: (build) => ({
    getPokemonList: build.query<PokemonListResponse, {search?:string; type?:string; generation?:string; legendary?:boolean; page?:number; page_size?:number}>({
      query: (q) => ({
        url: '/pokedex/pokemon',
        params: q
      }),
      providesTags: ['Pokedex']
    }),
    getPokemon: build.query<PokemonDetail, number>({
      query: (dex) => `/pokedex/pokemon/${dex}`,
      providesTags: (_r,_e,dex)=>[{type:'Pokemon' as const, id:dex}]
    }),
    getTypeChart: build.query<{attacking:string; defending:string; multiplier:number}[], void>({
      query: ()=> '/pokedex/type-chart'
    })
  })
});

export const { useGetPokemonListQuery, useGetPokemonQuery, useGetTypeChartQuery } = pokedexApi;
