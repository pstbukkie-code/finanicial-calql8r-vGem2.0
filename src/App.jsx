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

/// --- Main App Component ---
export default function App() {
  // 1. DEFINE ALL STATE FIRST
  const [facilities, setFacilities] = useState(() => {
    const saved = localStorage.getItem('my_facilities');
    return saved ? JSON.parse(saved) : initialFacilities;
  });

  const [savedBanks, setSavedBanks] = useState(() => {
    const saved = localStorage.getItem("my_banks");
    return saved ? JSON.parse(saved) : defaultBanks;
  });

  // FIXED: Changed defaultBUs to defaultSubsidiaries
  const [savedSubsidiaries, setSavedSubsidiaries] = useState(() => {
    const saved = localStorage.getItem("my_bus");
    return saved ? JSON.parse(saved) : defaultSubsidiaries; 
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
  ]; // --- Handlers ---

  const addFac = (f) => {
    setFacilities([
      ...facilities,
      { ...f, id: 'F' + Date.now(), drawdowns: [] },
    ]);
  };
  const editFac = (u) =>
    setFacilities(facilities.map((f) => (f.id === u.id ? { ...f, ...u } : f)));
  const delFac = (id) => setFacilities(facilities.filter((f) => f.id !== id));
  const addDD = (fid, d) =>
    setFacilities(
      facilities.map((f) =>
        f.id === fid ? { ...f, drawdowns: [...f.drawdowns, d] } : f
      )
    );
  const addRepay = (fid, amt, date, type) => {
    setFacilities(
      facilities.map((f) => {
        if (f.id !== fid) return f;
        const newDrawdowns = [...f.drawdowns].sort(
          (a, b) => new Date(a.date) - new Date(b.date)
        );
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
        } else {
          // interest repayment - we would need an interest paid tracking
          // For simplicity, we'll store interest paid in a separate array, but that's complex.
          // Placeholder: reduce interest accrual? We'll just alert.
          alert('Interest repayment not yet implemented.');
        }
        return { ...f, drawdowns: newDrawdowns };
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
      title: 'Facilities',
      items: [
        { id: 'facilities', label: '🏦 List' },
        { id: 'performance', label: '📊 Performance' },
        { id: 'maturity', label: '⏳ Maturity Ladder' },
      ],
    },
    {
      title: 'Costs',
      items: [
        { id: 'interestfees', label: '📈 Interest & Fees' },
        { id: 'repayment', label: '📅 Repayment Schedule' },
        { id: 'drawdowns', label: '📋 Subsidiary Drawdowns' }, // new
      ],
    },
    {
      title: 'Analysis',
      items: [
        { id: 'budashboard', label: '🏢 Subsidiary Summary' }, // renamed
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
              ))}{' '}
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
      </div>
      {/* Main Content */}{' '}
      <div style={mainStyle}>
        {' '}
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
          {' '}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {' '}
            <span
              style={{ fontSize: 18, fontWeight: 'bold', color: '#c9a84c' }}
            >
              Short-Term Facilities{' '}
            </span>{' '}
            {activeTab === 'facilities' && (
              <>
                {' '}
                <button 
  onClick={() => exportToCSV(facilities)} 
  style={{ ...mkbtn("#1e3a5f", "#8aa3be"), marginRight: 8 }}
>
  📥 EXPORT CSV
</button>
                <button
                  onClick={() => setModal({ type: 'addFac' })}
                  style={mkbtn(
                    'linear-gradient(135deg,#c9a84c,#e8c96a)',
                    '#0a1520'
                  )}
                >
                  + ADD FACILITY{' '}
                </button>{' '}
                <label
                  style={{
                    ...mkbtn('#1e3a5f', '#c9a84c', 'sm'),
                    display: 'inline-block',
                    cursor: 'pointer',
                  }}
                >
                  📥 Import CSV{' '}
                  <input
                    type="file"
                    accept=".csv"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) setModal({ type: 'importCSV', file });
                    }}
                  />{' '}
                </label>{' '}
              </>
            )}{' '}
          </div>{' '}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {' '}
            <select
              value={displayCcy}
              onChange={(e) => setDisplayCcy(e.target.value)}
              style={{ ...S.inp, width: 100 }}
            >
              <option value="NGN">NGN</option> <option value="USD">USD</option>{' '}
            </select>{' '}
            <span style={{ fontSize: 12, color: '#8aa3be' }}>
              {now.toLocaleString()}{' '}
            </span>{' '}
          </div>{' '}
        </div>{' '}
        <div style={{ padding: '24px' }}>
          {' '}
          {activeTab === 'dashboard' && (
            <>
              {' '}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5,1fr)',
                  gap: 14,
                  marginBottom: 24,
                }}
              >
                {' '}
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
                />{' '}
                <KPI
                  label="Total Drawdown"
                  value={fmtN(totalDrawn, displayCcy === 'NGN' ? '₦' : '$')}
                  sub="Drawn amount"
                  accent="#a78bfa"
                  icon="💳"
                  onClick={() => setActiveTab('facilities')}
                />{' '}
                <KPI
                  label="Available Headroom"
                  value={fmtN(totalAvailable, displayCcy === 'NGN' ? '₦' : '$')}
                  sub="Unused facility"
                  accent="#3b82f6"
                  icon="📊"
                  onClick={() => setActiveTab('facilities')}
                />{' '}
                <KPI
                  label="Interest Accrued"
                  value={fmtN(totalInterest, displayCcy === 'NGN' ? '₦' : '$')}
                  sub="Actual/365"
                  accent="#f59e0b"
                  icon="📈"
                  onClick={() => setActiveTab('interestfees')}
                />{' '}
                <KPI
                  label="Utilization"
                  value={fmtPct(overallUtil)}
                  sub={overallUtil > 80 ? '⚠ High' : 'Within limits'}
                  accent={overallUtil > 80 ? '#ef4444' : '#22c55e'}
                  icon="📉"
                />{' '}
              </div>{' '}
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
                  <div style={S.sec}>Utilization by Bank</div>{' '}
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
                    </BarChart>{' '}
                  </ResponsiveContainer>{' '}
                </div>
                {/* Monthly borrowing costs bar */}{' '}
                <div style={S.card}>
                  <div style={S.sec}>Monthly Borrowing Costs</div>{' '}
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
                    </BarChart>{' '}
                  </ResponsiveContainer>{' '}
                </div>
                {/* Pie chart: limits vs drawdown vs headroom */}{' '}
                <div style={S.card}>
                  <div style={S.sec}>Portfolio Composition</div>{' '}
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
                      </Pie>{' '}
                      <Tooltip
                        formatter={(v) => fmtN(v)}
                        contentStyle={{
                          background: '#0d1822',
                          border: '1px solid #1e3a5f',
                        }}
                      />{' '}
                    </PieChart>{' '}
                  </ResponsiveContainer>{' '}
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
                  <div style={S.sec}>Borrowing Cost</div>{' '}
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
                          ))}{' '}
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
                        ))}{' '}
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
                  <div style={S.sec}>Maturity Ladder</div>{' '}
                  <table style={S.table}>
                    {' '}
                    <thead>
                      {' '}
                      <tr>
                        <th style={S.th}>Facility</th>{' '}
                        <th style={S.th}>Days Left</th>{' '}
                        <th style={S.th}>Status</th>{' '}
                      </tr>{' '}
                    </thead>{' '}
                    <tbody>
                      {' '}
                      {active
                        .filter((f) => f.maturity)
                        .map((f) => {
                          const days = f.daysToMat;
                          const status =
                            days < 0
                              ? 'danger'
                              : days <= 30
                              ? 'warning'
                              : 'ontrack';
                          return (
                            <tr key={f.id}>
                              <td style={S.td}>{f.facilityName}</td>{' '}
                              <td style={S.td}>
                                {days < 0 ? 'Expired' : days}{' '}
                              </td>{' '}
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
                                  ? '⚠️'
                                  : status === 'warning'
                                  ? '⚠'
                                  : '✓'}{' '}
                              </td>{' '}
                            </tr>
                          );
                        })}{' '}
                    </tbody>{' '}
                  </table>{' '}
                </div>{' '}
              </div>{' '}
            </>
          )}{' '}
          {activeTab === 'facilities' && (
            <>
              {' '}
              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'center',
                  marginBottom: 18,
                  flexWrap: 'wrap',
                }}
              >
                {' '}
                <input
                  placeholder="🔍 Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ width: 200, ...S.inp }}
                />{' '}
                <select
                  value={filterBank}
                  onChange={(e) => setFilterBank(e.target.value)}
                  style={{ width: 180, ...S.inp }}
                >
                  {' '}
                  {uniqueBanks.map((b) => (
                    <option key={b}>{b}</option>
                  ))}{' '}
                </select>{' '}
                <div
                  style={{
                    display: 'flex',
                    background: '#0a1520',
                    borderRadius: 8,
                    padding: 2,
                  }}
                >
                  {' '}
                  <button
                    onClick={() => setFilterCcy('All')}
                    style={{
                      ...mkbtn(
                        filterCcy === 'All' ? '#1e3a5f' : 'transparent',
                        filterCcy === 'All' ? '#c9a84c' : '#8aa3be',
                        'sm'
                      ),
                    }}
                  >
                    All
                  </button>{' '}
                  <button
                    onClick={() => setFilterCcy('NGN')}
                    style={{
                      ...mkbtn(
                        filterCcy === 'NGN' ? '#1e3a5f' : 'transparent',
                        filterCcy === 'NGN' ? '#c9a84c' : '#8aa3be',
                        'sm'
                      ),
                    }}
                  >
                    NGN
                  </button>{' '}
                  <button
                    onClick={() => setFilterCcy('USD')}
                    style={{
                      ...mkbtn(
                        filterCcy === 'USD' ? '#1e3a5f' : 'transparent',
                        filterCcy === 'USD' ? '#c9a84c' : '#8aa3be',
                        'sm'
                      ),
                    }}
                  >
                    USD
                  </button>{' '}
                </div>{' '}
                <div
                  style={{
                    display: 'flex',
                    background: '#0a1520',
                    borderRadius: 8,
                    padding: 2,
                  }}
                >
                  {' '}
                  <button
                    onClick={() => setFilterStatus('All')}
                    style={{
                      ...mkbtn(
                        filterStatus === 'All' ? '#1e3a5f' : 'transparent',
                        filterStatus === 'All' ? '#c9a84c' : '#8aa3be',
                        'sm'
                      ),
                    }}
                  >
                    All
                  </button>{' '}
                  <button
                    onClick={() => setFilterStatus('Active')}
                    style={{
                      ...mkbtn(
                        filterStatus === 'Active' ? '#1e3a5f' : 'transparent',
                        filterStatus === 'Active' ? '#c9a84c' : '#8aa3be',
                        'sm'
                      ),
                    }}
                  >
                    Active
                  </button>{' '}
                  <button
                    onClick={() => setFilterStatus('Expired')}
                    style={{
                      ...mkbtn(
                        filterStatus === 'Expired' ? '#1e3a5f' : 'transparent',
                        filterStatus === 'Expired' ? '#c9a84c' : '#8aa3be',
                        'sm'
                      ),
                    }}
                  >
                    Expired
                  </button>{' '}
                </div>{' '}
                <select
                  value={filterClass}
                  onChange={(e) => setFilterClass(e.target.value)}
                  style={{ width: 150, ...S.inp }}
                >
                  <option value="All">All Types</option>{' '}
                  <option value="Term Loan">Term Loan</option>{' '}
                  <option value="Revolving">Revolving</option>{' '}
                  <option value="Overdraft/Short Term">
                    Overdraft/Short Term
                  </option>
                  <option value="Trade Finance">Trade Finance</option>{' '}
                  <option value="Bridge">Bridge</option>{' '}
                </select>{' '}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 12,
                    color: '#8aa3be',
                  }}
                >
                  {' '}
                  <input
                    type="checkbox"
                    checked={groupByBank}
                    onChange={(e) => setGroupByBank(e.target.checked)}
                  />
                  Group by Bank{' '}
                </label>{' '}
                <span
                  style={{ color: '#5d7a96', fontSize: 12, marginLeft: 'auto' }}
                >
                  {filtered.length} of {facilities.length}{' '}
                </span>{' '}
              </div>{' '}
              {groupByBank ? (
                Object.entries(
                  filtered.reduce((acc, f) => {
                    acc[f.bank] = acc[f.bank] || [];
                    acc[f.bank].push(f);
                    return acc;
                  }, {})
                ).map(([bank, facs]) => (
                  <div key={bank} style={{ marginBottom: 20 }}>
                    {' '}
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: '#c9a84c',
                        marginBottom: 12,
                        padding: '8px 12px',
                        background: '#0a1520',
                        borderRadius: 8,
                      }}
                    >
                      {bank} ({facs.length}){' '}
                    </div>{' '}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 14,
                      }}
                    >
                      {' '}
                      {facs.map((f) => (
                        <FacilityCard
                          key={f.id}
                          f={f}
                          setModal={setModal}
                          setConfirm={setConfirm}
                          delFac={delFac}
                          setSelectedFacility={setSelectedFacility}
                          currencies={currencies}
                        />
                      ))}{' '}
                    </div>{' '}
                  </div>
                ))
              ) : (
                <div
                  style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
                >
                  {' '}
                  {filtered.map((f) => (
                    <FacilityCard
                      key={f.id}
                      f={f}
                      setModal={setModal}
                      setConfirm={setConfirm}
                      delFac={delFac}
                      setSelectedFacility={setSelectedFacility}
                      currencies={currencies}
                    />
                  ))}{' '}
                </div>
              )}{' '}
            </>
          )}{' '}
          {activeTab === 'performance' && (
            <PerformancePage
              facilities={allStats}
              currencies={currencies}
              displayCcy={displayCcy}
            />
          )}{' '}
          {activeTab === 'maturity' && (
            <div style={S.card}>
              <div style={S.sec}>Full Maturity Ladder</div>{' '}
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
                  </tr>{' '}
                </thead>{' '}
                <tbody>
                  {' '}
                  {active
                    .filter((f) => f.maturity)
                    .map((f) => {
                      const days = f.daysToMat;
                      const status =
                        days < 0
                          ? 'danger'
                          : days <= 30
                          ? 'warning'
                          : 'ontrack';
                      return (
                        <tr key={f.id}>
                          <td style={S.td}>{f.facilityName}</td>{' '}
                          <td style={S.td}>{f.bank}</td>{' '}
                          <td style={S.td}>{f.maturity}</td>{' '}
                          <td style={S.td}>{days < 0 ? 'Expired' : days}</td>{' '}
                          <td style={S.td}>
                            {' '}
                            {fmtN(
                              toDisplay(f.outstanding, f.ccy),
                              displayCcy === 'NGN' ? '₦' : '$'
                            )}{' '}
                          </td>{' '}
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
                              : '✓ On track'}{' '}
                          </td>{' '}
                        </tr>
                      );
                    })}{' '}
                </tbody>{' '}
              </table>{' '}
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
              <div style={S.sec}>Business Unit Performance</div>{' '}
              <table style={S.table}>
                {' '}
                <thead>
                  {' '}
                  <tr>
                    <th style={S.th}>BU/Dept</th>{' '}
                    <th style={S.th}># Facilities</th>{' '}
                    <th style={S.th}>Total Drawn</th>{' '}
                    <th style={S.th}>Repaid</th>{' '}
                    <th style={S.th}>Outstanding</th>{' '}
                    <th style={S.th}>Interest</th>{' '}
                  </tr>{' '}
                </thead>{' '}
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
              </button>{' '}
            </div>
          )}{' '}
          {activeTab === 'admin' && (
            <div style={S.card}>
              <h3 style={{ color: '#c9a84c', marginBottom: 16 }}>Admin</h3>{' '}
              <div style={{ display: 'flex', gap: 12 }}>
                {' '}
                <button
                  onClick={() => setModal({ type: 'currency' })}
                  style={mkbtn('#1e3a5f', '#c9a84c')}
                >
                  💱 Manage Currencies{' '}
                </button>{' '}
                <button
                  onClick={() => setModal({ type: 'banksBus' })}
                  style={mkbtn('#1e3a5f', '#c9a84c')}
                >
                  🏦 Manage Banks/BUs{' '}
                </button>{' '}
              </div>{' '}
            </div>
          )}{' '}
        </div>{' '}
      </div>
      {/* Modals */}{' '}
      {modal?.type === 'addFac' && (
        <FacilityFormWizard
          title="Register New Facility"
          onSave={addFac}
          onClose={() => setModal(null)}
          savedBanks={savedBanks}
          onAddBank={addBank}
          currencies={currencies}
        />
      )}{' '}
      {modal?.type === 'editFac' && selFac && (
        <FacilityFormWizard
          title={`Edit ${selFac.facilityName}`}
          initial={selFac}
          onSave={editFac}
          onClose={() => setModal(null)}
          savedBanks={savedBanks}
          onAddBank={addBank}
          currencies={currencies}
        />
      )}{' '}
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
      {modal?.type === 'banksBus' && (
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
      )}{' '}
      {selectedSubsidiary && (
        <SubsidiaryDetailModal
          subsidiary={selectedSubsidiary}
          facilities={allStats}
          currencies={currencies}
          displayCcy={displayCcy}
          onClose={() => setSelectedSubsidiary(null)}
        />
      )}{' '}
      {confirm && (
        <ConfirmModal
          message={confirm.message}
          onConfirm={confirm.onConfirm}
          onClose={() => setConfirm(null)}
        />
      )}{' '}
    </div>
  );
}
