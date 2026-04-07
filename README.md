# @smsmasivos/mcp-server

[![npm version](https://img.shields.io/npm/v/@smsmasivos/mcp-server)](https://www.npmjs.com/package/@smsmasivos/mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

MCP server para [SMS Masivos](https://www.smsmasivos.com.mx) — plataforma de envio de SMS masivos en Mexico.

Conecta tu asistente de IA con SMS Masivos para enviar mensajes, gestionar contactos, verificar numeros y consultar campanas usando lenguaje natural.

## Features

- **Envio de SMS** — individuales o masivos, hasta 500 numeros por llamada
- **Campanas** — lista tus campanas y consulta estadisticas de entrega
- **Agendas y contactos** — gestiona listas de contactos
- **Verificacion OTP** — envia y valida codigos por SMS, voz o WhatsApp
- **Sandbox** — prueba sin enviar mensajes reales ni gastar creditos
- **Compatible** — funciona con Claude, Cursor, Windsurf y cualquier cliente MCP

## Quick Start

```bash
npx @smsmasivos/mcp-server
```

Necesitas una API key de SMS Masivos. Obtenla en [tu panel](https://app.smsmasivos.com.mx).

## Configuracion

### Claude Desktop

Agrega esto a tu archivo de configuracion:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "smsmasivos": {
      "command": "npx",
      "args": ["-y", "@smsmasivos/mcp-server"],
      "env": {
        "SMSMASIVOS_API_KEY": "tu-api-key"
      }
    }
  }
}
```

### Claude Code

```bash
claude mcp add smsmasivos -e SMSMASIVOS_API_KEY=tu-api-key -- npx -y @smsmasivos/mcp-server
```

### Cursor

Agrega a `.cursor/mcp.json` en tu proyecto:

```json
{
  "mcpServers": {
    "smsmasivos": {
      "command": "npx",
      "args": ["-y", "@smsmasivos/mcp-server"],
      "env": {
        "SMSMASIVOS_API_KEY": "tu-api-key"
      }
    }
  }
}
```

### Windsurf

Agrega a `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "smsmasivos": {
      "command": "npx",
      "args": ["-y", "@smsmasivos/mcp-server"],
      "env": {
        "SMSMASIVOS_API_KEY": "tu-api-key"
      }
    }
  }
}
```

### Usando Bun (alternativa mas rapida)

Si tienes [Bun](https://bun.sh) instalado, reemplaza `npx` por `bunx` en cualquier configuracion:

```json
{
  "command": "bunx",
  "args": ["-y", "@smsmasivos/mcp-server"]
}
```

## Tools disponibles

| Tool | Descripcion |
|------|-------------|
| `check_balance` | Consulta creditos SMS disponibles |
| `send_sms` | Envia SMS a uno o varios numeros (max 500) |
| `list_campaigns` | Lista campanas con filtros por fecha |
| `get_campaign_stats` | Estadisticas de entrega de una campana |
| `list_agendas` | Lista agendas de contactos |
| `get_contacts` | Obtiene contactos de una agenda |
| `add_contact` | Agrega contacto a una agenda |
| `verify_phone` | Inicia verificacion OTP (SMS, voz o WhatsApp) |
| `check_verification` | Verifica codigo OTP |

## Ejemplos

Una vez configurado, puedes pedirle a tu asistente:

- "Cuantos creditos me quedan?"
- "Envia un SMS al 5512345678 con el texto: Tu cita es manana a las 10am"
- "Muestrame mis ultimas campanas"
- "Como fue la entrega de la campana 12345?"
- "Verifica el numero 5598765432 por WhatsApp"
- "Agrega a Juan (5512345678) a mi agenda de recordatorios"

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
