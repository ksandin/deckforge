import { findMainMenuOption, resetData } from "../support/actions/common";
import type { TestUser } from "../support/actions/user";
import {
  assertSignedIn,
  assertSignedOut,
  nextTestUser,
  register,
  signIn,
  signOut,
  updateProfile,
} from "../support/actions/user";

beforeEach(() => {
  resetData();
  cy.visit("/");
});

describe("guest", () => {
  it("can not see link to build page in menu", () => {
    findMainMenuOption("Admin").should("not.exist");
  });

  it("is not given access when attempting to sign in with bogus credentials", () => {
    signIn("bogus", "credentials", { waitForRedirect: false });
    assertSignedOut();
  });
});

describe("user", () => {
  let user: TestUser;
  beforeEach(() => {
    cy.visit("/");
    user = nextTestUser();
    register(user.name, user.password, user.email);
  });

  it("is signed in after registering", () => {
    assertSignedIn(user.name);
  });

  it("can sign in", () => {
    signOut();
    signIn(user.name, user.password);
    assertSignedIn(user.name);
  });

  it("can change their email", () => {
    updateProfile({ email: "new@email.com" });
    signOut();
    cy.visit("/"); // Reload to clear any potential form cache
    signIn(user.name, user.password);
    cy.findByLabelText("Email").should("have.value", "new@email.com");
  });

  it("can change their password", () => {
    updateProfile({ password: "password2" });
    signOut();
    signIn(user.name, "password2");
    assertSignedIn(user.name);
  });
});