import TextField from "@mui/material/TextField";
import type { FormEvent } from "react";
import { useRef } from "react";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import { Page } from "../../layout/Page";
import { Center } from "../../../components/Center";
import { useAuth } from "../store";
import { Link } from "../../../components/Link";
import { router } from "../../../router";
import { ProgressButton } from "../../../components/ProgressButton";

export default function LoginPage() {
  const { login } = useAuth();
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();

    login.mutateAsync({
      username: usernameRef.current?.value ?? "",
      password: passwordRef.current?.value ?? "",
    });
  }

  return (
    <Page>
      <Center>
        <form name="login" onSubmit={submit}>
          <Stack direction="column" spacing={2} sx={{ width: 350 }}>
            <TextField size="small" label="Username" inputRef={usernameRef} />
            <TextField
              size="small"
              type="password"
              label="Password"
              inputRef={passwordRef}
            />
            <Stack direction="row" spacing={2} alignItems="center">
              <Typography color="error" sx={{ flex: 1 }}>
                {login.error?.message}
              </Typography>
              <div>
                <ProgressButton
                  isLoading={login.isLoading}
                  type="submit"
                  variant="contained"
                >
                  Sign in
                </ProgressButton>
              </div>
            </Stack>
            <Box sx={{ textAlign: "right" }}>
              <Link to={router.user().register()}>Register an account</Link>
            </Box>
          </Stack>
        </form>
      </Center>
    </Page>
  );
}
