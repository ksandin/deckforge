import type { ZodRawShape, ZodType } from "zod";
import {
  ZodAny,
  ZodArray,
  ZodBigInt,
  ZodBoolean,
  ZodDate,
  ZodDefault,
  ZodEffects,
  ZodEnum,
  ZodFunction,
  ZodIntersection,
  ZodLazy,
  ZodLiteral,
  ZodMap,
  ZodNever,
  ZodNull,
  ZodNullable,
  ZodNumber,
  ZodObject,
  ZodOptional,
  ZodPromise,
  ZodRecord,
  ZodString,
  ZodTuple,
  ZodUndefined,
  ZodUnion,
  ZodUnknown,
  ZodVoid,
} from "zod";
import { memoize } from "lodash";

export interface ZodToTSOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lazyResolvers?: Map<ZodLazy<any>, string>;
  resolvers?: Map<ZodType, string>;
  indentation: number;
}

export function zodToTS(
  type: ZodType,
  { indentation = 0, ...rest }: Partial<ZodToTSOptions> = {}
): string {
  return zodToTSImpl(type, { indentation, ...rest }, []);
}

function zodToTSImpl(
  type: ZodType,
  options: ZodToTSOptions,
  path: string[]
): string {
  const zodToTS = (type: ZodType, addToPath?: string) =>
    zodToTSImpl(
      type,
      { ...options, indentation: options.indentation + 1 },
      addToPath !== undefined ? [...path, addToPath] : path
    );

  const resolved = options.resolvers?.get(type);
  if (resolved !== undefined) {
    return resolved;
  }

  // Direct types
  if (type instanceof ZodString) {
    return "string";
  }
  if (type instanceof ZodNumber) {
    return "number";
  }
  if (type instanceof ZodBoolean) {
    return "boolean";
  }
  if (type instanceof ZodDate) {
    return "Date";
  }
  if (type instanceof ZodBigInt) {
    return "bigint";
  }
  if (type instanceof ZodVoid) {
    return "void";
  }
  if (type instanceof ZodUnknown) {
    return "unknown";
  }
  if (type instanceof ZodNull) {
    return "null";
  }
  if (type instanceof ZodUndefined) {
    return "undefined";
  }
  if (type instanceof ZodNever) {
    return "never";
  }
  if (type instanceof ZodAny) {
    return "any";
  }

  // Variance
  if (type instanceof ZodOptional) {
    return `${zodToTS(type._def.innerType)} | undefined`;
  }
  if (type instanceof ZodEffects) {
    return zodToTS(type.innerType());
  }
  if (type instanceof ZodDefault) {
    return zodToTS(type._def.innerType);
  }
  if (type instanceof ZodNullable) {
    return `${zodToTS(type._def.innerType)} | null`;
  }

  // Compositions
  if (type instanceof ZodObject) {
    const properties = Object.entries(type.shape as ZodRawShape);
    const propertyStrings = properties.map(([propName, propType]) => {
      const [isOptional, typeWithoutOptional] = extractOptional(propType);
      return `${indent(options.indentation + 1)}${propName}${
        isOptional ? "?" : ""
      }: ${zodToTS(typeWithoutOptional, propName)}`;
    });
    switch (propertyStrings.length) {
      case 0:
        return "{}";
      case 1:
        return `{ ${propertyStrings[0].trim()} }`;
      default:
        return `{\n${propertyStrings.join(";\n")}\n${indent(
          options.indentation
        )}}`;
    }
  }
  if (type instanceof ZodFunction) {
    return `(...args: ${zodToTS(type._def.args, "args")}) => ${zodToTS(
      type._def.returns,
      "returns"
    )}`;
  }
  if (type instanceof ZodPromise) {
    return `Promise<${zodToTS(type._def.type)}>`;
  }
  if (type instanceof ZodEnum) {
    return type._def.values.map((v: unknown) => JSON.stringify(v)).join(" | ");
  }
  if (type instanceof ZodRecord) {
    return `{ [key: string]: ${zodToTS(type._def.valueType)} }`;
  }
  if (type instanceof ZodMap) {
    return `Map<${zodToTS(type._def.keyType)}, ${zodToTS(
      type._def.valueType
    )}>`;
  }
  if (type instanceof ZodLiteral) {
    return JSON.stringify(type._def.value);
  }
  if (type instanceof ZodArray) {
    return `${zodToTS(type._def.type)}[]`;
  }
  if (type instanceof ZodTuple) {
    return `[${type._def.items.map(zodToTS).join(", ")}]`;
  }
  if (type instanceof ZodUnion) {
    return type._def.options.map(zodToTS).join(" | ");
  }
  if (type instanceof ZodIntersection) {
    return `${zodToTS(type._def.left, "left")} & ${zodToTS(
      type._def.right,
      "right"
    )}`;
  }
  if (type instanceof ZodLazy) {
    const resolved = options.lazyResolvers?.get(type);
    if (resolved === undefined) {
      throw new Error(
        "No resolver provided for lazy type at path: " + path.join(".")
      );
    }
    return resolved;
  }

  throw new Error(
    `Unsupported type: ${"typeName" in type._def ? type._def.typeName : type}`
  );
}

function extractOptional(type: ZodType): [boolean, ZodType] {
  if (type instanceof ZodOptional) {
    return [true, type._def.innerType];
  }
  if (type instanceof ZodEffects) {
    return extractOptional(type.innerType());
  }
  if (type instanceof ZodNullable || type instanceof ZodDefault) {
    return extractOptional(type._def.innerType);
  }
  return [false, type];
}

const indent = memoize((indentation: number) => "\t".repeat(indentation));