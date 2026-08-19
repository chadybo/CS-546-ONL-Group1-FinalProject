const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const USERNAME_PATTERN = /^[a-zA-Z0-9_-]+$/;

export const normalizeText = (value) =>
  typeof value === "string" ? value.normalize("NFKC").trim() : "";

export const validateEmail = (value) => {
  const email = normalizeText(value);
  if (!email) return "Email is required.";
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return "Enter a valid email address.";
  }
  return "";
};

export const validateUsername = (value) => {
  const username = normalizeText(value);
  if (!username) return "Username is required.";
  if (username.length < 3 || username.length > 20) {
    return "Username must be 3–20 characters.";
  }
  if (!USERNAME_PATTERN.test(username)) {
    return "Use only letters, numbers, hyphens, and underscores.";
  }
  return "";
};

export const validatePassword = (value) => {
  if (!value) return "Password is required.";
  if (value.length < 8) return "Password must be at least 8 characters.";
  if (new TextEncoder().encode(value).length > 72) {
    return "Password cannot exceed 72 UTF-8 bytes.";
  }
  if (!/[a-z]/.test(value) || !/[A-Z]/.test(value) || !/\d/.test(value)) {
    return "Include an uppercase letter, a lowercase letter, and a number.";
  }
  return "";
};

// Login intentionally uses a separate rule so existing accounts are not
// rejected by newer registration-strength requirements.
export const validateLoginPasswordLength = (value) => {
  if (!value) return "Password is required.";
  if (value.length > 72) return "Password cannot exceed 72 characters.";
  return "";
};

export const validateAddress = (value) => {
  const address = normalizeText(value);
  if (!address) return "Address is required.";
  if (address.length < 5 || address.length > 120) {
    return "Address must be 5–120 characters.";
  }
  if (!/\d/.test(address) || !/[a-zA-Z]/.test(address)) {
    return "Enter a street number and street name.";
  }
  return "";
};

export const validateDescription = (value) =>
  value.length > 500 ? "Description cannot exceed 500 characters." : "";

export const validateDateRange = (from, to) => {
  if (!from || !to) return "";
  return from > to ? "The end date must be on or after the start date." : "";
};

const validators = {
  address: validateAddress,
  description: validateDescription,
  email: validateEmail,
  "login-password": validateLoginPasswordLength,
  password: validatePassword,
  username: validateUsername,
};

const validateField = (field) => {
  field.setCustomValidity("");
  const validator = validators[field.dataset.validate];
  let message = validator ? validator(field.value) : "";

  if (!message && field.required && !normalizeText(field.value)) {
    message = "This field is required.";
  }

  if (!message && field.validity.typeMismatch) {
    message = "Enter a value in the requested format.";
  }

  field.setCustomValidity(message);
  field.classList.toggle("is-invalid", Boolean(message));
  field.setAttribute("aria-invalid", String(Boolean(message)));

  const error = field.closest(".form-group")?.querySelector(".field-error");
  if (error) error.textContent = message;
  return !message;
};

const setFieldError = (field, message) => {
  field.setCustomValidity(message);
  field.classList.toggle("is-invalid", Boolean(message));
  field.setAttribute("aria-invalid", String(Boolean(message)));
  const error = field.closest(".form-group")?.querySelector(".field-error");
  if (error) error.textContent = message;
};

const validateForm = (form, fields) => {
  const invalidFields = fields.filter((field) => !validateField(field));
  const from = form.querySelector('[data-date-start]');
  const to = form.querySelector('[data-date-end]');
  const dateMessage = validateDateRange(from?.value, to?.value);

  if (to && dateMessage) {
    setFieldError(to, dateMessage);
    if (!invalidFields.includes(to)) invalidFields.push(to);
  }

  const summary = form.querySelector(".form-error-summary");
  if (summary) {
    summary.hidden = invalidFields.length === 0;
    summary.textContent = invalidFields.length
      ? `Please correct ${invalidFields.length === 1 ? "the highlighted field" : `${invalidFields.length} highlighted fields`}.`
      : "";
  }
  return invalidFields;
};

const setupCharacterCounter = (field) => {
  const counter = field.closest(".form-group")?.querySelector(".char-count");
  if (!counter) return;
  const update = () => {
    counter.textContent = `${field.value.length}/${field.maxLength}`;
  };
  field.addEventListener("input", update);
  update();
};

const setupPasswordToggle = (button) => {
  const input = document.getElementById(button.dataset.passwordToggle);
  if (!input) return;
  button.addEventListener("click", () => {
    const showing = input.type === "text";
    input.type = showing ? "password" : "text";
    button.textContent = showing ? "Show" : "Hide";
    button.setAttribute("aria-pressed", String(!showing));
  });
};

const setupForm = (form) => {
  const fields = [...form.querySelectorAll("[data-validate]")];
  fields.forEach((field) => {
    field.addEventListener("blur", () => validateField(field));
    const revalidate = () => {
      if (
        field.getAttribute("aria-invalid") === "true" ||
        field.hasAttribute("data-date-start") ||
        field.hasAttribute("data-date-end")
      ) {
        validateForm(form, fields);
      }
    };
    field.addEventListener("input", revalidate);
    field.addEventListener("change", revalidate);
    setupCharacterCounter(field);
  });

  form.addEventListener("submit", (event) => {
    const invalidFields = validateForm(form, fields);
    if (invalidFields.length) {
      event.preventDefault();
      invalidFields[0].focus();
      return;
    }

    const submit = form.querySelector('[type="submit"]');
    if (submit) {
      submit.disabled = true;
      submit.textContent = submit.dataset.submittingText || "Submitting…";
    }
  });
};

if (typeof document !== "undefined") {
  document.querySelectorAll("form[data-validate-form]").forEach(setupForm);
  document.querySelectorAll("[data-password-toggle]").forEach(setupPasswordToggle);
}
