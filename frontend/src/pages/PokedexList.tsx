import { useMemo, useState } from 'react';
import { useGetPokemonListQuery } from '../api/pokedex';
import {
  Box, Grid, Card, CardActionArea, CardContent, Typography, TextField,
  Chip, Pagination, Stack, ToggleButtonGroup, ToggleButton,
  Button, Divider, Tooltip, IconButton
} from '@mui/material';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import TypeChip from '../components/TypeChip';
import PokedexShell from '../components/PokedexShell';
import PokeButton from '../components/PokeButton';
import Groups2Icon from '@mui/icons-material/Groups2';
import BoltIcon from '@mui/icons-material/Bolt';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import StarBorderRoundedIcon from '@mui/icons-material/StarBorderRounded';

import { useAuth } from '../auth/AuthProvider';
import {
  useGetFavoritesQuery,
  useAddFavoriteMutation,
  useRemoveFavoriteMutation,
} from '../api/favorites';

const API_BASE: string = (import.meta as any)?.env?.VITE_API_BASE ?? 'http://localhost:8000';

const TYPE_COLOR: Record<string, string> = {
  normal:'#A8A77A', fire:'#EE8130', water:'#6390F0', electric:'#F7D02C', grass:'#7AC74C',
  ice:'#96D9D6', fighting:'#C22E28', poison:'#A33EA1', ground:'#E2BF65', flying:'#A98FF3',
  psychic:'#F95587', bug:'#A6B91A', rock:'#B6A136', ghost:'#735797', dragon:'#6F35FC',
  dark:'#705746', steel:'#B7B7CE', fairy:'#D685AD',
};
const ALL_TYPES = ['normal','fire','water','electric','grass','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy'];
const ALL_GENS  = ['1','2','3','4','5','6','7','8','9'];

type ListItem = {
  pokedex_number: number;
  name: string;
  type1: string;
  type2?: string | null;
  generation?: string | number;
  is_legendary?: boolean;
  total_stats?: number;
  sprite_official_front?: string | null;
  sprite_home_front?: string | null;
  sprite_front?: string | null;
};

