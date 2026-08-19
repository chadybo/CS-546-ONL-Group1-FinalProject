const container = document.querySelector("[data-complaint-id]");

const runAction = async (button, path, method) => {
  button.disabled = true;
  const originalText = button.textContent;
  button.textContent = "Working…";
  try {
    const response = await fetch(path, {
      method,
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "The request could not be completed.");
    }
    window.location.reload();
  } catch (error) {
    const feedback = document.getElementById("action-feedback");
    if (feedback) {
      feedback.hidden = false;
      feedback.textContent = error.message;
    }
    button.disabled = false;
    button.textContent = originalText;
  }
};

if (container) {
  const id = encodeURIComponent(container.dataset.complaintId);
  document.getElementById("bookmark-btn")?.addEventListener("click", (event) =>
    runAction(event.currentTarget, `/users/bookmark/${id}`, "DELETE"));
  document.getElementById("resolve-btn")?.addEventListener("click", (event) =>
    runAction(event.currentTarget, `/complaints/${id}/resolve`, "PUT"));
}
