// a 1v1 game consisting of draw, discard, health and mana mechanics
import { Machine } from "../machine/Machine";
import type { MachineEventHandlerSelector } from "../machine/MachineEvent";
import type { MachineContext } from "../machine/MachineContext";
import type { CardId, Player, PlayerId } from "./Entities";

describe("versus", () => {
  it("can play a game", () => {
    // Define starting state:
    // - start a game with 2 players with 1 health each
    // - define winning condition as having 0 health
    // - each player has their own deck
    // - each deck contains 1 attack card that does 1 damage to the opponent
    // - Let player 1 start

    // Trigger events:
    // - Player 1 draws and plays their one card.

    // Expect results:
    // - Expect the game to have ended with player 1 as victor

    const runtime = new Machine<Context>(
      {
        p1: mockPlayer(),
        p2: mockPlayer(),
      },
      selectEffectsForEvent
    );

    runtime.events.drawCard(runtime.state.p1.id);

    runtime.events.playCard({
      playerId: runtime.state.p1.id,
      targetId: runtime.state.p2.id,
      cardId: runtime.state.p1.piles.hand[0]!.id,
    });

    runtime.events.endTurn();

    expect(runtime.state.winner).toBe(runtime.state.p1.id);
  });
});

function mockPlayer(): Player<Context> {
  return {
    id: "player1" as PlayerId,
    items: [],
    health: 1,
    deck: [
      {
        id: "attack" as CardId,
        playable: () => true,
        effects: {
          playCard: [
            (state, { targetId }) => {
              const target = [state.p1, state.p2].find(
                (p) => p.id === targetId
              );
              if (target) {
                target.health -= 1;
              }
            },
          ],
        },
      },
    ],
    piles: {
      hand: [],
      discard: [],
      draw: [],
    },
  };
}

type Context = MachineContext<State, Events>;

interface State {
  p1: Player<Context>;
  p2: Player<Context>;
  winner?: PlayerId;
}

type Events = {
  drawCard: (id: PlayerId) => void;
  playCard: (input: {
    playerId: PlayerId;
    cardId: CardId;
    targetId: PlayerId;
  }) => void;
  endTurn: () => void;
};

const selectEffectsForEvent: MachineEventHandlerSelector<Context> = function* (
  { p1, p2 },
  eventName
) {
  for (const player of [p1, p2]) {
    for (const item of player.items) {
      const itemEffects = item.effects[eventName];
      if (itemEffects) {
        for (const effect of itemEffects) {
          yield effect;
        }
      }
    }
    for (const card of player.deck) {
      const cardEffects = card.effects[eventName];
      if (cardEffects) {
        for (const effect of cardEffects) {
          yield effect;
        }
      }
    }
  }
};