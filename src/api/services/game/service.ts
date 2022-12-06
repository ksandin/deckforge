import { z } from "zod";
import type { Game } from "@prisma/client";
import type { MiddlewareOptions } from "../../trpc";
import { t } from "../../trpc";
import { access } from "../../middlewares/access";
import { createFilterType, createResultType } from "../../utils/search";
import { UserFacingError } from "../../utils/UserFacingError";
import { gameType } from "./types";

export type GameService = ReturnType<typeof createGameService>;

export function createGameService() {
  return t.router({
    create: t.procedure
      .use(access())
      .input(z.object({ name: z.string() }))
      .mutation(async ({ input: data, ctx }) => {
        await ctx.db.game.create({
          data: { ...data, ownerId: ctx.user.userId },
        });
      }),
    read: t.procedure
      .input(gameType.shape.gameId)
      .use((opts) => assertGameAccess(opts, opts.input))
      .output(gameType)
      .query(async ({ input: gameId, ctx }) => {
        const game = await ctx.db.game.findUnique({ where: { gameId } });
        if (!game) {
          throw new UserFacingError("Game not found");
        }
        return game;
      }),
    rename: t.procedure
      .input(gameType.pick({ gameId: true, name: true }))
      .use((opts) => assertGameAccess(opts, opts.input.gameId))
      .mutation(async ({ input: { gameId, name }, ctx }) => {
        await ctx.db.game.update({
          where: { gameId },
          data: { name },
        });
      }),
    delete: t.procedure
      .input(gameType.shape.gameId)
      .use((opts) => assertGameAccess(opts, opts.input))
      .mutation(async ({ input: gameId, ctx }) => {
        await ctx.db.game.delete({ where: { gameId } });
      }),
    list: t.procedure
      .input(createFilterType(z.unknown().optional()))
      .use(access())
      .output(createResultType(gameType))
      .query(async ({ input: { offset, limit }, ctx: { db, user } }) => {
        const [total, entities] = await Promise.all([
          db.game.count({ where: { ownerId: user.userId } }),
          db.game.findMany({
            take: limit,
            skip: offset,
            where: { ownerId: user.userId },
          }),
        ]);
        return { total, entities };
      }),
  });
}

export async function assertGameAccess<Input>(
  { ctx, next }: MiddlewareOptions,
  gameId?: Game["gameId"]
) {
  const game =
    gameId !== undefined
      ? await ctx.db.game.findUnique({
          where: { gameId },
          select: { ownerId: true },
        })
      : undefined;
  if (!ctx.user || game?.ownerId !== ctx.user.userId) {
    throw new UserFacingError("You do not have access to this game");
  }
  return next({ ctx: { auth: ctx.user } });
}