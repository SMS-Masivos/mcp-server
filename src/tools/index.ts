import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ApiCall } from "../api-client.js";
import { registerCheckBalance } from "./check-balance.js";
import { registerSendSms } from "./send-sms.js";
import { registerListAgendas } from "./list-agendas.js";
import { registerGetContacts } from "./get-contacts.js";
import { registerAddContact } from "./add-contact.js";
import { registerGetCampaignStats } from "./get-campaign-stats.js";
import { registerVerifyPhone } from "./verify-phone.js";
import { registerCheckVerification } from "./check-verification.js";

export function registerAllTools(server: McpServer, apiCall: ApiCall) {
  registerCheckBalance(server, apiCall);
  registerSendSms(server, apiCall);
  registerListAgendas(server, apiCall);
  registerGetContacts(server, apiCall);
  registerAddContact(server, apiCall);
  registerGetCampaignStats(server, apiCall);
  registerVerifyPhone(server, apiCall);
  registerCheckVerification(server, apiCall);
}
