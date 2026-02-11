/**
 * Application configuration
 * Loads environment variables for API endpoints and other settings
 */

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

export const config = {
  apiBaseUrl: API_BASE_URL,
  defaultBlinds: {
    small: 10,
    big: 20,
  },
}
