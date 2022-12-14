import { original } from "immer";
import { createMachine } from "./Machine";
import type { MachineEffect } from "./MachineAction";

describe("Machine", () => {
  describe("actions", () => {
    it("performs to the correct action", () => {
      const fn = jest.fn();
      const machine = createActionMachine(fn);
      machine.actions.b();
      expect(fn).not.toHaveBeenCalled();
      machine.actions.a();
      expect(fn).toHaveBeenCalled();
    });

    it("can receive state", () => {
      let receivedState: unknown;
      const machine = createActionMachine((state) => {
        receivedState = original(state);
      });
      const startState = machine.state;
      machine.actions.a();
      expect(receivedState).toEqual(startState);
    });

    it("can update state", () => {
      const machine = createActionMachine((state) => {
        state.value = "Updated";
      });
      machine.actions.a();
      expect(machine.state.value).toBe("Updated");
    });

    it("updates does not mutate current state", () => {
      const machine = createActionMachine((state) => {
        state.value = "Updated";
      });
      const stateBeforeAction = machine.state;
      machine.actions.a();
      expect(machine.state.value).toBe("Updated");
      expect(stateBeforeAction.value).not.toBe("Updated");
    });
  });

  describe("reactions", () => {
    it("reacts to the correct actions", () => {
      const fn = jest.fn();
      const machine = createReactionMachine(fn);
      machine.actions.b();
      expect(fn).not.toHaveBeenCalled();
      machine.actions.a();
      expect(fn).toHaveBeenCalled();
    });

    it("effects may return an additional effect that will be called after reactions", () => {
      const output: unknown[] = [];
      const machine = createMachine({
        reactions: {
          a: () => {
            output.push("state-reaction");
          },
        },
      })
        .effects({
          a: () => {
            output.push("effect");
            return () => {
              output.push("returned-reaction");
            };
          },
        })
        .reactions((state, effectName) => [state.reactions[effectName]])
        .build();
      machine.actions.a();
      expect(output).toEqual(["effect", "state-reaction", "returned-reaction"]);
    });

    it("can receive state", () => {
      let receivedState: unknown;
      const machine = createReactionMachine((state) => {
        receivedState = original(state);
      });
      const startState = machine.state;
      machine.actions.a();
      expect(receivedState).toEqual(startState);
    });

    it("can update state", () => {
      const machine = createReactionMachine((state) => {
        state.value = "Updated";
      });
      machine.actions.a();
      expect(machine.state.value).toBe("Updated");
    });

    it("updates does not mutate current state", () => {
      const machine = createReactionMachine((state) => {
        state.value = "Updated";
      });
      const stateBeforeAction = machine.state;
      machine.actions.a();
      expect(machine.state.value).toBe("Updated");
      expect(stateBeforeAction.value).not.toBe("Updated");
    });
  });

  describe("execution context", () => {
    it("state changes from actions are reflected in the context state draft", () => {
      const machine = createMachine({ value: "start" })
        .effects({
          change(state) {
            state.value = "changed";
          },
        })
        .build();

      machine.execute((state) => {
        machine.actions.change();
        expect(state.value).toBe("changed");
      });
    });

    it("actions impact machine state once execution finishes", () => {
      const machine = createMachine({ count: 0 })
        .effects({
          increase(state) {
            state.count++;
          },
        })
        .build();

      machine.execute(() => {
        machine.actions.increase();
        machine.actions.increase();
        machine.actions.increase();
        expect(machine.state.count).toBe(0);
      });

      expect(machine.state.count).toBe(3);
    });
  });

  it("can subscribe to state changes", () => {
    const machine = createMachine({ count: 0 })
      .effects({
        increase(state) {
          state.count++;
        },
      })
      .build();

    const fn = jest.fn();
    machine.subscribe(fn);
    machine.actions.increase();
    expect(fn).toHaveBeenCalledWith(expect.objectContaining({ count: 1 }));
  });

  it("can unsubscribe from state changes", () => {
    const machine = createMachine({ count: 0 })
      .effects({
        increase(state) {
          state.count++;
        },
      })
      .build();

    const fn = jest.fn();
    const unsub = machine.subscribe(fn);
    machine.actions.increase();
    unsub();
    machine.actions.increase();

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("can define a middleware", () => {
    const machine = createMachine({ count: 0, trace: [] as unknown[] })
      .effects({
        increase(state, by: number) {
          state.count += by;
        },
        decrease(state, by: number) {
          state.count -= by;
        },
      })
      .middleware((state, action, next) => {
        state.trace.push(action);
        next();
      })
      .build();

    machine.actions.increase(5);
    machine.actions.decrease(3);
    expect(machine.state.count).toBe(2);
    expect(machine.state.trace).toEqual([
      { name: "increase", payload: 5 },
      { name: "decrease", payload: 3 },
    ]);
  });

  it("can define multiple middlewares", () => {
    const machine = createMachine({ trace: [] as unknown[] })
      .effects({
        foo() {},
      })
      .middleware((state, action, next) => {
        state.trace.push("first");
        next();
      })
      .middleware((state, action, next) => {
        state.trace.push("second");
        next();
      })
      .middleware((state, action, next) => {
        state.trace.push("third");
        next();
      })
      .build();

    machine.actions.foo();
    machine.actions.foo();
    expect(machine.state.trace).toEqual([
      "first",
      "second",
      "third",
      "first",
      "second",
      "third",
    ]);
  });

  it("can implement failsafe actions using middleware", () => {
    const errors: unknown[] = [];
    const error = new Error();
    const machine = createMachine({ calls: [] as string[] })
      .effects({
        fail(state, payload?: number) {
          throw error;
          // noinspection UnreachableCodeJS
          state.calls.push("fail");
        },
        succeed(state) {
          state.calls.push("succeed");
        },
      })
      .middleware((state, action, next) => {
        try {
          next();
        } catch (error) {
          errors.push({ action, error });
        }
      })
      .build();
    machine.actions.fail(5);
    machine.actions.succeed();
    expect(errors).toEqual([{ action: { name: "fail", payload: 5 }, error }]);
    expect(machine.state.calls).toEqual(["succeed"]);
  });
});

function createActionMachine(fn: MachineEffect) {
  return createMachine({ value: undefined as unknown })
    .effects({
      a(state, n?: number) {
        return fn(state, n);
      },
      b() {},
    })
    .build();
}

function createReactionMachine(fn: MachineEffect) {
  return createMachine({
    value: undefined as unknown,
    reactions: { a: [fn], b: [] },
  })
    .effects({ a(state, n?: number) {}, b() {} })
    .reactions((state, actionName) => state.reactions[actionName])
    .build();
}
