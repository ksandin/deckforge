import type { ParamParser } from "react-typesafe-routes/src/paramParser";

export function literalParser<Value extends string>(
  values?: Value[]
): ParamParser<Value> {
  return {
    parse: (s: string) => {
      if (values && !values.includes(s as Value)) {
        throw new Error(`Must be one of: ${values.join(", ")}`);
      }
      return s as Value;
    },
    serialize: (x: Value) => x,
  };
}

export function optionalLiteralParser<Value extends string>(
  values?: Value[]
): ParamParser<Value | undefined> {
  return {
    parse: (s: string) => {
      if (values && !values.includes(s as Value)) {
        throw new Error(`Must be one of: ${values.join(", ")}`);
      }
      return s ? (s as Value) : undefined;
    },
    serialize: (x?: Value) => x ?? "",
  };
}
