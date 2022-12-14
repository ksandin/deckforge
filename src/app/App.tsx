import CssBaseline from "@mui/material/CssBaseline";
import GlobalStyles from "@mui/material/GlobalStyles";
import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import ThemeProvider from "@mui/material/styles/ThemeProvider";
import type { Theme } from "@mui/material";
import type { TRPCClient } from "@trpc/client";
import { Router } from "react-router";
import { RouterSwitch } from "react-typesafe-routes";
import type { History } from "history";
import type { ApiRouter } from "../api/router";
import { ModalOutlet } from "../lib/useModal";
import { Layout } from "./features/layout/Layout";
import { trpc } from "./trpc";
import { router } from "./router";
import {
  ErrorBoundary,
  PlainErrorFallback,
  PrettyErrorFallback,
} from "./ErrorBoundary";
import { MenuOutlet } from "./hooks/useMenu";

export function App({
  trpcClient,
  queryClient,
  theme,
  history,
}: {
  trpcClient: TRPCClient<ApiRouter>;
  queryClient: QueryClient;
  theme: Theme;
  history: History;
}) {
  // Note: We cannot use React.StrictMode because react-mosaic-component does not support it
  return (
    <ErrorBoundary fallback={PlainErrorFallback} onError={console.error}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <Router history={history}>
            <ThemeProvider theme={theme}>
              <CssBaseline />
              {globalStyles}
              <Layout>
                <ErrorBoundary
                  fallback={PrettyErrorFallback}
                  onError={console.error}
                >
                  <RouterSwitch router={router} />
                  <ModalOutlet />
                </ErrorBoundary>
              </Layout>
              <MenuOutlet />
            </ThemeProvider>
          </Router>
        </QueryClientProvider>
      </trpc.Provider>
    </ErrorBoundary>
  );
}

const globalStyles = (
  <GlobalStyles
    styles={{
      [`html, body, #root`]: {
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      },
      a: {
        [`&:hover, &:link, &:visited, &:active`]: {
          textDecoration: "none",
        },
      },
    }}
  />
);
