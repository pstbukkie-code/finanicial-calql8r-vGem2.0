import { useState, useMemo, useEffect } from 'react';
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

// --- Permissions Hook (Centralized RBAC) ---
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
  }), [userRole]);
}

// --- Session Timeout Hook ---
function useSessionTimeout(onTimeout, timeoutMinutes = 30) {
  useEffect(() => {
    let timeoutId;
    let warningId;

    const resetTimeout = () => {
      clearTimeout(timeoutId);
      clearTimeout(warningId);

      warningId = setTimeout(() => {
        console.warn('⚠️ Session will expire in 2 minutes due to inactivity');
      }, (timeoutMinutes - 2) * 60 * 1000);

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

// --- Logout Confirmation Modal ---
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

// --- Enhanced User Management Table ---
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

// --- Enhanced Unified Audit Trail Table ---
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

/// --- Main App Component ---
export default function App() {
    const [facilities, setFacilities] = useState(() => {
        const saved = localStorage.getItem('my_facilities');
        // If no saved data, use the empty list from your data.js
        return saved ? JSON.parse(saved) : [];
    });

    const handleEditClick = async (loan) => {
        try {
            // Check lock (if Electron API is available)
            if (window.electronAPI?.checkLock) {
                const lockStatus = await window.electronAPI.checkLock(loan.id);
                if (lockStatus.isLocked && lockStatus.user !== user.displayName) {
                    alert(`STOP: ${lockStatus.user} is currently editing this facility.`);
                    return;
                }
                // Set lock
                await window.electronAPI.setLock(loan.id, user.displayName);
            }
        } catch (err) {
            console.warn('Lock check failed (Electron API not available):', err);
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
    const [loginMode, setLoginMode] = useState('loading'); // loading, login, authenticated
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

    // --- INITIAL AUTH CHECK ---
    useEffect(() => {
        const autoLogin = async () => {
            if (window.electronAPI && window.electronAPI.verifyUser) {
                try {
                    const result = await window.electronAPI.verifyUser({ isSystemLogin: true });
                    if (result.success) {
                        setUser(result.user);
                        console.log('✅ Auto-login successful for:', result.user.displayName);

                        // --- Load SharePoint Data ---
                        try {
                            const savedLoans = await window.electronAPI.loadLoans();
                            console.log('📦 Loaded facilities from SharePoint:', savedLoans.length);
                            if (savedLoans.length > 0) {
                                setFacilities(savedLoans);
                            }
                        } catch (err) {
                            console.warn('⚠️ Could not load facilities from SharePoint, using localStorage:', err);
                        }

                        setLoginMode('authenticated');
                    } else {
                        console.log('❌ Auto-login failed, redirecting to login page');
                        setLoginMode('login');
                    }
                } catch (err) {
                    console.error("🔴 Auth/Load Bridge Error:", err);
                    setLoginMode('login');
                }
            } else {
                console.log('⚠️ Electron API not available, using web mode');
                setLoginMode('login');
            }
        };
        autoLogin();
    }, []);

    const handleManualLogin = async (email, password) => {
        try {
            // First, try Electron API login
            if (window.electronAPI?.verifyUser) {
                const result = await window.electronAPI.verifyUser({ email, password, isSystemLogin: false });
                if (result.success) {
                    setUser(result.user);
                    console.log('✅ Manual login successful for:', result.user.displayName);

                    // Check if password change is required
                    if (result.user.requiresPasswordChange) {
                        console.log('🔐 User must change password on first login');
                        setShowPasswordChange(true);
                        return; // Don't load data yet
                    }

                    // --- Load SharePoint Data after successful login ---
                    try {
                        const savedLoans = await window.electronAPI.loadLoans();
                        console.log('📦 Loaded facilities from SharePoint:', savedLoans.length);
                        if (savedLoans.length > 0) {
                            setFacilities(savedLoans);
                        }
                    } catch (err) {
                        console.warn('⚠️ Could not load facilities from SharePoint, using localStorage:', err);
                    }

                    setLoginMode('authenticated');
                    await window.electronAPI.writeLog(`User ${result.user.email} logged in via Manual Auth`);
                } else {
                    console.error('❌ Manual login failed:', result.error);
                    setAuthError(result.error);
                }
            } else {
                // Fallback: Read from SharePoint users.json and verify manually
                try {
                    if (window.electronAPI?.readFile) {
                        console.log('📂 Reading users from auth/users.json...');
                        const fileContent = await window.electronAPI.readFile('auth/users.json');
                        console.log('📂 File content:', fileContent);
                        const usersData = JSON.parse(fileContent);
                        const authorizedUsers = usersData.authorized_users || [];
                        console.log('📂 Found users:', authorizedUsers);
                        const foundUser = authorizedUsers.find(u => u.email === email && u.password === password);

                        if (foundUser) {
                          console.log('✅ Manual login successful (fallback mode) for:', email);
                          setUser({
                              email: foundUser.email,
                              displayName: foundUser.displayName || email.split('@')[0],
                              role: foundUser.role || 'User',
                              requiresPasswordChange: foundUser.requiresPasswordChange || false
                          });

                          // Check if password change is required
                          if (foundUser.requiresPasswordChange) {
                            console.log('🔐 User must change password on first login');
                            setShowPasswordChange(true);
                            return;
                          }

                          // Load SharePoint data
                          try {
                            const savedLoans = await window.electronAPI.loadLoans();
                            console.log('📦 Loaded facilities from SharePoint:', savedLoans.length);
                            if (savedLoans.length > 0) {
                                setFacilities(savedLoans);
                            }
                          } catch (err) {
                            console.warn('⚠️ Could not load facilities:', err);
                          }

                          setLoginMode('authenticated');
                        } else {
                          setAuthError('Invalid email or password');
                          console.error('❌ User not found or password mismatch');
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
            console.error('❌ Login error:', err);
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
            // Update user password in SharePoint
            if (window.electronAPI?.readFile && window.electronAPI?.writeFile) {
                console.log('🔐 Reading users.json to update password...');
                const fileContent = await window.electronAPI.readFile('auth/users.json');
                console.log('🔐 Current file content:', fileContent);
                const usersData = JSON.parse(fileContent);
                const updatedUsers = usersData.authorized_users.map(u => 
                    u.email === user.email 
                        ? { ...u, password: newPassword, requiresPasswordChange: false }
                        : u
                );

                const newData = { authorized_users: updatedUsers };
                console.log('🔐 Saving updated users:', newData);
                await window.electronAPI.writeFile('auth/users.json', JSON.stringify(newData, null, 2));
                console.log('✅ Password changed successfully');
            }

            // Update local user state
            setUser({ ...user, requiresPasswordChange: false });
            setShowPasswordChange(false);
            setNewPassword('');
            setConfirmPassword('');

            // Load facilities
            try {
                const savedLoans = await window.electronAPI.loadLoans();
                if (savedLoans.length > 0) {
                    setFacilities(savedLoans);
                }
            } catch (err) {
                console.warn('Could not load facilities:', err);
            }

            setLoginMode('authenticated');
            alert('✅ Password changed successfully. You can now access the dashboard.');
        } catch (err) {
            console.error('Failed to change password:', err);
            alert('Failed to change password. Please try again. Error: ' + err.message);
        }
    };

  const [savedBanks, setSavedBanks] = useState(() => {
    const saved = localStorage.getItem("my_banks");
    return saved ? JSON.parse(saved) : defaultBanks;
  });

  // FIXED: Changed defaultBUs to defaultSubsidiaries
  const [savedSubsidiaries, setSavedSubsidiaries] = useState(() => {
    const saved = localStorage.getItem("my_bus");
    // Added safety check and changed defaultBUs to defaultSubsidiaries
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

  // 2. NOW DEFINE THE SAVE TRIGGERS (Effects)
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

  // 3. THE REST OF YOUR APP STATE
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
  const totalInterest = active.reduce(
    (s, f) => s + toDisplay(f.interest, f.ccy),
    0
  );
  const overallUtil = totalFacilityAmount
    ? (totalDrawn / totalFacilityAmount) * 100
    : 0;

  const [year, month] = selectedYearMonth.split('-').map(Number);
  const endOfMonth = new Date(year, month, 0);
  const monthlyInterest = active.reduce((sum, f) => {
    return (
      sum +
      f.drawdowns.reduce((s, d) => {
        let rate = d.interestRateOverride ?? f.boardRate;
        if (d.marginApplied) rate += d.marginRate;
        const bal = d.amount - d.repaid;
        const drawDate = new Date(d.date);
        if (drawDate <= endOfMonth) {
          const daysInMonth = Math.min(
            daysBetween(d.date, endOfMonth.toISOString().split('T')[0]),
            30
          );
          const int = (((bal * rate) / 100) * daysInMonth) / 365;
          return s + toDisplay(int, f.ccy);
        }
        return s;
      }, 0)
    );
  }, 0);

  const annualInterest = active.reduce(
    (sum, f) => sum + toDisplay(f.interest, f.ccy),
    0
  ); // Quarterly interest (simplified)

  const quarterlyInterest = monthlyInterest * 3; // Get period cost

  const getPeriodCost = () => {
    if (costPeriod === 'month') return monthlyInterest;
    if (costPeriod === 'quarter') return quarterlyInterest;
    return annualInterest;
  }; // Stacked bar by bank

  const bankStackData = Object.values(
    active.reduce((acc, f) => {
      const bank = f.bank;
      if (!acc[bank]) acc[bank] = { bank, utilized: 0, available: 0 };
      acc[bank].utilized += toDisplay(f.drawn, f.ccy);
      acc[bank].available += toDisplay(f.available, f.ccy);
      return acc;
    }, {})
  ); // Monthly borrowing costs (last 12 months)

  const monthlyCostData = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStr = d.toLocaleString('default', {
      month: 'short',
      year: '2-digit',
    });
    monthlyCostData.push({
      month: monthStr,
      cost: i === 0 ? monthlyInterest : monthlyInterest * 0.9, // placeholder
    });
  } // Pie: limits vs drawdown vs headroom

  const pieData = [
    { name: 'Total Limits', value: totalFacilityAmount },
    { name: 'Total Drawdown', value: totalDrawn },
    { name: 'Headroom', value: totalAvailable },
    ];
    // --- Handlers ---

    // 1. ADD FACILITY
    const addFac = async (f) => {
        const nextNumber = facilities.length + 1;
        const newFac = {
            ...f,
            id: 'F' + Date.now(),
            loanNumber: `LN-${String(nextNumber).padStart(3, '0')}`,
            drawdowns: [],
            repayments: []
        };

        try {
            if (window.electronAPI?.saveLoan) {
                await window.electronAPI.saveLoan(newFac, user?.displayName || 'system');
                const updated = await window.electronAPI.loadLoans();
                setFacilities(updated);
                alert("✅ Success: Facility registered on SharePoint.");
            } else {
                setFacilities(prev => [...prev, newFac]);
            }
        } catch (err) {
            console.error('Save failed:', err);
            setFacilities(prev => [...prev, newFac]);
        }
        setModal(null);
    };

    // 2. EDIT FACILITY (With Auto-Unlock)
    const editFac = async (u) => {
        const original = facilities.find(f => f.id === u.id);
        const updatedFac = { ...original, ...u };

        try {
            if (window.electronAPI?.saveLoan) {
                await window.electronAPI.saveLoan(updatedFac, user?.displayName || 'system');

                // Release the SharePoint lock immediately after saving
                if (window.electronAPI?.releaseLock) {
                    await window.electronAPI.releaseLock(u.id);
                }

                const updated = await window.electronAPI.loadLoans();
                setFacilities(updated);
                alert("✅ Success: Changes synced to SharePoint.");
            } else {
                setFacilities(prev => prev.map(f => f.id === u.id ? updatedFac : f));
            }
        } catch (err) {
            console.error('Edit failed:', err);
            setFacilities(prev => prev.map(f => f.id === u.id ? updatedFac : f));
        }
        setModal(null);
    };

    // 3. DELETE FACILITY
    const delFac = async (id) => {
        const confirmed = window.confirm("Are you sure you want to permanently delete this facility from SharePoint?");
        if (!confirmed) return;

        try {
            if (window.electronAPI?.deleteLoan) {
                await window.electronAPI.deleteLoan(id, user?.displayName || 'system');
                const updated = await window.electronAPI.loadLoans();
                setFacilities(updated);
                alert("🗑️ Success: Facility removed from SharePoint.");
            } else {
                setFacilities(prev => prev.filter(f => f.id !== id));
            }
        } catch (err) {
            console.error('Delete failed:', err);
            setFacilities(prev => prev.filter(f => f.id !== id));
        }
    };

    // 4. ADD DRAWDOWN
    const addDD = async (parentId, drawdownData) => {
        const parent = facilities.find(f => f.id === parentId);

        // Create the "Child" Facility record
        const childFacility = {
            ...parent,
            id: 'UTIL-' + Date.now(),
            parentId: parent.id, // Links back to bank facility
            facilityAmount: drawdownData.amount, // Capped at drawn amount
            startDate: drawdownData.date,
            facilityName: `${parent.facilityName} (${drawdownData.subsidiary} - Drawn ${drawdownData.date})`,
            drawdowns: [], // Children don't have their own drawdowns
            repayments: [],
            status: 'Active',
        };

        const updatedParent = {
            ...parent,
            drawdowns: [...(parent.drawdowns || []), { ...drawdownData, childId: childFacility.id }]
        };

        try {
            if (window.electronAPI?.saveLoan) {
                await window.electronAPI.saveLoan(updatedParent, user?.displayName || 'system');
                await window.electronAPI.saveLoan(childFacility, user?.displayName || 'system');
                const updated = await window.electronAPI.loadLoans();
                setFacilities(updated);
                alert("✅ Success: Utilization created in 'Active Utilizations' tab.");
            } else {
                setFacilities(prev => [...prev.filter(f => f.id !== parentId), updatedParent, childFacility]);
            }
        } catch (err) {
            console.error('Overhaul: Drawdown failed:', err);
        }
    };

    // 5. RENEW FACILITY (Fixes the missing Renew Button logic)
    const renewFac = async (oldId, renewalData) => {
        const oldFac = facilities.find(f => f.id === oldId);
        const updatedOldFac = {
            ...oldFac,
            status: 'Renewed',
            remarks: (oldFac.remarks || "") + `\nRenewed on ${renewalData.startDate}`
        };

        const newFac = {
            ...renewalData,
            id: 'F' + Date.now(),
            drawdowns: [],
            repayments: []
        };

        try {
            if (window.electronAPI?.saveLoan) {
                await window.electronAPI.saveLoan(updatedOldFac, user?.displayName || 'system');
                await window.electronAPI.saveLoan(newFac, user?.displayName || 'system');
                const updated = await window.electronAPI.loadLoans();
                setFacilities(updated);
                alert("♻️ Success: Facility renewed and archived.");
            } else {
                setFacilities(prev => [...prev.map(f => f.id === oldId ? updatedOldFac : f), newFac]);
            }
        } catch (err) {
            console.error('Renewal failed:', err);
            setFacilities(prev => [...prev.map(f => f.id === oldId ? updatedOldFac : f), newFac]);
        }
        setModal(null);
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            const imported = parseCSV(evt.target.result);
            setFacilities(prev => [...prev, ...imported]);
        };
        reader.readAsText(file);
    };
    const addRepay = (fid, amt, date, type) => {
      setFacilities(
        facilities.map((f) => {
          if (f.id !== fid) return f;
          
          // 1. Create the official ledger receipt
          const newRepayment = {
            id: 'R' + Date.now(),
            date,
            amount: amt,
            type,
          };
  
          const newDrawdowns = [...f.drawdowns].sort(
            (a, b) => new Date(a.date) - new Date(b.date)
          );
          
          // 2. If it's principal, apply FIFO logic to reduce the balances
          if (type === 'principal') {
            let remaining = amt;
            for (let d of newDrawdowns) {
              const owed = d.amount - d.repaid;
              if (owed > 0) {
                const pay = Math.min(owed, remaining);
                d.repaid += pay;
                remaining -= pay;
                if (remaining <= 0) break;
              }
            }
          } 
          // 3. Save the receipt to the facility's ledger
          return { 
            ...f, 
            drawdowns: newDrawdowns,
            repayments: [...(f.repayments || []), newRepayment] 
          };
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

  // --- ROLE-BASED ACCESS CONTROL (RBAC) ---
  const canViewAuditLog = () => user?.role === 'System Administrator';
  const canManageUsers = () => user?.role === 'System Administrator';
  const canEditFacilities = () => user?.role !== 'Viewer';
  const canAddFacilities = () => user?.role !== 'Viewer';
  const canDeleteFacilities = () => user?.role !== 'Viewer';
  const canDrawdown = () => user?.role !== 'Viewer';
  const canRepay = () => user?.role !== 'Viewer';
  const canRenew = () => user?.role !== 'Viewer';

  // --- EXTRACT USER NAME FROM EMAIL ---
  const extractNameFromEmail = (email) => {
    if (!email) return 'User';
    try {
      const namePart = email.split('@')[0]; // Get "name.surname" part
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

    // This "Gatekeeper" must stay above the final return to block the UI
    if (loginMode === 'loading') {
        return (
            <div style={{ height: '100vh', background: '#070e16', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c9a84c' }}>
                Verifying Credentials...
            </div>
        );
    }

    // Password change screen (first-time login)
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
            // Trigger auto-login
            if (window.electronAPI && window.electronAPI.verifyUser) {
                try {
                    const result = await window.electronAPI.verifyUser({ isSystemLogin: true });
                    if (result.success) {
                        setUser(result.user);
                        console.log('✅ SSO login successful for:', result.user.displayName);

                        try {
                          const savedLoans = await window.electronAPI.loadLoans();
                          console.log('📦 Loaded facilities from SharePoint:', savedLoans.length);
                          if (savedLoans.length > 0) {
                            setFacilities(savedLoans);
                          }
                        } catch (err) {
                          console.warn('⚠️ Could not load facilities from SharePoint, using localStorage:', err);
                        }

                        setLoginMode('authenticated');
                    } else {
                        setAuthError('SSO authentication failed. Please try manual login.');
                        console.error('❌ SSO login failed');
                    }
                } catch (err) {
                    setAuthError('System authentication error. Please try manual login.');
                    console.error('🔴 SSO Error:', err);
                }
            }
        }} error={authError} />;
    }

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: '#070e16',
        color: '#e8f0fe',
        fontFamily: "'DM Sans','Helvetica Neue',sans-serif",
      }}
    >
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
      {/* Sidebar */}{' '}
      <div style={sidebarStyle}>
        {' '}
        <div
          style={{
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #1e3a5f',
          }}
        >
          {' '}
          {!sidebarCollapsed && (
            <span style={{ fontWeight: 'bold', color: '#c9a84c' }}>
              CreditDesk Pro{' '}
            </span>
          )}{' '}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            style={{
              background: 'none',
              border: 'none',
              color: '#5d7a96',
              cursor: 'pointer',
              fontSize: 18,
            }}
          >
            {sidebarCollapsed ? '☰' : '☰'}{' '}
          </button>{' '}
        </div>{' '}
        {/* USER PROFILE SECTION */}
        {user && (
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid #1e3a5f',
              fontSize: 11,
              color: '#8aa3be',
            }}
          >
            <div style={{ marginBottom: 6 }}>
              <span style={{ color: '#5d7a96', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: 9 }}>👤 Account</span>
            </div>
            {!sidebarCollapsed && (
              <>
                <div style={{ color: '#c9a84c', fontWeight: 600, marginBottom: 4 }}>{extractNameFromEmail(user.email)}</div>
                <div style={{ color: '#5d7a96', fontSize: 10 }}>
                  Role: <span style={{ color: '#a78bfa', fontWeight: 600 }}>{user.role}</span>
                </div>
              </>
            )}
          </div>
        )}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
          {' '}
          {navGroups.map((group) => (
            <div key={group.title} style={{ marginBottom: 16 }}>
              {' '}
              {!sidebarCollapsed && (
                <div
                  style={{
                    padding: '4px 16px',
                    fontSize: 10,
                    color: '#5d7a96',
                    textTransform: 'uppercase',
                  }}
                >
                  {group.title}{' '}
                </div>
              )}{' '}
              {group.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  style={tabStyle(activeTab === item.id)}
                >
                  {sidebarCollapsed ? item.label.split(' ')[0] : item.label}{' '}
                </button>
              )){' '}
            </div>
          ))}{' '}
        </div>{' '}
        <div
          style={{
            padding: '16px',
            borderTop: '1px solid #1e3a5f',
            fontSize: 11,
            color: '#5d7a96',
          }}
        >
          {' '}
          {!sidebarCollapsed && (
            <>
              <div>{now.toLocaleDateString()}</div>{' '}
              <div>{now.toLocaleTimeString()}</div>{' '}
            </>
          )}{' '}
        </div>{' '}
        {/* LOGOUT BUTTON */}
        {user && (
          <button
            onClick={handleLogout}
            style={{
              ...mkbtn('#7f1d1d', '#fca5a5'),
              width: '100%',
              margin: '12px 0 0 0',
              padding: '10px 16px',
              border: 'none',
            }}
          >
            {sidebarCollapsed ? '🚪' : '🚪 Logout'}
          </button>
        )}
      </div>
      {/* Main Content */}{' '}
      <div style={mainStyle}>
        
              <div
                  style={{
                      background: '#0a1520',
                      borderBottom: '1px solid #1e3a5f',
                      padding: '12px 24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                  }}
              >
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      {/* Cloud Sync Status Indicator */}
                      <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '0 12px',
                          borderRight: '1px solid #1e3a5f',
                          marginRight: 8
                      }}>
                          <div style={{
                              width: 10,
                              height: 10,
                              borderRadius: '50%',
                              background: window.electronAPI ? '#22c55e' : '#ef4444',
                              boxShadow: window.electronAPI ? '0 0 10px #22c55e' : '0 0 10px #ef4444'
                          }} />
                          <span style={{ fontSize: 11, color: '#8aa3be', fontWeight: 600, letterSpacing: '0.5px' }}>
                              {window.electronAPI ? 'SHAREPOINT CONNECTED' : 'LOCAL MODE (OFFLINE)'}
                          </span>
                      </div>

                      <button onClick={() => exportToCSV(facilities)} style={mkbtn('#1e293b')}>
                              📤 Export CSV
                          </button>
                          <label style={{ ...mkbtn('#1e293b'), cursor: 'pointer' }}>
                              📥 Import CSV
                              <input
                                  type="file"
                                  accept=".csv"
                                  style={{ display: 'none' }}
                                  onChange={handleFileUpload}
                              />
                          </label>
                          {permissions.canAddFacilities() && (
                            <button
                                onClick={() => setModal({ type: 'addFac' })}
                                style={mkbtn('#c9a84c', '#0a1520')}
                            >
                                + ADD FACILITY
                            </button>
                          )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <select
                          value={displayCcy}
                          onChange={(e) => setDisplayCcy(e.target.value)}
                          style={{ ...S.inp, width: 100 }}
                      >
                          <option value="NGN">NGN</option> <option value="USD">USD</option>
                      </select>
                      <span style={{ fontSize: 12, color: '#8aa3be' }}>
                          {now.toLocaleString()}
                      </span>
                  </div>
              </div>
          
        <div style={{ padding: '24px' }}>
          
          {activeTab === 'dashboard' && (
            <>
              
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5,1fr)',
                  gap: 14,
                  marginBottom: 24,
                }}
              >
                
                <KPI
                  label="Total Facility Amt"
                  value={fmtN(
                    totalFacilityAmount,
                    displayCcy === 'NGN' ? '₦' : '$'
                  )}
                  sub={`${active.length} active`}
                  accent="#c9a84c"
                  icon="🏦"
                  onClick={() => setActiveTab('facilities')}
                />
                <KPI
                  label="Total Drawdown"
                  value={fmtN(totalDrawn, displayCcy === 'NGN' ? '₦' : '$')}
                  sub="Drawn amount"
                  accent="#a78bfa"
                  icon="💳"
                  onClick={() => setActiveTab('facilities')}
                />
                <KPI
                  label="Available Headroom"
                  value={fmtN(totalAvailable, displayCcy === 'NGN' ? '₦' : '$')}
                  sub="Unused facility"
                  accent="#3b82f6"
                  icon="📊"
                  onClick={() => setActiveTab('facilities')}
                />
                <KPI
                  label="Interest Accrued"
                  value={fmtN(totalInterest, displayCcy === 'NGN' ? '₦' : '$')}
                  sub="Actual/365"
                  accent="#f59e0b"
                  icon="📈"
                  onClick={() => setActiveTab('interestfees')}
                />
                <KPI
                  label="Utilization"
                  value={fmtPct(overallUtil)}
                  sub={overallUtil > 80 ? '⚠ High' : 'Within limits'}
                  accent={overallUtil > 80 ? '#ef4444' : '#22c55e'}
                  icon="📉"
                />
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: 14,
                  marginBottom: 24,
                }}
                >
                {/* Stacked bar by bank */}{' '}
                <div style={S.card}>
                  <div style={S.sec}>Utilization by Bank</div>
                  <ResponsiveContainer width="100%" height={200}>
                    {' '}
                    <BarChart data={bankStackData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1a2d45" />{' '}
                      <XAxis
                        dataKey="bank"
                        tick={{ fill: '#8aa3be', fontSize: 10 }}
                      />{' '}
                      <YAxis
                        tick={{ fill: '#8aa3be', fontSize: 10 }}
                        tickFormatter={(v) => fmtN(v)}
                      />{' '}
                      <Tooltip
                        formatter={(v) => fmtN(v)}
                        contentStyle={{
                          background: '#0d1822',
                          border: '1px solid #1e3a5f',
                        }}
                      />{' '}
                      <Bar
                        dataKey="utilized"
                        stackId="a"
                        fill="#f59e0b"
                        name="Utilized"
                      />{' '}
                      <Bar
                        dataKey="available"
                        stackId="a"
                        fill="#22c55e"
                        name="Available"
                      />{' '}
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Monthly borrowing costs bar */}
                <div style={S.card}>
                  <div style={S.sec}>Monthly Borrowing Costs</div>
                  <ResponsiveContainer width="100%" height={200}>
                    {' '}
                    <BarChart data={monthlyCostData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1a2d45" />{' '}
                      <XAxis
                        dataKey="month"
                        tick={{ fill: '#8aa3be', fontSize: 10 }}
                      />{' '}
                      <YAxis
                        tick={{ fill: '#8aa3be', fontSize: 10 }}
                        tickFormatter={(v) => fmtN(v)}
                      />{' '}
                      <Tooltip
                        formatter={(v) => fmtN(v)}
                        contentStyle={{
                          background: '#0d1822',
                          border: '1px solid #1e3a5f',
                        }}
                      />
                      <Bar dataKey="cost" fill="#a78bfa" name="Cost" />{' '}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {/* Pie chart: limits vs drawdown vs headroom */}{' '}
                <div style={S.card}>
                  <div style={S.sec}>Portfolio Composition</div>
                  <ResponsiveContainer width="100%" height={200}>
                    {' '}
                    <PieChart>
                      {' '}
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        label
                      >
                        <Cell fill="#3b82f6" />
                        <Cell fill="#f59e0b" />
                        <Cell fill="#22c55e" />{' '}
                      </Pie>
                      <Tooltip
                        formatter={(v) => fmtN(v)}
                        contentStyle={{
                          background: '#0d1822',
                          border: '1px solid #1e3a5f',
                        }}
                      />{' '}
                    </PieChart>
                  </ResponsiveContainer>
                </div>{' '}
              </div>{' '}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 14,
                  marginBottom: 24,
                }}
              >
                {' '}
                <div style={S.card}>
                  <div style={S.sec}>Borrowing Cost</div>
                  <div
                    style={{
                      display: 'flex',
                      gap: 10,
                      marginBottom: 10,
                      flexWrap: 'wrap',
                    }}
                  >
                    {' '}
                    <select
                      value={costPeriod}
                      onChange={(e) => setCostPeriod(e.target.value)}
                      style={{ width: 100, ...S.inp }}
                    >
                      <option value="month">Month</option>{' '}
                      <option value="quarter">Quarter</option>{' '}
                      <option value="year">Year</option>{' '}
                    </select>{' '}
                    {costPeriod === 'month' && (
                      <input
                        type="month"
                        value={selectedYearMonth}
                        onChange={(e) => setSelectedYearMonth(e.target.value)}
                        style={{ width: 140, ...S.inp }}
                      />
                    )}{' '}
                    {costPeriod === 'quarter' && (
                      <>
                        {' '}
                        <select
                          value={costYear}
                          onChange={(e) =>
                            setCostYear(parseInt(e.target.value))
                          }
                          style={{ width: 90, ...S.inp }}
                        >
                          {' '}
                          {[
                            now.getFullYear() - 2,
                            now.getFullYear() - 1,
                            now.getFullYear(),
                            now.getFullYear() + 1,
                          ].map((y) => (
                            <option key={y} value={y}>
                              {y}
                            </option>
                          )){' '}
                        </select>{' '}
                        <select
                          value={costQuarter}
                          onChange={(e) =>
                            setCostQuarter(parseInt(e.target.value))
                          }
                          style={{ width: 90, ...S.inp }}
                        >
                          <option value={1}>Q1</option>{' '}
                          <option value={2}>Q2</option>{' '}
                          <option value={3}>Q3</option>{' '}
                          <option value={4}>Q4</option>{' '}
                        </select>{' '}
                      </>
                    )}{' '}
                    {costPeriod === 'year' && (
                      <select
                        value={costYear}
                        onChange={(e) => setCostYear(parseInt(e.target.value))}
                        style={{ width: 90, ...S.inp }}
                      >
                        {' '}
                        {[
                          now.getFullYear() - 2,
                          now.getFullYear() - 1,
                          now.getFullYear(),
                          now.getFullYear() + 1,
                        ].map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        )){' '}
                      </select>
                    )}{' '}
                  </div>{' '}
                  <div
                    style={{
                      fontSize: 28,
                      fontWeight: 'bold',
                      color: '#f59e0b',
                      textAlign: 'center',
                    }}
                  >
                    {fmtN(getPeriodCost(), displayCcy === 'NGN' ? '₦' : '$')}{' '}
                  </div>{' '}
                </div>{' '}
                <div style={S.card}>
                  <div style={S.sec}>Maturity Ladder</div>
                  <table style={S.table}>
                    {' '}
                    <thead>
                      {' '}
                      <tr>
                        <th style={S.th}>Facility</th>
                        <th style={S.th}>Days Left</th>
                        <th style={S.th}>Status</th>
                      </tr>{' '}
                    </thead>
                    <tbody>
                      {' '}
                      {active
                        .filter((f) => f.maturity)
                        .map((f) => {
                          const days = daysBetween(now.toISOString().split('T')[0], f.maturity);
                          const status =
                            days < 0
                              ? 'danger'
                              : days <= 30
                              ? 'warning'
                              : 'ontrack';
                          return (
                            <tr key={f.id}>
                              <td style={S.td}>{f.facilityName}</td>
                              <td style={S.td}>{days < 0 ? 'Expired' : days}</td>
                              <td
                                style={{
                                  ...S.td,
                                  color:
                                    status === 'danger'
                                      ? '#ef4444'
                                      : status === 'warning'
                                      ? '#f59e0b'
                                      : '#22c55e',
                                }}
                              >
                                {' '}
                                {status === 'danger'
                                  ? '⚠️ Expired'
                                  : status === 'warning'
                                  ? '⚠ Near'
                                  : '✓ On track'}
                                </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>{' '}
            </>
          )}
                  {activeTab === 'facilities' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                          <div style={S.sec}>Bank Relationships (Treasury Layer)</div>
                          {/* Grouped View */}
                          {groupByBank ? (
                              Object.entries(
                                  filtered.filter(f => !f.parentId).reduce((acc, f) => {
                                      acc[f.bank] = acc[f.bank] || [];
                                      acc[f.bank].push(f);
                                      return acc;
                                  }, {})
                              ).map(([bank, facs]) => (
                                  <div key={bank} style={{ marginBottom: 20 }}>
                                      <div style={{ fontSize: 16, fontWeight: 700, color: '#c9a84c', marginBottom: 12, padding: '8px 12px', background: '#0a1520', borderRadius: 8 }}>
                                          {bank} ({facs.length})
                                      </div>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                          {facs.map((f) => (
                                              <FacilityCard key={f.id} f={f} onDetail={handleDetailClick} onEdit={handleEditClick} setModal={setModal} setConfirm={setConfirm} delFac={delFac} currencies={currencies} />
                                          ))}
                                  </div>
                              </div>
                          ))
                          ) : (
                              /* List View: ONLY PARENTS */
                              filtered.filter(f => !f.parentId).map((f) => (
                                  <FacilityCard key={f.id} f={f} onDetail={handleDetailClick} onEdit={() => handleEditClick(f)} setModal={setModal} setConfirm={setConfirm} delFac={delFac} currencies={currencies} />
                              ))
                          }
                      </div>
                  )}

                  {activeTab === 'utilizations' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                          <div style={S.sec}>Active Utilizations (Operational Layer)</div>
                          {/* List View: ONLY CHILDREN */}
                          {allStats.filter(f => f.parentId).map((f) => (
                              <FacilityCard
                                  key={f.id} f={f} onDetail={handleDetailClick} onEdit={() => handleEditClick(f)}
                                  setModal={setModal} setConfirm={setConfirm} delFac={delFac} currencies={currencies}
                                  canDrawdown={false} canRepay={canRepay()} canRenew={false}
                              />
                          ))}
                          {allStats.filter(f => f.parentId).length === 0 && (
                              <div style={{ color: '#8aa3be', textAlign: 'center', padding: 40 }}>No active utilizations. Perform a drawdown in 'Bank Relationships' to start.</div>
                          )}
                      </div>
                  )}
              {activeTab === 'performance' && (
            <PerformancePage
              facilities={allStats}
              currencies={currencies}
              displayCcy={displayCcy}
            />
          )}{' '}
          {activeTab === 'maturity' && (
            <div style={S.card}>
              <div style={S.sec}>Full Maturity Ladder</div>
              <table style={S.table}>
                {' '}
                <thead>
                  {' '}
                  <tr>
                    <th style={S.th}>Facility</th> <th style={S.th}>Bank</th>
                    <th style={S.th}>Maturity</th>{' '}
                    <th style={S.th}>Days Left</th>{' '}
                    <th style={S.th}>Outstanding</th>{' '}
                    <th style={S.th}>Status</th>{' '}
                  </tr>
                </thead>
                <tbody>
                  {active
                   .filter((f) => f.maturity)
                    .map((f) => {
    // This calculates the real-time difference between today and the maturity date
                 const days = daysBetween(now.toISOString().split('T')[0], f.maturity);
                 const status =
                  days < 0
                  ? 'danger'
                  : days <= 30
                  ? 'warning'
                  : 'ontrack';
                return (
                    <tr key={f.id}>
        <td style={S.td}>{f.facilityName}</td>
        <td style={S.td}>{f.bank}</td>
        <td style={S.td}>{f.maturity}</td>
        <td style={S.td}>{days < 0 ? 'Expired' : `${days} days`}</td>
        <td style={S.td}>
          {fmtN(
            toDisplay(f.outstanding || 0, f.ccy),
            displayCcy === 'NGN' ? '₦' : '$'
          )}
        </td>
        <td
          style={{
            ...S.td,
            color:
              status === 'danger'
                ? '#ef4444'
                : status === 'warning'
                ? '#f59e0b'
                : '#22c55e',
          }}
        >
          {status === 'danger'
            ? '⚠️ Expired'
            : status === 'warning'
            ? '⚠ Near'
            : '✓ On track'}
        </td>
      </tr>
    );
  })}
                </tbody>
              </table>
            </div>
          )}{' '}
          {activeTab === 'interestfees' && (
            <InterestFeesPage
              facilities={allStats}
              currencies={currencies}
              displayCcy={displayCcy}
            />
          )}{' '}
          {activeTab === 'repayment' && (
            <RepaymentSchedulePage
              facilities={allStats}
              currencies={currencies}
              displayCcy={displayCcy}
            />
          )}{' '}
          {activeTab === 'drawdowns' && (
            <DrawdownsPage
              facilities={allStats}
              currencies={currencies}
              displayCcy={displayCcy}
              onSubsidiaryRepay={handleSubsidiaryRepay}
            />
          )}
          {activeTab === 'budashboard' && (
            <div style={S.card}>
              <div style={S.sec}>Business Unit Performance</div>
              <table style={S.table}>
                {' '}
                <thead>
                  {' '}
                  <tr>
                    <th style={S.th}>Subsidiary</th>{' '}
                    <th style={S.th}># Facilities</th>{' '}
                    <th style={S.th}>Total Drawn</th>{' '}
                    <th style={S.th}>Repaid</th>{' '}
                    <th style={S.th}>Outstanding</th>{' '}
                    <th style={S.th}>Interest</th>{' '}
                  </tr>
                </thead>
                <tbody>
                  {' '}
                  {(() => {
                    const subMap = {};
                    allStats.forEach((f) => {
                      f.drawdowns.forEach((d) => {
                        const bu = d.subsidiary || 'Unallocated';
                        if (!subMap[bu])
                          subMap[bu] = {
                            drawn: 0,
                            repaid: 0,
                            outstanding: 0,
                            interest: 0,
                            facilities: new Set(),
                          };
                        const drawn = toDisplay(d.amount, f.ccy);
                        const repaid = toDisplay(
                          d.subsidiaryRepaid || 0,
                          f.ccy
                        );
                        const outstanding = drawn - repaid;
                        subMap[bu].drawn += drawn;
                        subMap[bu].repaid += repaid;
                        subMap[bu].outstanding += outstanding;
                        const rate =
                          d.interestRateOverride ??
                          f.boardRate + (d.marginApplied ? d.marginRate : 0);
                        const days = Math.max(
                          0,
                          daysBetween(d.date, now.toISOString().split('T')[0])
                        );
                        const int =
                          ((((d.amount - (d.subsidiaryRepaid || 0)) * rate) /
                            100) *
                            days) /
                          365;
                        subMap[bu].interest += toDisplay(int, f.ccy);
                        subMap[bu].facilities.add(f.id);
                      });
                    });
                    return Object.entries(subMap).map(([bu, data]) => (
                      <tr
                        key={bu}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setSelectedSubsidiary(bu)}
                      >
                        {' '}
                        <td
                          style={{ ...S.td, color: '#c9a84c', fontWeight: 600 }}
                        >
                          {bu}{' '}
                        </td>
                        <td style={S.td}>{data.facilities.size}</td>{' '}
                        <td style={S.td}>
                          {fmtN(data.drawn, displayCcy === 'NGN' ? '₦' : '$')}{' '}
                        </td>{' '}
                        <td style={S.td}>
                          {' '}
                          {fmtN(
                            data.repaid,
                            displayCcy === 'NGN' ? '₦' : '$'
                          )}{' '}
                        </td>{' '}
                        <td style={S.td}>
                          {' '}
                          {fmtN(
                            data.outstanding,
                            displayCcy === 'NGN' ? '₦' : '$'
                          )}{' '}
                        </td>{' '}
                        <td style={S.td}>
                          {' '}
                          {fmtN(
                            data.interest,
                            displayCcy === 'NGN' ? '₦' : '$'
                          )}{' '}
                        </td>{' '}
                      </tr>
                    ));
                  })()}{' '}
                </tbody>{' '}
              </table>{' '}
            </div>
          )}{' '}
          {activeTab === 'scenario' && (
            <div style={{ ...S.card, textAlign: 'center', padding: 40 }}>
              {' '}
              <button
                onClick={() => setModal({ type: 'scenario' })}
                style={mkbtn(
                  'linear-gradient(135deg,#1d4ed8,#3b82f6)',
                  '#fff',
                  'lg'
                )}
              >
                🔮 Launch What-If Analysis{' '}
              </button>
            </div>
          )}
          {activeTab === 'admin' && (
            <div>
              <h3 style={{ color: '#c9a84c', marginBottom: 16 }}>Admin</h3>

              {/* SETTINGS SECTION (visible to all) */}
              <div style={S.card}>
                <div style={S.sec}>⚙️ Settings</div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    onClick={() => setModal({ type: 'currency' })}
                    style={mkbtn('#1e3a5f', '#c9a84c')}
                  >
                    💱 Manage Currencies
                  </button>
                  <button
                    onClick={() => setModal({ type: 'banksSubsidiaries' })}
                    style={mkbtn('#1e3a5f', '#c9a84c')}
                  >
                    🏦 Manage Banks/Subsidiaries
                  </button>
                </div>
              </div>

              {/* USER MANAGEMENT (Super-Users only) */}
              {canManageUsers() && (
                <div style={{ ...S.card, marginTop: 16 }}>
                  <div style={S.sec}>👥 User Management</div>
                  <UserManagementTable user={user} />
                </div>
              )}

              {/* AUDIT TRAIL (Super-Users only) */}
              {permissions.canViewAuditLog() && (
                <div style={{ ...S.card, marginTop: 16 }}>
                  <div style={S.sec}>📋 Unified Audit Trail</div>
                  <UnifiedAuditTrailTable onExport={() => {}} />
                </div>
              )}
            </div>
          )}
        </div>{' '}
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <LogoutConfirmModal onConfirm={confirmLogout} onCancel={() => setShowLogoutConfirm(false)} />
      )}

      {/* Modals */}
      {/* 1. ADD FACILITY MODAL */}
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
      {/* 2. EDIT FACILITY MODAL (With Unlock logic) */}
      {modal?.type === 'editFac' && selFac && (
           <FacilityFormWizard
            title={`Edit ${selFac.facilityName}`}
              initial={selFac}
              onSave={editFac}
              onClose={async () => {
              // RELEASE THE LOCK IF THE USER CANCELS
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

      {/* 3. RENEW FACILITY MODAL */}
      {modal?.type === 'renew' && selFac && (
           <RenewalModal
            facility={selFac}
             onRenew={renewFac}
             onClose={() => setModal(null)}
              />
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
      )}{' '}
      {modal?.type === 'repay' && selFac && (
        <RepayModal
          facility={selFac}
          onClose={() => setModal(null)}
          onRepay={addRepay}
        />
      )}{' '}
      {modal?.type === 'currency' && (
        <CurrencyManager
          currencies={currencies}
          setCurrencies={setCurrencies}
          onClose={() => setModal(null)}
        />
      )}{' '}
      {modal?.type === 'banksSubsidiaries' && (
        <BanksSubsidiariesManager
          banks={savedBanks}
          setBanks={setSavedBanks}
          subsidiaries={savedSubsidiaries}
          setSubsidiaries={setSavedSubsidiaries}
          onClose={() => setModal(null)}
        />
      )}{' '}
      {modal?.type === 'scenario' && (
        <ScenarioModal
          facilities={allStats}
          currencies={currencies}
          displayCcy={displayCcy}
          onClose={() => setModal(null)}
          onAddFacility={addFac}
        />
      )}{' '}
      {modal?.type === 'importCSV' && (
        <CSVImportWizard
          onClose={() => setModal(null)}
          onImport={handleImport}
        />
      )}{' '}
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