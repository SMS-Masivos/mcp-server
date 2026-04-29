# @smsmasivos/mcp-server

[![npm version](https://img.shields.io/npm/v/@smsmasivos/mcp-server)](https://www.npmjs.com/package/@smsmasivos/mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

MCP server para [SMS Masivos](https://www.smsmasivos.com.mx) — plataforma de envio de SMS masivos en Mexico.

Conecta tu asistente de IA con SMS Masivos para enviar mensajes, gestionar contactos, verificar numeros y consultar campanas usando lenguaje natural.

## Features

- **29 tools** — SMS, campanas, contactos, agendas CRUD, webhooks, reports, payment requests, verificacion OTP completa (start/check/resend/reset), lealtad, monederos y metricas
- **FAQ integrado** — 5 recursos de ayuda accesibles desde tu asistente
- **Prompts guiados** — 4 flujos paso a paso para tareas comunes
- **Telemetria** — metricas de uso por sesion (latencia, errores, sandbox vs produccion)
- **Sandbox** — prueba sin enviar mensajes reales ni gastar creditos
- **Compatible** — funciona con Claude, Cursor, Windsurf y cualquier cliente MCP

## Quick Start

Necesitas una API key de SMS Masivos. Obtenla en [tu panel](https://app.smsmasivos.com.mx).

### Opcion 1: Remoto (recomendado — sin instalar nada)

Agrega esta configuracion a tu herramienta de IA y listo:

```json
{
  "mcpServers": {
    "smsmasivos": {
      "type": "http",
      "url": "https://mcp.smsmasivos.com.mx/mcp",
      "headers": {
        "Authorization": "Bearer tu-api-key"
      }
    }
  }
}
```

### Opcion 2: Local (requiere Node.js)

```bash
npx @smsmasivos/mcp-server
```

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

## Configuracion por herramienta

### Claude Desktop

Agrega a tu archivo de configuracion:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

**Remoto (recomendado):**
```json
{
  "mcpServers": {
    "smsmasivos": {
      "type": "http",
      "url": "https://mcp.smsmasivos.com.mx/mcp",
      "headers": {
        "Authorization": "Bearer tu-api-key"
      }
    }
  }
}
```

**Local:**
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

**Remoto (recomendado):**
```bash
claude mcp add smsmasivos --transport http https://mcp.smsmasivos.com.mx/mcp -H "Authorization: Bearer tu-api-key"
```

**Local:**
```bash
claude mcp add smsmasivos -e SMSMASIVOS_API_KEY=tu-api-key -- npx -y @smsmasivos/mcp-server
```

### Cursor

Agrega a `.cursor/mcp.json` en tu proyecto:

**Remoto (recomendado):**
```json
{
  "mcpServers": {
    "smsmasivos": {
      "type": "http",
      "url": "https://mcp.smsmasivos.com.mx/mcp",
      "headers": {
        "Authorization": "Bearer tu-api-key"
      }
    }
  }
}
```

**Local:**
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

Agrega a `~/.codeium/windsurf/mcp_config.json` — misma configuracion que Cursor (remoto o local).

## Tools disponibles

### SMS y campanas

| Tool | Descripcion |
|------|-------------|
| `check_balance` | Consulta creditos SMS disponibles |
| `send_sms` | Envia SMS a uno o varios numeros (max 500) |
| `list_campaigns` | Lista campanas con filtros por fecha |
| `get_campaign_stats` | Estadisticas de entrega de una campana |

### Contactos y agendas

| Tool | Descripcion |
|------|-------------|
| `list_agendas` | Lista agendas de contactos |
| `find_agenda` | Busca agendas por nombre (parcial) |
| `create_agenda` | Crea una nueva agenda |
| `rename_agenda` | Cambia el nombre de una agenda |
| `delete_agenda` | Elimina una agenda y sus contactos (DESTRUCTIVO) |
| `get_contacts` | Obtiene contactos de una agenda |
| `add_contact` | Agrega contacto a una agenda |
| `update_contact` | Actualiza datos de un contacto existente |
| `duplicate_contact` | Copia un contacto entre agendas |
| `delete_contact` | Elimina un contacto de una agenda |

### Verificacion OTP

| Tool | Descripcion |
|------|-------------|
| `verify_phone` | Inicia verificacion OTP (SMS, voz o WhatsApp) |
| `check_verification` | Verifica codigo OTP |
| `resend_verification` | Reenvia codigo OTP (mismo o regenerado con `reset_code: "1"`) |
| `reset_verification` | Limpia intentos fallidos (opcionalmente regenera codigo con `reset_code: "1"`) |

### Programa de lealtad

| Tool | Descripcion |
|------|-------------|
| `list_loyalty_cards` | Lista tarjetas de lealtad de tu cuenta |
| `add_loyalty_contact` | Agrega contacto a una tarjeta de lealtad |
| `get_loyalty_contact` | Consulta sellos y canjes de un contacto |

> ⚠️ `register_loyalty_sale` fue removida en v1.0.0 (breaking) por falta de
> idempotency en el endpoint del API. Ver [CHANGELOG](./CHANGELOG.md).

### Monedero electronico

| Tool | Descripcion |
|------|-------------|
| `list_wallets` | Lista monederos de tu cuenta |
| `add_wallet_contact` | Agrega contacto a un monedero |
| `get_wallet_contact` | Consulta saldo de un contacto |
| `update_wallet_balance` | Agrega o resta saldo a un contacto |

### Webhooks

| Tool | Descripcion |
|------|-------------|
| `manage_webhook` | Gestiona el webhook de la cuenta. Acciones: `list`, `add`, `toggle`, `delete`. URLs https obligatorias. |

### Reports

| Tool | Descripcion |
|------|-------------|
| `generate_report` | Reporte detallado por rango de fechas (max 7 dias) |
| `get_report_details` | Agregados rapidos (entregados/fallidos/efectividad) por campaign_id |

### Solicitudes de pago

| Tool | Descripcion |
|------|-------------|
| `send_payment_request` | Envia solicitud de pago a un cliente via SMS usando un template configurado |

### Utilidades

| Tool | Descripcion |
|------|-------------|
| `get_metrics` | Metricas de uso de la sesion (latencia, errores, sandbox vs prod) |

## FAQ Resources

El servidor incluye 6 recursos de ayuda accesibles via MCP resources:

| Resource | Descripcion |
|----------|-------------|
| `getting-started` | Como obtener tu API key y configurar el server |
| `common-errors` | Errores frecuentes y como solucionarlos |
| `limits-and-pricing` | Limites de la API y precios |
| `sandbox-mode` | Como usar el modo sandbox para pruebas |
| `tool-examples` | Ejemplos de uso de cada tool |
| `v1-changes` | Cambios breaking y tools nuevas en v1.0.0 |

## Prompts guiados

Flujos paso a paso que tu asistente puede ejecutar:

| Prompt | Descripcion |
|--------|-------------|
| `enviar-campana` | Verificar saldo, enviar SMS y consultar estadisticas |
| `consultar-lealtad` | Listar tarjetas y consultar sellos de clientes |
| `gestionar-contactos` | Ver agendas, contactos y agregar nuevos |
| `verificar-numero` | Enviar codigo OTP y validarlo |

## Ejemplos

Una vez configurado, puedes pedirle a tu asistente:

- "Cuantos creditos me quedan?"
- "Envia un SMS al 5512345678 con el texto: Tu cita es manana a las 10am"
- "Muestrame mis ultimas campanas"
- "Como fue la entrega de la campana 12345?"
- "Verifica el numero 5598765432 por WhatsApp"
- "Agrega a Juan (5512345678) a mi agenda de recordatorios"
- "Muestrame mis tarjetas de lealtad"
- "Cuantos sellos tiene el cliente 5512345678?"
- "Agrega $50 al monedero del cliente 5598765432"

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
