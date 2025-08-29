import React from 'react';
import { Box, Stack, Typography, Chip } from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import BlockIcon from '@mui/icons-material/Block';
import TypeChip from './TypeChip';

type Matchup = { slug: string; mult: number };

type Props = {
  /** Liste des matchups sous la forme [{ slug:'fire', mult:2 }, ...] */
  matchups: Matchup[];
  /** Titre personnalisé (par défaut: "Types (défensif)") */
  title?: string;
};

const approxEq = (a: number, b: number) => Math.abs(a - b) < 1e-6;
const byMult = (list: Matchup[], m: number) =>
  Array.from(new Set(list.filter(x => approxEq(x.mult, m)).map(x => x.slug))); // uniq

function Section({
                   title,
                   icon,
                   color,
                   groups,
                 }: {
  title: string;
  icon: React.ReactNode;
  color: string;
  groups: { label: string; types: string[] }[];
}) {
  const empty = groups.every(g => g.types.length === 0);
  return (
    <Box>
      <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 0.75 }}>
        <Box
          sx={{
            width: 26,
            height: 26,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            bgcolor: `${color}22`,
            color,
          }}
        >
          {icon}
        </Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
          {title}
        </Typography>
      </Stack>

      {empty ? (
        <Typography variant="body2" color="text.secondary">
          —
        </Typography>
      ) : (
        <Stack gap={0.5}>
          {groups.map(g =>
            g.types.length ? (
              <Stack
                key={g.label}
                direction="row"
                alignItems="center"
                gap={1}
                sx={{ flexWrap: 'wrap' }}
              >
                <Chip size="small" label={g.label} variant="outlined" />
                <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                  {g.types.map((t, i) => (
                    <Stack key={t + i} direction="row" gap={0.5} alignItems="center">
                      <TypeChip type={t} />
                    </Stack>
                  ))}
                </Box>
              </Stack>
            ) : null
          )}
        </Stack>
      )}
    </Box>
  );
}

export default function DefensiveTypesPanel({ matchups, title = 'Types (défensif)' }: Props) {
  const weak4 = byMult(matchups, 4);
  const weak2 = byMult(matchups, 2);
  const res05 = byMult(matchups, 0.5);
  const res025 = byMult(matchups, 0.25);
  const immu = byMult(matchups, 0);

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
        {title}
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' },
          gap: 1.25,
        }}
      >
        <Section
          title="Faiblesses"
          icon={<ArrowUpwardIcon fontSize="small" />}
          color="#e53935"
          groups={[
            { label: '×4', types: weak4 },
            { label: '×2', types: weak2 },
          ]}
        />
        <Section
          title="Résistances"
          icon={<ArrowDownwardIcon fontSize="small" />}
          color="#1e88e5"
          groups={[
            { label: '×0.5', types: res05 },
            { label: '×0.25', types: res025 },
          ]}
        />
        <Section
          title="Immunités"
          icon={<BlockIcon fontSize="small" />}
          color="#6d4c41"
          groups={[{ label: '×0', types: immu }]}
        />
      </Box>
    </Box>
  );
}
