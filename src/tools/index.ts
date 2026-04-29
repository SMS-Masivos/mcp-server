import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ApiCall, ApiCallOptions } from "../api-client.js";
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
// register_loyalty_sale REMOVED in v1.0.0 (breaking) — falta idempotency_key en
// api/loyalty/sale. Reintroducir cuando el API soporte idempotency. Tracked en
// TODOS Fase 5. register_wallet_sale fue evaluada y descartada en Fase 4 por el
// mismo motivo: no se llegó a implementar como tool MCP.
import { registerListWallets } from "./list-wallets.js";
import { registerAddWalletContact } from "./add-wallet-contact.js";
import { registerGetWalletContact } from "./get-wallet-contact.js";
import { registerUpdateWalletBalance } from "./update-wallet-balance.js";
// Fase 4 — Cobertura operativa (v1.0.0)
import { registerCreateAgenda } from "./create-agenda.js";
import { registerRenameAgenda } from "./rename-agenda.js";
import { registerDeleteAgenda } from "./delete-agenda.js";
import { registerFindAgenda } from "./find-agenda.js";
import { registerUpdateContact } from "./update-contact.js";
import { registerDuplicateContact } from "./duplicate-contact.js";
import { registerManageWebhook } from "./manage-webhook.js";
import { registerGenerateReport } from "./generate-report.js";
import { registerGetReportDetails } from "./get-report-details.js";
import { registerSendPaymentRequest } from "./send-payment-request.js";
// v1.1.0 — OTP completion
import { registerResendVerification } from "./resend-verification.js";
import { registerResetVerification } from "./reset-verification.js";

function createInstrumentedApiCall(apiCall: ApiCall): ApiCall {
  return async <T>(
    endpoint: string,
    params?: Record<string, unknown>,
    opts?: ApiCallOptions,
  ): Promise<T> => {
    const start = performance.now();
    const isSandbox = params?.sandbox === "1" || params?.sandbox === 1;
    try {
      const result = await apiCall<T>(endpoint, params, opts);
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
  // registerRegisterLoyaltySale REMOVED in v1.0.0 — ver comentario arriba.

  // Fase 2 — Monedero
  registerListWallets(server, instrumented);
  registerAddWalletContact(server, instrumented);
  registerGetWalletContact(server, instrumented);
  registerUpdateWalletBalance(server, instrumented);

  // Utilidades
  registerDeleteContact(server, instrumented);
  registerGetMetrics(server);

  // Fase 4 — Agendas CRUD
  registerCreateAgenda(server, instrumented);
  registerRenameAgenda(server, instrumented);
  registerDeleteAgenda(server, instrumented);
  registerFindAgenda(server, instrumented);

  // Fase 4 — Contactos
  registerUpdateContact(server, instrumented);
  registerDuplicateContact(server, instrumented);

  // Fase 4 — Webhooks (consolidado con discriminator)
  registerManageWebhook(server, instrumented);

  // Fase 4 — Reports
  registerGenerateReport(server, instrumented);
  registerGetReportDetails(server, instrumented);

  // Fase 4 — Payment Request
  registerSendPaymentRequest(server, instrumented);

  // v1.1.0 — OTP completion (resend + reset)
  registerResendVerification(server, instrumented);
  registerResetVerification(server, instrumented);
}
