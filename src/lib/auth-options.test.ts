import { describe, expect, it } from "vitest";
import { opcoesEnderecoIp, verificacaoSenhaVazadaAtiva } from "./auth-options";

describe("opcoesEnderecoIp (sign-in rate limit, RF002)", () => {
  it("uses the headers and proxies configured for a self-hosted proxy", () => {
    expect(
      opcoesEnderecoIp({ NODE_ENV: "production", AUTH_IP_HEADERS: "X-Real-IP, x-forwarded-for", AUTH_TRUSTED_PROXIES: "10.0.0.5, 10.1.0.0/16" }),
    ).toEqual({ ipAddressHeaders: ["x-real-ip", "x-forwarded-for"], trustedProxies: ["10.0.0.5", "10.1.0.0/16"] });
  });

  it("trusts the headers Vercel overwrites, with no configuration", () => {
    expect(opcoesEnderecoIp({ NODE_ENV: "production", VERCEL: "1" })).toEqual({
      ipAddressHeaders: ["x-vercel-forwarded-for", "x-forwarded-for"],
    });
  });

  it("keeps the library default in development and tests", () => {
    expect(opcoesEnderecoIp({ NODE_ENV: "development" })).toEqual({});
    expect(opcoesEnderecoIp({ NODE_ENV: "test" })).toEqual({});
  });

  it("refuses a self-hosted production without a trusted source", () => {
    expect(() => opcoesEnderecoIp({ NODE_ENV: "production" })).toThrow(/AUTH_IP_HEADERS/);
  });

  it("rejects malformed proxy entries instead of ignoring them", () => {
    expect(() => opcoesEnderecoIp({ AUTH_TRUSTED_PROXIES: "10.0.0.0/33, proxy.local" })).toThrow(/10\.0\.0\.0\/33, proxy\.local/);
    expect(() => opcoesEnderecoIp({ AUTH_TRUSTED_PROXIES: "2001:db8::/129" })).toThrow();
    expect(opcoesEnderecoIp({ AUTH_TRUSTED_PROXIES: "2001:db8::/48" })).toEqual({ trustedProxies: ["2001:db8::/48"] });
  });
});

describe("verificacaoSenhaVazadaAtiva (NIST SP 800-63B-4)", () => {
  it("checks by default, in every environment", () => {
    expect(verificacaoSenhaVazadaAtiva({ NODE_ENV: "production" })).toBe(true);
    expect(verificacaoSenhaVazadaAtiva({ NODE_ENV: "development" })).toBe(true);
  });

  it("can be turned off outside production only", () => {
    expect(verificacaoSenhaVazadaAtiva({ NODE_ENV: "test", SENHAS_VAZADAS_VERIFICACAO: "desligada" })).toBe(false);
    expect(() => verificacaoSenhaVazadaAtiva({ NODE_ENV: "production", SENHAS_VAZADAS_VERIFICACAO: "desligada" })).toThrow();
  });

  it("rejects unknown values", () => {
    expect(() => verificacaoSenhaVazadaAtiva({ SENHAS_VAZADAS_VERIFICACAO: "off" })).toThrow(/ativa/);
  });
});
