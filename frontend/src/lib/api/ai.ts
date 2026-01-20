import { api } from './base'

export interface AIConvertResponse {
  result: string
  explanation: string
}

export const convertPrompt = async (
  prompt: string,
  context: string = 'OSDU Search',
  metadata?: any[]
) => {
  const { data } = await api.post<AIConvertResponse>('/ai/convert', {
    prompt,
    context,
    metadata,
  })
  return data
}
