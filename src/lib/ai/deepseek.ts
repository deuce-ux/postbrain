const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY!

export async function deepseekGenerate(prompt: string, systemPrompt?: string) {
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        { role: 'user', content: prompt },
      ],
      temperature: 0.85,
      max_tokens: 2048,
    }),
  })
  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}
