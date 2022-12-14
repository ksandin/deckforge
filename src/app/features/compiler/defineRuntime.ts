import type { ZodRawShape, ZodType } from "zod";
import { z } from "zod";
import type { ZodTypeAny } from "zod/lib/types";
import { uniq } from "lodash";
import type {
  DeckId,
  Event,
  Game,
  Property,
} from "../../../api/services/game/types";
import {
  cardType as cardDefinitionType,
  propertyValue,
} from "../../../api/services/game/types";
import { zodNominalString } from "../../../lib/zod-extensions/zodNominalString";
import { createMachine } from "../../../lib/machine/Machine";
import type { ZodShapeFor } from "../../../lib/zod-extensions/ZodShapeFor";
import type {
  PropRecord,
  RuntimeDefinition,
  RuntimeEffects,
  RuntimeGenerics,
  RuntimePlayerId,
  RuntimeState,
  RuntimeScriptAPI,
} from "./types";
import { runtimeStatusType } from "./types";
import { zodPile } from "./apis/Pile";

export function defineRuntime<
  PlayerProps extends PropRecord,
  CardProps extends PropRecord,
  ActionTypeDefs extends ZodRawShape
>({
  playerProperties,
  cardProperties,
  actions: createActionsShape,
}: {
  playerProperties: ZodShapeFor<PlayerProps>;
  cardProperties: ZodShapeFor<CardProps>;
  actions: (types: {
    playerId: ZodType<RuntimePlayerId>;
    deckId: ZodType<DeckId>;
  }) => ActionTypeDefs;
}) {
  type Actions = z.objectInputType<ActionTypeDefs, ZodTypeAny>;
  type G = RuntimeGenerics<PlayerProps, CardProps, Actions>;

  const playerId = zodNominalString<RuntimePlayerId>();
  const deckId = cardDefinitionType.shape.deckId;

  const lazyState = z.lazy(() => state);
  const actionsShape = createActionsShape({ playerId, deckId });

  const actions = z.object(
    actionsShape
  ) as unknown as RuntimeDefinition<G>["actions"];

  const effects = deriveEffectsType(
    actionsShape,
    lazyState
  ) as unknown as RuntimeDefinition<G>["effects"];

  const card = z.object({
    id: cardDefinitionType.shape.cardId,
    name: cardDefinitionType.shape.name,
    properties: z.object(cardProperties),
    effects: effects.partial(),
  }) as unknown as RuntimeDefinition<G>["card"];

  const deck = z.object({
    id: deckId,
    name: cardDefinitionType.shape.name,
    cards: z.array(card),
  }) as unknown as RuntimeDefinition<G>["deck"];

  const cardPile = zodPile(card);

  const player = z.object({
    id: playerId,
    deckId,
    properties: z.object(playerProperties),
    board: z.object({
      draw: cardPile,
      hand: cardPile,
      discard: cardPile,
    }),
  }) as unknown as RuntimeDefinition<G>["player"];

  const state = z.object({
    decks: z.array(deck),
    players: z.tuple([player, player]),
    status: runtimeStatusType,
    currentPlayerId: playerId,
  }) as unknown as RuntimeDefinition<G>["state"];

  const actionUnion = z.unknown();
  const middlewareNext = z.function().args().returns(z.void());

  const middleware = z
    .function()
    .args(state, actionUnion, middlewareNext)
    .returns(z.void()) as RuntimeDefinition<G>["middleware"];

  return {
    status: runtimeStatusType,
    deck,
    card,
    cardPile,
    player,
    state,
    effects,
    actions,
    middleware,
  } as RuntimeDefinition<G>;
}

export function deriveRuntimeDefinition({
  properties,
  events,
}: Game["definition"]) {
  const playerPropertyList = properties.filter((p) => p.entityId === "player");
  const cardPropertyList = properties.filter((p) => p.entityId === "card");
  return defineRuntime({
    playerProperties: propertiesToZodShape(playerPropertyList),
    cardProperties: propertiesToZodShape(cardPropertyList),
    actions: () => eventsToZodShape(events),
  });
}

const propertiesToZodShape = (propertyList: Property[]) =>
  propertyList.reduce(
    (shape, property) => ({
      ...shape,
      [property.name]: propertyValue.valueTypeOf(property.type),
    }),
    {} as ZodRawShape
  );

const eventsToZodShape = <G extends RuntimeGenerics>(eventList: Event[]) =>
  eventList.reduce(
    (shape, event) => ({
      ...shape,
      [event.name]: z
        .function()
        .args(propertyValue.valueTypeOf(event.inputType))
        .returns(z.void()),
    }),
    {} as ZodShapeFor<G["actions"]>
  );

function deriveEffectsType<G extends RuntimeGenerics>(
  actionTypes: ZodShapeFor<G["actions"]>,
  stateType: ZodType<RuntimeState<G>>
) {
  const shape = Object.entries(actionTypes).reduce(
    (shape, [actionName, actionType]) => {
      const args = actionType._def.args._def.items;
      const effectType = z.function(z.tuple([stateType, ...args]), z.void());
      return { ...shape, [actionName]: effectType };
    },
    {} as ZodShapeFor<RuntimeEffects<G>>
  );
  return z.object(shape);
}

export function deriveMachine<G extends RuntimeGenerics>(
  effects: RuntimeEffects<G>,
  initialState: RuntimeState<G>
) {
  return createMachine(initialState)
    .effects(effects)
    .reactions(function* (state, effectName) {
      const cardsInDecks = state.decks.map((deck) => deck.cards).flat();
      const cardOnBoards = state.players.flatMap((p) =>
        Object.values(p.board)
          .map((pile) => Array.from(pile))
          .flat()
      );

      const cards = uniq([...cardsInDecks, ...cardOnBoards]);

      for (const card of cards) {
        const effect = card.effects[effectName];
        if (effect !== undefined) {
          yield effect;
        }
      }
    });
}

export function runtimeEvent<Args extends [] | [ZodTypeAny]>(...args: Args) {
  return z.function(z.tuple(args), z.void());
}

export function createScriptApiDefinition<G extends RuntimeGenerics>({
  card,
  actions,
}: Pick<RuntimeDefinition<G>, "card" | "actions">): ZodShapeFor<
  RuntimeScriptAPI<G>
> {
  const cloneCard = z.function().args(card).returns(card) as unknown as ZodType<
    RuntimeScriptAPI<G>["cloneCard"]
  >;
  return {
    cloneCard,
    actions,
    thisCardId: card.shape.id,
    random: z.function().args(z.void()).returns(z.number()),
  };
}
