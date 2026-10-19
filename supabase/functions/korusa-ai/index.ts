const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const instructions: Record<string, string> = {
  rewrite: 'Rewrite the message clearly while preserving meaning. Return only the rewritten message.',
  fix_grammar: 'Correct grammar and spelling without changing tone. Return only the corrected message.',
  translate: 'Translate the message into the requested language. Return only the translation.',
  change_tone: 'Rewrite the message using the requested tone. Return only the rewritten message.',
  summarize: 'Summarize the conversation accurately in concise bullet points.',
  suggest_replies: 'Suggest three short, natural replies. Put each reply on its own line.',
  hashtags: 'Generate relevant social hashtags. Return a single space-separated line.',
  caption: 'Generate a polished social caption from the provided context.',
  explain: 'Explain the meaning and intent of this message in clear, neutral language.',
  search: 'Answer the search question using only the supplied conversation context. Say when the answer is not present.',
};

/* Deno declaration to avoid unforseen bugs in future implementation */
declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const apiUrl = Deno.env.get('AI_API_URL');
    const apiKey = Deno.env.get('AI_API_KEY');
    const model = Deno.env.get('AI_MODEL');
    if (!apiUrl || !apiKey || !model) throw new Error('Korusa AI provider secrets are not configured.');
    const body = await request.json();
    const action = String(body.action || '');
    if (!instructions[action]) throw new Error('Unsupported AI action.');
    const extra = [body.tone && `Tone: ${body.tone}`, body.language && `Language: ${body.language}`, body.context && `Conversation context:\n${body.context}`].filter(Boolean).join('\n\n');
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: `You are Korusa AI, a careful messaging assistant. ${instructions[action]}` },
          { role: 'user', content: `${extra}\n\nInput:\n${String(body.input || '')}` },
        ],
        temperature: 0.4,
      }),
    });
    if (!response.ok) throw new Error(`AI provider request failed (${response.status}).`);
    const result = await response.json();
    const output = result.choices?.[0]?.message?.content ?? result.output_text ?? result.output;
    if (!output) throw new Error('AI provider returned no content.');
    return new Response(JSON.stringify({ output }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'AI request failed.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
