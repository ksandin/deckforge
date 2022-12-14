import MenuItem from "@mui/material/MenuItem";
import { useSelector } from "../../../store";
import { useActions } from "../../../../lib/useActions";
import { useMenu } from "../../../hooks/useMenu";
import { Tree } from "../../../components/Tree";
import { editorActions } from "../actions";
import { selectors } from "../selectors";
import { useConfirmDelete, usePromptCreate, usePromptRename } from "../hooks";
import type { DeckId } from "../../../../api/services/game/types";
import { PanelEmptyState } from "../components/PanelEmptyState";
import { Panel } from "../components/Panel";
import { Card, Deck } from "../../../components/icons";
import type { PanelProps } from "./definition";

export function DecksPanel(props: PanelProps) {
  const decks = useSelector(selectors.decksAndCards);
  const confirmDelete = useConfirmDelete();
  const promptRename = usePromptRename();
  const promptCreate = usePromptCreate();
  const { createDeck, createCard, selectObject } = useActions(editorActions);
  const selectedObjectId = useSelector(selectors.selectedObject);

  const promptCreateCard = (deckId: DeckId) =>
    promptCreate("card", (name) => createCard({ name, deckId }));
  const promptCreateDeck = () =>
    promptCreate("deck", (name) => createDeck({ name }));

  const openContextMenu = useMenu([
    <MenuItem onClick={promptCreateDeck}>New deck</MenuItem>,
  ]);

  return (
    <Panel onContextMenu={openContextMenu} {...props}>
      <Tree
        selected={selectedObjectId}
        onSelectedChanged={selectObject}
        items={decks.map((deck) => ({
          nodeId: deck.objectId,
          label: deck.name,
          icon: <Deck />,
          onDoubleClick: () => promptRename(deck),
          contextMenu: [
            <MenuItem onClick={() => promptRename(deck)}>Rename</MenuItem>,
            <MenuItem onClick={() => promptCreateCard(deck.deckId)}>
              New card
            </MenuItem>,
            <MenuItem onClick={() => confirmDelete(deck)}>Delete</MenuItem>,
          ],
          children: deck.cards.map((card) => ({
            nodeId: card.objectId,
            label: card.name,
            icon: <Card />,
            onDoubleClick: () => promptRename(card),
            contextMenu: [
              <MenuItem onClick={() => promptRename(card)}>Rename</MenuItem>,
              <MenuItem onClick={() => confirmDelete(card)}>Delete</MenuItem>,
            ],
          })),
        }))}
      />
      {decks.length === 0 && (
        <PanelEmptyState>This game has no decks</PanelEmptyState>
      )}
    </Panel>
  );
}
