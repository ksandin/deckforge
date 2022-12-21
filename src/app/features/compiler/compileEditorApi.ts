import type { Game } from "../../../api/services/game/types";
import type { CodeEditorTypeDefs } from "../../components/CodeEditor";
import type { Property } from "../../../api/services/game/types";

export interface EditorApi {
  card: EditorObjectApi;
  event: EditorObjectApi;
}

export interface EditorObjectApi {
  factoryVariableName: string;
  typeDefs: CodeEditorTypeDefs;
}

export function compileEditorApi(game: Game): EditorApi {
  const { properties } = game.definition;
  const playerProperties = properties.filter((p) => p.entityId === "player");
  const cardProperties = properties.filter((p) => p.entityId === "card");
  const common: CodeEditorTypeDefs = add(
    defineInterface("Player", playerProperties),
    defineInterface("Card", cardProperties),
    defineInterface("Effects", [])
  );
  return {
    card: {
      factoryVariableName: "card",
      typeDefs: add(
        common,
        defineGlobalVariable({
          name: "card",
          type: defineFactoryType({
            inputType: "Card",
            outputType: "Events",
          }),
        })
      ),
    },
    event: {
      factoryVariableName: "event",
      typeDefs: add(
        common,
        defineGlobalVariable({ name: "event", type: "Effects" })
      ),
    },
  };
}

function defineFactoryType(p: { inputType: string; outputType: string }) {
  return `(definition: ${p.inputType}) => ${p.outputType}`;
}

function defineGlobalVariable(p: { name: string; type: string }): string {
  return `declare let ${p.name}: ${p.type};`;
}

function defineInterface(interfaceName: string, properties: Property[]) {
  return `interface ${interfaceName} {\n${properties
    .map(defineProperty)
    .join(";\n")}\n}`;
}

function defineProperty(property: Property) {
  return `\t${property.name}: ${property.type}`;
}

function add(...args: CodeEditorTypeDefs[]): CodeEditorTypeDefs {
  return args.join("\n");
}