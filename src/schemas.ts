import { z } from "zod";

export const checkBalanceInput = z.object({});

export const sendSmsInput = z.object({
  numbers: z
    .string()
    .describe(
      "Números de teléfono separados por coma, sin código de país (ej: '5512345678,5598765432'). Máximo 500.",
    )
    .transform((val) => val.replace(/\+/g, "")),
  message: z.string().min(1).describe("Texto del mensaje SMS"),
  country_code: z
    .string()
    .default("52")
    .describe("Código de país (ej: '52' para México, '1' para USA)"),
  sandbox: z
    .enum(["0", "1"])
    .optional()
    .describe("Enviar en modo sandbox (no envía realmente, no consume créditos). '1' para activar."),
  sender: z.string().optional().describe("Remitente personalizado (si tu cuenta lo permite)"),
  date: z
    .string()
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
  number: z.string().describe("Número de teléfono del contacto (mínimo 10 dígitos)"),
  name: z.string().optional().describe("Nombre del contacto"),
  email: z.string().optional().describe("Email del contacto"),
  country_code: z.string().optional().default("52").describe("Código de país (default: 52 México)"),
  custom_field_1: z.string().optional().describe("Campo personalizado 1"),
  custom_field_2: z.string().optional().describe("Campo personalizado 2"),
  custom_field_3: z.string().optional().describe("Campo personalizado 3"),
  custom_field_4: z.string().optional().describe("Campo personalizado 4"),
  birthday_date: z.string().optional().describe("Fecha de cumpleaños en formato YYYY-MM-DD"),
});

export const getCampaignStatsInput = z.object({
  campaign_id: z
    .string()
    .describe("ID de la campaña SMS. Obtenlo del resultado de send_sms (campo campaignId)."),
  sandbox: z.enum(["0", "1"]).optional().describe("'1' si la campaña fue enviada en modo sandbox"),
});

export const verifyPhoneInput = z.object({
  phone_number: z.string().describe("Número de teléfono sin código de país (ej: '5512345678')"),
  country_code: z.string().default("52").describe("Código de país (default: 52 México)"),
  code_type: z
    .enum(["numeric", "alphanumeric"])
    .optional()
    .describe("Tipo de código: 'numeric' (solo dígitos) o 'alphanumeric'"),
  expiration_date: z
    .string()
    .optional()
    .describe("Fecha de expiración del código en formato 'YYYY-MM-DD HH:mm:ss'"),
  voice: z.enum(["0", "1"]).optional().describe("'1' para enviar el código por llamada de voz"),
  whatsapp: z.enum(["0", "1"]).optional().describe("'1' para enviar el código por WhatsApp"),
});

export const checkVerificationInput = z.object({
  phone_number: z.string().describe("Número de teléfono que recibió el código"),
  country_code: z.string().default("52").describe("Código de país"),
  verification_code: z.string().describe("Código de verificación ingresado por el usuario"),
});
