import { experimental_defineHostEntry } from "@get-bb/plugin-sdk/host";
import { hostContract, hostSignals } from "./src/host-contract";
import { WatchPool } from "./src/watch-pool";
import { SourceResolver } from "./src/source-resolver";

const pool = new WatchPool();
const resolver = new SourceResolver();
async function resolved(input: {
  workspacePath: string;
  storeId?: string | null;
}) {
  return resolver.resolve(input.workspacePath, input.storeId);
}
export default experimental_defineHostEntry({
  contract: hostContract,
  experimental_signals: hostSignals,
  handlers: {
    resolve: resolved,
    catalog: ({ workspacePath }) => resolver.catalog(workspacePath),
    specifications: async (input) => pool.specifications((await resolved(input)).rootPath),
    specification: async (input) => pool.specification((await resolved(input)).rootPath, input.capabilityId, input.changeId),
    snapshot: async (input) => pool.snapshot((await resolved(input)).rootPath),
    change: async (input) =>
      pool.change((await resolved(input)).rootPath, input.changeId),
    watch: async (input, context) => {
      const source = await resolved(input);
      await pool.subscribe(
        { ...input, workspacePath: source.rootPath },
        context,
      );
      return null;
    },
    unwatch: async ({ subscriptionId }) => {
      await pool.unsubscribe(subscriptionId);
      return null;
    },
    reconcile: async ({ subscriptions }, context) => {
      // Reconnect rechecks registry/config as well as files, without a periodic CLI process.
      for (const input of subscriptions) resolver.clear(input.workspacePath);
      const inputs = await Promise.all(
        subscriptions.map(async (input) => ({
          ...input,
          workspacePath: (await resolved(input)).rootPath,
        })),
      );
      await pool.reconcile(inputs, context);
      return null;
    },
    refresh: async (input) => {
      resolver.clear(input.workspacePath);
      await pool.refresh((await resolved(input)).rootPath);
      return null;
    },
  },
  dispose: async () => {
    resolver.clear();
    await pool.dispose();
  },
});
