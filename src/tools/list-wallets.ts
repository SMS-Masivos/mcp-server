import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ApiCall } from "../api-client.js";
import { listWalletsInput } from "../schemas.js";
import { SmsmasivosError } from "../errors.js";

interface Wallet {
  key: string;
  name?: string;
  usertool_id?: number;
}

interface ListWalletsResponse {
  wallets: Wallet[];
}

export function registerListWallets(server: McpServer, apiCall: ApiCall) {
  server.tool(
    "list_wallets",
    "Lista todos los monederos electrónicos de tu cuenta. Cada monedero tiene un wallet_key y usertool_id que necesitas para gestionar contactos y saldos.",
    listWalletsInput.shape,
    async () => {
      try {
        const result = await apiCall<ListWalletsResponse>("/wallet/get");
        const wallets = result.wallets ?? [];
        if (wallets.length === 0) {
          return { content: [{ type: "text" as const, text: "No tienes monederos." }] };
        }
        const lines = [`${wallets.length} monedero(s):`];
        for (const w of wallets) {
          lines.push(`- ${w.name ?? "Sin nombre"} — key: ${w.key}, usertool_id: ${w.usertool_id ?? "N/A"}`);
        }
        return { content: [{ type: "text" as const, text: lines.join("\n") }] };
      } catch (error) {
        const message = error instanceof SmsmasivosError ? error.message : String(error);
        return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
      }
    },
  );
}
