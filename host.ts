import { experimental_defineHostEntry } from "@get-bb/plugin-sdk/host";
import { hostContract, hostSignals } from "./src/host-contract";
import { WatchPool } from "./src/watch-pool";

const pool = new WatchPool();
export default experimental_defineHostEntry({
  contract: hostContract,
  experimental_signals: hostSignals,
  handlers: {
    snapshot: ({ workspacePath }) => pool.snapshot(workspacePath),
    change: ({ workspacePath, changeId }) =>
      pool.change(workspacePath, changeId),
    watch: async (input, context) => {
      await pool.subscribe(input, context);
      return null;
    },
    unwatch: async ({ subscriptionId }) => {
      await pool.unsubscribe(subscriptionId);
      return null;
    },
    reconcile: async ({ subscriptions }, context) => {
      await pool.reconcile(subscriptions, context);
      return null;
    },
    refresh: async ({ workspacePath }) => {
      await pool.refresh(workspacePath);
      return null;
    },
  },
  dispose: () => pool.dispose(),
});
