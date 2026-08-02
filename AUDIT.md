# Audit Tontine-J — État des lieux avant mise en production

Revue statique du dépôt (branche `claude/app-audit-security-architecture-667uvi`).
Périmètre : `server.ts` (867 l.), `lib/supabase.ts`, `supabase/schema.sql`, `src/` (~5 100 l.), configuration et outillage.

**Verdict global : l'application n'est pas déployable en production en l'état.** Elle manipule de l'argent réel (soldes, commissions, parrainage) avec une authentification contournable, des soldes modifiables par l'utilisateur, et sans le cœur métier de la tontine (redistribution). Les points P0 ci-dessous sont exploitables par n'importe qui disposant d'un navigateur.

---

## 1. Sécurité

### P0 — Bloquants (exploitation triviale, perte financière directe)

| # | Faille | Emplacement | Impact |
|---|---|---|---|
| S1 | **Connexion sans mot de passe** : si le corps de requête n'a pas de `password`, aucune vérification n'est faite et un JWT est émis. Et si le compte n'a ni `password_hash` ni `password`, `isMatch = true`. | `server.ts:326-331` | Prise de contrôle de n'importe quel compte avec le seul numéro de téléphone. |
| S2 | **Les admins créés via `/api/admin/administrators/promote` n'ont aucun mot de passe** (insert sans `password_hash`). Combiné à S1 → accès admin complet. | `server.ts:837` | Compromission totale de la plateforme. |
| S3 | **Auto-inscription « sandbox » sur `/api/login`** : un numéro inconnu crée un compte **crédité de 100 000 FCFA**. | `server.ts:305-320` | Création illimitée de comptes avec solde fictif ; fausse toutes les statistiques et les commissions. |
| S4 | **`/api/wallet/recharge` crédite le solde sans aucun paiement réel** — pas d'intégration Mobile Money, pas de webhook, pas d'idempotence. | `server.ts:233-252` | Tout utilisateur connecté s'auto-crédite 1 000 000 FCFA par appel, en boucle. |
| S5 | **`positions` non validé sur `/api/groups/join`** : une valeur négative rend `totalCost` négatif → `newBalance = solde - (négatif)` **augmente le solde**. Une chaîne de caractères provoque une concaténation dans le contrôle de places (`0 + "1" = "01"`). | `server.ts:417-444` | Création d'argent à volonté. |
| S6 | **Le mot de passe est stocké en clair** dans `users.password`, en plus du hash — à l'inscription, au login auto, et pour l'admin seedé. | `schema.sql:10`, `server.ts:90, 285, 313` | Fuite de tous les mots de passe si la base est compromise ; réutilisation de mots de passe. |
| S7 | **Les réponses API renvoient la ligne `users` complète**, donc `password` (clair) et `password_hash`, sur `/api/login`, `/api/register`, `/api/users/me` et `/api/admin/users` (`select('*')`). | `server.ts:293, 334, 346, 615` | Exfiltration des identifiants de tous les utilisateurs via une simple requête HTTP. |
| S8 | **`JWT_SECRET` a une valeur de repli codée en dur** (`tontine-pro-secret-key-123456`) et le serveur démarre quand même (simple `console.warn`). Idem `ADMIN_PHONE=0000` / `ADMIN_PASSWORD=admin1234` par défaut. | `server.ts:12-15, 80-81` | Forge de jetons administrateur triviale si le `.env` est incomplet. |
| S9 | **Absence totale d'atomicité sur les mouvements d'argent** : partout le pattern est `SELECT balance` → calcul en JS → `UPDATE balance = valeur`. | `server.ts:190-191, 243-244, 443-444, 488-489, 459` | Double dépense par requêtes concurrentes ; solde négatif ; aucune contrainte `CHECK (balance >= 0)`. |

### P1 — Élevés

