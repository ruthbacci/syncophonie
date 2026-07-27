import { useState, useEffect } from 'react'
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  format,
  addMonths,
  subMonths,
  isToday,
} from 'date-fns'
import api from '../api/client'
import './GroupPage.css'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Distinct colours for up to 4 players
const PLAYER_COLOURS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444']

function PlayerDot({ colour }) {
  return <span className="player-dot" style={{ background: colour }} />
}

function SlotCell({ players, userSlots, period }) {
  return (
    <div className="gs-slot">
      <span className="gs-period-label">{period === 'morning' ? 'AM' : 'PM'}</span>
      <div className="gs-dots">
        {players.map((p, i) => {
          const key = `${p.userId}:${period}`
          const val = userSlots[key]
          if (val === true) return <PlayerDot key={p.userId} colour={PLAYER_COLOURS[i % PLAYER_COLOURS.length]} />
          if (val === false) return <span key={p.userId} className="player-dot absent" />
          return <span key={p.userId} className="player-dot unset" />
        })}
      </div>
    </div>
  )
}

export default function GroupPage() {
  const [month, setMonth] = useState(new Date())
  const [players, setPlayers] = useState([])
  const [userSlots, setUserSlots] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const monthStr = format(month, 'yyyy-MM')
        const [usersRes, groupRes] = await Promise.all([
          api.get('/users'),
          api.get(`/availability/group?month=${monthStr}`),
        ])

        const usersList = usersRes.data
        setPlayers(usersList)

        const map = {}
        for (const entry of groupRes.data) {
          for (const slot of entry.slots) {
            map[`${entry.userId}:${slot.period}:${slot.date}`] = slot.isAvailable
          }
        }

        // Restructure: key = "userId:period" per date used in cell renderer
        // Actually let's restructure for the cell: key = "userId:period" looked up per day
        // We'll build a lookup: {userId:period:date} → bool
        setUserSlots(map)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [month])

  const start = startOfMonth(month)
  const end = endOfMonth(month)
  const days = eachDayOfInterval({ start, end })
  const startPad = getDay(start)

  function getSlotForDay(userId, period, date) {
    const key = `${userId}:${period}:${date}`
    return userSlots[key]
  }

  // Count how many players are available for a given date+period
  function availableCount(date, period) {
    return players.filter(p => getSlotForDay(p.id, period, date) === true).length
  }

  return (
    <div className="group-page">
      <div className="page-header">
        <h2 className="page-title">Group Availability</h2>
        {loading && <span className="saving-badge">Loading…</span>}
      </div>

      <div className="player-legend">
        {players.map((p, i) => (
          <span key={p.id} className="legend-player">
            <PlayerDot colour={PLAYER_COLOURS[i % PLAYER_COLOURS.length]} />
            {p.displayName}
          </span>
        ))}
      </div>

      <div className="gs-cal-wrap">
        <div className="cal-header">
          <button className="cal-nav" onClick={() => setMonth(m => subMonths(m, 1))}>‹</button>
          <span className="cal-month-label">{format(month, 'MMMM yyyy')}</span>
          <button className="cal-nav" onClick={() => setMonth(m => addMonths(m, 1))}>›</button>
        </div>

        <div className="gs-grid">
          {DAYS.map(d => <div key={d} className="cal-day-name">{d}</div>)}

          {Array.from({ length: startPad }).map((_, i) => (
            <div key={`pad-${i}`} className="gs-cell empty" />
          ))}

          {days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd')
            const amCount = availableCount(dateStr, 'morning')
            const pmCount = availableCount(dateStr, 'afternoon')

            return (
              <div key={dateStr} className={`gs-cell ${isToday(day) ? 'today' : ''}`}>
                <div className="gs-date-row">
                  <span className="cal-date-num">{format(day, 'd')}</span>
                  {amCount === players.length && players.length > 0 && (
                    <span className="all-free-badge" title="Everyone free AM">★AM</span>
                  )}
                  {pmCount === players.length && players.length > 0 && (
                    <span className="all-free-badge" title="Everyone free PM">★PM</span>
                  )}
                </div>

                <div className="gs-periods">
                  <div className="gs-slot">
                    <span className="gs-period-label">AM</span>
                    <div className="gs-dots">
                      {players.map((p, i) => {
                        const val = getSlotForDay(p.id, 'morning', dateStr)
                        return (
                          <span
                            key={p.id}
                            className={`player-dot ${val === true ? 'available' : val === false ? 'absent' : 'unset'}`}
                            style={val === true ? { background: PLAYER_COLOURS[i % PLAYER_COLOURS.length] } : {}}
                            title={`${p.displayName}: ${val === true ? 'Available' : val === false ? 'Unavailable' : 'Not set'}`}
                          />
                        )
                      })}
                    </div>
                  </div>

                  <div className="gs-slot">
                    <span className="gs-period-label">PM</span>
                    <div className="gs-dots">
                      {players.map((p, i) => {
                        const val = getSlotForDay(p.id, 'afternoon', dateStr)
                        return (
                          <span
                            key={p.id}
                            className={`player-dot ${val === true ? 'available' : val === false ? 'absent' : 'unset'}`}
                            style={val === true ? { background: PLAYER_COLOURS[i % PLAYER_COLOURS.length] } : {}}
                            title={`${p.displayName}: ${val === true ? 'Available' : val === false ? 'Unavailable' : 'Not set'}`}
                          />
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="gs-legend-foot">
        <span className="legend-item"><span className="player-dot available" style={{ background: '#6366f1' }} />Available</span>
        <span className="legend-item"><span className="player-dot absent" />Unavailable</span>
        <span className="legend-item"><span className="player-dot unset" />Not set</span>
        <span className="legend-item"><span className="all-free-badge">★AM</span> / <span className="all-free-badge">★PM</span> = everyone free</span>
      </div>
    </div>
  )
}
