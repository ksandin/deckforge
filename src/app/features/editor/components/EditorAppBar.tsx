import Stack from "@mui/material/Stack";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { selectors } from "../selectors";
import { useSelector } from "../../../store";
import { useActions } from "../../../../lib/useActions";
import { editorActions } from "../actions";
import { Edit, ExitToApp } from "../../../components/icons";
import { useModal } from "../../../../lib/useModal";
import { PromptDialog } from "../../../dialogs/PromptDialog";
import { LinkIconButton } from "../../../components/Link";
import { router } from "../../../router";
import { AppBar } from "../../layout/AppBar";

export default function EditorAppBar() {
  const prompt = useModal(PromptDialog);
  const game = useSelector(selectors.game);
  const { renameGame } = useActions(editorActions);

  async function promptRename() {
    const newName = await prompt({
      title: "Rename game",
      fieldProps: { label: "New name", defaultValue: game.name },
    });
    if (newName) {
      renameGame(newName);
    }
  }

  return (
    <AppBar container={false}>
      <Stack direction="row" sx={{ display: "flex" }}>
        <Tooltip title="Leave editor">
          <div>
            <LinkIconButton edge="start" to={router.build()}>
              <ExitToApp />
            </LinkIconButton>
          </div>
        </Tooltip>
        <Box sx={{ flex: 1, display: "flex", alignItems: "space-around" }}>
          <Stack
            direction="row"
            spacing={2}
            alignItems="center"
            sx={{ margin: "auto" }}
          >
            <Typography>{game.name}</Typography>
            <Tooltip title="Rename">
              <div>
                <IconButton onClick={promptRename}>
                  <Edit />
                </IconButton>
              </div>
            </Tooltip>
          </Stack>
        </Box>
      </Stack>
    </AppBar>
  );
}