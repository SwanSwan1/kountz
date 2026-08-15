---
project_name: 'kountz'
user_name: 'Swanny'
date: '2026-06-07'
sections_completed: ['technology_stack', 'language_rules', 'framework_rules', 'testing_rules', 'code_quality', 'workflow', 'critical_rules']
existing_patterns_found: 12
status: 'complete'
rule_count: 44
optimized_for_llm: true
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

### Front-end (racine du projet) — PWA vanilla, AUCUN build
- HTML5 + CSS3 + JavaScript ES5/ES6 **vanilla** — pas de framework, pas de bundler, pas de npm côté front
- Architecture : **modules IIFE** chargés en séquence par `<script>` dans `index.html`
  (ordre de dépendance : store → objectives → counters → timer → stats → ui → app)
- Persistance : **localStorage** uniquement (clé `kountz_data`), pas de backend de données
- Service Worker (`sw.js`) pour le mode hors-ligne et les notifications locales
- PWA : `manifest.json`, icônes SVG, installable, theme `#6C5CE7`

### Back-end — `worker/` (notifications push uniquement)
- **Cloudflare Worker** — `wrangler`, `compatibility_date = 2024-12-01`
- Stockage : **Cloudflare KV** (binding `KV`) — clés `sub:<deviceId>` et `sched:<deviceId>`
- Cron trigger : `*/5 * * * *` (envoi des notifications planifiées)
- Web Push **VAPID implémenté à la main** (RFC 8291 / aes128gcm via WebCrypto `crypto.subtle`)
- Module système : CommonJS (`"type": "commonjs"`)
- Dépendance déclarée : `web-push ^3.6.7` (présente mais NON utilisée — impl. custom)

### Contraintes de version / compatibilité
- Cible mobile principale : **Samsung Galaxy S25 Ultra** (Chrome Android), mobile-first
- Aucun process de build → le code livré = le code source (pas de transpilation)

## Critical Implementation Rules

### Language-Specific Rules (JavaScript)

**🎯 Architecture cible : ES modules natifs (décision projet).**
Le front migre du pattern IIFE actuel vers de vrais ES modules, SANS build ni bundler.
Objectif : **un module = une fonctionnalité isolée**, pour qu'une mise à jour ne touche
qu'au module concerné sans casser le reste.

