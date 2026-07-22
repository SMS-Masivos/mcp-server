// Helpers compartidos por las tools OTP v2 (send_otp / verify_otp / get_otp_status / delete_otp).
// El contrato v2 de la API devuelve un envelope consistente y el HTTP status ES la señal principal.
// Estos helpers formatean
// ese envelope para el asistente y deciden cuándo una respuesta es un fallo de herramienta (isError)
// vs. un estado informativo de la verificación (código incorrecto, expirado, etc.) que el asistente
// debe poder leer y accionar.

/** Envelope estándar de las respuestas /v2/otp/*. Todos los campos son opcionales según el caso. */
export interface OtpEnvelope {
  success?: boolean;
  state?: string; // none | pending | verified | expired | locked
  action?: string; // created | resent | restarted | verified | deleted
  error?: string; // slug otp_* cuando success=false
  message?: string;
  hint?: string;
  next?: string[];
  expires_at?: string | null;
  attempts_remaining?: number;
  resend_available_in?: number;
  code?: string; // solo con code_show=1 (pruebas)
  warning?: string;
  request_id?: string;
}

/** Arma un texto legible para el asistente a partir del envelope OTP v2. */
export function formatOtp(body: OtpEnvelope | null | undefined): string {
  if (!body) return "";
  const lines: string[] = [];
  if (body.message) lines.push(body.message);

  const facts: string[] = [];
  if (body.state) facts.push(`estado: ${body.state}`);
  if (typeof body.attempts_remaining === "number") facts.push(`intentos restantes: ${body.attempts_remaining}`);
  if (body.expires_at) facts.push(`expira: ${body.expires_at}`);
  if (typeof body.resend_available_in === "number" && body.resend_available_in > 0) {
    facts.push(`reenvío disponible en ${body.resend_available_in}s`);
  }
  // `code` solo es el OTP generado (code_show=1), que únicamente llega en respuestas de éxito.
  // En errores este campo puede traer un slug de error interno, no un código para mostrar al
  // usuario. Por eso solo se renderiza en envelopes de éxito.
  if (body.code && body.success !== false) facts.push(`código: ${body.code}`);
  if (facts.length) lines.push(facts.join(" · "));

  if (body.warning) lines.push(`⚠️ ${body.warning}`);
  if (body.hint) lines.push(`→ ${body.hint}`);

  return lines.join("\n");
}
