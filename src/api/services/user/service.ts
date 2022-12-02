import { t } from "../../trpc";
import type { JWTUser } from "./types";
import {
  loginPayloadType,
  loginResultType,
  roleToAccessLevel,
  userProfileMutationType,
  userRegisterPayloadType,
} from "./types";
import type { Authenticator } from "./authenticator";

export type UserService = ReturnType<typeof createUserService>;
export function createUserService({ verifyPassword, sign }: Authenticator) {
  return t.router({
    register: t.procedure.input(userRegisterPayloadType).mutation(() => {
      throw new Error("Not implemented");
    }),
    updateProfile: t.procedure.input(userProfileMutationType).mutation(() => {
      throw new Error("Not implemented");
    }),
    login: t.procedure
      .input(loginPayloadType)
      .output(loginResultType)
      .mutation(async ({ ctx, input: { username, password } }) => {
        const user = await ctx.db.user.findFirst({
          where: { name: username },
        });

        const isValidCredentials =
          user && (await verifyPassword(password, user.passwordHash));

        if (!isValidCredentials) {
          return { success: false, message: "Invalid username or password" };
        }

        const jwtUser: JWTUser = {
          id: user.id,
          access: roleToAccessLevel(user.role),
          name: user.name,
        };

        return {
          success: true,
          token: sign(jwtUser),
          user: jwtUser,
        };
      }),
  });
}