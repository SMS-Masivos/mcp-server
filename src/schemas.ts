import { z } from "zod";

// Validaciones reutilizables
const phoneNumber = z
  .string()
  .regex(/^\d{10,15}$/, "Debe contener entre 10 y 15 dígitos, sin espacios ni símbolos");

const dateYMD = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato requerido: YYYY-MM-DD");

const dateYMDHMS = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/, "Formato requerido: YYYY-MM-DD HH:mm:ss");

const countryCode = z
  .string()
  .regex(/^\d{1,4}$/, "Código de país numérico (ej: '52', '1')")
  .default("52");

// Webhook URL: https obligatorio, rechaza IPs privadas y localhost
// Mitiga prompt injection que registraría webhooks hacia destinos internos del attacker
const webhookUrl = z
  .string()
  .url("Debe ser una URL válida")
  .refine((url) => url.startsWith("https://"), {
    message: "La URL debe usar https://",
  })
  .refine(
    (url) => {
      try {
        const { hostname } = new URL(url);
        // IPv6 puede venir con o sin brackets dependiendo del runtime
        const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();
        if (host === "localhost") return false;
        if (/^127\./.test(host)) return false;
        if (/^10\./.test(host)) return false;
        if (/^192\.168\./.test(host)) return false;
        // 172.16.0.0 – 172.31.255.255
        const m = host.match(/^172\.(\d{1,3})\./);
        if (m) {
          const second = parseInt(m[1], 10);
          if (second >= 16 && second <= 31) return false;
        }
        // IPv6 loopback (::1) y link-local (fe80::/10)
        if (host === "::1") return false;
        if (host.startsWith("fe80:") || host.startsWith("fe80::")) return false;
        return true;
      } catch {
        return false;
      }
    },
    {
      message:
        "No se permiten URLs hacia IPs privadas, loopback o localhost. Usa un dominio público con https.",
    },
  );

export const schemas = {
  phoneNumber,
  dateYMD,
  dateYMDHMS,
  countryCode,
  webhookUrl,
};

export const checkBalanceInput = z.object({});

export const sendSmsInput = z.object({
  numbers: z
    .string()
    .describe(
      "Números de teléfono separados por coma, sin código de país (ej: '5512345678,5598765432'). Máximo 500.",
    )
    .transform((val) => val.replace(/\+/g, ""))
    .refine(
      (val) => {
        const nums = val.split(",").filter(Boolean);
        return nums.length >= 1 && nums.length <= 500;
      },
      { message: "Debe contener entre 1 y 500 números separados por coma" },
    )
    .refine(
      (val) => {
        const nums = val.split(",").filter(Boolean);
        return nums.every((n) => /^\d{10,15}$/.test(n.trim()));
      },
      { message: "Cada número debe contener entre 10 y 15 dígitos" },
    ),
  message: z.string().min(1).max(1600).describe("Texto del mensaje SMS (máx. 1600 caracteres / 10 segmentos)"),
  country_code: countryCode.describe("Código de país (ej: '52' para México, '1' para USA)"),
  sandbox: z
    .enum(["0", "1"])
    .optional()
    .describe("Enviar en modo sandbox (no envía realmente, no consume créditos). '1' para activar."),
  sender: z.string().max(11).optional().describe("Remitente personalizado (si tu cuenta lo permite, máx. 11 chars)"),
  date: dateYMDHMS
    .optional()
    .describe("Fecha de envío programado en formato 'YYYY-MM-DD HH:mm:ss' (hora de México)"),
  shorten_url: z
    .enum(["0", "1"])
    .optional()
    .describe("'1' para acortar automáticamente URLs en el mensaje"),
  flash: z.enum(["0", "1"]).optional().describe("'1' para enviar como SMS flash (se muestra sin guardar)"),
});

export const listAgendasInput = z.object({});

export const getContactsInput = z.object({
  list_key: z.string().describe("Clave única de la agenda (list_key). Obtenla con list_agendas."),
});

