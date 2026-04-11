import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  LinearProgress,
  Alert,
} from '@mui/material';
import { FileUpload, FileDownload, Inventory2 } from '@mui/icons-material';
import { invoke } from '@tauri-apps/api/core';
import { save, open as openDialog } from '@tauri-apps/plugin-dialog';
import { useAppStore } from '../../stores/appStore';

interface ImportExportDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function ImportExportDialog({ open, onClose }: ImportExportDialogProps) {
  const loadData = useAppStore(s => s.loadData);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleExport = async () => {
    try {
      const path = await save({
        title: 'Exporter la configuration TomBoard',
        defaultPath: 'tomboard-backup.zip',
        filters: [{ name: 'TomBoard Backup', extensions: ['zip'] }],
      });
      if (!path) return;
      setLoading(true);
      setMessage(null);
      await invoke('export_data', { destPath: path });
      setMessage({ type: 'success', text: 'Export réussi !' });
    } catch (e) {
      setMessage({ type: 'error', text: `Erreur d'export : ${e}` });
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    try {
      const path = await openDialog({
        title: 'Importer une configuration TomBoard',
        filters: [{ name: 'TomBoard Backup', extensions: ['zip'] }],
        multiple: false,
      });
      if (!path) return;
      setLoading(true);
      setMessage(null);
      await invoke('import_data', { sourcePath: path });
      await loadData();
      setMessage({ type: 'success', text: 'Import réussi ! Les données ont été restaurées.' });
    } catch (e) {
      setMessage({ type: 'error', text: `Erreur d'import : ${e}` });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setMessage(null);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: 3, bgcolor: 'background.paper' } } }}
    >
      <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}><Inventory2 sx={{ fontSize: 22 }} /> Import / Export</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 3 }}>
        <Typography variant="body2" color="text.secondary">
          Sauvegardez ou restaurez votre configuration complète (sons, profils, catégories, paramètres).
        </Typography>

        {loading && <LinearProgress />}

        {message && (
          <Alert severity={message.type} onClose={() => setMessage(null)}>
            {message.text}
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<FileDownload />}
            onClick={handleExport}
            disabled={loading}
            fullWidth
            sx={{ py: 2, borderRadius: 2 }}
          >
            Exporter
          </Button>
          <Button
            variant="outlined"
            startIcon={<FileUpload />}
            onClick={handleImport}
            disabled={loading}
            fullWidth
            sx={{ py: 2, borderRadius: 2 }}
          >
            Importer
          </Button>
        </Box>

        <Typography variant="caption" color="text.secondary">
          L'import remplacera toutes vos données actuelles. Pensez à exporter d'abord en guise de sauvegarde.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} variant="contained">Fermer</Button>
      </DialogActions>
    </Dialog>
  );
}
