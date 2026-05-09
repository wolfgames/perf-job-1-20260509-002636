/**
 * Dash Runner — game entry point
 * Exports the game and start screen setup functions per mygame-contract.
 */
export { setupGame } from './GameController';
export { setupStartScreen } from './screens/startView';
export type {
  SetupGame,
  SetupStartScreen,
  GameControllerDeps,
  StartScreenDeps,
  GameController,
  StartScreenController,
  GameMode,
} from '~/game/mygame-contract';
