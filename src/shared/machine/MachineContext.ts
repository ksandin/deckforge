import type { MachineActionRecord } from "./MachineAction";

export type MachineContext<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  State = any,
  Actions extends MachineActionRecord = MachineActionRecord
> = {
  state: State;
  actions: Actions;
};
