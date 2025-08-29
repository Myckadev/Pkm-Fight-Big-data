import { useParams, Link } from 'react-router-dom';
import { useGetPokemonQuery } from '../api/pokedex';
import React, { useState, useMemo, useEffect } from 'react';
import {
  Box, Typography, Chip, Grid, Card, CardContent, Divider, Stack,
  Tabs, Tab, Switch, FormControlLabel, ToggleButtonGroup, ToggleButton,
  Tooltip, LinearProgress, Select, MenuItem, FormControl, InputLabel,
  IconButton, TextField, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Paper
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import NumbersIcon from '@mui/icons-material/Numbers';
import SearchIcon from '@mui/icons-material/Search';
import PokedexShell from '../components/PokedexShell';
import TypeChip from '../components/TypeChip';
import StatBar from '../components/StatBar';
import DefensiveTypesPanel from "../components/DefensiveTypesPanel";

const API_BASE: string = (import.meta as any)?.env?.VITE_API_BASE ?? 'http://localhost:8000';

/* ---------- Types ---------- */
type Move = {
  move_id: number;
  name: string;
  slug: string;
  type: string;
  power?: number | null;
  accuracy?: number | null;
  pp?: number | null;
  priority?: number | null;
  damage_class?: string | null;
  effect?: string | null;
};

type LearnsetRow = {
  move: string;
  learn_method: string;
  level_learned_at?: number | null;
  version_group: string;
  generation?: number | null;
};

/* ---------- Constantes ---------- */
const METHOD_FR: Record<string, string> = {
  'level-up': 'Niveau',
  'machine': 'CT',
  'tutor': 'Maître',
  'egg': 'Œuf',
  'stadium-surfing-pikachu': 'Événement',
};

const CLASS_FR: Record<string, string> = {
  physical: 'Physique',
  special: 'Spéciale',
  status: 'Statut',
};

const TYPE_COLOR: Record<string, string> = {
  normal:'#A8A77A', fire:'#EE8130', water:'#6390F0', electric:'#F7D02C', grass:'#7AC74C',
  ice:'#96D9D6', fighting:'#C22E28', poison:'#A33EA1', ground:'#E2BF65', flying:'#A98FF3',
  psychic:'#F95587', bug:'#A6B91A', rock:'#B6A136', ghost:'#735797', dragon:'#6F35FC',
  dark:'#705746', steel:'#B7B7CE', fairy:'#D685AD',
};

const METHOD_COLOR: Record<string, string> = {
  'level-up': '#1e88e5',
  'machine':  '#6c757d',
  'tutor':    '#8e24aa',
  'egg':      '#2e7d32',
};

const versionGroupToGen = (vg: string): number => {
  const m: Record<string, number> = {
    'red-blue': 1, 'yellow': 1,
    'gold-silver': 2, 'crystal': 2,
    'ruby-sapphire': 3, 'emerald': 3, 'firered-leafgreen': 3, 'colosseum': 3, 'xd': 3,
    'diamond-pearl': 4, 'platinum': 4, 'heartgold-soulsilver': 4,
    'black-white': 5, 'black-2-white-2': 5,
    'x-y': 6, 'omega-ruby-alpha-sapphire': 6,
    'sun-moon': 7, 'ultra-sun-ultra-moon': 7, 'lets-go-pikachu-lets-go-eevee': 7,
    'sword-shield': 8, 'brilliant-diamond-and-shining-pearl': 8, 'legends-arceus': 8,
    'scarlet-violet': 9,
  };
  return m[vg] ?? 0;
};

/* ---------- Helpers ---------- */
const cap = (s?: string | null) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
const titleCase = (s?: string | null) => s ? s.split(' ').map(w => (w ? w[0].toUpperCase()+w.slice(1) : '')).join(' ') : '';
const slugToLabel = (slug: string) => titleCase(slug.replace(/-/g, ' '));
const abs = (src?: string | null): string | undefined => {
  if (!src) return undefined;
  if (/^(https?:)?\/\//i.test(src) || src.startsWith('data:')) return src;
  if (src.startsWith('/')) return `${API_BASE}${src}`;
  return `${API_BASE}/${src}`;
};

/* ---------- Sub-components ---------- */
const Img = ({ src, alt, height=220 }: { src?: string | null; alt: string; height?: number }) => {
  const url = abs(src);
  if (!url) return null;
  return (
    <Box sx={{ p:1.5, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <Box component="img" src={url} alt={alt}
           sx={{ maxWidth:'100%', maxHeight:height, objectFit:'contain',
             filter:'drop-shadow(0 6px 14px rgba(0,0,0,.18))' }}/>
    </Box>
  );
};

function Stars({ score }: { score: number }) {
  const stars = Math.max(0, Math.min(5, Math.round((score / 600) * 5)));
  return <Box aria-label="Puissance" sx={{ fontSize: 18, letterSpacing: 1 }}>
    {'★'.repeat(stars)}{'☆'.repeat(5 - stars)}
  </Box>;
}

/** Table propre des moves (avec filtres) */
function MovesTable({ moves, dense = false }: { moves: Move[]; dense?: boolean }) {
  const [q, setQ] = useState('');
  const [cls, setCls] = useState<'all'|'physical'|'special'|'status'>('all');
  const [typ, setTyp] = useState<string>('all');

  const typesInList = useMemo(
    () => Array.from(new Set(moves.map(m => (m.type || 'normal')))).sort(),
    [moves]
  );

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return moves.filter(m => {
      if (cls !== 'all' && (m.damage_class || '').toLowerCase() !== cls) return false;
      if (typ !== 'all' && (m.type || '') !== typ) return false;
      if (qq && !(`${m.name}`.toLowerCase().includes(qq))) return false;
      return true;
    }).sort((a,b)=> (b.power||0)-(a.power||0) || a.name.localeCompare(b.name));
  }, [moves, q, cls, typ]);

  return (
    <Box>
      {/* Filtres */}
      <Stack direction={{ xs:'column', sm:'row' }} spacing={1} alignItems={{ xs:'stretch', sm:'center' }} sx={{ mb: 1.25 }}>
        <Box sx={{ display:'flex', alignItems:'center', gap:1, flex:1 }}>
          <SearchIcon fontSize="small" />
          <TextField
            size="small"
            placeholder="Rechercher une capacité…"
            fullWidth
            value={q}
            onChange={e=>setQ(e.target.value)}
          />
        </Box>
        <ToggleButtonGroup exclusive size="small" value={cls} onChange={(_, v)=> v && setCls(v)}>
          <ToggleButton value="all">Toutes</ToggleButton>
          <ToggleButton value="physical">Physique</ToggleButton>
          <ToggleButton value="special">Spéciale</ToggleButton>
          <ToggleButton value="status">Statut</ToggleButton>
        </ToggleButtonGroup>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="type-filter">Type</InputLabel>
          <Select labelId="type-filter" label="Type" value={typ} onChange={(e)=>setTyp(String(e.target.value))}>
            <MenuItem value="all">Tous les types</MenuItem>
            {typesInList.map(t => <MenuItem key={t} value={t}>{cap(t)}</MenuItem>)}
          </Select>
        </FormControl>
      </Stack>

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table size={dense ? 'small' : 'medium'}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 120 }}>Type</TableCell>
              <TableCell>Capacité</TableCell>
              <TableCell sx={{ display:{ xs:'none', md:'table-cell' }}}>Classe</TableCell>
              <TableCell sx={{ width: 90, textAlign:'right', display:{ xs:'none', sm:'table-cell' }}}>Puiss.</TableCell>
              <TableCell sx={{ width: 90, textAlign:'right', display:{ xs:'none', sm:'table-cell' }}}>Préc.</TableCell>
              <TableCell sx={{ width: 80, textAlign:'right', display:{ xs:'none', sm:'table-cell' }}}>PP</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((m) => {
              const color = TYPE_COLOR[m.type || 'normal'] || '#9aa9b0';
              const classFr = CLASS_FR[(m.damage_class || '').toLowerCase()] || '';
              return (
                <TableRow key={m.move_id} hover sx={{ '& td:first-of-type': { borderLeft:`4px solid ${color}88` } }}>
                  <TableCell><TypeChip type={m.type || 'normal'} /></TableCell>
                  <TableCell>
                    <Tooltip arrow title={m.effect ? <Typography variant="body2" sx={{ whiteSpace:'pre-wrap' }}>{m.effect}</Typography> : ''}>
                      <Typography sx={{ fontWeight:700, color }}>{cap(m.name)}</Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell sx={{ display:{ xs:'none', md:'table-cell' }}}>{classFr || '—'}</TableCell>
                  <TableCell sx={{ textAlign:'right', display:{ xs:'none', sm:'table-cell' }}}>{typeof m.power === 'number' ? m.power : '—'}</TableCell>
                  <TableCell sx={{ textAlign:'right', display:{ xs:'none', sm:'table-cell' }}}>{typeof m.accuracy === 'number' ? m.accuracy : '—'}</TableCell>
                  <TableCell sx={{ textAlign:'right', display:{ xs:'none', sm:'table-cell' }}}>{typeof m.pp === 'number' ? m.pp : '—'}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

/* ---------- Page ---------- */
export default function PokemonDetail() {
  const { dex } = useParams();
  const id = Number(dex);

  // state d’abord
  const [tab, setTab] = useState(0);
  const [showShiny, setShowShiny] = useState(false);
  const [view, setView] = useState<'official' | 'home' | 'sd'>('official');
  const [genFilter, setGenFilter] = useState<string>('auto'); // dernière gen par défaut

  const { data, isLoading, error } = useGetPokemonQuery(id);

  // Fallback neutre (évite les undefined durant le fetch)
  const p = data ?? {
    dex: id, name: '', types: [] as string[], sprites: {} as any,
    stats: {} as any, species: {} as any, generation: null, is_legendary: false,
    moves: [] as Move[], learnsets: [] as LearnsetRow[], matchups: {} as Record<string, number>,
  };

  const primaryType = (p.types?.[0] || 'normal') as string;
  const accent = TYPE_COLOR[primaryType] || '#6aa0ff';

  // Index moves par slug
  const moveBySlug = useMemo(
    () => new Map<string, Move>((p.moves || []).map((m: any) => [m.slug, m as Move])),
    [p.moves]
  );

  // Learnsets enrichis
  const enriched: (LearnsetRow & { name: string })[] = useMemo(() => {
    const ls = (p.learnsets as LearnsetRow[]) || [];
    return ls.map(lsr => {
      const gen = lsr.generation || versionGroupToGen(lsr.version_group);
      const nm = moveBySlug.get(lsr.move)?.name || slugToLabel(lsr.move);
      return { ...lsr, generation: gen, name: nm };
    });
  }, [p.learnsets, moveBySlug]);

  const gens = useMemo(
    () => Array.from(new Set(enriched.map(e => e.generation || 0))).sort((a,b)=>a-b),
    [enriched]
  );

  // Par défaut: dernière génération
  useEffect(() => {
    if (genFilter === 'auto' && gens.length) {
      setGenFilter(String(gens[gens.length - 1]));
    }
  }, [gens, genFilter]);

  const flavor = p.species?.flavor_fr || p.species?.flavor_en || '';

  // Matchups
  const parsedMatchups = useMemo(
    () => Object.entries(p.matchups || {}).map(([k, v]) => ({ slug: k.replace(/^vs_/, ''), mult: Number(v) })),
    [p.matchups]
  );
  const weaknesses  = parsedMatchups.filter(x => x.mult > 1).sort((a,b)=>b.mult-a.mult);
  const resistances = parsedMatchups.filter(x => x.mult > 0 && x.mult < 1).sort((a,b)=>a.mult-b.mult);
  const immunities  = parsedMatchups.filter(x => x.mult === 0);

  // Badges
  const badges: string[] = [];
  if (p.is_legendary) badges.push('LÉGENDAIRE');
  if ((p.stats?.spe ?? 0) >= 120) badges.push('SPRINTER');
  if ((p.stats?.atk ?? 0) >= 120 || (p.stats?.spa ?? 0) >= 120) badges.push('COGNEUR');
  if ((p.stats?.def ?? 0) + (p.stats?.spd ?? 0) >= 200) badges.push('MUR');
  if ((p.stats?.total ?? 0) >= 500) badges.push('ÉLITE');
  badges.push(`GEN ${p.generation ?? '?'}`);

  const total = p.stats?.total ?? 0;
  const powerPct = Math.min(100, Math.round((total / 600) * 100));

  // Sprites
  const pick = (
    key: 'official_front' | 'home_front' | 'front',
    shinyKey: 'official_front_shiny' | 'home_front_shiny' | 'front_shiny'
  ) => (showShiny ? (p.sprites?.[shinyKey]) : (p.sprites?.[key]));
  const spriteOfficial = pick('official_front', 'official_front_shiny');
  const spriteHome     = pick('home_front', 'home_front_shiny');
  const spriteFront    = pick('front', 'front_shiny');
  const spriteBack     = showShiny ? p.sprites?.back_shiny : p.sprites?.back;

  if (error) return <Box sx={{ p:3 }}><Typography>Erreur de chargement.</Typography></Box>;
  if (isLoading || !data) return <Box sx={{ p:3 }}><Typography>Chargement…</Typography></Box>;

  /* ---------- Écran gauche ---------- */
  const left = (
    <>
      <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <Typography variant="h4" sx={{ fontWeight:900 }}>
          {cap(p.name)} <Typography component="span" variant="h6" sx={{ opacity:.5 }}>#{p.dex}</Typography>
        </Typography>
        <Stack direction="row" spacing={1} sx={{ flexWrap:'wrap' }}>
          {p.types?.map((t: string) => <TypeChip key={t} type={t} />)}
        </Stack>
      </Box>

      <Box sx={{ mt:1.25, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <FormControlLabel control={<Switch checked={showShiny} onChange={(e)=>setShowShiny(e.target.checked)} />} label="Shiny ✨" sx={{ m:0 }} />
        <ToggleButtonGroup exclusive size="small" value={view} onChange={(_, v)=> v && setView(v)}>
          <ToggleButton value="official">Illustration</ToggleButton>
          <ToggleButton value="home">Home</ToggleButton>
          <ToggleButton value="sd">Sprites</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Fenêtre image */}
      <Box sx={{ mt:1.5, borderRadius: 2, p: 1, background:'#212121', border:'2px solid #000', boxShadow:'inset 0 0 24px rgba(255,255,255,.06)' }}>
        <Box sx={{ background:'linear-gradient(180deg,#e8f5e9,#c8e6c9)', borderRadius:1, minHeight: 240 }}>
          {view === 'official' && <Img src={spriteOfficial} alt="Illustration HD" />}
          {view === 'home'     && <Img src={spriteHome}     alt="Home HD" />}
          {view === 'sd'       &&
              <Box sx={{ display:'flex', gap:1, justifyContent:'center' }}>
                  <Img src={spriteFront} alt="Avant" height={150}/>
                  <Img src={spriteBack}  alt="Arrière" height={150}/>
              </Box>
          }
        </Box>
      </Box>

      {/* Stats + flavor */}
      <Box sx={{ mt:2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight:700, mb:.5 }}>Puissance globale</Typography>
        <Tooltip title={`${total}/600`}><LinearProgress variant="determinate" value={powerPct} sx={{ height:10, borderRadius:5 }} /></Tooltip>
        <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', mt:.5 }}>
          <Stars score={total} /><Typography variant="caption">{total}/600</Typography>
        </Box>

        <Grid container spacing={1.2} sx={{ mt:1 }}>
          <Grid item xs={12} sm={6}>
            <StatBar label="PV" value={p.stats?.hp||0} />
            <StatBar label="Attaque" value={p.stats?.atk||0} />
            <StatBar label="Défense" value={p.stats?.def||0} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <StatBar label="Attaque Spé." value={p.stats?.spa||0} />
            <StatBar label="Défense Spé." value={p.stats?.spd||0} />
            <StatBar label="Vitesse" value={p.stats?.spe||0} />
          </Grid>
        </Grid>

        <Stack direction="row" spacing={1} sx={{ mt:1, flexWrap:'wrap' }}>
          {badges.map((b, i) => <Chip key={i} label={b} size="small" />)}
        </Stack>

        <Typography variant="body2" sx={{ mt:1.25, whiteSpace:'pre-wrap' }}>{flavor}</Typography>
      </Box>
    </>
  );

  /* ---------- Écran droit (scroll interne unique + header sticky) ---------- */
  const right = (
    <Box sx={{ height: '100%', display:'flex', flexDirection:'column', overflow:'auto', minHeight:0 }}>
      {/* Header onglets sticky */}
      <Box sx={{
        position:'sticky', top:0, zIndex:2, px:1.5, pt:1, pb:1,
        background:`linear-gradient(180deg, ${accent}33, #f4f6fb)`,
        borderBottom:'1px solid #cfd8dc'
      }}>
        <Tabs value={tab} onChange={(_,v)=>setTab(v)} variant="scrollable" scrollButtons="auto">
          <Tab label="Aperçu" />
          <Tab label="Capacités" />
          <Tab label="Learnsets" />
          <Tab label="Matchups" />
          <Tab label="Données" />
        </Tabs>
      </Box>

      {/* Contenu onglets */}
      <Box sx={{ p:2, flex:1, minHeight:0 }}>
        {/* APERÇU */}
        {tab===0 && (
          <Card elevation={0} sx={{ bgcolor:'transparent' }}>
            <CardContent sx={{ p:0 }}>
              <Typography variant="h6" sx={{ fontWeight:700, mb:1 }}>Capacités populaires</Typography>
              <MovesTable moves={[...(p.moves||[])]
                .filter(m => typeof m.power === 'number')
                .sort((a,b)=> (b.power||0)-(a.power||0))
                .slice(0,20)} dense />
              <Divider sx={{ my:2 }} />
              <DefensiveTypesPanel matchups={parsedMatchups} />
            </CardContent>
          </Card>
        )}

        {/* CAPACITÉS */}
        {tab===1 && (
          <Card elevation={0} sx={{ bgcolor:'transparent' }}>
            <CardContent sx={{ p:0 }}>
              <Typography variant="h6" sx={{ fontWeight:700, mb:1 }}>Toutes les capacités</Typography>
              <MovesTable moves={(p.moves||[])} />
            </CardContent>
          </Card>
        )}

        {/* LEARNSETS — comme la table des capacités + filtre génération */}
        {tab===2 && (
          <Card elevation={0} sx={{ bgcolor:'transparent' }}>
            <CardContent sx={{ p:0 }}>
              <Box sx={{ display:'flex', alignItems:'center', gap:2, mb:2 }}>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel id="gen-filter-label">Génération</InputLabel>
                  <Select
                    labelId="gen-filter-label"
                    value={genFilter === 'auto' ? (gens.length ? String(gens[gens.length-1]) : 'all') : genFilter}
                    label="Génération"
                    onChange={e => setGenFilter(String(e.target.value))}
                  >
                    <MenuItem value="all">Toutes les générations</MenuItem>
                    {gens.map(g => <MenuItem key={g} value={String(g)}>Génération {g}</MenuItem>)}
                  </Select>
                </FormControl>
                <Typography variant="body2" color="text.secondary">Par défaut : dernière génération disponible.</Typography>
              </Box>

              {(() => {
                const chosen = genFilter === 'all'
                  ? gens
                  : [Number(genFilter === 'auto' ? (gens[gens.length-1] ?? 0) : genFilter)];
                return chosen.map((g)=>{
                  const rows = enriched
                    .filter(e => (e.generation||0)===g)
                    .sort((a,b)=> (a.level_learned_at||999)-(b.level_learned_at||999) || a.name.localeCompare(b.name));
                  if (!rows.length) return null;

                  const moves: Move[] = rows.map(r=>{
                    const mv = moveBySlug.get(r.move);
                    return {
                      move_id: r.move.length + (r.level_learned_at || 0), // clé fallback
                      slug: r.move,
                      name: mv?.name || r.name,
                      type: mv?.type || 'normal',
                      damage_class: mv?.damage_class,
                      power: mv?.power,
                      accuracy: mv?.accuracy,
                      pp: mv?.pp,
                      effect: mv?.effect,
                    };
                  });

                  return (
                    <Box key={g} sx={{ mb:3 }}>
                      <Typography variant="h6" sx={{ fontWeight:700, mb:1 }}>Génération {g}</Typography>
                      <MovesTable moves={moves} />
                    </Box>
                  );
                });
              })()}
            </CardContent>
          </Card>
        )}

        {/* MATCHUPS */}
        {tab===3 && (
          <DefensiveTypesPanel matchups={parsedMatchups} />
        )}

        {/* DONNÉES */}
        {tab===4 && (
          <Card elevation={0} sx={{ bgcolor:'transparent' }}>
            <CardContent sx={{ p:0 }}>
              <Typography variant="h6" sx={{ fontWeight:700, mb:1 }}>Données</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb:1 }}>
                Génération {p.generation ?? '?'} · {p.is_legendary ? 'Légendaire' : 'Standard'}
              </Typography>
              <pre style={{ whiteSpace:'pre-wrap', fontSize:12, background:'#f7f7f9', padding:12, borderRadius:8 }}>
{JSON.stringify({dex:p.dex, name:p.name, types:p.types, stats:p.stats}, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </Box>
    </Box>
  );

  const rightTopBar = (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ color:'#fff' }}>
      <FlashOnIcon fontSize="small" />
      <NumbersIcon fontSize="small" />
      <Typography variant="body2">#{p.dex}</Typography>
      <IconButton component={Link} to="/" size="small" sx={{ color:'#fff' }}>
        <ArrowBackIcon/>
      </IconButton>
    </Stack>
  );

  return (
    <PokedexShell title="Poké-Lakehouse • Pokédex" rightTopBar={rightTopBar} left={left} right={right} />
  );
}