const abs = (src?: string | null): string | undefined => {
  if (!src) return undefined;
  if (/^(https?:)?\/\//i.test(src) || src.startsWith('data:')) return src;
  if (src.startsWith('/')) return `${API_BASE}${src}`;
  return `${API_BASE}/${src}`;
};
const hexToRgb = (hex: string) => {
  const m = hex.replace('#','');
  const r = parseInt(m.substring(0,2),16);
  const g = parseInt(m.substring(2,4),16);
  const b = parseInt(m.substring(4,6),16);
  return { r,g,b };
};
const rgba = (hex: string, a: number) => {
  const {r,g,b} = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

export default function PokedexList() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { authed, ensureAuthed } = useAuth();

  const [search, setSearch] = useState(params.get('q') || '');
  const [type, setType]     = useState(params.get('type') || '');
  const [gen, setGen]       = useState(params.get('gen') || '');
  const [legendary, setLegendary] = useState(params.get('leg') === '1');
  const page = parseInt(params.get('p') || '1', 10);

  const query = useMemo(() => ({
    search: search || undefined,
    type: type || undefined,
    generation: gen || undefined,
    legendary: legendary || undefined,
    page,
    page_size: 30
  }), [search, type, gen, legendary, page]);

  const { data, isLoading } = useGetPokemonListQuery(query);

  // ---- Favoris (auth requis) ----
  const { data: favs } = useGetFavoritesQuery(undefined, { skip: !authed });
  const favSet = useMemo(() => new Set((favs ?? []).map(f => f.pokedex_number)), [favs]);
  const [addFav] = useAddFavoriteMutation();
  const [remFav] = useRemoveFavoriteMutation();

  const toggleFav = async (dex: number, isFav: boolean) => {
    const ok = authed ? true : await ensureAuthed();
    if (!ok) return;
    try {
      if (isFav) await remFav(dex).unwrap();
      else await addFav({ pokedex_number: dex }).unwrap();
    } catch {
      // tu peux mettre un toast ici si tu veux
    }
  };

  const onFilterChange = (resetPage = true) => {
    const p = new URLSearchParams();
    if (search) p.set('q', search);
    if (type)   p.set('type', type);
    if (gen)    p.set('gen', gen);
    if (legendary) p.set('leg', '1');
    p.set('p', resetPage ? '1' : String(page));
    setParams(p);
  };

  const clearAll = () => {
    setSearch(''); setType(''); setGen(''); setLegendary(false);
    const p = new URLSearchParams(); p.set('p','1'); setParams(p);
  };

  /* ---------- Panneau filtres (gauche) ---------- */
  const left = (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 900, mb: 1 }}>Pokédex</Typography>

      <TextField
        label="Recherche"
        placeholder="Nom, #, …"
        value={search}
        onChange={e => setSearch(e.target.value)}
        onKeyDown={(e)=> { if (e.key === 'Enter') onFilterChange(); }}
        size="small"
        fullWidth
      />

      <Divider sx={{ my: 1.25 }} />

      <Typography variant="subtitle2" sx={{ mb: .5, fontWeight: 700 }}>Génération</Typography>
      <ToggleButtonGroup
        exclusive size="small" value={gen || 'all'}
        onChange={(_, v)=> { setGen(v === 'all' ? '' : String(v)); onFilterChange(); }}
        sx={{ flexWrap: 'wrap', gap: .5 }}
      >
        <ToggleButton value="all">TOUTES</ToggleButton>
        {ALL_GENS.map(g => <ToggleButton key={g} value={g}>GEN {g}</ToggleButton>)}
      </ToggleButtonGroup>

      <Divider sx={{ my: 1.25 }} />

      <Typography variant="subtitle2" sx={{ mb: .5, fontWeight: 700 }}>Type</Typography>
      <Box sx={{
        display:'grid',
        gridTemplateColumns:'repeat(3, 1fr)',
        gap: .5
      }}>
        <Chip
          label="Tous" size="small"
          onClick={()=>{ setType(''); onFilterChange(); }}
          variant={type ? 'outlined' : 'filled'}
          color={type ? 'default':'primary'}
        />
        {ALL_TYPES.map(t => (
          <Chip
            key={t}
            label={t[0].toUpperCase() + t.slice(1)}
            size="small"
            onClick={()=>{ setType(t); onFilterChange(); }}
            sx={{
              bgcolor: rgba(TYPE_COLOR[t], type === t ? .25 : .10),
              color: '#111', borderColor: rgba(TYPE_COLOR[t], .35),
              borderWidth: 1, borderStyle: 'solid',
            }}
            variant={type === t ? 'filled' : 'outlined'}
          />
        ))}
      </Box>

      <Divider sx={{ my: 1.25 }} />

      <Typography variant="subtitle2" sx={{ mb: .5, fontWeight: 700 }}>Rareté</Typography>
      <ToggleButtonGroup
        exclusive size="small"
        value={legendary ? 'leg':'all'}
        onChange={(_, v)=> { setLegendary(v === 'leg'); onFilterChange(); }}
      >
        <ToggleButton value="all">TOUS</ToggleButton>
        <ToggleButton value="leg">LÉGENDaires</ToggleButton>
      </ToggleButtonGroup>

      <Box sx={{ mt: 1.5, display:'flex', gap:.5, flexWrap:'wrap', alignItems:'center' }}>
        {type && <Chip size="small" label={`Type: ${type}`} onDelete={()=>{ setType(''); onFilterChange(); }} />}
        {gen && <Chip size="small" label={`Gen ${gen}`} onDelete={()=>{ setGen(''); onFilterChange(); }} />}
        {legendary && <Chip size="small" label="Légendaires" onDelete={()=>{ setLegendary(false); onFilterChange(); }} />}
        {(type || gen || legendary || search) && <Button size="small" onClick={clearAll}>Réinitialiser</Button>}
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {isLoading ? 'Chargement…' : `${data?.total ?? 0} Pokémon trouvés`}
      </Typography>
    </Box>
  );

  /* ---------- Carte (fond typé + étoile favoris) ---------- */
  const EntryCard = ({ p }: { p: ListItem }) => {
    const base = TYPE_COLOR[p.type1] || '#9aa9b0';
    const img =
      abs(p.sprite_official_front) ||
      abs(p.sprite_home_front) ||
      abs(p.sprite_front);

    const isFav = favSet.has(p.pokedex_number);

    // rangée de chips standardisée
    const ChipRow = ({ children }: { children: React.ReactNode }) => (
      <Stack
        direction="row"
        spacing={1}
        sx={{
          height: 28,
          alignItems: 'center',
          flexWrap: 'nowrap',
          overflow: 'hidden',
          '& .MuiChip-root': { height: 24, borderRadius: 999 },
          '& .MuiChip-label': { px: 1, lineHeight: '24px', fontWeight: 600 },
        }}
      >
        {children}
      </Stack>
    );

    return (
      <Card
        variant="outlined"
        sx={{
          height: '100%',
          borderRadius: 3,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          borderColor: rgba(base, .45),
          background: `linear-gradient(180deg, ${rgba(base,.28)} 0%, ${rgba(base,.10)} 60%, #fff 100%)`,
          position: 'relative',
          '&::after': {
            content: '""',
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(60% 40% at 70% 0%, ${rgba('#ffffff',.35)} 0%, transparent 60%)`,
            pointerEvents: 'none'
          },
          transition: 'transform .12s ease, box-shadow .12s ease',
          '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 }
        }}
      >
        <CardActionArea
          component={Link}
          to={`/pokemon/${p.pokedex_number}`}
          sx={{ flex: 1, display:'flex', flexDirection:'column', alignItems:'stretch' }}
        >
          {/* Scène image teintée + bouton favoris */}
          <Box
            sx={{
              position:'relative',
              background: `
                radial-gradient(90% 70% at 50% 0%, ${rgba(base,.38)} 0%, ${rgba(base,.18)} 55%, ${rgba(base,.08)} 85%, transparent 100%),
                linear-gradient(180deg, ${rgba(base,.45)} 0%, ${rgba(base,.30)} 100%)
              `,
              borderBottom: '1px solid', borderColor: rgba(base, .55),
              boxShadow: `inset 0 -22px 38px ${rgba('#000', .18)}`,
              display:'flex', alignItems:'center', justifyContent:'center',
              py: 1.5, flexShrink:0
            }}
          >
            {/* Toggle favoris (stop la nav) */}
            <Tooltip title={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleFav(p.pokedex_number, isFav);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                sx={{
                  position: 'absolute',
                  top: 8, right: 8, zIndex: 2,
                  bgcolor: isFav ? 'rgba(255, 193, 7, 0.25)' : 'rgba(0,0,0,.25)',
                  color: isFav ? '#ffb300' : '#fff',
                  backdropFilter: 'blur(2px)',
                  '&:hover': {
                    bgcolor: isFav ? 'rgba(255, 193, 7, 0.36)' : 'rgba(0,0,0,.35)',
                  }
                }}
              >
                {isFav ? <StarRoundedIcon /> : <StarBorderRoundedIcon />}
              </IconButton>
            </Tooltip>

            {img
              ? <img src={img} alt={p.name} style={{ height: 96, objectFit: 'contain', filter:'drop-shadow(0 6px 14px rgba(0,0,0,.18))' }} />
              : <Box sx={{ width: 96, height: 96, bgcolor: '#333' }} />
            }
          </Box>

          {/* Corps avec grille : titre, types, infos (alignés) */}
          <CardContent
            sx={{
              p: 1.25,
              width: '100%',
              display: 'grid',
              gridTemplateRows: 'auto 28px 28px',
              rowGap: 0.75,
            }}
          >
            {/* Nom + # */}
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 900,
                lineHeight: 1.1,
                whiteSpace:'nowrap',
                overflow:'hidden',
                textOverflow:'ellipsis',
              }}
              title={`${p.name} #${p.pokedex_number}`}
            >
              {p.name} <Typography component="span" color="text.secondary">#{p.pokedex_number}</Typography>
            </Typography>

            {/* Rangée types */}
            <ChipRow>
              <TypeChip type={p.type1} />
              {p.type2 ? <TypeChip type={p.type2} /> : null}
            </ChipRow>

            {/* Rangée infos */}
            <ChipRow>
              {p.is_legendary && <Chip size="small" label="Légendaire" color="warning" />}
              {p.generation && <Chip size="small" label={`Gen ${p.generation}`} />}
              {p.total_stats && <Chip size="small" label={`Total ${p.total_stats}`} />}
            </ChipRow>
          </CardContent>
        </CardActionArea>
      </Card>
    );
  };

  /* ---------- Écran droit ---------- */
  const right = (
    <Box sx={{ p: 2, minHeight: 0 }}>
      <Grid container spacing={1.5}>
        {data?.results.map((p: ListItem) => (
          <Grid
            key={p.pokedex_number}
            item
            xs={12}    // 1 / ligne (mobile)
            sm={6}     // 2 / ligne (≥600px)
            md={4}     // 3 / ligne (≥900px)
            lg={4}
            xl={4}
          >
            <EntryCard p={p} />
          </Grid>
        ))}
      </Grid>

      {data && (
        <Box sx={{ display:'flex', justifyContent:'center', my:2 }}>
          <Pagination
            page={data.page}
            count={Math.max(1, Math.ceil(data.total / data.page_size))}
            onChange={(_, p)=>{ params.set('p', String(p)); setParams(params); }}
          />
        </Box>
      )}
    </Box>
  );

  /* ---------- Topbar droite (nav conditionnée à l’auth) ---------- */
  const goIfAuthed = async (path: string) => {
    const ok = await ensureAuthed();
    if (ok) navigate(path);
  };

  const rightTopBar = (
    <Stack direction="row" spacing={1.25}>
      <PokeButton
        pokestyle="solid"
        colorHex="#7E3FF2"
        startIcon={<Groups2Icon />}
        size="small"
        onClick={() => goIfAuthed('/teambuilder')}
      >
        Teambuilder
      </PokeButton>
      <PokeButton
        pokestyle="ghost"
        startIcon={<BoltIcon />}
        size="small"
        onClick={() => goIfAuthed('/showdown')}
      >
        Showdown
      </PokeButton>
    </Stack>
  );

  return (
    <PokedexShell
      title="Poké-Lakehouse • Pokédex"
      rightTopBar={rightTopBar}
      left={left}
      right={right}
    />
  );
}
