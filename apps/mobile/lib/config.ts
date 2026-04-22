import Constants from 'expo-constants'

// In development: point at your local API. In production: your deployed API URL.
// Set via app.json extra.apiBaseUrl or EAS environment variables.
export const API_BASE =
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ??
  'https://api.aosanctuary.com/v1'

export const WAIVER_VERSION = 'AO-WAIVER-v1'
