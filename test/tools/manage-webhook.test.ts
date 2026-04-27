import { describe, it, expect } from "vitest";
import { manageWebhookInput } from "../../src/schemas.js";

// Tests del discriminatedUnion. Validan que cada action acepta su shape correcto
// y rechaza shapes de otras actions. Iron Rule: tests por cada branch del discriminator.

describe("manageWebhookInput discriminator", () => {
  describe("action='list'", () => {
    it("acepta sin params extra", () => {
      const result = manageWebhookInput.safeParse({ action: "list" });
      expect(result.success).toBe(true);
    });

    it("acepta con params extra (ignorados)", () => {
      const result = manageWebhookInput.safeParse({
        action: "list",
        url: "https://example.com",
      });
      // discriminatedUnion strict: extra fields no permitidos en branches sin .passthrough()
      // Zod por default es lax (strip), así que esto pasa
      expect(result.success).toBe(true);
    });
  });

  describe("action='add'", () => {
    it("acepta con url https + status válido", () => {
      const result = manageWebhookInput.safeParse({
        action: "add",
        url: "https://hooks.example.com/sms",
        status: "1",
      });
      expect(result.success).toBe(true);
    });

    it("rechaza sin url", () => {
      const result = manageWebhookInput.safeParse({
        action: "add",
        status: "1",
      });
      expect(result.success).toBe(false);
    });

    it("rechaza sin status", () => {
      const result = manageWebhookInput.safeParse({
        action: "add",
        url: "https://hooks.example.com/sms",
      });
      expect(result.success).toBe(false);
    });

    it("rechaza url http (no https)", () => {
      const result = manageWebhookInput.safeParse({
        action: "add",
        url: "http://hooks.example.com/sms",
        status: "1",
      });
      expect(result.success).toBe(false);
    });

    it("rechaza url con IP privada", () => {
      const result = manageWebhookInput.safeParse({
        action: "add",
        url: "https://192.168.1.1/hook",
        status: "1",
      });
      expect(result.success).toBe(false);
    });

    it("rechaza status fuera de 0/1", () => {
      const result = manageWebhookInput.safeParse({
        action: "add",
        url: "https://hooks.example.com/sms",
        status: "2",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("action='toggle'", () => {
    it("acepta con status='1'", () => {
      const result = manageWebhookInput.safeParse({
        action: "toggle",
        status: "1",
      });
      expect(result.success).toBe(true);
    });

    it("acepta con status='0'", () => {
      const result = manageWebhookInput.safeParse({
        action: "toggle",
        status: "0",
      });
      expect(result.success).toBe(true);
    });

    it("rechaza sin status", () => {
      const result = manageWebhookInput.safeParse({ action: "toggle" });
      expect(result.success).toBe(false);
    });
  });

  describe("action='delete'", () => {
    it("acepta sin params extra", () => {
      const result = manageWebhookInput.safeParse({ action: "delete" });
      expect(result.success).toBe(true);
    });
  });

  describe("invalid action", () => {
    it("rechaza action='ADD' (case sensitive)", () => {
      const result = manageWebhookInput.safeParse({
        action: "ADD",
        url: "https://hooks.example.com/sms",
        status: "1",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].code).toBe("invalid_union_discriminator");
      }
    });

    it("rechaza action='create' (no en discriminator)", () => {
      const result = manageWebhookInput.safeParse({ action: "create" });
      expect(result.success).toBe(false);
    });

    it("rechaza sin action", () => {
      const result = manageWebhookInput.safeParse({});
      expect(result.success).toBe(false);
    });
  });
});
