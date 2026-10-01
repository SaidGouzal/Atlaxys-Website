---
translationKey: devops-baseline-small-teams
title: A practical DevOps foundation for small teams
description: "The minimum practices that make software releases safe and routine for a team of two to ten developers: CI/CD, test environments, monitoring and backups."
publishedAt: 2026-07-22
updatedAt: 2026-10-01
category: Cloud & DevOps
tags: [DevOps, CI/CD, monitoring, backups, small teams]
related:
  services: [devops-cloud]
faqs:
  - question: Does a small team need Kubernetes?
    answer: Usually not. A managed hosting platform, or a few containers on a well-configured server, covers most small products with far less effort. Kubernetes becomes worthwhile when you run many services and have people dedicated to operating it.
  - question: What is the first DevOps practice to adopt?
    answer: Automatic releases from the main version of the code, with tests running on every change. It removes the most risk and saves the most time.
---

DevOps is the set of practices that connects writing software with running it reliably. It is often sold as a major transformation. For a team of two to ten developers, it should be the opposite: **a small set of routine practices that takes the fear out of releasing software.** Here is the foundation we recommend.

## 1. Code management with rules

- One main version of the code that can be released at any time.
- Every change goes through a request that at least one other person reviews (a pull request).
- Automatic checks (formatting, type checking, tests) must pass before a change is accepted.

This alone prevents a large share of production problems.

## 2. Automated testing and releases (CI/CD)

- Tests and builds run automatically on every change.
- Accepted changes go to the test site automatically. Going live takes one click, or happens automatically once you trust the process.
- Database changes run as part of the release, and are designed so that going back to the previous version does not break anything.
- **Going back to the previous version takes one command**, and the team has practised it.

## 3. Environments that match

- The developer's computer, the test site and the live system run the same containers, with different settings.
- Settings, passwords and keys are stored in environment variables or a secrets manager, **never in the code**.
- The server setup is written as code (Terraform, or the hosting platform's own configuration file), so an environment can be rebuilt from scratch.

## 4. Monitoring from the first release

You cannot fix what you cannot see. The minimum:

- **Error tracking**, with alerts for new types of errors.
- **Structured logs** you can search by request or by user.
- **Uptime checks** on the most important user journeys, not just the home page.
- **A small number of useful alerts.** Too many alerts are as bad as none.

## 5. Backups you have actually restored

- Automatic daily backups of databases and uploaded files, stored separately from the live system.
- A **restore test** at least every quarter. A backup that has never been restored is a hope, not a backup.

## 6. Only the access people need

- A personal account for everyone, with two-factor authentication.
- No shared administrator passwords, and service accounts with only the permissions they need.
- A checklist for when someone leaves: their access is removed the same day.

## 7. A monthly cost review

Cloud bills grow quietly. Fifteen minutes a month spent on the largest costs and any resources nobody recognises keeps them under control.

## What we deliberately leave out at first

Advanced setups such as service meshes, hosting spread across several regions or custom-built platforms are powerful, but expensive to run. Add them when a concrete need justifies them, not because they appear in a conference talk.

## The result

With this foundation in place, a small team can release several times a week, recover from mistakes in minutes and sleep at night. That is the real goal of DevOps.

Need help setting this up, or reviewing what you already have? See our [Cloud & DevOps](/en/services/devops-cloud/) service.
