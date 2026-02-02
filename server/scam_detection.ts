
// Simple regex-based scam intelligence extraction

export type IntelItem = {
  type: 'upi' | 'bank_account' | 'phone' | 'url' | 'crypto';
  value: string;
  context: string;
};

export function analyzeMessageForIntel(content: string): IntelItem[] {
  const intel: IntelItem[] = [];
  
  // UPI ID Regex (Improved: Handles standard VPA formats)
  const upiRegex = /\b[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}\b/g;
  const upiMatches = content.match(upiRegex);
  if (upiMatches) {
    upiMatches.forEach(match => {
      intel.push({ type: 'upi', value: match, context: 'Detected UPI VPA' });
    });
  }

  // Bank Details (Improved: Looking for IFSC codes and Account numbers in context)
  const ifscRegex = /\b[A-Z]{4}0[A-Z0-9]{6}\b/g;
  const ifscMatches = content.match(ifscRegex);
  if (ifscMatches) {
    ifscMatches.forEach(match => {
      intel.push({ type: 'bank_account', value: match, context: 'Detected Bank IFSC Code' });
    });
  }

  const accRegex = /\b\d{9,18}\b/g;
  const accMatches = content.match(accRegex);
  if (accMatches) {
    accMatches.forEach(match => {
      // Look for keywords nearby in content to reduce false positives
      const lowerContent = content.toLowerCase();
      if (lowerContent.includes('account') || lowerContent.includes('acc') || lowerContent.includes('bank') || lowerContent.includes('transfer')) {
        intel.push({ type: 'bank_account', value: match, context: 'Detected potential bank account number' });
      }
    });
  }

  // URL Regex (Improved: Excludes common safe domains if needed, but here we want all)
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urlMatches = content.match(urlRegex);
  if (urlMatches) {
    urlMatches.forEach(match => {
      intel.push({ type: 'url', value: match, context: 'Detected Phishing/Suspicious Link' });
    });
  }

  // Phone Number (Improved: Common international and local formats)
  const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  const phoneMatches = content.match(phoneRegex);
  if (phoneMatches) {
    phoneMatches.forEach(match => {
      intel.push({ type: 'phone', value: match.replace(/[^\d+]/g, ''), context: 'Detected contact phone number' });
    });
  }

  return intel;
}
