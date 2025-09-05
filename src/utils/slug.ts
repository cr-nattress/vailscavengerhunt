/**
 * Convert a string to a URL-friendly slug
 * Lowercases, strips diacritics, and hyphenizes
 */
export function slugify(text: string): string {
  return text
    .toString()
    .normalize('NFD')                   // Split accented characters into base + diacritic
    .replace(/[\u0300-\u036f]/g, '')    // Remove diacritics
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')                // Replace spaces with -
    .replace(/[^\w\-]+/g, '')            // Remove all non-word chars
    .replace(/\-\-+/g, '-')              // Replace multiple - with single -
    .replace(/^-+/, '')                  // Trim - from start
    .replace(/-+$/, '')                  // Trim - from end
}