/*!
 * Stitch Lab — Signal Console
 * Self-contained website chat widget matching the site's neon/molten design system.
 * Usage: <script src="assets/stitchlab-agent.js" defer></script> before </body>.
 *
 * Configure CONFIG.webhookUrl below to point at your n8n "website agent" webhook
 * (see the companion n8n-website-widget-workflow.json for the receiving workflow).
 */
(function () {
  "use strict";

  const CONFIG = {
    webhookUrl: "https://dsassssssd-stitchlab.hf.space/webhook/website-agent",
    storageKey: "stitchlab_visitor_id",
    historyKey: "stitchlab_visitor_history",
    greeting:
      "system online. ask about pricing, timelines, or what I actually build — I'll route it straight to Arslan if it's worth his time.",
    inputPlaceholder: "ask something...",
  };

  /* ---------- visitor identity ---------- */
  function getVisitorId() {
    let id = localStorage.getItem(CONFIG.storageKey);
    if (!id) {
      id =
        "stitchlab_visitor_" +
        Math.random().toString(36).slice(2, 10) +
        Date.now().toString(36);
      localStorage.setItem(CONFIG.storageKey, id);
    }
    return id;
  }

  function loadHistory() {
    try {
      return JSON.parse(sessionStorage.getItem(CONFIG.historyKey) || "[]");
    } catch (e) {
      return [];
    }
  }
  function saveHistory(history) {
    try {
      sessionStorage.setItem(CONFIG.historyKey, JSON.stringify(history.slice(-20)));
    } catch (e) {
      /* ignore quota errors */
    }
  }

  /* ---------- styles ---------- */
  const css = `
  #sl-agent-toggle{
    position:fixed; right:24px; bottom:24px; z-index:9997;
    display:flex; align-items:center; gap:10px;
    padding:12px 18px 12px 14px; border-radius:100px;
    background:rgba(4,8,16,.72); backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px);
    border:1px solid var(--card-border, rgba(111,178,255,.16));
    cursor:pointer; color:var(--paper,#EAF2FF); font-size:13px;
    box-shadow:0 8px 28px rgba(47,184,255,.18);
    transition:transform .18s cubic-bezier(.34,1.56,.64,1), border-color .2s, box-shadow .3s;
  }
  #sl-agent-toggle:hover{ transform:translateY(-3px); border-color:var(--molten,#2FB8FF); box-shadow:0 10px 34px rgba(47,184,255,.32); }
  #sl-agent-toggle:active{ transform:scale(.95); }
  #sl-agent-toggle.sl-hide{ display:none; }
  .sl-agent-dot-wrap{ position:relative; width:14px; height:14px; flex-shrink:0; display:flex; align-items:center; justify-content:center; }
  .sl-agent-dot{
    width:7px; height:7px; border-radius:50%;
    background:var(--signal,#3FE0D0); box-shadow:0 0 10px var(--signal,#3FE0D0);
    animation:slDotPulse 1.8s ease-in-out infinite;
  }
  .sl-agent-ring{
    position:absolute; inset:0; border-radius:50%;
    border:1.5px solid var(--signal,#3FE0D0);
    animation:slRingPulse 2.2s cubic-bezier(.4,0,.2,1) infinite;
  }
  @keyframes slDotPulse{0%,100%{opacity:1;}50%{opacity:.35;}}
  @keyframes slRingPulse{
    0%{ transform:scale(1); opacity:.8; }
    100%{ transform:scale(2.6); opacity:0; }
  }
  #sl-agent-toggle-label{ font-family:'JetBrains Mono',monospace; letter-spacing:.01em; white-space:nowrap; }

  #sl-agent-panel{
    position:fixed; right:24px; bottom:24px; z-index:9998;
    width:360px; max-width:calc(100vw - 32px);
    height:520px; max-height:calc(100vh - 100px);
    display:flex; flex-direction:column;
    border-radius:20px; overflow:hidden;
    background:var(--card, rgba(13,20,33,.9));
    transform:translateY(16px) scale(.97); opacity:0; pointer-events:none;
    transition:transform .28s cubic-bezier(.22,1,.36,1), opacity .28s;
  }
  #sl-agent-panel.sl-open{ transform:translateY(0) scale(1); opacity:1; pointer-events:auto; }
  #sl-agent-panel.sl-flash{ animation:slFlashGold 1s ease; }
  @keyframes slFlashGold{
    0%{ box-shadow:0 0 0 rgba(255,176,32,0); }
    30%{ box-shadow:0 0 0 1.5px rgba(255,176,32,.9), 0 0 40px rgba(255,176,32,.4); }
    100%{ box-shadow:0 0 0 rgba(255,176,32,0); }
  }
  @media(max-width:480px){
    #sl-agent-panel{ right:16px; left:16px; width:auto; bottom:16px; height:min(72vh,560px); }
    #sl-agent-toggle{ right:16px; bottom:16px; }
  }

  .sl-agent-header{
    display:flex; align-items:center; gap:10px;
    padding:14px 16px; border-bottom:1px solid var(--card-border, rgba(111,178,255,.16));
    flex-shrink:0;
  }
  .sl-agent-header-dot{
    width:6px; height:6px; border-radius:50%; background:var(--signal,#3FE0D0);
    box-shadow:0 0 8px var(--signal,#3FE0D0); animation:slDotPulse 1.8s ease-in-out infinite;
  }
  .sl-agent-header-title{
    font-family:'JetBrains Mono',monospace; font-size:12px; letter-spacing:.04em;
    color:var(--signal,#3FE0D0); flex:1;
  }
  .sl-agent-close{
    background:none; border:none; color:var(--ink-40, rgba(234,242,255,.4));
    font-size:18px; line-height:1; cursor:pointer; padding:4px 6px; border-radius:6px;
    transition:color .2s, background .2s;
  }
  .sl-agent-close:hover{ color:var(--paper,#EAF2FF); background:rgba(255,255,255,.06); }

  #sl-agent-messages{
    flex:1; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:12px;
    font-family:'JetBrains Mono',monospace; font-size:12.5px; line-height:1.6;
    scrollbar-width:thin; scrollbar-color:rgba(111,178,255,.3) transparent;
  }
  #sl-agent-messages::-webkit-scrollbar{ width:6px; }
  #sl-agent-messages::-webkit-scrollbar-thumb{ background:rgba(111,178,255,.25); border-radius:3px; }

  .sl-msg{ max-width:88%; white-space:pre-wrap; word-break:break-word; }
  .sl-msg-agent{ align-self:flex-start; color:var(--signal,#3FE0D0); }
  .sl-msg-agent .sl-msg-tag{ color:var(--ink-40, rgba(234,242,255,.4)); }
  .sl-msg-user{
    align-self:flex-end; color:var(--paper,#EAF2FF);
    background:rgba(47,184,255,.1); border:1px solid rgba(47,184,255,.2);
    padding:7px 11px; border-radius:10px;
  }
  .sl-msg-error{ align-self:flex-start; color:#ff8a7a; }

  .sl-typing{ display:flex; gap:4px; align-self:flex-start; padding:4px 0; }
  .sl-typing span{
    width:5px; height:5px; border-radius:50%; background:var(--signal,#3FE0D0);
    animation:slTypingBlink 1.1s ease-in-out infinite;
  }
  .sl-typing span:nth-child(2){ animation-delay:.15s; }
  .sl-typing span:nth-child(3){ animation-delay:.3s; }
  @keyframes slTypingBlink{ 0%,60%,100%{ opacity:.25; } 30%{ opacity:1; } }

  #sl-agent-form{
    display:flex; align-items:center; gap:8px;
    padding:12px 14px; border-top:1px solid var(--card-border, rgba(111,178,255,.16));
    flex-shrink:0;
  }
  .sl-agent-prompt{ color:var(--signal,#3FE0D0); font-family:'JetBrains Mono',monospace; font-size:13px; }
  #sl-agent-input{
    flex:1; background:none; border:none; outline:none; color:var(--paper,#EAF2FF);
    font-family:'JetBrains Mono',monospace; font-size:13px; caret-color:var(--signal,#3FE0D0);
  }
  #sl-agent-input::placeholder{ color:var(--ink-40, rgba(234,242,255,.4)); }
  #sl-agent-send{
    background:none; border:none; cursor:pointer; color:var(--molten,#2FB8FF);
    display:flex; align-items:center; justify-content:center; padding:4px;
    transition:transform .15s, color .2s;
  }
  #sl-agent-send:hover{ color:var(--signal,#3FE0D0); transform:translateX(2px); }
  #sl-agent-send:disabled{ opacity:.35; cursor:default; transform:none; }
  `;
  const styleEl = document.createElement("style");
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  /* ---------- DOM ---------- */
  const toggle = document.createElement("button");
  toggle.id = "sl-agent-toggle";
  toggle.setAttribute("aria-label", "Open chat with the Stitch Lab agent");
  toggle.innerHTML = `
    <span class="sl-agent-dot-wrap"><span class="sl-agent-ring"></span><span class="sl-agent-dot"></span></span>
    <span id="sl-agent-toggle-label">&gt; talk to the system</span>
  `;

  const panel = document.createElement("div");
  panel.id = "sl-agent-panel";
  panel.className = "neon-frame";
  panel.innerHTML = `
    <div class="sl-agent-header">
      <span class="sl-agent-header-dot"></span>
      <span class="sl-agent-header-title">stitchlab_agent — active</span>
      <button class="sl-agent-close" id="sl-agent-close" aria-label="Close chat">&times;</button>
    </div>
    <div id="sl-agent-messages"></div>
    <form id="sl-agent-form">
      <span class="sl-agent-prompt">&gt;</span>
      <input id="sl-agent-input" type="text" autocomplete="off" placeholder="${CONFIG.inputPlaceholder}" />
      <button id="sl-agent-send" type="submit" aria-label="Send">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
      </button>
    </form>
  `;

  document.body.appendChild(toggle);
  document.body.appendChild(panel);

  const messagesEl = panel.querySelector("#sl-agent-messages");
  const formEl = panel.querySelector("#sl-agent-form");
  const inputEl = panel.querySelector("#sl-agent-input");
  const sendBtn = panel.querySelector("#sl-agent-send");
  const closeBtn = panel.querySelector("#sl-agent-close");

  /* ---------- render helpers ---------- */
  function appendMessage(role, text) {
    const div = document.createElement("div");
    if (role === "agent") {
      div.className = "sl-msg sl-msg-agent";
      div.innerHTML = `<span class="sl-msg-tag">agent&gt;</span> ${escapeHtml(text)}`;
    } else if (role === "error") {
      div.className = "sl-msg sl-msg-error";
      div.innerHTML = `<span class="sl-msg-tag">system&gt;</span> ${escapeHtml(text)}`;
    } else {
      div.className = "sl-msg sl-msg-user";
      div.textContent = text;
    }
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return div;
  }

  function escapeHtml(str) {
    const d = document.createElement("div");
    d.textContent = str;
    return d.innerHTML;
  }

  function showTyping() {
    const t = document.createElement("div");
    t.className = "sl-typing";
    t.id = "sl-agent-typing";
    t.innerHTML = "<span></span><span></span><span></span>";
    messagesEl.appendChild(t);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return t;
  }
  function hideTyping() {
    const t = document.getElementById("sl-agent-typing");
    if (t) t.remove();
  }

  function flashHotLead() {
    panel.classList.remove("sl-flash");
    // force reflow so the animation can re-trigger
    void panel.offsetWidth;
    panel.classList.add("sl-flash");
  }

  /* ---------- open / close ---------- */
  let isOpen = false;
  function openPanel() {
    isOpen = true;
    panel.classList.add("sl-open");
    toggle.classList.add("sl-hide");
    inputEl.focus();
  }
  function closePanel() {
    isOpen = false;
    panel.classList.remove("sl-open");
    toggle.classList.remove("sl-hide");
  }
  toggle.addEventListener("click", openPanel);
  closeBtn.addEventListener("click", closePanel);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen) closePanel();
  });

  /* ---------- conversation bootstrap ---------- */
  const visitorId = getVisitorId();
  let history = loadHistory();

  if (history.length === 0) {
    appendMessage("agent", CONFIG.greeting);
    history.push({ role: "agent", text: CONFIG.greeting });
    saveHistory(history);
  } else {
    history.forEach((m) => appendMessage(m.role, m.text));
  }

  /* ---------- send message ---------- */
  async function sendMessage(text) {
    appendMessage("user", text);
    history.push({ role: "user", text });
    saveHistory(history);

    inputEl.value = "";
    inputEl.disabled = true;
    sendBtn.disabled = true;
    showTyping();

    try {
      const res = await fetch(CONFIG.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: "website",
          contact_id: visitorId,
          message: text,
          page_url: window.location.href,
          history: history.slice(-10),
        }),
      });

      hideTyping();

      if (!res.ok) throw new Error("bad response: " + res.status);
      const data = await res.json();
      const reply = (data && data.reply) || "no response from the agent — try again in a moment.";

      appendMessage("agent", reply);
      history.push({ role: "agent", text: reply });
      saveHistory(history);

      if (data && data.hotLead) flashHotLead();
    } catch (err) {
      hideTyping();
      appendMessage(
        "error",
        "connection lost. the message didn't go through — try again, or reach out directly via the contact section."
      );
    } finally {
      inputEl.disabled = false;
      sendBtn.disabled = false;
      inputEl.focus();
    }
  }

  formEl.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = inputEl.value.trim();
    if (!text) return;
    sendMessage(text);
  });
})();
