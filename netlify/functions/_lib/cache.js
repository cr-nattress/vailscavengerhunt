/**
 * Simple in-memory cache with TTL for Netlify functions
 * Reduces database queries for rarely-changing data
 */

class CacheEntry {
  constructor(value, ttl) {
    this.value = value
    this.expiresAt = Date.now() + (ttl * 1000) // TTL in seconds
  }

  isExpired() {
    return Date.now() > this.expiresAt
  }
}

class SimpleCache {
  constructor() {
    this.cache = new Map()
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0
    }
  }

  /**
   * Get value from cache if not expired
   *
   * @param {string} key - Cache key
   * @returns {any|null} Cached value or null if expired/missing
   */
  get(key) {
    const entry = this.cache.get(key)

    if (!entry) {
      this.stats.misses++
      return null
    }

    if (entry.isExpired()) {
      this.cache.delete(key)
      this.stats.evictions++
      this.stats.misses++
      return null
    }

    this.stats.hits++
    return entry.value
  }

  /**
   * Set value in cache with TTL
   *
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds
   */
  set(key, value, ttl) {
    this.cache.set(key, new CacheEntry(value, ttl))
    this.stats.sets++
  }

  /**
   * Check if key exists and is not expired
   *
   * @param {string} key - Cache key
   * @returns {boolean} True if key exists and not expired
   */
  has(key) {
    const entry = this.cache.get(key)
    if (!entry) return false
    if (entry.isExpired()) {
      this.cache.delete(key)
      this.stats.evictions++
      return false
    }
    return true
  }

  /**
   * Delete key from cache
   *
   * @param {string} key - Cache key
   * @returns {boolean} True if key was deleted
   */
  delete(key) {
    return this.cache.delete(key)
  }

  /**
   * Clear all cache entries
   */
  clear() {
    const size = this.cache.size
    this.cache.clear()
    this.stats.evictions += size
  }

  /**
   * Get cache statistics
   *
   * @returns {object} Cache stats
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0

    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: hitRate.toFixed(2) + '%'
    }
  }

  /**
   * Clean up expired entries
   * Call periodically to prevent memory leaks
   *
   * @returns {number} Number of entries removed
   */
  cleanup() {
    let removed = 0

    for (const [key, entry] of this.cache.entries()) {
      if (entry.isExpired()) {
        this.cache.delete(key)
        removed++
      }
    }

    this.stats.evictions += removed
    return removed
  }

  /**
   * Get all keys (including expired ones)
   *
   * @returns {string[]} Array of cache keys
   */
  keys() {
    return Array.from(this.cache.keys())
  }

  /**
   * Get cache size
   *
   * @returns {number} Number of entries in cache
   */
  size() {
    return this.cache.size
  }
}

// Singleton instance
const cache = new SimpleCache()

// Cleanup expired entries every 60 seconds
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const removed = cache.cleanup()
    if (removed > 0) {
      console.log(`[Cache] Cleaned up ${removed} expired entries`)
    }
  }, 60000)
}

/**
 * Wrapper function for caching async operations
 * Automatically handles cache get/set with TTL
 *
 * @param {string} key - Cache key
 * @param {number} ttl - Time to live in seconds
 * @param {Function} fn - Async function to execute on cache miss
 *
 * @example
 * const locations = await withCache(
 *   `locations:${orgId}:${huntId}`,
 *   300,
 *   () => getHuntLocations(supabase, orgId, huntId)
 * )
 */
 async function withCache(key, ttl, fn) {
   // Check cache first
   const cached = cache.get(key)
   if (cached !== null) {
     return cached
   }

   // Cache miss - execute function
   const value = await fn()

   // Store in cache
   cache.set(key, value, ttl)

   return value
 }

/**
 * Invalidate cache entries matching a pattern
 *
 * @param {string|RegExp} pattern - Pattern to match keys
 * @returns {number} Number of keys invalidated
 *
 * @example
 * // Invalidate all location caches
 * invalidatePattern(/^locations:/)
 *
 * // Invalidate specific org/hunt
 * invalidatePattern(`locations:${orgId}:${huntId}`)
 */
 function invalidatePattern(pattern) {
   const regex = typeof pattern === 'string'
     ? new RegExp(`^${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)
     : pattern

   let count = 0

   for (const key of cache.keys()) {
     if (regex.test(key)) {
       cache.delete(key)
       count++
     }
   }

   return count
 }

/**
 * Get cache statistics
 *
  * @returns {object} Cache statistics
  */
 function getCacheStats() {
  return cache.getStats()
}

/**
  * Clear all cache entries
  */
 function clearCache() {
  cache.clear()
}

/**
 * Cache key builders for common patterns
  */
 const CacheKeys = {
  locations: (orgId, huntId) => `locations:${orgId}:${huntId}`,
  sponsors: (orgId, huntId) => `sponsors:${orgId}:${huntId}`,
  settings: (orgId, teamId, huntId) => `settings:${orgId}:${teamId}:${huntId}`,
  team: (orgId, teamId) => `team:${orgId}:${teamId}`,
  progress: (teamId) => `progress:${teamId}`,
  config: () => 'config:public'
}

 // CommonJS exports
 module.exports = {
   withCache,
   invalidatePattern,
   getCacheStats,
   clearCache,
   CacheKeys,
   cache
 }
