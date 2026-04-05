import type { AIRiskResponse } from '@/types';
import { createAdminClient } from '@/lib/supabase/admin';

const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || '';
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

interface AnalysisContext {
  request_id: string;
  reason: string;
  request_type: string;
  destination: string;
  departure_at: string;
  return_by: string;
  student_name: string;
  recent_requests_count: number;
  recent_reasons: string[];
  is_flagged: boolean;
  late_return_count: number;
}

/**
 * Analyze a pass request using Claude for risk assessment
 */
export async function analyzeRequest(requestId: string): Promise<AIRiskResponse> {
  const startTime = Date.now();
  const supabase = createAdminClient();

  // Fetch the request with student profile
  const { data: request } = await supabase
    .from('pass_requests')
    .select('*, student:profiles(*)')
    .eq('id', requestId)
    .single();

  if (!request) throw new Error('Request not found');

  // Fetch recent requests for pattern analysis
  const { data: recentRequests } = await supabase
    .from('pass_requests')
    .select('reason, created_at')
    .eq('student_id', request.student_id)
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(20);

  // Count late returns
  const { count: lateReturnCount } = await supabase
    .from('passes')
    .select('*', { count: 'exact', head: true })
    .eq('student_id', request.student_id)
    .eq('status', 'expired');

  const context: AnalysisContext = {
    request_id: request.id,
    reason: request.reason,
    request_type: request.request_type,
    destination: request.destination,
    departure_at: request.departure_at,
    return_by: request.return_by,
    student_name: request.student?.full_name || 'Unknown',
    recent_requests_count: recentRequests?.length || 0,
    recent_reasons: recentRequests?.map((r: { reason: string }) => r.reason) || [],
    is_flagged: request.student?.is_flagged || false,
    late_return_count: lateReturnCount || 0,
  };

  const systemPrompt = `You are a campus security AI risk analyzer for PassOS, a student gate pass system.
Analyze the pass request and output a JSON risk assessment. Consider:
1. Is the reason plausible and specific?
2. Are there suspicious patterns in recent requests?
3. Is the timing reasonable?
4. Does the destination match the reason?
5. Are there repeated similar excuses?
6. Is the student already flagged?

Output ONLY valid JSON with this structure:
{
  "risk_level": "low" | "medium" | "high" | "critical",
  "anomaly_score": 0.0 to 1.0,
  "flags": ["array of specific concerns"],
  "reasoning": "brief explanation"
}`;

  const userPrompt = `Analyze this pass request:

Student: ${context.student_name}
Type: ${context.request_type}
Reason: ${context.reason}
Destination: ${context.destination}
Departure: ${context.departure_at}
Return by: ${context.return_by}
Already flagged: ${context.is_flagged}
Requests in last 30 days: ${context.recent_requests_count}
Late returns total: ${context.late_return_count}
Recent reasons: ${context.recent_reasons.slice(0, 5).join(' | ')}`;

  try {
    if (!CLAUDE_API_KEY || CLAUDE_API_KEY === 'your-claude-api-key') {
      throw new Error('Claude API Key is not configured. Falling back to manual review.');
    }

    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || '';

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed: AIRiskResponse = jsonMatch
      ? JSON.parse(jsonMatch[0])
      : { risk_level: 'medium', anomaly_score: 0.5, flags: ['Failed to parse AI response'], reasoning: 'Defaulting to medium risk' };

    const latencyMs = Date.now() - startTime;

    // Store analysis
    await supabase.from('ai_analysis').insert({
      request_id: requestId,
      risk_level: parsed.risk_level,
      anomaly_score: parsed.anomaly_score,
      flags: parsed.flags,
      reasoning: parsed.reasoning,
      raw_response: data,
      model_version: 'claude-sonnet-4-20250514',
      latency_ms: latencyMs,
    });

    return parsed;
  } catch (error) {
    console.error('AI analysis failed:', error);
    // Fallback: default to medium risk
    const fallback: AIRiskResponse = {
      risk_level: 'medium',
      anomaly_score: 0.5,
      flags: ['AI analysis unavailable — manual review required'],
      reasoning: 'AI service error. Defaulting to medium risk for manual review.',
    };

    await supabase.from('ai_analysis').insert({
      request_id: requestId,
      risk_level: fallback.risk_level,
      anomaly_score: fallback.anomaly_score,
      flags: fallback.flags,
      reasoning: fallback.reasoning,
      model_version: 'fallback',
      latency_ms: Date.now() - startTime,
    });

    return fallback;
  }
}
