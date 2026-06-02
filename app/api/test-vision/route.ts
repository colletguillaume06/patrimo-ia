import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('ANTHROPIC KEY:', process.env.ANTHROPIC_API_KEY ? 'présente (' + process.env.ANTHROPIC_API_KEY.slice(0,12) + '...)' : 'MANQUANTE')
    
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 100,
      messages: [{ role: 'user', content: 'Réponds juste OK' }]
    })
    
    return NextResponse.json({ 
      status: 'OK',
      response: (response.content[0] as any).text,
      key_present: !!process.env.ANTHROPIC_API_KEY
    })
  } catch (error: any) {
    return NextResponse.json({ 
      status: 'ERROR',
      message: error.message,
      type: error.constructor.name,
      key_present: !!process.env.ANTHROPIC_API_KEY
    }, { status: 500 })
  }
}
