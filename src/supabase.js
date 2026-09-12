import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://gkladeteufgizvswtguy.supabase.co";
const supabaseKey = "sb_publishable_xw7C9z3LXBY9S-frHqLqcA_dWyJsdYR";

export const supabase = createClient(supabaseUrl, supabaseKey);