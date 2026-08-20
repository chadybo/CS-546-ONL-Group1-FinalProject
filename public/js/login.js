import {
  validateEmail,
  validateLoginPasswordLength,
} from "/public/js/client-validation.js";

const form = document.getElementById("login-form");

if (form) {
  const emailField = document.getElementById("email");
  const passwordField = document.getElementById("password");
  const serverError = document.getElementById("login-error");
  const summary = form.querySelector(".form-error-summary");
  const submitButton = form.querySelector('[type="submit"]');

  const fieldValidators = {
    [emailField.id]: validateEmail,
    [passwordField.id]: validateLoginPasswordLength,
  };
  const fields = [emailField, passwordField];

  const showFieldError = (field, message) => {
    field.classList.toggle("is-invalid", Boolean(message));
    field.setAttribute("aria-invalid", String(Boolean(message)));
    const error = field.closest(".form-group")?.querySelector(".field-error");
    if (error) error.textContent = message;
  };

  const validateField = (field) => {
    const validator = fieldValidators[field.id];
    const message = validator ? validator(field.value) : "";
    showFieldError(field, message);
    return !message;
  };

  const updateSummary = (invalidFields) => {
    if (!summary) return;
    summary.hidden = invalidFields.length === 0;
    summary.textContent = invalidFields.length
      ? `Please correct ${invalidFields.length === 1 ? "the highlighted field" : `${invalidFields.length} highlighted fields`}.`
      : "";
  };

  fields.forEach((field) => {
    field.addEventListener("blur", () => validateField(field));
    field.addEventListener("input", () => {
      if (field.getAttribute("aria-invalid") === "true") validateField(field);
    });
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (serverError) serverError.hidden = true;

    const invalidFields = fields.filter((field) => !validateField(field));
    updateSummary(invalidFields);

    if (invalidFields.length) {
      invalidFields[0].focus();
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = submitButton.dataset.submittingText || "Submitting…";

    $.ajax({
      url: "/users/login",
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify({
        email: emailField.value,
        password: passwordField.value,
      }),
      success: function () {
        window.location.href = "/users/dashboard";
      },
      error: function (xhr) {
        const msg = xhr.responseJSON && xhr.responseJSON.error
          ? xhr.responseJSON.error
          : "Login failed. Please try again.";
        if (serverError) {
          serverError.textContent = msg;
          serverError.hidden = false;
        }
        submitButton.disabled = false;
        submitButton.textContent = "Log in";
      },
    });
  });
}