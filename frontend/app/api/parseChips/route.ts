export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        role: false,
        location: false,
        company_size: false,
        industry: false,
        experience_level: false,
        skills: false,
      });
    }
    
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const system = `You are a strict extractor. Return a JSON object with ONLY these boolean keys:
- role                 (true if a role/title like "VP of Engineering", "Director" is specified)
- location             (true if a place like "SF", "NYC", "Toronto", "London", or "remote + region" is specified)
- company_size         (true if size is specified via employees count/band or terms like SMB, mid-market, enterprise)
- industry             (true if an industry/sector is specified, e.g., AI, fintech, CPG)
- experience_level     (true if seniority is specified, e.g., junior, senior, lead, VP, director)
- skills               (true if any skills/tech keywords are specified, e.g., Python, React, GTM)

Rules:
- Respond with EXACTLY those keys, booleans only. No extra keys, no prose.
- If multiple are implied, set all relevant keys to true.`;

    const user = `Text: ${JSON.stringify(text)}`;

    const rsp = await client.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0,
      response_format: { type: 'json_object' },
    });

    let json: any = {};
    try { 
      json = JSON.parse(rsp.choices[0]?.message?.content ?? '{}'); 
    } catch {}

    return NextResponse.json({
      role: !!json.role,
      location: !!json.location,
      company_size: !!json.company_size,
      industry: !!json.industry,
      experience_level: !!json.experience_level,
      skills: !!json.skills,
    });
  } catch {
    // soft-fail to "all false"
    return NextResponse.json({
      role: false, 
      location: false, 
      company_size: false,
      industry: false, 
      experience_level: false, 
      skills: false
    }, { status: 200 });
  }
}
