import MenuItem from "@mui/material/MenuItem";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { useSelector } from "../../../store";
import { useActions } from "../../../../lib/useActions";
import { useMenu } from "../../../hooks/useMenu";
import { Tree, TreeItem } from "../../../components/Tree";
import { editorActions } from "../actions";
import { selectors } from "../selectors";
import { useConfirmDelete, usePromptCreate, usePromptRename } from "../hooks";
import type { DeckId } from "../../../../api/services/game/types";

export function DeckTree() {
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
    <Box onContextMenu={openContextMenu} sx={{ flex: 1 }}>
      <Tree selected={selectedObjectId} onSelectedChanged={selectObject}>
        {decks.map((deck, index) => (
          <TreeItem
            key={index}
            nodeId={deck.objectId}
            label={deck.name}
            contextMenu={[
              <MenuItem onClick={() => promptRename(deck)}>Rename</MenuItem>,
              <MenuItem onClick={() => promptCreateCard(deck.deckId)}>
                New card
              </MenuItem>,
              <MenuItem onClick={() => confirmDelete(deck)}>Delete</MenuItem>,
            ]}
          >
            {deck.cards.map((card, index) => (
              <TreeItem
                key={index}
                nodeId={card.objectId}
                label={card.name}
                contextMenu={[
                  <MenuItem onClick={() => promptRename(card)}>
                    Rename
                  </MenuItem>,
                  <MenuItem onClick={() => confirmDelete(card)}>
                    Delete
                  </MenuItem>,
                ]}
              />
            ))}
          </TreeItem>
        ))}
      </Tree>
      {decks.length === 0 && (
        <Box sx={{ textAlign: "center", color: "text.secondary" }}>
          This game has no decks
          <br />
          <Button variant="contained" sx={{ mt: 2 }} onClick={promptCreateDeck}>
            Create a deck
          </Button>
        </Box>
      )}
    </Box>
  );
}
