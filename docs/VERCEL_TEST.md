# Déploiement de test et compatibilité Vercel

## Architecture retenue

L’application utilise une **base MySQL/TiDB relationnelle** via Drizzle ORM et tRPC. Cette approche est compatible avec un environnement Vercel dès lors que la variable `DATABASE_URL` pointe vers une base accessible depuis les fonctions de déploiement, avec TLS activé lorsque le fournisseur l’exige.

| Élément | Rôle | Pré-requis de déploiement |
|---|---|---|
| `DATABASE_URL` | Chaîne de connexion MySQL/TiDB | Accessible depuis Vercel et configurée dans les variables d’environnement |
| Drizzle | Schéma et migrations | Exécuter les migrations hors du trafic utilisateur avant une mise en ligne |
| tRPC | API applicative sous `/api/trpc` | Conserver le routage de l’API dans la fonction Node compatible Vercel |
| Manus OAuth | Connexion et rôle utilisateur | Ajouter l’URL de production aux redirections autorisées |

## Démarrage de la base de test

1. Connectez-vous avec le compte administrateur.
2. Ouvrez **Années scolaires** puis initialisez `2026-2027`.
3. Créez les cours, enseignants et classes nécessaires.
4. Configurez les pondérations puis les affectations.
5. Créez ou importez les élèves. L’import XLSX/CSV vérifie les champs requis avant l’écriture persistante.

> Les données ne sont pas pré-remplies automatiquement : cela évite de mélanger des données de démonstration avec les dossiers de test de l’établissement.

## Contrôles à conserver avant déploiement

- `pnpm test` pour les validations métier et le contrôle de rôle.
- `pnpm check` pour TypeScript.
- `pnpm build` pour la construction de production.
- Vérification manuelle avec un compte administrateur et un compte non administrateur.
- Migration Drizzle appliquée avant le trafic de production.

## Remarque sur l’hébergement

L’hébergement intégré reste disponible pour les essais. Si un déploiement Vercel est retenu, il faut fournir les variables d’environnement de production et vérifier le point d’entrée Node/serverless retenu par le projet avant publication.
