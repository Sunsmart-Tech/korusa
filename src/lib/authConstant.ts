// Shared auth constants, so the signup form and the reset-password form can't drift apart.

// Client-side minimum password length.
// KEEP IN SYNC with the minimum password length set in the Supabase project
// (Authentication settings). This only gives users earlier feedback; Supabase
// still enforces its own rule on the server.
export const MIN_PASSWORD_LENGTH = 8;