import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Chip,
  Divider,
  Typography,
} from '@mui/material';
import NewReleasesIcon from '@mui/icons-material/NewReleases';

interface ChangelogEntry {
  version: string;
  date: string;
  tag?: 'new' | 'fix' | 'improvement';
  changes: string[];
}

const CHANGELOG: ChangelogEntry[] = [
  {
    version: '0.1.2',
    date: '2025-07-01',
    tag: 'new',
    changes: [
      'Pitch shifter PSOLA pour modification de voix en temps réel',
      'Égaliseur paramétrique 5 bandes avec préréglages',
      'Mode compact pour afficher plus de sons',
      'Glisser-déposer de fichiers audio depuis l\'explorateur',
      'Annuler / Rétablir (Ctrl+Z / Ctrl+Y)',
      'Fondu entrant et sortant par son',
      'Rognage audio avec éditeur de forme d\'onde',
      'Internationalisation : Français et Anglais',
      'StreamDeck / API HTTP sur le port 47891',
      'Discord Rich Presence',
      'TTS local via Windows Speech Synthesis',
      'Spectrogramme et VU-mètre dans le panneau micro',
      'Cache des formes d\'onde pour chargement instant',
      'Lazy loading des sons hors écran',
      'Frontières d\'erreurs pour éviter les crashes d\'interface',
      'Intégration Freesound pour importer des sons libres',
      'Signature de code Windows (signtool)',
    ],
  },
  {
    version: '0.1.1',
    date: '2025-06-01',
    tag: 'improvement',
    changes: [
      'Sidebar redimensionnable et responsive',
      'Animations de feedback lors du déclenchement d\'un son',
      'Accessibilité ARIA complète',
      'Assistant d\'installation (onboarding wizard)',
      'Bibliothèque de sons en ligne',
    ],
  },
  {
    version: '0.1.0',
    date: '2025-05-01',
    tag: 'new',
    changes: [
      'Première version publique de TomBoard',
      'Grille et liste de sons avec profils et catégories',
      'Raccourcis clavier globaux',
      'Thème clair / sombre / personnalisé',
      'Sortie audio double (VB-Cable)',
      'Passthrough microphone',
      'Enregistrement de sons depuis le micro',
    ],
  },
];

const tagColors: Record<string, 'success' | 'warning' | 'info'> = {
  new: 'success',
  fix: 'warning',
  improvement: 'info',
};

const tagLabels: Record<string, string> = {
  new: 'Nouveau',
  fix: 'Correctif',
  improvement: 'Amélioration',
};

interface Props {
  open: boolean;
  onClose: () => void;
  highlightVersion?: string;
}

export default function ChangelogDialog({ open, onClose, highlightVersion }: Props) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <NewReleasesIcon color="primary" />
        Notes de version
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        {CHANGELOG.map((entry, i) => {
          const isHighlighted = highlightVersion === entry.version;
          return (
            <Box
              key={entry.version}
              sx={{
                px: 3,
                py: 2.5,
                bgcolor: isHighlighted ? 'action.selected' : 'transparent',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  v{entry.version}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {entry.date}
                </Typography>
                {entry.tag && (
                  <Chip
                    label={tagLabels[entry.tag]}
                    color={tagColors[entry.tag]}
                    size="small"
                    sx={{ height: 20, fontSize: '0.65rem' }}
                  />
                )}
                {isHighlighted && (
                  <Chip
                    label="Actuelle"
                    color="primary"
                    size="small"
                    sx={{ height: 20, fontSize: '0.65rem' }}
                  />
                )}
              </Box>
              <Box component="ul" sx={{ m: 0, pl: 2.5, '& li': { mb: 0.5 } }}>
                {entry.changes.map((change, j) => (
                  <li key={j}>
                    <Typography variant="body2" color="text.secondary">
                      {change}
                    </Typography>
                  </li>
                ))}
              </Box>
              {i < CHANGELOG.length - 1 && <Divider sx={{ mt: 2 }} />}
            </Box>
          );
        })}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
}
