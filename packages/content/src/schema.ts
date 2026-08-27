import { z } from 'zod'

/**
 * Content is data, not code. Every building, resource and mission in the game
 * is described by JSON validated against these schemas, so a chapter can be
 * authored (or reviewed by a teacher) without touching the simulation.
 */

const id = z.string().regex(/^[a-z][a-z0-9_]*$/, 'ids are lower_snake_case')

/** A quantity map keyed by resource id, e.g. { timber: 4, planks: 2 }. */
const amounts = z.record(id, z.number().int().nonnegative())

export const terrainSchema = z.object({
  id,
  name: z.string(),
  /** Can a building be placed on this tile at all? */
  buildable: z.boolean(),
  /** Passable by colonists moving overland. */
  passable: z.boolean(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
})

export const resourceSchema = z.object({
  id,
  name: z.string(),
  /** Counts toward colony food stores and can be eaten. */
  edible: z.boolean().default(false),
  /** Shown in the top-of-screen resource bar. */
  tracked: z.boolean().default(true),
  /** Eaten first when higher: fresh fish spoils long before dried corn. */
  perishability: z.number().int().nonnegative().default(0),
  icon: z.string(),
})

export const productionSchema = z.object({
  /** Consumed each time the recipe completes. */
  inputs: amounts.default({}),
  /** Produced each time the recipe completes. */
  outputs: amounts,
  /** Days between completions when fully staffed. */
  intervalDays: z.number().int().positive(),
})

export const buildingSchema = z.object({
  id,
  name: z.string(),
  description: z.string(),
  cost: amounts.default({}),
  /** Days of labour before the building becomes active. */
  buildDays: z.number().int().nonnegative().default(1),
  /** Colonists needed for full output; partial staffing scales output down. */
  workers: z.number().int().nonnegative().default(0),
  placement: z
    .object({
      /** Terrain the building itself must sit on. */
      terrain: z.array(id).optional(),
      /** Terrain that must exist in one of the four neighbouring tiles. */
      adjacentTerrain: z.array(id).optional(),
    })
    .default({}),
  production: productionSchema.optional(),
  /** Added to the colony's storage ceiling. */
  storage: z.number().int().nonnegative().default(0),
  /** Colonists this building can shelter. */
  housing: z.number().int().nonnegative().default(0),
  /** Primary source revealed when the first one is completed. */
  sourceCard: id.optional(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
})

/**
 * A short excerpt from a real document, plus the question that turns it into a
 * history lesson rather than flavour text: who wrote this, and why?
 */
export const sourceCardSchema = z.object({
  id,
  title: z.string(),
  author: z.string(),
  year: z.number().int(),
  excerpt: z.string(),
  context: z.string(),
  question: z.string(),
})

/**
 * A Powhatan town the colony can deal with. These are not player buildings and
 * cannot be built, captured or destroyed: they are neighbours with their own
 * harvest, their own needs, and their own view of the newcomers.
 */
export const townSchema = z.object({
  id,
  name: z.string(),
  description: z.string(),
  /** Where the town sits, as a fraction of the map's width and height. */
  position: z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }),
  /** Days a trading party spends on the round trip. */
  travelDays: z.number().int().positive(),
  /** Relationship at the start of the chapter, 0-100. */
  startingRelationship: z.number().int().min(0).max(100),
  /** Corn the town has to spare when its harvest comes in. */
  harvestCorn: z.number().int().nonnegative(),
  /** Corn the town itself eats each day, which is why late winter is lean. */
  dailyUse: z.number().int().nonnegative().default(2),
  /**
   * What the town will trade for, and how much corn one unit fetches when the
   * relationship is cordial. Their regard for the goods, not ours.
   */
  wants: z.record(id, z.number().int().positive()),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
})

export const scenarioSchema = z.object({
  id,
  name: z.string(),
  year: z.number().int(),
  summary: z.string(),
  /** Fixed seed keeps a scenario identical for every student in a classroom. */
  seed: z.number().int(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  startingColonists: z.number().int().positive(),
  startingResources: amounts.default({}),
  baseStorage: z.number().int().nonnegative().default(200),
  /** Day of the year (0-359) the scenario opens on. */
  startDay: z.number().int().nonnegative().default(0),
})

export const contentSchema = z.object({
  terrains: z.array(terrainSchema),
  resources: z.array(resourceSchema),
  buildings: z.array(buildingSchema),
  towns: z.array(townSchema),
  sourceCards: z.array(sourceCardSchema),
  scenarios: z.array(scenarioSchema),
})

export type Terrain = z.infer<typeof terrainSchema>
export type Resource = z.infer<typeof resourceSchema>
export type Building = z.infer<typeof buildingSchema>
export type Production = z.infer<typeof productionSchema>
export type Town = z.infer<typeof townSchema>
export type SourceCard = z.infer<typeof sourceCardSchema>
export type Scenario = z.infer<typeof scenarioSchema>
export type RawContent = z.input<typeof contentSchema>
