---
# DEMO CONTENT: illustrative case study. It does not describe a real client.
# Unpublished (draft: true). Replace with a real, client-approved project, then set `demo: false` and remove `draft`.
translationKey: ai-document-intake
title: From re-typing invoices to reviewing them
summary: An AI-assisted intake pipeline that reads supplier invoices and receipts in French, Arabic and English, validates them against business rules and sends only uncertain cases to a person.
client:
  name: Illustrative client
  descriptor: Accounting and advisory firm
industry: professional-services
services: [ai-automation, software-engineering]
products: [atlaxys-docs]
year: 2026
duration: Illustrative, 10 weeks
role: Process analysis, AI pipeline, review application, integration
challenge: Every month, the team re-typed hundreds of supplier invoices and receipts, arriving by email, as scans and as phone photos, in French, Arabic and English, into accounting software. Month-end peaks meant overtime, and manual entry meant errors that surfaced later, when they were more expensive to fix.
thinking: We treated AI as one step in a pipeline, not as the product. Documents are read by OCR and a language model, but every extracted value is checked against rules the accountants already trust, totals must add up, VAT rates must be valid, the supplier must exist. Anything uncertain goes to a review queue. Before rollout, the pipeline was measured against a labelled sample of the firm's own documents, so accuracy was a number, not a feeling.
architecture:
  summary: Documents enter through a dedicated inbox, an upload portal or a scanner folder. A processing pipeline extracts and validates fields, then routes each document either straight to the accounting export or to a human review queue. Every step is logged for audit.
  layers:
    - name: Intake
      items: [Dedicated email inbox, Upload portal, Scanner folder sync]
    - name: Processing
      items: [OCR and layout parsing, LLM field extraction, Validation rules]
    - name: Review
      items: [Review queue app, Audit log]
    - name: Integration
      items: [Accounting export, Searchable archive]
execution:
  - phase: Sample and label
    detail: A few hundred real documents, labelled with the accountants, became the evaluation set every later change was measured against.
  - phase: Pipeline and evaluation harness
    detail: OCR, extraction and validation built as separate steps, each with its own metrics, so failures can be traced to the step that caused them.
  - phase: Review application
    detail: A focused interface showing the document next to the extracted fields, with uncertain values highlighted and keyboard shortcuts for fast correction.
  - phase: Pilot with one team
    detail: One team used the system on live documents while the previous process continued, with thresholds kept conservative.
  - phase: Gradual automation
    detail: As measured accuracy held, confidence thresholds were relaxed document type by document type.
stack: [Python, FastAPI, PostgreSQL, OCR pipelines, Anthropic API, React, Docker]
outcome:
  summary: Staff review instead of re-typing, and every automated decision can be explained, audited and corrected.
  results:
    - label: Review, not data entry
      detail: People check highlighted values instead of typing every field from scratch.
    - label: Rules the firm already trusts
      detail: Totals, VAT and supplier checks catch extraction errors before they reach the ledger.
    - label: Multilingual by design
      detail: French, Arabic and English documents follow the same pipeline, evaluated separately.
    - label: Auditable end to end
      detail: Each document keeps a trace of what was extracted, by which step, and who approved it.
featured: false
order: 2
demo: true
draft: true
publishedAt: 2026-08-15
---

## Keeping sensitive data under control

Financial documents are sensitive. Model providers were configured so that submitted data is not used for training, documents are stored in infrastructure the firm controls, and personally identifying fields are only sent to external services when strictly necessary for extraction. The data-handling policy is written down and reviewed with the firm's compliance lead.
