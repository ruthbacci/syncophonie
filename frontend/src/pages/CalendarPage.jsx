import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import api from '../api/client'
import AvailabilityCalendar from '../components/AvailabilityCalendar'
import './CalendarPage.css'

export default function CalendarPage() {
  const [month, setMonth] = useState(new Date())
  const [slots, setSlots] = useState({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const fetchAvailability = useCallback(async (m) => {
    setLoading(true)
    try {
      const monthStr = format(m, 'yyyy-MM')
      const { data } = await api.get(`/availability/me?month=${monthStr}`)
      const map = {}
      for (const entry of data) {
        map[`${entry.date}:${entry.period}`] = entry.isAvailable
      }
      setSlots(map)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAvailability(month)
  }, [month, fetchAvailability])

  async function handleToggle(date, period) {
    const key = `${date}:${period}`
    const current = slots[key]
    // Cycle: unset → available → unavailable → unset
    let next
    if (current === undefined) next = true
    else if (current === true) next = false
    else next = undefined

    setSlots(prev => {
      const updated = { ...prev }
      if (next === undefined) {
        delete updated[key]
      } else {
        updated[key] = next
      }
      return updated
    })

    if (next !== undefined) {
      setSaving(true)
      try {
        await api.put('/availability', { date, period, isAvailable: next })
      } catch (err) {
        console.error(err)
        // Revert on error
        setSlots(prev => ({ ...prev, [key]: current }))
      } finally {
        setSaving(false)
      }
    }
  }

  function handleMonthChange(m) {
    setMonth(m)
  }

  return (
    <div className="cal-page">
      <div className="page-header">
        <h2 className="page-title">My Availability</h2>
        {saving && <span className="saving-badge">Saving…</span>}
        {loading && <span className="saving-badge">Loading…</span>}
      </div>
      <p className="page-desc">
        Click <strong>AM</strong> or <strong>PM</strong> on any day to mark yourself available (green) or unavailable (red).
        Click again to clear.
      </p>
      <AvailabilityCalendar
        month={month}
        onMonthChange={handleMonthChange}
        slots={slots}
        onToggle={handleToggle}
      />
    </div>
  )
}
