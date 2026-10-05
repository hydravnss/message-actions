# Actions Message — extension SillyTavern

Place et **garde visibles** les boutons d'action de chaque message SillyTavern
(`.mes_buttons` : éditer, copier, menu …, checkpoint, etc.).

Pensée pour **iPhone OLED** / tactile et une utilisation avec le thème iMessage Dark
et les extensions hydravnss (Portrait Lignes, StickerPop, Fixed Sendbar, Force Light Dark).

## Fonctions

1. **Toujours visibles** — opacité constante (plus besoin de survol / long tap)
2. **Placement libre** — haut-droite, haut-gauche, bas-droite, bas-gauche, ou sous le message + décalages X / Y (px)
3. **Taille** (échelle %) et **opacité** réglables
4. **Masquer** des actions individuelles (éditer, copier, traduire, narration…)
5. Option : **développer toutes les actions** (sans menu « … »)
6. Option : rendre les **swipes** plus visibles

## Ce qui n'est JAMAIS touché

- barre d'envoi / barre du haut : `#form_sheld`, `#send_form`, `#send_textarea`, `#top-bar`
- fond du chat, bulles, stickers, Force Light Dark
- seul `.mes_buttons` (et optionnellement l'opacité des chevrons de swipe) est modifié

## Installation

Dans SillyTavern : **Extensions** (icône cubes) → **Installer une extension** → coller :

```
https://github.com/hydravnss/message-actions
```

Puis ouvrir le panneau **Actions Message** dans la liste des extensions.

## Réglages (panneau en français)

| Réglage | Par défaut |
|---|---|
| Activer / désactiver | activé |
| Toujours visibles | oui |
| Développer toutes les actions | non |
| Swipes plus visibles | oui |
| Opacité des boutons | 100 % |
| Taille (échelle) | 100 % |
| Position | Haut droite |
| Décalage X / Y | 0 px |
| Masquer des actions | aucune |
| Valeurs par défaut | bouton de réinitialisation |

Les changements s'appliquent **en direct** et sont enregistrés dans
`extension_settings.message_actions` (sauvegarde standard SillyTavern).

## Fonctionnement

L'extension injecte un `<style id="message-actions-style">` régénéré à chaque réglage,
avec une spécificité élevée et append en fin de `<head>` pour passer devant le CSS de
Portrait Lignes sur `.mes_buttons` uniquement. Désactiver l'extension retire le `<style>` :
retour exact au thème.

Petite API console : `MessageActions.getSettings()`, `MessageActions.set({ position: 'below', offsetY: 12 })`,
`MessageActions.reset()`.

## Compatibilité

Testée avec SillyTavern **1.19.0** et les extensions hydravnss :

- Portrait Lignes (ne casse pas la mise en page ; repositionne seulement `.mes_buttons`)
- StickerPop, Fixed Sendbar, Force Light Dark (aucune règle hors des boutons d'action)

## Tests

`test/st-playwright.mjs` : Playwright WebKit, émulation **iPhone 14 Pro**, SillyTavern 1.19.0
(`localhost:8000`). Vérifie : actions visibles sans hover, déplacement via réglages, panneau FR,
0 erreur console, captures `/workspace/st-test-shots/ma-*.png`. **Non testé sur un iPhone réel.**

## Licence

MIT © hydravnss
