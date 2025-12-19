For my understanding
src/popup.html + src/popup.js — present login/register screens; call chrome.runtime.sendMessage to start login, or ask service worker whether user is logged in and display status.

src/content_script.js — inject floating button & consent modal into LinkedIn UI; when consented, send a message to the service worker to capture and upload.

src/service_worker.js — central token manager, handles launchWebAuthFlow PKCE login, token refresh, receives messages from popup/content and performs network calls.

src/tokenManager.js (imported by service worker) — helpers to get/set/refresh tokens in chrome.storage.local.

manifest.json — declare action popup, content scripts, background service worker, permissions, host permissions.


v0.1.0
html
1. <!doctype html>
Layman: Says "This is a modern web page."

Technical: Declares the HTML version (HTML5). Helps browsers know how to render it.

2. <html lang="en">
Layman: Starts your web page, tells browser the main language is English.

Technical: Root element of the HTML. lang="en" is for Accessibility and SEO.

3. <head> Section
Layman: Contains setup info for the web page; users don’t see this directly.

Technical: Metadata and links for styling/scripts.

- <meta charset="utf-8" />
Layman: Lets you use nearly any language/symbol in your text.

Technical: Character encoding set to UTF-8.

- <meta name="viewport" ... />
Layman: Makes your site look good on phones and tablets.

Technical: Controls page’s scaling and dimensions for responsive design.

- <title>LinkedIn Productivity — Auth</title>
Layman: What shows up in the browser tab.

Technical: Title of your page.

- <link rel="stylesheet" href="css/popup.css">
Layman: Uses a separate file to make your page look nice.

Technical: Loads CSS styling from css/popup.css.

4. <body> Section
Layman: Everything users see on the page.

Technical: Main content and structure.

Inside <body>
5. <div class="wrap">
Layman: A box that holds everything together.

Technical: Main container for layout purposes. Uses a CSS class called wrap.

6. Header Section
<header class="hero">
Layman: The big, important top part.

Technical: Semantic tag for main heading/intro. hero is a CSS class for special styling.

<div class="hero-content">
Layman: Puts the title and tagline inside the top area.

Technical: Another container, styled by hero-content.

<h1 class="product-title">LinkedIn <span class="product-accent">Productivity</span></h1>
Layman: Big text showing the product name. "Productivity" is highlighted differently.

Technical: Heading for SEO/accessibility. span with product-accent class for styling the accent word.

<p class="tagline">Write better comments - Save leads - Improve your profile</p>
Layman: One-line description of what your tool does.

Technical: A paragraph with the tagline class.

7. Authentication Card
<div class="card">
Layman: The box with login/register forms.

Technical: Uses the card class for rounded corners, shadow, etc.

Tabs and Forms
<div class="tabs">
Layman: Buttons at the top for switching between login/register.

Technical: tabs class groups tab buttons.

<button id="tab-login" class="tab" aria-selected="false">Login</button>
Layman: The login tab (not active to start).

Technical: Button with ID for JavaScript, tab class, and aria-selected for screen readers.

<button id="tab-register" class="tab active" aria-selected="true">Register</button>
Layman: The register tab (active when page loads).

Technical: Button for switching, active means highlighted, aria-selected helps accessibility.

Panels (Forms): One shown at a time
Login Panel:
<div id="panel-login" class="panel hidden">

Layman: Hidden by default. Shows login form.

Technical: Uses panel for layout, hidden hides it (CSS sets display: none).

<h3 class="title">Login</h3>
Heading for the form.

Input: Email
<label class="field">

Layman: Box for typing your email.

Technical: Label for accessibility, "field" class for spacing.

<span class="label">Email</span>

Text above the input.

<input id="login-email" type="email" placeholder="you@gmail.com" autocomplete="username" />

Layman: Where you type your email. Shows a sample ("you@gmail.com") by default.

Technical:

id used for JS.

type="email" makes sure input matches email format.

placeholder shows example text.

autocomplete="username" helps browser know it’s for usernames.

Input: Password
<input id="login-password" type="password" placeholder="Password" autocomplete="current-password" />

Same as email, but masks typed characters by default and offers autocomplete features.

<button id="btn-login" class="btn primary" disabled>Login</button>
Layman: Login button (greyed out/unclickable until you type in details).

Technical: Uses classes for styling, disabled until inputs are valid.

Register Panel:
<div id="panel-register" class="panel">

Layman: The sign-up form; visible by default.

Technical: No hidden class, so shows up.

Input: Full Name
<input id="reg-name" type="text" placeholder="Full name" />

Place to write your name

Input: Email
<input id="reg-email" type="email" placeholder="you@gmail.com" autocomplete="email" />

Similar to login email, but uses autocomplete="email" for browsers to suggest your stored emails.

Input: Password
<input id="reg-password" type="password" placeholder="Create a password" autocomplete="new-password" />

For choosing a password. Masks the characters, browser may offer to save it.

Password Strength Bar
<div class="pw-compact">

Layman: Small area showing if your password is strong or weak.

Technical: Uses styling to keep progress bar tight.

<div class="progress small"><div id="pw-strength" class="progress-bar"></div></div>

Shows how strong your password is (bar fills up as password gets longer/harder).

<div id="pw-label" class="pw-label">Too short</div>

Text that changes as you type in the password.

<button id="btn-register" class="btn outline" disabled>Register</button>
Same as the login button: must fill fields correctly before it can be clicked.

8. <script src="js/popup.js"></script>
Layman: Adds interactive magic (lets tabs switch, buttons activate, password bar update).

