import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? ''
    );

    const { institutionId, institutionPassword } = await req.json();

    console.log('Verifying institution password for:', institutionId);

    // Hash the provided password
    const encoder = new TextEncoder();
    const data = encoder.encode(institutionPassword);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Check if institution exists and password matches
    const { data: institution, error } = await supabaseClient
      .from('institutions')
      .select('institution_id, name')
      .eq('institution_id', institutionId)
      .eq('password_hash', passwordHash)
      .maybeSingle();

    if (error || !institution) {
      console.error('Institution verification failed:', error);
      return new Response(
        JSON.stringify({ valid: false, message: 'Invalid institution ID or password' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    console.log('Institution verified successfully');

    return new Response(
      JSON.stringify({
        valid: true,
        institution: {
          id: institution.institution_id,
          name: institution.name,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in verify-institution:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
