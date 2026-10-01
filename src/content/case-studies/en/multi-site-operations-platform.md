---
# DEMO CONTENT: illustrative case study. It does not describe a real client.
# Unpublished (draft: true). Replace with a real, client-approved project, then set `demo: false` and remove `draft`.
translationKey: multi-site-operations-platform
title: One live board for every delivery across four depots
summary: How we would replace spreadsheets and chat groups with a dispatch platform, an offline-first driver app and event-driven invoicing, rolled out depot by depot without stopping operations.
client:
  name: Illustrative client
  descriptor: Regional logistics operator
industry: logistics-transport
services: [software-engineering, devops-cloud]
year: 2026
duration: Illustrative, 5 months
role: Discovery, architecture, web and mobile development, infrastructure
challenge: Operations were coordinated through spreadsheets and messaging groups across four depots. Nobody had a single view of the day's deliveries, proof of delivery lived on paper, and invoicing waited days for someone to reconcile what had actually been delivered.
thinking: >-
  The tempting answer is "an app for everything". Instead we looked for the one entity the whole business revolves around, the delivery job, and designed its lifecycle first, created, planned, dispatched, delivered, invoiced. Drivers work where the signal is weak, so their app had to be offline-first. Dispatchers needed a live board. Finance needed clean, trustworthy events rather than another export. And a small team would run it, so we chose a modular monolith over microservices.
architecture:
  summary: A single API owns the delivery-job lifecycle and emits events that every other part of the system consumes, the dispatch board, the driver app, customer notifications and invoicing. The driver app keeps its own local store and syncs when a connection is available.
  layers:
    - name: Interfaces
      items: [Dispatcher web app, Driver app (offline-first), Customer tracking page]
    - name: Application
      items: [Job lifecycle API, Rules & scheduling, Notifications]
    - name: Data
      items: [PostgreSQL, Redis queues, Object storage]
    - name: Platform
      items: [Containers on App Platform, CI/CD pipeline, Monitoring & alerts]
execution:
  - phase: Discovery and process mapping
    detail: Two weeks on the ground with dispatchers, drivers and finance, mapping the real process, including the workarounds, before writing any code.
  - phase: A thin slice, end to end
    detail: One depot and one job type, from creation to invoice, running in staging within the first month so the team could react to real software.
  - phase: Offline sync and proof of delivery
    detail: Signatures and photos captured on the phone, stored locally, and synchronised with conflict handling when the device reconnects.
  - phase: Depot-by-depot rollout
    detail: Each depot moved over with training and a parallel run, so the old process remained a safety net until the new one had proven itself.
  - phase: Invoicing and reporting
    detail: Completed jobs flow into invoicing automatically; management reports read from the same events.
stack: [TypeScript, React, React Native, NestJS, PostgreSQL, Redis, Docker, DigitalOcean, GitHub Actions, Sentry]
outcome:
  summary: One source of truth for every delivery job, from creation to invoice, and a platform the operator's own team can run and extend.
  results:
    - label: A single operational view
      detail: Dispatchers in every depot work from the same live board instead of parallel spreadsheets.
    - label: Proof of delivery at the door
      detail: Signature and photo are attached to the job, even without signal, and sync when the phone reconnects.
    - label: Invoicing from events
      detail: Completed jobs flow to invoicing automatically, replacing a manual month-end reconciliation step.
    - label: Rolled out without downtime
      detail: Depots migrated one at a time while the previous process kept running in parallel.
featured: true
order: 1
demo: true
draft: true
publishedAt: 2026-09-01
---

## Why a modular monolith

For a team of this size, a single deployable service with clearly separated modules (jobs, planning, billing, notifications) gives most of the benefits of microservices, clear ownership, independent evolution, without the operational cost of a distributed system. Modules communicate through well-defined interfaces and internal events, so any of them can be extracted later if scale ever demands it.

## Designing for weak connectivity

The driver app treats the network as optional. Every action is written locally first and queued for synchronisation; the server resolves conflicts with explicit rules (for example, a delivery confirmed on the phone always wins over a later "rescheduled" status from the office). Drivers never see a spinner at a customer's door.
