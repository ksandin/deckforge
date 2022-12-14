import ListItem from "@mui/material/ListItem";
import Checkbox from "@mui/material/Checkbox";
import TextField from "@mui/material/TextField";
import type { ComponentType, HTMLAttributes } from "react";
import FormControlLabel from "@mui/material/FormControlLabel";
import List from "@mui/material/List";
import produce from "immer";
import { useMemo } from "react";
import Tooltip from "@mui/material/Tooltip";
import type {
  Property,
  PropertyDefaults,
  PropertyValueType,
  PrimitiveTypes,
  TypeOfPropertyValue,
} from "../../../../../api/services/game/types";
import { ZodControl } from "../../../../controls/ZodControl";
import { propertyValue } from "../../../../../api/services/game/types";
import { useDebouncedControl } from "../../../../hooks/useDebouncedControl";

export function PropertyDefaultsEditor({
  properties,
  defaults,
  onChange,
}: {
  properties: Property[];
  defaults: PropertyDefaults;
  onChange: (updated: PropertyDefaults) => void;
}) {
  return (
    <List>
      {properties.map(
        <ValueType extends PropertyValueType>({
          propertyId,
          name,
          type,
        }: Property) => (
          <ListItem key={propertyId}>
            <PropertyValueEditor
              type={type}
              name={name}
              value={
                defaults[propertyId] as
                  | TypeOfPropertyValue<ValueType>
                  | undefined
              }
              onChange={(newValue) =>
                onChange(
                  produce(defaults, (draft) => {
                    draft[propertyId] = newValue;
                  })
                )
              }
            />
          </ListItem>
        )
      )}
    </List>
  );
}

export function PropertyValueEditor<
  ValueType extends PropertyValueType,
  Foo extends keyof PrimitiveTypes
>({
  type,
  name,
  value: valueOrUndefined,
  onChange,
}: {
  type: ValueType;
  name: string;
  value?: TypeOfPropertyValue<ValueType>;
  onChange: (newValue: TypeOfPropertyValue<ValueType>) => void;
}) {
  const value = useMemo(
    () => valueOrUndefined ?? propertyValue.defaultOf(type),
    [valueOrUndefined, type]
  );

  const control = useDebouncedControl({ value, onChange });

  if (propertyValue.isObject(type)) {
    return (
      <ZodControl
        schema={propertyValue.valueTypeOf(type)}
        value={control.value}
        onChange={control.setValue}
        label={name}
      />
    );
  }

  if (!propertyValue.isTypeName(type)) {
    return null;
  }

  type ExactPrimitiveControl = ComponentType<
    ControlProps<TypeOfPropertyValue<ValueType>>
  >;
  const PrimitiveControl = primitiveControls[type] as
    | ExactPrimitiveControl
    | undefined;

  if (!PrimitiveControl) {
    return (
      <>
        {name}{" "}
        <Tooltip title={`Cannot edit. No control exists for type "${type}"`}>
          <span>({String(type)})</span>
        </Tooltip>
      </>
    );
  }

  return (
    <PrimitiveControl
      label={name}
      value={control.value}
      onChange={control.setValue}
    />
  );
}

type ControlProps<Value> = {
  label?: string;
  value: Value;
  onChange: (value: Value) => void;
} & Omit<HTMLAttributes<unknown>, "onChange">;

const primitiveControls: {
  [K in keyof PrimitiveTypes]?: ComponentType<ControlProps<PrimitiveTypes[K]>>;
} = {
  boolean: ({ label, value, onChange }) => (
    <FormControlLabel
      label={label}
      control={
        <Checkbox
          size="small"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
        />
      }
    />
  ),
  string: ({ label, value, onChange }) => (
    <TextField
      size="small"
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
  number: ({ label, value, onChange }) => (
    <TextField
      size="small"
      label={label}
      type="number"
      value={value}
      onChange={(e) => onChange((e.target as HTMLInputElement).valueAsNumber)}
    />
  ),
};
