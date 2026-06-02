import { NextRequest, NextResponse } from 'next/server'
import { importExcelToSupabase } from '@/lib/anthropic/import-pipeline'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await request.json()
    const { image_base64 } = body
    if (!image_base64) return NextResponse.json({ error: 'image_base64 requis' }, { status: 400 })

    const result = await importExcelToSupabase(image_base64, user.id, supabase)
    return NextResponse.json(result)

  } catch (error: any) {
    console.error('Import Excel error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
