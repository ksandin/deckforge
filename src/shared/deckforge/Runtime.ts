import { createMachine, createMachineActions } from "../machine/Machine";
import { pull } from "../util";
import type { MachineContext } from "../machine/MachineContext";
import type {
  Battle,
  BattleId,
  BattleMember,
  Card,
  CardId,
  Deck,
  EntityCollection,
  Player,
  PlayerId,
} from "./Entities";
import { createId } from "./createId";

export interface RuntimeState {
  players: EntityCollection<Player>;
  cards: EntityCollection<Card>;
  decks: EntityCollection<Deck>;
  battles: EntityCollection<Battle>;
}

export type RuntimeMachine = ReturnType<typeof createRuntime>;

export type RuntimeActions = typeof actions;

export type RuntimeContext = MachineContext<RuntimeState, RuntimeActions>;

const actions = createMachineActions<RuntimeState>()({
  startBattle(state, member1: PlayerId, member2: PlayerId) {
    const battleId = createId<BattleId>();
    const player1Deck = pull(state.decks, pull(state.players, member1).deck);
    const player2Deck = pull(state.decks, pull(state.players, member2).deck);
    state.battles.set(battleId, {
      id: battleId,
      member1: createBattleMember(member1, player1Deck),
      member2: createBattleMember(member2, player2Deck),
    });
    return battleId;
  },
  endTurn(state, battleId: BattleId) {
    const battle = pull(state.battles, battleId);
    const player1 = pull(state.players, battle.member1.playerId);
    const player2 = pull(state.players, battle.member2.playerId);
    if (player1.health <= 0) {
      battle.winner = player2.id;
    } else if (player2.health <= 0) {
      battle.winner = player1.id;
    }
  },
  drawCard(state, battleId: BattleId, playerId: PlayerId) {
    const battle = pull(state.battles, battleId);
    const member = selectBattleMember(battle, playerId);
    const card = member.cards.draw.shift();
    if (!card) {
      throw new Error(`No cards to draw`);
    }
    member.cards.hand.push(card);
  },
  playCard(state, payload: CardPayload & { targetId: PlayerId }) {
    // The card effect is handled by reactions
    // All we need to do here globally is to discard the card
    actions.discardCard(state, payload);
  },
  discardCard(state, { battleId, playerId, cardId }: CardPayload) {
    const battle = pull(state.battles, battleId);
    const member = [battle.member1, battle.member2].find(
      (member) => member.playerId === playerId
    );
    if (!member) {
      throw new Error(`Player ${playerId} not in battle ${battleId}`);
    }
    const index = member.cards.hand.indexOf(cardId);
    if (index === -1) {
      throw new Error(`Card ${cardId} not in hand`);
    }
    member.cards.hand.splice(index, 1);
    member.cards.discard.push(cardId);
  },
});

export interface CardPayload {
  battleId: BattleId;
  playerId: PlayerId;
  cardId: CardId;
}

export function createRuntime(initialState: RuntimeState) {
  return createMachine(initialState)
    .actions(actions)
    .reactions(function* (state, actionName) {
      for (const card of state.cards.values()) {
        yield* card.effects[actionName] ?? [];
      }
    })
    .build();
}

function selectBattleMember(battle: Battle, playerId: PlayerId): BattleMember {
  const member = [battle.member1, battle.member2].find(
    (member) => member.playerId === playerId
  );
  if (!member) {
    throw new Error(`Player ${playerId} not in battle ${battle.id}`);
  }
  return member;
}

function createBattleMember(playerId: PlayerId, deck: Deck): BattleMember {
  return {
    playerId,
    cards: {
      hand: [],
      draw: deck.cards,
      discard: [],
    },
  };
}
