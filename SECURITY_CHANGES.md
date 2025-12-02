# Rapport de sécurisation (E21 → E29)

## 1. Correctifs de sécurité appliqués

| Domaine | Fichiers clés | Détails |
| --- | --- | --- |
| API principale | `backend/controllers/*.js`, `backend/middlewares/authMiddleware.js`, `backend/routes/authRoutes.js`, `backend/routes/orderRoutes.js`, `backend/server.js`, `backend/utils/validationSchemas.js` | Suppression des journaux sensibles, ajout d’un validateur centralisé (Joi) pour toutes les entrées utilisateurs, sécurisation de la création de commandes (recalcul des prix côté serveur, validation des ObjectId, messages d’erreur cohérents), mise en place de `helmet`, limitation du JSON à 10 kb et rate limiting ciblé sur `/api/auth`, remplacement du stockage du JWT par un cookie `HttpOnly` sécurisé et ajout d’un logger Winston + gestionnaire d’erreurs global. |
| Gateway & microservices | `gateway/server.js`, `gateway/routes/*.js`, `microservices/notifications/index.js`, `microservices/stock-management/index.js` | Vérification obligatoire des URL de proxy, ajout de `helmet`, validation stricte du corps des requêtes (email/texte/nettoyés pour la notification, identifiant + quantité pour la mise à jour de stock) et suppression de toute fuite d’informations d’environnement. |
| Frontend | `frontend/src/{services,context,pages,components}/*.js` | Nettoyage des valeurs avant envoi, suppression de toute manipulation de token (remplacé par cookie `HttpOnly` + `withCredentials`), gestion centralisée des requêtes Axios, verrouillage des sélections (livraison/paiement), validation client-side (login/register), sécurisation du contexte panier et de l’adresse de livraison, gestion des erreurs d’API pour limiter les fuites de stack trace. |
| Tooling | `.env.example`, `.eslintrc.json`, `.prettierrc.json`, `package.json` (racine) | Ajout d’un fichier d’exemple `.env`, installation/configuration de ESLint + Prettier pour l’ensemble du monorepo et scripts `npm run lint` pour automatiser les contrôles qualité. |

## 2. Durcissement et contrôle des données

- Backend : toutes les routes critiques rejettent désormais les données non conformes (validateurs Joi + vérification d’ObjectId Mongoose). Les adresses, méthodes de paiement/livraison et statuts respectent les énumérations métier.
- Frontend : chaque saisie utilisateur est filtrée (`CartContext`, `ShippingAddress`, formulaires Login/Register) avant de rejoindre l’API et les champs obligatoires sont vérifiés avant l’appel.
- Microservices : les charges utiles acceptées par `/notify` et `/update-stock` sont limitées en taille et nettoyées pour éviter les injections/DoS.

## 3. Mise à jour des bibliothèques

| Projet | Actions |
| --- | --- |
| `backend` | Bascule sur `axios@^1.13.2`, `bcryptjs@^3.0.3`, `debug@^4.4.3`, `dotenv@^16.6.1`, `express@^4.22.1`, `mongoose@^8.20.1` + ajout de `helmet@^8.1.0`, `express-rate-limit@^8.2.1`, `joi@^18.0.2`. |
| `gateway` & microservices | Mise à jour d’`express`, `dotenv`, `express-http-proxy`, `nodemailer@^7.0.11` (patch vulnérabilité GHSA-mm7p-fcc7-pg87) et alignement des `package-lock.json`. |
| `frontend` | `axios@^1.13.2`, `react-router-dom@^6.4.5` + `npm audit fix`. Il reste 9 vulnérabilités (svgo/postcss/webpack-dev-server) liées à `react-scripts@5.0.1`. Une migration vers Vite ou CRA 6 (quand disponible) est recommandée pour les éliminer proprement. |

Tous les `npm install` ont été relancés service par service et `npm audit` est propre partout sauf sur le frontend (limitations expliquées ci‑dessus).

## 4. Tests et vérifications

1. Vérifier que MongoDB et les microservices sont joignables puis lancer `npm run start:backend` et `npm run start:all` depuis la racine.
2. Scénarios à vérifier manuellement :
   - Inscription/connexion avec des valeurs invalides (doivent être rejetées).
   - Passage de commande avec données incomplètes ou valeurs négatives (doit retourner 400).
   - Mise à jour du stock et statut commande depuis `/admin` (valeurs invalides rejetées, succès journalisé).
    3. Pour suivre les vulnérabilités restantes côté frontend, garder un `npm audit` régulier et planifier la migration de l’outillage de build.

## 5. Pistes complémentaires

- Ajouter des tests d’intégration autour des routes `/api/orders` pour verrouiller les validations.
- Externaliser les URL des microservices vers la configuration (Vault/Secrets Manager) pour éviter la configuration en dur dans l’environnement de prod.
- Remplacer `react-scripts` par un outil maintenu dès que possible afin d’éliminer les dépendances dépréciées (svgo 1.x, webpack-dev-server 3.x).
- Ajouter un mécanisme de notifications utilisateur (type toast) côté frontend à la place de `connect-flash`, plus adapté aux architectures SPA/API.
