/**
 * Shared utility for generating unique, intuitive codes for curriculum units.
 * Domain (A), Field (B), and Course (C) IDs are now strictly 3 characters (no prefix).
 */
export const generateIntuitiveCode = (title: string, prefix: 'A' | 'B' | 'C', existing: string[]) => {
  const clean = title.replace(/[^a-zA-Z0-9\s]/g, '');
  const words = clean.trim().split(/\s+/).filter(w => w.length > 0);
  let base = "";
  
  if (words.length >= 3) {
    base = (words[0][0] + words[1][0] + words[2][0]).toUpperCase();
  } else if (words.length === 2) {
    base = (words[0][0] + words[1].slice(0, 2)).toUpperCase();
  } else if (words.length === 1) {
    base = words[0].slice(0, 3).toUpperCase();
  } else {
    base = "NEW";
  }
  
  base = base.padEnd(3, 'X').slice(0, 3);
  
  // All levels (A, B, C) now use prefix-free 3-character codes
  let candidate = base;
  let counter = 1;
  
  while (existing.includes(candidate)) {
    const suffix = counter.toString();
    const tempBase = base.slice(0, 3 - suffix.length) + suffix;
    candidate = tempBase;
    counter++;
  }
  return candidate;
};
