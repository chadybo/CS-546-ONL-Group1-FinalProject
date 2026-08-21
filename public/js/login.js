import {
  validateEmail,
  validateLoginPasswordLength,
} from "/public/js/client-validation.js";

const LOGIN_REQUEST_TIMEOUT_MS = 10000;

$(function () {
  const $form = $("#login-form");
  if (!$form.length) return;

  const $email = $("#email");
  const $password = $("#password");
  const $serverError = $("#login-error");
  const $summary = $form.find(".form-error-summary");
  const $submitButton = $form.find('[type="submit"]');
  const $fields = $email.add($password);

  const fieldValidators = {
    email: validateEmail,
    password: validateLoginPasswordLength,
  };

  const showFieldError = ($field, message) => {
    $field.toggleClass("is-invalid", Boolean(message));
    $field.attr("aria-invalid", Boolean(message));
    $field.closest(".form-group").find(".field-error").text(message);
  };

  const validateField = ($field) => {
    const validator = fieldValidators[$field.attr("id")];
    const message = validator ? validator($field.val()) : "";
    showFieldError($field, message);
    return !message;
  };

  const getInvalidFields = () =>
    $fields.filter((_, el) => $(el).attr("aria-invalid") === "true");

  const updateSummary = ($invalidFields) => {
    if (!$summary.length) return;
    const count = $invalidFields.length;
    $summary.prop("hidden", count === 0);
    $summary.text(
      count
        ? `Please correct ${count === 1 ? "the highlighted field" : `${count} highlighted fields`}.`
        : "",
    );
  };

  // Only refresh the summary once it's already visible (i.e. after a submit
  // attempt) so blur/input on a first pass through the form doesn't pop it
  // up prematurely - but once shown, keep it in sync as errors clear.
  const refreshSummaryIfVisible = () => {
    if ($summary.length && !$summary.prop("hidden")) {
      updateSummary(getInvalidFields());
    }
  };

  $fields.each(function () {
    const $field = $(this);
    $field.on("blur", () => {
      validateField($field);
      refreshSummaryIfVisible();
    });
    $field.on("input", () => {
      if ($field.attr("aria-invalid") === "true") {
        validateField($field);
        refreshSummaryIfVisible();
      }
    });
  });

  $form.on("submit", function (event) {
    event.preventDefault();
    

    const $invalidFields = $fields.filter((_, el) => !validateField($(el)));
    updateSummary($invalidFields);

    if ($invalidFields.length) {
      $invalidFields.first().trigger("focus");
      return;
    }
    $serverError.prop("hidden", true);
    $submitButton.prop("disabled", true);
    $submitButton.text($submitButton.data("submittingText") || "Submitting…");

    $.ajax({
      url: "/users/login",
      method: "POST",
      contentType: "application/json",
      timeout: LOGIN_REQUEST_TIMEOUT_MS,
      data: JSON.stringify({
        email: $email.val(),
        password: $password.val(),
      }),
      success: function () {
        window.location.href = "/users/dashboard";
      },
      error: function (xhr, textStatus) {
        const msg =
          textStatus === "timeout"
            ? "The login request timed out. Please try again."
            : xhr.responseJSON && xhr.responseJSON.error
              ? xhr.responseJSON.error
              : "Login failed. Please try again.";
        $serverError.text(msg).prop("hidden", false);
        $submitButton.prop("disabled", false);
        $submitButton.text("Log in");
      },
    });
  });
});