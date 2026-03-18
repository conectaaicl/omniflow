(function () {
  'use strict';

  var script = document.currentScript || (function () {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  var TENANT = script.getAttribute('data-tenant') || 'osw';
  var BASE_URL = script.src.replace('/widget.js', '');
  var STORAGE_KEY = 'omniflow_visitor_' + TENANT;
  var POLL_INTERVAL = 3000;

  // ── Visitor ID ────────────────────────────────────────────────────────────
  function getVisitorId() {
    var id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = 'vis_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  }

  var visitorId = getVisitorId();
  var config = { color: '#1a5276', greeting: '¡Hola! ¿En qué puedo ayudarte hoy? 😊', bot_name: 'Asistente', enabled: true, logo_url: '', ai_enabled: false };
  var lastMsgCount = 0;
  var pollTimer = null;
  var isOpen = false;
  var waitingReply = false;

  // ── Load config ───────────────────────────────────────────────────────────
  fetch(BASE_URL + '/api/v1/webchat/config/' + TENANT)
    .then(function (r) { return r.json(); })
    .then(function (data) {
      config = Object.assign(config, data);
      if (config.enabled) init();
    })
    .catch(function () { init(); });

  // ── Styles ────────────────────────────────────────────────────────────────
  function injectStyles() {
    var css = `
      #omniflow-widget * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
      #omniflow-btn {
        position: fixed; bottom: 24px; right: 24px; z-index: 99999;
        width: 60px; height: 60px; border-radius: 50%; border: none; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 4px 24px rgba(0,0,0,0.35); transition: transform 0.2s, box-shadow 0.2s;
        overflow: hidden;
      }
      #omniflow-btn:hover { transform: scale(1.08); box-shadow: 0 6px 28px rgba(0,0,0,0.45); }
      #omniflow-btn svg, #omniflow-btn img { pointer-events: none; }
      #omniflow-btn-logo { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
      #omniflow-badge {
        position: absolute; top: -4px; right: -4px;
        background: #ef4444; color: white; border-radius: 999px;
        font-size: 10px; font-weight: bold; min-width: 18px; height: 18px;
        display: none; align-items: center; justify-content: center; padding: 0 4px;
      }
      #omniflow-panel {
        position: fixed; bottom: 96px; right: 24px; z-index: 99998;
        width: 360px; max-width: calc(100vw - 48px);
        background: #fff; border: 1px solid rgba(0,0,0,0.1);
        border-radius: 20px; overflow: hidden;
        box-shadow: 0 20px 60px rgba(0,0,0,0.18);
        display: none; flex-direction: column;
        transition: opacity 0.25s, transform 0.25s;
        opacity: 0; transform: translateY(16px) scale(0.97);
      }
      #omniflow-panel.open { display: flex; opacity: 1; transform: translateY(0) scale(1); }
      #omniflow-header {
        padding: 14px 16px; display: flex; align-items: center; gap: 10px;
      }
      #omniflow-header-logo {
        width: 40px; height: 40px; border-radius: 10px; overflow: hidden; flex-shrink: 0;
        display: flex; align-items: center; justify-content: center;
        font-size: 18px; font-weight: bold; color: white;
      }
      #omniflow-header-logo img { width: 100%; height: 100%; object-fit: cover; }
      #omniflow-header-info { flex: 1; min-width: 0; }
      #omniflow-header-name { color: #fff; font-weight: 700; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      #omniflow-header-status { color: rgba(255,255,255,0.75); font-size: 11px; margin-top: 1px; display: flex; align-items: center; gap: 4px; }
      #omniflow-header-status::before { content: ''; width: 7px; height: 7px; border-radius: 50%; background: #4ade80; display: inline-block; }
      #omniflow-messages {
        flex: 1; padding: 14px; overflow-y: auto;
        max-height: 340px; min-height: 200px;
        display: flex; flex-direction: column; gap: 8px;
        background: #f8f9fb;
      }
      .omniflow-msg {
        max-width: 82%; padding: 10px 14px; border-radius: 18px;
        font-size: 13.5px; line-height: 1.55; word-break: break-word;
      }
      .omniflow-msg.bot { background: #fff; color: #1a202c; border-bottom-left-radius: 4px; align-self: flex-start; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
      .omniflow-msg.user { color: white; border-bottom-right-radius: 4px; align-self: flex-end; }
      .omniflow-typing { align-self: flex-start; background: #fff; border-radius: 18px; border-bottom-left-radius: 4px; padding: 12px 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); display: flex; gap: 4px; align-items: center; }
      .omniflow-typing span { width: 7px; height: 7px; border-radius: 50%; background: #94a3b8; display: inline-block; animation: omniflow-bounce 1.2s infinite; }
      .omniflow-typing span:nth-child(2) { animation-delay: 0.2s; }
      .omniflow-typing span:nth-child(3) { animation-delay: 0.4s; }
      @keyframes omniflow-bounce { 0%,60%,100%{ transform:translateY(0) } 30%{ transform:translateY(-5px) } }
      #omniflow-input-area {
        padding: 10px 14px; border-top: 1px solid #f0f0f0;
        display: flex; gap: 8px; background: #fff; align-items: center;
      }
      #omniflow-input {
        flex: 1; background: #f3f4f6; border: 1.5px solid transparent;
        border-radius: 12px; padding: 10px 14px; color: #1a202c; font-size: 13.5px; outline: none;
        transition: border-color 0.2s;
      }
      #omniflow-input:focus { border-color: var(--omniflow-color, #1a5276); background: #fff; }
      #omniflow-input::placeholder { color: #9ca3af; }
      #omniflow-send {
        width: 40px; height: 40px; border-radius: 12px; border: none; cursor: pointer;
        display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        color: white; transition: opacity 0.2s; box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      }
      #omniflow-send:hover { opacity: 0.85; }
      #omniflow-footer {
        padding: 6px; text-align: center;
        font-size: 10px; color: #c0c0c0;
        border-top: 1px solid #f5f5f5; background: #fff;
      }
      /* Hide original terrablinds chat */
      div[class*="bottom-28"][class*="right-5"],
      div[class*="bottom-24"][class*="right-5"][class*="w-"] { display: none !important; }
    `;
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ── Build DOM ─────────────────────────────────────────────────────────────
  function buildWidget() {
    var color = config.color || '#1a5276';

    // Set CSS variable for focus color
    document.documentElement.style.setProperty('--omniflow-color', color);

    var wrapper = document.createElement('div');
    wrapper.id = 'omniflow-widget';

    // Button: show logo if available, else chat icon
    var btnInner = config.logo_url
      ? '<img id="omniflow-btn-logo" src="' + config.logo_url + '" alt="Chat" />'
      : '<svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    // Header logo
    var headerLogoInner = config.logo_url
      ? '<img src="' + config.logo_url + '" alt="' + (config.bot_name || 'Asistente') + '" />'
      : (config.bot_name || 'A')[0];

    wrapper.innerHTML = '\
      <button id="omniflow-btn" style="background:' + color + '" aria-label="Abrir chat">\
        ' + btnInner + '\
        <span id="omniflow-badge"></span>\
      </button>\
      <div id="omniflow-panel" role="dialog" aria-label="Chat">\
        <div id="omniflow-header" style="background:' + color + '">\
          <div id="omniflow-header-logo" style="background:' + color + 'cc">' + headerLogoInner + '</div>\
          <div id="omniflow-header-info">\
            <div id="omniflow-header-name">' + (config.bot_name || 'Asistente') + '</div>\
            <div id="omniflow-header-status">En línea — responde al instante</div>\
          </div>\
        </div>\
        <div id="omniflow-messages"></div>\
        <div id="omniflow-input-area">\
          <input id="omniflow-input" type="text" placeholder="Escribe tu consulta..." autocomplete="off" />\
          <button id="omniflow-send" style="background:' + color + '" aria-label="Enviar">\
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2L15 22 11 13 2 9l20-7z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>\
          </button>\
        </div>\
        <div id="omniflow-footer">Powered by OmniFlow · IA</div>\
      </div>\
    ';

    document.body.appendChild(wrapper);

    // Show greeting
    appendMsg('bot', config.greeting || '¡Hola! ¿En qué puedo ayudarte?');

    // Events
    document.getElementById('omniflow-btn').addEventListener('click', togglePanel);
    document.getElementById('omniflow-send').addEventListener('click', sendMessage);
    document.getElementById('omniflow-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
  }

  function togglePanel() {
    isOpen = !isOpen;
    var panel = document.getElementById('omniflow-panel');
    if (isOpen) {
      panel.style.display = 'flex';
      setTimeout(function () { panel.classList.add('open'); }, 10);
      document.getElementById('omniflow-badge').style.display = 'none';
      document.getElementById('omniflow-input').focus();
      if (!pollTimer) startPolling();
    } else {
      panel.classList.remove('open');
      setTimeout(function () { panel.style.display = 'none'; }, 250);
    }
  }

  function appendMsg(type, text) {
    var messages = document.getElementById('omniflow-messages');
    if (!messages) return;
    // Remove typing indicator if present
    var typing = document.getElementById('omniflow-typing');
    if (typing) typing.remove();

    var div = document.createElement('div');
    div.className = 'omniflow-msg ' + type;
    div.textContent = text;
    var color = config.color || '#1a5276';
    if (type === 'user') div.style.background = color;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  function showTyping() {
    var messages = document.getElementById('omniflow-messages');
    if (!messages || document.getElementById('omniflow-typing')) return;
    var div = document.createElement('div');
    div.id = 'omniflow-typing';
    div.className = 'omniflow-typing';
    div.innerHTML = '<span></span><span></span><span></span>';
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  function hideTyping() {
    var typing = document.getElementById('omniflow-typing');
    if (typing) typing.remove();
  }

  function sendMessage() {
    var input = document.getElementById('omniflow-input');
    var text = input.value.trim();
    if (!text || waitingReply) return;
    input.value = '';
    appendMsg('user', text);

    if (config.ai_enabled) {
      waitingReply = true;
      showTyping();
    }

    fetch(BASE_URL + '/api/v1/webchat/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_subdomain: TENANT,
        visitor_id: visitorId,
        visitor_name: 'Visitante Web',
        message: text,
      }),
    }).catch(function (e) {
      hideTyping();
      waitingReply = false;
      console.error('[OmniFlow widget]', e);
    });
  }

  function startPolling() {
    pollTimer = setInterval(function () {
      fetch(BASE_URL + '/api/v1/webchat/messages/' + visitorId + '?tenant_subdomain=' + TENANT)
        .then(function (r) { return r.json(); })
        .then(function (msgs) {
          if (!Array.isArray(msgs)) return;
          var agentMsgs = msgs.filter(function (m) {
            return m.sender_type === 'human' || m.sender_type === 'bot';
          });
          if (agentMsgs.length > lastMsgCount) {
            var newMsgs = agentMsgs.slice(lastMsgCount);
            newMsgs.forEach(function (m) { appendMsg('bot', m.content); });
            lastMsgCount = agentMsgs.length;
            waitingReply = false;
            if (!isOpen) {
              var badge = document.getElementById('omniflow-badge');
              badge.textContent = newMsgs.length;
              badge.style.display = 'flex';
            }
          }
        })
        .catch(function () {});
    }, POLL_INTERVAL);
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  function init() {
    injectStyles();
    buildWidget();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {});
  }
})();
