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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { institutionId, institutionName, institutionPassword, adminEmail, adminPassword, adminName } = await req.json();

    console.log('Starting institution registration:', { institutionId, institutionName, adminEmail, adminName });

    // Validate required fields
    if (!institutionId || !institutionName || !institutionPassword || !adminEmail || !adminPassword || !adminName) {
      throw new Error('All fields are required');
    }

    // Check if institution already exists
    const { data: existingInstitution } = await supabaseClient
      .from('institutions')
      .select('id')
      .eq('institution_id', institutionId)
      .maybeSingle();

    if (existingInstitution) {
      throw new Error('Institution ID already exists');
    }

    // Hash the institution password
    const encoder = new TextEncoder();
    const data = encoder.encode(institutionPassword);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Create the institution
    const { error: institutionError } = await supabaseClient
      .from('institutions')
      .insert({
        institution_id: institutionId,
        name: institutionName,
        password_hash: passwordHash,
      });

    if (institutionError) {
      console.error('Error creating institution:', institutionError);
      throw new Error('Failed to create institution: ' + institutionError.message);
    }

    // Create admin user with Supabase Auth
    const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        name: adminName,
        institution_id: institutionId,
        role: 'admin',
      },
    });

    if (authError) {
      console.error('Error creating admin user:', authError);
      throw new Error('Failed to create admin user: ' + authError.message);
    }

    // Create profile for admin
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .insert({
        user_id: authData.user.id,
        institution_id: institutionId,
        name: adminName,
        email: adminEmail,
        role: 'admin',
      });

    if (profileError) {
      console.error('Error creating admin profile:', profileError);
      throw new Error('Failed to create admin profile: ' + profileError.message);
    }

    // Add admin role
    const { error: roleError } = await supabaseClient
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        role: 'admin',
      });

    if (roleError) {
      console.error('Error creating admin role:', roleError);
      throw new Error('Failed to create admin role: ' + roleError.message);
    }

    console.log('Institution registered successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Institution registered successfully',
        institution_id: institutionId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in register-institution:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
