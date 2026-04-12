import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { Close, Add } from '@mui/icons-material';
import { useAppStore } from '../../stores/appStore';
import { ICON_OPTIONS, renderCategoryIcon } from '../../utils/icons';
import { useI18n } from '../../i18n/I18nProvider';

interface ManageCategoriesDialogProps {
  open: boolean;
  onClose: () => void;
}

const COLOR_PALETTE = [
  '#6750A4', '#D32F2F', '#F57C00', '#388E3C', '#1976D2',
  '#7B1FA2', '#C2185B', '#00796B', '#455A64', '#E64A19',
];

export default function ManageCategoriesDialog({ open, onClose }: ManageCategoriesDialogProps) {
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('apps');
  const [newColor, setNewColor] = useState('#6750A4');

  const data = useAppStore(s => s.data);
  const addCategory = useAppStore(s => s.addCategory);

  const profile = data?.profiles.find(p => p.id === data.settings.activeProfileId);
  const categories = profile?.categories ?? [];
  const { t } = useI18n();

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await addCategory(newName.trim(), newIcon, newColor);
    setNewName('');
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: { sx: { borderRadius: 4, bgcolor: 'background.paper' } },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {t('categories')}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {/* Existing categories */}
          <List dense>
            {categories.map(cat => (
              <ListItem key={cat.id} sx={{ borderRadius: 2, bgcolor: 'action.hover', mb: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: 1,
                      bgcolor: cat.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.9rem',
                      color: 'white',
                    }}
                  >
                    {renderCategoryIcon(cat.icon, { sx: { fontSize: 16 } })}
                  </Box>
                </ListItemIcon>
                <ListItemText
                  primary={cat.name}
                  slotProps={{ primary: { sx: { fontWeight: 500, fontSize: '0.85rem' } } }}
                />
                {cat.id !== 'all' && (
                  <Typography variant="caption" color="text.secondary">
                    {profile?.sounds.filter(s => s.category === cat.id).length ?? 0} sons
                  </Typography>
                )}
              </ListItem>
            ))}
          </List>

          {/* Add new category */}
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {t('newCategory')}
          </Typography>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField
              placeholder={t('categoryNamePlaceholder')}
              value={newName}
              onChange={e => setNewName(e.target.value)}
              size="small"
              sx={{ flex: 1 }}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
            />
            <Button
              onClick={handleAdd}
              variant="contained"
              size="small"
              disabled={!newName.trim()}
              startIcon={<Add />}
              sx={{ borderRadius: 2 }}
            >
              {t('add')}
            </Button>
          </Box>

          {/* Icon picker */}
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
              {t('iconLabel')} {renderCategoryIcon(newIcon, { sx: { fontSize: 20 } })}
            </Typography>
            <Grid container spacing={0.5}>
              {ICON_OPTIONS.map(opt => (
                <Grid key={opt.id} size={{ xs: 'auto' }}>
                  <Box
                    onClick={() => setNewIcon(opt.id)}
                    sx={{
                      width: 36,
                      height: 36,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 1,
                      cursor: 'pointer',
                      bgcolor: newIcon === opt.id ? 'primary.main' : 'transparent',
                      color: newIcon === opt.id ? 'primary.contrastText' : 'inherit',
                      '&:hover': { bgcolor: 'action.hover' },
                      fontSize: '1.1rem',
                    }}
                    title={opt.label}
                  >
                    {renderCategoryIcon(opt.id, { sx: { fontSize: 20 } })}
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* Color picker */}
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
              {t('colorLabel')}
            </Typography>
            <Grid container spacing={0.5}>
              {COLOR_PALETTE.map(c => (
                <Grid key={c} size={{ xs: 'auto' }}>
                  <Box
                    onClick={() => setNewColor(c)}
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: 1,
                      bgcolor: c,
                      cursor: 'pointer',
                      border: newColor === c ? '2px solid white' : '2px solid transparent',
                      '&:hover': { transform: 'scale(1.15)' },
                      transition: 'transform 0.15s',
                    }}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="contained" sx={{ borderRadius: 3 }}>
          {t('close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
