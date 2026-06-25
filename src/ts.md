Vue d’ensemble : Tontine Pro
Tontine Pro est une plateforme FinTech communautaire qui digitalise les pratiques d'épargne traditionnelles africaines (les tontines). L’application transforme le classique carnet de pointage papier en une expérience numérique moderne, traçable et sécurisée, permettant aux utilisateurs d’épargner à leur rythme ou de s’associer à d'autres membres.
Les 4 Piliers Fonctionnels
La Tontine Individuelle (« Ma Grille »)
Le concept : L’utilisateur se fixe un objectif d'épargne personnel (par exemple : cotiser 2 000 FCFA par jour pendant 30 jours).
Le mécanisme : L’écran présente une grille visuelle interactive de cases numérotées. Chaque jour cotisé est « tamponné ». À la fin du cycle, la somme totale est créditée sur le solde de l'utilisateur, déduction faite de la commission de gestion de la plateforme.
Les Tontines Collectives (Groupes Rotatifs)
Le concept : Des cercles d’épargne à plusieurs membres basés sur la confiance mutuelle.
Le mécanisme : Un groupe définit une mise fixe, une fréquence (ex: hebdomadaire) et un nombre maximum de membres. Un utilisateur peut acheter 1 ou 2 positions dans la file d'attente pour ramasser la cagnotte totale à son tour de rôle.
Le Portefeuille & Réseau de Parrainage
Portefeuille intégré : Un solde interne en temps réel alimentant les retraits et les dépôts.
Affiliation : Chaque utilisateur possède un code de parrainage unique. Lorsqu'un filleul s'inscrit et devient actif, le parrain reçoit un bonus direct sur son solde (système de croissance organique).
Le Canal de Support Intégré
Une messagerie instantanée privée intégrée à l'application permettant à chaque utilisateur de dialoguer directement avec l'assistance technique en cas de problème de paiement.
Le Back-Office Administrateur
L'application intègre un Centre de Contrôle Admin complet et sécurisé permettant aux exploitants de piloter l'activité :
Vue d'ensemble financière : Suivi de la liquidité totale en circulation et des commissions perçues.
Modération des utilisateurs : Capacité de promouvoir un utilisateur en Administrateur ou de bannir instantanément un compte suspect.
Audit des flux : Historique centralisé des créations de groupes et journal système d'événements (System Logs).
Architecture & Sécurité
Type : Application Full-Stack monopage (SPA) conçue pour être déployable sur des conteneurs cloud (Cloud Run / Render).
Socle Client : React 19 + Tailwind CSS, offrant une interface adaptative pensée en priorité pour l'usage smartphone tactile.
Socle Serveur : API Node.js / Express adossée à un moteur de base de données SQLite local (Offline-Ready).
Garde-fous de sécurité : Mots de passe chiffrés (bcrypt), sessions par jetons (JWT) et isolation stricte des requêtes (IDOR) empêchant un utilisateur d'intercepter les données financières d'un autre.
