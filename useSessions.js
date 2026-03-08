// src/hooks/useSessions.js
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

// ─── List of sessions (dashboard) ───────────────────────────────────────────

export function useSessions(userId) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return

    supabase
      .from('sessions')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setSessions(data || [])
        setLoading(false)
      })

    const channel = supabase
      .channel('sessions-list')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'sessions',
        filter: `owner_id=eq.${userId}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setSessions(prev => [payload.new, ...prev])
        } else if (payload.eventType === 'UPDATE') {
          setSessions(prev => prev.map(s => s.id === payload.new.id ? payload.new : s))
        } else if (payload.eventType === 'DELETE') {
          setSessions(prev => prev.filter(s => s.id !== payload.old.id))
        }
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [userId])

  const createSession = async ({ title, type, bracketSize }) => {
    const { data, error } = await supabase.from('sessions').insert({
      title,
      type,
      bracket_size: bracketSize || null,
      status: 'idle',
      options: [],
      current_round: null,
      rounds: [],
      owner_id: userId,
    }).select().single()
    if (error) throw error
    return data
  }

  const deleteSession = async (id) => {
    await supabase.from('sessions').delete().eq('id', id)
  }

  return { sessions, loading, createSession, deleteSession }
}

// ─── Single session ──────────────────────────────────────────────────────────

export function useSession(sessionId) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!sessionId) return

    supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single()
      .then(({ data }) => {
        setSession(data)
        setLoading(false)
      })

    const channel = supabase
      .channel(`session-${sessionId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'sessions',
        filter: `id=eq.${sessionId}`,
      }, (payload) => {
        setSession(payload.new)
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [sessionId])

  const updateSession = (patch) =>
    supabase.from('sessions').update(patch).eq('id', sessionId)

  const refetch = async () => {
    const { data } = await supabase.from('sessions').select('*').eq('id', sessionId).single()
    return data
  }

  const addOption = async (label) => {
    const s = await refetch()
    const options = [...(s.options || []), { id: crypto.randomUUID(), label, eliminated: false }]
    await updateSession({ options })
  }

  const removeOption = async (optionId) => {
    const s = await refetch()
    const options = (s.options || []).filter(o => o.id !== optionId)
    await updateSession({ options })
  }

  const startRound = async () => {
    const s = await refetch()
    const activeOptions = getActiveOptionsForRound(s)
    if (!activeOptions || activeOptions.length === 0) return

    const roundNumber = (s.rounds?.length || 0) + 1
    await updateSession({
      status: 'active',
      current_round: {
        roundNumber,
        activeOptions,
        votes: {},
        startedAt: new Date().toISOString(),
        open: true,
      }
    })
  }

  const closeRound = async () => {
    const s = await refetch()
    if (!s.current_round) return

    const { current_round, rounds = [], options, type } = s
    const closedRound = { ...current_round, open: false }

    let updatedOptions = [...options]
    if (type === 'elimination') {
      const votes = current_round.votes || {}
      let maxVotes = -1
      let winnerId = null
      for (const optId of current_round.activeOptions) {
        const v = typeof votes[optId] === 'number' ? votes[optId] : 0
        if (v > maxVotes) { maxVotes = v; winnerId = optId }
      }
      updatedOptions = options.map(o =>
        current_round.activeOptions.includes(o.id) && o.id !== winnerId
          ? { ...o, eliminated: true }
          : o
      )
    }

    const remaining = updatedOptions.filter(o => !o.eliminated)
    const isFinished = type === 'elimination' ? remaining.length <= 1 : false

    await updateSession({
      current_round: null,
      rounds: [...rounds, closedRound],
      options: updatedOptions,
      status: isFinished ? 'finished' : 'idle',
    })
  }

  const submitVote = async (optionId, voterId) => {
    const s = await refetch()
    if (!s.current_round?.open) return false

    const votes = s.current_round.votes || {}
    const voterKey = `voter_${voterId}`
    if (votes[voterKey]) return false

    const updatedVotes = {
      ...votes,
      [optionId]: (typeof votes[optionId] === 'number' ? votes[optionId] : 0) + 1,
      [voterKey]: true,
    }

    await updateSession({
      current_round: { ...s.current_round, votes: updatedVotes }
    })
    return true
  }

  const resetSession = async () => {
    const s = await refetch()
    await updateSession({
      status: 'idle',
      current_round: null,
      rounds: [],
      options: (s.options || []).map(o => ({ ...o, eliminated: false })),
    })
  }

  return {
    session, loading,
    addOption, removeOption,
    startRound, closeRound, submitVote, resetSession,
  }
}

function getActiveOptionsForRound(data) {
  const { type, options, bracket_size, rounds = [] } = data
  const available = options.filter(o => !o.eliminated)

  if (type === 'elimination') return available.map(o => o.id)

  if (type === 'bracket') {
    const usedInPreviousRounds = new Set(rounds.flatMap(r => r.activeOptions || []))
    let unused = available.filter(o => !usedInPreviousRounds.has(o.id)).map(o => o.id)
    if (unused.length === 0) unused = available.map(o => o.id)
    return unused.slice(0, bracket_size || 2)
  }

  return []
}
