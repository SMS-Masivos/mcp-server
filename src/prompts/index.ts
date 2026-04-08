import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerAllPrompts(server: McpServer) {
  server.registerPrompt("enviar-campana", {
    title: "Enviar campaña SMS",
    description: "Flujo guiado para enviar una campaña SMS: verificar saldo, enviar mensaje, consultar estadísticas.",
  }, async () => ({
    messages: [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: "Quiero enviar una campaña SMS. Guíame paso a paso: primero verifica mi saldo con check_balance, luego ayúdame a redactar y enviar el mensaje con send_sms, y después consulta las estadísticas con get_campaign_stats.",
        },
      },
    ],
  }));

  server.registerPrompt("consultar-lealtad", {
    title: "Consultar programa de lealtad",
    description: "Flujo guiado para consultar tarjetas de lealtad y datos de contactos.",
  }, async () => ({
    messages: [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: "Quiero revisar mi programa de lealtad. Primero lista mis tarjetas con list_loyalty_cards, luego ayúdame a consultar los sellos de un cliente con get_loyalty_contact.",
        },
      },
    ],
  }));

  server.registerPrompt("gestionar-contactos", {
    title: "Gestionar contactos",
    description: "Flujo guiado para ver agendas, consultar contactos y agregar nuevos.",
  }, async () => ({
    messages: [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: "Quiero gestionar mis contactos. Primero muéstrame mis agendas con list_agendas, luego los contactos de una agenda con get_contacts, y ayúdame a agregar nuevos con add_contact si necesito.",
        },
      },
    ],
  }));

  server.registerPrompt("verificar-numero", {
    title: "Verificar número de teléfono",
    description: "Flujo guiado para enviar un código OTP y verificar un número de teléfono.",
  }, async () => ({
    messages: [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: "Quiero verificar un número de teléfono por SMS. Usa verify_phone para enviar el código OTP, y cuando me den el código usa check_verification para validarlo.",
        },
      },
    ],
  }));
}
