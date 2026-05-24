import axios from 'axios'

const baseURL =
  (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:4000/api/v1'

export const api = axios.create({
  baseURL,
  withCredentials: false,
  timeout: 10_000,
})
