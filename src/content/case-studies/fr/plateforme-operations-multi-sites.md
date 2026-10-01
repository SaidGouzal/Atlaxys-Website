---
# CONTENU DE DÉMONSTRATION: étude de cas illustrative, sans client réel.
# À remplacer par une mission publiée, puis passer `demo: false`.
translationKey: multi-site-operations-platform
title: Un tableau de bord en temps réel pour chaque livraison, sur quatre dépôts
summary: >-
  Comment nous remplacerions tableurs et groupes de discussion par une plateforme de dispatch, une application chauffeur hors ligne et une facturation pilotée par les événements, déployées dépôt par dépôt sans interrompre l’activité.
client:
  name: Client illustratif
  descriptor: Opérateur logistique régional
industry: logistics-transport
services: [software-engineering, devops-cloud]
year: 2026
duration: Illustratif, 5 mois
role: Cadrage, architecture, développement web et mobile, infrastructure
challenge: >-
  Les opérations étaient coordonnées par des tableurs et des groupes de messagerie répartis sur quatre dépôts. Personne n’avait une vue unique des livraisons du jour, les preuves de livraison étaient sur papier, et la facturation attendait des jours que quelqu’un rapproche ce qui avait réellement été livré.
thinking: >-
  La réponse tentante était « une application pour tout ». Nous avons plutôt cherché l’entité autour de laquelle tourne toute l’activité, la mission de livraison, et conçu d’abord son cycle de vie, créée, planifiée, affectée, livrée, facturée. Les chauffeurs travaillent là où le réseau est faible, leur application devait donc fonctionner hors ligne. Les dispatcheurs avaient besoin d’un tableau en temps réel. La finance avait besoin d’événements fiables plutôt que d’un export de plus. Et une petite équipe allait l’exploiter, d’où le choix d’un monolithe modulaire plutôt que de microservices.
architecture:
  summary: >-
    Une API unique gère le cycle de vie des missions et émet des événements consommés par tout le reste du système, le tableau de dispatch, l’application chauffeur, les notifications clients et la facturation. L’application chauffeur conserve sa propre base locale et se synchronise dès qu’une connexion est disponible.
  layers:
    - name: Interfaces
      items: [Application web dispatch, Application chauffeur (hors ligne), Page de suivi client]
    - name: Application
      items: [API cycle de vie des missions, Règles et planification, Notifications]
    - name: Données
      items: [PostgreSQL, Files Redis, Stockage objet]
    - name: Plateforme
      items: [Conteneurs sur App Platform, Pipeline CI/CD, Supervision et alertes]
execution:
  - phase: Cadrage et cartographie des processus
    detail: Deux semaines sur le terrain avec les dispatcheurs, les chauffeurs et la finance, pour cartographier le processus réel, contournements compris, avant d’écrire une ligne de code.
  - phase: Une tranche fine, de bout en bout
    detail: Un dépôt et un type de mission, de la création à la facture, en recette dès le premier mois pour que l’équipe réagisse à un vrai logiciel.
  - phase: Synchronisation hors ligne et preuve de livraison
    detail: Signatures et photos capturées sur le téléphone, stockées localement et synchronisées avec gestion des conflits au retour du réseau.
  - phase: Déploiement dépôt par dépôt
    detail: Chaque dépôt a basculé avec formation et fonctionnement en parallèle, l’ancien processus servant de filet de sécurité jusqu’à ce que le nouveau ait fait ses preuves.
  - phase: Facturation et reporting
    detail: Les missions terminées alimentent automatiquement la facturation ; les rapports de gestion lisent les mêmes événements.
stack: [TypeScript, React, React Native, NestJS, PostgreSQL, Redis, Docker, DigitalOcean, GitHub Actions, Sentry]
outcome:
  summary: >-
    Une source de vérité unique pour chaque mission, de sa création à sa facture, et une plateforme que l’équipe de l’opérateur peut exploiter et faire évoluer.
  results:
    - label: Une vue opérationnelle unique
      detail: Les dispatcheurs de tous les dépôts travaillent sur le même tableau en temps réel au lieu de tableurs parallèles.
    - label: La preuve de livraison à la porte
      detail: Signature et photo sont rattachées à la mission, même sans réseau, et se synchronisent au retour de la connexion.
    - label: Une facturation pilotée par les événements
      detail: Les missions terminées partent automatiquement en facturation, sans rapprochement manuel en fin de mois.
    - label: Un déploiement sans interruption
      detail: Les dépôts ont basculé un par un pendant que l’ancien processus continuait en parallèle.
featured: true
order: 1
demo: true
draft: true
publishedAt: 2026-09-01
---

## Pourquoi un monolithe modulaire

Pour une équipe de cette taille, un seul service déployable avec des modules clairement séparés (missions, planification, facturation, notifications) apporte l’essentiel des bénéfices des microservices, responsabilités claires, évolutions indépendantes, sans le coût d’exploitation d’un système distribué. Les modules communiquent par des interfaces et des événements internes bien définis, et chacun peut être extrait plus tard si l’échelle l’exige.

## Concevoir pour une connectivité faible

L’application chauffeur considère le réseau comme optionnel. Chaque action est d’abord écrite localement puis mise en file pour la synchronisation ; le serveur résout les conflits avec des règles explicites (par exemple, une livraison confirmée sur le téléphone l’emporte toujours sur un statut « reprogrammée » saisi plus tard au bureau). Le chauffeur ne voit jamais de chargement infini devant le client.
