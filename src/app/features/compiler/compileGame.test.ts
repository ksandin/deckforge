import { v4 } from "uuid";
import type {
  CardId,
  DeckId,
  EntityId,
  EventId,
  GameDefinition,
  MiddlewareId,
  PropertyId,
} from "../../../api/services/game/types";
import { deriveRuntimeDefinition } from "./defineRuntime";
import { compileGame } from "./compileGame";
import type { RuntimeGenerics } from "./types";

describe("compileGame", () => {
  it("can compile game with a single event without errors", () => {
    const gameDefinition: GameDefinition = {
      middlewares: [],
      properties: [],
      events: [
        {
          eventId: v4() as EventId,
          name: "attack",
          code: `define(() => {});`,
          inputType: "number",
        },
      ],
      cards: [],
      decks: [],
    };
    const runtimeDefinition = deriveRuntimeDefinition(gameDefinition);
    const { error, runtime } = compileGame(runtimeDefinition, gameDefinition);
    expect(error).toBeUndefined();
    expect(runtime).toBeDefined();
  });

  it("compiled event can mutate player property", () => {
    const gameDefinition: GameDefinition = {
      middlewares: [],
      properties: [
        {
          entityId: "player" as EntityId,
          propertyId: v4() as PropertyId,
          name: "health",
          type: "number",
          defaultValue: 10,
        },
      ],
      events: [
        {
          eventId: v4() as EventId,
          name: "attack",
          code: `
define((state, damage) => {
  for (const player of state.players) {
    player.properties.health -= damage;
  }
});`,
          inputType: "number",
        },
      ],
      cards: [],
      decks: [],
    };
    const runtimeDefinition = deriveRuntimeDefinition(gameDefinition);
    const runtime = tryCompileGame(runtimeDefinition, gameDefinition);

    runtime.actions.attack(5);
    expect(runtime.state.players[0].properties.health).toBe(5);
    expect(runtime.state.players[1].properties.health).toBe(5);
  });

  it("compiled event can add card to draw pile", () => {
    const deckId = v4() as DeckId;
    const gameDefinition: GameDefinition = {
      properties: [],
      middlewares: [],
      events: [
        {
          eventId: v4() as EventId,
          name: "addCard",
          inputType: "void",
          code: `
define((state) => {
  const deck = state.decks[0].cards;
  for (const player of state.players) {
    player.board.draw.add(deck[0]);
  }
});`,
        },
      ],
      cards: [
        {
          cardId: v4() as CardId,
          deckId,
          name: "Foo",
          propertyDefaults: {},
          code: ``,
        },
      ],
      decks: [{ deckId, name: "Test Deck" }],
    };
    const runtimeDefinition = deriveRuntimeDefinition(gameDefinition);
    const runtime = tryCompileGame(runtimeDefinition, gameDefinition);
    runtime.actions.addCard();
    const [player1] = runtime.state.players;
    expect(player1.board.draw.size).toBe(1);
    expect(player1.board.draw.at(0)).toBe(runtime.state.decks[0].cards[0]);
  });

  it("compiled card effect can mutate player property", () => {
    const deckId = v4() as DeckId;
    const gameDefinition: GameDefinition = {
      properties: [
        {
          entityId: "player" as EntityId,
          propertyId: v4() as PropertyId,
          name: "health",
          type: "number",
          defaultValue: 10,
        },
      ],
      middlewares: [],
      events: [
        {
          eventId: v4() as EventId,
          name: "playCard",
          code: ``,
          inputType: { player: "string", target: "string" },
        },
      ],
      cards: [
        {
          cardId: v4() as CardId,
          deckId,
          name: "Lifesteal",
          propertyDefaults: {},
          code: `
derive(({thisCardId}) => ({
  playCard (state, {player: playerId, target: targetId, cardId}) {
    if (cardId !== thisCardId) {
      return;
    }
    const player = state.players.find((p) => p.id === playerId);
    const target = state.players.find((p) => p.id === targetId);
    player.properties.health += 5;
    target.properties.health -= 5;
  }
}))`,
        },
      ],
      decks: [{ deckId, name: "Test Deck" }],
    };
    const runtimeDefinition = deriveRuntimeDefinition(gameDefinition);
    const runtime = tryCompileGame(runtimeDefinition, gameDefinition);

    runtime.execute((state) => {
      const [player1, player2] = state.players;
      const cardId = state.decks[0].cards[0].id;
      runtime?.actions.playCard({
        player: player1.id,
        target: player2.id,
        cardId,
      });
      expect(player1.properties.health).toBe(15);
      expect(player2.properties.health).toBe(5);
    });
  });

  describe("compiled runtime entities have correct default property values", () => {
    const properties = {
      num: {
        entityId: "player" as EntityId,
        propertyId: v4() as PropertyId,
        name: "num",
        type: "number" as const,
      },
      str: {
        entityId: "card" as EntityId,
        propertyId: v4() as PropertyId,
        name: "str",
        type: "string" as const,
      },
    };
    const deckId = v4() as DeckId;
    const gameDefinition: GameDefinition = {
      properties: Object.values(properties),
      events: [],
      middlewares: [],
      cards: [
        {
          cardId: v4() as CardId,
          deckId,
          name: "baz",
          propertyDefaults: {
            [properties.str.propertyId]: "default",
          },
          code: ``,
        },
      ],
      decks: [
        {
          deckId,
          name: "Test Deck",
        },
      ],
    };
    it("player properties", () => {
      const runtimeDefinition = deriveRuntimeDefinition(gameDefinition);
      const runtime = tryCompileGame(runtimeDefinition, gameDefinition);
      expect(runtime.state.players[0].properties.num).toBe(0);
      expect(runtime.state.players[1].properties.num).toBe(0);
    });

    it("card properties", () => {
      const runtimeDefinition = deriveRuntimeDefinition(gameDefinition);
      const runtime = tryCompileGame(runtimeDefinition, gameDefinition);
      expect(runtime.state.decks[0].cards[0].properties.str).toBe("default");
    });
  });

  it("compiled runtime can chain events ", () => {
    const gameDefinition: GameDefinition = {
      properties: [
        {
          entityId: "player" as EntityId,
          propertyId: v4() as PropertyId,
          name: "count",
          type: "number",
        },
      ],
      middlewares: [],
      events: [
        {
          eventId: v4() as EventId,
          name: "increaseUntil",
          code: `
          derive(({actions}) => (state, max) => {
            const [player] = state.players;
            if (player.properties.count < max) {
              player.properties.count++;
              actions.increaseUntil(max);
            }
          });
          `,
          inputType: "number",
        },
      ],
      cards: [],
      decks: [],
    };
    const runtimeDefinition = deriveRuntimeDefinition(gameDefinition);
    const runtime = tryCompileGame(runtimeDefinition, gameDefinition);
    runtime.execute((state) => {
      runtime.actions.increaseUntil(10);
      expect(state.players[0].properties.count).toBe(10);
    });
  });

  it("compiled middleware can read and mutate state", () => {
    const gameDefinition: GameDefinition = {
      middlewares: [
        {
          middlewareId: v4() as MiddlewareId,
          name: "make player 1 win",
          code: `define((state) => {
            state.status = { type: "result", winner: state.players[0].id };
          })`,
        },
      ],
      properties: [],
      events: [
        {
          eventId: v4() as EventId,
          name: "foo",
          code: ``,
          inputType: "void",
        },
      ],
      cards: [],
      decks: [],
    };
    const runtimeDefinition = deriveRuntimeDefinition(gameDefinition);
    const runtime = tryCompileGame(runtimeDefinition, gameDefinition);
    runtime!.actions.foo();
    expect(runtime!.state.status).toEqual({
      type: "result",
      winner: runtime!.state.players[0].id,
    });
  });

  it("compiled middleware can opt out of next middleware", () => {
    const gameDefinition: GameDefinition = {
      middlewares: [
        {
          middlewareId: v4() as MiddlewareId,
          name: "set to 1",
          code: `define((state, action, next) => {
            state.status = 1;
            next();
          })`,
        },
        {
          middlewareId: v4() as MiddlewareId,
          name: "add 2",
          code: `define((state) => {
            state.status += 2;
          })`,
        },
        {
          middlewareId: v4() as MiddlewareId,
          name: "set to 0",
          code: `define((state) => {
            state.status = 0;
          })`,
        },
      ],
      properties: [],
      events: [
        {
          eventId: v4() as EventId,
          name: "foo",
          code: ``,
          inputType: "void",
        },
      ],
      cards: [],
      decks: [],
    };
    const runtimeDefinition = deriveRuntimeDefinition(gameDefinition);
    const runtime = tryCompileGame(runtimeDefinition, gameDefinition);
    runtime!.actions.foo();
    expect(runtime!.state.status).toEqual(3);
  });
});

function tryCompileGame<G extends RuntimeGenerics>(
  ...args: Parameters<typeof compileGame<G>>
) {
  const { runtime, error } = compileGame<G>(...args);
  if (error) {
    throw error;
  }
  return runtime!;
}
