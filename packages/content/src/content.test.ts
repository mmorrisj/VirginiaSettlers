import { describe, expect, it } from 'vitest'
import { content, loadContent } from './index.js'

describe('content', () => {
  it('loads and indexes every data file', () => {
    expect(content.terrains.size).toBeGreaterThan(0)
    expect(content.buildings.size).toBeGreaterThan(0)
    expect(content.scenarios.has('jamestown_1607')).toBe(true)
  })

  it('gives every building a legal, affordable-looking definition', () => {
    for (const building of content.buildingList) {
      expect(building.name.length).toBeGreaterThan(0)
      expect(building.description.length).toBeGreaterThan(0)
      for (const terrainId of building.placement.terrain ?? []) {
        expect(content.terrains.get(terrainId)?.buildable).toBe(true)
      }
    }
  })

  it('rejects a building that references a resource that does not exist', () => {
    expect(() =>
      loadContent({
        terrains: [{ id: 'meadow', name: 'Meadow', buildable: true, passable: true, color: '#000000' }],
        resources: [{ id: 'timber', name: 'Timber', icon: 'logs' }],
        towns: [],
        buildings: [
          {
            id: 'mill',
            name: 'Mill',
            description: 'A mill.',
            cost: { unobtanium: 1 },
            color: '#000000',
          },
        ],
        sourceCards: [],
        scenarios: [],
      }),
    ).toThrow(/unknown resource "unobtanium"/)
  })

  it('rejects a source card reference that does not exist', () => {
    expect(() =>
      loadContent({
        terrains: [{ id: 'meadow', name: 'Meadow', buildable: true, passable: true, color: '#000000' }],
        resources: [],
        towns: [],
        buildings: [
          {
            id: 'mill',
            name: 'Mill',
            description: 'A mill.',
            sourceCard: 'missing_card',
            color: '#000000',
          },
        ],
        sourceCards: [],
        scenarios: [],
      }),
    ).toThrow(/unknown source card "missing_card"/)
  })

  it('keeps every source card honest about who wrote it', () => {
    for (const card of content.sourceCards.values()) {
      expect(card.author.length).toBeGreaterThan(0)
      expect(card.question.endsWith('?')).toBe(true)
    }
  })
})

describe('scenario coherence', () => {
  it('leaves every scenario room in the store to produce anything at all', () => {
    for (const scenario of content.scenarioList) {
      const starting = Object.values(scenario.startingResources).reduce((sum, n) => sum + n, 0)
      expect(starting).toBeLessThan(scenario.baseStorage)
    }
  })

  it('rejects a scenario that starts over its own storage ceiling', () => {
    expect(() =>
      loadContent({
        terrains: [],
        resources: [{ id: 'corn', name: 'Corn', icon: 'corn', edible: true }],
        towns: [],
        buildings: [],
        sourceCards: [],
        scenarios: [
          {
            id: 'overloaded',
            name: 'Overloaded',
            year: 1607,
            summary: 'Too much corn.',
            seed: 1,
            width: 4,
            height: 4,
            startingColonists: 1,
            startingResources: { corn: 500 },
            baseStorage: 100,
          },
        ],
      }),
    ).toThrow(/exceeds baseStorage/)
  })
})
