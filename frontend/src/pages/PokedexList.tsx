import { useMemo, useState } from 'react';
import { useGetPokemonListQuery } from '../api/pokedex';
import { Box, Container, Grid, Card, CardActionArea, CardContent, Typography, TextField, MenuItem, Pagination, Chip } from '@mui/material';
import { Link, useSearchParams } from 'react-router-dom';
import TypeChip from '../components/TypeChip';

const types = ['','normal','fire','water','electric','grass','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy'];
const gens = ['','1','2','3','4','5','6','7'];

export default function PokedexList() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('q') || '');
  const [type, setType] = useState(params.get('type') || '');
  const [gen, setGen] = useState(params.get('gen') || '');
  const [legendary, setLegendary] = useState(params.get('leg') === '1');
  const page = parseInt(params.get('p')||'1',10);

  const query = useMemo(()=>({
    search: search || undefined,
    type: type || undefined,
    generation: gen || undefined,
    legendary: legendary || undefined,
    page,
    page_size: 30
  }), [search,type,gen,legendary,page]);

  const { data, isLoading } = useGetPokemonListQuery(query);

  const onFilterChange = () => {
    const p = new URLSearchParams();
    if (search) p.set('q', search);
    if (type) p.set('type', type);
    if (gen) p.set('gen', gen);
    if (legendary) p.set('leg','1');
    p.set('p','1');
    setParams(p);
  };

  return (
    <Container sx={{ py:3 }}>
      <Typography variant="h4" sx={{ mb:2, fontWeight:800 }}>Pokédex</Typography>

      <Box sx={{ display:'grid', gridTemplateColumns:'1fr 200px 160px 140px', gap:2, mb:2 }}>
        <TextField label="Recherche" value={search} onChange={e=>setSearch(e.target.value)} onBlur={onFilterChange} size="small" />
        <TextField label="Type" select value={type} onChange={e=>{ setType(e.target.value); onFilterChange(); }} size="small">
          {types.map(t=> <MenuItem key={t} value={t}>{t||'Tous'}</MenuItem>)}
        </TextField>
        <TextField label="Génération" select value={gen} onChange={e=>{ setGen(e.target.value); onFilterChange(); }} size="small">
          {gens.map(g=> <MenuItem key={g} value={g}>{g||'Toutes'}</MenuItem>)}
        </TextField>
        <TextField label="Légendaire" select value={legendary ? '1':'0'} onChange={e=>{ setLegendary(e.target.value==='1'); onFilterChange(); }} size="small">
          <MenuItem value="0">Tous</MenuItem>
          <MenuItem value="1">Oui</MenuItem>
        </TextField>
      </Box>

      {isLoading && <Typography>Chargement…</Typography>}

      <Grid container spacing={2}>
        {data?.results.map(p => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={p.pokedex_number}>
            <Card variant="outlined" sx={{ height:'100%' }}>
              <CardActionArea component={Link} to={`/pokemon/${p.pokedex_number}`} sx={{ display:'flex', alignItems:'stretch', height:'100%' }}>
                <Box sx={{ width:120, display:'flex', alignItems:'center', justifyContent:'center', p:2 }}>
                  {p.sprite_front ? <img src={`${p.sprite_front}`} style={{ width:'96px', imageRendering:'pixelated' }}/> : <Box sx={{ width:96, height:96, bgcolor:'#eee' }}/>}
                </Box>
                <CardContent sx={{ flex:1 }}>
                  <Typography variant="h6" sx={{ fontWeight:800 }}>{p.name} <Typography component="span" color="text.secondary">#{p.pokedex_number}</Typography></Typography>
                  <Box sx={{ display:'flex', gap:1, mt:1 }}>
                    <TypeChip type={p.type1} />
                    {p.type2 ? <TypeChip type={p.type2} /> : null}
                  </Box>
                  <Box sx={{ mt:1, display:'flex', gap:1, flexWrap:'wrap' }}>
                    {p.is_legendary && <Chip size="small" label="Legendary" color="warning" />}
                    <Chip size="small" label={`Gen ${p.generation}`} />
                    <Chip size="small" label={`Total ${p.total_stats}`} />
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      {data && (
        <Box sx={{ display:'flex', justifyContent:'center', my:3 }}>
          <Pagination
            page={data.page}
            count={Math.max(1, Math.ceil(data.total / data.page_size))}
            onChange={(_, p)=>{ params.set('p', String(p)); setParams(params); }}
          />
        </Box>
      )}
    </Container>
  );
}
