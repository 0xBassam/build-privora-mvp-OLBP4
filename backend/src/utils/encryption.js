const CryptoJS = require('crypto-js');
const config = require('../config/config');

const ENCRYPTION_KEY = config.encryption.key;

/**
 * Encrypt a string value (for PII fields).
 */
const encrypt = (text) => {
  if (!text) {return text;}
  return CryptoJS.AES.encrypt(String(text), ENCRYPTION_KEY).toString();
};

/**
 * Decrypt an encrypted string value.
 */
const decrypt = (cipherText) => {
  if (!cipherText) {return cipherText;}
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, ENCRYPTION_KEY);
    const result = bytes.toString(CryptoJS.enc.Utf8);
    return result || null; // CryptoJS returns '' on bad input
  } catch {
    return null;
  }
};

module.exports = { encrypt, decrypt };
