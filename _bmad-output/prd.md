# PRD - Kountz : Application de Comptage et Suivi d'Objectifs

**Version :** 1.0 (MVP)
**Date :** 2026-05-18
**Auteur :** Product Manager
**Statut :** Draft

---

## 1. Vision

Kountz est une Progressive Web App personnelle de comptage et de suivi d'objectifs quotidiens. Elle permet de se fixer des objectifs structurés (comme des séries d'exercices physiques), de les planifier intelligemment, et de suivre sa progression au fil du temps. L'application est conçue pour être rapide, utilisable hors-ligne, et accessible depuis n'importe quel navigateur mobile.

**Proposition de valeur :** Remplacer les méthodes manuelles (notes, calcul mental, minuteries séparées) par un outil unique qui planifie, rappelle et compte pour l'utilisateur.

---

## 2. Objectifs

| # | Objectif | Critère de succès |
|---|----------|-------------------|
| O1 | Permettre la création et le suivi d'objectifs quotidiens structurés avec séries et pauses | L'utilisateur peut configurer, exécuter et compléter un objectif de 200 pompes en séries de 20 sans quitter l'app |
| O2 | Fournir un comptage libre pour des événements ponctuels | L'utilisateur peut incrémenter un compteur en un seul tap |
| O3 | Offrir une vue historique de la progression | L'utilisateur peut consulter ses résultats des 30 derniers jours |
| O4 | Fonctionner de manière fiable hors-ligne et sur mobile | L'app est installable en PWA et fonctionne sans connexion |
| O5 | Envoyer des rappels quand une pause est terminée | Les notifications push fonctionnent même si l'app est en arrière-plan |

---

## 3. Personas

### Persona principal : Swanny

- **Profil :** Utilisateur unique, tech-savvy, utilise un Samsung Galaxy S25 Ultra
- **Contexte :** Souhaite structurer ses objectifs physiques quotidiens (pompes, abdos, etc.) et tracker des habitudes
- **Frustrations actuelles :**
  - Calcul mental pour répartir les séries sur la journée
  - Oubli de reprendre après une pause
  - Pas de visibilité sur la progression dans le temps
- **Besoins :**
  - Configuration rapide une fois, exécution simple au quotidien
  - Rappels fiables quand la pause est terminée
  - Vue claire de ce qui reste à faire aujourd'hui
  - Historique pour mesurer la régularité

---

## 4. User Stories

### 4.1 Objectif structuré

| ID | En tant que... | Je veux... | Afin de... | Priorité |
|----|----------------|------------|------------|----------|
| US-01 | utilisateur | créer un objectif quotidien avec un nombre cible (ex: 200 pompes) | me fixer un but clair pour la journée | Must |
| US-02 | utilisateur | paramétrer le nombre max par série (ex: 20) | adapter l'effort à ma capacité | Must |
| US-03 | utilisateur | paramétrer le temps de pause entre séries (ex: 30 min) | récupérer suffisamment entre chaque série | Must |
| US-04 | utilisateur | définir une heure de début obligatoire | savoir quand commencer ma session | Must |
| US-05 | utilisateur | optionnellement définir une heure de fin | contraindre ma session dans un créneau | Should |
| US-06 | utilisateur | voir le calcul automatique du nombre de séries et de l'heure estimée de fin | planifier ma journée en conséquence | Must |
| US-07 | utilisateur | choisir un mode de répartition (dégressif ou progressif) | adapter la difficulté à ma fatigue | Should |
| US-08 | utilisateur | recevoir une notification quand ma pause est terminée | ne pas oublier de reprendre | Must |
| US-09 | utilisateur | valider chaque série terminée via un bouton | confirmer mon avancement de manière fiable | Must |
| US-10 | utilisateur | voir ma progression en temps réel (X/200) | savoir exactement où j'en suis | Must |

### 4.2 Comptage libre

| ID | En tant que... | Je veux... | Afin de... | Priorité |
|----|----------------|------------|------------|----------|
| US-11 | utilisateur | créer un compteur simple nommé (ex: "Gros mots") | tracker un événement récurrent | Must |
| US-12 | utilisateur | incrémenter le compteur d'un tap | compter rapidement sans friction | Must |
| US-13 | utilisateur | voir le total du jour pour chaque compteur | avoir une vue d'ensemble quotidienne | Must |

