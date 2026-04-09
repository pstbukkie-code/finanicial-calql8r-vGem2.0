import { useState, useEffect } from 'react'
import type { AuditEntry, AuditFilters } from '../../shared/types/api'

const ACTION_COLORS: Record<string, string> = {
  LOGIN: '#4caf79',
  LOGOUT: '#5d7a96',
  LOGIN_FAILED: '#ff6b6b',
  CREATE_FACILITY: '#c9a84c',
  UPDATE_FACILITY: '#8aa8c8',
  DELETE_FACILITY: '#ff6b6b',
  ADD_DRAWDOWN: '#c9a84c',
  ADD_REPAYMENT: '#4caf79',
  RENEW_FACILITY: '#8aa8c8',
  CREATE_USER: '#c9a84c',
  DEACTIVATE_USER: '#ff6b6b',
  RESET_PASSWORD: '#f0a050',
}

export function AuditLogViewer() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [filters, setFilters] = useState<AuditFilters>({ limit: 100 })
  const [loading, setLoading] = useState(false)

  const load = () => {
    setLoading(true)
    window.api.admin
      .getAuditLog(filters)
      .then(setEntries)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const S = {
    label: { fontSize: 11, color: '#5d7a96', marginBottom: 4 } as React.CSSProperties,
    input: { background: '#0d1e30', border: '1px solid #1e3a5f', borderRadius: 5, padding: '6px 10px', color: '#e8f0fe', fontSize: 12, outline: 'none' } as React.CSSProperties,
    th: { textAlign: 'left' as const, padding: '8px 12px', color: '#5d7a96', fontSize: 11, textTransform: 'uppercase' as const, borderBottom: '1px solid #1e3a5f' },
    td: { padding: '9px 12px', borderBottom: '1px solid #0f2035', color: '#c8d8e8', fontSize: 13, verticalAlign: 'top' as const },
  }

  return (
    <div>
      {/* Filters bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <div style={S.label}>From</div>
          <input style={S.input} type="date" value={filters.fromDate ?? ''} onChange={(e) => setFilters({ ...filters, fromDate: e.target.value || undefined })} />
        </div>
        <div>
          <div style={S.label}>To</div>
          <input style={S.input} type="date" value={filters.toDate ?? ''} onChange={(e) => setFilters({ ...filters, toDate: e.target.value || undefined })} />
        </div>
        <div>
          <div style={S.label}>Entity Type</div>
          <select style={S.input} value={filters.entityType ?? ''} onChange={(e) => setFilters({ ...filters, entityType: e.target.value || undefined })}>
            <option value="">All</option>
            <option value="facility">Facility</option>
            <option value="drawdown">Drawdown</option>
            <option value="repayment">Repayment</option>
            <option value="user">User</option>
            <option value="auth">Auth</option>
          </select>
        </div>
        <button
          onClick={load}
          style={{ padding: '7px 16px', background: '#1e3a5f', color: '#c9a84c', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
        >
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      <div style={{ fontSize: 12, color: '#5d7a96', marginBottom: 12 }}>{entries.length} entries</div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            {['Time', 'User', 'Action', 'Entity', 'Detail'].map((h) => (
              <th key={h} style={S.th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id}>
              <td style={{ ...S.td, whiteSpace: 'nowrap', color: '#5d7a96', fontSize: 11 }}>
                {new Date(e.occurred_at).toLocaleString()}
              </td>
              <td style={S.td}>{e.username ?? '—'}</td>
              <td style={S.td}>
                <span style={{
                  display: 'inline-block', padding: '2px 8px', borderRadius: 4,
                  fontSize: 11, fontWeight: 600,
                  background: 'rgba(255,255,255,0.05)',
                  color: ACTION_COLORS[e.action] ?? '#8aa8c8',
                }}>
                  {e.action}
                </span>
              </td>
              <td style={{ ...S.td, color: '#5d7a96', fontSize: 12 }}>
                {e.entity_type ? `${e.entity_type} ${e.entity_id ?? ''}` : '—'}
              </td>
              <td style={{ ...S.td, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11, color: '#5d7a96' }}>
                {e.detail ?? '—'}
              </td>
            </tr>
          ))}
          {entries.length === 0 && (
            <tr><td colSpan={5} style={{ ...S.td, textAlign: 'center', color: '#3d5a78' }}>No entries found</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
