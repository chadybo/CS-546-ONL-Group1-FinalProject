$("#login-form").on("submit", function (e) {
  e.preventDefault();
  $("#login-error").prop("hidden", true);
  const $submit = $(this).find('[type="submit"]').prop("disabled", true);
  $.ajax({
    url: "/users/login",
    method: "POST",
    contentType: "application/json",
    data: JSON.stringify({
      email: $("#email").val(),
      password: $("#password").val(),
    }),
    success: function () {
      window.location.href = "/users/dashboard";
    },
    error: function (xhr) {
      const msg = xhr.responseJSON && xhr.responseJSON.error
        ? xhr.responseJSON.error
        : "Login failed. Please try again.";
      $("#login-error").text(msg).prop("hidden", false);
      $submit.prop("disabled", false);
    },
  });
});
