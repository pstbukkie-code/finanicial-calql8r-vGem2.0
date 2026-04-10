import { useState, useEffect, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import {
  fmtN,
  formatTenure,
  fmtFull,
  fmtPct,
  daysBetween,
  calcStats,
  calcDrawdownSubsidiaryStats,
  generateInterestSchedule,
  exportToCSV,
  parseCSV,
} from './utils';
import {
  defaultBanks,
  defaultSubsidiaries,
  initialCurrencies,
  initialFacilities,
} from './data';
import { S, mkbtn, KPI, Badge, UtilBar, Modal, ConfirmModal } from './ui.jsx';
import {
  InterestFeesPage,
  DrawdownsPage,
  RepaymentSchedulePage,
  FacilityCard,
  PerformancePage,
} from './pages';
import {
  CurrencyManager,
  BanksSubsidiariesManager,
  FacilityDetailModal,
  SubsidiaryDetailModal,
  CSVImportWizard,
  FacilityFormWizard,
  DrawdownModal,
  RepayModal,
  ScenarioModal,
  RenewalModal,
} from './modals';

// --- Date/Time Hook ---
function useDateTime() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000 * 60);
    return () => clearInterval(timer);
  }, []);
  return now;
}

// --- PERMISSIONS HOOK (Centralized RBAC) ---
function usePermissions(userRole) {
  return useMemo(() => ({
    canViewAuditLog: () => userRole === 'System Administrator',
    canManageUsers: () => userRole === 'System Administrator',
    canEditFacilities: () => userRole !== 'Viewer',
    canAddFacilities: () => userRole !== 'Viewer',
    canDeleteFacilities: () => userRole !== 'Viewer',
    canDrawdown: () => userRole !== 'Viewer',
    canRepay: () => userRole !== 'Viewer',
    canRenew: () => userRole !== 'Viewer',
    canExportAuditLog: () => userRole === 'System Administrator',
  }), [userRole]);
}

// --- SESSION TIMEOUT HOOK ---
function useSessionTimeout(onTimeout, timeoutMinutes = 30) {
  useEffect(() => {
    let timeoutId;
    let warningId;

    const resetTimeout = () => {
      clearTimeout(timeoutId);
      clearTimeout(warningId);

      // Warn user 2 minutes before timeout
      warningId = setTimeout(() => {
        console.warn('⚠️ Session will expire in 2 minutes due to inactivity');
      }, (timeoutMinutes - 2) * 60 * 1000);

      // Trigger logout after timeout
      timeoutId = setTimeout(() => {
        console.log('🔐 Session expired due to inactivity');
        onTimeout();
      }, timeoutMinutes * 60 * 1000);
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      window.addEventListener(event, resetTimeout);
    });

    resetTimeout();

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(warningId);
      events.forEach(event => {
        window.removeEventListener(event, resetTimeout);
      });
    };
  }, [onTimeout, timeoutMinutes]);
}

// --- LOGOUT CONFIRMATION MODAL ---
function LogoutConfirmModal({ onConfirm, onCancel }) {
  return (
    <Modal title="🔐 Confirm Logout" onClose={onCancel} width={400}>
      <p style={{ color: '#cbd5e1', fontSize: 13, lineHeight: 1.6, marginBottom: 18 }}>
        Are you sure you want to log out? Any unsaved changes will be lost.
      </p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onCancel} style={{ ...mkbtn('#1e3a5f', '#8aa3be'), flex: 1 }}>
          CANCEL
        </button>
        <button onClick={onConfirm} style={{ ...mkbtn('#ef4444', '#fca5a5'), flex: 1 }}>
          LOGOUT
        </button>
      </div>
    </Modal>
  );
}

