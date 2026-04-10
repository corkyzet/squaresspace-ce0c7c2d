import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decode as base32Decode } from "https://deno.land/std@0.224.0/encoding/base32.ts";
import { decodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function generateTOTP(secret: string, timeStep = 30): Promise<string> {
  const epoch = Math.floor(Date.now() / 1000);
  const counter = Math.floor(epoch / timeStep);

  const counterBytes = new Uint8Array(8);
  let tmp = counter;
  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = tmp & 0xff;
    tmp = Math.floor(tmp / 256);
  }

  const keyBytes = base32Decode(secret);
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );

  const hmac = new Uint8Array(await crypto.subtle.sign("HMAC", key, counterBytes));
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return (code % 1_000_000).toString().padStart(6, "0");
}

async function decryptSecret(encrypted: string, encryptionKey: string): Promise<string> {
  const [ivB64, ciphertextB64] = encrypted.split(".");
  const iv = decodeBase64(ivB64);
  const ciphertext = decodeBase64(ciphertextB64);

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(encryptionKey.padEnd(32, "0").slice(0, 32)),
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );

  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    keyMaterial,
    ciphertext,
  );

  return new TextDecoder().decode(plaintext);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { code } = await req.json();
    if (!code || typeof code !== "string" || code.length !== 6) {
      return new Response(JSON.stringify({ error: "Invalid code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    const { data: totp } = await adminClient
      .from("admin_totp")
      .select("encrypted_secret, is_enabled")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!totp) {
      return new Response(JSON.stringify({ error: "2FA not configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const encryptionKey = Deno.env.get("TOTP_ENCRYPTION_KEY") ?? serviceKey.slice(0, 32);
    const secret = await decryptSecret(totp.encrypted_secret, encryptionKey);

    // Check current window and ±1 to account for clock drift
    const codes = await Promise.all([
      generateTOTP(secret, 30),
    ]);
    // Also check the previous and next time step
    const epoch = Math.floor(Date.now() / 1000);
    const prevCounter = Math.floor((epoch - 30) / 30);
    const nextCounter = Math.floor((epoch + 30) / 30);

    const prevCode = await generateTOTPWithCounter(secret, prevCounter);
    const nextCode = await generateTOTPWithCounter(secret, nextCounter);

    const valid = [codes[0], prevCode, nextCode].includes(code);

    if (valid && !totp.is_enabled) {
      await adminClient
        .from("admin_totp")
        .update({ is_enabled: true })
        .eq("user_id", user.id);
    }

    return new Response(
      JSON.stringify({ valid }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function generateTOTPWithCounter(secret: string, counter: number): Promise<string> {
  const counterBytes = new Uint8Array(8);
  let tmp = counter;
  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = tmp & 0xff;
    tmp = Math.floor(tmp / 256);
  }

  const keyBytes = base32Decode(secret);
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );

  const hmac = new Uint8Array(await crypto.subtle.sign("HMAC", key, counterBytes));
  const offset = hmac[hmac.length - 1] & 0x0f;
  const codeNum =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return (codeNum % 1_000_000).toString().padStart(6, "0");
}
