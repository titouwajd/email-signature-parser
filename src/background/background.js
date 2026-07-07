import { parseSignature } from '../parser/signatureParser.js';
import { addContacts, canParse, incrementQuota, remainingParses, getContacts, deleteContact } from '../utils/storage.js';

/**
 * Listen for messages from content script and popup.
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'PARSE_SIGNATURE':
      handleParseSignature(message.payload).then(sendResponse);
      return true; // async

    case 'GET_CONTACTS':
      handleGetContacts().then(sendResponse);
      return true;

    case 'DELETE_CONTACT':
      handleDeleteContact(message.payload.email).then(sendResponse);
      return true;

    case 'GET_QUOTA':
      remainingParses().then(sendResponse);
      return true;

    default:
      sendResponse({ error: 'Unknown message type' });
      return false;
  }
});

async function handleParseSignature({ emailBody, senderEmail, senderName, sourceUrl }) {
  const allowed = await canParse();
  if (!allowed) {
    return { success: false, error: 'QUOTA_EXCEEDED', remaining: 0 };
  }

  const contact = parseSignature(emailBody, senderEmail, senderName);
  if (!contact) {
    return { success: false, error: 'NO_SIGNATURE_FOUND' };
  }

  contact.source = sourceUrl;
  await addContacts([contact]);
  await incrementQuota();

  const remaining = await remainingParses();
  return { success: true, contact, remaining };
}

async function handleGetContacts() {
  const contacts = await getContacts();
  const remaining = await remainingParses();
  return { contacts, remaining };
}

async function handleDeleteContact(email) {
  await deleteContact(email);
  return { success: true };
}
