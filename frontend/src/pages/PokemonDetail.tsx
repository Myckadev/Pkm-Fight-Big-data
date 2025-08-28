import { useParams, Link } from 'react-router-dom';
import { useGetPokemonQuery } from '../api/pokedex';
import { Box, Container, Typography, Chip, Grid, Card, CardContent, Divider } from '@mui/material';
import TypeChip from '../components/TypeChip';
import StatBar from '../components/StatBar';

export default function PokemonDetail() {
  const { dex } = useParams();
  const id = Number(dex);
  const { data, isLoading, error } = useGetPokemonQuery(id);

  if (isLoading) return <Container sx={{ py:3 }}><Typography>Chargement…</Typography></Container>;
  if (error || !data) return <Container sx={{ py:3 }}><Typography>Introuvable.</Typography></Container>;

  const p = data;
  return (
    <Container sx={{ py:3 }}>
      <Typography variant="h4" sx={{ fontWeight:800, mb:2 }}>
        {p.name} <Typography component="span" color="text.secondary">#{p.dex}</Typography>
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display:'flex', gap:2, justifyContent:'center' }}>
                {p.sprites.front && <img src={p.sprites.front} style={{ imageRendering:'pixelated' }} />}
                {p.sprites.back && <img src={p.sprites.back} style={{ imageRendering:'pixelated' }} />}
              </Box>
              <Box sx={{ mt:2, display:'flex', gap:1, justifyContent:'center' }}>
                {p.types.map(t=> <TypeChip key={t} type={t} />)}
              </Box>
              <Box sx={{ mt:2, display:'flex', gap:1, justifyContent:'center' }}>
                <Chip label={`HP ${p.stats.hp}`} size="small" />
                <Chip label={`ATK ${p.stats.atk}`} size="small" />
                <Chip label={`SPA ${p.stats.spa}`} size="small" />
                <Chip label={`SPE ${p.stats.spe}`} size="small" />
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ mt:2 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb:1, fontWeight:700 }}>Stats</Typography>
              <StatBar label="HP" value={p.stats.hp} />
              <StatBar label="ATK" value={p.stats.atk} />
              <StatBar label="DEF" value={p.stats.def} />
              <StatBar label="SPA" value={p.stats.spa} />
              <StatBar label="SPD" value={p.stats.spd} />
              <StatBar label="SPE" value={p.stats.spe} />
              <Divider sx={{ my:1 }} />
              <Typography variant="body2">Total: <b>{p.stats.total}</b></Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight:700 }}>Description (FR)</Typography>
              <Typography variant="body2" sx={{ whiteSpace:'pre-line', mb:2 }}>
                {p.species?.flavor_fr || '—'}
              </Typography>
              <Typography variant="h6" sx={{ fontWeight:700 }}>Description (EN)</Typography>
              <Typography variant="body2" sx={{ whiteSpace:'pre-line' }}>
                {p.species?.flavor_en || '—'}
              </Typography>
            </CardContent>
          </Card>

          <Grid container spacing={2} sx={{ mt:1 }}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight:700 }}>Moves</Typography>
                  <Box sx={{ display:'grid', gridTemplateColumns:'1fr 60px 90px', gap:'6px', mt:1, maxHeight:360, overflowY:'auto' }}>
                    {p.moves.map(m=> (
                      <Box key={m.name} sx={{ display:'contents' }}>
                        <Box><Link to={`/moves?search=${m.name}`}>{m.name}</Link></Box>
                        <Box><TypeChip type={m.type}/></Box>
                        <Box>{m.damage_class} · {m.power ?? '—'} / {m.accuracy ?? '—'}</Box>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight:700 }}>Learnsets</Typography>
                  <Box sx={{ fontSize:14, maxHeight:360, overflowY:'auto', mt:1 }}>
                    {p.learnsets.map((l, i)=>(
                      <Box key={i} sx={{ display:'flex', gap:1, mb:0.5 }}>
                        <Chip size="small" label={l.version_group} />
                        <Chip size="small" label={l.learn_method} />
                        <Box>{l.level_learned_at ? `lvl ${l.level_learned_at}` : '—'}</Box>
                        <Box sx={{ fontWeight:600 }}>{l.move}</Box>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card sx={{ mt:2 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight:700 }}>Matchups</Typography>
              <Box sx={{ display:'flex', flexWrap:'wrap', gap:1, mt:1 }}>
                {Object.entries(p.matchups).map(([k,v])=>(
                  <Chip key={k} label={`${k.replace('vs_','')} x${v}`} />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}
