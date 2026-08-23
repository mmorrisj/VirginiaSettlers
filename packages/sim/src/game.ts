import type { Content, Scenario } from '@vs/content'
import { execute, type Command, type CommandResult } from './commands.js'
import { createInitialState, type GameState } from './state.js'
import { dateFrom, type CalendarDate } from './calendar.js'

export interface SaveFile {
  version: 1
  scenarioId: string
  commands: Command[]
}

const SAVE_VERSION = 1

/**
 * The simulation's public face. It owns the state, records every accepted
 * command, and can rebuild an identical colony from that record.
 */
export class Game {
  readonly scenario: Scenario
  state: GameState
  private readonly commands: Command[] = []

  constructor(
    private readonly content: Content,
    scenarioId: string,
  ) {
    const scenario = content.scenarios.get(scenarioId)
    if (!scenario) throw new Error(`Unknown scenario "${scenarioId}"`)
    this.scenario = scenario
    this.state = createInitialState(content, scenario)
  }

  get date(): CalendarDate {
    return dateFrom(this.scenario.startDay, this.state.day)
  }

  /** Rejected commands are not recorded, so a replay never re-runs a mistake. */
  execute(command: Command): CommandResult {
    const result = execute(this.state, this.content, this.scenario, command)
    if (result.ok) this.commands.push(command)
    return result
  }

  save(): SaveFile {
    return { version: SAVE_VERSION, scenarioId: this.scenario.id, commands: [...this.commands] }
  }

  static load(content: Content, save: SaveFile): Game {
    if (save.version !== SAVE_VERSION) {
      throw new Error(`Unsupported save version ${save.version}`)
    }
    const game = new Game(content, save.scenarioId)
    for (const command of save.commands) game.execute(command)
    return game
  }
}
