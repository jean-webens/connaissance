# Connaissance+ — version PWA hors ligne

Quiz de culture générale, installable (Android / ordinateur), **100 % fonctionnel sans Internet**, sans question répétée.

## Structure

```
public/                      ← le dossier à déployer (déjà compilé)
  index.html  styles.css  tailwind.css (compilé en local)
  app.js         interface
  engine.js      validation, détection de doublons, sélection des questions (logique pure)
  db.js          couche IndexedDB (remplace window.dataSdk)
  bank.js        installation de la banque + import de « packs » de questions
  sync.js        file de synchronisation (inactive tant qu'aucun backend n'est configuré)
  questions.js   banque embarquée (100 questions FR/EN (20 défis complets actuellement))     config.js   réglages     i18n.js   textes FR/EN
  service-worker.js  manifest.json  offline.html  icons/  fonts/  vendor/lucide.min.js
scripts/build.mjs  tests/  netlify.toml  vercel.json  capacitor.config.json
```

## Ce qui est LOCAL et ce qui exige un SERVEUR

| Fonction | État |
|---|---|
| Quiz, correction, scores, statistiques, historique, profils multiples, certificat, FR/EN | **Local (fonctionne)** |
| Questions jamais répétées par utilisateur, reprise d'un défi interrompu | **Local (fonctionne)** |
| Classement | **Local** : profils de CET appareil uniquement |
| Sauvegarde / restauration (JSON), import de packs de questions | **Local (fonctionne)** |
| Classement mondial, synchronisation entre appareils, comptes | **Nécessite un backend (non fourni)** |
| Paiements des abonnements, notifications push, publication réelle | **Non implémentés** (pages conservées, rien n'est simulé) |

## Règles sur les questions

* `id` permanent (`q-0001`…), `key` = fait interrogé (`capitales.canada`). Deux questions ne peuvent pas avoir la même clé ; les énoncés quasi identiques sont aussi refusés.
* Une question est marquée **« vue »** pour un profil dès qu'elle s'affiche — réussie, ratée ou abandonnée, elle ne revient jamais pour ce profil. L'historique n'est jamais vidé.
* Un défi abandonné ne « consomme » que les questions déjà affichées.
* **Capacité calculée automatiquement** : le nombre de défis disponibles est `floor(nombre de questions / 5)`. La banque intégrée de 100 questions permet actuellement **20 défis complets par profil**. L'interface affiche cette capacité réelle au lieu de promettre 365 défis impossibles à jouer. Quand la banque est enrichie par import de packs, le parcours s'agrandit automatiquement. Le parcours complet de 365 défis exige **au moins 1 825 questions uniques et vérifiées**. Aucune question déjà présentée n'est recyclée, même après un abandon ou un rejeu.

### Ajouter des questions
1. **Pack JSON** (aucun redéploiement) — menu Profil → « Importer un fichier » :
```json
{ "format": "connaissance-plus-pack", "packId": "p01",
  "questions": [ { "id": "p01-0001", "key": "capitales.chili", "category": "GE", "difficulty": 1,
    "q": {"fr": "Quelle est la capitale du Chili ?", "en": "What is the capital of Chile?"},
    "choices": {"fr": ["Lima","Santiago","Quito","Bogota"], "en": ["Lima","Santiago","Quito","Bogotá"]},
    "answer": 1, "exp": {"fr": "…", "en": "…"} } ] }
```
   Catégories : `CG HI SC GE AR SP TE`. Les ids ne doivent pas commencer par `q-`. Doublons et questions invalides sont rejetés et listés dans la console.
2. **Banque embarquée** : ajouter des lignes dans `public/questions.js`, changer `BANK_VERSION`, `npm test`, `npm run build`, redéployer. Les utilisateurs reçoivent les nouvelles questions au démarrage, historique intact.

## Tester hors ligne
1. `npm install` puis `npm run build` puis `npm run serve` → http://localhost:8080 (ou ouvrez la version déployée en HTTPS).
2. Chargez la page une fois, attendez 2-3 secondes (installation du cache).
3. Chrome → F12 → Application → Service Workers : cochez **Offline** (ou coupez le Wi-Fi / mode avion) puis rechargez : l'appli s'ouvre, l'indicateur passe à « Hors ligne », le quiz fonctionne.
4. Android : Chrome → menu ⋮ → « Installer l'application », puis mode avion et lancez l'icône.

## Déployer
**Netlify** : (a) glisser-déposer le dossier `public/` sur app.netlify.com/drop, ou (b) pousser le projet sur GitHub → « Add new site → Import » ; `netlify.toml` configure tout (publish = `public`).
**Vercel** : `npm i -g vercel` puis `vercel --prod` à la racine (ou importer le dépôt) ; `vercel.json` est fourni.
Le HTTPS (fourni par les deux) est obligatoire pour le service worker. Après chaque modification : `npm run build` (régénère `tailwind.css`, la liste de cache et la version du cache).

## Android / APK avec Capacitor
```bash
npm run build
npm i @capacitor/core @capacitor/cli @capacitor/android
npx cap add android          # utilise capacitor.config.json (webDir = public)
npx cap sync android
npx cap open android         # Android Studio : Build → Build APK(s)  (ou Build → Generate Signed Bundle pour le Play Store)
```
Sans Android Studio : `cd android && ./gradlew assembleDebug` → `android/app/build/outputs/apk/debug/app-debug.apk`. Il faut le JDK 17 et le SDK Android. Après chaque changement web : `npm run build && npx cap sync android`.

## Brancher un backend (optionnel)
Renseignez `BACKEND_URL` dans `public/config.js`. Chaque résultat est envoyé en `POST {BACKEND_URL}/api/results` avec l'en-tête `Idempotency-Key` = id unique de la tentative et un JSON `{attemptId, profileId, username, day, level, score, total, startedAt, finishedAt, answers:[{questionId, correct}]}`. Le serveur doit répondre 2xx (ou 409 si déjà reçu) et **ignorer** les envois répétés du même `attemptId`. Ajoutez CORS pour votre domaine.

## Mises à jour et données
Le cache du service worker est versionné ; une nouvelle version est proposée via un bandeau « Mettre à jour ». Les données (IndexedDB) ne sont jamais touchées par le cache. Le schéma de la base a un numéro de version et des migrations (`db.js`).
**Anciennes données** : celles stockées par l'ancien environnement (`dataSdk`) ne sont pas lisibles depuis un autre site. Si vous pouvez en extraire un export JSON (tableau d'enregistrements `{day_number, score, username, …}`), « Importer un fichier » le convertit (jours terminés + questions déjà vues). Les résultats en attente dans `localStorage` (`cp-queue`) sont migrés automatiquement.

## Tests
`npm test` (32 tests) : banque sans doublons, aucune question reprise, rejeu différent, persistance, profils séparés, synchro sans doublon, migration, manifest, cache hors ligne du service worker, absence de dépendances externes, parcours complet de l'interface.
