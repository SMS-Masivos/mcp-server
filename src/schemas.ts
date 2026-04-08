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

export const verifyPhoneInput = z.object({
  phone_number: phoneNumber.describe("Número de teléfono sin código de país (ej: '5512345678')"),
  country_code: countryCode.describe("Código de país (default: 52 México)"),
  company: z.string().min(1).max(40).describe("Nombre de la empresa que envía la verificación (máx 40 caracteres)"),
  code_type: z
    .enum(["numeric", "alphanumeric"])
    .optional()
    .describe("Tipo de código: 'numeric' (solo dígitos) o 'alphanumeric'"),
  expiration_date: dateYMDHMS
    .optional()
    .describe("Fecha de expiración del código en formato 'YYYY-MM-DD HH:mm:ss'"),
  voice: z.enum(["0", "1"]).optional().describe("'1' para enviar el código por llamada de voz"),
  whatsapp: z.enum(["0", "1"]).optional().describe("'1' para enviar el código por WhatsApp"),
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

export const checkVerificationInput = z.object({
  phone_number: phoneNumber.describe("Número de teléfono que recibió el código"),
  country_code: countryCode.describe("Código de país"),
  verification_code: z.string().min(1).max(10).describe("Código de verificación ingresado por el usuario"),
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

export const registerLoyaltySaleInput = z.object({
  loyalty_key: z.string().describe("Clave única de la tarjeta de lealtad"),
  phone: phoneNumber.describe("Número de teléfono del cliente"),
  stamps_quantity: z.number().int().positive().describe("Cantidad de sellos a registrar (entero positivo)"),
});

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
