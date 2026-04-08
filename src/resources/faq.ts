import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const FAQ_ENTRIES: Record<string, { title: string; description: string; content: string }> = {
  "getting-started": {
    title: "Primeros pasos",
    description: "Cómo obtener tu API key y configurar el MCP server",
    content: `# Primeros pasos con SMS Masivos MCP

## Obtener tu API key

1. Inicia sesión en [smsmasivos.com.mx](https://smsmasivos.com.mx)
2. Ve a **Configuración** → **API**
3. Copia tu API key

## Configurar en Claude Desktop

Agrega esto a tu archivo de configuración de Claude Desktop (\`claude_desktop_config.json\`):

\`\`\`json
{
  "mcpServers": {
    "smsmasivos": {
      "command": "npx",
      "args": ["-y", "@smsmasivos/mcp-server"],
      "env": {
        "SMSMASIVOS_API_KEY": "tu-api-key-aquí"
      }
    }
  }
}
\`\`\`

## Verificar conexión

Pregunta a Claude: "¿Cuántos créditos SMS tengo?" — si responde con tu saldo, todo está configurado.
`,
  },
  "common-errors": {
    title: "Errores comunes",
    description: "Soluciones a los errores más frecuentes",
    content: `# Errores comunes

## AuthError — API key inválida o no proporcionada
- Verifica que \`SMSMASIVOS_API_KEY\` esté configurada correctamente
- Asegúrate de que la API key esté activa en tu panel

## RateLimitError — Demasiadas solicitudes
- La API tiene límites de velocidad por Cloudflare
- El MCP reintenta automáticamente una vez con el header Retry-After
- Si persiste, espera unos segundos entre operaciones

## NetworkError — Error de conexión
- Verifica tu conexión a internet
- El servidor puede estar en mantenimiento temporal
- El MCP reintenta automáticamente en caso de timeout

## "Créditos insuficientes"
- Usa \`check_balance\` para verificar tu saldo
- Recarga créditos en smsmasivos.com.mx → Créditos

## "Número inválido"
- Los números deben tener 10 dígitos (sin código de país)
- No incluyas el prefijo +52
- Ejemplo correcto: \`5512345678\`
`,
  },
  "limits-and-pricing": {
    title: "Límites y créditos",
    description: "Información sobre créditos, límites por request y rate limiting",
    content: `# Límites y créditos

## Créditos
- Cada SMS consume **1 crédito**
- Consulta tu saldo con \`check_balance\`
- Los envíos en modo sandbox (\`sandbox='1'\`) **no consumen créditos**

## Límites por request
- **Máximo 500 números** por llamada a \`send_sms\`
- Para envíos masivos mayores, divide en lotes de 500

## Rate limiting
- La API está protegida por Cloudflare
- Límite general: ~60 requests por minuto
- El MCP maneja reintentos automáticamente

## Verificación OTP
- Cada verificación consume **1 crédito**
- Los códigos expiran por defecto en 10 minutos
`,
  },
  "sandbox-mode": {
    title: "Modo sandbox",
    description: "Cómo usar el modo sandbox para pruebas sin envío real",
    content: `# Modo sandbox

El modo sandbox permite probar el flujo completo sin enviar mensajes reales ni consumir créditos.

## Cómo activar
- En \`send_sms\`: usa \`sandbox='1'\`
- En \`list_campaigns\`: usa \`sandbox='1'\` para ver campañas de prueba
- En \`get_campaign_stats\`: usa \`sandbox='1'\` si la campaña fue de sandbox

## Comportamiento
- El SMS **no se envía** realmente
- **No se consumen créditos**
- Se genera un ID de campaña válido
- Las estadísticas muestran "en proceso" brevemente y luego datos simulados

## Cuándo usar
- Pruebas de integración
- Validar flujos antes de envíos reales
- Desarrollo y debugging
`,
  },
  "tool-examples": {
    title: "Ejemplos de uso",
    description: "Ejemplos prácticos de cada tool disponible",
    content: `# Ejemplos de uso

## Consultar saldo
> "¿Cuántos créditos tengo?"
→ Usa \`check_balance\`

## Enviar SMS
> "Envía 'Hola mundo' al 5512345678"
→ Usa \`send_sms\` con numbers y message

## SMS programado
> "Programa un SMS para mañana a las 10am"
→ Usa \`send_sms\` con el parámetro date

## SMS en sandbox
> "Envía un mensaje de prueba sin enviar realmente"
→ Usa \`send_sms\` con sandbox='1'

## Ver campañas
> "¿Cuáles son mis últimas campañas?"
→ Usa \`list_campaigns\`

## Estadísticas de campaña
> "¿Cómo fue la entrega de la campaña 12345?"
→ Usa \`get_campaign_stats\` con el campaign_id

## Gestionar agendas
> "¿Qué agendas tengo?"
→ Usa \`list_agendas\`, luego \`get_contacts\` con el list_key

## Verificación OTP
> "Verifica el número 5512345678"
→ Usa \`verify_phone\`, luego \`check_verification\` con el código

## Lealtad
> "¿Cuántos sellos tiene el cliente 5512345678?"
→ Usa \`list_loyalty_cards\` para obtener el key, luego \`get_loyalty_contact\`

## Monedero
> "¿Cuál es el saldo del cliente en mi monedero?"
→ Usa \`list_wallets\` para obtener el key, luego \`get_wallet_contact\`
`,
  },
};

export function registerFaqResources(server: McpServer) {
  for (const [key, entry] of Object.entries(FAQ_ENTRIES)) {
    server.registerResource(
      entry.title,
      `smsmasivos://faq/${key}`,
      { description: entry.description, mimeType: "text/markdown" },
      () => ({
        contents: [
          {
            uri: `smsmasivos://faq/${key}`,
            text: entry.content,
            mimeType: "text/markdown",
          },
        ],
      }),
    );
  }
}
