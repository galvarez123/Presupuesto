// ==============================================================================
// CONTROLADOR DE AUTENTICACIÓN PRIVADA SUPABASE AUTH - GESTIÓN DE PRESUPUESTO
// Comparte el mismo motor de seguridad e identidad que Magia ERP
// ==============================================================================

(function () {
  "use strict";

  let isSignUpMode = false;

  function getClient() {
    return window.supabaseClient || (window.supabase && window.SUPABASE_CONFIG ?
      window.supabase.createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey) : null);
  }

  function showAlert(msg, isSuccess = false) {
    const alertEl = document.getElementById("auth-alert");
    if (!alertEl) return;
    alertEl.className = `auth-alert ${isSuccess ? "success" : "error"}`;
    alertEl.innerHTML = msg;
    alertEl.style.display = "block";
  }

  function clearAlert() {
    const alertEl = document.getElementById("auth-alert");
    if (alertEl) {
      alertEl.style.display = "none";
      alertEl.innerHTML = "";
    }
  }

  function updateAuthUI(session) {
    const overlay = document.getElementById("auth-overlay");
    const userBadge = document.getElementById("user-session-badge");
    const userEmailSpan = document.getElementById("user-email-display");
    const container = document.querySelector(".container");

    if (session && session.user) {
      if (overlay) overlay.classList.add("hidden");
      if (container) container.style.filter = "none";
      if (userBadge) userBadge.style.display = "flex";
      if (userEmailSpan) {
        const email = session.user.email || "Gabriel";
        userEmailSpan.innerText = email.length > 22 ? email.substring(0, 20) + "..." : email;
        userEmailSpan.title = email;
      }
      if (typeof window.sincronizarTunelSupabase === "function") {
        window.sincronizarTunelSupabase(false);
      }
    } else {
      if (overlay) overlay.classList.remove("hidden");
      if (container) container.style.filter = "blur(10px)";
      if (userBadge) userBadge.style.display = "none";
    }
  }

  async function handleAuthSubmit(e) {
    e.preventDefault();
    clearAlert();

    const client = getClient();
    if (!client) {
      showAlert("Error: Cliente Supabase no inicializado.");
      return;
    }

    const emailInput = document.getElementById("auth-email");
    const passInput = document.getElementById("auth-password");
    const btn = document.getElementById("auth-submit-btn");
    const btnText = document.getElementById("auth-btn-text");

    const email = (emailInput.value || "").trim().toLowerCase();
    const password = (passInput.value || "").trim();

    if (!email || !password) {
      showAlert("Ingresa el mismo correo y contraseña que usas en Magia ERP.");
      return;
    }

    btn.disabled = true;
    btnText.innerText = isSignUpMode ? "Creando cuenta..." : "Conectando con Bóveda y Túnel...";

    try {
      if (isSignUpMode) {
        const { data, error } = await client.auth.signUp({ email, password });
        if (error) throw error;

        if (data.session) {
          showAlert("✅ ¡Cuenta creada y acceso concedido!", true);
          setTimeout(() => updateAuthUI(data.session), 400);
        } else {
          showAlert("✅ Cuenta creada. Ya puedes iniciar sesión.", true);
          toggleAuthMode(false);
        }
      } else {
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            throw new Error("Credenciales inválidas. Usa las mismas credenciales de Magia ERP.");
          }
          throw error;
        }

        showAlert("✅ Acceso privado autorizado. Sincronizando Túnel Magia & Papel...", true);
        setTimeout(() => updateAuthUI(data.session), 350);
      }
    } catch (err) {
      console.error("Auth error:", err);
      showAlert(`⚠️ ${err.message}`);
    } finally {
      btn.disabled = false;
      btnText.innerText = isSignUpMode ? "Registrar Administrador" : "Desbloquear Bóveda Privada";
    }
  }

  function toggleAuthMode(forceSignIn = null) {
    clearAlert();
    isSignUpMode = forceSignIn !== null ? !forceSignIn : !isSignUpMode;

    const btnText = document.getElementById("auth-btn-text");
    const toggleLabel = document.getElementById("auth-toggle-mode");

    if (isSignUpMode) {
      if (btnText) btnText.innerText = "Registrar Administrador";
      if (toggleLabel) {
        toggleLabel.innerHTML = `¿Ya tienes cuenta en Magia? <a href="#" id="auth-switch-link">Iniciar sesión</a>`;
      }
    } else {
      if (btnText) btnText.innerText = "Desbloquear Bóveda Privada";
      if (toggleLabel) {
        toggleLabel.innerHTML = `¿Primera vez? <a href="#" id="auth-switch-link">Registrar administrador</a>`;
      }
    }

    const newLink = document.getElementById("auth-switch-link");
    if (newLink) {
      newLink.addEventListener("click", (e) => {
        e.preventDefault();
        toggleAuthMode();
      });
    }
  }

  async function handleLogout() {
    const client = getClient();
    if (client) {
      await client.auth.signOut();
    }
    updateAuthUI(null);
    clearAlert();
  }

  function initAuth() {
    const client = getClient();
    if (!client) return;

    const authForm = document.getElementById("auth-form");
    if (authForm) authForm.addEventListener("submit", handleAuthSubmit);

    const switchLink = document.getElementById("auth-switch-link");
    if (switchLink) {
      switchLink.addEventListener("click", (e) => {
        e.preventDefault();
        toggleAuthMode();
      });
    }

    const btnLogout = document.getElementById("btn-logout");
    if (btnLogout) btnLogout.addEventListener("click", handleLogout);

    const btnTogglePass = document.getElementById("btn-toggle-password");
    const passInput = document.getElementById("auth-password");
    if (btnTogglePass && passInput) {
      btnTogglePass.addEventListener("click", () => {
        const isPass = passInput.type === "password";
        passInput.type = isPass ? "text" : "password";
        btnTogglePass.innerText = isPass ? "🙈" : "👁️";
      });
    }

    client.auth.getSession().then(({ data: { session } }) => {
      updateAuthUI(session);
    }).catch(() => {
      updateAuthUI(null);
    });

    client.auth.onAuthStateChange((_event, session) => {
      updateAuthUI(session);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAuth);
  } else {
    initAuth();
  }
})();