export const addContactInput = z.object({
  list_key: z.string().describe("Clave única de la agenda donde agregar el contacto"),
  number: phoneNumber.describe("Número de teléfono del contacto (10-15 dígitos)"),
  name: z.string().max(100).optional().describe("Nombre del contacto"),
  email: z.string().email("Email inválido").optional().describe("Email del contacto"),
  country_code: countryCode.optional().describe("Código de país (default: 52 México)"),
  custom_field_1: z.string().max(255).optional().describe("Campo personalizado 1"),
  custom_field_2: z.string().max(255).optional().describe("Campo personalizado 2"),
  custom_field_3: z.string().max(255).optional().describe("Campo personalizado 3"),
  custom_field_4: z.string().max(255).optional().describe("Campo personalizado 4"),
  birthday_date: dateYMD.optional().describe("Fecha de cumpleaños en formato YYYY-MM-DD"),
});

export const getCampaignStatsInput = z.object({
  campaign_id: z
    .string()
    .describe("ID de la campaña SMS. Obtenlo del resultado de send_sms (campo campaignId)."),
  sandbox: z.enum(["0", "1"]).optional().describe("'1' si la campaña fue enviada en modo sandbox"),
});

// ── OTP v2 (POST/GET/DELETE /v2/otp) ────────────────────────────────────────────────
// Reemplaza al OTP v1 (verify_phone/check_verification/resend_verification/reset_verification).
// Contrato: endpoints /v2/otp de la API.

export const sendOtpInput = z.object({
  phone_number: phoneNumber.describe("Número de teléfono a verificar, sin código de país (ej: '5512345678'). En México, 10 dígitos."),
  country_code: countryCode.describe("Código de país numérico (default: '52' México)"),
  channel: z
    .enum(["sms", "whatsapp", "voice"])
    .optional()
    .describe("Canal de entrega: 'sms' (default), 'whatsapp' (plantilla oficial, ignora message/company) o 'voice' (dicta el código). Al reenviar puedes cambiar de canal: el mismo código sale por el nuevo."),
  company: z
    .string()
    .min(1)
    .max(40)
    .optional()
    .describe("Nombre de tu empresa/app mostrado al usuario. OBLIGATORIO con channel 'sms' y 'voice' (requisito de operadores); se ignora con 'whatsapp'."),
  message: z
    .string()
    .optional()
    .describe("Texto propio del SMS/voz (opcional). Debe incluir los placeholders {{code}} y {{company}}, solo caracteres GSM-7 y máx 160 chars ya sustituidos. Sin él se usa el texto default."),
  code_format: z
    .enum(["numeric", "alphanumeric", "letters"])
    .optional()
    .describe("Formato del código: 'numeric' (default), 'alphanumeric' o 'letters'."),
  code_length: z
    .number()
    .int()
    .min(4)
    .max(10)
    .optional()
    .describe("Longitud del código, de 4 a 10 (default 6)."),
  code_rotate: z
    .boolean()
    .optional()
    .describe("true descarta el código vigente y genera uno nuevo (ronda con 7 intentos frescos); también destraba una verificación bloqueada. Sin él, un código vigente se REENVÍA tal cual."),
  expiration_date: dateYMDHMS
    .optional()
    .describe("Expiración del código, formato 'YYYY-MM-DD HH:mm:ss' (futura). Default 24h, máximo 3 días."),
  code_show: z
    .enum(["0", "1"])
    .optional()
    .describe("'1' devuelve el código generado en la respuesta (solo para pruebas/automatización). Default '0'."),
  sandbox: z
    .enum(["0", "1"])
    .optional()
    .describe("Enviar en modo sandbox (no envía realmente, no consume créditos). '1' para activar."),
});

export const listCampaignsInput = z.object({
  start_date: dateYMD.optional().describe("Fecha de inicio en formato YYYY-MM-DD"),
  end_date: dateYMD.optional().describe("Fecha de fin en formato YYYY-MM-DD"),
  sandbox: z.enum(["0", "1"]).optional().describe("'1' para listar campañas de sandbox"),
  limit: z.string().regex(/^\d{1,3}$/, "Debe ser un número entre 1 y 100").optional().describe("Cantidad máxima de campañas a retornar (default: 50, max: 100)"),
});

export const verifyOtpInput = z.object({
  phone_number: phoneNumber.describe("El mismo número usado en send_otp (sin código de país)"),
  country_code: countryCode.describe("El mismo código de país usado en send_otp (default: '52')"),
  code: z.string().min(1).max(10).describe("El código que capturó el usuario"),
});

export const getOtpStatusInput = z.object({
  phone_number: phoneNumber.describe("Número cuyo estado de verificación quieres consultar"),
  country_code: countryCode.describe("Código de país numérico (default: '52')"),
});

