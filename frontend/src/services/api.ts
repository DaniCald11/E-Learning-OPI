import axios from 'axios'
export const api = axios.create({ baseURL: '/api/v1', withCredentials: true })
export async function mutate(path: string, body?: unknown, method: 'post' | 'patch' = 'post') {
  const { data } = await api.get<{ token: string }>('/auth/csrf')
  return api.request({ url: path, method, data: body, headers: { 'X-CSRF-TOKEN': data.token } })
}
export function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 429) return 'Demasiados intentos. Espera un minuto y vuelve a intentarlo.'
    return error.response?.data?.detail ?? error.response?.data?.title ?? 'No se pudo completar la solicitud.'
  }
  return 'No se pudo conectar. Vuelve a intentarlo.'
}
