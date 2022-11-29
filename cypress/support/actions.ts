export function signIn() {
  showUserMenu();
  cy.findByRole(/button|menuitem/, { name: /sign in/i }).click();
  // Sign in flow is handled outside the app. Assumes it's completed (i.e. we've enabled a fake)
}

export function signOut() {
  showUserMenu();
  cy.findByRole(/button|menuitem/, { name: /sign out/i }).click();
}

export function assertSignedIn(shouldBeSignedIn = true) {
  cy.findByTestId("online-indicator").should(
    shouldBeSignedIn ? "exist" : "not.exist"
  );
}

export function showUserMenu() {
  cy.findByRole("button", { name: /show user menu/i }).click();
}

export function clickMainMenuOption(name: ElementFilter) {
  ensureMainMenuVisible();
  cy.findByRole("navigation", { name: /main menu/i })
    .findByRole("link", { name })
    .click();
}

function ensureMainMenuVisible() {
  cy.get("body").then(($body) => {
    const [menuTrigger] = $body.find(`button[aria-label="Show main menu"]`);
    if (menuTrigger) {
      menuTrigger.click();
    }
  });
}

export function resetData() {
  cy.exec(`yarn db:reset`);
}

export type ElementFilter =
  | RegExp
  | string
  | ((accessibleName: string, element: Element) => boolean);