export const deleteOtpInput = z.object({
  phone_number: phoneNumber.describe("Número cuya verificación activa quieres invalidar"),
  country_code: countryCode.describe("Código de país numérico (default: '52')"),
});

export const deleteContactInput = z.object({
  list_key: z.string().describe("Clave única de la agenda de donde eliminar el contacto"),
  number: phoneNumber.describe("Número de teléfono del contacto a eliminar"),
  email: z.string().email("Email inválido").optional().describe("Email del contacto (opcional, para identificación adicional)"),
});

// Lealtad
export const listLoyaltyCardsInput = z.object({});

export const addLoyaltyContactInput = z.object({
  loyalty_key: z.string().describe("Clave única de la tarjeta de lealtad. Obtenla con list_loyalty_cards."),
  phone: phoneNumber.describe("Número de teléfono del contacto (10-15 dígitos)"),
  customer_name: z.string().max(100).describe("Nombre del cliente (requerido por el API)"),
});

export const getLoyaltyContactInput = z.object({
  loyalty_key: z.string().describe("Clave única de la tarjeta de lealtad"),
  phone: phoneNumber.optional().describe("Número de teléfono. Si se omite, retorna todos los contactos."),
});

// registerLoyaltySaleInput REMOVED in v1.0.0 — ver tools/index.ts.

// Monedero
export const listWalletsInput = z.object({});

export const addWalletContactInput = z.object({
  wallet_key: z.string().describe("Clave única del monedero. Obtenla con list_wallets."),
  phone: phoneNumber.describe("Número de teléfono del contacto (10-15 dígitos)"),
  customer_name: z.string().max(100).describe("Nombre del cliente"),
  usertool_id: z.number().int().positive().describe("ID de la herramienta de usuario (obtenlo de list_wallets)"),
});

export const getWalletContactInput = z.object({
  wallet_key: z.string().describe("Clave única del monedero"),
  phone: phoneNumber.optional().describe("Número de teléfono. Si se omite, retorna todos los contactos."),
});

export const updateWalletBalanceInput = z.object({
  wallet_key: z.string().describe("Clave única del monedero"),
  phone: phoneNumber.describe("Número de teléfono del cliente"),
  transaction_type: z.enum(["1", "2"]).describe("Tipo de transacción: '1' para agregar saldo, '2' para restar saldo"),
  transaction_amount: z.number().positive("El monto debe ser positivo").describe("Monto de la transacción (valor positivo)"),
  usertool_id: z.number().int().positive().describe("ID de la herramienta de usuario (obtenlo de list_wallets)"),
});

// ─────────────────────────────────────────────────────────
// Agendas CRUD
// ─────────────────────────────────────────────────────────

export const createAgendaInput = z.object({
  agenda_name: z.string().min(1).max(100).describe("Nombre de la nueva agenda"),
  agenda_description: z.string().max(255).optional().describe("Descripción opcional de la agenda"),
  custom_field_1: z.string().max(100).optional().describe("Etiqueta de campo personalizado 1 (ej: 'Empresa')"),
  custom_field_2: z.string().max(100).optional().describe("Etiqueta de campo personalizado 2"),
  custom_field_3: z.string().max(100).optional().describe("Etiqueta de campo personalizado 3"),
  custom_field_4: z.string().max(100).optional().describe("Etiqueta de campo personalizado 4"),
});

export const renameAgendaInput = z.object({
  list_key: z.string().describe("Clave única de la agenda a renombrar (obténla con list_agendas)"),
  agenda_name: z.string().min(1).max(100).describe("Nuevo nombre para la agenda"),
});

export const deleteAgendaInput = z.object({
  list_key: z.string().describe("Clave única de la agenda a eliminar"),
});

export const findAgendaInput = z.object({
  query: z
    .string()
    .max(100)
    .describe("Texto a buscar en el nombre de las agendas (búsqueda parcial, case-insensitive)"),
  page: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe("Número de página (1-indexed). Default 1. Si la respuesta indica has_more=true, invoca de nuevo con next_page."),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe("Resultados por página (default 20, max 100)"),
});

// ─────────────────────────────────────────────────────────
// Contactos
// ─────────────────────────────────────────────────────────

