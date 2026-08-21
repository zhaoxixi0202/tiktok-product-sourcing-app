const form = document.querySelector("#loginForm");
const username = document.querySelector("#username");
const password = document.querySelector("#password");
const button = document.querySelector("#loginButton");
const message = document.querySelector("#loginMessage");

const params = new URLSearchParams(window.location.search);
const next = params.get("next") || "/admin";

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  button.disabled = true;
  button.textContent = "Logging in...";
  message.textContent = "";
  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: username.value,
        password: password.value,
      }),
    });
    const payload = await response.json();
    if (!response.ok || payload.error) throw new Error(payload.error || "登录失败");
    window.location.href = next.startsWith("/") ? next : "/admin";
  } catch (error) {
    message.textContent = error.message;
  } finally {
    button.disabled = false;
    button.textContent = "Login";
  }
});
