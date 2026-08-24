# Suivi — Tableau de bord administrateur

- [x] Créer une entrée de navigation dédiée au tableau de bord administrateur.
- [x] Ajouter les indicateurs de pilotage académique, financier et de présence.
- [x] Ajouter les visualisations d’assiduité et de performance par classe.
- [x] Ajouter les alertes, l’activité récente et les actions rapides.
- [x] Vérifier les vues desktop et mobile puis enregistrer la livraison.

## Suivi — Actions rapides interactives

- [x] Définir les formulaires pour l’inscription, le paiement, l’affectation, la note et le relevé.
- [x] Ajouter les fenêtres modales, validations locales et confirmations de succès.
- [x] Vérifier les interactions desktop et mobile puis enregistrer la livraison.

## Suivi — Confirmations toast

- [x] Définir les messages de succès contextualisés après chaque soumission.
- [x] Ajouter une présentation toast animée cohérente avec le système institutionnel.
- [x] Vérifier le rendu et enregistrer la livraison.

## Suivi — Gestion des élèves

- [x] Structurer les données d’identité permanente et d’inscription annuelle.
- [x] Créer le tableau, les filtres, la sélection multiple et le panneau de synthèse.
- [x] Ajouter les actions contextuelles, les états vide et chargement, et la pagination.
- [x] Vérifier le rendu desktop et mobile puis enregistrer la livraison.

## Suivi — Importation CSV des élèves

- [x] Définir le format CSV attendu et les règles de validation.
- [x] Ajouter l’assistant d’importation avec sélection, aperçu et confirmation.
- [x] Vérifier le parcours desktop et mobile puis enregistrer la livraison.

## Suivi — Profil élève

- [x] Structurer l’identité permanente et le dossier scolaire annuel de Jean Kabila.
- [x] Créer l’en-tête, les onglets, les synthèses, documents et historique.
- [x] Vérifier le rendu desktop et mobile puis enregistrer la livraison.

## Suivi — Progression des notes

- [x] Définir les séries de notes annuelles et les options de lecture du graphique.
- [x] Ajouter le graphique interactif à l’onglet Résultats.
- [x] Vérifier le rendu desktop et mobile puis enregistrer la livraison.

## Suivi — Extension des modules administratifs

- [x] Définir l’ordre de réalisation des modules décrits dans le brief.
- [x] Concevoir et intégrer les prochains écrans administratifs retenus.
- [x] Vérifier les parcours et enregistrer la prochaine livraison.

## Suivi — Inscription / Réinscription

- [x] Structurer les cinq étapes, les types d’inscription et les données permanentes ou annuelles.
- [x] Ajouter l’assistant, les validations, le récapitulatif et la confirmation de succès.
- [x] Vérifier les vues desktop et mobile puis enregistrer la livraison.

## Suivi — Gestion des classes

- [x] Structurer les classes par niveau et les données de pilotage annuel.
- [x] Ajouter les filtres, actions de création, préparation d’année et accès aux détails.
- [x] Vérifier les vues desktop et mobile puis enregistrer la livraison.

## Suivi — Espace de travail de classe

- [x] Structurer les indicateurs et les onglets opérationnels de la classe 7e A.
- [x] Ajouter les vues Élèves, Cours, Enseignants, Présences, Résultats et Rapports.
- [x] Vérifier les vues desktop et mobile puis enregistrer la livraison.

## Suivi — Suite académique et administrative

- [x] Ajouter le catalogue de cours et la configuration des pondérations par classe.
- [x] Ajouter les enseignants, leurs profils et la gestion des affectations.
- [x] Ajouter la préparation de l’année scolaire suivante et l’importation Excel contrôlée.
- [x] Relier les nouvelles actions aux parcours existants et vérifier les vues responsive.
- [x] Enregistrer la livraison globale.

## Suivi — Persistance et contrôle intégral

- [x] Diagnostiquer le message « Unauthorized » lors de la connexion Manus OAuth : le flux fonctionne après sélection du compte, puis applique correctement le rôle enseignant.
- [x] Initialiser sans destruction les données de test académiques et relier le compte enseignant connecté.
- [x] Étendre le jeu de test avec les classes de 7e, 8e, 1re à 4e scientifiques et littéraires, dix cours et dix élèves par classe.
- [x] Fiabiliser les écritures groupées de présence et de notes afin d’éviter les expirations de connexion.
- [x] Fiabiliser le client Drizzle utilisé par les vérifications tRPC afin d’éviter les expirations intermittentes du pool callback.
- [x] Réduire et fermer proprement les connexions de vérification afin d’éviter les délais intermittents de la base distante.
- [x] Relancer chaque script de vérification après correction et confirmer sa terminaison sans processus résiduel.
- [x] Mettre à niveau le projet avec comptes utilisateurs et base de données de test.
- [x] Créer les tables et les procédures des dossiers scolaires, classes, cours, enseignants et affectations.
- [x] Connecter les dernières actions contextuelles aux opérations persistantes et remplacer les éléments purement informatifs.
- [x] Raccorder la préparation annuelle des classes aux mutations persistantes plutôt qu’à un simple accusé de réception.
- [x] Raccorder les actions de suivi de classe aux modules existants plutôt qu’à des messages informatifs.
- [x] Raccorder depuis l’espace de classe la gestion des pondérations et des affectations aux modules administratifs persistants.
- [x] Créer une mutation transactionnelle de copie annuelle des classes, cours configurés, pondérations et suggestions d’affectation.
- [x] Vérifier e2e que la copie annuelle n’inscrit ni ne déplace automatiquement les élèves.
- [x] Comparer les inscriptions et leurs classes avant/après la copie annuelle dans le test e2e.
- [x] Raccorder les affectations et pondérations administratives au registre persistant, sans données de démonstration.
- [x] Ajouter le lien sécurisé entre une fiche enseignant et un compte utilisateur pour activer son espace pédagogique.
- [x] Exécuter les parcours d’écriture de bout en bout avec un compte administrateur de test.
- [x] Ajouter et exécuter un flux e2e administrateur couvrant registre scolaire, affectation et gouvernance hors deuxième session.
- [x] Documenter la compatibilité de déploiement Vercel et enregistrer la livraison.

