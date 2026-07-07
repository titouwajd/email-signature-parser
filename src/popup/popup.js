// ⚠️ Remplace cette URL par ton lien de paiement Stripe
const STRIPE_PAYMENT_LINK = 'https://buy.stripe.com/your-checkout-link';

const contactList = document.getElementById('contact-list');
const emptyState = document.getElementById('empty-state');
const quotaBadge = document.getElementById('quota-badge');
const exportCsvBtn = document.getElementById('export-csv');
const clearAllBtn = document.getElementById('clear-all');
const premiumCta = document.getElementById('premium-cta');
const upgradeBtn = document.getElementById('upgrade-btn');

document.addEventListener('DOMContentLoaded', init);

async function init() {
  await loadContacts();

  // Vérifie si l'utilisateur revient d'un paiement Stripe (paramètre ?session_id=...)
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('session_id');
  if (sessionId) {
    upgradeBtn.textContent = '⏳ Vérification du paiement...';
    upgradeBtn.disabled = true;
    // TODO: Vérifier le paiement via un webhook ou une API
    // Pour l'instant, active manuellement via chrome.storage.local
    setTimeout(() => {
      upgradeBtn.textContent = '✅ Paiement reçu ! Redémarrez l\'extension.';
    }, 2000);
  }
}

exportCsvBtn.addEventListener('click', exportCSV);
clearAllBtn.addEventListener('click', clearAll);
upgradeBtn.addEventListener('click', () => {
  window.open(STRIPE_PAYMENT_LINK, '_blank');
});

async function loadContacts() {
  const response = await chrome.runtime.sendMessage({ type: 'GET_CONTACTS' });
  const contacts = response.contacts || [];
  const remaining = response.remaining;

  renderContacts(contacts);
  renderQuota(remaining);
  renderPremiumCta(remaining);
}

function renderContacts(contacts) {
  contactList.innerHTML = '';

  if (!contacts.length) {
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';

  for (const c of contacts) {
    const card = document.createElement('li');
    card.className = 'contact-card';
    card.innerHTML = `
      <button class="delete-btn" data-email="${escapeAttr(c.email)}" title="Supprimer">×</button>
      ${c.name ? `<div class="name">${escapeHtml(c.name)}</div>` : ''}
      ${c.jobTitle ? `<div class="detail">💼 ${escapeHtml(c.jobTitle)}</div>` : ''}
      ${c.email ? `<div class="detail">✉️ <a href="mailto:${escapeAttr(c.email)}">${escapeHtml(c.email)}</a></div>` : ''}
      ${c.phone ? `<div class="detail">📞 ${escapeHtml(c.phone)}</div>` : ''}
      ${c.website ? `<div class="detail">🌐 <a href="${escapeAttr(c.website)}" target="_blank">${escapeHtml(c.website)}</a></div>` : ''}
      ${c.company ? `<span class="company">🏢 ${escapeHtml(c.company)}</span>` : ''}
    `;
    contactList.appendChild(card);
  }

  // Attache les handlers de suppression
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const email = btn.dataset.email;
      await chrome.runtime.sendMessage({ type: 'DELETE_CONTACT', payload: { email } });
      loadContacts();
    });
  });
}

function renderQuota(remaining) {
  if (remaining === Infinity) {
    quotaBadge.textContent = '✨ Premium';
  } else {
    quotaBadge.textContent = `${remaining}/10 restants`;
    if (remaining <= 2) {
      quotaBadge.style.background = 'rgba(255,255,255,0.35)';
    }
  }
}

function renderPremiumCta(remaining) {
  if (remaining === Infinity) {
    premiumCta.style.display = 'none';
    exportCsvBtn.style.display = '';
  } else if (remaining <= 3) {
    premiumCta.style.display = 'block';
  } else {
    premiumCta.style.display = 'none';
  }
}

async function clearAll() {
  if (!confirm('Supprimer tous les contacts extraits ?')) return;
  const response = await chrome.runtime.sendMessage({ type: 'GET_CONTACTS' });
  const contacts = response.contacts || [];
  for (const c of contacts) {
    await chrome.runtime.sendMessage({ type: 'DELETE_CONTACT', payload: { email: c.email } });
  }
  loadContacts();
}

function exportCSV() {
  chrome.runtime.sendMessage({ type: 'GET_CONTACTS' }).then(response => {
    const contacts = response.contacts || [];
    if (!contacts.length) {
      alert('Aucun contact à exporter.');
      return;
    }

    const headers = ['Nom', 'Email', 'Téléphone', 'Poste', 'Entreprise', 'Site web', 'Date extraction'];
    const rows = contacts.map(c => [
      c.name || '',
      c.email || '',
      c.phone || '',
      c.jobTitle || '',
      c.company || '',
      c.website || '',
      c.extractedAt || ''
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `contacts_signatures_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str) {
  return String(str).replace(/"/g, '&quot;');
}
