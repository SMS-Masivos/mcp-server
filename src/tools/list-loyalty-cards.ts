import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ApiCall } from "../api-client.js";
import { listLoyaltyCardsInput } from "../schemas.js";
import { SmsmasivosError } from "../errors.js";

interface LoyaltyCard {
  key: string;
  name?: string;
  url?: string;
}

interface ListLoyaltyResponse {
  loyalty_cards: LoyaltyCard[];
}

export function registerListLoyaltyCards(server: McpServer, apiCall: ApiCall) {
  server.tool(
    "list_loyalty_cards",
    "Lista todas las tarjetas de lealtad de tu cuenta. Cada tarjeta tiene un loyalty_key que necesitas para gestionar contactos y registrar ventas.",
    listLoyaltyCardsInput.shape,
    async () => {
      try {
        const result = await apiCall<ListLoyaltyResponse>("/loyalty/get");
        const cards = result.loyalty_cards ?? [];
        if (cards.length === 0) {
          return { content: [{ type: "text" as const, text: "No tienes tarjetas de lealtad." }] };
        }
        const lines = [`${cards.length} tarjeta(s) de lealtad:`];
        for (const card of cards) {
          lines.push(`- ${card.name ?? "Sin nombre"} — key: ${card.key}`);
        }
        return { content: [{ type: "text" as const, text: lines.join("\n") }] };
      } catch (error) {
        const message = error instanceof SmsmasivosError ? error.message : String(error);
        return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
      }
    },
  );
}