## Suivi — Modules importés : portail, gouvernance et parcours annuels

- [x] Concevoir le modèle sécurisé parent–enfant et les lectures parent limitées aux élèves liés.
- [x] Ajouter le portail parent : profil, tableau de bord, enfants, résultats, progression, présences, finances et documents.
- [x] Ajouter les fondations de gestion des utilisateurs, rôles, permissions individuelles et journal d’audit.
- [x] Ajouter la configuration, l’éligibilité, la saisie et la comparaison de la deuxième session.
- [x] Ajouter les espaces de délibération et de décision finale avec historique immuable.
- [x] Afficher dans le comparatif une décision finale réellement lue depuis la délibération.
- [x] Ajouter une rectification de délibération auditée, puis l’exposer distinctement dans l’historique.
- [x] Ajouter des tests routeur attestant de l’audit généré lors d’une validation ou rectification.
- [x] Ajouter un test Vitest de validation créant un audit, puis un test de rectification replaçant la décision à l’état proposé.
- [x] Ajouter les centres personnels : profil, recherche, tâches, documents, aide et notifications selon permissions.
- [x] Étendre la recherche globale avec les paiements autorisés et une ouverture contextualisée de chaque résultat.
- [x] Compléter le centre documentaire avec filtres métier et actions de consultation selon permissions.
- [x] Tester les autorisations parent/enseignant/administrateur et les calculs académiques associés.

## Suivi — Parcours enseignants

- [x] Modéliser les affectations, présences, critères d’évaluation et notes par période.
- [x] Ajouter le tableau de bord et l’espace « Mes enseignements » réservés à l’enseignant.
- [x] Ajouter l’appel mobile, l’historique, les évaluations et les saisies de notes.
- [x] Contrôler les permissions par affectation, les validations et les états réseau.
- [x] Vérifier les vues desktop et mobile puis enregistrer la livraison.
- [x] Supprimer le basculement manuel de rôle et protéger strictement les vues enseignants par session authentifiée.
- [x] Rediriger les actions enseignants vers les vues pédagogiques autorisées, sans exposer le registre administratif global.
- [x] Corriger les options d’évaluation et valider complètement les notes avec des messages d’erreur de champ.
- [x] Connecter TeacherSuite aux lectures et mutations tRPC de présence, notes et rapports.
- [x] Ajouter les états réseau de chargement, erreur, succès et absence d’affectation dans les vues enseignants.
- [x] Ajouter un test de refus d’une affectation non liée au compte enseignant.
- [x] Vérifier les vues enseignants connectées en desktop et mobile avec les données de test.
- [x] Ajouter les états de chargement, erreur et vide de roster/période dans les vues Élèves, Notes et Rapport.

## Suivi — Contrôle annuel et autorisations fines

- [x] Appliquer les dérogations de permissions et les rôles d’accès aux opérations sensibles côté serveur.
- [x] Établir et vérifier une couverture récapitulative des procédures sensibles protégées par permissions fines.
- [x] Étendre les permissions fines aux procédures transverses sensibles et les vérifier par route réelle.
- [x] Étendre les permissions fines aux lectures parent et transverses soumises à autorisation.
- [x] Tester une dérogation utilisateur sur une opération sensible de route réelle.
- [x] Vérifier e2e le refus puis le rétablissement d’une route métier après dérogation utilisateur.
- [x] Étendre les permissions fines aux procédures scolaires et de deuxième session au-delà de la gouvernance.
- [x] Ajouter des tests Vitest d’autorisation et de refus pour rôle hérité et dérogation utilisateur.
- [x] Construire le centre de contrôle annuel à partir des états pédagogiques, financiers et de délibération réels.
- [x] Vérifier les nouveaux contrôles de permissions et le centre annuel en desktop et mobile.

## Suivi — Publication GitHub

- [x] Vérifier le dépôt, créer un commit documenté et pousser l’état de travail actuel vers GitHub.

## Suivi — Moteur académique central

- [x] Auditer les modèles, services et routeurs académiques existants sans modifier le design.
- [x] Définir une source de vérité unique pour les pondérations de cours, périodes, semestres et année scolaire.
- [x] Implémenter un service de calcul réutilisable pour périodes, semestres, annuel et classement comparable.
- [x] Raccorder les résultats, relevés, deuxième session et délibération au moteur central sans dupliquer les formules.
- [x] Couvrir les pondérations, notes absentes, corrections, classement et deuxième session par des tests.
- [ ] Valider TypeScript, tests, intégration de base de données et build, puis synchroniser GitHub.
