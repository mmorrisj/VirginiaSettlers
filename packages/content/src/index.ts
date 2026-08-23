import terrains from '../data/terrains.json'
import resources from '../data/resources.json'
import buildings from '../data/buildings.json'
import sourceCards from '../data/source-cards.json'
import scenarios from '../data/scenarios.json'
import { contentSchema } from './schema.js'
import type { Building, Resource, Scenario, SourceCard, Terrain } from './schema.js'

export * from './schema.js'

/**
 * The validated game content, indexed for lookup. Parsing happens once at module
 * load: if a data file is malformed the game fails loudly at startup rather than
 * halfway through a lesson.
 */
export interface Content {
  terrains: ReadonlyMap<string, Terrain>
  resources: ReadonlyMap<string, Resource>
  buildings: ReadonlyMap<string, Building>
  sourceCards: ReadonlyMap<string, SourceCard>
  scenarios: ReadonlyMap<string, Scenario>
  /** Insertion-ordered lists, for menus that need a stable display order. */
  buildingList: readonly Building[]
  resourceList: readonly Resource[]
  scenarioList: readonly Scenario[]
}

const byId = <T extends { id: string }>(items: readonly T[]): ReadonlyMap<string, T> =>
  new Map(items.map((item) => [item.id, item]))

/** Validates raw content and cross-checks every id reference between files. */
export function loadContent(raw: unknown): Content {
  const parsed = contentSchema.parse(raw)

  const content: Content = {
    terrains: byId(parsed.terrains),
    resources: byId(parsed.resources),
    buildings: byId(parsed.buildings),
    sourceCards: byId(parsed.sourceCards),
    scenarios: byId(parsed.scenarios),
    buildingList: parsed.buildings,
    resourceList: parsed.resources,
    scenarioList: parsed.scenarios,
  }

  assertReferencesResolve(content)
  return content
}

/**
 * zod checks shapes; this checks that ids point at things that exist. Content
 * authors get told which file and which id, not a runtime undefined later on.
 */
function assertReferencesResolve(content: Content): void {
  const problems: string[] = []

  const checkResources = (where: string, amounts: Record<string, number>) => {
    for (const resourceId of Object.keys(amounts)) {
      if (!content.resources.has(resourceId)) problems.push(`${where}: unknown resource "${resourceId}"`)
    }
  }
  const checkTerrains = (where: string, ids: readonly string[] | undefined) => {
    for (const terrainId of ids ?? []) {
      if (!content.terrains.has(terrainId)) problems.push(`${where}: unknown terrain "${terrainId}"`)
    }
  }

  for (const building of content.buildingList) {
    const where = `building "${building.id}"`
    checkResources(`${where} cost`, building.cost)
    checkTerrains(`${where} placement.terrain`, building.placement.terrain)
    checkTerrains(`${where} placement.adjacentTerrain`, building.placement.adjacentTerrain)
    if (building.production) {
      checkResources(`${where} production inputs`, building.production.inputs)
      checkResources(`${where} production outputs`, building.production.outputs)
      if (Object.keys(building.production.outputs).length === 0) {
        problems.push(`${where}: production must have at least one output`)
      }
    }
    if (building.sourceCard && !content.sourceCards.has(building.sourceCard)) {
      problems.push(`${where}: unknown source card "${building.sourceCard}"`)
    }
  }

  for (const scenario of content.scenarioList) {
    const where = `scenario "${scenario.id}"`
    checkResources(`${where} startingResources`, scenario.startingResources)

    const startingTotal = Object.values(scenario.startingResources).reduce(
      (sum, amount) => sum + amount,
      0,
    )
    if (startingTotal > scenario.baseStorage) {
      problems.push(
        `${where}: startingResources total ${startingTotal} exceeds baseStorage ${scenario.baseStorage}, ` +
          'so production would be blocked from the first day',
      )
    }
  }

  if (problems.length > 0) {
    throw new Error(`Invalid game content:\n  ${problems.join('\n  ')}`)
  }
}

export const content: Content = loadContent({
  terrains,
  resources,
  buildings,
  sourceCards,
  scenarios,
})