Technical: Loads JavaScript file; handles all dynamic behaviors on this page.

css

CSS (Cascading Style Sheets) is like the fashion stylist for your webpage—it decides colors, layout, shapes, and what looks nice.

.wrap: The big outer box—usually adds some margin (“space”) around the content, centers, or limits width.

.hero: Makes the header big and standout—can add background color, larger text, or padding (“extra space inside”).

.hero-content: Fine-tunes the inside of the header—maybe some extra spacing, centers text.

.product-title / .product-accent: How the main name is styled—could be bold, big, accented word is often a different color.

.tagline: Styles the “slogan”—color, font-size, maybe italics or spacing.

.card: Makes the login/register box look like a neat card—rounded corners, shadow, background color, spacing.

.tabs: Arranges the Login/Register buttons—puts them side-by-side, changes appearance for “active” tab.

.tab: The tab buttons—basic style; big enough to click comfortably, changes color if active.

.active: Lights up the button or tab that’s selected.

.panel: Basic form container—maybe a little space (“padding”), sometimes a border.

.hidden: Anything with this class is invisible (display: none).

.field: Each input area—spacing around email/password boxes, more room between stacked fields.

.label: The little text above each field (like “Email”)—usually smaller, sometimes gray.

.btn: Any button—makes it look clickable; color, padding, borders, font.

.btn.primary: Makes the main login button pop—strong color like blue.

.btn.outline: The register button stands out, maybe just an outline instead of a filled background.

.pw-compact: Keeps the password strength section small and neat.

.progress.small, .progress-bar: Styles the password strength bar—color, thickness, rounded, fills up as it gets stronger.

.pw-label: Text telling you “Too short”/“Weak”/“Strong”—changes color or boldness based on password.

js

Top Level
js
document.addEventListener('DOMContentLoaded', () => {
Layman: Waits until the web page is fully loaded before running the code inside.

Technical: Ensures all HTML elements exist before code manipulates them (fires when HTML is parsed).

Helper Function
js
  const id = (s) => document.getElementById(s);
Layman: Makes it quick to grab elements by their ID (like “reg-name”) without typing the long method.

Technical: Shorthand for document.getElementById that takes a string and returns the matching element.

Getting All Main Elements
js
  const tabLogin = id('tab-login');
  const tabRegister = id('tab-register');
  const panelLogin = id('panel-login');
  const panelRegister = id('panel-register');
Layman: Stores the main tab buttons and panels into handy variables so we can control them later.

Technical: Caches DOM elements for tabs and their corresponding form panels for fast access.

js
  const regName = id('reg-name');
  const regEmail = id('reg-email');
  const regPw = id('reg-password');
  const btnRegister = id('btn-register');
Layman: Grabs the sign-up form’s input boxes and register button.

Technical: Caches registration form fields and button.

js
  const loginEmail = id('login-email');
  const loginPw = id('login-password');
  const btnLogin = id('btn-login');
Layman: Grabs the login form’s input boxes and button.

Technical: Caches login form fields and button.

js
  const pwStrengthBar = id('pw-strength');
  const pwLabel = id('pw-label');
Layman: Gets the progress bar and label that tell you if your password is strong or weak.

Technical: Caches password strength UI components.

Panel Switcher
js
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
Layman: Switches the page between login and register forms when you click the tabs. Only one form is visible at a time, and its tab is highlighted.

Technical: Adds/removes CSS classes (hidden for showing/hiding panels, active for tab highlighting); calls checkStates at the end to update button states after switching.

Email Validator
js
  function isValidEmail(s){
    return !!s && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
  }
Layman: Checks if you typed a real email address—must have text, “@”, and a dot.

Technical: Boolean return using a regular expression for standard email format.

Password Strength Checker
js
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
Layman: As you type a password, adds points for length, lowercase, uppercase, numbers, and special characters. Shows a colored bar and “Weak,” “Medium,” or “Strong.”

Technical: Dynamically computes a password score; adjusts the width of the strength bar and updates feedback label.

Button Enable/Disable Logic
js
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
Layman: Makes “Login” and “Register” buttons clickable only if you fill all boxes properly (valid email, non-empty password).

Technical: Sets the disabled property based on input validation checks.

Event Listeners—Control Interactivity
js
  // event wiring
  tabLogin.addEventListener('click', () => showPanel('login'));
  tabRegister.addEventListener('click', () => showPanel('register'));
Layman: When you click a tab, it displays the matching form.

Technical: Listens for clicks, calls the show/hide logic.

js
  regName.addEventListener('input', checkStates);
  regEmail.addEventListener('input', checkStates);
  regPw.addEventListener('input', () => { updateStrength(); checkStates(); });
Layman: Every time you type in the register fields, checks if the button should be enabled, and when you type in the password, updates the strength bar too.

Technical: Listens for input events, runs validation and updates strength bar in real-time.

js
  loginEmail.addEventListener('input', checkStates);
  loginPw.addEventListener('input', checkStates);
Layman: For the login fields, checks if you can press Login.

Technical: Enables/disables login button as you type.

js
  btnLogin.addEventListener('click', () => console.log("Login clicked"));
  btnRegister.addEventListener('click', () => console.log("Register clicked"));
Layman: When you press either button, it "logs" a message for now (placeholder for real action).

Technical: Prints to console for testing; in a real app, this would send data to the server.

Default View and Strength Bar
js
  showPanel('register');
  updateStrength();
});
Layman: Starts with the register panel showing and the password strength bar updated (even if empty).

Technical: Initializes UI with register panel displayed.