/**
 * Every tuning number the simulation uses, in one file. Balance is the part of
 * an educational game that changes most after playtesting, so it is kept out of
 * the rules themselves.
 */

/** Colonists share rations: two people eat one unit of food per day. */
export const COLONISTS_PER_FOOD_UNIT = 2

/** Days of short rations the colony endures before people start to die. */
export const STARVATION_GRACE_DAYS = 3

/** Fraction of the remaining colonists lost on each further day of hunger. */
export const STARVATION_DEATH_RATE = 0.06

/** Labourers pulled onto a construction site while it is unfinished. */
export const CONSTRUCTION_CREW = 3

/**
 * Seasonal yield for food-producing buildings, as a percentage. The sturgeon
 * run in spring and summer and the river gives up very little in winter, which
 * is the pressure the whole first chapter is built around.
 */
export const FOOD_YIELD_BY_SEASON: Record<string, number> = {
  spring: 110,
  summer: 100,
  autumn: 75,
  winter: 35,
}

/** Chance per day that exposure kills a colonist with no roof, in winter. */
export const WINTER_EXPOSURE_DEATH_CHANCE = 0.18

/**
 * Surviving from the summer landing through to the following spring.
 * Chapter goals become authored content in a later milestone.
 */
export const SURVIVAL_GOAL_DAYS = 270

/** Entries kept in the colony journal before the oldest are dropped. */
export const MAX_LOG_ENTRIES = 200
