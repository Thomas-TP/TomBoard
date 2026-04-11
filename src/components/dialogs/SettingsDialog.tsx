import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogActions,
  Button,
  Box,
  Typography,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  Slider,
  Divider,
  TextField,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Grid,
  Avatar,
  Tooltip,
  Menu,
  LinearProgress,
  Alert,
  ListItemButton,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  DarkMode,
  LightMode,
  VolumeUp,
  Folder,
  Palette,
  FolderOpen,
  Close,
  Add,
  Delete,
  DragIndicator,
  MoreVert,
  Edit,
  ContentCopy,
  CheckCircle,
  FileUpload,
  FileDownload,
  Settings as SettingsIcon,
  Mic as MicIcon,
  SystemUpdateAlt,
} from '@mui/icons-material';
import { invoke } from '@tauri-apps/api/core';
import { save, open as openDialog } from '@tauri-apps/plugin-dialog';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAppStore } from '../../stores/appStore';
import { AppSettings, Category } from '../../types';
import { ICON_OPTIONS, renderCategoryIcon } from '../../utils/icons';

const SEED_COLORS = [
  '#6750A4', '#D32F2F', '#E91E63', '#9C27B0', '#673AB7',
  '#3F51B5', '#1976D2', '#0288D1', '#00796B', '#388E3C',
  '#689F38', '#F57C00', '#E64A19', '#5D4037', '#455A64',
  '#FF5722', '#FF9800', '#FFC107', '#CDDC39', '#009688',
];


const COLOR_PALETTE = [
  '#6750A4', '#D32F2F', '#F57C00', '#388E3C', '#1976D2',
  '#7B1FA2', '#C2185B', '#00796B', '#455A64', '#E64A19',
];

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

function SortableCategoryItem({ cat, soundCount, onDelete }: { cat: Category; soundCount: number; onDelete: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: cat.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <ListItem ref={setNodeRef} style={style} sx={{ borderRadius: 2, bgcolor: 'action.hover', mb: 0.5, pr: 1 }}>
      <IconButton size="small" {...attributes} {...listeners} sx={{ cursor: 'grab', mr: 0.5, color: 'text.secondary' }}>
        <DragIndicator sx={{ fontSize: 16 }} />
      </IconButton>
      <ListItemIcon sx={{ minWidth: 36 }}>
        <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: cat.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', color: 'white' }}>
          {renderCategoryIcon(cat.icon, { sx: { fontSize: 16 } })}
        </Box>
      </ListItemIcon>
      <ListItemText primary={cat.name} slotProps={{ primary: { sx: { fontWeight: 500, fontSize: '0.85rem' } } }} />
      <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>{soundCount} sons</Typography>
      {cat.id !== 'all' && (
        <IconButton size="small" onClick={() => onDelete(cat.id)} sx={{ color: 'error.main' }}>
          <Delete sx={{ fontSize: 16 }} />
        </IconButton>
      )}
    </ListItem>
  );
}

