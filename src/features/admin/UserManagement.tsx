import { useState, useEffect } from 'react'
import type { UserRow, GroupRow } from '../../shared/types/api'

const ROLES = ['Admin', 'Manager', 'Viewer', 'Auditor'] as const

const S = {
  section: { marginBottom: 32 } as React.CSSProperties,
  title: { fontSize: 14, fontWeight: 600, color: '#8aa8c8', marginBottom: 12 } as React.CSSProperties,
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 },
  th: { textAlign: 'left' as const, padding: '8px 12px', color: '#5d7a96', fontSize: 11, textTransform: 'uppercase' as const, borderBottom: '1px solid #1e3a5f' },
  td: { padding: '10px 12px', borderBottom: '1px solid #0f2035', color: '#c8d8e8', verticalAlign: 'middle' as const },
  btn: (variant: 'primary' | 'danger' | 'ghost') => ({
    padding: '5px 12px', borderRadius: 5, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
    background: variant === 'primary' ? '#1e3a5f' : variant === 'danger' ? 'rgba(220,53,69,0.2)' : 'transparent',
    color: variant === 'primary' ? '#c9a84c' : variant === 'danger' ? '#ff6b6b' : '#5d7a96',
  }),
  input: { background: '#0d1e30', border: '1px solid #1e3a5f', borderRadius: 5, padding: '7px 10px', color: '#e8f0fe', fontSize: 13, width: '100%', outline: 'none' } as React.CSSProperties,
  select: { background: '#0d1e30', border: '1px solid #1e3a5f', borderRadius: 5, padding: '7px 10px', color: '#e8f0fe', fontSize: 13, outline: 'none' } as React.CSSProperties,
  badge: (role: string) => ({
    display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
    background: role === 'Admin' ? 'rgba(201,168,76,0.15)' : role === 'Manager' ? 'rgba(30,58,95,0.6)' : 'rgba(93,122,150,0.2)',
    color: role === 'Admin' ? '#c9a84c' : role === 'Manager' ? '#8aa8c8' : '#5d7a96',
  }),
}

interface NewUserForm {
  username: string; displayName: string; email: string; password: string; role: string; groupId: string
}

const emptyForm: NewUserForm = { username: '', displayName: '', email: '', password: '', role: 'Viewer', groupId: '' }

export function UserManagement() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [groups, setGroups] = useState<GroupRow[]>([])
  const [form, setForm] = useState<NewUserForm>(emptyForm)
  const [editId, setEditId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [newGroupName, setNewGroupName] = useState('')

  const reload = () => {
    window.api.admin.getUsers().then(setUsers)
    window.api.admin.getGroups().then(setGroups)
  }

  useEffect(() => { reload() }, [])

  const handleSubmit = async () => {
    setError('')
    if (!form.username || !form.displayName || (!editId && !form.password)) {
      setError('Username, display name and password are required')
      return
    }
    try {
      if (editId) {
        await window.api.admin.updateUser(editId, {
          displayName: form.displayName,
          email: form.email,
          role: form.role as UserRow['role'],
          groupId: form.groupId || null,
        })
        setEditId(null)
      } else {
        await window.api.admin.createUser({ ...form, groupId: form.groupId || undefined })
      }
      setForm(emptyForm)
      reload()
    } catch (e: unknown) {
      setError((e as Error).message)
    }
  }

  const startEdit = (u: UserRow) => {
    setEditId(u.id)
    setForm({ username: u.username, displayName: u.display_name, email: u.email ?? '', password: '', role: u.role, groupId: u.group_id ?? '' })
  }

  const deactivate = async (id: string) => {
    if (!confirm('Deactivate this user?')) return
    try { await window.api.admin.deactivateUser(id); reload() }
    catch (e: unknown) { alert((e as Error).message) }
  }

  const createGroup = async () => {
    if (!newGroupName.trim()) return
    await window.api.admin.createGroup(newGroupName.trim())
    setNewGroupName('')
    reload()
  }

  return (
    <div>
      {/* Groups */}
      <div style={S.section}>
        <div style={S.title}>Groups</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input style={{ ...S.input, width: 200 }} placeholder="New group name" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} />
          <button style={S.btn('primary')} onClick={createGroup}>Add Group</button>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {groups.map((g) => (
            <div key={g.id} style={{ background: '#0d1e30', border: '1px solid #1e3a5f', borderRadius: 6, padding: '6px 14px', fontSize: 13, color: '#8aa8c8' }}>
              {g.name} <span style={{ color: '#5d7a96', fontSize: 11 }}>({g.memberCount})</span>
            </div>
          ))}
        </div>
      </div>

      {/* User form */}
      <div style={{ background: '#0a1520', border: '1px solid #1e3a5f', borderRadius: 8, padding: 16, marginBottom: 24 }}>
        <div style={{ ...S.title, marginBottom: 16 }}>{editId ? 'Edit User' : 'Add New User'}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: '#5d7a96', marginBottom: 4 }}>Username *</div>
            <input style={S.input} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} disabled={!!editId} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#5d7a96', marginBottom: 4 }}>Display Name *</div>
            <input style={S.input} value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#5d7a96', marginBottom: 4 }}>Email</div>
            <input style={S.input} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          {!editId && (
            <div>
              <div style={{ fontSize: 11, color: '#5d7a96', marginBottom: 4 }}>Password *</div>
              <input style={S.input} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
          )}
          <div>
            <div style={{ fontSize: 11, color: '#5d7a96', marginBottom: 4 }}>Role</div>
            <select style={S.select} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#5d7a96', marginBottom: 4 }}>Group</div>
            <select style={S.select} value={form.groupId} onChange={(e) => setForm({ ...form, groupId: e.target.value })}>
              <option value="">None</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
        </div>
        {error && <div style={{ color: '#ff6b6b', fontSize: 12, marginBottom: 10 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={S.btn('primary')} onClick={handleSubmit}>{editId ? 'Save Changes' : 'Create User'}</button>
          {editId && <button style={S.btn('ghost')} onClick={() => { setEditId(null); setForm(emptyForm) }}>Cancel</button>}
        </div>
      </div>

      {/* Users table */}
      <div style={S.title}>Users ({users.length})</div>
      <table style={S.table}>
        <thead>
          <tr>
            {['Username', 'Display Name', 'Role', 'Group', 'Last Login', 'Status', ''].map((h) => (
              <th key={h} style={S.th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td style={S.td}>{u.username}</td>
              <td style={S.td}>{u.display_name}</td>
              <td style={S.td}><span style={S.badge(u.role)}>{u.role}</span></td>
              <td style={S.td}>{u.group_name ?? '—'}</td>
              <td style={S.td}>{u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}</td>
              <td style={S.td}>
                <span style={{ color: u.is_active ? '#4caf79' : '#ff6b6b', fontSize: 12 }}>
                  {u.is_active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td style={S.td}>
                <div style={{ display: 'flex', gap: 6 }}>
                  {u.is_active === 1 && <>
                    <button style={S.btn('ghost')} onClick={() => startEdit(u)}>Edit</button>
                    <button style={S.btn('danger')} onClick={() => deactivate(u.id)}>Deactivate</button>
                  </>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
