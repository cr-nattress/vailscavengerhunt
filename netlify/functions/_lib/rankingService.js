/**
 * RankingService - Business logic for team rankings
 * 
 * Handles all ranking calculations and time-based sorting.
 * Keeps complex business logic out of components and endpoints.
 * 
 * Ranking Rules:
 * 1. Teams with more completed stops rank higher
 * 2. Teams with same completions are ranked by fastest total time
 * 3. First team to complete ALL stops is the overall winner
 * 4. Total time = time from first completion to last completion
 */

/**
 * Calculate total completion time for a team
 * @param {Array} completedStops - Array of stop objects with completed_at timestamps
 * @returns {Object} { totalTimeMs, firstCompletedAt, lastCompletedAt }
 */
function calculateTotalTime(completedStops) {
  if (!completedStops || completedStops.length === 0) {
    return {
      totalTimeMs: null,
      firstCompletedAt: null,
      lastCompletedAt: null
    }
  }

  // Sort by completion time
  const sorted = completedStops
    .filter(stop => stop.completed_at)
    .sort((a, b) => new Date(a.completed_at) - new Date(b.completed_at))

  if (sorted.length === 0) {
    return {
      totalTimeMs: null,
      firstCompletedAt: null,
      lastCompletedAt: null
    }
  }

  const firstCompletedAt = sorted[0].completed_at
  const lastCompletedAt = sorted[sorted.length - 1].completed_at

  // Calculate total time in milliseconds
  const totalTimeMs = new Date(lastCompletedAt) - new Date(firstCompletedAt)

  return {
    totalTimeMs,
    firstCompletedAt,
    lastCompletedAt
  }
}

/**
 * Calculate average time per stop
 * @param {number} totalTimeMs - Total time in milliseconds
 * @param {number} completedCount - Number of completed stops
 * @returns {number|null} Average time per stop in milliseconds
 */
function calculateAverageTime(totalTimeMs, completedCount) {
  if (!totalTimeMs || !completedCount || completedCount === 0) {
    return null
  }
  return Math.round(totalTimeMs / completedCount)
}

/**
 * Format duration in milliseconds to human-readable string
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration (e.g., "2h 15m 30s")
 */
function formatDuration(ms) {
  if (!ms || ms < 0) return null

  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  const remainingMinutes = minutes % 60
  const remainingSeconds = seconds % 60

  const parts = []
  if (hours > 0) parts.push(`${hours}h`)
  if (remainingMinutes > 0) parts.push(`${remainingMinutes}m`)
  if (remainingSeconds > 0 && hours === 0) parts.push(`${remainingSeconds}s`)

  return parts.length > 0 ? parts.join(' ') : '0s'
}

/**
 * Rank teams based on completion count and time
 * @param {Array} teams - Array of team objects with progress data
 * @returns {Array} Sorted and ranked teams
 */
function rankTeams(teams) {
  if (!teams || teams.length === 0) {
    return []
  }

  // Sort teams by ranking rules
  const sorted = teams.sort((a, b) => {
    // Rule 1: More completed stops ranks higher
    if (b.completedStops !== a.completedStops) {
      return b.completedStops - a.completedStops
    }

    // Rule 2: For same completions, faster total time ranks higher
    // Only compare times if both teams have completed at least one stop
    if (a.completedStops > 0 && b.completedStops > 0) {
      // If both have times, compare them (lower is better)
      if (a.totalTimeMs !== null && b.totalTimeMs !== null) {
        return a.totalTimeMs - b.totalTimeMs
      }
      // If only one has a time, prioritize the one with time
      if (a.totalTimeMs !== null) return -1
      if (b.totalTimeMs !== null) return 1
    }

    // Rule 3: Fallback to latest activity (earlier is better)
    if (a.lastCompletedAt && b.lastCompletedAt) {
      return a.lastCompletedAt.localeCompare(b.lastCompletedAt)
    }

    return 0
  })

  // Assign ranks
  sorted.forEach((team, index) => {
    team.rank = index + 1
  })

  return sorted
}

/**
 * Enrich team data with time calculations
 * @param {Object} team - Team object with progress data
 * @param {Array} progressData - Array of progress records with completed_at
 * @returns {Object} Enriched team object
 */
function enrichTeamWithTimeData(team, progressData) {
  // Filter to completed stops only
  const completedStops = progressData.filter(p => p.done && p.completed_at)

  // Calculate time metrics
  const { totalTimeMs, firstCompletedAt, lastCompletedAt } = calculateTotalTime(completedStops)
  const averageTimeMs = calculateAverageTime(totalTimeMs, completedStops.length)

  // Check if team completed all stops
  const isComplete = team.completedStops === team.totalStops && team.totalStops > 0

  return {
    ...team,
    totalTimeMs,
    totalTimeFormatted: formatDuration(totalTimeMs),
    averageTimeMs,
    averageTimeFormatted: formatDuration(averageTimeMs),
    firstCompletedAt,
    lastCompletedAt,
    isComplete
  }
}

module.exports = {
  calculateTotalTime,
  calculateAverageTime,
  formatDuration,
  rankTeams,
  enrichTeamWithTimeData
}
