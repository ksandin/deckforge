import { original } from "immer";
import type { Generics } from "./state/Generics";
import { createId } from "./createId";
import { Runtime } from "./Runtime";
import type { RuntimeState } from "./state/RuntimeState";
import type { EventExpression } from "./state/Expression";
import type { Card } from "./state/Card";

describe("deckforge", () => {
  describe("card", () => {
    const createState = (
      options: {
        effect?: EventExpression<G>;
        settings?: G["settings"];
      } & Partial<Pick<Card<G>, "cost" | "playable">>
    ): RuntimeState<G> => ({
      settings: options.settings ?? { num: 0 },
      players: [
        {
          items: [],
          props: { name: "Foo" },
          deck: {
            props: { name: "Foo" },
            cards: [
              {
                id: createId(),
                cost: options?.cost ?? (() => 0),
                playable: options?.playable ?? (() => true),
                effects: { a: options.effect ? [options.effect] : [] },
                props: { name: "Foo" },
              },
            ],
          },
        },
      ],
    });

    it("can derive cost from state and input", () => {
      const { state } = new Runtime<G>(
        createState({
          settings: { num: 3 },
          cost: ({ state, self }) =>
            state.settings.num + self.props.name.length,
        })
      );
      const [self] = state.players[0]?.deck.cards ?? [];
      expect(self?.cost?.({ state, self })).toBe(6);
    });

    it("can derive playable from state and input", () => {
      const { state } = new Runtime<G>(
        createState({
          settings: { num: 3 },
          playable: ({ state, self }) =>
            state.settings.num + self.props.name.length === 6,
        })
      );
      const [self] = state.players[0]?.deck.cards ?? [];
      expect(self?.playable?.({ state, self })).toBe(true);
    });

    describe("effects", () => {
      generateEffectTests((effect) =>
        createState({ effect, settings: { num: 0 } })
      );
    });
  });

  describe("item", () => {
    describe("effects", () => {
      generateEffectTests((effect) => ({
        settings: { num: 0 },
        players: [
          {
            props: { name: "Foo" },
            items: [
              {
                id: createId(),
                effects: { a: [effect] },
                props: { name: "Foo" },
              },
            ],
            deck: {
              cards: [],
              props: {},
            },
          },
        ],
      }));
    });
  });
});

type G = Generics<
  {
    a: (n?: number) => void;
    b: () => void;
  },
  { num: number },
  { name: string },
  { name: string },
  { name: string }
>;

function generateEffectTests(
  createState: (effect: EventExpression<G>) => RuntimeState<G>
) {
  const createRuntime = (effect: EventExpression<G>) =>
    new Runtime<G>(createState(effect));

  it("reacts to the correct events", () => {
    const fn = jest.fn();
    const runtime = createRuntime(fn);
    runtime.events.b();
    expect(fn).not.toHaveBeenCalled();
    runtime.events.a();
    expect(fn).toHaveBeenCalled();
  });

  it("can receive state", () => {
    let receivedState: unknown;
    const runtime = createRuntime((immerDraft) => {
      receivedState = original(immerDraft);
    });
    const startState = runtime.state;
    runtime.events.a();
    expect(receivedState).toEqual(startState);
  });

  it("can receive input", () => {
    let receivedInput: unknown;
    const runtime = createRuntime((state, input) => {
      receivedInput = input;
    });
    runtime.events.a(123);
    expect(receivedInput).toBe(123);
  });

  it("can update state", () => {
    const runtime = createRuntime((state: RuntimeState<G>) => {
      const [player] = state.players;
      if (player) {
        player.props.name = "Updated";
      }
    });
    runtime.events.a();
    expect(runtime.state.players[0]?.props.name).toBe("Updated");
  });

  it("updates does not mutate current state", () => {
    const runtime = createRuntime((state: RuntimeState<G>) => {
      const [player] = state.players;
      if (player) {
        player.props.name = "Updated";
      }
    });
    const stateBeforeEvent = runtime.state;
    runtime.events.a();
    expect(runtime.state.players[0]?.props.name).toBe("Updated");
    expect(stateBeforeEvent.players[0]?.props.name).not.toBe("Updated");
  });
}
