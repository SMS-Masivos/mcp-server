import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ApiCall } from "../api-client.js";
import { metrics } from "../metrics.js";
import { SmsmasivosError } from "../errors.js";
import { registerCheckBalance } from "./check-balance.js";
import { registerSendSms } from "./send-sms.js";
import { registerListAgendas } from "./list-agendas.js";
import { registerGetContacts } from "./get-contacts.js";
import { registerAddContact } from "./add-contact.js";
import { registerGetCampaignStats } from "./get-campaign-stats.js";
import { registerVerifyPhone } from "./verify-phone.js";
import { registerCheckVerification } from "./check-verification.js";
import { registerListCampaigns } from "./list-campaigns.js";
import { registerGetMetrics } from "./get-metrics.js";
import { registerDeleteContact } from "./delete-contact.js";
import { registerListLoyaltyCards } from "./list-loyalty-cards.js";
import { registerAddLoyaltyContact } from "./add-loyalty-contact.js";
import { registerGetLoyaltyContact } from "./get-loyalty-contact.js";
import { registerRegisterLoyaltySale } from "./register-loyalty-sale.js";
import { registerListWallets } from "./list-wallets.js";
import { registerAddWalletContact } from "./add-wallet-contact.js";
import { registerGetWalletContact } from "./get-wallet-contact.js";
import { registerUpdateWalletBalance } from "./update-wallet-balance.js";

function createInstrumentedApiCall(apiCall: ApiCall): ApiCall {
  return async <T>(endpoint: string, params?: Record<string, unknown>): Promise<T> => {
    const start = performance.now();
    const isSandbox = params?.sandbox === "1" || params?.sandbox === 1;
    try {
      const result = await apiCall<T>(endpoint, params);
      metrics.recordCall(endpoint, performance.now() - start, isSandbox);
      return result;
    } catch (error) {
      metrics.recordCall(endpoint, performance.now() - start, isSandbox);
      metrics.recordError(endpoint, error instanceof SmsmasivosError ? error.code ?? error.constructor.name : "Unknown");
      throw error;
    }
  };
}

export function registerAllTools(server: McpServer, apiCall: ApiCall) {
  const instrumented = createInstrumentedApiCall(apiCall);

  // Fase 1
  registerCheckBalance(server, instrumented);
  registerSendSms(server, instrumented);
  registerListAgendas(server, instrumented);
  registerGetContacts(server, instrumented);
  registerAddContact(server, instrumented);
  registerGetCampaignStats(server, instrumented);
  registerVerifyPhone(server, instrumented);
  registerCheckVerification(server, instrumented);
  registerListCampaigns(server, instrumented);

  // Fase 2 — Lealtad
  registerListLoyaltyCards(server, instrumented);
  registerAddLoyaltyContact(server, instrumented);
  registerGetLoyaltyContact(server, instrumented);
  registerRegisterLoyaltySale(server, instrumented);

  // Fase 2 — Monedero
  registerListWallets(server, instrumented);
  registerAddWalletContact(server, instrumented);
  registerGetWalletContact(server, instrumented);
  registerUpdateWalletBalance(server, instrumented);

  // Utilidades
  registerDeleteContact(server, instrumented);
  registerGetMetrics(server);
}
