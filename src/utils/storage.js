const STORAGE_KEY_CONTACTS = 'esp_contacts';
const STORAGE_KEY_QUOTA = 'esp_quota';
const STORAGE_KEY_PREMIUM = 'esp_premium';
const FREE_LIMIT = 10;

/**
 * Récupère tous les contacts sauvegardés.
 */
export async function getContacts() {
  const result = await chrome.storage.local.get(STORAGE_KEY_CONTACTS);
  return result[STORAGE_KEY_CONTACTS] || [];
}

/**
 * Ajoute des contacts (fusionne par email pour éviter les doublons).
 */
export async function addContacts(newContacts) {
  const existing = await getContacts();
  const existingEmails = new Set(existing.map(c => c.email.toLowerCase()).filter(Boolean));

  const merged = [...existing];
  for (const contact of newContacts) {
    if (!contact.email || !existingEmails.has(contact.email.toLowerCase())) {
      merged.unshift(contact);
      if (contact.email) existingEmails.add(contact.email.toLowerCase());
    } else {
      // Met à jour le contact existant avec les nouvelles infos
      const idx = merged.findIndex(c => c.email.toLowerCase() === contact.email.toLowerCase());
      if (idx >= 0) {
        merged[idx] = { ...merged[idx], ...contact, extractedAt: new Date().toISOString() };
      }
    }
  }

  await chrome.storage.local.set({ [STORAGE_KEY_CONTACTS]: merged });
  return merged;
}

/**
 * Supprime un contact par son email.
 */
export async function deleteContact(email) {
  const contacts = await getContacts();
  const filtered = contacts.filter(c => c.email !== email);
  await chrome.storage.local.set({ [STORAGE_KEY_CONTACTS]: filtered });
}

/**
 * Récupère le quota mensuel utilisé.
 */
export async function getQuota() {
  const result = await chrome.storage.local.get(STORAGE_KEY_QUOTA);
  const quota = result[STORAGE_KEY_QUOTA] || { count: 0, resetAt: null };
  const now = new Date();

  // Reset si le mois a changé
  if (quota.resetAt) {
    const resetDate = new Date(quota.resetAt);
    if (now.getMonth() !== resetDate.getMonth() || now.getFullYear() !== resetDate.getFullYear()) {
      return { count: 0, resetAt: getNextResetDate().toISOString() };
    }
  }

  if (!quota.resetAt) {
    quota.resetAt = getNextResetDate().toISOString();
  }

  return quota;
}

/**
 * Incrémente le compteur de quota.
 */
export async function incrementQuota() {
  const quota = await getQuota();
  quota.count += 1;
  await chrome.storage.local.set({ [STORAGE_KEY_QUOTA]: quota });
  return quota;
}

/**
 * Vérifie si l'utilisateur peut encore parser (freemium).
 */
export async function canParse() {
  const isPremium = await isPremiumUser();
  if (isPremium) return true;
  const quota = await getQuota();
  return quota.count < FREE_LIMIT;
}

/**
 * Nombre de parsings restants.
 */
export async function remainingParses() {
  const isPremium = await isPremiumUser();
  if (isPremium) return Infinity;
  const quota = await getQuota();
  return Math.max(0, FREE_LIMIT - quota.count);
}

export async function isPremiumUser() {
  const result = await chrome.storage.local.get(STORAGE_KEY_PREMIUM);
  return !!result[STORAGE_KEY_PREMIUM];
}

export async function setPremiumUser(premium) {
  await chrome.storage.local.set({ [STORAGE_KEY_PREMIUM]: premium });
}

function getNextResetDate() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}
