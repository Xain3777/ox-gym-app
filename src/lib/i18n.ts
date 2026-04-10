/**
 * Simple i18n utility for OX GYM
 * Currently supports English only, but extensible for future translations
 */

const translations = {
  en: {
    // Auth pages
    "auth.signIn": "SIGN IN",
    "auth.signInDesc": "Enter your credentials to access your OX GYM portal",
    "auth.email": "Email Address",
    "auth.password": "Password",
    "auth.noAccount": "Don't have an account?",
    "auth.signUpLink": "Sign Up",
    "auth.forgotPassword": "Forgot Password?",
    "auth.signUp": "CREATE ACCOUNT",
    "auth.alreadyHaveAccount": "Already have an account?",
    "auth.signInLink": "Sign In",
    "auth.name": "Full Name",
    "auth.confirmPassword": "Confirm Password",
    "auth.agreeTerms": "I agree to the Terms of Service",
    
    // Dashboard
    "dashboard.title": "DASHBOARD",
    "dashboard.welcome": "Welcome back",
    "dashboard.members": "Members",
    "dashboard.sessions": "Sessions",
    "dashboard.revenue": "Revenue",
    
    // Common
    "common.signOut": "Sign Out",
    "common.profile": "Profile",
    "common.settings": "Settings",
    "common.cancel": "Cancel",
    "common.save": "Save",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.close": "Close",
    "common.loading": "Loading...",
    "common.error": "An error occurred",
    "common.success": "Success",
  },
};

type TranslationKey = keyof typeof translations.en;

/**
 * Hook to get translations (client-side)
 * @returns Object with t function to translate keys
 */
export function useTranslation() {
  const locale = "en"; // Default to English for now

  const t = (key: TranslationKey): string => {
    const parts = key.split(".");
    let current: any = translations[locale];

    for (const part of parts) {
      current = current?.[part];
    }

    return current || key;
  };

  return { t, locale };
}

/**
 * Server-side translation function
 */
export function getTranslation(key: TranslationKey, locale = "en"): string {
  const parts = key.split(".");
  let current: any = translations[locale as keyof typeof translations];

  for (const part of parts) {
    current = current?.[part];
  }

  return current || key;
}