export default function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const data = useAppStore(s => s.data);
  const saveSettings = useAppStore(s => s.saveSettings);
  const addCategory = useAppStore(s => s.addCategory);
  const deleteCategory = useAppStore(s => s.deleteCategory);
  const reorderCategories = useAppStore(s => s.reorderCategories);
  const addProfile = useAppStore(s => s.addProfile);
  const switchProfile = useAppStore(s => s.switchProfile);
  const renameProfile = useAppStore(s => s.renameProfile);
  const deleteProfile = useAppStore(s => s.deleteProfile);
  const duplicateProfile = useAppStore(s => s.duplicateProfile);
  const loadData = useAppStore(s => s.loadData);

  const [tab, setTab] = useState(0);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [audioDevices, setAudioDevices] = useState<string[]>(['default']);
  const [appDataDir, setAppDataDir] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('apps');
  const [newCatColor, setNewCatColor] = useState('#6750A4');
  const [newProfileName, setNewProfileName] = useState('');
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [editProfileName, setEditProfileName] = useState('');
  const [profileMenuAnchor, setProfileMenuAnchor] = useState<{ el: HTMLElement; profileId: string } | null>(null);
  const [ieLoading, setIeLoading] = useState(false);
  const [ieMessage, setIeMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [virtualCables, setVirtualCables] = useState<string[]>([]);
  const [vcInstalling, setVcInstalling] = useState(false);
  const [vcMessage, setVcMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [micInputDevices, setMicInputDevices] = useState<string[]>(['default']);
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'downloading' | 'up-to-date' | 'error'>('idle');
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [currentVersion, setCurrentVersion] = useState<string>('');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const profile = data?.profiles.find(p => p.id === data.settings.activeProfileId);
  const categories = profile?.categories ?? [];
  const profiles = data?.profiles ?? [];
  const activeProfileId = data?.settings.activeProfileId;

  useEffect(() => {
    if (open && data) {
      setSettings({ ...data.settings });
      invoke<string[]>('list_audio_devices').then(setAudioDevices).catch(() => setAudioDevices(['default']));
      invoke<string[]>('list_audio_input_devices').then(setMicInputDevices).catch(() => setMicInputDevices(['default']));
      invoke<string>('get_app_data_dir').then(setAppDataDir).catch(() => {});
      invoke<string[]>('check_virtual_cable').then(setVirtualCables).catch(() => setVirtualCables([]));
      invoke<string>('get_current_version').then(setCurrentVersion).catch(() => setCurrentVersion('?'));
      setVcMessage(null);
      setUpdateStatus('idle');
      setUpdateVersion(null);
      setUpdateError(null);
    }
  }, [open, data]);

  if (!settings) return null;

  const update = (patch: Partial<AppSettings>) => setSettings(prev => prev ? { ...prev, ...patch } : prev);

  const handleSave = async () => {
    if (settings) {
      // Auto-assign virtual cable as secondary device when dual output is on
      const finalSettings = { ...settings };
      if (finalSettings.dualOutput && virtualCables.length > 0) {
        finalSettings.secondaryDevice = virtualCables[0];
      }
      if (!finalSettings.dualOutput) {
        finalSettings.secondaryDevice = 'none';
      }
      await saveSettings(finalSettings);
      // Sync audio settings to backend in order
      await invoke('set_master_volume', { volume: finalSettings.masterVolume }).catch(console.error);
      await invoke('set_output_device', { deviceName: finalSettings.outputDevice }).catch(console.error);
      if (finalSettings.secondaryDevice && finalSettings.secondaryDevice !== 'none') {
        await invoke('set_secondary_device', { deviceName: finalSettings.secondaryDevice });
      }
      await invoke('set_dual_output', { enabled: finalSettings.dualOutput });
      // Sync silent mode
      await invoke('set_silent_mode', { enabled: finalSettings.silentMode }).catch(console.error);
      // Sync noise suppression
      if (finalSettings.noiseSuppression !== undefined) {
        await invoke('set_noise_suppression', { enabled: finalSettings.noiseSuppression }).catch(console.error);
      }
      // Auto-start mic passthrough if dual output is on and a mic is selected
      if (finalSettings.dualOutput && finalSettings.micPassthroughDevice) {
        const cable = virtualCables[0] || finalSettings.secondaryDevice;
        if (cable && cable !== 'none') {
          await invoke('start_mic_passthrough', { inputDevice: finalSettings.micPassthroughDevice, outputDevice: cable }).catch(console.error);
        }
      }
      onClose();
    }
  };

  const handleAddCategory = async () => { if (!newCatName.trim()) return; await addCategory(newCatName.trim(), newCatIcon, newCatColor); setNewCatName(''); };
  const handleDeleteCategory = async (id: string) => { await deleteCategory(id); };
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = categories.findIndex(c => c.id === active.id);
    const newIndex = categories.findIndex(c => c.id === over.id);
    const reordered = arrayMove(categories, oldIndex, newIndex);
    await reorderCategories(reordered.map(c => c.id));
  };

  const handleAddProfile = async () => { const name = newProfileName.trim(); if (!name) return; await addProfile(name); setNewProfileName(''); };
  const handleRenameProfile = async (id: string) => { const name = editProfileName.trim(); if (!name) return; await renameProfile(id, name); setEditingProfileId(null); setEditProfileName(''); };
  const handleDeleteProfile = async (id: string) => { setProfileMenuAnchor(null); await deleteProfile(id); };
  const handleDuplicateProfile = async (id: string) => { setProfileMenuAnchor(null); const source = profiles.find(p => p.id === id); if (source) await duplicateProfile(id, `${source.name} (copie)`); };
  const startEditingProfile = (id: string) => { setProfileMenuAnchor(null); const p = profiles.find(pr => pr.id === id); if (p) { setEditingProfileId(id); setEditProfileName(p.name); } };

  const handleExport = async () => {
    try {
      const path = await save({ title: 'Exporter la configuration TomBoard', defaultPath: 'tomboard-backup.zip', filters: [{ name: 'TomBoard Backup', extensions: ['zip'] }] });
      if (!path) return;
      setIeLoading(true); setIeMessage(null);
      await invoke('export_data', { destPath: path });
      setIeMessage({ type: 'success', text: 'Export réussi !' });
    } catch (e) { setIeMessage({ type: 'error', text: `Erreur d'export : ${e}` }); } finally { setIeLoading(false); }
  };

  const handleImport = async () => {
    try {
      const path = await openDialog({ title: 'Importer une configuration TomBoard', filters: [{ name: 'TomBoard Backup', extensions: ['zip'] }], multiple: false });
      if (!path) return;
      setIeLoading(true); setIeMessage(null);
      await invoke('import_data', { sourcePath: path });
      await loadData();
      setIeMessage({ type: 'success', text: 'Import réussi ! Les données ont été restaurées.' });
    } catch (e) { setIeMessage({ type: 'error', text: `Erreur d'import : ${e}` }); } finally { setIeLoading(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth slotProps={{ paper: { sx: { borderRadius: 3, bgcolor: 'background.paper', height: '80vh', maxHeight: 680, display: 'flex', flexDirection: 'column' } } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1, flexShrink: 0 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.75, fontSize: '1rem' }}><SettingsIcon sx={{ fontSize: 20 }} /> Paramètres</Typography>
        <IconButton onClick={onClose} size="small"><Close /></IconButton>
      </DialogTitle>

      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar navigation */}
        <Box sx={{ width: 180, flexShrink: 0, borderRight: '1px solid', borderColor: 'divider', py: 1, px: 1, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
          {([
            [0, 'Général', <SettingsIcon key="g" sx={{ fontSize: 17 }} />],
            [1, 'Audio', <VolumeUp key="a" sx={{ fontSize: 17 }} />],
            [2, 'Communication', <MicIcon key="d" sx={{ fontSize: 17 }} />],
          ] as [number, string, React.ReactNode][]).map(([idx, label, icon]) => (
            <ListItemButton key={idx} selected={tab === idx} onClick={() => setTab(idx)} sx={{ borderRadius: '8px', py: 0.75, px: 1.25, minHeight: 36, gap: 1, '&.Mui-selected': { bgcolor: 'rgba(124, 92, 252, 0.12)', color: 'primary.main', '&:hover': { bgcolor: 'rgba(124, 92, 252, 0.16)' } } }}>
              {icon}
              <Typography sx={{ fontSize: '0.82rem', fontWeight: tab === idx ? 600 : 400 }}>{label}</Typography>
            </ListItemButton>
          ))}
          <Divider sx={{ my: 0.75 }} />
          {([
            [3, 'Catégories', <Palette key="c" sx={{ fontSize: 17 }} />],
            [4, 'Profils', <SettingsIcon key="p" sx={{ fontSize: 17 }} />],
          ] as [number, string, React.ReactNode][]).map(([idx, label, icon]) => (
            <ListItemButton key={idx} selected={tab === idx} onClick={() => setTab(idx)} sx={{ borderRadius: '8px', py: 0.75, px: 1.25, minHeight: 36, gap: 1, '&.Mui-selected': { bgcolor: 'rgba(124, 92, 252, 0.12)', color: 'primary.main', '&:hover': { bgcolor: 'rgba(124, 92, 252, 0.16)' } } }}>
              {icon}
              <Typography sx={{ fontSize: '0.82rem', fontWeight: tab === idx ? 600 : 400 }}>{label}</Typography>
            </ListItemButton>
          ))}
          <Divider sx={{ my: 0.75 }} />
          {([
            [5, 'Sauvegarde', <FileDownload key="s" sx={{ fontSize: 17 }} />],
            [6, 'Mise à jour', <SystemUpdateAlt key="u" sx={{ fontSize: 17 }} />],
          ] as [number, string, React.ReactNode][]).map(([idx, label, icon]) => (
            <ListItemButton key={idx} selected={tab === idx} onClick={() => setTab(idx)} sx={{ borderRadius: '8px', py: 0.75, px: 1.25, minHeight: 36, gap: 1, '&.Mui-selected': { bgcolor: 'rgba(124, 92, 252, 0.12)', color: 'primary.main', '&:hover': { bgcolor: 'rgba(124, 92, 252, 0.16)' } } }}>
              {icon}
              <Typography sx={{ fontSize: '0.82rem', fontWeight: tab === idx ? 600 : 400 }}>{label}</Typography>
            </ListItemButton>
          ))}
        </Box>

        {/* Content area */}
        <Box sx={{ flex: 1, overflow: 'auto', px: 3, py: 2, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {tab === 0 && (
          <>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '0.95rem' }}>Général</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {settings.theme === 'dark' ? <DarkMode sx={{ fontSize: 20 }} /> : <LightMode sx={{ fontSize: 20 }} />}
                <Typography variant="body2">Thème</Typography>
              </Box>
              <Select value={settings.theme} onChange={e => update({ theme: e.target.value as 'dark' | 'light' })} size="small" sx={{ minWidth: 120 }}>
                <MenuItem value="dark">Sombre</MenuItem>
                <MenuItem value="light">Clair</MenuItem>
              </Select>
            </Box>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Palette sx={{ fontSize: 20 }} />
                <Typography variant="body2">Couleur d'accent</Typography>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                {SEED_COLORS.map(color => (
                  <Box key={color} onClick={() => update({ customSeedColor: color })} sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: color, cursor: 'pointer', border: 2, borderColor: settings.customSeedColor === color ? 'text.primary' : 'transparent', transition: 'transform 0.15s', '&:hover': { transform: 'scale(1.15)' } }} />
                ))}
              </Box>
            </Box>
            <Divider />
            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.1em' }}>Stockage</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Folder sx={{ fontSize: 20 }} />
                <Typography variant="body2">Dossier de données</Typography>
              </Box>
              <TextField value={appDataDir} size="small" fullWidth slotProps={{ input: { readOnly: true } }} sx={{ mb: 1.5 }} />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FolderOpen sx={{ fontSize: 20 }} />
                <Typography variant="body2">Dossier de sons personnalisé</Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>Laissez vide pour utiliser le dossier par défaut</Typography>
              <TextField value={settings.soundsFolder} onChange={e => update({ soundsFolder: e.target.value })} size="small" fullWidth placeholder="Par défaut" />
            </Box>
            <Divider />
            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, fontWeight: 700, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.1em' }}>Comportement</Typography>
              <FormControlLabel control={<Switch checked={settings.minimizeToTray} onChange={e => update({ minimizeToTray: e.target.checked })} size="small" />} label={<Typography variant="body2">Minimiser dans la barre système</Typography>} />
              <FormControlLabel control={<Switch checked={settings.launchMinimized} onChange={e => update({ launchMinimized: e.target.checked })} size="small" />} label={<Typography variant="body2">Démarrer minimisé</Typography>} />
            </Box>
          </>
        )}

        {tab === 1 && (
          <>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '0.95rem' }}>Audio</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <VolumeUp sx={{ fontSize: 20 }} />
              <Typography variant="body2" sx={{ minWidth: 100 }}>Volume maître</Typography>
              <Slider value={settings.masterVolume} onChange={(_, v) => update({ masterVolume: v as number })} min={0} max={1} step={0.01} size="small" sx={{ flex: 1 }} />
              <Typography variant="caption" color="text.secondary" sx={{ minWidth: 30, textAlign: 'right' }}>{Math.round(settings.masterVolume * 100)}%</Typography>
            </Box>
            <FormControl fullWidth size="small">
              <InputLabel>Périphérique de sortie</InputLabel>
              <Select value={settings.outputDevice} onChange={e => update({ outputDevice: e.target.value })} label="Périphérique de sortie">
                {audioDevices.filter(dev => !virtualCables.includes(dev)).map(dev => <MenuItem key={dev} value={dev}>{dev === 'default' ? 'Par défaut du système' : dev}</MenuItem>)}
              </Select>
            </FormControl>
            <Divider />
            <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.1em' }}>Suppression du bruit</Typography>
            <Box
              sx={{
                p: 1.5,
                borderRadius: '12px',
                bgcolor: settings.noiseSuppression
                  ? 'rgba(0, 212, 170, 0.1)'
                  : (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)',
                border: '1px solid',
                borderColor: settings.noiseSuppression ? 'rgba(0, 212, 170, 0.3)' : 'divider',
                transition: 'all 0.2s ease',
              }}
            >
              <FormControlLabel
                control={<Switch checked={settings.noiseSuppression ?? false} onChange={e => update({ noiseSuppression: e.target.checked })} size="small" color="success" />}
                label={<Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.82rem' }}>Suppression du bruit (IA)</Typography>}
                sx={{ m: 0 }}
              />
              <Typography variant="caption" sx={{ display: 'block', mt: 0.5, fontSize: '0.68rem', color: 'text.secondary', lineHeight: 1.4 }}>
                Filtre les bruits de fond (clavier, souris, ventilateur) via RNNoise.
              </Typography>
            </Box>
          </>
        )}

        {tab === 2 && (
          <>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '0.95rem' }}>Communication</Typography>

            <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: 0.5 }}><MicIcon sx={{ fontSize: 16 }} /> Intégration audio</Typography>

            {virtualCables.length > 0 ? (
              <>
                <Alert severity="success" sx={{ fontSize: '0.75rem', py: 0.5 }}>
                  Câble virtuel actif : <strong>{virtualCables[0]}</strong>
                </Alert>
                <FormControlLabel
                  control={<Switch checked={settings.dualOutput} onChange={e => {
                    const enabled = e.target.checked;
                    update({ dualOutput: enabled, secondaryDevice: enabled ? virtualCables[0] : 'none' });
                  }} size="small" />}
                  label={<Typography variant="body2">Diffuser dans Discord/Teams</Typography>}
                />
                {settings.dualOutput && (
                  <>
                    <Alert severity="info" sx={{ fontSize: '0.7rem', py: 0.5 }}>
                      Les sons sont diffusés sur <strong>vos enceintes</strong> + <strong>{virtualCables[0]}</strong> en même temps.<br/>
                      Dans Discord/Teams → Paramètres → Voix → Micro : sélectionnez <strong>CABLE Output (VB-Audio Virtual Cable)</strong>.
                    </Alert>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={async () => {
                        try {
                          await invoke('set_secondary_device', { deviceName: virtualCables[0] });
                          await invoke('set_dual_output', { enabled: true });
                          await invoke('test_secondary_output');
                      setVcMessage({ type: 'success', text: 'Son test envoyé sur le câble virtuel ! Si vous entendez un bip dans Discord, ça fonctionne.' });
                        } catch (e) {
                          setVcMessage({ type: 'error', text: `Erreur : ${e}` });
                        }
                      }}
                      sx={{ borderRadius: 2 }}
                    >
                      🧪 Tester la sortie vers Discord
                    </Button>
                    {vcMessage && <Alert severity={vcMessage.type} onClose={() => setVcMessage(null)} sx={{ fontSize: '0.75rem', py: 0.5 }}>{vcMessage.text}</Alert>}

                    <Divider />
                    <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <MicIcon sx={{ fontSize: 16 }} /> Micro en temps réel vers Discord
                    </Typography>
                    <Alert severity="info" sx={{ fontSize: '0.7rem', py: 0.5 }}>
                      Redirige votre micro vers {virtualCables[0]} en même temps que la soundboard.<br/>
                      Dans Discord, gardez <strong>CABLE Output</strong> comme micro — vous serez entendu normalement.
                    </Alert>
                    <FormControl fullWidth size="small">
                      <InputLabel>Micro source</InputLabel>
                      <Select
                        value={settings.micPassthroughDevice || 'default'}
                        onChange={e => update({ micPassthroughDevice: e.target.value })}
                        label="Micro source"
                      >
                        {micInputDevices.map(dev => (
                          <MenuItem key={dev} value={dev}>{dev === 'default' ? 'Micro par défaut' : dev}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <Divider />
                    <FormControlLabel
                      control={<Switch checked={settings.silentMode} onChange={e => update({ silentMode: e.target.checked })} size="small" />}
                      label={<Typography variant="body2">Mode silencieux (son uniquement vers Discord)</Typography>}
                    />
                    <Alert severity="info" sx={{ fontSize: '0.7rem', py: 0.5 }}>
                      <strong>Astuce Discord :</strong> Activez la <strong>Suppression du bruit (IA)</strong> dans le panneau Changeur de Voix de TomBoard, puis dans Discord → Paramètres → Voix & Vidéo → Suppression du bruit, choisissez <strong>Aucune</strong>.<br/>
                      TomBoard gère le filtrage du bruit en interne via RNNoise — plus besoin des filtres Discord qui bloquent les sons de la soundboard.
                    </Alert>
                  </>
                )}
              </>
            ) : (
              <>
                <Alert severity="warning" sx={{ fontSize: '0.75rem', py: 0.5 }}>
                  Aucun câble audio virtuel détecté. Il est nécessaire pour diffuser vos sons dans Discord/Teams.
                </Alert>
                {vcMessage && <Alert severity={vcMessage.type} onClose={() => setVcMessage(null)} sx={{ fontSize: '0.75rem', py: 0.5 }}>{vcMessage.text}</Alert>}
                <Button
                  variant="contained"
                  onClick={async () => {
                    setVcInstalling(true); setVcMessage(null);
                    try {
                      const msg = await invoke<string>('install_virtual_cable');
                      setVcMessage({ type: 'success', text: msg + '\nRedémarrez TomBoard (ou votre PC) pour que le câble virtuel soit détecté.' });
                      // Refresh device lists
                      const devs = await invoke<string[]>('list_audio_devices');
                      setAudioDevices(devs);
                      const cables = await invoke<string[]>('check_virtual_cable');
                      setVirtualCables(cables);
                      if (cables.length > 0) {
                        update({ secondaryDevice: cables[0], dualOutput: true });
                      }
                    } catch (e) {
                      setVcMessage({ type: 'error', text: `${e}` });
                    } finally { setVcInstalling(false); }
                  }}
                  disabled={vcInstalling}
                  fullWidth
                  sx={{ py: 1.5, borderRadius: 2 }}
                >
                  {vcInstalling ? 'Installation en cours...' : '↓ Installer VB-Cable automatiquement'}
                </Button>
                <Typography variant="caption" color="text.secondary">
                  VB-Cable est un logiciel gratuit de VB-Audio. L'installation nécessite les droits administrateur.
                </Typography>
              </>
            )}
          </>
        )}

        {tab === 3 && (
          <>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '0.95rem' }}>Catégories</Typography>
            {profile && (
              <Alert severity="info" icon={false} sx={{ py: 0.5, borderRadius: '10px', fontSize: '0.75rem' }}>
                Profil actif : <strong>{profile.name}</strong>
              </Alert>
            )}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={categories.map(c => c.id)} strategy={verticalListSortingStrategy}>
                <List dense sx={{ mb: 1 }}>
                  {categories.map(cat => (
                    <SortableCategoryItem key={cat.id} cat={cat} soundCount={profile?.sounds.filter(s => s.category === cat.id).length ?? 0} onDelete={handleDeleteCategory} />
                  ))}
                </List>
              </SortableContext>
            </DndContext>
            <Divider />
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Nouvelle catégorie</Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField placeholder="Nom..." value={newCatName} onChange={e => setNewCatName(e.target.value)} size="small" sx={{ flex: 1 }} onKeyDown={e => { if (e.key === 'Enter') handleAddCategory(); }} />
              <Button onClick={handleAddCategory} variant="contained" size="small" disabled={!newCatName.trim()} startIcon={<Add />} sx={{ borderRadius: 2 }}>Ajouter</Button>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>Icône: {renderCategoryIcon(newCatIcon, { sx: { fontSize: 18 } })}</Typography>
              <Grid container spacing={0.5}>
                {ICON_OPTIONS.map(opt => (
                  <Grid key={opt.id} size={{ xs: 'auto' }}>
                    <Box onClick={() => setNewCatIcon(opt.id)} sx={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 1, cursor: 'pointer', bgcolor: newCatIcon === opt.id ? 'primary.main' : 'transparent', color: newCatIcon === opt.id ? 'primary.contrastText' : 'inherit', '&:hover': { bgcolor: 'action.hover' }, fontSize: '1.1rem' }} title={opt.label}>{renderCategoryIcon(opt.id, { sx: { fontSize: 20 } })}</Box>
                  </Grid>
                ))}
              </Grid>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>Couleur</Typography>
              <Grid container spacing={0.5}>
                {COLOR_PALETTE.map(c => (
                  <Grid key={c} size={{ xs: 'auto' }}>
                    <Box onClick={() => setNewCatColor(c)} sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: c, cursor: 'pointer', border: newCatColor === c ? '2px solid white' : '2px solid transparent', '&:hover': { transform: 'scale(1.15)' }, transition: 'transform 0.15s' }} />
                  </Grid>
                ))}
              </Grid>
            </Box>
          </>
        )}

        {tab === 4 && (
          <>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '0.95rem' }}>Profils</Typography>
            <List dense>
              {profiles.map(p => (
                <ListItemButton key={p.id} selected={p.id === activeProfileId} onClick={() => switchProfile(p.id)} sx={{ py: 1.5, borderRadius: 2, mb: 0.5, '&.Mui-selected': { bgcolor: 'action.selected' } }}>
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <Avatar sx={{ width: 30, height: 30, fontSize: '0.8rem', bgcolor: p.id === activeProfileId ? 'primary.main' : 'action.hover' }}>{p.name[0]?.toUpperCase()}</Avatar>
                  </ListItemIcon>
                  {editingProfileId === p.id ? (
                    <TextField value={editProfileName} onChange={e => setEditProfileName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleRenameProfile(p.id); if (e.key === 'Escape') setEditingProfileId(null); }} onBlur={() => handleRenameProfile(p.id)} size="small" autoFocus sx={{ flex: 1 }} onClick={e => e.stopPropagation()} />
                  ) : (
                    <ListItemText primary={p.name} secondary={`${p.sounds.length} son${p.sounds.length > 1 ? 's' : ''} · ${p.categories.length} catégorie${p.categories.length > 1 ? 's' : ''}`} slotProps={{ primary: { sx: { fontWeight: p.id === activeProfileId ? 700 : 500 } }, secondary: { sx: { fontSize: '0.7rem' } } }} />
                  )}
                  <ListItemSecondaryAction>
                    {p.id === activeProfileId && <CheckCircle sx={{ fontSize: 16, color: 'primary.main', mr: 0.5 }} />}
                    <IconButton size="small" onClick={e => { e.stopPropagation(); setProfileMenuAnchor({ el: e.currentTarget, profileId: p.id }); }}><MoreVert sx={{ fontSize: 18 }} /></IconButton>
                  </ListItemSecondaryAction>
                </ListItemButton>
              ))}
            </List>
            <Divider />
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField value={newProfileName} onChange={e => setNewProfileName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddProfile()} placeholder="Nouveau profil..." size="small" fullWidth />
              <Tooltip title="Ajouter"><span><IconButton onClick={handleAddProfile} disabled={!newProfileName.trim()} color="primary" size="small"><Add /></IconButton></span></Tooltip>
            </Box>
          </>
        )}

        {tab === 5 && (
          <>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '0.95rem' }}>Sauvegarde</Typography>
            <Typography variant="body2" color="text.secondary">Sauvegardez ou restaurez votre configuration complète (sons, profils, catégories, paramètres).</Typography>
            {ieLoading && <LinearProgress />}
            {ieMessage && <Alert severity={ieMessage.type} onClose={() => setIeMessage(null)}>{ieMessage.text}</Alert>}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button variant="outlined" startIcon={<FileDownload />} onClick={handleExport} disabled={ieLoading} fullWidth sx={{ py: 2, borderRadius: 2 }}>Exporter</Button>
              <Button variant="outlined" startIcon={<FileUpload />} onClick={handleImport} disabled={ieLoading} fullWidth sx={{ py: 2, borderRadius: 2 }}>Importer</Button>
            </Box>
            <Typography variant="caption" color="text.secondary">L'import remplacera toutes vos données actuelles. Pensez à exporter d'abord en guise de sauvegarde.</Typography>
          </>
        )}

        {tab === 6 && (
          <>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '0.95rem' }}>Mise à jour</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">Version actuelle :</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>v{currentVersion}</Typography>
            </Box>
            <Divider />
            {updateStatus === 'up-to-date' && (
              <Alert severity="success" sx={{ fontSize: '0.8rem' }}>Vous êtes à jour !</Alert>
            )}
            {updateStatus === 'error' && (
              <Alert severity="error" sx={{ fontSize: '0.8rem' }}>{updateError}</Alert>
            )}
            {updateVersion && updateStatus !== 'downloading' && (
              <Alert severity="info" sx={{ fontSize: '0.8rem' }}>
                Nouvelle version disponible : <strong>v{updateVersion}</strong>
              </Alert>
            )}
            {updateStatus === 'downloading' && (
              <>
                <Alert severity="info" sx={{ fontSize: '0.8rem' }}>Téléchargement et installation de la v{updateVersion}...</Alert>
                <LinearProgress />
              </>
            )}
            {updateStatus === 'checking' && <LinearProgress />}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<SystemUpdateAlt />}
                onClick={async () => {
                  setUpdateStatus('checking');
                  setUpdateError(null);
                  setUpdateVersion(null);
                  try {
                    const result = await invoke<string>('check_for_updates');
                    if (result === 'up-to-date') {
                      setUpdateStatus('up-to-date');
                    } else {
                      setUpdateVersion(result);
                      setUpdateStatus('idle');
                    }
                  } catch (e) {
                    setUpdateStatus('error');
                    setUpdateError(`${e}`);
                  }
                }}
                disabled={updateStatus === 'checking' || updateStatus === 'downloading'}
                fullWidth
                sx={{ py: 1.5, borderRadius: 2 }}
              >
                {updateStatus === 'checking' ? 'Vérification...' : 'Vérifier les mises à jour'}
              </Button>
              {updateVersion && (
                <Button
                  variant="contained"
                  onClick={async () => {
                    setUpdateStatus('downloading');
                    setUpdateError(null);
                    try {
                      await invoke('download_and_apply_update');
                    } catch (e) {
                      setUpdateStatus('error');
                      setUpdateError(`${e}`);
                    }
                  }}
                  disabled={updateStatus === 'downloading'}
                  fullWidth
                  sx={{ py: 1.5, borderRadius: 2 }}
                >
                  {updateStatus === 'downloading' ? 'Installation...' : `Installer v${updateVersion}`}
                </Button>
              )}
            </Box>
            <Typography variant="caption" color="text.secondary">
              Les mises à jour sont téléchargées depuis GitHub. L'application redémarrera automatiquement après l'installation.
            </Typography>
          </>
        )}


        </Box>
      </Box>

      <DialogActions sx={{ px: 3, py: 2, flexShrink: 0, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button onClick={onClose} color="inherit">Annuler</Button>
        <Button onClick={handleSave} variant="contained">Enregistrer</Button>
      </DialogActions>

      <Menu anchorEl={profileMenuAnchor?.el} open={!!profileMenuAnchor} onClose={() => setProfileMenuAnchor(null)}>
        <MenuItem onClick={() => profileMenuAnchor && startEditingProfile(profileMenuAnchor.profileId)}><Edit sx={{ fontSize: 18, mr: 1 }} /> Renommer</MenuItem>
        <MenuItem onClick={() => profileMenuAnchor && handleDuplicateProfile(profileMenuAnchor.profileId)}><ContentCopy sx={{ fontSize: 18, mr: 1 }} /> Dupliquer</MenuItem>
        {profiles.length > 1 && <MenuItem onClick={() => profileMenuAnchor && handleDeleteProfile(profileMenuAnchor.profileId)} sx={{ color: 'error.main' }}><Delete sx={{ fontSize: 18, mr: 1 }} /> Supprimer</MenuItem>}
      </Menu>
    </Dialog>
  );
}
