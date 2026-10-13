# SplitBills

Web app installable (PWA) pour partager les dépenses au prorata des revenus (ex. 70 / 30).
React + Vite + Firebase (Auth, Firestore). Scan de tickets en local avec Tesseract.js.

## Captures

![Accueil](docs/screenshots/dashboard.png)

| Groupe | Suivi |
|---|---|
| ![Groupe](docs/screenshots/group.png) | ![Suivi](docs/screenshots/stats.png) |

| Historique | Groupes |
|---|---|
| ![Historique](docs/screenshots/history.png) | ![Groupes](docs/screenshots/groups.png) |

### Mobile

| Accueil | Groupe | Nouvelle dépense | Suivi |
|---|---|---|---|
| <img src="docs/screenshots/m-home.png" width="200"> | <img src="docs/screenshots/m-group.png" width="200"> | <img src="docs/screenshots/m-add.png" width="200"> | <img src="docs/screenshots/m-stats.png" width="200"> |

## Mise en route

1. Firebase console : crée un projet, puis une **Web app** et copie sa config.
2. Active **Authentication** → *Email/Password* et *Google*.
3. Crée une base **Firestore** (mode production).
4. `cp .env.example .env` puis remplis les valeurs.
5. `npm install && npm run dev`

## Déployer (Firebase Hosting)

```sh
npx firebase-tools login
npm run build
npx firebase-tools deploy --project <projet>   # hosting + règles Firestore
```

Ajoute le domaine de hosting dans *Authentication → Settings → Authorized domains* s'il n'y est pas.

## Notifications

Les membres d'un groupe reçoivent une notification quand quelqu'un y ajoute une dépense ou un remboursement.
L'envoi passe par un Cloudflare Worker (`worker/`), sur le plan gratuit : le projet Firebase reste sur Spark et rien ne peut être facturé.
Après chaque ajout, l'app appelle le worker avec le jeton Firebase de l'utilisateur ; le worker vérifie qu'il vient de créer l'entrée, puis envoie via Firebase Cloud Messaging.

1. *Project settings → Cloud Messaging → Web Push certificates* : génère une paire de clés et mets-la dans `VITE_FIREBASE_VAPID_KEY`.
2. *Project settings → Service accounts* : *Generate new private key* (fichier JSON, à garder hors du dépôt).
3. Déploie le worker :
   ```sh
   cd worker && npm install
   npx wrangler login
   npx wrangler secret put FIREBASE_SERVICE_ACCOUNT < chemin/vers/la-cle.json
   npm run deploy
   ```
4. Mets l'URL affichée dans `VITE_NOTIFY_URL`, puis rebuild et redéploie le hosting.
5. Sur le téléphone : *Profil → Notifications*. Sur iPhone, il faut d'abord installer l'app sur l'écran d'accueil (iOS 16.4+).

Les notifications ne marchent qu'avec le build (pas avec `npm run dev`, qui n'a pas de service worker).
`node scripts/send-test-push.mjs <projet> <compte-google>` envoie une notification de test à tous les appareils inscrits.

## Installer sur le téléphone

Ouvre l'URL déployée puis :
- **iPhone (Safari)** : Partager → *Sur l'écran d'accueil*
- **Android (Chrome)** : menu ⋮ → *Installer l'application*

## Modèle de données

- `groups/{id}` : `name`, `currency`, `memberIds[]`, `members{uid: {name, share}}`
- `users/{uid}/pushTokens/{token}` : un document par appareil qui a activé les notifications
- `groups/{id}/expenses/{id}` : dépense (`kind: 'expense'`, avec copie des `shares`) ou remboursement (`kind: 'payment'`)

Le lien d'invitation est `/join/{groupId}` : l'id du groupe sert de secret.

## Scripts

- `npm run dev` — serveur local
- `npm run dev:host` / `npm run demo:host` — idem, accessible depuis le téléphone via un QR code
- `npm run demo` — l'app avec des données de test en mémoire, sans Firebase (rien n'est sauvegardé)
- `npm test` — tests (soldes, parsing de tickets)
- `npm run build` — build de prod
