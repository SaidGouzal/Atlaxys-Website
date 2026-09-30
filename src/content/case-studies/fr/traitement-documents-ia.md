---
# CONTENU DE DÉMONSTRATION — étude de cas illustrative, sans client réel.
# À remplacer par une mission publiée, puis passer `demo: false`.
translationKey: ai-document-intake
title: De la ressaisie des factures à leur simple validation
summary: >-
  Une chaîne de traitement assistée par IA qui lit les factures fournisseurs et justificatifs en français, en arabe et en anglais, les contrôle selon des règles métier et n’envoie à un humain que les cas incertains.
client:
  name: Client illustratif
  descriptor: Cabinet d’expertise comptable et de conseil
industry: professional-services
services: [ai-automation, software-engineering]
products: [atlaxys-docs]
year: 2026
duration: Illustratif — 10 semaines
role: Analyse des processus, chaîne IA, application de validation, intégration
challenge: >-
  Chaque mois, l’équipe ressaisissait des centaines de factures et de justificatifs — reçus par e-mail, en scan ou en photo, en français, en arabe et en anglais — dans le logiciel comptable. Les pics de fin de mois imposaient des heures supplémentaires, et la saisie manuelle générait des erreurs découvertes plus tard, quand elles coûtaient plus cher à corriger.
thinking: >-
  Nous avons traité l’IA comme une étape d’une chaîne, pas comme le produit. Les documents sont lus par OCR et par un modèle de langage, mais chaque valeur extraite est contrôlée par des règles auxquelles les comptables font déjà confiance — les totaux doivent concorder, les taux de TVA être valides, le fournisseur exister. Tout ce qui est incertain part en relecture. Avant le déploiement, la chaîne a été mesurée sur un échantillon annoté des propres documents du cabinet — la précision était un chiffre, pas une impression.
architecture:
  summary: >-
    Les documents arrivent par une boîte e-mail dédiée, un portail de dépôt ou un dossier de numérisation. La chaîne de traitement extrait et contrôle les champs, puis oriente chaque document soit directement vers l’export comptable, soit vers une file de relecture humaine. Chaque étape est journalisée pour l’audit.
  layers:
    - name: Réception
      items: [Boîte e-mail dédiée, Portail de dépôt, Dossier de numérisation]
    - name: Traitement
      items: [OCR et mise en page, Extraction par LLM, Règles de contrôle]
    - name: Relecture
      items: [Application de relecture, Journal d’audit]
    - name: Intégration
      items: [Export comptable, Archive consultable]
execution:
  - phase: Échantillonner et annoter
    detail: Quelques centaines de documents réels, annotés avec les comptables, sont devenus le jeu d’évaluation de chaque évolution.
  - phase: Chaîne et banc d’évaluation
    detail: OCR, extraction et contrôle construits comme des étapes séparées, chacune avec ses indicateurs, pour relier chaque erreur à l’étape qui l’a causée.
  - phase: Application de relecture
    detail: Une interface ciblée qui affiche le document à côté des champs extraits, met en évidence les valeurs incertaines et propose des raccourcis clavier pour corriger vite.
  - phase: Pilote avec une équipe
    detail: Une équipe a utilisé le système sur des documents réels pendant que l’ancien processus continuait, avec des seuils volontairement prudents.
  - phase: Automatisation progressive
    detail: À mesure que la précision mesurée se confirmait, les seuils de confiance ont été assouplis type de document par type de document.
stack: [Python, FastAPI, PostgreSQL, OCR pipelines, Anthropic API, React, Docker]
outcome:
  summary: >-
    Les équipes valident au lieu de ressaisir — et chaque décision automatisée peut être expliquée, auditée et corrigée.
  results:
    - label: Valider, pas saisir
      detail: Les collaborateurs vérifient des valeurs mises en évidence au lieu de taper chaque champ.
    - label: Des règles déjà connues du cabinet
      detail: Les contrôles de totaux, de TVA et de fournisseurs interceptent les erreurs d’extraction avant la comptabilité.
    - label: Multilingue par conception
      detail: Les documents en français, en arabe et en anglais suivent la même chaîne, évaluée séparément.
    - label: Traçable de bout en bout
      detail: Chaque document conserve la trace de ce qui a été extrait, par quelle étape, et qui l’a validé.
featured: false
order: 2
demo: true
publishedAt: 2026-08-15
---

## Garder la maîtrise des données sensibles

Les documents financiers sont sensibles. Les fournisseurs de modèles ont été configurés pour que les données transmises ne servent pas à l’entraînement, les documents sont stockés sur une infrastructure maîtrisée par le cabinet, et les champs d’identification personnelle ne sont envoyés à des services externes que lorsque l’extraction l’exige réellement. La politique de traitement des données est écrite et revue avec le responsable conformité du cabinet.