export const updateContactInput = z.object({
  list_key: z.string().describe("Clave única de la agenda donde está el contacto"),
  number: phoneNumber.describe("Número de teléfono actual del contacto a actualizar"),
  email: z.string().email("Email inválido").optional().describe("Email actual del contacto (opcional, para identificación adicional)"),
  name: z.string().max(100).optional().describe("Nuevo nombre del contacto"),
  new_email: z.string().email("Email inválido").optional().describe("Nuevo email del contacto"),
  custom_field_1: z.string().max(255).optional().describe("Nuevo valor del campo personalizado 1"),
  custom_field_2: z.string().max(255).optional().describe("Nuevo valor del campo personalizado 2"),
  custom_field_3: z.string().max(255).optional().describe("Nuevo valor del campo personalizado 3"),
  custom_field_4: z.string().max(255).optional().describe("Nuevo valor del campo personalizado 4"),
  birthday_date: dateYMD.optional().describe("Nueva fecha de cumpleaños (formato YYYY-MM-DD)"),
});

export const duplicateContactInput = z.object({
  current_list_key: z.string().describe("Clave única de la agenda origen del contacto"),
  new_list_key: z.string().describe("Clave única de la agenda destino"),
  contact_id: z
    .union([z.string(), z.number().int().positive()])
    .describe("ID del contacto a duplicar (obténlo de get_contacts)"),
});

// ─────────────────────────────────────────────────────────
// Reports
// ─────────────────────────────────────────────────────────

export const dateRangeMaxSeven = (start: string, end: string): boolean => {
  const startMs = Date.parse(start);
  const endMs = Date.parse(end);
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return false;
  const diffDays = (endMs - startMs) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 7;
};

// Schema base con `.shape` exportable al MCP SDK. El refine de rango ≤7 días
// se aplica manualmente en el handler (ZodEffects no expone .shape).
export const generateReportInput = z.object({
  start_date: dateYMD.describe("Fecha de inicio del rango (formato YYYY-MM-DD)"),
  end_date: dateYMD.describe("Fecha de fin del rango (formato YYYY-MM-DD)"),
  sandbox: z
    .enum(["0", "1"])
    .optional()
    .describe("'1' para reportes de sandbox, '0' o omitido para producción"),
});

export const getReportDetailsInput = z.object({
  campaign_id: z
    .union([z.string(), z.number().int().positive()])
    .describe("ID de la campaña a consultar (obténlo de list_campaigns o send_sms)"),
  sandbox: z.enum(["0", "1"]).optional().describe("'1' si la campaña fue enviada en modo sandbox"),
});

// ─────────────────────────────────────────────────────────
// Payment Request
// ─────────────────────────────────────────────────────────

export const sendPaymentRequestInput = z.object({
  template: z.string().describe("Token del template de solicitud de pago configurado en tu cuenta"),
  number: phoneNumber.describe("Número de teléfono del cliente que recibirá la solicitud"),
  amount: z
    .number()
    .positive()
    .optional()
    .describe("Monto a cobrar (si el template no tiene monto fijo)"),
  email: z.string().email("Email inválido").optional().describe("Email del cliente"),
  name: z.string().max(100).optional().describe("Nombre del cliente"),
  custom: z.string().max(255).optional().describe("ID propio para tracking (opcional)"),
});

// ─────────────────────────────────────────────────────────
// Webhook (consolidado con discriminatedUnion)
// El sistema permite UN solo webhook por usuario, sin id.
// ─────────────────────────────────────────────────────────

export const manageWebhookInput = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("list").describe("Lista el webhook configurado en la cuenta"),
  }),
  z.object({
    action: z.literal("add").describe("Registra o reemplaza el webhook de la cuenta"),
    url: webhookUrl.describe("URL https que recibirá los eventos (rechaza http e IPs privadas)"),
    status: z
      .enum(["0", "1"])
      .describe("'1' para activar el webhook, '0' para registrarlo desactivado"),
  }),
  z.object({
    action: z.literal("toggle").describe("Activa o desactiva el webhook existente"),
    status: z.enum(["0", "1"]).describe("'1' para activar, '0' para desactivar"),
  }),
  z.object({
    action: z.literal("delete").describe("Elimina el webhook configurado. OPERACIÓN DESTRUCTIVA — pide confirmación al humano antes de invocar"),
  }),
]);
