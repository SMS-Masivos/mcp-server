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
  company: z.string().describe("Nombre de la empresa que envía la verificación (máx 40 caracteres)"),
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

export const listCampaignsInput = z.object({
  start_date: z.string().optional().describe("Fecha de inicio en formato YYYY-MM-DD"),
  end_date: z.string().optional().describe("Fecha de fin en formato YYYY-MM-DD"),
  sandbox: z.enum(["0", "1"]).optional().describe("'1' para listar campañas de sandbox"),
  limit: z.string().optional().describe("Cantidad máxima de campañas a retornar (default: 50, max: 100)"),
});

export const checkVerificationInput = z.object({
  phone_number: z.string().describe("Número de teléfono que recibió el código"),
  country_code: z.string().default("52").describe("Código de país"),
  verification_code: z.string().describe("Código de verificación ingresado por el usuario"),
});

export const deleteContactInput = z.object({
  list_key: z.string().describe("Clave única de la agenda de donde eliminar el contacto"),
  number: z.string().describe("Número de teléfono del contacto a eliminar"),
  email: z.string().optional().describe("Email del contacto (opcional, para identificación adicional)"),
});

// Lealtad
export const listLoyaltyCardsInput = z.object({});

export const addLoyaltyContactInput = z.object({
  loyalty_key: z.string().describe("Clave única de la tarjeta de lealtad. Obtenla con list_loyalty_cards."),
  phone: z.string().describe("Número de teléfono del contacto (mínimo 10 dígitos)"),
  customer_name: z.string().optional().describe("Nombre del cliente"),
});

export const getLoyaltyContactInput = z.object({
  loyalty_key: z.string().describe("Clave única de la tarjeta de lealtad"),
  phone: z.string().optional().describe("Número de teléfono. Si se omite, retorna todos los contactos."),
});

export const registerLoyaltySaleInput = z.object({
  loyalty_key: z.string().describe("Clave única de la tarjeta de lealtad"),
  phone: z.string().describe("Número de teléfono del cliente"),
  stamps_quantity: z.number().describe("Cantidad de sellos a registrar"),
});

// Monedero
export const listWalletsInput = z.object({});

export const addWalletContactInput = z.object({
  wallet_key: z.string().describe("Clave única del monedero. Obtenla con list_wallets."),
  phone: z.string().describe("Número de teléfono del contacto"),
  customer_name: z.string().describe("Nombre del cliente"),
  usertool_id: z.number().describe("ID de la herramienta de usuario (obtenlo de list_wallets)"),
});

export const getWalletContactInput = z.object({
  wallet_key: z.string().describe("Clave única del monedero"),
  phone: z.string().optional().describe("Número de teléfono. Si se omite, retorna todos los contactos."),
});

export const updateWalletBalanceInput = z.object({
  wallet_key: z.string().describe("Clave única del monedero"),
  phone: z.string().describe("Número de teléfono del cliente"),
  transaction_type: z.enum(["1", "2"]).describe("Tipo de transacción: '1' para agregar saldo, '2' para restar saldo"),
  transaction_amount: z.number().describe("Monto de la transacción (valor positivo)"),
  usertool_id: z.number().describe("ID de la herramienta de usuario (obtenlo de list_wallets)"),
});