### 4.3 Statistiques

| ID | En tant que... | Je veux... | Afin de... | Priorité |
|----|----------------|------------|------------|----------|
| US-14 | utilisateur | consulter l'historique journalier de mes objectifs | mesurer ma régularité | Must |
| US-15 | utilisateur | voir un calendrier ou une liste des jours passés | repérer les jours où j'ai atteint mes objectifs | Should |
| US-16 | utilisateur | voir la progression par objectif dans le temps | visualiser mon évolution | Should |

---

## 5. Exigences fonctionnelles détaillées

### 5.1 Gestion des objectifs structurés

#### 5.1.1 Création d'un objectif

- **Champs obligatoires :**
  - Nom de l'objectif (texte libre, ex: "Pompes")
  - Nombre cible quotidien (entier positif, ex: 200)
  - Nombre max par série (entier positif, ex: 20)
  - Temps de pause entre séries (en minutes, ex: 30)
  - Heure de début (format HH:MM)
- **Champs optionnels :**
  - Heure de fin (format HH:MM)
  - Mode de répartition : uniforme (défaut), dégressif, progressif
- **Validation :** le nombre cible doit être supérieur ou égal au nombre max par série

#### 5.1.2 Calcul automatique de la planification

Le système calcule automatiquement à la création/modification :

- **Nombre de séries :** `ceil(cible / max_par_série)`
- **Durée totale estimée :** `(nombre_séries - 1) * temps_pause` (les séries elles-mêmes sont considérées instantanées pour le calcul)
- **Heure estimée de fin :** `heure_début + durée_totale`
- **Si heure de fin définie :** le temps de pause est recalculé pour tenir dans le créneau, ou un avertissement s'affiche si c'est impossible

#### 5.1.3 Répartition des séries

Trois modes de répartition du nombre de répétitions par série :

| Mode | Description | Exemple (200 en séries de 20 max) |
|------|-------------|-----------------------------------|
| **Uniforme** (défaut) | Toutes les séries sont égales, la dernière absorbe le reste | 10 x 20 |
| **Dégressif** | Les premières séries sont plus grandes, les dernières plus légères | 25, 25, 22, 22, 20, 20, 18, 18, 15, 15 (= 200) |
| **Progressif** | La plus grosse série est au début, puis décroissance | 30, 28, 25, 22, 20, 18, 18, 15, 12, 12 (= 200) |

Note : les valeurs exactes de la répartition dégressive/progressive seront déterminées par un algorithme garantissant que la somme atteint exactement la cible et qu'aucune série ne dépasse le max.

#### 5.1.4 Exécution d'une session

- Écran d'exécution affichant :
  - Numéro de la série en cours (ex: "Série 3/10")
  - Nombre de répétitions à faire pour cette série (ex: "20 pompes")
  - Progression globale (ex: "40/200 - 20%")
  - Barre de progression visuelle
- **Bouton "Série terminée"** : large, facile à toucher, valide la série courante
- Après validation d'une série :
  - Le compteur global s'incrémente
  - Si ce n'est pas la dernière série : le timer de pause démarre
  - Si c'est la dernière série : écran de félicitations / résumé

#### 5.1.5 Timer de pause

