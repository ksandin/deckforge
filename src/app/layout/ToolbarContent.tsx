import AccountCircle from "@mui/icons-material/AccountCircle";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import type { ReactNode } from "react";
import { MenuOn } from "../components/MenuOn";
import { Auth } from "../features/auth/Auth";
import { OnlineBadge } from "../components/OnlineBadge";
import { useAuth } from "../features/auth/store";
import { LinkMenuItem } from "../components/Link";
import { router } from "../router";
import { UserAccessLevel } from "../../api/services/user/types";

export function ToolbarContent({ children }: { children?: ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <Stack direction="row" alignItems="center" sx={{ flex: 1 }}>
      <Box>{children}</Box>
      <Box sx={{ ml: "auto" }}>
        <MenuOn
          MenuListProps={{ "aria-label": "User menu" }}
          trigger={({ toggle }) => (
            <IconButton
              aria-label="show user menu"
              sx={{ ml: 1 }}
              onClick={toggle}
            >
              {user ? (
                <OnlineBadge data-testid="online-indicator">
                  <AccountCircle />
                </OnlineBadge>
              ) : (
                <AccountCircle />
              )}
            </IconButton>
          )}
        >
          <Auth exact={UserAccessLevel.Guest}>
            <LinkMenuItem to={router.user().login()}>Sign in</LinkMenuItem>
          </Auth>
          <Auth>
            <ListItem sx={{ pt: 0 }}>
              <ListItemText
                primaryTypographyProps={{ noWrap: true }}
                primary={
                  <>
                    Signed in as <strong>{user?.name}</strong>
                  </>
                }
              />
            </ListItem>
            <Divider sx={{ mb: 1 }} />
            <MenuItem onClick={() => logout()}>Sign out</MenuItem>
          </Auth>
        </MenuOn>
      </Box>
    </Stack>
  );
}
