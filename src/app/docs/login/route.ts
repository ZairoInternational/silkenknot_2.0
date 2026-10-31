import { ensureCsrfCookie } from "@/lib/session";

const HTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex,nofollow" />
    <title>API docs unlock · SilkKnot</title>
    <style>
      html, body { margin: 0; min-height: 100%; }
      body {
        display: grid;
        place-items: center;
        padding: 2rem 1.25rem;
        background: linear-gradient(160deg, #f7f1ea 0%, #ebe2d6 45%, #e4ddd2 100%);
        font-family: Georgia, "Times New Roman", serif;
        color: #2c2926;
      }
      form {
        width: 100%;
        max-width: 420px;
        display: grid;
        gap: 0.85rem;
        padding: 1.75rem 1.5rem;
        background: #fffdf9;
        border: 1px solid #d9cfc2;
      }
      .eyebrow {
        margin: 0;
        font: 11px/1.2 system-ui, sans-serif;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: #8a7350;
      }
      h1 { margin: 0; font-size: 1.75rem; font-weight: 500; }
      .lede {
        margin: 0;
        font: 14px/1.5 system-ui, sans-serif;
        color: #6b5e52;
      }
      label {
        display: grid;
        gap: 6px;
        font: 12px/1.2 system-ui, sans-serif;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #6b5e52;
      }
      input {
        height: 44px;
        padding: 0 12px;
        border: 1px solid #d9cfc2;
        background: #fff;
        font: 15px/1.2 system-ui, sans-serif;
        color: #2c2926;
      }
      button {
        height: 44px;
        border: 0;
        background: #2c2926;
        color: #f6f1ea;
        font: 12px/1.2 system-ui, sans-serif;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        cursor: pointer;
      }
      button:disabled { opacity: 0.55; cursor: not-allowed; }
      .error {
        margin: 0;
        padding: 0.65rem 0.75rem;
        background: #fdf4f2;
        border: 1px solid #f0c9c0;
        color: #8a3b2e;
        font: 13px/1.4 system-ui, sans-serif;
      }
      .error[hidden] { display: none; }
    </style>
  </head>
  <body>
    <form id="unlock" autocomplete="on">
      <p class="eyebrow">SilkKnot</p>
      <h1>API docs</h1>
      <p class="lede">Enter the docs access password from the team vault. This is not the studio admin login.</p>
      <label>
        Password
        <input id="password" name="password" type="password" autocomplete="current-password" required />
      </label>
      <p id="error" class="error" role="alert" hidden></p>
      <button id="submit" type="submit">Unlock docs</button>
    </form>
    <script>
      (function () {
        function csrfHeaders() {
          var headers = { "Content-Type": "application/json" };
          var row = document.cookie.split("; ").find(function (part) {
            return part.indexOf("silkknot_csrf=") === 0;
          });
          if (row) headers["x-silkknot-csrf"] = decodeURIComponent(row.slice("silkknot_csrf=".length));
          return headers;
        }
        function nextPath() {
          var params = new URLSearchParams(window.location.search);
          var value = params.get("next") || "/docs/api";
          if (value.charAt(0) !== "/" || value.indexOf("//") === 0 || value.indexOf("://") !== -1) return "/docs/api";
          if (value.indexOf("/docs") !== 0) return "/docs/api";
          return value;
        }
        var form = document.getElementById("unlock");
        var password = document.getElementById("password");
        var error = document.getElementById("error");
        var submit = document.getElementById("submit");
        form.addEventListener("submit", function (event) {
          event.preventDefault();
          error.hidden = true;
          submit.disabled = true;
          submit.textContent = "Unlocking…";
          fetch("/api/docs/unlock", {
            method: "POST",
            credentials: "same-origin",
            headers: csrfHeaders(),
            body: JSON.stringify({ password: password.value }),
          })
            .then(function (res) {
              return res.json().then(function (data) {
                return { res: res, data: data };
              });
            })
            .then(function (result) {
              if (!result.res.ok || !result.data.ok) {
                error.textContent = result.data.message || "Incorrect password.";
                error.hidden = false;
                submit.disabled = false;
                submit.textContent = "Unlock docs";
                return;
              }
              window.location.replace(nextPath());
            })
            .catch(function () {
              error.textContent = "Could not unlock docs. Try again.";
              error.hidden = false;
              submit.disabled = false;
              submit.textContent = "Unlock docs";
            });
        });
      })();
    </script>
  </body>
</html>`;

export async function GET() {
  await ensureCsrfCookie();
  return new Response(HTML, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
