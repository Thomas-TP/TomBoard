import { useEffect, useRef } from 'react';
import { register, unregister, isRegistered } from '@tauri-apps/plugin-global-shortcut';
import { useAppStore } from '../stores/appStore';
import { Sound } from '../types';

/**
 * Converts our hotkey format (Ctrl+Shift+A) to Tauri format (ctrl+shift+a)
 * Our format: Ctrl+Shift+Alt+Key
 * Tauri format: ctrl+shift+alt+KeyA or just a single key
 */
function toTauriShortcut(hotkey: string): string {
  return hotkey
    .split('+')
    .map(part => {
      const lower = part.toLowerCase();
      if (lower === 'ctrl') return 'ctrl';
      if (lower === 'shift') return 'shift';
      if (lower === 'alt') return 'alt';
      if (lower === 'meta') return 'super';
      // Single letter
      if (part.length === 1) return part.toUpperCase();
      // Named keys
      return part;
    })
    .join('+');
}

export function useHotkeyManager() {
  const data = useAppStore(s => s.data);
  const playSound = useAppStore(s => s.playSound);
  const registeredRef = useRef<Map<string, string>>(new Map()); // shortcut -> soundId

  useEffect(() => {
    if (!data) return;

    const profile = data.profiles.find(p => p.id === data.settings.activeProfileId);
    if (!profile) return;

    const soundsWithHotkeys = profile.sounds.filter(s => s.hotkey);

    // Build new hotkey map
    const newHotkeys = new Map<string, Sound>();
    for (const sound of soundsWithHotkeys) {
      if (sound.hotkey) {
        const tauriKey = toTauriShortcut(sound.hotkey);
        newHotkeys.set(tauriKey, sound);
      }
    }

    const registered = registeredRef.current;

    // Unregister removed hotkeys
    const toUnregister = [...registered.entries()].filter(
      ([shortcut]) => !newHotkeys.has(shortcut)
    );

    // Register new hotkeys
    const toRegister = [...newHotkeys.entries()].filter(
      ([shortcut]) => !registered.has(shortcut)
    );

    (async () => {
      // Unregister old ones
      for (const [shortcut] of toUnregister) {
        try {
          const isReg = await isRegistered(shortcut);
          if (isReg) {
            await unregister(shortcut);
          }
          registered.delete(shortcut);
        } catch (e) {
          console.warn(`Failed to unregister shortcut ${shortcut}:`, e);
        }
      }

      // Register new ones
      for (const [shortcut, sound] of toRegister) {
        try {
          const soundCopy = { ...sound };
          await register(shortcut, () => {
            // Re-get the latest sound data
            const currentData = useAppStore.getState().data;
            if (!currentData) return;
            const currentProfile = currentData.profiles.find(
              p => p.id === currentData.settings.activeProfileId
            );
            const currentSound = currentProfile?.sounds.find(s => s.id === soundCopy.id);
            if (currentSound) {
              playSound(currentSound);
            }
          });
          registered.set(shortcut, sound.id);
        } catch (e) {
          console.warn(`Failed to register shortcut ${shortcut}:`, e);
        }
      }
    })();

    return () => {
      // Cleanup all on unmount
      (async () => {
        for (const [shortcut] of registered) {
          try {
            await unregister(shortcut);
          } catch {}
        }
        registered.clear();
      })();
    };
  }, [data, playSound]);
}
