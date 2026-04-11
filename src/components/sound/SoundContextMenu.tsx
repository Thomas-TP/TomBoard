import {
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Edit,
  ContentCopy,
  Star,
  StarBorder,
  Repeat,
  RepeatOne,
  Delete,
  Keyboard,
} from '@mui/icons-material';
import { Sound } from '../../types';
import { useAppStore } from '../../stores/appStore';

interface SoundContextMenuProps {
  anchorPosition: { top: number; left: number } | null;
  sound: Sound | null;
  onClose: () => void;
  onEdit: (sound: Sound) => void;
}

export default function SoundContextMenu({
  anchorPosition,
  sound,
  onClose,
  onEdit,
}: SoundContextMenuProps) {
  const toggleFavorite = useAppStore(s => s.toggleFavorite);
  const updateSound = useAppStore(s => s.updateSound);
  const deleteSound = useAppStore(s => s.deleteSound);
  const addSound = useAppStore(s => s.addSound);

  if (!sound) return null;

  const handleEdit = () => {
    onEdit(sound);
    onClose();
  };

  const handleDuplicate = async () => {
    try {
      await addSound(sound.name + ' (copie)', sound.filePath, sound.category);
    } catch (e) {
      console.error('Failed to duplicate:', e);
    }
    onClose();
  };

  const handleToggleFavorite = () => {
    toggleFavorite(sound.id);
    onClose();
  };

  const handleToggleLoop = async () => {
    await updateSound({ ...sound, isLooping: !sound.isLooping });
    onClose();
  };

  const handleDelete = () => {
    deleteSound(sound.id);
    onClose();
  };

  return (
    <Menu
      open={Boolean(anchorPosition)}
      onClose={onClose}
      anchorReference="anchorPosition"
      anchorPosition={anchorPosition ?? undefined}
      slotProps={{
        paper: {
          sx: {
            borderRadius: '12px',
            minWidth: 200,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          },
        },
      }}
    >
      <MenuItem onClick={handleEdit} sx={{ borderRadius: '8px', mx: 0.5, fontSize: '0.82rem' }}>
        <ListItemIcon><Edit sx={{ fontSize: 17 }} /></ListItemIcon>
        <ListItemText>Modifier</ListItemText>
      </MenuItem>

      <MenuItem onClick={handleDuplicate} sx={{ borderRadius: '8px', mx: 0.5, fontSize: '0.82rem' }}>
        <ListItemIcon><ContentCopy sx={{ fontSize: 17 }} /></ListItemIcon>
        <ListItemText>Dupliquer</ListItemText>
      </MenuItem>

      <Divider sx={{ my: 0.5, opacity: 0.5 }} />

      <MenuItem onClick={handleToggleFavorite} sx={{ borderRadius: '8px', mx: 0.5, fontSize: '0.82rem' }}>
        <ListItemIcon>
          {sound.isFavorite
            ? <Star sx={{ fontSize: 17, color: '#FBBF24' }} />
            : <StarBorder sx={{ fontSize: 17 }} />
          }
        </ListItemIcon>
        <ListItemText>{sound.isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}</ListItemText>
      </MenuItem>

      <MenuItem onClick={handleToggleLoop} sx={{ borderRadius: '8px', mx: 0.5, fontSize: '0.82rem' }}>
        <ListItemIcon>
          {sound.isLooping
            ? <RepeatOne sx={{ fontSize: 17, color: 'primary.main' }} />
            : <Repeat sx={{ fontSize: 17 }} />
          }
        </ListItemIcon>
        <ListItemText>{sound.isLooping ? 'Désactiver la boucle' : 'Activer la boucle'}</ListItemText>
      </MenuItem>

      {sound.hotkey && (
        <MenuItem disabled sx={{ borderRadius: '8px', mx: 0.5, fontSize: '0.82rem' }}>
          <ListItemIcon><Keyboard sx={{ fontSize: 17 }} /></ListItemIcon>
          <ListItemText>{sound.hotkey}</ListItemText>
        </MenuItem>
      )}

      <Divider sx={{ my: 0.5, opacity: 0.5 }} />

      <MenuItem
        onClick={handleDelete}
        sx={{
          borderRadius: '8px',
          mx: 0.5,
          fontSize: '0.82rem',
          color: 'error.main',
          '&:hover': { bgcolor: 'rgba(255, 107, 107, 0.1)' },
        }}
      >
        <ListItemIcon><Delete sx={{ fontSize: 17, color: 'inherit' }} /></ListItemIcon>
        <ListItemText>Supprimer</ListItemText>
      </MenuItem>
    </Menu>
  );
}
