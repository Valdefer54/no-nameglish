import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

test("anonymous API calls are rejected even without APP_PASSWORD", () => {
  const response = proxy(new NextRequest("https://example.com/api/feedback"));
  assert.equal(response.status, 401);
  assert.equal(response.headers.has("www-authenticate"), false);
});

test("anonymous page requests go to the login form", () => {
  const response = proxy(new NextRequest("https://example.com/decks"));
  assert.equal(response.status, 307);
  assert.equal(new URL(response.headers.get("location")!).pathname, "/login");
});

test("the login form and auth handler are publicly reachable", () => {
  for (const path of ["/login", "/api/auth/sign-in/email"]) {
    assert.equal(proxy(new NextRequest(`https://example.com${path}`)).status, 200);
  }
});
