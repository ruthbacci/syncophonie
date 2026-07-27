import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  format,
  addMonths,
  subMonths,
  isSameMonth,
  isToday,
} from 'date-fns'
import './AvailabilityCalendar.css'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/**
 * slots: Map of "YYYY-MM-DD:morning" | "YYYY-MM-DD:afternoon" -> boolean | undefined
 * onToggle(date: string, period: "morning"|"afternoon")
 * readonly: if true, no interaction
 */
export default function AvailabilityCalendar({ month, onMonthChange, slots = {}, onToggle, readonly = false }) {
  const start = startOfMonth(month)
  const end = endOfMonth(month)
  const days = eachDayOfInterval({ start, end })
  const startPad = getDay(start) // 0=Sun

  function getStatus(date, period) {
    const key = `${format(date, 'yyyy-MM-dd')}:${period}`
    const val = slots[key]
    if (val === true) return 'available'
    if (val === false) return 'unavailable'
    return 'unset'
  }

  function handleClick(date, period) {
    if (readonly) return
    onToggle(format(date, 'yyyy-MM-dd'), period)
  }

  return (
    <div className="cal-wrap">
      <div className="cal-header">
        <button className="cal-nav" onClick={() => onMonthChange(subMonths(month, 1))}>‹</button>
        <span className="cal-month-label">{format(month, 'MMMM yyyy')}</span>
        <button className="cal-nav" onClick={() => onMonthChange(addMonths(month, 1))}>›</button>
      </div>

      <div className="cal-grid">
        {DAYS.map(d => (
          <div key={d} className="cal-day-name">{d}</div>
        ))}

        {Array.from({ length: startPad }).map((_, i) => (
          <div key={`pad-${i}`} className="cal-cell empty" />
        ))}

        {days.map(day => {
          const amStatus = getStatus(day, 'morning')
          const pmStatus = getStatus(day, 'afternoon')
          return (
            <div key={day.toISOString()} className={`cal-cell ${!isSameMonth(day, month) ? 'other-month' : ''} ${isToday(day) ? 'today' : ''}`}>
              <span className="cal-date-num">{format(day, 'd')}</span>
              <button
                className={`cal-slot am slot-${amStatus}`}
                onClick={() => handleClick(day, 'morning')}
                disabled={readonly}
                title="Morning"
              >
                AM
              </button>
              <button
                className={`cal-slot pm slot-${pmStatus}`}
                onClick={() => handleClick(day, 'afternoon')}
                disabled={readonly}
                title="Afternoon"
              >
                PM
              </button>
            </div>
          )
        })}
      </div>

      {!readonly && (
        <div className="cal-legend">
          <span className="legend-item"><span className="legend-dot available" />Available</span>
          <span className="legend-item"><span className="legend-dot unavailable" />Unavailable</span>
          <span className="legend-item"><span className="legend-dot unset" />Not set</span>
          <span className="legend-tip">Click AM/PM to toggle</span>
        </div>
      )}
    </div>
  )
}
