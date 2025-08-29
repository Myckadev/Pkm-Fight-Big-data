import { Chip } from '@mui/material';

type Props = {
  type: string;                          // slug PokeAPI: 'fire', 'water', ...
  label?: string;                        // override du libellé (facultatif)
  size?: 'small' | 'medium';
  variant?: 'filled' | 'outlined';
  sx?: any;
};

const TYPE_LABEL_FR: Record<string, string> = {
  normal: 'Normal',
  fire: 'Feu',
  water: 'Eau',
  electric: 'Électrik',
  grass: 'Plante',
  ice: 'Glace',
  fighting: 'Combat',
  poison: 'Poison',
  ground: 'Sol',
  flying: 'Vol',
  psychic: 'Psy',
  bug: 'Insecte',
  rock: 'Roche',
  ghost: 'Spectre',
  dragon: 'Dragon',
  dark: 'Ténèbres',
  steel: 'Acier',
  fairy: 'Fée',
};

const TYPE_COLOR: Record<string, string> = {
  normal:  '#A8A77A',
  fire:    '#EE8130',
  water:   '#6390F0',
  electric:'#F7D02C',
  grass:   '#7AC74C',
  ice:     '#96D9D6',
  fighting:'#C22E28',
  poison:  '#A33EA1',
  ground:  '#E2BF65',
  flying:  '#A98FF3',
  psychic: '#F95587',
  bug:     '#A6B91A',
  rock:    '#B6A136',
  ghost:   '#735797',
  dragon:  '#6F35FC',
  dark:    '#705746',
  steel:   '#B7B7CE',
  fairy:   '#D685AD',
};

function getContrastText(hex: string): string {
  // hex -> #RRGGBB ; calcule une luminance approximative pour décider du contraste
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b);
  return luminance > 160 ? '#fff' : '#fff';
}

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export default function TypeChip({ type, label, size = 'small', variant = 'filled', sx }: Props) {
  const slug = (type || '').toLowerCase();
  const bg = TYPE_COLOR[slug] || '#9aa9b0';
  const textColor = getContrastText(bg);

  // libellé FR par défaut (avec majuscule), ou override si fourni
  const defaultLabel = TYPE_LABEL_FR[slug] || cap(slug.replace(/-/g, ' '));
  const finalLabel = cap(label || defaultLabel);

  const commonSx = {
    fontWeight: 700,
    textTransform: 'none',
    letterSpacing: 0.2,
    ...sx,
  };

  if (variant === 'outlined') {
    return (
      <Chip
        size={size}
        label={finalLabel}
        variant="outlined"
        sx={{
          ...commonSx,
          borderColor: bg,
          color: bg,
          backgroundColor: 'transparent',
        }}
      />
    );
  }

  // filled (par défaut)
  return (
    <Chip
      size={size}
      label={finalLabel}
      sx={{
        ...commonSx,
        backgroundColor: bg,
        color: textColor,
      }}
    />
  );
}
