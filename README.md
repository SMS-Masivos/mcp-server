# @smsmasivos/mcp-server

[![npm version](https://img.shields.io/npm/v/@smsmasivos/mcp-server)](https://www.npmjs.com/package/@smsmasivos/mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

MCP server para [SMS Masivos](https://www.smsmasivos.com.mx) — plataforma de envio de SMS masivos en Mexico.

Conecta tu asistente de IA con SMS Masivos para enviar mensajes, gestionar contactos, verificar numeros y consultar campanas usando lenguaje natural.

## Features

- **30 tools** — SMS, campanas, contactos, agendas CRUD, webhooks, reports, payment requests, verificacion OTP v2 (send/verify/status/delete), lealtad, monederos y metricas
- **FAQ integrado** — 6 recursos de ayuda accesibles desde tu asistente
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
| `find_agenda` | Busca agendas por nombre (parcial). Paginado por página: `page` (default 1), `limit` (default 20, max 100). Si la respuesta indica `has_more`, vuelve a invocar con el `next_page` sugerido |
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
| `send_otp` | Genera y envia el codigo OTP (SMS, voz o WhatsApp). Repetir la llamada lo reenvia (cooldown 30s); con otro `channel` sale por el canal nuevo; `code_rotate: true` genera uno nuevo |
| `verify_otp` | Verifica el codigo OTP que ingreso el usuario (`code`) |
| `get_otp_status` | Consulta el estado de la verificacion sin efectos (read-only) |
| `delete_otp` | Invalida la verificacion activa (no envia nada) |

### Programa de lealtad

| Tool | Descripcion |
|------|-------------|
| `list_loyalty_cards` | Lista tarjetas de lealtad de tu cuenta |
| `add_loyalty_contact` | Agrega contacto a una tarjeta de lealtad |
| `get_loyalty_contact` | Consulta sellos y canjes de un contacto |

> ℹ️ `register_loyalty_sale` no está disponible en esta versión. Para registrar
> ventas de lealtad, usa el panel web.

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

`manage_webhook` consolida las 4 operaciones en una sola tool vía el campo `action`:

| `action` | Parámetros | Efecto |
|----------|------------|--------|
| `list` | — | Devuelve el webhook configurado y su estado |
| `add` | `url` (https), `status` (`"1"`/`"0"`) | Registra o reemplaza el webhook |
| `toggle` | `status` (`"1"`/`"0"`) | Activa/desactiva sin cambiar la URL |
| `delete` | — | Elimina el webhook (DESTRUCTIVO) |

> Solo se permite **un webhook por cuenta**. Las URLs deben ser `https://`; se rechazan IPs privadas, loopback e IPv6 link-local.

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

### Publicación (mantenedores)

La publicación a npm es **manual** (`npm publish`, requiere permisos de mantenedor).

## Licencia

MIT
