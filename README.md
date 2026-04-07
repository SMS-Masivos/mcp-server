# @smsmasivos/mcp-server

MCP server para [SMS Masivos](https://www.smsmasivos.com.mx) — plataforma de SMS masivos para Mexico.

Permite a Claude, Cursor, Windsurf y cualquier MCP client enviar SMS a numeros mexicanos, consultar creditos, gestionar contactos y verificar numeros de telefono usando lenguaje natural.

## Instalacion

```bash
npm install -g @smsmasivos/mcp-server
```

O ejecutar directamente:

```bash
npx @smsmasivos/mcp-server
```

## Configuracion

Necesitas una API key de SMS Masivos. Obtenla en tu panel: https://app.smsmasivos.com.mx

### Claude Desktop

Agrega esto a tu configuracion de Claude Desktop (`~/Library/Application Support/Claude/claude_desktop_config.json` en Mac):

```json
{
  "mcpServers": {
    "smsmasivos": {
      "command": "npx",
      "args": ["-y", "@smsmasivos/mcp-server"],
      "env": {
        "SMSMASIVOS_API_KEY": "tu-api-key-aqui"
      }
    }
  }
}
```

### Claude Code

```bash
SMSMASIVOS_API_KEY=tu-api-key npx @smsmasivos/mcp-server
```

### Cursor / Windsurf

Agrega el MCP server en la configuracion de tu editor con los mismos parametros.

## Tools disponibles

| Tool | Descripcion |
|------|-------------|
| `check_balance` | Consulta creditos SMS disponibles |
| `send_sms` | Envia SMS a uno o varios numeros (max 500) |
| `list_agendas` | Lista tus agendas (listas de contactos) |
| `get_contacts` | Obtiene contactos de una agenda |
| `add_contact` | Agrega contacto a una agenda |
| `get_campaign_stats` | Estadisticas de entrega de una campana |
| `verify_phone` | Inicia verificacion OTP por SMS/voz/WhatsApp |
| `check_verification` | Verifica codigo OTP |

## Ejemplos

Una vez configurado, puedes pedirle a Claude:

- "Cuantos creditos me quedan?"
- "Envia un SMS al 5512345678 con el texto: Tu cita es manana a las 10am"
- "Muestrame mis agendas de contactos"
- "Como fue la entrega de mi campana 12345?"
- "Verifica el numero 5598765432 por SMS"

## Desarrollo

```bash
git clone https://github.com/SMS-Masivos/mcp-server.git
cd mcp-server
npm install
npm run build
npm test
```

## Licencia

MIT
