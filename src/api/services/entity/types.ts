import type { ZodType } from "zod";
import { z } from "zod";
import type { Property } from "@prisma/client";
import type { PropertyType } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { gameType } from "../game/types";
import { zodNominalString } from "../../../lib/zod-extensions/zodNominalString";
import type { NominalString } from "../../../lib/NominalString";
import { jsonPrimitiveType } from "../../utils/zodJson";

export const entityIdType = z.enum(["player", "card"]);

export type Entity = z.infer<typeof entityType>;
export const entityType = z.object({
  gameId: gameType.shape.gameId,
  entityId: entityIdType,
  name: z.string().min(1).max(32),
});

export const propertyTypeType = z.enum(["string", "number", "boolean"]);

export const propertyValueTypes = {
  string: z.string().default(""),
  number: z.number().default(0),
  boolean: z.boolean().default(false),
};

export type PropertyId = NominalString<"PropertyId">;
export const propertyIdType = zodNominalString<PropertyId>();

export const propertyType = z.object({
  propertyId: propertyIdType,
  name: z.string().min(1).max(32),
  type: propertyTypeType,
  entityId: entityType.shape.entityId,
  gameId: z.string(),
});

export type PropertyRecord = z.infer<typeof propertyRecordType>;
export const propertyRecordType = z.record(propertyType.omit({ name: true }));

export const propertyMutationPayloadType = propertyType;

export const propertyFilterType = propertyType.pick({
  entityId: true,
  gameId: true,
});

export type PropertyValues = z.infer<typeof propertyValuesType>;
export const propertyValuesType = z.record(propertyIdType, jsonPrimitiveType);

export const assertRuntimeProperty = (
  card: Property
): z.infer<typeof propertyType> => {
  const { propertyId, ...rest } = card;
  return {
    ...rest,
    propertyId: propertyId as PropertyId,
  };
};

export const defaultForPropertyType = <T extends PropertyType>(type: T) =>
  propertyValueTypes[type]._def.defaultValue();

export const defaultsForProperties = (properties: Property[]) =>
  properties.reduce(
    (acc, { propertyId, type }) => ({
      ...acc,
      [propertyId]: defaultForPropertyType(type),
    }),
    {} as PropertyValues
  );

export const parserForProperties = (properties: Property[]) =>
  z.object(
    properties.reduce(
      (acc, { propertyId, type }) => ({
        ...acc,
        [propertyId]: propertyValueTypes[type],
      }),
      {} as Record<PropertyId, z.ZodTypeAny>
    )
  ) as ZodType<Prisma.JsonObject>;