// --- ENHANCED USER MANAGEMENT TABLE ---
function UserManagementTable({ user }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('User');
  const [editingUserId, setEditingUserId] = useState(null);
  const [editingRole, setEditingRole] = useState('User');
  const [searchTerm, setSearchTerm] = useState('');

  const loadUsersFromSharePoint = async () => {
    try {
      if (window.electronAPI?.readFile) {
        console.log('📂 Reading users.json from SharePoint...');
        const fileContent = await window.electronAPI.readFile('auth/users.json');
        const usersData = JSON.parse(fileContent);
        const usersList = usersData.authorized_users || [];
        setUsers(usersList);
        console.log('✅ Loaded users from SharePoint:', usersList.length);
      } else {
        setUsers([
          { id: 1, email: 'admin@company.com', displayName: 'Admin User', role: 'System Administrator', password: 'Demo123', lastLogin: new Date().toISOString() },
          { id: 2, email: 'user@company.com', displayName: 'Regular User', role: 'User', password: 'Demo123', lastLogin: new Date(Date.now() - 86400000).toISOString() },
        ]);
      }
    } catch (err) {
      console.error('❌ Could not fetch users:', err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsersFromSharePoint();
  }, []);

  const saveUsersToSharePoint = async (updatedUsers) => {
    try {
      if (window.electronAPI?.writeFile) {
        const usersData = { authorized_users: updatedUsers };
        const jsonContent = JSON.stringify(usersData, null, 2);
        await window.electronAPI.writeFile('auth/users.json', jsonContent);
        console.log('✅ Users saved to SharePoint successfully');
        return true;
      } else {
        console.warn('⚠️ Electron API not available');
        return false;
      }
    } catch (err) {
      console.error('❌ Failed to save users:', err);
      return false;
    }
  };

  const handleAddUser = async () => {
    if (!newUserEmail || !newUserPassword) {
      alert('Please enter email and password');
      return;
    }
    if (!newUserEmail.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }
    if (users.some(u => u.email === newUserEmail)) {
      alert('This email is already registered');
      return;
    }

    const newUser = {
      id: Date.now(),
      email: newUserEmail,
      displayName: newUserEmail.split('@')[0].split('.').map(n => n.charAt(0).toUpperCase() + n.slice(1)).join(' '),
      password: newUserPassword,
      role: newUserRole,
      requiresPasswordChange: true,
      createdAt: new Date().toISOString(),
      lastLogin: null,
    };

    const updatedUsers = [...users, newUser];
    const saved = await saveUsersToSharePoint(updatedUsers);
    if (saved) {
      setUsers(updatedUsers);
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRole('User');
      alert(`✅ User ${newUserEmail} created successfully.`);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    const updatedUsers = users.map(u => u.id === userId ? { ...u, role: newRole } : u);
    const saved = await saveUsersToSharePoint(updatedUsers);
    if (saved) {
      setUsers(updatedUsers);
      setEditingUserId(null);
    }
  };

  const handleResetPassword = async (userId, userEmail) => {
    const tempPassword = 'TempPass' + Math.random().toString(36).substring(2, 8);
    const updatedUsers = users.map(u => u.id === userId ? { ...u, password: tempPassword, requiresPasswordChange: true } : u);
    const saved = await saveUsersToSharePoint(updatedUsers);
    if (saved) {
      setUsers(updatedUsers);
      alert(`✅ Password reset for ${userEmail}.\nTemporary password: ${tempPassword}`);
    }
  };

  const handleDeleteUser = async (userId, userEmail) => {
    if (!window.confirm(`Delete ${userEmail}? This cannot be undone.`)) return;
    const updatedUsers = users.filter(u => u.id !== userId);
    const saved = await saveUsersToSharePoint(updatedUsers);
    if (saved) {
      setUsers(updatedUsers);
      alert(`✅ User ${userEmail} deleted`);
    }
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.displayName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div style={{ color: '#8aa3be' }}>Loading users...</div>;

  return (
    <div>
      {/* ADD NEW USER FORM */}
      <div style={{ ...S.card, marginBottom: 16, padding: 16 }}>
        <div style={S.sec}>➕ Add New User</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 10, marginTop: 12 }}>
          <input
            type="email"
            placeholder="user@company.com"
            value={newUserEmail}
            onChange={(e) => setNewUserEmail(e.target.value)}
            style={S.inp}
          />
          <input
            type="password"
            placeholder="Temporary Password"
            value={newUserPassword}
            onChange={(e) => setNewUserPassword(e.target.value)}
            style={S.inp}
          />
          <select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value)} style={S.inp}>
            <option value="System Administrator">System Administrator</option>
            <option value="User">User</option>
            <option value="Viewer">Viewer</option>
          </select>
          <button onClick={handleAddUser} style={mkbtn('#22c55e', '#0a1520')}>
            Add User
          </button>
        </div>
      </div>

      {/* SEARCH USERS */}
      <div style={{ marginBottom: 12 }}>
        <input
          type="text"
          placeholder="🔍 Search users by email or name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ ...S.inp, width: '300px' }}
        />
      </div>

      {/* USERS TABLE */}
      <table style={S.table}>
        <thead>
          <tr>
            <th style={S.th}>Email</th>
            <th style={S.th}>Display Name</th>
            <th style={S.th}>Role</th>
            <th style={S.th}>Last Login</th>
            <th style={S.th}>Status</th>
            <th style={S.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredUsers.map(u => (
            <tr key={u.id}>
              <td style={S.td}>{u.email}</td>
              <td style={S.td}>{u.displayName}</td>
              <td style={S.td}>
                {editingUserId === u.id ? (
                  <select
                    value={editingRole}
                    onChange={(e) => setEditingRole(e.target.value)}
                    style={{ ...S.inp, width: 140, padding: '6px', fontSize: 11 }}
                  >
                    <option value="System Administrator">System Administrator</option>
                    <option value="User">User</option>
                    <option value="Viewer">Viewer</option>
                  </select>
                ) : (
                  <span style={{ color: '#a78bfa', fontWeight: 600 }}>{u.role}</span>
                )}
              </td>
              <td style={S.td}>
                {u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Never'}
              </td>
              <td style={S.td}>
                {u.requiresPasswordChange ? (
                  <span style={{ color: '#f59e0b', fontSize: 10, fontWeight: 600 }}>🔐 Pwd Change</span>
                ) : (
                  <span style={{ color: '#22c55e', fontSize: 10 }}>✓ Active</span>
                )}
              </td>
              <td style={S.td}>
                <div style={{ display: 'flex', gap: 6 }}>
                  {editingUserId === u.id ? (
                    <>
                      <button
                        onClick={() => handleRoleChange(u.id, editingRole)}
                        style={mkbtn('#22c55e', '#0a1520', 'sm')}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingUserId(null)}
                        style={mkbtn('#6b7280', '#fff', 'sm')}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleResetPassword(u.id, u.email)}
                        style={mkbtn('#f59e0b', '#0a1520', 'sm')}
                        title="Send password reset"
                      >
                        🔑 Reset
                      </button>
                      <button
                        onClick={() => { setEditingUserId(u.id); setEditingRole(u.role); }}
                        style={mkbtn('#3b82f6', '#fff', 'sm')}
                      >
                        ✎ Edit
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u.id, u.email)}
                        style={mkbtn('#ef4444', '#fca5a5', 'sm')}
                      >
                        🗑 Delete
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// --- ENHANCED UNIFIED AUDIT TRAIL TABLE ---
function UnifiedAuditTrailTable({ onExport }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterUser, setFilterUser] = useState('All');
  const [filterAction, setFilterAction] = useState('All');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  useEffect(() => {
    const fetchAuditLogs = async () => {
      try {
        const allLogs = [];

        // Fetch from audit_trail.txt
        if (window.electronAPI?.readFile) {
          try {
            const auditContent = await window.electronAPI.readFile('audit_trail.txt');
            const auditLines = auditContent.split('\n').filter(line => line.trim());
            auditLines.forEach((line, idx) => {
              try {
                const parsed = JSON.parse(line);
                allLogs.push({ id: `audit-${idx}`, source: 'audit_trail.txt', ...parsed });
              } catch (e) {
                allLogs.push({ id: `audit-${idx}`, source: 'audit_trail.txt', timestamp: line, user: 'Unknown', action: 'Unknown', facilityId: '-' });
              }
            });
          } catch (err) {
            console.warn('Could not read audit_trail.txt:', err);
          }

          // Fetch from app.log
          try {
            const appLogContent = await window.electronAPI.readFile('app.log');
            const appLogLines = appLogContent.split('\n').filter(line => line.trim());
            appLogLines.forEach((line, idx) => {
              try {
                const parsed = JSON.parse(line);
                allLogs.push({ id: `applog-${idx}`, source: 'app.log', ...parsed });
              } catch (e) {
                // Try to parse as plain text log
                const match = line.match(/\[(.*?)\]\s+\[(.*?)\]\s+(.*)/);
                if (match) {
                  allLogs.push({
                    id: `applog-${idx}`,
                    source: 'app.log',
                    timestamp: match[1],
                    level: match[2],
                    message: match[3],
                    user: 'System',
                    action: match[2],
                  });
                }
              }
            });
          } catch (err) {
            console.warn('Could not read app.log:', err);
          }
        }

        // Fallback demo data
        if (allLogs.length === 0) {
          allLogs.push(
            { id: 1, source: 'audit_trail.txt', timestamp: new Date().toISOString(), user: 'admin@company.com', action: 'EDIT_FACILITY', facilityId: 'F1234' },
            { id: 2, source: 'app.log', timestamp: new Date(Date.now() - 60000).toISOString(), user: 'user@company.com', action: 'ADD_DRAWDOWN', facilityId: 'F5678' }
          );
        }

        setLogs(allLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
      } catch (err) {
        console.warn('Could not fetch audit logs:', err);
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAuditLogs();
  }, []);

  const uniqueUsers = useMemo(() => {
    const users = new Set(logs.map(l => l.user).filter(Boolean));
    return ['All', ...Array.from(users).sort()];
  }, [logs]);

  const uniqueActions = useMemo(() => {
    const actions = new Set(logs.map(l => l.action).filter(Boolean));
    return ['All', ...Array.from(actions).sort()];
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (filterUser !== 'All' && log.user !== filterUser) return false;
      if (filterAction !== 'All' && log.action !== filterAction) return false;
      if (filterDateFrom && new Date(log.timestamp) < new Date(filterDateFrom)) return false;
      if (filterDateTo && new Date(log.timestamp) > new Date(filterDateTo)) return false;
      return true;
    });
  }, [logs, filterUser, filterAction, filterDateFrom, filterDateTo]);

  const handleExport = () => {
    const csvData = filteredLogs.map(log => ({
      'Date/Time': new Date(log.timestamp).toLocaleString(),
      'User': log.user || 'Unknown',
      'Action': log.action || 'Unknown',
      'Facility ID': log.facilityId || '-',
      'Source': log.source || '-',
    }));
    exportToCSV(csvData, 'audit_trail.csv');
    alert('✅ Audit trail exported to CSV');
  };

  if (loading) return <div style={{ color: '#8aa3be' }}>Loading audit trail...</div>;

  return (
    <div>
      {/* FILTERS */}
      <div style={{ ...S.card, marginBottom: 16, padding: 16 }}>
        <div style={S.sec}>🔍 Filters</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: 10, marginTop: 12 }}>
          <select value={filterUser} onChange={(e) => setFilterUser(e.target.value)} style={S.inp}>
            {uniqueUsers.map(u => <option key={u}>{u}</option>)}
          </select>
          <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)} style={S.inp}>
            {uniqueActions.map(a => <option key={a}>{a}</option>)}
          </select>
          <input
            type="datetime-local"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            style={S.inp}
            placeholder="From"
          />
          <input
            type="datetime-local"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            style={S.inp}
            placeholder="To"
          />
          <button onClick={handleExport} style={mkbtn('#22c55e', '#0a1520')}>
            📥 Export CSV
          </button>
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: '#8aa3be' }}>
          Showing {filteredLogs.length} of {logs.length} entries
        </div>
      </div>

      {/* AUDIT TABLE */}
      <table style={S.table}>
        <thead>
          <tr>
            <th style={S.th}>Date/Time</th>
            <th style={S.th}>User</th>
            <th style={S.th}>Action</th>
            <th style={S.th}>Facility ID</th>
            <th style={S.th}>Source</th>
          </tr>
        </thead>
        <tbody>
          {filteredLogs.slice(0, 100).map(log => (
            <tr key={log.id}>
              <td style={S.td}>{new Date(log.timestamp).toLocaleString()}</td>
              <td style={S.td}>{log.user || 'Unknown'}</td>
              <td style={S.td}><span style={{ color: '#c9a84c', fontWeight: 600 }}>{log.action || 'Unknown'}</span></td>
              <td style={S.td}>{log.facilityId || '-'}</td>
              <td style={S.td}><span style={{ fontSize: 10, color: '#8aa3be' }}>{log.source || '-'}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// --- Main App Component ---
export default function App() {
  const [facilities, setFacilities] = useState(() => {
    const saved = localStorage.getItem('my_facilities');
    return saved ? JSON.parse(saved) : [];
  });

  const handleEditClick = async (loan) => {
    try {
      if (window.electronAPI?.checkLock) {
        const lockStatus = await window.electronAPI.checkLock(loan.id);
        if (lockStatus.isLocked && lockStatus.user !== user.displayName) {
          alert(`STOP: ${lockStatus.user} is currently editing this facility.`);
          return;
        }
        await window.electronAPI.setLock(loan.id, user.displayName);
      }
    } catch (err) {
      console.warn('Lock check failed:', err);
    }
    setModal({ type: 'editFac', facilityId: loan.id });
  };

  const handleDetailClick = (loan) => {
    setSelectedFacility(loan);
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    setUser(null);
    setLoginMode('login');
    setFacilities([]);
    setModal(null);
    setConfirm(null);
    setShowLogoutConfirm(false);
  };

  // --- AUTHENTICATION STATE ---
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState('');
  const [loginMode, setLoginMode] = useState('loading');
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // --- SESSION TIMEOUT ---
  useSessionTimeout(() => {
    alert('⏱️ Your session has expired due to inactivity. Please log in again.');
    confirmLogout();
  }, 30);

  // --- PERMISSIONS ---
  const permissions = usePermissions(user?.role);

  const handleManualLogin = async (email, password) => {
    try {
      if (window.electronAPI?.verifyUser) {
        const result = await window.electronAPI.verifyUser({ email, password });
        if (result.success) {
          setUser({
            email: result.user.email,
            displayName: result.user.displayName || email.split('@')[0],
            role: result.user.role || 'User',
            requiresPasswordChange: result.user.requiresPasswordChange || false
          });

          if (result.user.requiresPasswordChange) {
            setShowPasswordChange(true);
            return;
          }

          try {
            const savedLoans = await window.electronAPI.loadLoans();
            if (savedLoans.length > 0) {
              setFacilities(savedLoans);
            }
          } catch (err) {
            console.warn('Could not load facilities:', err);
          }

          setLoginMode('authenticated');
          await window.electronAPI.writeLog(`User ${result.user.email} logged in via Manual Auth`);
        } else {
          setAuthError(result.error);
        }
      } else {
        try {
          if (window.electronAPI?.readFile) {
            const fileContent = await window.electronAPI.readFile('auth/users.json');
            const usersData = JSON.parse(fileContent);
            const authorizedUsers = usersData.authorized_users || [];
            const foundUser = authorizedUsers.find(u => u.email === email && u.password === password);

            if (foundUser) {
              setUser({
                email: foundUser.email,
                displayName: foundUser.displayName || email.split('@')[0],
                role: foundUser.role || 'User',
                requiresPasswordChange: foundUser.requiresPasswordChange || false
              });

              if (foundUser.requiresPasswordChange) {
                setShowPasswordChange(true);
                return;
              }

              try {
                const savedLoans = await window.electronAPI.loadLoans();
                if (savedLoans.length > 0) {
                  setFacilities(savedLoans);
                }
              } catch (err) {
                console.warn('Could not load facilities:', err);
              }

              setLoginMode('authenticated');
            } else {
              setAuthError('Invalid email or password');
            }
          } else {
            setAuthError('Authentication service unavailable');
          }
        } catch (err) {
          console.error('Login error:', err);
          setAuthError('Authentication failed. Please try again.');
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      setAuthError('Authentication failed. Please try again.');
    }
  };

  const handlePasswordChange = async () => {
    if (!newPassword || !confirmPassword) {
      alert('Please enter and confirm your new password');
      return;
    }

    if (newPassword !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    try {
      if (window.electronAPI?.readFile && window.electronAPI?.writeFile) {
        const fileContent = await window.electronAPI.readFile('auth/users.json');
        const usersData = JSON.parse(fileContent);
        const updatedUsers = usersData.authorized_users.map(u => 
          u.email === user.email 
            ? { ...u, password: newPassword, requiresPasswordChange: false, lastLogin: new Date().toISOString() }
            : u
        );

        const newData = { authorized_users: updatedUsers };
        await window.electronAPI.writeFile('auth/users.json', JSON.stringify(newData, null, 2));
      }

      setUser({ ...user, requiresPasswordChange: false });
      setShowPasswordChange(false);
      setNewPassword('');
      setConfirmPassword('');

      try {
        const savedLoans = await window.electronAPI.loadLoans();
        if (savedLoans.length > 0) {
          setFacilities(savedLoans);
        }
      } catch (err) {
        console.warn('Could not load facilities:', err);
      }

      setLoginMode('authenticated');
      alert('✅ Password changed successfully.');
    } catch (err) {
      console.error('Failed to change password:', err);
      alert('Failed to change password. Please try again.');
    }
  };

  const [savedBanks, setSavedBanks] = useState(() => {
    const saved = localStorage.getItem("my_banks");
    return saved ? JSON.parse(saved) : defaultBanks;
  });

  const [savedSubsidiaries, setSavedSubsidiaries] = useState(() => {
    const saved = localStorage.getItem("my_bus");
    try {
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) ? parsed : defaultSubsidiaries;
    } catch (e) {
      return defaultSubsidiaries;
    }
  });

  const [currencies, setCurrencies] = useState(() => {
    const saved = localStorage.getItem("my_currencies");
    return saved ? JSON.parse(saved) : initialCurrencies;
  });

  useEffect(() => {
    localStorage.setItem('my_facilities', JSON.stringify(facilities));
  }, [facilities]);

  useEffect(() => {
    localStorage.setItem("my_banks", JSON.stringify(savedBanks));
  }, [savedBanks]);

  useEffect(() => {
    localStorage.setItem("my_bus", JSON.stringify(savedSubsidiaries));
  }, [savedSubsidiaries]);

  useEffect(() => {
    localStorage.setItem("my_currencies", JSON.stringify(currencies));
  }, [currencies]);

  const [displayCcy, setDisplayCcy] = useState('NGN');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [modal, setModal] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [search, setSearch] = useState('');
  const [filterBank, setFilterBank] = useState('All');
  const [filterCcy, setFilterCcy] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterClass, setFilterClass] = useState('All');
  const [groupByBank, setGroupByBank] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [selectedSubsidiary, setSelectedSubsidiary] = useState(null);
  const [selectedYearMonth, setSelectedYearMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [costPeriod, setCostPeriod] = useState('month');
  const [costYear, setCostYear] = useState(new Date().getFullYear());
  const [costQuarter, setCostQuarter] = useState(
    Math.floor(new Date().getMonth() / 3) + 1
  );

  const now = useDateTime();

  const allStats = useMemo(
    () => facilities.map((f) => ({ ...f, ...calcStats(f, currencies, now) })),
    [facilities, currencies, now]
  );

  const uniqueBanks = useMemo(
    () => ['All', ...new Set(facilities.map((f) => f.bank))],
    [facilities]
  );

  const filtered = useMemo(
    () =>
      allStats.filter((f) => {
        if (filterBank !== 'All' && f.bank !== filterBank) return false;
        if (filterCcy !== 'All' && f.ccy !== filterCcy) return false;
        if (filterStatus !== 'All' && f.status !== filterStatus) return false;
        if (filterClass !== 'All' && f.facilityClass !== filterClass)
          return false;
        if (
          search &&
          !f.bank.toLowerCase().includes(search.toLowerCase()) &&
          !f.facilityName.toLowerCase().includes(search.toLowerCase())
        )
          return false;
        return true;
      }),
    [allStats, filterBank, filterCcy, filterStatus, filterClass, search]
  );

  const active = allStats.filter((f) => f.status === 'Active');
  const toDisplay = (amount, fromCcy) => {
    if (displayCcy === fromCcy) return amount;
    const fx = currencies.find((c) => c.code === fromCcy)?.rate || 1;
    return displayCcy === 'NGN' ? amount * fx : amount / fx;
  };

  const totalFacilityAmount = active.reduce(
    (s, f) => s + toDisplay(f.facilityAmount, f.ccy),
    0
  );
  const totalDrawn = active.reduce((s, f) => s + toDisplay(f.drawn, f.ccy), 0);
  const totalAvailable = active.reduce(
    (s, f) => s + toDisplay(f.available, f.ccy),
    0
  );
  const totalInterest = active.reduce((s, f) => s + toDisplay(f.interest, f.ccy), 0);
  const overallUtil = totalFacilityAmount > 0 ? (totalDrawn / totalFacilityAmount) * 100 : 0;

  const bankStackData = uniqueBanks
    .filter((b) => b !== 'All')
    .map((bank) => {
      const bankFacs = active.filter((f) => f.bank === bank);
      const utilized = bankFacs.reduce((s, f) => s + toDisplay(f.drawn, f.ccy), 0);
      const available = bankFacs.reduce((s, f) => s + toDisplay(f.available, f.ccy), 0);
      return { bank, utilized, available };
    });

  const monthlyCostData = (() => {
    const data = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now);
      d.setMonth(d.getMonth() - i);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const cost = active.reduce((s, f) => {
        const schedule = generateInterestSchedule(f);
        return s + schedule.filter((e) => e.month === ym).reduce((ss, e) => ss + e.interest, 0);
      }, 0);
      data.push({ month: ym.slice(5), cost: toDisplay(cost, 'NGN') });
    }
    return data;
  })();

  const pieData = [
    { name: 'Drawn', value: toDisplay(totalDrawn, 'NGN') },
    { name: 'Available', value: toDisplay(totalAvailable, 'NGN') },
  ];

  const getPeriodCost = () => {
    if (costPeriod === 'month') {
      return active.reduce((s, f) => {
        const schedule = generateInterestSchedule(f);
        return s + schedule.filter((e) => e.month === selectedYearMonth).reduce((ss, e) => ss + e.interest, 0);
      }, 0);
    } else if (costPeriod === 'quarter') {
      const q = costQuarter;
      const months = [`${costYear}-${String((q - 1) * 3 + 1).padStart(2, '0')}`, `${costYear}-${String((q - 1) * 3 + 2).padStart(2, '0')}`, `${costYear}-${String((q - 1) * 3 + 3).padStart(2, '0')}`];
      return active.reduce((s, f) => {
        const schedule = generateInterestSchedule(f);
        return s + schedule.filter((e) => months.includes(e.month)).reduce((ss, e) => ss + e.interest, 0);
      }, 0);
    } else {
      return active.reduce((s, f) => {
        const schedule = generateInterestSchedule(f);
        return s + schedule.filter((e) => e.month.startsWith(costYear)).reduce((ss, e) => ss + e.interest, 0);
      }, 0);
    }
  };

  const addFac = (newFac) => {
    setFacilities([...facilities, { ...newFac, id: 'F' + Date.now(), drawdowns: [] }]);
    setModal(null);
  };

  const editFac = async (updatedFac) => {
    setFacilities(facilities.map((f) => (f.id === updatedFac.id ? updatedFac : f)));
    if (window.electronAPI?.releaseLock) {
      await window.electronAPI.releaseLock(updatedFac.id);
    }
    setModal(null);
  };

  const deleteFac = (id) => {
    setFacilities(facilities.filter((f) => f.id !== id));
  };

  const renewFac = (facilityId, newMaturity) => {
    setFacilities(
      facilities.map((f) =>
        f.id === facilityId ? { ...f, maturity: newMaturity, status: 'Active' } : f
      )
    );
    setModal(null);
  };

  const addDD = (facilityId, drawdown) => {
    setFacilities(
      facilities.map((f) =>
        f.id === facilityId
          ? { ...f, drawdowns: [...(f.drawdowns || []), { ...drawdown, id: 'D' + Date.now() }] }
          : f
      )
    );
    setModal(null);
  };

  const addRepay = (facilityId, repayment) => {
    setFacilities(
      facilities.map((f) => {
        if (f.id !== facilityId) return f;
        const newRepayments = [...(f.repayments || []), { ...repayment, id: 'R' + Date.now(), date: new Date().toISOString().split('T')[0] }];
        const newDrawdowns = [...f.drawdowns];
        let remaining = repayment.amount;
        for (let d of newDrawdowns) {
          if (remaining <= 0) break;
          const owed = d.amount - (d.repaid || 0);
          const pay = Math.min(owed, remaining);
          d.repaid += pay;
          remaining -= pay;
        }
        return { ...f, drawdowns: newDrawdowns, repayments: newRepayments };
      })
    );
  };

  const handleSubsidiaryRepay = (drawdownId, amount) => {
    setFacilities(
      facilities.map((f) => ({
        ...f,
        drawdowns: f.drawdowns.map((d) =>
          d.id === drawdownId
            ? { ...d, subsidiaryRepaid: (d.subsidiaryRepaid || 0) + amount }
            : d
        ),
      }))
    );
  };

  const addBank = (name) => {
    if (!savedBanks.includes(name)) setSavedBanks([...savedBanks, name].sort());
  };

  const addSubsidiary = (name) => {
    if (!savedSubsidiaries.includes(name)) setSavedSubsidiaries([...savedSubsidiaries, name].sort());
  };

  const extractNameFromEmail = (email) => {
    if (!email) return 'User';
    try {
      const namePart = email.split('@')[0];
      const [firstName, lastName] = namePart.split('.');
      if (firstName && lastName) {
        return `${firstName.charAt(0).toUpperCase() + firstName.slice(1)} ${lastName.charAt(0).toUpperCase() + lastName.slice(1)}`;
      }
      return firstName.charAt(0).toUpperCase() + firstName.slice(1);
    } catch (e) {
      return 'User';
    }
  };

  const selFac = modal?.facilityId
    ? allStats.find((f) => f.id === modal.facilityId)
    : null;

  const handleImport = (data) => {
    const newFacs = data.map((row) => ({
      id: 'F' + Date.now() + Math.random(),
      bank: row.Bank,
      facilityName: row.FacilityName,
      ccy: row.Currency || 'NGN',
      limitF: parseFloat(row.Limit) || 0,
      facilityAmount: parseFloat(row.Amount) || 0,
      startDate: row.StartDate || new Date().toISOString().split('T')[0],
      maturity: row.Maturity || '',
      tenureValue: 12,
      tenureUnit: 'Months',
      tenure2Value: 0,
      tenure2Unit: 'Months',
      intPayCycle: 'Monthly',
      repCycle: 'Bullet',
      maxCycleValue: 24,
      maxCycleUnit: 'Months',
      boardRate: parseFloat(row.Rate) || 0,
      mgmtFee: 0,
      commitFee: 0,
      defaultInt: 0,
      moratoriumValue: 0,
      moratoriumUnit: 'None',
      collateral: '',
      remarks: '',
      facilityClass: 'Term Loan',
      offeredRate: 0,
      negFixedRate: 0,
      confirmed: 'Pending',
      confirmDate: '',
      status: 'Active',
      interestRateType: 'Fixed',
      pricingFormula: '',
      interestBasis: 'Daily/Simple',
      drawdowns: [],
    }));
    setFacilities([...facilities, ...newFacs]);
  };

  const navGroups = [
    { title: 'Dashboard', items: [{ id: 'dashboard', label: '📊 Overview' }] },
    {
      title: 'Management',
      items: [
        { id: 'facilities', label: ' 🏦  Bank Relationships' },
        { id: 'utilizations', label: ' 📋  Active Utilizations' },
        { id: 'performance', label: ' 📊  Performance' },
        { id: 'maturity', label: ' ⏳  Maturity Ladder' },
      ],
    },
    {
      title: 'Costs',
      items: [
        { id: 'interestfees', label: '📈 Interest & Fees' },
        { id: 'repayment', label: '📅 Repayment Schedule' },
        { id: 'drawdowns', label: '📋 Subsidiary Drawdowns' },
      ],
    },
    {
      title: 'Analysis',
      items: [
        { id: 'budashboard', label: '🏢 Subsidiary Summary' },
        { id: 'scenario', label: '🔮 What-If' },
      ],
    },
    { title: 'Admin', items: [{ id: 'admin', label: '⚙️ Admin' }] },
  ];

  const tabStyle = (active) => ({
    padding: '7px 16px',
    borderRadius: 8,
    fontSize: 12,
    cursor: 'pointer',
    border: 'none',
    background: active ? '#1e3a5f' : 'transparent',
    color: active ? '#c9a84c' : '#5d7a96',
    fontWeight: active ? 600 : 400,
    whiteSpace: 'nowrap',
    textAlign: 'left',
    width: '100%',
  });

  const sidebarStyle = {
    width: sidebarCollapsed ? 60 : 240,
    background: '#0a1520',
    borderRight: '1px solid #1e3a5f',
    transition: 'width 0.3s',
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    position: 'sticky',
    top: 0,
  };

  const mainStyle = {
    flex: 1,
    background: '#070e16',
    minHeight: '100vh',
    overflow: 'auto',
  };

  if (loginMode === 'loading') {
    return (
      <div style={{ height: '100vh', background: '#070e16', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c9a84c' }}>
        Verifying Credentials...
      </div>
    );
  }

  if (showPasswordChange && user) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#070e16', color: '#e8f0fe', fontFamily: 'sans-serif'
      }}>
        <div style={{
          background: '#0a1520', border: '1px solid #1e3a5f', borderRadius: '12px',
          width: 400, padding: 40, textAlign: 'center'
        }}>
          <h2 style={{ color: '#c9a84c', marginBottom: 10 }}>🔐 Change Password</h2>
          <p style={{ fontSize: 13, color: '#8aa3be', marginBottom: 24 }}>
            Hello <strong>{extractNameFromEmail(user.email)}</strong>,<br/>
            This is your first login. Please create a new password.
          </p>

          <input
            type="password"
            placeholder="New Password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            style={{ background: '#0d1822', border: '1px solid #1e3a5f', color: '#fff', padding: '10px', borderRadius: '6px', marginBottom: 12, width: '100%', boxSizing: 'border-box' }}
          />
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            style={{ background: '#0d1822', border: '1px solid #1e3a5f', color: '#fff', padding: '10px', borderRadius: '6px', marginBottom: 24, width: '100%', boxSizing: 'border-box' }}
          />

          <button
            onClick={handlePasswordChange}
            style={{ background: '#22c55e', color: '#0a1520', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', width: '100%', padding: 12 }}
          >
            ✓ Create Password & Login
          </button>

          <div style={{ marginTop: 20, fontSize: 11, color: '#5d7a96' }}>
            Password must be at least 6 characters
          </div>
        </div>
      </div>
    );
  }

  if (loginMode === 'login') {
    return <LoginScreen onLogin={handleManualLogin} onSSO={async () => {
      if (window.electronAPI && window.electronAPI.verifyUser) {
        try {
          const result = await window.electronAPI.verifyUser({ isSystemLogin: true });
          if (result.success) {
            setUser(result.user);
            try {
              const savedLoans = await window.electronAPI.loadLoans();
              if (savedLoans.length > 0) {
                setFacilities(savedLoans);
              }
            } catch (err) {
              console.warn('Could not load facilities:', err);
            }
            setLoginMode('authenticated');
          } else {
            setAuthError('SSO authentication failed. Please try manual login.');
          }
        } catch (err) {
          setAuthError('System authentication error. Please try manual login.');
        }
      }
    }} error={authError} />;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#070e16', color: '#e8f0fe', fontFamily: "'DM Sans','Helvetica Neue',sans-serif" }}>
      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'DM Sans','Helvetica Neue',sans-serif;
          background: #070e16;
          overflow: auto;
        }
        #root {
          height: 100vh;
        }
      `}</style>

      {/* Sidebar */}
      <div style={sidebarStyle}>
        <div style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1e3a5f' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#c9a84c', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {!sidebarCollapsed && 'CreditDesk'}
          </div>
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} style={{ background: 'none', border: 'none', color: '#5d7a96', cursor: 'pointer', fontSize: 16 }}>
            {sidebarCollapsed ? '→' : '←'}
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
          {navGroups.map((group) => (
            <div key={group.title}>
              {!sidebarCollapsed && <div style={{ fontSize: 9, color: '#5d7a96', padding: '12px 16px 6px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{group.title}</div>}
              {group.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  style={{ ...tabStyle(activeTab === item.id), padding: sidebarCollapsed ? '12px 16px' : '7px 16px' }}
                  title={sidebarCollapsed ? item.label : ''}
                >
                  {sidebarCollapsed ? item.label.split(' ')[0] : item.label}
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* User Info & Logout */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid #1e3a5f', fontSize: 11, color: '#8aa3be' }}>
          {!sidebarCollapsed && (
            <>
              <div style={{ marginBottom: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                👤 {user?.displayName || 'User'}
              </div>
              <div style={{ marginBottom: 8, fontSize: 9, color: '#5d7a96' }}>
                {user?.role}
              </div>
            </>
          )}
          <button
            onClick={handleLogout}
            style={{ ...mkbtn('#ef4444', '#fca5a5', 'sm'), width: '100%' }}
            title="Logout"
          >
            {sidebarCollapsed ? '🚪' : '🚪 Logout'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={mainStyle}>
        <div style={{ padding: '20px 24px' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h2 style={{ color: '#c9a84c', fontSize: 24, margin: 0 }}>
              {navGroups.flatMap(g => g.items).find(i => i.id === activeTab)?.label || 'Dashboard'}
            </h2>
            <select value={displayCcy} onChange={(e) => setDisplayCcy(e.target.value)} style={{ width: 100, ...S.inp }}>
              <option value="NGN">NGN</option>
              <option value="USD">USD</option>
            </select>
          </div>

          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 14, marginBottom: 24 }}>
                <KPI label="Total Facilities" value={filtered.length} sub="Active" accent="#3b82f6" icon="🏦" />
                <KPI label="Total Facility Limit" value={fmtN(totalFacilityAmount, displayCcy === 'NGN' ? '₦' : '$')} sub="All banks" accent="#c9a84c" icon="💰" />
                <KPI label="Total Drawn" value={fmtN(totalDrawn, displayCcy === 'NGN' ? '₦' : '$')} sub="Utilized" accent="#f59e0b" icon="📊" />
                <KPI label="Available Headroom" value={fmtN(totalAvailable, displayCcy === 'NGN' ? '₦' : '$')} sub="Unused facility" accent="#3b82f6" icon="📊" onClick={() => setActiveTab('facilities')} />
                <KPI label="Interest Accrued" value={fmtN(totalInterest, displayCcy === 'NGN' ? '₦' : '$')} sub="Actual/365" accent="#f59e0b" icon="📈" onClick={() => setActiveTab('interestfees')} />
                <KPI label="Utilization" value={fmtPct(overallUtil)} sub={overallUtil > 80 ? '⚠ High' : 'Within limits'} accent={overallUtil > 80 ? '#ef4444' : '#22c55e'} icon="📉" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 24 }}>
                <div style={S.card}>
                  <div style={S.sec}>Utilization by Bank</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={bankStackData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1a2d45" />
                      <XAxis dataKey="bank" tick={{ fill: '#8aa3be', fontSize: 10 }} />
                      <YAxis tick={{ fill: '#8aa3be', fontSize: 10 }} tickFormatter={(v) => fmtN(v)} />
                      <Tooltip formatter={(v) => fmtN(v)} contentStyle={{ background: '#0d1822', border: '1px solid #1e3a5f' }} />
                      <Bar dataKey="utilized" stackId="a" fill="#f59e0b" name="Utilized" />
                      <Bar dataKey="available" stackId="a" fill="#22c55e" name="Available" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div style={S.card}>
                  <div style={S.sec}>Monthly Borrowing Costs</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={monthlyCostData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1a2d45" />
                      <XAxis dataKey="month" tick={{ fill: '#8aa3be', fontSize: 10 }} />
                      <YAxis tick={{ fill: '#8aa3be', fontSize: 10 }} tickFormatter={(v) => fmtN(v)} />
                      <Tooltip formatter={(v) => fmtN(v)} contentStyle={{ background: '#0d1822', border: '1px solid #1e3a5f' }} />
                      <Bar dataKey="cost" fill="#a78bfa" name="Cost" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div style={S.card}>
                  <div style={S.sec}>Portfolio Composition</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                        <Cell fill="#3b82f6" />
                        <Cell fill="#f59e0b" />
                        <Cell fill="#22c55e" />
                      </Pie>
                      <Tooltip formatter={(v) => fmtN(v)} contentStyle={{ background: '#0d1822', border: '1px solid #1e3a5f' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Facilities Tab */}
          {activeTab === 'facilities' && (
            <div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                <input type="text" placeholder="🔍 Search..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 200, ...S.inp }} />
                <select value={filterBank} onChange={(e) => setFilterBank(e.target.value)} style={{ width: 150, ...S.inp }}>
                  {uniqueBanks.map((b) => <option key={b}>{b}</option>)}
                </select>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ width: 150, ...S.inp }}>
                  <option value="All">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Expired">Expired</option>
                  <option value="Pending">Pending</option>
                </select>
                {permissions.canAddFacilities() && (
                  <button onClick={() => setModal({ type: 'addFac' })} style={mkbtn('#22c55e', '#0a1520')}>
                    ➕ Add Facility
                  </button>
                )}
                <button onClick={() => setModal({ type: 'importCSV' })} style={mkbtn('#3b82f6', '#fff')}>
                  📥 Import CSV
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {filtered.map((f) => (
                  <FacilityCard
                    key={f.id}
                    facility={f}
                    currencies={currencies}
                    displayCcy={displayCcy}
                    onDetail={() => handleDetailClick(f)}
                    onEdit={() => handleEditClick(f)}
                    onDelete={() => permissions.canDeleteFacilities() && deleteFac(f.id)}
                    onDrawdown={() => permissions.canDrawdown() && setModal({ type: 'drawdown', facilityId: f.id })}
                    onRepay={() => permissions.canRepay() && setModal({ type: 'repay', facilityId: f.id })}
                    onRenew={() => permissions.canRenew() && setModal({ type: 'renew', facilityId: f.id })}
                    canEdit={permissions.canEditFacilities()}
                    canDelete={permissions.canDeleteFacilities()}
                    canDrawdown={permissions.canDrawdown()}
                    canRepay={permissions.canRepay()}
                    canRenew={permissions.canRenew()}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Interest & Fees Tab */}
          {activeTab === 'interestfees' && (
            <InterestFeesPage facilities={filtered} currencies={currencies} displayCcy={displayCcy} />
          )}

          {/* Drawdowns Tab */}
          {activeTab === 'drawdowns' && (
            <DrawdownsPage facilities={filtered} currencies={currencies} displayCcy={displayCcy} onSubsidiaryRepay={handleSubsidiaryRepay} />
          )}

          {/* Repayment Schedule Tab */}
          {activeTab === 'repayment' && (
            <RepaymentSchedulePage facilities={filtered} currencies={currencies} displayCcy={displayCcy} />
          )}

          {/* Performance Tab */}
          {activeTab === 'performance' && (
            <PerformancePage facilities={filtered} currencies={currencies} displayCcy={displayCcy} />
          )}

          {/* Admin Tab */}
          {activeTab === 'admin' && (
            <div>
              <h3 style={{ color: '#c9a84c', marginBottom: 16 }}>Admin</h3>

              {/* SETTINGS SECTION */}
              <div style={S.card}>
                <div style={S.sec}>⚙️ Settings</div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button onClick={() => setModal({ type: 'currency' })} style={mkbtn('#1e3a5f', '#c9a84c')}>
                    💱 Manage Currencies
                  </button>
                  <button onClick={() => setModal({ type: 'banksSubsidiaries' })} style={mkbtn('#1e3a5f', '#c9a84c')}>
                    🏦 Manage Banks/Subsidiaries
                  </button>
                </div>
              </div>

              {/* USER MANAGEMENT */}
              {permissions.canManageUsers() && (
                <div style={{ ...S.card, marginTop: 16 }}>
                  <div style={S.sec}>👥 User Management</div>
                  <UserManagementTable user={user} />
                </div>
              )}

              {/* UNIFIED AUDIT TRAIL */}
              {permissions.canViewAuditLog() && (
                <div style={{ ...S.card, marginTop: 16 }}>
                  <div style={S.sec}>📋 Unified Audit Trail</div>
                  <UnifiedAuditTrailTable onExport={() => {}} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {modal?.type === 'addFac' && (
        <FacilityFormWizard
          title="Register New Facility"
          onSave={addFac}
          onClose={() => setModal(null)}
          savedBanks={savedBanks}
          onAddBank={addBank}
          currencies={currencies}
        />
      )}

      {modal?.type === 'editFac' && selFac && (
        <FacilityFormWizard
          title={`Edit ${selFac.facilityName}`}
          initial={selFac}
          onSave={editFac}
          onClose={async () => {
            if (window.electronAPI?.releaseLock) {
              await window.electronAPI.releaseLock(selFac.id);
            }
            setModal(null);
          }}
          savedBanks={savedBanks}
          onAddBank={addBank}
          currencies={currencies}
        />
      )}

      {modal?.type === 'renew' && selFac && (
        <RenewalModal facility={selFac} onRenew={renewFac} onClose={() => setModal(null)} />
      )}

      {modal?.type === 'drawdown' && selFac && (
        <DrawdownModal
          facility={selFac}
          stats={calcStats(selFac, currencies)}
          onClose={() => setModal(null)}
          onDrawdown={addDD}
          savedSubsidiaries={savedSubsidiaries}
          onAddSubsidiary={addSubsidiary}
        />
      )}

      {modal?.type === 'repay' && selFac && (
        <RepayModal facility={selFac} onClose={() => setModal(null)} onRepay={addRepay} />
      )}

      {modal?.type === 'currency' && (
        <CurrencyManager
          currencies={currencies}
          setCurrencies={setCurrencies}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === 'banksSubsidiaries' && (
        <BanksSubsidiariesManager
          banks={savedBanks}
          setBanks={setSavedBanks}
          subsidiaries={savedSubsidiaries}
          setSubsidiaries={setSavedSubsidiaries}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.type === 'scenario' && (
        <ScenarioModal
          facilities={allStats}
          currencies={currencies}
          displayCcy={displayCcy}
          onClose={() => setModal(null)}
          onAddFacility={addFac}
        />
      )}

      {modal?.type === 'importCSV' && (
        <CSVImportWizard onClose={() => setModal(null)} onImport={handleImport} />
      )}

      {selectedFacility && (
        <FacilityDetailModal
          facility={selectedFacility}
          currencies={currencies}
          onClose={() => setSelectedFacility(null)}
        />
      )}

      {selectedSubsidiary && (
        <SubsidiaryDetailModal
          subsidiary={selectedSubsidiary}
          facilities={allStats}
          currencies={currencies}
          displayCcy={displayCcy}
          onClose={() => setSelectedSubsidiary(null)}
        />
      )}

      {confirm && (
        <ConfirmModal
          message={confirm.message}
          onConfirm={confirm.onConfirm}
          onClose={() => setConfirm(null)}
        />
      )}

      {showLogoutConfirm && (
        <LogoutConfirmModal onConfirm={confirmLogout} onCancel={() => setShowLogoutConfirm(false)} />
      )}
    </div>
  );
}

function LoginScreen({ onLogin, onSSO, error }) {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [isSSO, setIsSSO] = useState(false);

  return (
    <div style={{
      height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#070e16', color: '#e8f0fe', fontFamily: 'sans-serif'
    }}>
      <div style={{
        background: '#0a1520', border: '1px solid #1e3a5f', borderRadius: '12px',
        width: 400, padding: 40, textAlign: 'center'
      }}>
        <h2 style={{ color: '#c9a84c', marginBottom: 20 }}>CreditDesk Pro</h2>
        <p style={{ fontSize: 13, color: '#8aa3be', marginBottom: 24 }}>Secure Portfolio Access</p>
        {error && <div style={{ color: '#ef4444', marginBottom: 16, fontSize: 12 }}>{error}</div>}
        {!isSSO ? (
          <>
            <input
              placeholder="Email Address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{ background: '#0d1822', border: '1px solid #1e3a5f', color: '#fff', padding: '10px', borderRadius: '6px', marginBottom: 12, width: '100%', boxSizing: 'border-box' }}
            />
            <input
              type="password"
              placeholder="Password"
              value={pass}
              onChange={e => setPass(e.target.value)}
              style={{ background: '#0d1822', border: '1px solid #1e3a5f', color: '#fff', padding: '10px', borderRadius: '6px', marginBottom: 24, width: '100%', boxSizing: 'border-box' }}
            />
            <button
              onClick={() => onLogin(email, pass)}
              style={{ background: '#c9a84c', color: '#0a1520', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', width: '100%', padding: 12, marginBottom: 12 }}
            >
              SIGN IN
            </button>
            <button
              onClick={() => setIsSSO(true)}
              style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', width: '100%', padding: 12 }}
            >
              🔐 SSO Authentication
            </button>
          </>
        ) : (
          <>
            <div style={{ marginBottom: 16, fontSize: 13, color: '#8aa3be' }}>
              Attempting Single Sign-On...
            </div>
            <button
              onClick={async () => {
                setIsSSO(false);
                await onSSO();
              }}
              style={{ background: '#22c55e', color: '#0a1520', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', width: '100%', padding: 12, marginBottom: 12 }}
            >
              ✓ Authenticate via SSO
            </button>
            <button
              onClick={() => setIsSSO(false)}
              style={{ background: '#6b7280', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', width: '100%', padding: 12 }}
            >
              Back to Manual Login
            </button>
          </>
        )}
        <div style={{ marginTop: 20, fontSize: 11, color: '#5d7a96' }}>
          {isSSO ? 'Click the button above to authenticate' : 'Enter credentials or use SSO'}
        </div>
      </div>
    </div>
  );
}
