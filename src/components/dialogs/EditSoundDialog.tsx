import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Switch,
  FormControlLabel,
  Chip,
  Popover,
  Grid,
  Slider,
  Divider,
  InputAdornment,
} from '@mui/material';
import {
  Close,
  Keyboard,
  Backspace,
} from '@mui/icons-material';
import { Sound } from '../../types';
import { useAppStore } from '../../stores/appStore';

interface EditSoundDialogProps {
  open: boolean;
  onClose: () => void;
  sound: Sound | null;
}

const EMOJI_LIST = [
  '🔊', '🎵', '🎶', '🎤', '🎧', '🎸', '🥁', '🎹', '🎺', '🎷',
  '🔔', '📢', '💥', '💣', '🔥', '⚡', '✨', '🎉', '🎊', '🎭',
  '👀', '👋', '👏', '💀', '👻', '😂', '😱', '🤣', '😎', '🤡',
  '🐸', '🦆', '🐱', '🐶', '🦊', '🐺', '🦁', '🐻', '🐼', '🐵',
  '🚀', '🏆', '⚽', '🎮', '🕹️', '🗡️', '🛡️', '🏹', '💎', '🪙',
  '❤️', '💜', '💙', '💚', '💛', '🧡', '🖤', '🤍', '💔', '💖',
];

const COLOR_PALETTE = [
  '#6750A4', '#D32F2F', '#F57C00', '#388E3C', '#1976D2',
  '#7B1FA2', '#C2185B', '#00796B', '#455A64', '#E64A19',
  '#5C6BC0', '#26A69A', '#EC407A', '#AB47BC', '#FFA726',
  '#42A5F5', '#66BB6A', '#EF5350', '#8D6E63', '#78909C',
];

