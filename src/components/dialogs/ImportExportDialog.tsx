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
import { useI18n } from '../../i18n/I18nProvider';

interface ImportExportDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function ImportExportDialog({ open, onClose }: ImportExportDialogProps) {
  const loadData = useAppStore(s => s.loadData);
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleExport = async () => {
    try {
      const path = await save({
        title: t('exportConfig'),
        defaultPath: 'tomboard-backup.zip',
        filters: [{ name: 'TomBoard Backup', extensions: ['zip'] }],
      });
      if (!path) return;
      setLoading(true);
      setMessage(null);
      await invoke('export_data', { destPath: path });
      setMessage({ type: 'success', text: t('exportSuccess') });
    } catch (e) {
      setMessage({ type: 'error', text: `${t('exportError')} ${e}` });
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    try {
      const path = await openDialog({
        title: t('importConfig'),
        filters: [{ name: 'TomBoard Backup', extensions: ['zip'] }],
        multiple: false,
      });
      if (!path) return;
      setLoading(true);
      setMessage(null);
      await invoke('import_data', { sourcePath: path });
      await loadData();
      setMessage({ type: 'success', text: t('importSuccess') });
    } catch (e) {
      setMessage({ type: 'error', text: `${t('importError')} ${e}` });
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
      <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}><Inventory2 sx={{ fontSize: 22 }} /> {t('importExportTitle')}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 3 }}>
        <Typography variant="body2" color="text.secondary">
          {t('backupDescription')}
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
            {t('exportButton')}
          </Button>
          <Button
            variant="outlined"
            startIcon={<FileUpload />}
            onClick={handleImport}
            disabled={loading}
            fullWidth
            sx={{ py: 2, borderRadius: 2 }}
          >
            {t('importButton')}
          </Button>
        </Box>

        <Typography variant="caption" color="text.secondary">
          {t('importWarning')}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} variant="contained">{t('close')}</Button>
      </DialogActions>
    </Dialog>
  );
}
