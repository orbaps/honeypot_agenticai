
// Simple regex-based scam intelligence extraction

export type IntelItem = {
  type: 'upi' | 'bank_account' | 'phone' | 'url' | 'crypto';
  value: string;
  context: string;
};

export function analyzeMessageForIntel(content: string): IntelItem[] {
  const intel: IntelItem[] = [];
  
  // UPI ID Regex (generic)
  const upiRegex = /[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}/g;
  const upiMatches = content.match(upiRegex);
  if (upiMatches) {
    upiMatches.forEach(match => {
      intel.push({ type: 'upi', value: match, context: 'Detected UPI ID in message' });
    });
  }

  // URL Regex
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urlMatches = content.match(urlRegex);
  if (urlMatches) {
    urlMatches.forEach(match => {
      intel.push({ type: 'url', value: match, context: 'Detected Phishing/Suspicious Link' });
    });
  }

  // Phone Number (Generic 10 digit)
  const phoneRegex = /\b\d{10}\b/g;
  const phoneMatches = content.match(phoneRegex);
  if (phoneMatches) {
    phoneMatches.forEach(match => {
        // Basic filter to avoid simple numbers like timestamps if needed
      intel.push({ type: 'phone', value: match, context: 'Detected potential phone number' });
    });
  }

  // Crypto Wallet (Basic check for long alphanumeric strings often found in scam scripts)
  // This is very loose, just for demo purposes
  const cryptoRegex = /\b(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,39}\b/g; // Bitcoin
  const cryptoMatches = content.match(cryptoRegex);
  if (cryptoMatches) {
    cryptoMatches.forEach(match => {
        intel.push({ type: 'crypto', value: match, context: 'Detected potential Bitcoin wallet' });
    });
  }

  return intel;
}
