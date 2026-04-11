# Changelog TomBoard

All notable changes to this project are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/)
Versioning: [SemVer](https://semver.org/lang/fr/)

---

## [0.1.2] — 2025-07-01

### Nouvelles fonctionnalités
- **Pitch Shifter PSOLA** — modification de la hauteur de voix en temps réel via traitement Rust
- **Égaliseur paramétrique 5 bandes** — avec préréglages Voix, Musique, Bass Boost
- **Mode compact** — affiche plus de sons dans la grille (Ctrl+3)
- **Glisser-déposer de fichiers audio** — depuis l'explorateur directement dans l'interface
- **Annuler / Rétablir** — Ctrl+Z / Ctrl+Y, historique de 30 actions
- **Fondu entrant et sortant** — par son, en secondes (0 – 10 s)
- **Rognage audio** — avec éditeur de forme d'onde canvas interactif
- **Internationalisation** — Français 🇫🇷 et Anglais 🇬🇧
- **API HTTP StreamDeck** — port 47891, commandes play/stop/list
- **Discord Rich Presence** — affiche le son en cours dans le statut Discord
- **TTS local** — synthèse vocale via Windows Speech Synthesis (Piper)
- **Spectrogramme + VU-mètre** — visualisation micro dans le panneau VoiceChanger
- **Cache des formes d'onde** — chargement instantané au second affichage
- **Lazy loading** — les sons hors écran sont chargés à la demande
- **Frontières d'erreurs** — évitent les crashes de l'interface complète
- **Bibliothèque Freesound** — importer des sons libres de droits en ligne
- **Signature de code Windows** — via signtool et certificat PFX configurable en CI/CD
- **Mise à jour automatique** — via Velopack, notification in-app + installation en un clic

### Améliorations
- Toutes les structures Sound incluent `fadeIn` / `fadeOut` / `trimStart` / `trimEnd`
- Undo/redo persisté côté Rust (`set_data`) pour cohérence complète
- Drag-and-drop des sons entre catégories dans la grille

---

## [0.1.1] — 2025-06-01

### Nouvelles fonctionnalités
- Sidebar redimensionnable et responsive
- Animations Framer Motion lors du déclenchement d'un son
- Accessibilité ARIA complète (rôles, live regions, labels)
- Assistant d'installation (onboarding wizard)
- Bibliothèque de sons en ligne

### Correctifs
- Crash au démarrage si aucun périphérique audio détecté
- Profil actif non restauré après redémarrage
- Sons supprimés réapparaissant après changement de profil

---

## [0.1.0] — 2025-05-01

### Première version publique
- Grille et liste de sons avec profils et catégories
- Raccourcis clavier globaux (tauri-plugin-global-shortcut)
- Thème clair / sombre / couleur personnalisée
- Sortie audio double (VB-Cable)
- Passthrough microphone
- Enregistrement de sons depuis le micro
- Volume par son, vitesse de lecture, bouclage
- Barre de statut avec VU-mètre et contrôle du volume principal
- Import/export de la bibliothèque (JSON)
