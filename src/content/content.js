(function () {
  'use strict';

  const PLATFORM = detectPlatform();

  function detectPlatform() {
    const host = location.hostname;
    if (host.includes('mail.google.com')) return 'gmail';
    if (host.includes('outlook')) return 'outlook';
    return 'unknown';
  }

  // --- SELECTEURS ---
  const SELECTORS = {
    gmail: {
      emailContainer: '.a3s.aiL',        // corps d'email dans la vue lecture
      senderName: '.gD',                  // nom expéditeur
      senderEmail: '.go',                 // email expéditeur (attribut email)
      // Fallback : chercher les divs de corps d'email
      bodyFallback: 'div[data-message-id] .a3s.aiL'
    },
    outlook: {
      emailContainer: '[data-testid="message-body"]',
      senderName: '[data-testid="message-header"] .ms-font-weight-semibold',
      senderEmail: '[data-testid="message-header"] span[title]',
      bodyFallback: '.allowTextSelection'
    }
  };

  let lastProcessedEmailId = null;
  let parseButton = null;

  // --- BOUTON "PARSE" INJECTÉ ---
  function createParseButton() {
    if (parseButton) return;

    parseButton = document.createElement('button');
    parseButton.textContent = '📋 Extraire le contact';
    parseButton.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 99999;
      padding: 10px 16px;
      background: #4F46E5;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-family: sans-serif;
      box-shadow: 0 4px 12px rgba(0,0,0,0.25);
      transition: transform 0.15s, box-shadow 0.15s;
    `;
    parseButton.addEventListener('mouseenter', () => {
      parseButton.style.transform = 'scale(1.05)';
      parseButton.style.boxShadow = '0 6px 16px rgba(0,0,0,0.35)';
    });
    parseButton.addEventListener('mouseleave', () => {
      parseButton.style.transform = 'scale(1)';
      parseButton.style.boxShadow = '0 4px 12px rgba(0,0,0,0.25)';
    });
    parseButton.addEventListener('click', triggerParse);
    document.body.appendChild(parseButton);
  }

  function showParseButton() {
    if (!parseButton) createParseButton();
    parseButton.style.display = 'block';
  }

  function hideParseButton() {
    if (parseButton) parseButton.style.display = 'none';
  }

  // --- EXTRACTION ---
  function extractEmailInfo() {
    const sel = SELECTORS[PLATFORM];
    if (!sel) return null;

    let bodyText = '';
    let senderName = '';
    let senderEmail = '';

    // Récupération du corps
    if (PLATFORM === 'gmail') {
      const containers = document.querySelectorAll(sel.emailContainer);
      for (const el of containers) {
        if (el.textContent.trim().length > 50) {
          bodyText = el.textContent;
          break;
        }
      }

      const nameEl = document.querySelector(sel.senderName);
      if (nameEl) senderName = nameEl.textContent.trim();

      const emailEl = document.querySelector(sel.senderEmail);
      if (emailEl) {
        senderEmail = emailEl.getAttribute('email') || emailEl.textContent.trim();
      }
    }

    if (PLATFORM === 'outlook') {
      const body = document.querySelector(sel.emailContainer);
      if (body) bodyText = body.textContent;

      const nameEl = document.querySelector(sel.senderName);
      if (nameEl) senderName = nameEl.textContent.trim();

      const emailEls = document.querySelectorAll(sel.senderEmail);
      for (const el of emailEls) {
        const txt = el.getAttribute('title') || el.textContent;
        if (txt && txt.includes('@')) {
          senderEmail = txt.trim();
          break;
        }
      }
    }

    if (!bodyText || bodyText.length < 20) return null;

    return { emailBody: bodyText, senderEmail, senderName, sourceUrl: location.href };
  }

  function buildEmailId() {
    // Génère un ID unique basé sur le sujet + expéditeur pour éviter les doublons
    if (PLATFORM === 'gmail') {
      const subject = document.querySelector('h2[data-thread-perm-id]')?.textContent || '';
      const sender = document.querySelector('.gD')?.textContent || '';
      return `${sender}|${subject}`.trim();
    }
    return location.href;
  }

  // --- PARSING ---
  async function triggerParse() {
    const info = extractEmailInfo();
    if (!info) {
      showToast('❌ Impossible de trouver le contenu de l\'email', 'error');
      return;
    }

    const currentId = buildEmailId();
    if (currentId === lastProcessedEmailId) {
      showToast('⚠️ Cet email a déjà été traité', 'warning');
      return;
    }

    parseButton.textContent = '⏳ Extraction en cours...';
    parseButton.disabled = true;

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'PARSE_SIGNATURE',
        payload: info
      });

      if (response.success) {
        lastProcessedEmailId = currentId;
        const contact = response.contact;
        const preview = [
          contact.name && `👤 ${contact.name}`,
          contact.email && `✉️ ${contact.email}`,
          contact.company && `🏢 ${contact.company}`
        ].filter(Boolean).join(' | ');
        showToast(`✅ Contact extrait : ${preview || 'OK'}`, 'success');
      } else if (response.error === 'QUOTA_EXCEEDED') {
        showToast('🔒 Limite mensuelle atteinte (10/mois). Passez Premium !', 'warning');
      } else {
        showToast('ℹ️ Aucune signature détectée dans cet email', 'info');
      }
    } catch (err) {
      showToast('❌ Erreur lors de l\'extraction', 'error');
      console.error('Parse error:', err);
    }

    parseButton.textContent = '📋 Extraire le contact';
    parseButton.disabled = false;
  }

  // --- TOAST NOTIFICATION ---
  function showToast(message, type = 'info') {
    const existing = document.querySelector('.esp-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'esp-toast';
    toast.textContent = message;
    const bgColor = {
      success: '#059669',
      error: '#DC2626',
      warning: '#D97706',
      info: '#4F46E5'
    }[type] || '#4F46E5';
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 999999;
      padding: 12px 20px;
      background: ${bgColor};
      color: white;
      border-radius: 8px;
      font-size: 14px;
      font-family: sans-serif;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      animation: espSlideIn 0.3s ease;
      max-width: 420px;
    `;

    const style = document.createElement('style');
    style.textContent = '@keyframes espSlideIn { from { transform:translateX(100%);opacity:0; } to { transform:translateX(0);opacity:1; } }';
    document.head.appendChild(style);

    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }

  // --- DETECTION D'EMAIL OUVERT ---
  function isEmailOpen() {
    if (PLATFORM === 'gmail') {
      // Gmail : l'URL contient un hash avec un message ID
      return /#[a-z]+/.test(location.hash) || document.querySelector('.a3s.aiL');
    }
    if (PLATFORM === 'outlook') {
      return !!document.querySelector('[data-testid="message-body"]') ||
             (location.pathname.includes('/message/') || location.pathname.includes('/inbox/id/'));
    }
    return false;
  }

  function checkEmailState() {
    if (isEmailOpen()) {
      showParseButton();
    } else {
      hideParseButton();
      lastProcessedEmailId = null;
    }
  }

  // --- INIT ---
  createParseButton();
  hideParseButton();

  // Surveille les changements dans le DOM
  const observer = new MutationObserver(() => {
    checkEmailState();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Surveille aussi les changements d'URL (navigation SPA)
  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(checkEmailState, 500);
    }
  }).observe(document, { subtree: true, childList: true });

  // Vérifie au chargement
  setTimeout(checkEmailState, 1500);

})();
