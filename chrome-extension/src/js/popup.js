document.addEventListener('DOMContentLoaded', () => {

  const id = (s) => document.getElementById(s);

  const tabLogin = id('tab-login');
  const tabRegister = id('tab-register');
  const panelLogin = id('panel-login');
  const panelRegister = id('panel-register');

  const regName = id('reg-name');
  const regEmail = id('reg-email');
  const regPw = id('reg-password');
  const btnRegister = id('btn-register');

  const loginEmail = id('login-email');
  const loginPw = id('login-password');
  const btnLogin = id('btn-login');

  const pwStrengthBar = id('pw-strength');
  const pwLabel = id('pw-label');

  function showPanel(name){
    if(name === 'login'){
      panelLogin.classList.remove('hidden');
      panelRegister.classList.add('hidden');

      tabLogin.classList.add('active');
      tabRegister.classList.remove('active');
    } else {
      panelRegister.classList.remove('hidden');
      panelLogin.classList.add('hidden');

      tabRegister.classList.add('active');
      tabLogin.classList.remove('active');
    }
    checkStates();
  }

  function isValidEmail(s){
    return !!s && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
  }

  function updateStrength(){
    const pw = regPw.value || "";
    let score = 0;

    if(pw.length >= 8) score += 25;
    if(/[a-z]/.test(pw)) score += 15;
    if(/[A-Z]/.test(pw)) score += 20;
    if(/[0-9]/.test(pw)) score += 20;
    if(/[^A-Za-z0-9]/.test(pw)) score += 20;

    pwStrengthBar.style.width = score + "%";

    if(score < 30) pwLabel.textContent = "Weak";
    else if(score < 70) pwLabel.textContent = "Medium";
    else pwLabel.textContent = "Strong";
  }

  function checkStates(){
    btnLogin.disabled = !(
      isValidEmail(loginEmail.value) &&
      loginPw.value.length > 0
    );

    btnRegister.disabled = !(
      regName.value.trim().length > 0 &&
      isValidEmail(regEmail.value) &&
      regPw.value.length >= 8
    );
  }

  // event wiring
  tabLogin.addEventListener('click', () => showPanel('login'));
  tabRegister.addEventListener('click', () => showPanel('register'));

  regName.addEventListener('input', checkStates);
  regEmail.addEventListener('input', checkStates);
  regPw.addEventListener('input', () => { updateStrength(); checkStates(); });

  loginEmail.addEventListener('input', checkStates);
  loginPw.addEventListener('input', checkStates);

// Message display for login in popup
function showLoginError(msg) {
  let messageEl = document.getElementById('login-message');
  // If not present, create and insert below the panel-login
  if (!messageEl) {
    messageEl = document.createElement('div');
    messageEl.id = 'login-message';
    messageEl.style.margin = '10px 0';
    // Insert below password field in the login panel
    const passwordField = document.getElementById('login-password');
    if (passwordField && passwordField.parentNode) {
      passwordField.parentNode.after(messageEl);
    } else {
      // Fallback, insert in panel-login
      document.getElementById('panel-login').appendChild(messageEl);
    }
  }
  messageEl.innerHTML = msg || "";
}

  btnLogin.addEventListener('click', async () => {
  const data = {
    email: loginEmail.value.trim(),
    password: loginPw.value
  };

  try {
    const resp = await fetch('http://127.0.0.1:8000/accounts/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await resp.json();
    let message = '';
    if (resp.ok && result.access && result.refresh) {
      // Store access/refresh tokens with expiry via tokenManager
      await tokenManager.setToken(result.access, result.refresh);

      // Clear login form
      loginEmail.value = '';
      loginPw.value = '';
      checkStates();

      message = '<span style="color:green;font-weight:bold;">Login successful! Redirecting to dashboard...</span>';
      showLoginError(message); // Use the same message div for login result
      setTimeout(() => {
      chrome.tabs.query({ url: "http://127.0.0.1:8000/dashboard/" }, function(tabs) {
        if (tabs.length > 0) {
          // If already open, focus on it
          chrome.tabs.update(tabs[0].id, { active: true });
        } else {
          // Else create new dashboard tab
          chrome.tabs.create({ url: "http://127.0.0.1:8000/dashboard/" });
        }
        window.close();
      });
    }, 1200);

    } else {
      // Error: show formatted error(s) under login box, just like registration
      if (typeof result === 'object' && result !== null) {
  let errors = [];
  if (result.detail) {
    // Match and translate backend errors for user clarity
    if (result.detail === "No active account found with the given credentials") {
      errors.push("Either your email is not registered or your password is incorrect.");
    } else if (result.detail.toLowerCase().includes("not verified")) {
      errors.push("Your email address is not verified. Please check your inbox and verify your email before logging in.");
    } else if (result.detail.toLowerCase().includes("password")) {
      errors.push("The password you entered is incorrect.");
    } else {
      errors.push(result.detail); // fallback to raw error
    }
  }
  if (result.non_field_errors && Array.isArray(result.non_field_errors)) {
    errors = errors.concat(result.non_field_errors);
  }
  message = `<span style="color:crimson;">${errors.join('<br>')}</span>`;
      } else {
        message = `<span style="color:crimson;">${result.error || "Login failed"}</span>`;
      }
      showLoginError(message);

    }
  } catch (err) {
    showLoginError('<span style="color:crimson;">Network error. Please try again.</span>');
  }
  });

  btnRegister.addEventListener('click', async () => {
    const data = {
      username: regName.value.trim(),
      email: regEmail.value.trim(),
      password: regPw.value
    };
    const messageEl = document.getElementById('register-message');
    try {
      const resp = await fetch('http://127.0.0.1:8000/accounts/register/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await resp.json();
      let message = '';
      if (resp.ok) {
        // Success: show message, clear form
        regName.value = '';
        regEmail.value = '';
        regPw.value = '';
        pwStrengthBar.style.width = '0%';
        pwLabel.textContent = '';
        checkStates();
        message = '<span style="color:green;font-weight:bold;">Registered! Please check your email and verify your account.</span>';
      } else {
        // Error: show formatted error in the same div
        if (typeof result === 'object' && result !== null) {
          let errors = [];
          Object.entries(result).forEach(([field, messages]) => {
            if (Array.isArray(messages)) {
              messages.forEach(msg => errors.push(`<strong>${field}:</strong> ${msg}`));
            } else {
              errors.push(`<strong>${field}:</strong> ${messages}`);
            }
          });
          message = `<span style="color:crimson;">${errors.join('<br>')}</span>`;
        } else {
          message = `<span style="color:crimson;">${result.error || "Registration failed"}</span>`;
        }
      }
      if (messageEl) messageEl.innerHTML = message;
    } catch (err) {
      if (messageEl) messageEl.innerHTML = '<span style="color:crimson;">Network error. Please try again.</span>';
    }
  });

  // default view = REGISTER
  showPanel('register');
  updateStrength();
});
