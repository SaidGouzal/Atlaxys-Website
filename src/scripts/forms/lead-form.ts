/**
 * Lead form enhancement: inline validation, an error summary that takes
 * focus, loading / success / failure / offline states, attribution and
 * conversion tracking. Without this script the form still submits natively.
 */
import { readAttribution } from '../analytics/attribution';
import { track } from '../analytics/track';

type Messages = Record<'required' | 'email' | 'tooShort' | 'choose' | 'offline' | 'rateLimited' | 'submitting', string>;
type Field = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function fieldError(field: Field, messages: Messages): string | null {
  const value = field.value.trim();
  if (field.required && !value) return messages.required;
  if (!value) return null;
  if (field instanceof HTMLInputElement && field.type === 'email' && !EMAIL.test(value)) return messages.email;
  const min = Number(field.getAttribute('minlength') ?? 0);
  if (min && value.length < min) return messages.tooShort;
  if (field instanceof HTMLInputElement && field.pattern && !new RegExp(`^(?:${field.pattern})$`).test(value)) return messages.required;
  return null;
}

function setError(field: Field, message: string | null) {
  const errorEl = document.getElementById(`${field.id}-error`);
  field.setAttribute('aria-invalid', message ? 'true' : 'false');
  if (errorEl) {
    errorEl.textContent = message ?? '';
    errorEl.hidden = !message;
  }
}

function labelText(field: Field): string {
  const label = field.id ? document.querySelector<HTMLLabelElement>(`label[for="${field.id}"]`) : null;
  return (label?.childNodes[0]?.textContent ?? field.name).trim();
}

function initForm(form: HTMLFormElement) {
  const root = form.closest<HTMLElement>('[data-lead-root]')!;
  const messages = JSON.parse(form.dataset.messages ?? '{}') as Messages;
  const summary = form.querySelector<HTMLElement>('[data-error-summary]')!;
  const status = form.querySelector<HTMLElement>('[data-form-status]')!;
  const submit = form.querySelector<HTMLButtonElement>('[data-submit]')!;
  const submitLabel = form.querySelector<HTMLElement>('[data-submit-label]')!;
  const success = root.querySelector<HTMLElement>('[data-success]')!;
  const failure = root.querySelector<HTMLElement>('[data-failure]')!;
  const failureText = root.querySelector<HTMLElement>('[data-failure-text]');
  const defaultFailure = failureText?.textContent ?? '';
  const fields = Array.from(form.querySelectorAll<Field>('input[id]:not([type="hidden"]):not([tabindex="-1"]), textarea[id], select[id]'));
  let attempted = false;

  form.querySelector<HTMLInputElement>('[data-started-at]')!.value = String(Date.now());

  // "Request a demo" links pass ?product=<slug>; carry it into the message.
  const product = new URLSearchParams(window.location.search).get('product');
  const message = form.querySelector<HTMLTextAreaElement>('textarea[name="message"]');
  if (product && /^[a-z0-9-]{2,60}$/.test(product) && message && !message.value) {
    message.value = `[${product}] `;
    form.querySelector<HTMLInputElement>('input[name="projectType"][value="business-software"]')?.click();
  }

  // Re-validate as the visitor fixes things (only after a first attempt).
  fields.forEach((field) =>
    field.addEventListener(field instanceof HTMLSelectElement ? 'change' : 'blur', () => {
      if (attempted) setError(field, fieldError(field, messages));
    }),
  );

  const showSummary = (errors: { field: Field; message: string }[]) => {
    const list = summary.querySelector('ul')!;
    list.replaceChildren(
      ...errors.map(({ field, message }) => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = `#${field.id}`;
        a.textContent = `${labelText(field)} — ${message}`;
        a.addEventListener('click', (e) => {
          e.preventDefault();
          field.focus();
        });
        li.append(a);
        return li;
      }),
    );
    summary.hidden = errors.length === 0;
    if (errors.length) summary.focus();
  };

  const setBusy = (busy: boolean) => {
    submit.disabled = busy;
    submit.setAttribute('aria-busy', String(busy));
    submitLabel.dataset.idle ??= submitLabel.textContent ?? '';
    submitLabel.textContent = busy ? messages.submitting : submitLabel.dataset.idle;
    status.textContent = busy ? messages.submitting : '';
  };

  const fail = (text?: string) => {
    if (failureText) failureText.textContent = text ?? defaultFailure;
    failure.hidden = false;
    failure.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    attempted = true;
    failure.hidden = true;

    const errors = fields
      .map((field) => ({ field, message: fieldError(field, messages) }))
      .filter((e): e is { field: Field; message: string } => Boolean(e.message));
    fields.forEach((field) => setError(field, errors.find((e) => e.field === field)?.message ?? null));
    showSummary(errors);
    if (errors.length) return;

    if (!navigator.onLine) {
      fail(messages.offline);
      return;
    }

    const data: Record<string, unknown> = Object.fromEntries(new FormData(form).entries());
    data.attribution = readAttribution();
    setBusy(true);

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(15000),
      });

      if (response.ok) {
        track('generate_lead', {
          form: form.dataset.formName,
          project_type: String(data.projectType ?? ''),
          content_name: String(data.landing || form.dataset.formName || 'contact'),
        });
        form.hidden = true;
        success.hidden = false;
        success.focus();
        return;
      }

      if (response.status === 422) {
        const body = (await response.json().catch(() => ({}))) as { fields?: Record<string, string> };
        const serverErrors = Object.keys(body.fields ?? {})
          .map((name) => fields.find((f) => f.name === name))
          .filter((f): f is Field => Boolean(f))
          .map((field) => ({ field, message: field.type === 'email' ? messages.email : messages.required }));
        serverErrors.forEach(({ field, message }) => setError(field, message));
        if (serverErrors.length) showSummary(serverErrors);
        else fail();
        return;
      }

      fail(response.status === 429 ? messages.rateLimited : undefined);
    } catch {
      fail(navigator.onLine ? undefined : messages.offline);
    } finally {
      setBusy(false);
    }
  });
}

export function initLeadForms() {
  document.querySelectorAll<HTMLFormElement>('form[data-lead-form]').forEach((form) => {
    if (form.dataset.enhanced) return;
    form.dataset.enhanced = 'true';
    initForm(form);
  });
}
