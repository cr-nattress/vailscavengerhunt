import { describe, it, expect } from 'vitest'
import { slugify } from './slug'

describe('slugify', () => {
  it('should convert basic strings to lowercase slugs', () => {
    expect(slugify('Hello World')).toBe('hello-world')
    expect(slugify('JavaScript')).toBe('javascript')
    expect(slugify('UPPERCASE')).toBe('uppercase')
  })

  it('should handle spaces correctly', () => {
    expect(slugify('multiple   spaces   here')).toBe('multiple-spaces-here')
    expect(slugify(' leading and trailing spaces ')).toBe('leading-and-trailing-spaces')
    expect(slugify('single space')).toBe('single-space')
  })

  it('should remove diacritics and accented characters', () => {
    expect(slugify('Café')).toBe('cafe')
    expect(slugify('naïve')).toBe('naive')
    expect(slugify('résumé')).toBe('resume')
    expect(slugify('São Paulo')).toBe('sao-paulo')
    expect(slugify('Zürich')).toBe('zurich')
    // Cyrillic characters get removed by the regex as non-word chars
    expect(slugify('Москва')).toBe('')
  })

  it('should remove special characters but preserve alphanumeric and hyphens', () => {
    expect(slugify('hello-world')).toBe('hello-world')
    expect(slugify('test@example.com')).toBe('testexamplecom')
    expect(slugify('price: $19.99')).toBe('price-1999')
    expect(slugify('50% off!')).toBe('50-off')
    expect(slugify('C++ Programming')).toBe('c-programming')
  })

  it('should handle multiple consecutive hyphens', () => {
    expect(slugify('hello---world')).toBe('hello-world')
    expect(slugify('a--b--c')).toBe('a-b-c')
    expect(slugify('test----case')).toBe('test-case')
  })

  it('should trim leading and trailing hyphens', () => {
    expect(slugify('-leading-hyphen')).toBe('leading-hyphen')
    expect(slugify('trailing-hyphen-')).toBe('trailing-hyphen')
    expect(slugify('---multiple-leading')).toBe('multiple-leading')
    expect(slugify('multiple-trailing---')).toBe('multiple-trailing')
    expect(slugify('---both---')).toBe('both')
  })

  it('should handle edge cases', () => {
    expect(slugify('')).toBe('')
    expect(slugify('   ')).toBe('')
    expect(slugify('123')).toBe('123')
    expect(slugify('123-456')).toBe('123-456')
    expect(slugify('!@#$%^&*()')).toBe('')
    expect(slugify('---')).toBe('')
  })

  it('should handle numbers and alphanumeric combinations', () => {
    expect(slugify('Version 2.0')).toBe('version-20')
    expect(slugify('User123')).toBe('user123')
    expect(slugify('Test Case #1')).toBe('test-case-1')
    expect(slugify('Item-42')).toBe('item-42')
  })

  it('should handle real-world examples', () => {
    expect(slugify('Clock Tower')).toBe('clock-tower')
    expect(slugify('BHHS Vail Valley Office')).toBe('bhhs-vail-valley-office')
    expect(slugify('Premium Mountain Property')).toBe('premium-mountain-property')
    expect(slugify('Gore Creek Waterfront')).toBe('gore-creek-waterfront')
    expect(slugify('Community Heart')).toBe('community-heart')
  })

  it('should handle very long strings', () => {
    const longString = 'This is a very long string that contains many words and should be properly converted to a slug format'
    const expected = 'this-is-a-very-long-string-that-contains-many-words-and-should-be-properly-converted-to-a-slug-format'
    expect(slugify(longString)).toBe(expected)
  })

  it('should handle unicode characters consistently', () => {
    // Non-Latin characters get removed by the \w regex
    expect(slugify('北京')).toBe('') // Chinese characters get removed
    expect(slugify('東京タワー')).toBe('') // Japanese characters get removed
    expect(slugify('العربية')).toBe('') // Arabic characters get removed
  })
})