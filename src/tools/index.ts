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
import { registerListCampaigns } from "./list-campaigns.js";
import { registerGetMetrics } from "./get-metrics.js";
import { registerDeleteContact } from "./delete-contact.js";
import { registerListLoyaltyCards } from "./list-loyalty-cards.js";
import { registerAddLoyaltyContact } from "./add-loyalty-contact.js";
import { registerGetLoyaltyContact } from "./get-loyalty-contact.js";
// register_loyalty_sale y register_wallet_sale no se exponen como tools en esta versión.
import { registerListWallets } from "./list-wallets.js";
import { registerAddWalletContact } from "./add-wallet-contact.js";
import { registerGetWalletContact } from "./get-wallet-contact.js";
import { registerUpdateWalletBalance } from "./update-wallet-balance.js";
// Cobertura operativa (v1.0.0)
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
// OTP v2 (reemplaza al OTP v1 verify_phone/check_verification/resend_verification/reset_verification)
import { registerSendOtp } from "./send-otp.js";
import { registerVerifyOtp } from "./verify-otp.js";
import { registerGetOtpStatus } from "./get-otp-status.js";
import { registerDeleteOtp } from "./delete-otp.js";

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

  // SMS, campañas y contactos base
  registerCheckBalance(server, instrumented);
  registerSendSms(server, instrumented);
  registerListAgendas(server, instrumented);
  registerGetContacts(server, instrumented);
  registerAddContact(server, instrumented);
  registerGetCampaignStats(server, instrumented);
  registerListCampaigns(server, instrumented);

  // Lealtad
  registerListLoyaltyCards(server, instrumented);
  registerAddLoyaltyContact(server, instrumented);
  registerGetLoyaltyContact(server, instrumented);
  // register_loyalty_sale no se expone — ver comentario arriba.

  // Monedero
  registerListWallets(server, instrumented);
  registerAddWalletContact(server, instrumented);
  registerGetWalletContact(server, instrumented);
  registerUpdateWalletBalance(server, instrumented);

  // Utilidades
  registerDeleteContact(server, instrumented);
  registerGetMetrics(server);

  // Agendas CRUD
  registerCreateAgenda(server, instrumented);
  registerRenameAgenda(server, instrumented);
  registerDeleteAgenda(server, instrumented);
  registerFindAgenda(server, instrumented);

  // Contactos
  registerUpdateContact(server, instrumented);
  registerDuplicateContact(server, instrumented);

  // Webhooks (consolidado con discriminator)
  registerManageWebhook(server, instrumented);

  // Reports
  registerGenerateReport(server, instrumented);
  registerGetReportDetails(server, instrumented);

  // Payment Request
  registerSendPaymentRequest(server, instrumented);

  // OTP v2 — send (crea|reenvía|rota|cambia canal), verify, status (read-only), delete (invalida)
  registerSendOtp(server, instrumented);
  registerVerifyOtp(server, instrumented);
  registerGetOtpStatus(server, instrumented);
  registerDeleteOtp(server, instrumented);
}
