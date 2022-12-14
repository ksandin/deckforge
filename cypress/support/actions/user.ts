export function register(
  username: string,
  password: string,
  email: string,
  { waitForRedirect = true } = {}
) {
  showUserMenu().within(() => {
    cy.findByRole(/link/, { name: /register/i }).click();
  });

  cy.url().then((registerPageUrl) => {
    cy.findByRole("form")
      .within(() => {
        cy.findByLabelText("Username").type(username);
        cy.findByLabelText("Email").type(email);
        cy.findByLabelText("Password").type(password);
        cy.findByLabelText("Password (confirm)").type(password);
      })
      .submit();
    if (waitForRedirect) {
      cy.url().should("not.equal", registerPageUrl);
    }
  });
}

export function signIn(
  username: string,
  password: string,
  { waitForRedirect = true } = {}
) {
  showUserMenu().within(() => {
    cy.findByRole(/link/, { name: /sign in/i }).click();
  });

  cy.url().then((signInPageUrl) => {
    cy.findByRole("form")
      .within(() => {
        cy.findByLabelText("Username").type(username);
        cy.findByLabelText("Password").type(password);
      })
      .submit();
    if (waitForRedirect) {
      cy.url().should("not.equal", signInPageUrl);
    }
  });
}

export function gotoProfile() {
  showUserMenu().within(() => {
    cy.findByRole(/link/, { name: /settings/i }).click();
  });
}

export function updateProfile({
  password,
  email,
}: {
  password?: string;
  email?: string;
}) {
  cy.findByRole("form")
    .within(() => {
      if (email !== undefined) {
        cy.findByLabelText(/email/i).clear().type(email);
      }
      if (password !== undefined) {
        cy.findByLabelText("New password").clear().type(password);
        cy.findByLabelText("New password (confirm)").clear().type(password);
      }
    })
    .submit();

  cy.findByRole("alert").should("contain", "Profile updated");
}

export function assertProfile({ email }: { email: string }) {
  cy.findByLabelText("Email").should("have.value", email);
}

export function signOut() {
  showUserMenu().within(() => {
    cy.findByRole(/button|menuitem/, { name: /sign out/i }).click();
  });
}

export function showUserMenu() {
  cy.findByRole("button", { name: /show user menu/i }).click();
  return findUserMenu();
}

export function findUserMenu() {
  return cy.findByRole("menu", { name: /user menu/i });
}

export function closeUserMenu() {
  cy.get("body").click("bottomRight");
  findUserMenu().should("not.exist");
}

export function assertSignedIn(username?: string) {
  showUserMenu().contains("Signed in" + (username ? ` as ${username}` : ""));
  closeUserMenu();
}

export function assertSignedOut() {
  showUserMenu().should("not.contain", "Signed in");
}

export type TestUser = ReturnType<typeof nextTestUser>;
let testUserCount = 0;

export function nextTestUser() {
  const id = testUserCount++;
  return {
    name: "testUser" + id,
    password: "foobarfoobar",
    email: `test${id}@users.com`,
  };
}
