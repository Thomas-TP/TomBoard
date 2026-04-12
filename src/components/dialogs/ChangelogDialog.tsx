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
import ReactMarkdown from 'react-markdown';
import { useI18n } from '../../i18n/I18nProvider';

interface ChangelogEntry {
  version: string;
  date: string;
  body: string;
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
  const { t } = useI18n();

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
            body: r.body ?? '',
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
        {t('changelog')}
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={32} />
          </Box>
        )}
        {error && (
          <Box sx={{ px: 3, py: 2 }}>
            <Typography color="error" variant="body2">{t('loadingReleaseNotes')} {error}</Typography>
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
                    label={t('current')}
                    color="primary"
                    size="small"
                    sx={{ height: 20, fontSize: '0.65rem' }}
                  />
                )}
              </Box>
              {entry.body ? (
                <Box
                  sx={{
                    '& h1, & h2, & h3': { fontSize: '0.9rem', fontWeight: 700, mt: 1, mb: 0.5, color: 'text.primary' },
                    '& p': { fontSize: '0.82rem', color: 'text.secondary', my: 0.5, lineHeight: 1.6 },
                    '& ul, & ol': { m: 0, pl: 2.5, '& li': { mb: 0.25, fontSize: '0.82rem', color: 'text.secondary' } },
                    '& code': { fontSize: '0.78rem', bgcolor: 'action.hover', px: 0.5, py: 0.1, borderRadius: '4px' },
                    '& strong': { color: 'text.primary', fontWeight: 600 },
                    '& a': { color: 'primary.main' },
                  }}
                >
                  <ReactMarkdown>{entry.body}</ReactMarkdown>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  {t('noNotesForVersion')}
                </Typography>
              )}
              {i < entries.length - 1 && <Divider sx={{ mt: 2 }} />}
            </Box>
          );
        })}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          {t('close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
