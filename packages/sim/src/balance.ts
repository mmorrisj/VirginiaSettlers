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

// --- Dealing with the Powhatan ------------------------------------------------

/**
 * Relationship runs 0-100 and decides whether a town will deal with the colony
 * at all, and on what terms. The bands are what the player actually sees.
 */
export const RELATIONSHIP_BANDS = [
  { band: 'hostile', min: 0 },
  { band: 'wary', min: 20 },
  { band: 'cordial', min: 45 },
  { band: 'allied', min: 75 },
] as const

export type RelationshipBand = (typeof RELATIONSHIP_BANDS)[number]['band']

/**
 * What a trade good fetches, as a percentage of its cordial value. A hostile
 * town will not trade at any price.
 */
export const BAND_RATE_PERCENT: Record<RelationshipBand, number> = {
  hostile: 0,
  wary: 60,
  cordial: 100,
  allied: 135,
}

/** Goodwill earned by dealing fairly. */
export const TRADE_GOODWILL = 2

/** Goodwill earned per this much corn-value given with nothing asked back. */
export const CORN_VALUE_PER_GIFT_GOODWILL = 40
export const MAX_GIFT_GOODWILL = 12
export const MIN_GIFT_GOODWILL = 2

/** Goodwill destroyed by taking corn under threat of arms. */
export const DEMAND_GOODWILL_COST = 25

/** Corn an armed party can carry off: a base, plus a share per colonist. */
export const DEMAND_BASE_CORN = 40
export const DEMAND_CORN_PER_COLONIST = 3

/**
 * A fort on their land is a standing grievance. Goodwill slips by one point
 * every this many days unless the colony keeps earning it back.
 */
export const RELATIONSHIP_DRIFT_DAYS = 20

/** Day of the year the towns' corn harvest comes in (the start of autumn). */
export const HARVEST_DAY_OF_YEAR = 180

/**
 * What hostility actually costs. A town at war does not merely refuse to trade:
 * it makes the ground outside the palisade unsafe, and colonists who cannot
 * leave the fort cannot fish or forage. This is what the siege of 1609 did to
 * Jamestown, and it is why taking corn by force was a bargain the colony could
 * not afford.
 */
export const HOSTILITY_FOOD_PENALTY_PERCENT = 22

/** Even surrounded, some food still comes in. */
export const MAX_HOSTILITY_FOOD_PENALTY_PERCENT = 66
