import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearProspectSession,
  loadProspectSession,
  saveProspectSession,
} from "@/lib/prospect-session-storage";

const STORAGE_KEY = "roth-conversion-optimizer:prospect-profile:v1";

function makeSessionStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
}

describe("prospect-session-storage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("saves and loads a prospect session by profile id", () => {
    vi.stubGlobal("window", { sessionStorage: makeSessionStorage() });

    saveProspectSession({
      profileId: "11111111-1111-4111-8111-111111111111",
      email: "jane@example.com",
      leadFirstName: "Jane",
      leadLastName: "Doe",
    });

    expect(loadProspectSession()).toEqual({
      profileId: "11111111-1111-4111-8111-111111111111",
      email: "jane@example.com",
      leadFirstName: "Jane",
      leadLastName: "Doe",
    });
  });

  it("clears stored session on start over", () => {
    const sessionStorage = makeSessionStorage();
    vi.stubGlobal("window", { sessionStorage });

    saveProspectSession({
      profileId: "11111111-1111-4111-8111-111111111111",
      email: "jane@example.com",
      leadFirstName: "Jane",
      leadLastName: "Doe",
    });
    clearProspectSession();

    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(loadProspectSession()).toBeNull();
  });

  it("overwrites prior session when a new profile is saved", () => {
    vi.stubGlobal("window", { sessionStorage: makeSessionStorage() });

    saveProspectSession({
      profileId: "11111111-1111-4111-8111-111111111111",
      email: "jane@example.com",
      leadFirstName: "Jane",
      leadLastName: "Doe",
    });
    saveProspectSession({
      profileId: "22222222-2222-4222-8222-222222222222",
      email: "jane@example.com",
      leadFirstName: "Jane",
      leadLastName: "Smith",
    });

    expect(loadProspectSession()?.profileId).toBe("22222222-2222-4222-8222-222222222222");
    expect(loadProspectSession()?.leadLastName).toBe("Smith");
  });
});
