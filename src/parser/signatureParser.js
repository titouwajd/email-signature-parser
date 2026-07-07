/**
 * Heuristiques d'extraction de contacts depuis une signature d'email.
 * Priorité : regex structurées > patterns FR/EN > fallback ligne par ligne.
 */

// Patterns de début de signature (insensibles à la casse)
const SIGNATURE_START_PATTERNS = [
  /^--\s*$/m,
  /^(?:cordially|sincerely|regards|best|cheers|thanks|thank you|merci|bien cordialement|cordialement|bien à vous|salutations|sent from my|envoyé depuis)/im,
  /^(?:-- |__|==)/m
];

const PHONE_REGEX = /(?:(?:\+|00)\d{1,3}[-\s.]?)?(?:\(?\d{1,4}\)?[-\s.]?){2,4}\d{1,4}/g;
const EMAIL_REGEX = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
const URL_REGEX = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/g;

// Patterns poste/entreprise
const JOB_PATTERNS_FR = [
  /(?:CEO|CTO|CFO|COO|PDG|DG|directeur|directrice|responsable|manager|chef|head of|VP|vice president|lead|senior|junior|consultant|ingénieur|developer|développeur|architect|designer|product owner|scrum master|analyst|spécialiste|chargé|assistant|coordonnateur)\b[^,;\n]*/gi
];

const COMPANY_PATTERNS = [
  /\b(?:SARL|SAS|SA|EURL|LTD|LLC|Inc|Corp|GmbH|BV|NV|SL|SRL)\b/i,
  /^(?:[A-Z][a-zà-ÿ]+(?:\s[A-Z][a-zà-ÿ]+){0,3})$/m
];

/**
 * Trouve le bloc de signature dans le texte d'un email.
 */
export function findSignatureBlock(emailBody) {
  for (const pattern of SIGNATURE_START_PATTERNS) {
    const match = emailBody.match(pattern);
    if (match) {
      const index = match.index;
      const afterSig = emailBody.slice(index + match[0].length).trim();
      if (afterSig.length > 10) return afterSig;
    }
  }

  const separator = emailBody.lastIndexOf('--');
  if (separator > 0) {
    const after = emailBody.slice(separator + 2).trim();
    if (after.length > 10) return after;
  }

  const lines = emailBody.split('\n');
  const lastLines = lines.slice(-12);
  return lastLines.join('\n').trim();
}

/**
 * Nettoie le texte de la signature.
 */
function cleanSignature(sig) {
  return sig
    .replace(/<[^>]*>/g, ' ')        // strip HTML
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .replace(/\|/g, ' ')
    .trim();
}

/**
 * Extrait les emails (exclut celui de l'expéditeur).
 */
function extractEmails(text, senderEmail = null) {
  const matches = [...text.matchAll(EMAIL_REGEX)];
  const emails = matches.map(m => m[0].toLowerCase());
  const unique = [...new Set(emails)];
  return senderEmail ? unique.filter(e => e !== senderEmail.toLowerCase()) : unique;
}

/**
 * Extrait les numéros de téléphone.
 */
function extractPhones(text) {
  const matches = [...text.matchAll(PHONE_REGEX)];
  return [...new Set(matches.map(m => m[0].trim()))];
}

/**
 * Extrait les URLs/sites web.
 */
function extractWebsites(text) {
  const matches = [...text.matchAll(URL_REGEX)];
  const urls = matches.map(m => {
    const raw = m[0];
    return raw.startsWith('http') ? raw : `https://${raw}`;
  });
  return [...new Set(urls)].filter(u => {
    try { new URL(u); return true; } catch { return false; }
  });
}

/**
 * Extrait le nom complet depuis une signature.
 */
function extractName(sigText, senderName = null) {
  if (senderName) return senderName;

  const lines = sigText.split('\n').map(l => l.trim()).filter(Boolean);
  for (const line of lines.slice(0, 3)) {
    const nameMatch = line.match(/^([A-Z][a-zà-ÿ]+(?:\s[A-Z][a-zà-ÿ]+){1,3})$/);
    if (nameMatch && !EMAIL_REGEX.test(nameMatch[1]) && !PHONE_REGEX.test(nameMatch[1])) {
      return nameMatch[1];
    }
  }
  return null;
}

/**
 * Détecte le poste/role.
 */
function extractJobTitle(text) {
  for (const pattern of JOB_PATTERNS_FR) {
    const match = text.match(pattern);
    if (match) return match[0].trim();
  }

  // Fallback : cherche une ligne courte sans email/tel/url
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (line.length < 60 && line.length > 4 &&
        !EMAIL_REGEX.test(line) && !PHONE_REGEX.test(line) &&
        !line.match(/^(?:https?:\/\/|www\.)/i) &&
        !line.match(/^\d/)) {
      return line;
    }
  }
  return null;
}

/**
 * Détecte le nom de l'entreprise.
 */
function extractCompany(text) {
  for (const pattern of COMPANY_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const idx = match.index;
      const before = text.slice(Math.max(0, idx - 40), idx + match[0].length);
      const companyMatch = before.match(/([A-Z][a-zà-ÿ]+(?:\s[A-Za-zà-ÿ]+){0,3})\s*(?:SARL|SAS|SA|LTD|LLC|Inc)/i);
      if (companyMatch) return companyMatch[1].trim();
    }
  }

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (COMPANY_PATTERNS[1].test(line) && line.length > 3 && line.length < 50) {
      return line;
    }
  }
  return null;
}

/**
 * Parse une signature d'email et retourne un objet contact structuré.
 */
export function parseSignature(emailBody, senderEmail = null, senderName = null) {
  const sigBlock = findSignatureBlock(emailBody);
  if (!sigBlock) return null;

  const cleaned = cleanSignature(sigBlock);

  const emails = extractEmails(cleaned, senderEmail);
  const phones = extractPhones(cleaned);
  const websites = extractWebsites(cleaned);
  const name = extractName(cleaned, senderName);
  const jobTitle = extractJobTitle(cleaned);
  const company = extractCompany(cleaned);

  if (!emails.length && !phones.length && !name) {
    // Trop peu d'infos exploitables
    return null;
  }

  return {
    name: name || '',
    email: emails[0] || senderEmail || '',
    phone: phones[0] || '',
    jobTitle: jobTitle || '',
    company: company || '',
    website: websites[0] || '',
    allEmails: emails,
    allPhones: phones,
    rawSignature: cleaned.substring(0, 300),
    extractedAt: new Date().toISOString()
  };
}
