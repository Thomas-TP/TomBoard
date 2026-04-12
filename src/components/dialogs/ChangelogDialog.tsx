import { useState, useEffect } from 'react';
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
  CircularProgress,
} from '@mui/material';
import NewReleasesIcon from '@mui/icons-material/NewReleases';

interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  highlightVersion?: string;
}

export default function ChangelogDialog({ open, onClose, highlightVersion }: Props) {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    fetch('https://api.github.com/repos/Thomas-TP/TomBoard/releases', {
      headers: { 'Accept': 'application/vnd.github+json' },
    })
      .then(res => {
        if (!res.ok) throw new Error(`GitHub API ${res.status}`);
        return res.json();
      })
      .then((releases: { tag_name: string; published_at: string; body: string | null }[]) => {
        setEntries(
          releases.map(r => ({
            version: r.tag_name.replace(/^v/, ''),
            date: new Date(r.published_at).toLocaleDateString('fr-FR'),
            changes: (r.body ?? '')
              .split('\n')
              .map(l => l.replace(/^[-*]\s*/, '').trim())
              .filter(l => l.length > 0),
          }))
        );
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <NewReleasesIcon color="primary" />
        Notes de version
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={32} />
          </Box>
        )}
        {error && (
          <Box sx={{ px: 3, py: 2 }}>
            <Typography color="error" variant="body2">Impossible de charger les notes de version : {error}</Typography>
          </Box>
        )}
        {!loading && !error && entries.map((entry, i) => {
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
                {isHighlighted && (
                  <Chip
                    label="Actuelle"
                    color="primary"
                    size="small"
                    sx={{ height: 20, fontSize: '0.65rem' }}
                  />
                )}
              </Box>
              {entry.changes.length > 0 ? (
                <Box component="ul" sx={{ m: 0, pl: 2.5, '& li': { mb: 0.5 } }}>
                  {entry.changes.map((change, j) => (
                    <li key={j}>
                      <Typography variant="body2" color="text.secondary">
                        {change}
                      </Typography>
                    </li>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  Aucune note pour cette version.
                </Typography>
              )}
              {i < entries.length - 1 && <Divider sx={{ mt: 2 }} />}
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
