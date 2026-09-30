---
translationKey: devops-baseline-small-teams
title: A pragmatic DevOps baseline for small teams
description: The minimum set of practices — source control, CI/CD, environments, observability and backups — that makes releases boring for a team of two to ten engineers.
publishedAt: 2026-07-22
category: Cloud & DevOps
tags: [DevOps, CI/CD, monitoring, backups, small teams]
related:
  services: [devops-cloud]
  caseStudies: [multi-site-operations-platform]
faqs:
  - question: Does a small team need Kubernetes?
    answer: Usually not. A managed platform or a few containers on a well-configured host covers most small products with far less operational effort. Kubernetes becomes worthwhile when you run many services and have people to operate it.
  - question: What is the first DevOps practice to adopt?
    answer: Automated deployment from the main branch, with tests running on every change. It removes the most risk and frees the most time.
---

DevOps is often sold as a large transformation. For a team of two to ten engineers, it should be the opposite: **a small, boring set of practices that removes fear from releasing software.** Here is the baseline we set up on almost every project.

## 1. Source control with rules

- One main branch, always deployable.
- Every change through a pull request with at least one review.
- Automated checks — formatting, type checking, tests — must pass before merging.

This alone prevents a large share of production incidents.

## 2. Continuous integration and delivery

- Tests and builds run automatically on every change.
- Merging to main deploys to staging; promoting to production is one click (or automatic, once you trust it).
- Database migrations run as part of the pipeline, forward-compatible so a rollback does not break the schema.
- **Rollback is one command**, and the team has practised it.

## 3. Environments that match

- Local, staging and production run the same containers with different configuration.
- Configuration and secrets live in environment variables or a secrets manager — **never in the repository**.
- Infrastructure is described in code (Terraform or the platform's own app spec), so an environment can be rebuilt from scratch.

## 4. Observability from the first release

You cannot fix what you cannot see. The minimum:

- **Error tracking** with alerts for new error types.
- **Structured logs**, searchable by request or user.
- **Uptime checks** on the key user journeys, not just the home page.
- **A handful of meaningful alerts** — too many alerts are as bad as none.

## 5. Backups you have actually restored

- Automated daily backups of databases and uploaded files, stored separately from production.
- A **restore drill** at least every quarter. A backup that has never been restored is a hope, not a backup.

## 6. Least-privilege access

- Personal accounts for everyone, with two-factor authentication.
- No shared root passwords; service accounts with only the permissions they need.
- Offboarding checklist: when someone leaves, access goes with them the same day.

## 7. A monthly cost review

Cloud bills grow quietly. Fifteen minutes a month — looking at the biggest line items and any resources nobody recognises — keeps them honest.

## What we deliberately leave out (at first)

Service meshes, multi-region failover and bespoke platforms are powerful, and expensive to operate. Add them when a concrete requirement justifies them, not because they appear on a conference slide.

## The outcome

With this baseline in place, a small team can release several times a week, recover from mistakes in minutes and sleep at night. That is the real goal of DevOps.

Need help putting this in place, or reviewing what you already have? See our [DevOps & Cloud](/en/services/devops-cloud/) practice.