- **ES modules natifs** : `export` / `import` explicites, chargés via
  `<script type="module" src="js/app.js"></script>` dans `index.html`
  (un seul point d'entrée ; les `import` tirent les dépendances). Aucun namespace global.
- **Migration progressive** : le code existant est encore en IIFE (`const X = (() => {...})()`).
  Toute évolution d'un module doit le convertir en ES module ; ne PAS mélanger les deux
  styles dans un même fichier.
- **Un module = une responsabilité, granularité fine** : éviter les fichiers monolithiques.
  Découper les gros fichiers actuels (`ui.js`, `app.js`) par fonctionnalité.
- **Dépendances explicites** : chaque module importe nommément ce dont il a besoin
  (`import { getObjectives } from './store.js'`) — plus de dépendance implicite à l'ordre
  des `<script>`. Mettre à jour `sw.js` (liste `ASSETS`) quand un fichier est ajouté/déplacé.
- **Accès données toujours via le module `store`** — ne jamais lire/écrire `localStorage`
  directement ailleurs.
- **Dates en chaîne `YYYY-MM-DD`** via `store.today()` — ne jamais persister d'objet `Date`.
- **IDs via `store.generateId()`** — ne pas inventer d'autre générateur.
- **Gestion d'erreur** : `try/catch` + `console.error(...)` autour des accès `localStorage` /
  `JSON.parse` ; fallback silencieux côté SW (`.catch(() => {})`) en mode hors-ligne.
- **Worker (`worker/`)** : reste en `export default { fetch, scheduled }` (syntaxe module
  Worker, distincte du front) — non concerné par la migration front.
- Commentaires JSDoc descriptifs en **français** ; pas de TypeScript.

### Framework / Architecture Rules (PWA modulaire)

- **SPA par hash routing** : navigation gérée dans `app` via `window.location.hash`
  + `history.pushState`. Chaque vue = une fonction de rendu. Le routeur mappe
  `view` → fonction `render*` du module UI.
- **Rendu = template strings** injectées dans `#app` (`innerHTML`). Pas de Virtual DOM,
  pas de réactivité auto → après toute mutation de données, **re-render explicite** la vue.
- **Handlers via `onclick="App.xxx()"`** dans le HTML généré → en ES modules, exposer
  les handlers nécessaires sur un objet global dédié (ex: `window.App`) car les attributs
  inline n'ont pas accès au scope module. (Alternative cible : `addEventListener` délégué.)
- **Couches séparées** : `store` (données) ← logique métier (`objectives`, `counters`,
  `stats`) ← `ui` (rendu) ← `app` (orchestration/routing). Une couche ne saute jamais
  par-dessus une autre (ex: `ui` passe par la logique métier, pas directement par calculs bruts).
- **Service Worker = cache-first** (stale-while-revalidate). Tout asset front doit être
  listé dans `ASSETS` de `sw.js` sinon il n'est pas dispo hors-ligne.
- **Versioning couplé** : `APP_VERSION` (app) et `CACHE_NAME` (sw.js) se bumpent ENSEMBLE
  à chaque release, sinon le SW sert l'ancien cache.
- **Notifications** : 2 canaux — push serveur (Worker + cron, fiable en arrière-plan) avec
  fallback rappels locaux SW (`setTimeout`, moins fiable Android). Le `deviceId` persistant
  (localStorage `kountz_device_id`) lie l'abonnement push au device.

### Testing Rules

- **État actuel : aucun test automatisé.** Pas de framework, pas de CI de test.
  Le `npm test` de `worker/` est un placeholder (exit 1).
- **Vérification manuelle obligatoire avant release** : tester sur mobile réel
  (Galaxy S25 Ultra / Chrome Android) — c'est la cible primaire.
  Parcours critiques à re-valider : création objectif, exécution d'une série,
  exercice minuté (hold/release/vibration), timer de pause, mode hors-ligne,
  notifications push.
- **Si des tests sont introduits** : privilégier une approche sans build
  (ex: fichiers de test ouvrables dans le navigateur, ou tests purs sur la
  logique métier de `store`/`objectives`/`stats` qui sont sans dépendances DOM).
- **Logique métier = priorité de test** : `objectives` (répartition des séries),
  `store` (streak, challenge info, dates), `stats` sont déterministes et testables
  isolément — cibles idéales si on ajoute des tests unitaires.
- **Ne pas bloquer une livraison sur l'absence de tests**, mais documenter ce qui
  a été vérifié manuellement.

### Code Quality & Style Rules

- **Tout en français** : commentaires, noms de fonctions/variables métier, libellés UI,
  messages utilisateur (`alert`, `confirm`). Garder cette cohérence linguistique.
- **Nommage** : fichiers en `kebab-case` (ou simple : `store.js`) ; fonctions et variables
  en `camelCase` ; modules exposés en `PascalCase` (IIFE actuel) → en ES modules, exports
  nommés en `camelCase`. Clés localStorage préfixées `kountz_` (`kountz_data`, `kountz_device_id`).
- **En-tête de fichier** : chaque module commence par un bloc commentaire JSDoc
  `/** nom-fichier.js - rôle du module */`.
- **Fonctions courtes et nommées explicitement** par leur intention métier
  (`getChallengeInfo`, `completeCurrentSet`, `calculateDistribution`).
- **CSS** : mobile-first, dark mode, variables CSS dans `:root` (`--primary`, `--bg`, etc.).
  Réutiliser les variables existantes plutôt que des valeurs en dur. Classes utilitaires
  type `text-muted`, `text-sm`, `btn-*`.
- **Pas de dépendances externes côté front** : ne pas ajouter de librairie/CDN sans raison
  forte — le projet est volontairement zéro-dépendance et hors-ligne.
- **Pas de linter/formatter configuré** : rester cohérent avec le style existant
  (indentation 2 espaces, guillemets simples, point-virgules).

### Development Workflow Rules

- **Déploiement front = automatique** : push sur `main` → GitHub Action `deploy.yml`
  publie tout le repo sur **GitHub Pages**. Donc tout commit sur `main` part en prod.
  Vérifier avant de pousser.
- **Déploiement Worker = manuel et séparé** : `worker/` se déploie via `wrangler deploy`
  vers `kountz-push.swanny-l.workers.dev`. N'est PAS couvert par l'action GitHub.
- **Messages de commit** : court résumé à l'impératif en anglais + suffixe de version
  `(vX.Y)` quand l'app évolue — ex: `Fix rest timer persisting after last set (v2.2)`.
  Le `(vX.Y)` doit correspondre à `APP_VERSION` dans `app.js`.
- **Bump de version = checklist** : à chaque release UI/comportement →
  (1) `APP_VERSION` dans `app.js`, (2) `CACHE_NAME` (`kountz-vN`) dans `sw.js`,
  (3) suffixe `(vX.Y)` dans le commit. Les trois doivent rester cohérents.
- **Workflow mono-branche** : travail directement sur `main`, pas de branches de feature
  actuellement. (Si on adopte des PR plus tard, le documenter ici.)
- **Secrets** : les clés VAPID privées vivent côté Worker (`wrangler secret` / `env`),
  jamais dans le front. La clé VAPID *publique* est dupliquée (front `app.js` + `wrangler.toml`)
  et doit rester identique des deux côtés.

### Critical Don't-Miss Rules (anti-patterns & gotchas)

- **🔴 Cache SW périmé** : oublier de bumper `CACHE_NAME` en même temps que `APP_VERSION`
  → les utilisateurs gardent l'ancienne version en cache. C'est LE piège n°1 de cette PWA.
- **🔴 Casser l'ordre de chargement** (en IIFE actuel) : un module qui appelle un autre
  chargé APRÈS lui dans `index.html` plante (`X is not defined`). En migrant vers ES modules,
  remplacer cette dépendance implicite par des `import` explicites.
- **🔴 Mutation sans re-render** : modifier les données via `store` ne rafraîchit pas l'UI.
  Toujours appeler la fonction `render*` ou `refreshCurrentView()` après une mutation.
- **🟠 Timers et arrière-plan** : `setInterval` se fige quand l'onglet passe en arrière-plan.
  Le `Timer` de pause utilise un **timestamp absolu** (`endTime`) pour recalculer le restant
  au retour — ne pas le remplacer par un simple décompte par tick.
- **🟠 Exercice minuté** : machine à états `hold → release → rep++ → done`, tick à 100ms
  (`countdown` en dixièmes de seconde). Ne pas confondre l'unité (×10) ni oublier de
  `clearInterval` via `stopTimedExercise()` en quittant la vue session.
- **🟠 Rappels push** : la planification se recalcule à chaque ouverture d'app
  (`registerPushAndSchedule`). Le Worker ne déclenche que dans la fenêtre de 5 min du cron —
  une notif dont l'heure est passée de >5 min est ignorée/purgée.
- **🟠 localStorage = limité et synchrone** : pas de gros volumes, tout passe par le cache
  mémoire `_cache` de `store`. Invalider/écrire via `store` uniquement (sinon `_cache` désync).
- **🟢 `confirm`/`alert` natifs** : utilisés pour les actions destructives (suppression,
  effacement total, import). Conserver une confirmation pour toute action irréversible.
- **🟢 Migrations de données** : `loadAll()` fusionne `{ ...defaultData, ...parsed }`.
  Ajouter un nouveau champ de données = l'ajouter à `defaultData` pour les anciens utilisateurs.

---

## Usage Guidelines

**Pour les agents IA :**

- Lire ce fichier AVANT d'implémenter du code dans kountz.
- Respecter toutes les règles à la lettre ; en cas de doute, choisir l'option la plus restrictive.
- Direction d'architecture : tout nouveau code front en **ES modules natifs** (migration progressive depuis IIFE).
- Mettre à jour ce fichier si de nouveaux patterns émergent.

**Pour les humains :**

- Garder ce fichier concis et focalisé sur les besoins des agents.
- Mettre à jour quand la stack ou les patterns évoluent (ex: fin de la migration ES modules → retirer les mentions « IIFE actuel »).
- Revoir périodiquement pour retirer les règles devenues évidentes.

Last Updated: 2026-06-07