export default function EditSoundDialog({ open, onClose, sound }: EditSoundDialogProps) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🔊');
  const [color, setColor] = useState('#6750A4');
  const [category, setCategory] = useState('all');
  const [volume, setVolume] = useState(1);
  const [speed, setSpeed] = useState(1);
  const [isLooping, setIsLooping] = useState(false);
  const [hotkey, setHotkey] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [recordingHotkey, setRecordingHotkey] = useState(false);

  const [emojiAnchor, setEmojiAnchor] = useState<HTMLElement | null>(null);
  const [colorAnchor, setColorAnchor] = useState<HTMLElement | null>(null);

  const updateSound = useAppStore(s => s.updateSound);
  const data = useAppStore(s => s.data);
  const profile = data?.profiles.find(p => p.id === data.settings.activeProfileId);
  const categories = profile?.categories ?? [];

  useEffect(() => {
    if (sound) {
      setName(sound.name);
      setIcon(sound.icon);
      setColor(sound.color);
      setCategory(sound.category);
      setVolume(sound.volume);
      setSpeed(sound.speed ?? 1);
      setIsLooping(sound.isLooping);
      setHotkey(sound.hotkey);
      setTags([...sound.tags]);
    }
  }, [sound]);

  const handleSave = async () => {
    if (!sound || !name.trim()) return;
    await updateSound({
      ...sound,
      name: name.trim(),
      icon,
      color,
      category,
      volume,
      speed,
      isLooping,
      hotkey,
      tags,
    });
    onClose();
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!recordingHotkey) return;
    e.preventDefault();
    e.stopPropagation();

    const parts: string[] = [];
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.shiftKey) parts.push('Shift');
    if (e.altKey) parts.push('Alt');

    const key = e.key;
    if (!['Control', 'Shift', 'Alt', 'Meta'].includes(key)) {
      parts.push(key.length === 1 ? key.toUpperCase() : key);
      setHotkey(parts.join('+'));
      setRecordingHotkey(false);
    }
  }, [recordingHotkey]);

  useEffect(() => {
    if (recordingHotkey) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [recordingHotkey, handleKeyDown]);

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
    }
    setTagInput('');
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: { sx: { borderRadius: 3, bgcolor: 'background.paper' } },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>
          Modifier le son
        </Typography>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
          {/* Icon & Color row */}
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            {/* Icon selector */}
            <Box
              onClick={e => setEmojiAnchor(e.currentTarget)}
              sx={{
                width: 64,
                height: 64,
                borderRadius: 3,
                bgcolor: color + '22',
                border: 2,
                borderColor: color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '2rem',
                transition: 'all 0.2s',
                '&:hover': { transform: 'scale(1.05)' },
              }}
            >
              {icon}
            </Box>

            {/* Name */}
            <TextField
              label="Nom du son"
              value={name}
              onChange={e => setName(e.target.value)}
              fullWidth
              variant="outlined"
              size="small"
            />

            {/* Color selector */}
            <Box
              onClick={e => setColorAnchor(e.currentTarget)}
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: color,
                cursor: 'pointer',
                border: 2,
                borderColor: 'divider',
                flexShrink: 0,
                transition: 'transform 0.2s',
                '&:hover': { transform: 'scale(1.1)' },
              }}
            />
          </Box>

          {/* Emoji picker popover */}
          <Popover
            open={Boolean(emojiAnchor)}
            anchorEl={emojiAnchor}
            onClose={() => setEmojiAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          >
            <Box sx={{ p: 2, width: 280 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Choisir une icône
              </Typography>
              <Grid container spacing={0.5}>
                {EMOJI_LIST.map(emoji => (
                  <Grid key={emoji} size={{ xs: 'auto' }}>
                    <Box
                      onClick={() => { setIcon(emoji); setEmojiAnchor(null); }}
                      sx={{
                        width: 36,
                        height: 36,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 1,
                        cursor: 'pointer',
                        fontSize: '1.2rem',
                        '&:hover': { bgcolor: 'action.hover' },
                        bgcolor: icon === emoji ? 'primary.main' : 'transparent',
                      }}
                    >
                      {emoji}
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Popover>

          {/* Color picker popover */}
          <Popover
            open={Boolean(colorAnchor)}
            anchorEl={colorAnchor}
            onClose={() => setColorAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          >
            <Box sx={{ p: 2, width: 240 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Choisir une couleur
              </Typography>
              <Grid container spacing={0.5}>
                {COLOR_PALETTE.map(c => (
                  <Grid key={c} size={{ xs: 'auto' }}>
                    <Box
                      onClick={() => { setColor(c); setColorAnchor(null); }}
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: 1,
                        bgcolor: c,
                        cursor: 'pointer',
                        border: color === c ? '2px solid white' : '2px solid transparent',
                        '&:hover': { transform: 'scale(1.15)' },
                        transition: 'transform 0.15s',
                      }}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Popover>

          {/* Category */}
          <FormControl size="small" fullWidth>
            <InputLabel>Catégorie</InputLabel>
            <Select
              value={category}
              onChange={e => setCategory(e.target.value)}
              label="Catégorie"
            >
              {categories.map(cat => (
                <MenuItem key={cat.id} value={cat.id}>
                  {cat.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Divider />

          {/* Volume */}
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
              Volume — {Math.round(volume * 100)}%
            </Typography>
            <Slider
              value={volume}
              onChange={(_, v) => setVolume(v as number)}
              min={0}
              max={1}
              step={0.01}
              size="small"
            />
          </Box>

          {/* Loop toggle */}
          <FormControlLabel
            control={
              <Switch
                checked={isLooping}
                onChange={e => setIsLooping(e.target.checked)}
                color="primary"
              />
            }
            label={
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                Lecture en boucle
              </Typography>
            }
          />

          {/* Speed control */}
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
              Vitesse — {speed.toFixed(2)}x
            </Typography>
            <Slider
              value={speed}
              onChange={(_, v) => setSpeed(v as number)}
              min={0.25}
              max={2.5}
              step={0.05}
              size="small"
              marks={[
                { value: 0.5, label: '0.5x' },
                { value: 1, label: '1x' },
                { value: 1.5, label: '1.5x' },
                { value: 2, label: '2x' },
              ]}
            />
          </Box>

          <Divider />

          {/* Hotkey */}
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
              Raccourci clavier
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField
                value={recordingHotkey ? '⏳ Appuyez sur une touche...' : (hotkey ?? 'Aucun')}
                size="small"
                fullWidth
                slotProps={{
                  input: {
                    readOnly: true,
                    startAdornment: (
                      <InputAdornment position="start">
                        <Keyboard sx={{ fontSize: 18, color: 'text.secondary' }} />
                      </InputAdornment>
                    ),
                  },
                }}
                onClick={() => setRecordingHotkey(true)}
                sx={{
                  cursor: 'pointer',
                  '& .MuiInputBase-input': { cursor: 'pointer' },
                  ...(recordingHotkey && {
                    '& .MuiOutlinedInput-root': {
                      borderColor: 'primary.main',
                      boxShadow: '0 0 0 2px rgba(103, 80, 164, 0.3)',
                    },
                  }),
                }}
              />
              {hotkey && (
                <IconButton
                  size="small"
                  onClick={() => { setHotkey(null); setRecordingHotkey(false); }}
                >
                  <Backspace sx={{ fontSize: 18 }} />
                </IconButton>
              )}
            </Box>
          </Box>

          {/* Tags */}
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
              Tags
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
              {tags.map(tag => (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  onDelete={() => setTags(tags.filter(t => t !== tag))}
                  sx={{ borderRadius: 2 }}
                />
              ))}
            </Box>
            <TextField
              placeholder="Ajouter un tag..."
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); addTag(); }
              }}
              size="small"
              fullWidth
            />
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          Annuler
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!name.trim()}
          sx={{ borderRadius: 3, px: 3 }}
        >
          Sauvegarder
        </Button>
      </DialogActions>
    </Dialog>
  );
}
