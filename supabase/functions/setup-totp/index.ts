import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base32Encode } from "https://deno.land/std@0.224.0/encoding/base32.ts";
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

    const { data: adminRow } = await adminClient
      .from("admin_emails")
      .select("id")
      .eq("email", user.email!)
      .maybeSingle();

    if (!adminRow) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const secretBytes = crypto.getRandomValues(new Uint8Array(20));
    const secret = base32Encode(secretBytes);

    const encryptionKey = Deno.env.get("TOTP_ENCRYPTION_KEY") ?? serviceKey.slice(0, 32);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(encryptionKey.padEnd(32, "0").slice(0, 32)),
      { name: "AES-GCM" },
      false,
      ["encrypt"],
    );
    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      keyMaterial,
      new TextEncoder().encode(secret),
    );
    const encryptedSecret = encodeBase64(iv) + "." + encodeBase64(new Uint8Array(ciphertext));

    await adminClient.from("admin_totp").upsert({
      user_id: user.id,
      encrypted_secret: encryptedSecret,
      is_enabled: false,
    });

    const issuer = "MarchMadnessSquares";
    const otpauthUrl = `otpauth://totp/${issuer}:${encodeURIComponent(user.email!)}?secret=${secret}&issuer=${issuer}&digits=6&period=30`;

    return new Response(
      JSON.stringify({ secret, otpauth_url: otpauthUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
