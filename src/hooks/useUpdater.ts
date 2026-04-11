import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface UpdateInfo {
  version: string;
}

export function useUpdater() {
  const [updateAvailable, setUpdateAvailable] = useState<UpdateInfo | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    // Check for updates once after a short delay (avoids slowing startup)
    const timer = setTimeout(async () => {
      try {
        const result = await invoke<string>('check_for_updates');
        if (result && result !== 'up-to-date') {
          setUpdateAvailable({ version: result });
        }
      } catch {
        // Ignore — app may be running in dev mode (not installed via velopack)
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  const applyUpdate = async () => {
    if (!updateAvailable) return;
    setUpdating(true);
    setUpdateError(null);
    try {
      await invoke('download_and_apply_update');
      // App will restart automatically after apply_updates_and_restart
    } catch (e) {
      setUpdateError(String(e));
      setUpdating(false);
    }
  };

  const dismiss = () => {
    setUpdateAvailable(null);
    setUpdateError(null);
  };

  return { updateAvailable, updateError, updating, applyUpdate, dismiss };
}
