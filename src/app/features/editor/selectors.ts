import type {
  EventId,
  CardId,
  DeckId,
  EntityId,
  PropertyId,
} from "../../../api/services/game/types";
import { getKeyVisibilities } from "../../../lib/reactMosaicExtensions";
import { compileEditorApi } from "../compiler/compileEditorApi";
import { deriveRuntimeDefinition } from "../runtime/createRuntimeDefinition";
import type { EditorObjectId, EditorState } from "./types";

export const selectors = {
  panelLayout: (state: EditorState) => state.panelLayout,
  panelVisibilities: (state: EditorState) =>
    getKeyVisibilities(state.panelLayout),
  selectedObject: (state: EditorState) => state.selectedObjectId,
  selectedObjectBreadcrumbs(state: EditorState): string[] | undefined {
    const { selectedObjectId: id } = state;
    if (!id) {
      return;
    }
    switch (id.type) {
      case "event":
        return [selectors.event(id.eventId)(state)?.name ?? ""];
      case "card":
        const card = selectors.card(id.cardId)(state);
        const deck = card && selectors.deck(card.deckId)(state);
        return [deck?.name ?? "", card?.name ?? ""];
    }
  },
  game: (state: EditorState) => state.game,
  decks: (state: EditorState) => state.game?.definition.decks ?? [],
  decksAndCards: (state: EditorState) => {
    if (!state.game) {
      return [];
    }
    const { decks, cards } = state.game.definition;
    return decks.map((deck) => ({
      objectId: { type: "deck", deckId: deck.deckId } as EditorObjectId,
      ...deck,
      cards: cards
        .filter((card) => card.deckId === deck.deckId)
        .map((card) => ({
          objectId: { type: "card", cardId: card.cardId } as EditorObjectId,
          ...card,
        })),
    }));
  },
  events: (state: EditorState) => {
    if (!state.game) {
      return [];
    }
    const { events } = state.game.definition;
    return events.map((event) => ({
      objectId: { type: "event", eventId: event.eventId } as EditorObjectId,
      ...event,
    }));
  },
  deck: (deckId: DeckId) => (state: EditorState) =>
    state.game?.definition.decks.find((d) => d.deckId === deckId),
  card: (cardId: CardId) => (state: EditorState) =>
    state.game?.definition.cards.find((c) => c.cardId === cardId),
  event: (eventId: EventId) => (state: EditorState) =>
    state.game?.definition.events.find((a) => a.eventId === eventId),
  property: (propertyId: PropertyId) => (state: EditorState) =>
    state.game?.definition.properties.find((p) => p.propertyId === propertyId),
  propertiesFor: (entityId: EntityId) => (state: EditorState) =>
    state.game?.definition.properties
      .filter((p) => p.entityId === entityId)
      .map((property) => ({
        objectId: {
          type: "property",
          propertyId: property.propertyId,
        } as EditorObjectId,
        ...property,
      })) ?? [],
  editorApi: (state: EditorState) =>
    state.game
      ? compileEditorApi(deriveRuntimeDefinition(state.game.definition))
      : undefined,
};
