import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ChatInterface } from '@/components/copilot/ChatInterface'

interface Props {
  searchParams: Promise<{ q?: string }>
}

export default async function CopilotPage({ searchParams }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { q } = await searchParams

  const { data: messages } = await supabase
    .from('ai_messages')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(50)

  return (
    <div className="h-full max-w-4xl mx-auto">
      <ChatInterface
        initialMessages={messages ?? []}
        initialQuestion={q}
      />
    </div>
  )
}
