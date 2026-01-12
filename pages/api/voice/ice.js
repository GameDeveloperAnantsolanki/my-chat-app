import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { candidate } = req.body;

  await supabase.from("voice_signaling").insert([
    { type: "ice", data: candidate }
  ]);

  res.status(200).end();
}
