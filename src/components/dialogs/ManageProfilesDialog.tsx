import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  TextField,
  Avatar,
  Tooltip,
  Menu,
  MenuItem,
  Divider,
} from '@mui/material';
import {
  Add,
  MoreVert,
  Edit,
  Delete,
  ContentCopy,
  CheckCircle,
  Person,
} from '@mui/icons-material';
import { useAppStore } from '../../stores/appStore';

interface ManageProfilesDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function ManageProfilesDialog({ open, onClose }: ManageProfilesDialogProps) {
  const data = useAppStore(s => s.data);
  const addProfile = useAppStore(s => s.addProfile);
  const switchProfile = useAppStore(s => s.switchProfile);
  const renameProfile = useAppStore(s => s.renameProfile);
  const deleteProfile = useAppStore(s => s.deleteProfile);
  const duplicateProfile = useAppStore(s => s.duplicateProfile);

  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement; profileId: string } | null>(null);

  const profiles = data?.profiles ?? [];
  const activeId = data?.settings.activeProfileId;

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    await addProfile(name);
    setNewName('');
  };

  const handleRename = async (id: string) => {
    const name = editName.trim();
    if (!name) return;
    await renameProfile(id, name);
    setEditingId(null);
    setEditName('');
  };

  const handleDelete = async (id: string) => {
    setMenuAnchor(null);
    await deleteProfile(id);
  };

  const handleDuplicate = async (id: string) => {
    setMenuAnchor(null);
    const source = profiles.find(p => p.id === id);
    if (source) {
      await duplicateProfile(id, `${source.name} (copie)`);
    }
  };

  const startEditing = (id: string) => {
    setMenuAnchor(null);
    const profile = profiles.find(p => p.id === id);
    if (profile) {
      setEditingId(id);
      setEditName(profile.name);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: 3, bgcolor: 'background.paper' } } }}
    >
      <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}><Person sx={{ fontSize: 22 }} /> Profils</DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        <List dense>
          {profiles.map(profile => (
            <ListItemButton
              key={profile.id}
              selected={profile.id === activeId}
              onClick={() => switchProfile(profile.id)}
              sx={{
                py: 1.5,
                '&.Mui-selected': {
                  bgcolor: 'action.selected',
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <Avatar sx={{ width: 30, height: 30, fontSize: '0.8rem', bgcolor: profile.id === activeId ? 'primary.main' : 'action.hover' }}>
                  {profile.name[0]?.toUpperCase()}
                </Avatar>
              </ListItemIcon>

              {editingId === profile.id ? (
                <TextField
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleRename(profile.id);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  onBlur={() => handleRename(profile.id)}
                  size="small"
                  autoFocus
                  sx={{ flex: 1 }}
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <ListItemText
                  primary={profile.name}
                  secondary={`${profile.sounds.length} son${profile.sounds.length > 1 ? 's' : ''} · ${profile.categories.length} catégorie${profile.categories.length > 1 ? 's' : ''}`}
                  slotProps={{
                    primary: { sx: { fontWeight: profile.id === activeId ? 700 : 500 } },
                    secondary: { sx: { fontSize: '0.7rem' } },
                  }}
                />
              )}

              <ListItemSecondaryAction>
                {profile.id === activeId && (
                  <CheckCircle sx={{ fontSize: 16, color: 'primary.main', mr: 0.5 }} />
                )}
                <IconButton
                  size="small"
                  onClick={e => {
                    e.stopPropagation();
                    setMenuAnchor({ el: e.currentTarget, profileId: profile.id });
                  }}
                >
                  <MoreVert sx={{ fontSize: 18 }} />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItemButton>
          ))}
        </List>

        <Divider />

        {/* Add new profile */}
        <Box sx={{ display: 'flex', gap: 1, p: 2, alignItems: 'center' }}>
          <TextField
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Nouveau profil..."
            size="small"
            fullWidth
          />
          <Tooltip title="Ajouter">
            <span>
              <IconButton
                onClick={handleAdd}
                disabled={!newName.trim()}
                color="primary"
                size="small"
              >
                <Add />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="contained">Fermer</Button>
      </DialogActions>

      {/* Context menu */}
      <Menu
        anchorEl={menuAnchor?.el}
        open={!!menuAnchor}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem onClick={() => menuAnchor && startEditing(menuAnchor.profileId)}>
          <Edit sx={{ fontSize: 18, mr: 1 }} /> Renommer
        </MenuItem>
        <MenuItem onClick={() => menuAnchor && handleDuplicate(menuAnchor.profileId)}>
          <ContentCopy sx={{ fontSize: 18, mr: 1 }} /> Dupliquer
        </MenuItem>
        {profiles.length > 1 && (
          <MenuItem
            onClick={() => menuAnchor && handleDelete(menuAnchor.profileId)}
            sx={{ color: 'error.main' }}
          >
            <Delete sx={{ fontSize: 18, mr: 1 }} /> Supprimer
          </MenuItem>
        )}
      </Menu>
    </Dialog>
  );
}