- Compte à rebours visuel (MM:SS)
- Notification push quand le timer atteint zéro (même si l'app est en arrière-plan)
- Son/vibration configurable
- Bouton "Passer la pause" pour enchaîner immédiatement

#### 5.1.6 Persistance quotidienne

- Chaque jour, l'objectif se réinitialise automatiquement (compteur à zéro)
- L'objectif configuré persiste (pas besoin de recréer chaque jour)
- Les données du jour en cours sont sauvegardées en temps réel (reprise possible après fermeture de l'app)

### 5.2 Comptage libre

- Créer un compteur nommé avec un bouton "+"
- Le compteur affiche le total du jour
- Bouton "-1" pour corriger une erreur
- Le compteur se réinitialise chaque jour à minuit
- Historique conservé (total par jour)

### 5.3 Statistiques et historique

- **Vue liste :** historique des 30 derniers jours, par objectif/compteur
  - Pour chaque jour : cible, réalisé, pourcentage d'atteinte
  - Indicateur visuel (vert = objectif atteint, rouge = non atteint)
- **Vue calendrier :** grille mensuelle avec code couleur par jour
  - Vert : objectif atteint (100%+)
  - Orange : partiellement atteint (50-99%)
  - Rouge : peu ou pas fait (< 50%)
  - Gris : pas de données
- **Streak (série consécutive) :** affichage du nombre de jours consécutifs où l'objectif a été atteint

### 5.4 Navigation et écrans

| Écran | Description |
|-------|-------------|
| **Accueil / Dashboard** | Liste des objectifs et compteurs du jour avec progression |
| **Exécution objectif** | Écran de session active (série en cours, timer, progression) |
| **Création/édition** | Formulaire de configuration d'un objectif ou compteur |
| **Statistiques** | Historique et calendrier par objectif |
| **Paramètres** | Configuration notifications, thème |

---

## 6. Exigences non-fonctionnelles

### 6.1 Performance

| Critère | Cible |
|---------|-------|
| Temps de chargement initial | < 2 secondes sur 4G |
| Temps de réponse au tap (validation série, incrémentation) | < 100ms |
| Taille totale de l'application | < 500 Ko (hors cache) |
| Lighthouse Performance score | > 90 |

### 6.2 Fiabilité

- L'application doit fonctionner intégralement hors-ligne après le premier chargement
- Les données ne doivent jamais être perdues (sauvegarde à chaque action)
- Le timer de pause doit fonctionner même si l'app est en arrière-plan (via Service Worker)

### 6.3 Compatibilité

- **Navigateurs cibles :** Chrome Android (priorité), Samsung Internet, Firefox Android, Safari iOS
- **Device principal :** Samsung Galaxy S25 Ultra (écran 6.9", résolution 3120x1440)
- **Responsive :** mobile-first, utilisable sur tablette et desktop
- **PWA :** installable sur l'écran d'accueil, splash screen, icône personnalisée

### 6.4 Accessibilité

- Contraste suffisant (ratio WCAG AA minimum)
- Boutons de taille minimum 48x48 dp
- Labels sur tous les champs de formulaire

### 6.5 Sécurité et vie privée

- Aucune donnée transmise à un serveur (tout est local)
- Pas de tracking ni analytics tiers

---

## 7. Architecture technique

### 7.1 Stack technique

| Composant | Choix |
|-----------|-------|
| **Frontend** | HTML5 / CSS3 / JavaScript vanilla (ou framework léger type Preact/Alpine.js si justifié) |
| **Stockage** | IndexedDB (données structurées, historique) + localStorage (préférences) |
| **Notifications** | Service Worker + Notification API |
| **Hors-ligne** | Service Worker avec stratégie cache-first |
| **Hébergement** | GitHub Pages (statique, gratuit, HTTPS) |

### 7.2 Structure des données (IndexedDB)

```
objectives {
  id: string (UUID)
  name: string
  dailyTarget: number
  maxPerSet: number
  restMinutes: number
  startTime: string (HH:MM)
  endTime: string | null (HH:MM)
  distribution: "uniform" | "degressive" | "progressive"
  type: "structured"
  createdAt: timestamp
}

counters {
  id: string (UUID)
  name: string
  type: "free"
  createdAt: timestamp
}

dailyLogs {
  id: string (UUID)
  objectiveId: string (ref objectives.id)
  date: string (YYYY-MM-DD)
  target: number
  completed: number
  sets: [{ planned: number, done: boolean, completedAt: timestamp | null }]
  startedAt: timestamp | null
  completedAt: timestamp | null
}

counterLogs {
  id: string (UUID)
  counterId: string (ref counters.id)
  date: string (YYYY-MM-DD)
  count: number
  events: [{ timestamp: timestamp, delta: number }]
}
```

### 7.3 Service Worker

- **Cache :** tous les assets statiques (HTML, CSS, JS, icônes)
- **Stratégie :** cache-first avec mise à jour en arrière-plan (stale-while-revalidate)
- **Notifications :** gestion des timers via `setTimeout` dans le Service Worker ; fallback sur `setInterval` avec vérification périodique si le Service Worker est tué par l'OS
- **Manifest :** `manifest.json` avec nom, icônes, couleur du thème, `display: standalone`

### 7.4 Arborescence fichiers (estimée)

```
kountz/
├── index.html
├── manifest.json
├── sw.js                  # Service Worker
├── css/
│   └── style.css
├── js/
│   ├── app.js             # Point d'entrée, routeur
│   ├── db.js              # Couche IndexedDB
│   ├── objectives.js      # Logique objectifs structurés
│   ├── counters.js        # Logique compteurs libres
│   ├── timer.js           # Timer de pause + notifications
│   ├── stats.js           # Statistiques et historique
│   └── ui.js              # Composants UI réutilisables
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
└── README.md
```

---

## 8. Métriques de succès

Étant une application personnelle, les métriques sont orientées usage et satisfaction :

| Métrique | Objectif | Méthode de mesure |
|----------|----------|-------------------|
| **Utilisation quotidienne** | L'app est utilisée au moins 5 jours/semaine pendant 1 mois | Vérification via l'historique dans l'app |
| **Taux de complétion d'objectif** | Au moins 70% des objectifs quotidiens sont complétés | Données dans dailyLogs |
| **Fiabilité des notifications** | Les notifications de fin de pause arrivent dans les 5 secondes | Test manuel sur les 10 premières sessions |
| **Friction perçue** | L'exécution d'une session ne nécessite aucune configuration quotidienne | Feedback subjectif |
| **Temps d'installation** | De zéro à première session complète en moins de 5 minutes | Test lors du premier déploiement |
| **Score Lighthouse PWA** | 100/100 sur la catégorie PWA | Audit Lighthouse |

---

## 9. Hors scope V1

Les éléments suivants sont explicitement exclus du MVP et pourront être considérés dans des versions futures :

- Synchronisation cloud / multi-device
- Compte utilisateur / authentification
- Partage social (classements, défis entre amis)
- Gamification avancée (badges, récompenses, niveaux)
- Export des données (CSV, JSON)
- Objectifs non-quotidiens (hebdomadaires, mensuels)
- Personnalisation avancée des algorithmes de répartition
- Mode sombre (peut être ajouté en V1.1 si rapide à implémenter)

---

## 10. Risques et mitigations

| Risque | Impact | Probabilité | Mitigation |
|--------|--------|-------------|------------|
| Les notifications ne fonctionnent pas en arrière-plan sur certains OS/navigateurs | Élevé | Moyenne | Tester sur le device cible dès le début ; prévoir un fallback visuel (écran qui clignote au retour) |
| Le Service Worker est tué par l'OS pendant un timer long (30 min) | Élevé | Élevée | Stocker l'heure de fin prévue en IndexedDB ; au réveil, recalculer l'état du timer |
| Perte de données si le localStorage/IndexedDB est vidé | Moyen | Faible | Envisager un export JSON manuel en V1.1 |
| L'algorithme de répartition dégressive/progressive produit des séries incohérentes | Moyen | Faible | Tests unitaires couvrant les cas limites (cible = max, cible < max, nombres premiers, etc.) |

---

## 11. Planning indicatif

| Phase | Contenu | Durée estimée |
|-------|---------|---------------|
| **Sprint 1** | Infrastructure PWA + écran d'accueil + création d'objectif structuré | 2-3 jours |
| **Sprint 2** | Exécution de session (séries, timer, validation) + notifications | 2-3 jours |
| **Sprint 3** | Compteurs libres + historique journalier | 1-2 jours |
| **Sprint 4** | Statistiques (vue calendrier, streaks) + polish UI | 2-3 jours |
| **Sprint 5** | Tests, corrections de bugs, déploiement GitHub Pages | 1-2 jours |

**Durée totale estimée :** 8-13 jours de développement

---

*Document vivant - sera mis à jour au fil de l'avancement du projet.*