- **S10 — `GET /api/groups/:id` est public** et renvoie la liste des membres avec **téléphone et selfie** (`server.ts:405-415`). Fuite de données personnelles sans authentification.
- **S11 — Mot de passe en clair dans `localStorage`** (`tontine_pro_credentials`) plus un mécanisme d'« auto-recovery » qui **ré-inscrit silencieusement le compte** si le login échoue (`AuthContext.tsx:42-114`). Vestige de l'ère SQLite : dangereux et inutile avec Supabase. Toute XSS = vol du mot de passe.
- **S12 — Aucun durcissement HTTP** : `cors()` sans origine (`*`) sur une API à jetons Bearer, pas de `helmet`, pas de CSP, **pas de rate limiting** → brute-force libre sur `/api/login`, spam d'inscription (`server.ts:125`).
- **S13 — Aucune vérification du numéro de téléphone** : l'UI a un champ `smsCode` mais aucun OTP n'existe côté serveur. L'identité du titulaire n'est jamais prouvée.
- **S14 — Le bannissement n'invalide pas les jetons existants** : `is_banned` n'est contrôlé qu'au login. Un utilisateur banni reste actif jusqu'à 7 jours.
- **S15 — Aucune validation d'entrée** (pas de `zod`/`joi`) sur l'ensemble des routes. `dayIndex` n'est pas borné à `[0, total_days-1]`, `stake`/`maxMembers` côté admin ne sont pas typés, `type`/`content` des messages n'ont pas de longueur maximale.
- **S16 — Interpolation non échappée dans les filtres PostgREST `.or()`** : `` `referred_by.eq.${userId}` ``, `` `role.eq.admin,phone.eq.${adminPhone}` ``, `` `id.eq.${child.referred_by}` `` (`server.ts:83, 371, 749`). Une virgule ou une parenthèse dans la valeur détourne la syntaxe du filtre.
- **S17 — RLS activée sans aucune policy**, et tout transite par la clé `service_role` qui contourne RLS. La sécurité repose à 100 % sur Express : aucune défense en profondeur.
- **S18 — `vite.config.ts` injecte `process.env.GEMINI_API_KEY` dans le bundle client** (`vite.config.ts:12`). Si la variable est définie, la clé part chez tous les visiteurs. Vestige AI Studio à supprimer.
- **S19 — `express.json({ limit: '10mb' })` + selfies base64 stockés en `TEXT`** : DoS mémoire/stockage, aucune validation MIME ni de taille d'image côté serveur.
- **S20 — Fuite d'information par les messages d'erreur** : `res.status(500).json({ error: e.message })` renvoie les erreurs PostgreSQL brutes au client (une vingtaine d'occurrences).

### P2 — Modérés

- Numéros de téléphone (PII) écrits en clair dans les logs à chaque tentative de connexion (`server.ts:302, 306`).
- Aucun journal d'audit sur les opérations financières — seules les modifications de paramètres sont tracées dans `system_logs`.
- `genId()` repose sur `Math.random()` : non cryptographique et sujet aux collisions sur des identifiants d'utilisateurs et de paiements (`server.ts:17`). Utiliser `crypto.randomUUID()`.
- JWT en `localStorage` (plutôt que cookie `httpOnly`+`SameSite`), 7 jours, sans refresh ni révocation.
- Aucun contrôle d'anti-abus sur le parrainage : +500 FCFA par filleul sans plafond ; le bonus « parrain actif » de +1 500 FCFA se redéclenche si un membre est retiré puis réintégré d'un groupe (`server.ts:452-462`).
- Aucune contrainte d'unicité `(group_id, user_id)` sur `group_members` : un utilisateur peut rejoindre plusieurs fois le même groupe.

*Point positif :* aucun `dangerouslySetInnerHTML`, `innerHTML` ou `eval` dans `src/` — pas de surface XSS directe. Les mots de passe utilisent bien `bcrypt` (en parallèle du stockage clair, à supprimer).

---

## 2. Architecture

### Backend

- **Monolithe** : les 867 lignes de `server.ts` tiennent dans une seule fonction `startServer()`. Pas de séparation routes / services / accès données, pas de couche de validation, pas de gestionnaire d'erreurs centralisé.
- **Middleware admin exécuté deux fois** : `app.use("/api/admin", ...)` couvre déjà les sous-chemins, `app.use("/api/admin/*", ...)` fait doublon (`server.ts:566-567`). Chaque appel admin déclenche deux requêtes en base.
- **Requêtes N+1 systématiques** : `/api/admin/tontines` (2 requêtes par groupe), `/api/admin/cards` (1 par carte), `/api/admin/referrals` (2 par filleul), `/api/referrals` (1 par filleul), `/api/my-cards` (1 par carte). À remplacer par des jointures ou des RPC.
- **Aucune pagination** sur `/api/admin/users`, `/api/admin/tontines`, `/api/admin/cards`.
- **`PORT` codé en dur à 3000** (`server.ts:121`) → incompatible avec Render/Heroku/Fly, qui imposent `process.env.PORT`.
- **`startServer()` n'a pas de `.catch()`** et il n'y a pas de handler `unhandledRejection` / `uncaughtException` : si Supabase est indisponible au démarrage, crash silencieux.
- **`lib/supabase.ts` utilise `process.env.X!`** sans validation : message d'erreur incompréhensible si le `.env` est incomplet.
- Pas de route `/health`, pas de logging structuré (pino/winston), pas de Sentry ni de métriques.

### Base de données

- **`balance REAL` pour de l'argent** (`schema.sql:13`) → erreurs d'arrondi flottant. Le FCFA n'a pas de décimales : utiliser `BIGINT`.
- **Types de dates incohérents** : `payments.timestamp` et `group_members.joined_at` en `TEXT`, mais `card_payments.paid_at` et `my_cards.created_at` en `TIMESTAMPTZ`. Les tris et comparaisons de dates sont fragiles.
- **Aucun index secondaire.** Manquent au minimum : `group_members(user_id)`, `group_members(group_id)`, `wallet_transactions(user_id, created_at)`, `payments(group_id)`, `payments(user_id)`, `users(referred_by)`, `my_cards(user_id)`. La plateforme s'effondrera dès quelques milliers de lignes.
- **Pas de `ON DELETE CASCADE`** : les suppressions en cascade sont faites à la main en deux requêtes non transactionnelles (`server.ts:213-214, 732-733`).
- **Pas de système de migrations** : un unique `schema.sql` à coller manuellement dans l'éditeur SQL Supabase. Aucun versionnage du schéma, aucun rollback possible.
- `payout_order` existe dans `group_members` mais n'est **jamais renseigné ni lu**.

### Fonctionnel — les manques structurants

- **Le cœur métier de la tontine est absent.** Il n'y a ni cycles, ni ordre de bénéficiaire, ni calendrier d'échéances, ni distribution des gains, ni gestion des retards/défauts, ni clôture de tontine. L'application **collecte de l'argent mais ne le redistribue jamais**.
- **Aucun retrait.** Pas de route, pas de payout Mobile Money, pas de workflow de validation. Le paramètre `withdrawal_limit` de l'écran admin n'est branché sur rien.
- **Aucun encaissement réel.** La recharge est fictive (cf. S4) : aucun agrégateur (Wave, Orange Money, MTN MoMo, CinetPay/PayDunya) n'est intégré.
- **Les paramètres admin sont décoratifs** : `commission_rate`, `min_deposit`, `max_deposit`, `formulas_config` sont écrits en base mais **jamais relus par le serveur** — les valeurs sont codées en dur (`0.1`, `500`, `1000000`) dans `server.ts`.
- **La page Paiements est un placeholder** de 16 lignes (`src/pages/Payments.tsx`).
- Pas de notifications (SMS/push), pas de relances d'échéance, pas d'export comptable.

### Frontend

- **Pas de routeur** (`react-router` absent) : la navigation passe par un état React. Conséquences : pas d'URL partageables, pas de deep-linking (hormis le contournement `/invite/:code`), le bouton retour du navigateur ne fonctionne pas, un rafraîchissement perd le contexte.
- **Composants monolithiques** : `GuestView.tsx` (1 155 l.), `MyCard.tsx` (934 l.), `Groups.tsx` (569 l.), `App.tsx` — qui mélange landing, authentification, caméra et navigation admin.
- **Pas de client API typé** : les `fetch` sont dispersés dans les composants. `authFetch` envoie un en-tête `user-id: token` inutilisé côté serveur (`useAuth.ts:37`).
- **Double source de vérité sur les cartes** : cache `localStorage` + `syncLocalCardsToBackend` (`MyCard.tsx:84-124`) peut ressusciter des cartes supprimées.
- `compressImage` est dupliqué entre `App.tsx:28` et `src/utils/imageUtils.ts`.
- Gestion d'erreurs par `alert()` natif ; aucun état de chargement/erreur unifié.

---

## 3. Qualité et exploitation

- **Aucun test** — pas un seul fichier de test dans le dépôt.
- **Aucune CI** — pas de répertoire `.github`.
- **Pas de linter ni de formateur** : le script `lint` se limite à `tsc --noEmit`. Pas d'ESLint, pas de Prettier.
- `tsconfig.json` n'active **ni `strict`, ni `noUnusedLocals`, ni `noImplicitAny`** ; le code est truffé de `any` (`req: any`, `res: any`, `e: any`).
- Pas de Dockerfile, pas de documentation de déploiement, pas de procédure de sauvegarde/restauration.
- **Identité projet non faite** : `package.json` s'appelle `react-example`, le `README.md` est le gabarit AI Studio (il documente `GEMINI_API_KEY`, sans rapport avec le projet), `metadata.json` est un résidu AI Studio.
- **`INTEGRATION_ANDROID.md` est désynchronisé du code** : il documente `/api/auth/register`, `/api/auth/login`, `/api/auth/verify`, `/api/cards`, `/api/cards/pay`, `/api/referrals/stats`, `/api/referrals/relations` — **aucune de ces routes n'existe**. Les vraies sont `/api/register`, `/api/login`, `/api/my-cards`, `/api/my-cards/:id/pay`, `/api/referrals`. Une équipe mobile suivant ce document obtiendrait des 404 sur toute l'intégration.

---

## 4. Conformité et réglementaire

Point à trancher avant tout développement supplémentaire, car il conditionne l'architecture :

- Aucune CGU, aucune politique de confidentialité, aucun consentement collecté — alors que l'application capture un **selfie** et un numéro de téléphone.
- Aucun KYC, aucune traçabilité LCB-FT, aucun seuil de déclaration.
- En zone UEMOA, la collecte et la détention de fonds du public exigent un agrément d'établissement de monnaie électronique ou un partenariat avec un établissement agréé. Le modèle actuel (solde interne alimenté par Mobile Money, redistribution entre membres) tombe dans ce périmètre.

---

## 5. Plan de remise à niveau proposé

### Lot 0 — Colmatage sécurité (avant toute démonstration publique)
1. Rendre le mot de passe **obligatoire** et supprimer les branches `isMatch = true` (S1, S2).
2. Supprimer l'auto-inscription dans `/api/login` et le crédit de 100 000 FCFA (S3).
3. Supprimer la colonne `password` en clair ; ne conserver que `password_hash` (S6).
4. Introduire un DTO de sortie utilisateur (liste blanche de champs) appliqué à toutes les réponses (S7).
5. Faire échouer le démarrage si `JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` ou `ADMIN_PASSWORD` sont absents ou par défaut (S8).
6. Valider toutes les entrées avec `zod` ; borner `positions` à `[1, max]` en entier (S5, S15).
7. Ajouter `helmet`, une allow-list CORS et `express-rate-limit` sur `/api/login` et `/api/register` (S12).
8. Authentifier `GET /api/groups/:id` et retirer téléphone/selfie de la réponse (S10).
9. Supprimer le stockage des mots de passe en `localStorage` et tout le mécanisme d'« auto-recovery » (S11).
10. Retirer l'injection de `GEMINI_API_KEY` de `vite.config.ts` (S18).

### Lot 1 — Intégrité financière
11. Déplacer **tous** les mouvements de solde dans des fonctions PL/pgSQL transactionnelles (`UPDATE ... SET balance = balance - x WHERE id = ? AND balance >= x`), avec `CHECK (balance >= 0)` et `balance` en `BIGINT` (S9).
12. Neutraliser `/api/wallet/recharge` jusqu'à l'intégration d'un agrégateur Mobile Money réel, avec webhook signé et clé d'idempotence (S4).
13. Ajouter un journal d'audit immuable sur chaque mouvement d'argent.
14. Brancher `system_settings` (commission, plafonds, formules) sur la logique serveur.

### Lot 2 — Cœur métier
15. Modéliser les cycles de tontine : échéancier, ordre de bénéficiaire, distribution, retards, clôture.
16. Implémenter le parcours de retrait (demande → validation → payout → réconciliation).
17. Remplacer la page Paiements placeholder par l'historique réel.

### Lot 3 — Architecture et industrialisation
18. Découper `server.ts` en routes / services / repositories ; gestionnaire d'erreurs centralisé.
19. Migrations versionnées + index + `ON DELETE CASCADE` + `UUID`/`TIMESTAMPTZ`.
20. Supprimer les N+1, ajouter la pagination.
21. `react-router` côté client, découpage des composants > 500 lignes, client API typé.
22. `strict: true`, ESLint/Prettier, tests (Vitest + Supertest sur les parcours d'argent), CI GitHub Actions.
23. `process.env.PORT`, `/health`, logs structurés, Sentry, Dockerfile, documentation de déploiement.
24. Réécrire `README.md` et resynchroniser `INTEGRATION_ANDROID.md` avec les routes réelles.

### Lot 4 — Conformité
25. CGU, politique de confidentialité, consentement, KYC, cadrage réglementaire UEMOA.
