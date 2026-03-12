import { useState, useEffect } from "react";
import { S, mkbtn, Badge, Modal, ConfirmModal } from "./ui.jsx";
import { fmtN, fmtFull, daysBetween, calcStats, calcDrawdownSubsidiaryStats, generateInterestSchedule,generateRepaymentSchedule } from "./utils";


// --- Currency Manager ---
export function CurrencyManager({ currencies, setCurrencies, onClose }) {
  const [newCode, setNewCode] = useState('');
  const [newRate, setNewRate] = useState('');
  const addCurrency = () => {
    if (newCode && newRate && !currencies.find((c) => c.code === newCode)) {
      setCurrencies([
        ...currencies,
        { code: newCode.toUpperCase(), rate: parseFloat(newRate) },
      ]);
      setNewCode('');
      setNewRate('');
    }
  };
  const updateRate = (code, rate) => {
    setCurrencies(
      currencies.map((c) => (c.code === code ? { ...c, rate } : c))
    );
  };
  return (
    <Modal title="Currency Manager" onClose={onClose} width={500}>
      {' '}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {' '}
        {currencies.map((c) => (
          <div
            key={c.code}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            {' '}
            <span style={{ width: 60, fontWeight: 'bold', color: '#e8f0fe' }}>
              {c.code}{' '}
            </span>{' '}
            <input
              type="number"
              value={c.rate}
              onChange={(e) =>
                updateRate(c.code, parseFloat(e.target.value) || 0)
              }
              style={{ flex: 1, ...S.inp }}
            />{' '}
          </div>
        ))}{' '}
        <div
          style={{
            display: 'flex',
            gap: 8,
            borderTop: '1px solid #1e3a5f',
            paddingTop: 12,
          }}
        >
          {' '}
          <input
            placeholder="Code (e.g., EUR)"
            value={newCode}
            onChange={(e) => setNewCode(e.target.value.toUpperCase())}
            style={{ width: 100, ...S.inp }}
          />{' '}
          <input
            type="number"
            placeholder="Rate (vs NGN)"
            value={newRate}
            onChange={(e) => setNewRate(e.target.value)}
            style={{ flex: 2, ...S.inp }}
          />{' '}
          <button
            onClick={addCurrency}
            style={mkbtn('#c9a84c', '#0a1520', 'sm')}
          >
            Add{' '}
          </button>{' '}
        </div>{' '}
      </div>{' '}
    </Modal>
  );
}

// --- Banks/Subsidiaries Manager ---
export function BanksSubsidiariesManager({ banks, setBanks, subsidiaries, setSubsidiaries, onClose }) {
  const [newBank, setNewBank] = useState('');
  const [newSubsidiary, setNewSubsidiary] = useState('');

  // SAFETY CHECK: Force these to be arrays even if local storage is corrupted
  const safeBanks = Array.isArray(banks) ? banks : [];
  const safeSubsidiaries = Array.isArray(subsidiaries) ? subsidiaries : [];

  const addBank = () => {
    if (newBank && !safeBanks.includes(newBank)) {
      setBanks([...safeBanks, newBank].sort());
      setNewBank('');
    }
  };

  const addSubsidiary = () => {
    if (newSubsidiary && !safeSubsidiaries.includes(newSubsidiary)) {
      setSubsidiaries([...safeSubsidiaries, newSubsidiary].sort());
      setNewSubsidiary('');
    }
  };

  const removeBank = (bank) => setBanks(safeBanks.filter((b) => b !== bank));
  const removeSubsidiary = (sub) => setSubsidiaries(safeSubsidiaries.filter((s) => s !== sub));

  return (
    <Modal
      title="Banks & Subsidiaries Manager"
      onClose={onClose}
      width={600}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Banks Column */}
        <div>
          <h4 style={{ color: '#e8f0fe', fontWeight: 'bold', marginBottom: 8 }}>Banks</h4>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', maxHeight: 200, overflowY: 'auto' }}>
            {safeBanks.map((b) => (
              <li
                key={b}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  background: '#0a1520',
                  padding: '6px 10px',
                  borderRadius: 4,
                  marginBottom: 4,
                }}
              >
                <span>{b}</span>
                <button
                  onClick={() => removeBank(b)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ef4444',
                    cursor: 'pointer',
                  }}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <input
              value={newBank}
              onChange={(e) => setNewBank(e.target.value)}
              placeholder="New bank"
              style={{ flex: 1, ...S.inp }}
            />
            <button onClick={addBank} style={mkbtn('#c9a84c', '#0a1520', 'sm')}>
              Add
            </button>
          </div>
        </div>

        {/* Subsidiaries Column */}
        <div>
          <h4 style={{ color: '#e8f0fe', fontWeight: 'bold', marginBottom: 8 }}>Subsidiaries</h4>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', maxHeight: 200, overflowY: 'auto' }}>
            {safeSubsidiaries.map((s) => (
              <li
                key={s}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  background: '#0a1520',
                  padding: '6px 10px',
                  borderRadius: 4,
                  marginBottom: 4,
                }}
              >
                <span>{s}</span>
                <button
                  onClick={() => removeSubsidiary(s)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ef4444',
                    cursor: 'pointer',
                  }}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <input
              value={newSubsidiary}
              onChange={(e) => setNewSubsidiary(e.target.value)}
              placeholder="New subsidiary"
              style={{ flex: 1, ...S.inp }}
            />
            <button onClick={addSubsidiary} style={mkbtn('#c9a84c', '#0a1520', 'sm')}>
              Add
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// --- Facility Detail Modal with Tabs ---
export function FacilityDetailModal({ facility, currencies, onClose }) {
  const [tab, setTab] = useState('drawdowns');
  const [drawdownFilter, setDrawdownFilter] = useState('all'); // "all", "primary", "secondary"
  const stats = calcStats(facility, currencies);
  const sym = facility.ccy === 'NGN' ? '₦' : '$';
  const today = new Date();

  const repaymentSchedule = facility.drawdowns.map((d) => ({
    date: d.date,
    amount: d.amount,
    repaid: d.repaid,
    outstanding: d.amount - d.repaid,
    due: d.amount - d.repaid,
  }));

  return (
    <Modal
      title={`Facility: ${facility.facilityName}`}
      onClose={onClose}
      width={800}
    >
      {' '}
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 16,
          borderBottom: '1px solid #1e3a5f',
          paddingBottom: 8,
        }}
      >
        {' '}
        {['drawdowns', 'interest', 'repayment', 'info'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              ...mkbtn(
                tab === t ? '#1e3a5f' : 'transparent',
                tab === t ? '#c9a84c' : '#8aa3be',
                'sm'
              ),
              textTransform: 'capitalize',
            }}
          >
            {' '}
            {t === 'drawdowns'
              ? 'Drawdowns'
              : t === 'interest'
              ? 'Interest'
              : t === 'repayment'
              ? 'Repayment'
              : 'Loan Info'}{' '}
          </button>
        ))}{' '}
      </div>
      {tab === 'drawdowns' && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button
              onClick={() => setDrawdownFilter('all')}
              style={mkbtn(
                drawdownFilter === 'all' ? '#1e3a5f' : 'transparent',
                drawdownFilter === 'all' ? '#c9a84c' : '#8aa3be',
                'sm'
              )}
            >
              All Drawdowns
            </button>
            <button
              onClick={() => setDrawdownFilter('primary')}
              style={mkbtn(
                drawdownFilter === 'primary' ? '#1e3a5f' : 'transparent',
                drawdownFilter === 'primary' ? '#c9a84c' : '#8aa3be',
                'sm'
              )}
            >
              Primary Sub‑Facility
            </button>
            <button
              onClick={() => setDrawdownFilter('secondary')}
              style={mkbtn(
                drawdownFilter === 'secondary' ? '#1e3a5f' : 'transparent',
                drawdownFilter === 'secondary' ? '#c9a84c' : '#8aa3be',
                'sm'
              )}
            >
              Secondary Sub‑Facility
            </button>
          </div>
          <table style={S.table}>
            <thead>
              <tr>
                {[
                  'Date',
                  'Amount',
                  'Repaid',
                  'Outstanding',
                  'Subsidiary',
                  'Rate',
                  'Margin?',
                  'Sub‑Facility',
                ].map((h) => (
                  <th key={h} style={S.th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {facility.drawdowns
                .filter(
                  (d) =>
                    drawdownFilter === 'all' || d.subFacility === drawdownFilter
                )
                .map((d) => {
                  const bal = d.amount - d.repaid;
                  let rate = d.interestRateOverride ?? facility.boardRate;
                  if (d.marginApplied) rate += d.marginRate;
                  return (
                    <tr key={d.id}>
                      <td style={S.td}>{d.date}</td>
                      <td style={S.td}>{fmtN(d.amount, sym)}</td>
                      <td style={S.td}>{fmtN(d.repaid, sym)}</td>
                      <td
                        style={{
                          ...S.td,
                          color: bal > 0 ? '#f59e0b' : '#22c55e',
                        }}
                      >
                        {fmtN(bal, sym)}
                      </td>
                      <td style={S.td}>{d.subsidiary}</td>
                      <td style={S.td}>{rate}%</td>
                      <td style={S.td}>
                        {d.marginApplied ? `+${d.marginRate}%` : 'No'}
                      </td>
                      <td style={S.td}>
                        {d.subFacility === 'secondary'
                          ? 'Short Term'
                          : 'Overdraft'}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </>
      )}
      {tab === 'interest' && (
        <>
          <div style={{ marginBottom: 16 }}>
            <h4 style={S.sec}>Accrued Interest (to date)</h4>
            <p style={{ fontSize: 24, fontWeight: 'bold', color: '#f59e0b' }}>
              {fmtN(stats.interest, sym)}
            </p>
            <p style={{ fontSize: 14, color: '#8aa3be' }}>
              Principal: {fmtN(stats.outstanding, sym)} | Rate:{' '}
              {facility.boardRate}%
            </p>
          </div>
          <h4 style={S.sec}>Full Interest Schedule</h4>
          <div style={{ overflowX: 'auto' }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Period Start</th>
                  <th style={S.th}>Period End</th>
                  <th style={S.th}>Days</th>
                  <th style={S.th}>Principal</th>
                  <th style={S.th}>Interest</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const schedule = generateInterestSchedule(facility);
                  return schedule.map((p, idx) => (
                    <tr key={idx}>
                      <td style={S.td}>{p.periodStart}</td>
                      <td style={S.td}>{p.periodEnd}</td>
                      <td style={S.td}>{p.days}</td>
                      <td style={S.td}>{fmtN(p.outstanding, sym)}</td>
                      <td style={S.td}>{fmtN(p.interest, sym)}</td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        </>
      )}
      {tab === 'repayment' && (
        <>
          {' '}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {' '}
            <button
              onClick={() => setTab('repayment-schedule')}
              style={mkbtn(
                tab === 'repayment-schedule' ? '#1e3a5f' : 'transparent',
                tab === 'repayment-schedule' ? '#c9a84c' : '#8aa3be',
                'sm'
              )}
            >
              Schedule
            </button>{' '}
            <button
              onClick={() => setTab('repayment-history')}
              style={mkbtn(
                tab === 'repayment-history' ? '#1e3a5f' : 'transparent',
                tab === 'repayment-history' ? '#c9a84c' : '#8aa3be',
                'sm'
              )}
            >
              History
            </button>{' '}
          </div>{' '}
          {tab === 'repayment-schedule' && (
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Payment Date</th>
                  <th style={S.th}>Principal Due</th>
                  <th style={S.th}>Interest Due</th>
                  <th style={S.th}>Balance</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  // Uses the new function to generate the projection
                  const schedule = generateRepaymentSchedule(facility);
                  return schedule.map((s, idx) => (
                    <tr key={idx}>
                      <td style={S.td}>{s.date}</td>
                      <td style={S.td}>{fmtN(s.principal, sym)}</td>
                      <td style={S.td}>{fmtN(s.interest, sym)}</td>
                      <td style={{ ...S.td, color: s.balance > 0 ? '#f59e0b' : '#22c55e' }}>
                        {fmtN(s.balance, sym)}
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          )}
          {tab === 'repayment-history' && (
            <table style={S.table}>
              {' '}
              <thead>
                <tr>
                  <th style={S.th}>Date</th>
                  <th style={S.th}>Amount</th>
                  <th style={S.th}>Type</th>
                </tr>
              </thead>{' '}
              <tbody>
                {facility.repayments && facility.repayments.length > 0 ? (
                  facility.repayments.map((r, idx) => (
                    <tr key={idx}>
                      <td style={S.td}>{r.date}</td>
                      <td style={S.td}>{fmtN(r.amount, sym)}</td>
                      <td style={{ ...S.td, textTransform: 'capitalize' }}>
                        {r.type === 'principal' ? '🏦 Principal' : '📈 Interest'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} style={{ ...S.td, textAlign: 'center', color: '#8aa3be', padding: '16px' }}>
  No repayment history yet
</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}{' '}
        </>
      )}{' '}
      {tab === 'info' && (
        <div
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}
        >
          {' '}
          <div style={{ background: '#0a1520', padding: 12, borderRadius: 8 }}>
            <span style={{ color: '#8aa3be' }}>Bank</span>{' '}
            <div>{facility.bank}</div>{' '}
          </div>{' '}
          <div style={{ background: '#0a1520', padding: 12, borderRadius: 8 }}>
            <span style={{ color: '#8aa3be' }}>Facility Class</span>{' '}
            <div>{facility.facilityClass}</div>{' '}
          </div>{' '}
          <div style={{ background: '#0a1520', padding: 12, borderRadius: 8 }}>
            <span style={{ color: '#8aa3be' }}>Currency</span>{' '}
            <div>{facility.ccy}</div>{' '}
          </div>{' '}
          <div style={{ background: '#0a1520', padding: 12, borderRadius: 8 }}>
            <span style={{ color: '#8aa3be' }}>Loan Amount</span>{' '}
            <div>{fmtN(facility.facilityAmount, sym)}</div>{' '}
          </div>{' '}
          <div style={{ background: '#0a1520', padding: 12, borderRadius: 8 }}>
            <span style={{ color: '#8aa3be' }}>Start Date</span>{' '}
            <div>{facility.startDate}</div>{' '}
          </div>{' '}
          <div style={{ background: '#0a1520', padding: 12, borderRadius: 8 }}>
            <span style={{ color: '#8aa3be' }}>Maturity</span>{' '}
            <div>{facility.maturity}</div>{' '}
          </div>{' '}
          <div style={{ background: '#0a1520', padding: 12, borderRadius: 8 }}>
            <span style={{ color: '#8aa3be' }}>Tenure</span>{' '}
            <div>
              {facility.tenureValue} {facility.tenureUnit}{' '}
              {facility.tenure2Value
                ? ` / ${facility.tenure2Value} ${facility.tenure2Unit}`
                : ''}{' '}
            </div>
            {facility.facilityClass === 'Overdraft/Short Term' && (
              <>
                <div style={{ gridColumn: 'span 2', marginTop: 16 }}>
                  <h4 style={{ color: '#c9a84c', marginBottom: 8 }}>
                    Sub‑Facility Summary
                  </h4>
                </div>
                <table style={{ ...S.table, gridColumn: 'span 2' }}>
                  <thead>
                    <tr>
                      <th style={S.th}>Sub‑Facility</th>
                      <th style={S.th}>Drawn</th>
                      <th style={S.th}>Repaid</th>
                      <th style={S.th}>Outstanding</th>
                      <th style={S.th}>Interest</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={S.td}>Primary</td>
                      <td style={S.td}>
                        {fmtN(stats.primaryStats.drawn, sym)}
                      </td>
                      <td style={S.td}>
                        {fmtN(stats.primaryStats.repaid, sym)}
                      </td>
                      <td style={S.td}>
                        {fmtN(stats.primaryStats.outstanding, sym)}
                      </td>
                      <td style={S.td}>
                        {fmtN(stats.primaryStats.interest, sym)}
                      </td>
                    </tr>
                    <tr>
                      <td style={S.td}>Secondary</td>
                      <td style={S.td}>
                        {fmtN(stats.secondaryStats.drawn, sym)}
                      </td>
                      <td style={S.td}>
                        {fmtN(stats.secondaryStats.repaid, sym)}
                      </td>
                      <td style={S.td}>
                        {fmtN(stats.secondaryStats.outstanding, sym)}
                      </td>
                      <td style={S.td}>
                        {fmtN(stats.secondaryStats.interest, sym)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </>
            )}{' '}
          </div>{' '}
          <div style={{ background: '#0a1520', padding: 12, borderRadius: 8 }}>
            <span style={{ color: '#8aa3be' }}>Board Approved Interest Rate</span>{' '}
            <div>{facility.boardRate}%</div>{' '}
          </div>{' '}
          <div style={{ background: '#0a1520', padding: 12, borderRadius: 8 }}>
            <span style={{ color: '#8aa3be' }}>Mgmt Fee</span>{' '}
            <div>{facility.mgmtFee}%</div>{' '}
          </div>{' '}
          <div style={{ background: '#0a1520', padding: 12, borderRadius: 8 }}>
            <span style={{ color: '#8aa3be' }}>Commitment Fee</span>{' '}
            <div>{facility.commitFee}%</div>{' '}
          </div>{' '}
          <div style={{ background: '#0a1520', padding: 12, borderRadius: 8 }}>
            <span style={{ color: '#8aa3be' }}>Default Interest</span>{' '}
            <div>{facility.defaultInt}%</div>{' '}
          </div>{' '}
          <div style={{ background: '#0a1520', padding: 12, borderRadius: 8 }}>
            <span style={{ color: '#8aa3be' }}>Moratorium</span>{' '}
            <div>
              {facility.moratoriumValue} {facility.moratoriumUnit}{' '}
            </div>{' '}
          </div>{' '}
          <div
            style={{
              background: '#0a1520',
              padding: 12,
              borderRadius: 8,
              gridColumn: 'span 2',
            }}
          >
            <span style={{ color: '#8aa3be' }}>Collateral</span>{' '}
            <div style={{ whiteSpace: 'pre-wrap' }}>{facility.collateral}</div>{' '}
          </div>{' '}
          <div
            style={{
              background: '#0a1520',
              padding: 12,
              borderRadius: 8,
              gridColumn: 'span 2',
            }}
          >
            <span style={{ color: '#8aa3be' }}>Remarks</span>{' '}
            <div style={{ whiteSpace: 'pre-wrap' }}>{facility.remarks}</div>{' '}
          </div>{' '}
          <div style={{ background: '#0a1520', padding: 12, borderRadius: 8 }}>
            <span style={{ color: '#8aa3be' }}>Interest Rate Type</span>{' '}
            <div>{facility.interestRateType}</div>{' '}
          </div>{' '}
          <div style={{ background: '#0a1520', padding: 12, borderRadius: 8 }}>
            <span style={{ color: '#8aa3be' }}>Pricing Formula</span>{' '}
            <div>{facility.pricingFormula}</div>{' '}
          </div>{' '}
          <div style={{ background: '#0a1520', padding: 12, borderRadius: 8 }}>
            <span style={{ color: '#8aa3be' }}>Interest Basis</span>{' '}
            <div>{facility.interestBasis}</div>{' '}
          </div>{' '}
          <div
            style={{
              background: '#0a1520',
              padding: 12,
              borderRadius: 8,
              gridColumn: 'span 2',
            }}
          >
            <span style={{ color: '#8aa3be' }}>Borrowing Cost Breakdown</span>{' '}
            <table style={{ width: '100%', marginTop: 8 }}>
              <tbody>
                <tr>
                  <td>Interest</td>
                  <td>{fmtN(stats.interest || 0, sym)}</td>
                </tr>
                <tr>
                  <td>Management Fee</td>
                  <td>{fmtN(stats.mgmtFeeAmount || 0, sym)}</td>
                </tr>
                <tr>
                  <td>Commitment Fee</td>
                  <td>{fmtN(stats.commitFeeAmount || 0, sym)}</td>
                </tr>
                <tr>
                  <td><strong>Total</strong></td>
                  <td>
                    <strong>
                      {fmtN(
                        (stats.mgmtFeeAmount || 0) +
                        (stats.commitFeeAmount || 0) +
                        (stats.interest || 0),
                        sym
                      )}
                    </strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>{' '}
        </div>
      )}{' '}
    </Modal>
  );
}

// --- BU Detail Modal (updated to show margin income) ---
export function SubsidiaryDetailModal({ bu, facilities, currencies, displayCcy, onClose }) {
  const relevantDrawdowns = facilities.flatMap((f) =>
    f.drawdowns
      .filter((d) => d.subsidiary === bu)
      .map((d) => ({ ...d, facility: f }))
  );

  const toDisplay = (amount, fromCcy) => {
    if (displayCcy === fromCcy) return amount;
    const fx = currencies.find((c) => c.code === fromCcy)?.rate || 1;
    return displayCcy === 'NGN' ? amount * fx : amount / fx;
  };

  return (
    <Modal title={`Business Unit: ${bu}`} onClose={onClose} width={800}>
      <table style={S.table}>
        <thead>
          <tr>
            <th style={S.th}>Facility</th>
            <th style={S.th}>Date</th>
            <th style={S.th}>Amount</th>
            <th style={S.th}>Repaid</th>
            <th style={S.th}>Outstanding</th>
            <th style={S.th}>Base Rate</th>
            <th style={S.th}>Margin</th>
            <th style={S.th}>Finance Income</th>
          </tr>
        </thead>
        <tbody>
          {relevantDrawdowns.map((d) => {
            const bal = d.amount - d.repaid;
            const baseRate = d.facility.boardRate;
            const margin = d.marginApplied ? d.marginRate : 0;
            const sym = d.facility.ccy === 'NGN' ? '₦' : '$';

            const days = Math.max(
              0,
              daysBetween(d.date, new Date().toISOString().split('T')[0])
            );
            const marginInterest = (((bal * margin) / 100) * days) / 365;
            return (
              <tr key={d.id}>
                <td style={S.td}>{d.facility.facilityName}</td>
                <td style={S.td}>{d.date}</td>
                <td style={S.td}>
                  {fmtN(toDisplay(d.amount, d.facility.ccy), sym)}
                </td>
                <td style={S.td}>
                  {fmtN(toDisplay(d.repaid, d.facility.ccy), sym)}
                </td>
                <td style={{ ...S.td, color: bal > 0 ? '#f59e0b' : '#22c55e' }}>
                  {fmtN(toDisplay(bal, d.facility.ccy), sym)}
                </td>
                <td style={S.td}>{baseRate}%</td>
                <td style={S.td}>{margin > 0 ? `${margin}%` : '—'}</td>
                <td style={S.td}>
                  {fmtN(toDisplay(marginInterest, d.facility.ccy), sym)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Modal>
  );
}

// --- CSV Import Wizard ---
export function CSVImportWizard({ onClose, onImport }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);

  const handleFile = (e) => {
    const f = e.target.files[0];
    setFile(f);
    if (f) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target.result;
        const lines = text.split('\n').filter((l) => l.trim());
        const headers = lines[0].split(',').map((h) => h.trim());
        const rows = lines
          .slice(1, 6)
          .map((l) => l.split(',').map((v) => v.replace(/^"|"$/g, '')));
        setPreview({ headers, rows });
      };
      reader.readAsText(f);
    }
  };

  const confirmImport = () => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const lines = text.split('\n').filter((l) => l.trim());
      const headers = lines[0].split(',').map((h) => h.trim());
      const data = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map((v) => v.replace(/^"|"$/g, ''));
        const obj = {};
        headers.forEach((h, idx) => {
          obj[h] = values[idx];
        });
        data.push(obj);
      }
      onImport(data);
    };
    reader.readAsText(file);
    onClose();
  };

  return (
    <Modal title="Import CSV" onClose={onClose} width={600}>
      {' '}
      <input
        type="file"
        accept=".csv"
        onChange={handleFile}
        style={{ marginBottom: 16, ...S.inp }}
      />{' '}
      {preview && (
        <div>
          {' '}
          <h4 style={{ color: '#c9a84c', marginBottom: 8 }}>
            Preview (first 5 rows){' '}
          </h4>{' '}
          <table style={S.table}>
            {' '}
            <thead>
              {' '}
              <tr>
                {' '}
                {preview.headers.map((h) => (
                  <th key={h} style={S.th}>
                    {h}{' '}
                  </th>
                ))}{' '}
              </tr>{' '}
            </thead>{' '}
            <tbody>
              {' '}
              {preview.rows.map((row, i) => (
                <tr key={i}>
                  {' '}
                  {row.map((v, j) => (
                    <td key={j} style={S.td}>
                      {v}{' '}
                    </td>
                  ))}{' '}
                </tr>
              ))}{' '}
            </tbody>{' '}
          </table>{' '}
          <p style={{ marginTop: 12, color: '#8aa3be' }}>
            Ensure required fields are present.{' '}
          </p>{' '}
          <button
            onClick={confirmImport}
            style={{ ...mkbtn('#c9a84c', '#0a1520'), marginTop: 12 }}
          >
            Confirm Import{' '}
          </button>{' '}
        </div>
      )}{' '}
    </Modal>
  );
}

// --- Facility Form Wizard (updated with tenure, max cycle, moratorium as number+unit, SOFR) ---
export function FacilityFormWizard({
  title,
  initial,
  onSave,
  onClose,
  savedBanks,
  onAddBank,
  currencies,
}) {
  const [step, setStep] = useState(1);
  const [f, setF] = useState(
    initial || {
      bank: '',
      facilityName: '',
      ccy: 'NGN',
      limitF: '',
      facilityAmount: '',
      startDay: new Date().getDate(),
      startMonth: new Date().getMonth() + 1,
      startYear: new Date().getFullYear(),
      maturityDay: '',
      maturityMonth: '',
      maturityYear: '',
      startDay2: '',
      startMonth2: '',
      startYear2: '',
      maturityDay2: '',
      maturityMonth2: '',
      maturityYear2: '',
      tenureValue: '',
      tenureUnit: 'Months',
      tenure2Value: '',
      tenure2Unit: 'Months',
      intPayCycle: 'Monthly',
      repCycle: 'Bullet',
      maxCycleValue: '',
      maxCycleUnit: 'Months',
      maxCycleOption: '1',
      boardRate: '',
      intPayCycle2: 'Monthly',
      repCycle2: 'Bullet',
      boardRate2: '',
      mgmtFee: '',
      commitFee: '',
      defaultInt: '',
      moratoriumValue: '',
      moratoriumUnit: 'None',
      collateral: '',
      remarks: '',
      facilityClass: 'Term Loan',
      offeredRate: '',
      negFixedRate: '',
      confirmed: 'Pending',
      confirmDate: '',
      status: 'Active',
      interestRateType: 'Fixed',
      pricingFormula: '',
      interestBasis: 'Daily/Simple',
      marginApplied: false,
      marginRate: '',
      // Additional rate fields
      sofrTermValue: '',
      sofrTermUnit: 'Days',
      sofrRate: '',
      otherRateName: '',
      otherRate: '',
      subFacilityTypes: ['', ''],
      limitF2: '',
      facilityAmount2: '',
      startDay2: '',
      startMonth2: '',
      startYear2: '',
      maturityDay2: '',
      maturityMonth2: '',
      maturityYear2: '',
    }
  );
  const [maxCycleOption, setMaxCycleOption] = useState('1');
  const [showNewBank, setShowNewBank] = useState(false);
  const [newBankName, setNewBankName] = useState('');
  const [errors, setErrors] = useState({});
  const [sofrTerm, setSofrTerm] = useState({ value: '', unit: 'Days' });
  const [sofrRate, setSofrRate] = useState('');
  const [effectiveRate, setEffectiveRate] = useState('');
  const [showAddRate, setShowAddRate] = useState(false);
  const [addRateType, setAddRateType] = useState('sofr');
  const [otherRateName, setOtherRateName] = useState('');
  const [otherRate, setOtherRate] = useState('');
  const [facilityType, setFacilityType] = useState('single'); // "single" or "multi"
  const [subFacilityTypes, setSubFacilityTypes] = useState(['', '']); // types for each sub-facility

  const buildDate = (day, month, year) => {
    if (!day || !month || !year) return '';
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(
      2,
      '0'
    )}`;
  }; // Helper to format number with commas

  const formatNumber = (value) => {
    if (!value) return ''; // Remove existing commas and non-digits, then add commas
    const raw = value.toString().replace(/,/g, '');
    return raw.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }; // Parse a formatted number back to raw digits

  const parseNumber = (formatted) => {
    return formatted.replace(/,/g, '');
  }; // Calculate tenure in days between two dates

  const calculateTenureDays = (day, month, year, matDay, matMonth, matYear) => {
    if (!day || !month || !year || !matDay || !matMonth || !matYear)
      return null;
    const start = new Date(year, month - 1, day);
    const end = new Date(matYear, matMonth - 1, matDay);
    if (end < start) return null;
    const diffTime = end - start;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }; // Format tenure days into readable string with days, months, and years

  const formatTenure = (days) => {
    if (days === null || days === 0) return '';

    const totalMonths = Math.floor(days / 30);
    const years = Math.floor(days / 365);
    const remainingMonths = Math.floor((days % 365) / 30);

    let result = `${days} day${days !== 1 ? 's' : ''}`;

    if (days >= 30) {
      result += ` / ${totalMonths} month${totalMonths !== 1 ? 's' : ''}`;
    }

    if (days >= 365) {
      result += ` / ${years} year${years !== 1 ? 's' : ''}`;
      if (remainingMonths > 0) {
        result += `, ${remainingMonths} month${
          remainingMonths !== 1 ? 's' : ''
        }`;
      }
    }

    return result;
  };

  const validateStep = (s) => {
    const err = {};
    if (s === 1) {
      if (!f.bank) err.bank = 'Bank is required';
      if (!f.facilityName) err.facilityName = 'Facility Name is required';
      if (!f.facilityAmount || parseFloat(f.facilityAmount) <= 0)
        err.facilityAmount = 'Facility amount must be positive'; // For multi‑facility, the sum of both facility amounts cannot exceed the limit
      if (facilityType === 'multi') {
        const amount1 = parseFloat(f.facilityAmount) || 0;
        const amount2 = parseFloat(f.facilityAmount2) || 0;
        const limit = parseFloat(f.limitF) || 0;
        if (amount1 + amount2 > limit) {
          err.facilityAmount2 = 'Sum of facility amounts cannot exceed limit';
        }
      }
    } else if (s === 2) {
      if (!f.boardRate && !effectiveRate)
        err.boardRate = 'Board rate or effective rate is required';
      const startDate = buildDate(f.startDay, f.startMonth, f.startYear);
      const maturityDate = buildDate(
        f.maturityDay,
        f.maturityMonth,
        f.maturityYear
      );
      if (
        startDate &&
        maturityDate &&
        new Date(maturityDate) < new Date(startDate)
      )
        err.maturity = 'Maturity must be after start date';
    }
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const nextStep = () => {
    if (validateStep(step)) setStep(step + 1);
  };
  const prevStep = () => setStep(step - 1); // When initial is provided (editing), populate the additional rate states

  useEffect(() => {
    if (initial) {
      setSofrTerm({
        value: initial.sofrTermValue || '',
        unit: initial.sofrTermUnit || 'Days',
      });
      setSofrRate(initial.sofrRate || '');
      setOtherRateName(initial.otherRateName || '');
      setOtherRate(initial.otherRate || '');
    }
  }, [initial]); // Update effective rate when board rate, SOFR, other rate, or rate components change

  useEffect(() => {
    const base = parseFloat(f.boardRate) || 0;
    const sofr = parseFloat(sofrRate) || 0;
    const other = parseFloat(otherRate) || 0;
    setEffectiveRate((base + sofr + other).toFixed(2));
  }, [f.boardRate, sofrRate, otherRate]);

  const submit = () => {
    const tenureDays =
      calculateTenureDays(
        f.startDay,
        f.startMonth,
        f.startYear,
        f.maturityDay,
        f.maturityMonth,
        f.maturityYear
      ) || 0;
    const tenureDays2 =
      calculateTenureDays(
        f.startDay2,
        f.startMonth2,
        f.startYear2,
        f.maturityDay2,
        f.maturityMonth2,
        f.maturityYear2
      ) || 0;

    const startDate = buildDate(f.startDay, f.startMonth, f.startYear);
    const maturityDate = buildDate(
      f.maturityDay,
      f.maturityMonth,
      f.maturityYear
    );
    onSave({
      ...f,
      limitF: parseFloat(f.facilityAmount || 0), // Keeps background math working
      facilityAmount: parseFloat(f.facilityAmount || 0),
      boardRate: parseFloat(f.boardRate) || 0, // keep base rate
      mgmtFee: parseFloat(f.mgmtFee || 0),
      commitFee: parseFloat(f.commitFee || 0),
      defaultInt: parseFloat(f.defaultInt || 0),
      offeredRate: parseFloat(f.offeredRate || 0),
      negFixedRate: parseFloat(f.negFixedRate || 0),
      tenureValue: tenureDays,
      tenure2Value: tenureDays2,
      maxCycleValue: parseFloat(f.maxCycleValue) || 0,
      moratoriumValue: parseFloat(f.moratoriumValue) || 0,
      marginRate: f.marginApplied ? parseFloat(f.marginRate) || 0 : 0,
      startDate,
      maturity: maturityDate,
      isMulti: facilityType === 'multi',
      sofrTermValue: sofrTerm.value,
      sofrTermUnit: sofrTerm.unit,
      sofrRate: sofrRate,
      otherRateName: otherRateName,
      otherRate: otherRate,
      subFacilityTypes: subFacilityTypes,
    });

    onClose();
  };

  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const currentYear = new Date().getFullYear();
  const startYears = [
    currentYear,
    ...Array.from({ length: 5 }, (_, i) => currentYear - i - 1),
    'Custom',
  ];
  const endYears = [
    currentYear,
    ...Array.from({ length: 5 }, (_, i) => currentYear + i + 1),
    'Custom',
  ];

  const unitOptions = ['Days', 'Months', 'Years'];

  const renderStep = () => {
    if (step === 1) {
      return (
        <>
          {' '}
          <div style={{ gridColumn: 'span 2' }}>
            <label style={S.lbl}>Bank/Lender *</label>{' '}
            {showNewBank ? (
              <div style={{ display: 'flex', gap: 6 }}>
                {' '}
                <input
                  value={newBankName}
                  onChange={(e) => setNewBankName(e.target.value)}
                  style={{ flex: 1, ...S.inp }}
                  autoFocus
                />{' '}
                <button
                  onClick={() => {
                    onAddBank(newBankName);
                    setF({ ...f, bank: newBankName });
                    setNewBankName('');
                    setShowNewBank(false);
                  }}
                  style={mkbtn('#22c55e', '#fff', 'sm')}
                >
                  ADD{' '}
                </button>{' '}
                <button
                  onClick={() => setShowNewBank(false)}
                  style={mkbtn('#1e3a5f', '#8aa3be', 'sm')}
                >
                  ✕{' '}
                </button>{' '}
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 6 }}>
                {' '}
                <select
                  value={f.bank}
                  onChange={(e) => setF({ ...f, bank: e.target.value })}
                  style={{ flex: 1, ...S.inp }}
                >
                  <option value="">-- Select Bank --</option>{' '}
                  {savedBanks.map((b) => (
                    <option key={b} value={b}>
                      {b}{' '}
                    </option>
                  ))}{' '}
                </select>{' '}
                <button
                  onClick={() => setShowNewBank(true)}
                  style={mkbtn('#c9a84c', '#0a1520', 'sm')}
                >
                  + New Bank{' '}
                </button>{' '}
              </div>
            )}{' '}
            {errors.bank && (
              <div style={{ color: '#ef4444', fontSize: 10 }}>
                {errors.bank}{' '}
              </div>
            )}{' '}
          </div>{' '}
          <div style={{ gridColumn: 'span 2' }}>
            <label style={S.lbl}>Facility Name *</label>{' '}
            <input
              value={f.facilityName}
              onChange={(e) => setF({ ...f, facilityName: e.target.value })}
              style={S.inp}
            />{' '}
            {errors.facilityName && (
              <div style={{ color: '#ef4444', fontSize: 10 }}>
                {errors.facilityName}{' '}
              </div>
            )}{' '}
          </div>{' '}
          <div>
            <label style={S.lbl}>Base Currency</label>{' '}
            <select
              value={f.ccy}
              onChange={(e) => setF({ ...f, ccy: e.target.value })}
              style={S.inp}
            >
              {' '}
              {currencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code}{' '}
                </option>
              ))}{' '}
            </select>{' '}
          </div>{' '}
          <div>
            <label style={S.lbl}>Facility Class</label>{' '}
            <select
              value={f.facilityClass}
              onChange={(e) => setF({ ...f, facilityClass: e.target.value })}
              style={S.inp}
            >
              {' '}
              {[
                'Term Loan',
                'Revolving',
                'Overdraft/Short Term',
                'Trade Finance',
                'Bridge',
              ].map((o) => (
                <option key={o} value={o}>
                  {o}{' '}
                </option>
              ))}{' '}
            </select>{' '}
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={S.lbl}>Facility Structure</label>{' '}
            <div style={{ display: 'flex', gap: 20 }}>
              {' '}
              <label>
                {' '}
                <input
                  type="radio"
                  name="facilityStructure"
                  value="single"
                  checked={facilityType === 'single'}
                  onChange={() => setFacilityType('single')}
                />{' '}
                Single Facility{' '}
              </label>{' '}
              <label>
                {' '}
                <input
                  type="radio"
                  name="facilityStructure"
                  value="multi"
                  checked={facilityType === 'multi'}
                  onChange={() => setFacilityType('multi')}
                />{' '}
                Multi‑Facility{' '}
              </label>{' '}
            </div>{' '}
          </div>{' '}
          <div>
            <label style={S.lbl}>Facility Amount ({f.ccy}) *</label>{' '}
            <input
              type="text"
              value={formatNumber(f.facilityAmount)}
              onChange={(e) => {
                const raw = parseNumber(e.target.value);
                setF({ ...f, facilityAmount: raw });
              }}
              style={S.inp}
            />{' '}
            {errors.facilityAmount && (
              <div style={{ color: '#ef4444', fontSize: 10 }}>
                {errors.facilityAmount}
              </div>
            )}
          </div>{' '}
          {facilityType === 'multi' && (
            <>
              {' '}
              <div style={{ gridColumn: 'span 2', marginTop: 16 }}>
                {' '}
                <h4 style={{ color: '#c9a84c', marginBottom: 8 }}>
                  Sub‑Facility 1
                </h4>{' '}
              </div>{' '}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={S.lbl}>Facility Type 1</label>{' '}
                <select
                  value={subFacilityTypes[0]}
                  onChange={(e) => {
                    const newTypes = [...subFacilityTypes];
                    newTypes[0] = e.target.value;
                    setSubFacilityTypes(newTypes);
                  }}
                  style={S.inp}
                >
                  <option value="">Select type</option>{' '}
                  <option value="Overdraft">Overdraft</option>{' '}
                  <option value="Short Term">Short Term</option>{' '}
                  <option value="Term Loan">Term Loan</option>{' '}
                  <option value="Revolving">Revolving</option>{' '}
                  <option value="Trade Finance">Trade Finance</option>{' '}
                  <option value="Bridge">Bridge</option>{' '}
                  <option value="Other">Other (specify)</option>{' '}
                </select>{' '}
              </div>{' '}
            </>
          )}
          {/* Moved start date and maturity to page 1 */}{' '}
          <div>
            <label style={S.lbl}>Start Date *</label>{' '}
            <div style={{ display: 'flex', gap: 4 }}>
              {' '}
              <select
                value={f.startDay}
                onChange={(e) =>
                  setF({ ...f, startDay: parseInt(e.target.value) })
                }
                style={{ width: 70, ...S.inp }}
              >
                {' '}
                {days.map((d) => (
                  <option key={d} value={d}>
                    {d}{' '}
                  </option>
                ))}{' '}
              </select>{' '}
              <select
                value={f.startMonth}
                onChange={(e) =>
                  setF({ ...f, startMonth: parseInt(e.target.value) })
                }
                style={{ width: 80, ...S.inp }}
              >
                {' '}
                {months.map((m) => (
                  <option key={m} value={m}>
                    {m}{' '}
                  </option>
                ))}{' '}
              </select>{' '}
              <select
                value={f.startYear}
                onChange={(e) => {
                  if (e.target.value === 'Custom') {
                    const custom = prompt('Enter custom year (e.g., 2020):');
                    if (custom) setF({ ...f, startYear: parseInt(custom) });
                  } else {
                    setF({ ...f, startYear: parseInt(e.target.value) });
                  }
                }}
                style={{ width: 90, ...S.inp }}
              >
                {' '}
                {startYears.map((y) => (
                  <option key={y} value={y}>
                    {y}{' '}
                  </option>
                ))}{' '}
              </select>{' '}
            </div>{' '}
          </div>{' '}
          <div>
            <label style={S.lbl}>Maturity Date</label>{' '}
            <div style={{ display: 'flex', gap: 4 }}>
              {' '}
              <select
                value={f.maturityDay}
                onChange={(e) =>
                  setF({ ...f, maturityDay: parseInt(e.target.value) })
                }
                style={{ width: 70, ...S.inp }}
              >
                <option value="">Day</option>{' '}
                {days.map((d) => (
                  <option key={d} value={d}>
                    {d}{' '}
                  </option>
                ))}{' '}
              </select>{' '}
              <select
                value={f.maturityMonth}
                onChange={(e) =>
                  setF({ ...f, maturityMonth: parseInt(e.target.value) })
                }
                style={{ width: 80, ...S.inp }}
              >
                <option value="">Month</option>{' '}
                {months.map((m) => (
                  <option key={m} value={m}>
                    {m}{' '}
                  </option>
                ))}{' '}
              </select>{' '}
              <select
                value={f.maturityYear}
                onChange={(e) => {
                  if (e.target.value === 'Custom') {
                    const custom = prompt('Enter custom year (e.g., 2028):');
                    if (custom) setF({ ...f, maturityYear: parseInt(custom) });
                  } else {
                    setF({ ...f, maturityYear: parseInt(e.target.value) });
                  }
                }}
                style={{ width: 90, ...S.inp }}
              >
                <option value="">Year</option>{' '}
                {endYears.map((y) => (
                  <option key={y} value={y}>
                    {y}{' '}
                  </option>
                ))}{' '}
              </select>{' '}
            </div>{' '}
            {errors.maturity && (
              <div style={{ color: '#ef4444', fontSize: 10 }}>
                {errors.maturity}{' '}
              </div>
            )}{' '}
          </div>
          {/* Tenure display for first facility */}{' '}
          {(() => {
            const tenureDays = calculateTenureDays(
              f.startDay,
              f.startMonth,
              f.startYear,
              f.maturityDay,
              f.maturityMonth,
              f.maturityYear
            );
            if (tenureDays !== null) {
              const formattedTenure = formatTenure(tenureDays);
              return (
                <div style={{ gridColumn: 'span 2', marginTop: 8 }}>
                  <label style={S.lbl}>Calculated Tenure</label>{' '}
                  <div
                    style={{
                      background: '#0a1520',
                      padding: '8px 12px',
                      borderRadius: 8,
                      fontSize: 14,
                    }}
                  >
                    {formattedTenure}{' '}
                  </div>{' '}
                </div>
              );
            }
            return null;
          })()}
          {/* If multi‑facility, show both sub‑facility sections */}{' '}
          {facilityType === 'multi' && (
            <>
              {/* --- Sub‑Facility 2 --- */}{' '}
              <div style={{ gridColumn: 'span 2', marginTop: 16 }}>
                {' '}
                <h4 style={{ color: '#c9a84c', marginBottom: 8 }}>
                  Sub‑Facility 2
                </h4>{' '}
              </div>{' '}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={S.lbl}>Facility Type 2</label>{' '}
                <select
                  value={subFacilityTypes[1]}
                  onChange={(e) => {
                    const newTypes = [...subFacilityTypes];
                    newTypes[1] = e.target.value;
                    setSubFacilityTypes(newTypes);
                  }}
                  style={S.inp}
                >
                  <option value="">Select type</option>{' '}
                  <option value="Overdraft">Overdraft</option>{' '}
                  <option value="Short Term">Short Term</option>{' '}
                  <option value="Term Loan">Term Loan</option>{' '}
                  <option value="Revolving">Revolving</option>{' '}
                  <option value="Trade Finance">Trade Finance</option>{' '}
                  <option value="Bridge">Bridge</option>{' '}
                  <option value="Other">Other (specify)</option>{' '}
                </select>{' '}
              </div>{' '}
              <div>
                <label style={S.lbl}>Start Date 2 *</label>{' '}
                <div style={{ display: 'flex', gap: 4 }}>
                  {' '}
                  <select
                    value={f.startDay2}
                    onChange={(e) =>
                      setF({ ...f, startDay2: parseInt(e.target.value) })
                    }
                    style={{ width: 70, ...S.inp }}
                  >
                    <option value="">Day</option>{' '}
                    {days.map((d) => (
                      <option key={d} value={d}>
                        {d}{' '}
                      </option>
                    ))}{' '}
                  </select>{' '}
                  <select
                    value={f.startMonth2}
                    onChange={(e) =>
                      setF({ ...f, startMonth2: parseInt(e.target.value) })
                    }
                    style={{ width: 80, ...S.inp }}
                  >
                    <option value="">Month</option>{' '}
                    {months.map((m) => (
                      <option key={m} value={m}>
                        {m}{' '}
                      </option>
                    ))}{' '}
                  </select>{' '}
                  <select
                    value={f.startYear2}
                    onChange={(e) => {
                      if (e.target.value === 'Custom') {
                        const custom = prompt(
                          'Enter custom year (e.g., 2020):'
                        );
                        if (custom)
                          setF({ ...f, startYear2: parseInt(custom) });
                      } else {
                        setF({ ...f, startYear2: parseInt(e.target.value) });
                      }
                    }}
                    style={{ width: 90, ...S.inp }}
                  >
                    <option value="">Year</option>{' '}
                    {startYears.map((y) => (
                      <option key={y} value={y}>
                        {y}{' '}
                      </option>
                    ))}{' '}
                  </select>{' '}
                </div>{' '}
              </div>{' '}
              <div>
                <label style={S.lbl}>Maturity Date 2</label>{' '}
                <div style={{ display: 'flex', gap: 4 }}>
                  {' '}
                  <select
                    value={f.maturityDay2}
                    onChange={(e) =>
                      setF({ ...f, maturityDay2: parseInt(e.target.value) })
                    }
                    style={{ width: 70, ...S.inp }}
                  >
                    <option value="">Day</option>{' '}
                    {days.map((d) => (
                      <option key={d} value={d}>
                        {d}{' '}
                      </option>
                    ))}{' '}
                  </select>{' '}
                  <select
                    value={f.maturityMonth2}
                    onChange={(e) =>
                      setF({ ...f, maturityMonth2: parseInt(e.target.value) })
                    }
                    style={{ width: 80, ...S.inp }}
                  >
                    <option value="">Month</option>{' '}
                    {months.map((m) => (
                      <option key={m} value={m}>
                        {m}{' '}
                      </option>
                    ))}{' '}
                  </select>{' '}
                  <select
                    value={f.maturityYear2}
                    onChange={(e) => {
                      if (e.target.value === 'Custom') {
                        const custom = prompt(
                          'Enter custom year (e.g., 2028):'
                        );
                        if (custom)
                          setF({ ...f, maturityYear2: parseInt(custom) });
                      } else {
                        setF({ ...f, maturityYear2: parseInt(e.target.value) });
                      }
                    }}
                    style={{ width: 90, ...S.inp }}
                  >
                    <option value="">Year</option>{' '}
                    {endYears.map((y) => (
                      <option key={y} value={y}>
                        {y}{' '}
                      </option>
                    ))}{' '}
                  </select>{' '}
                </div>{' '}
              </div>
              {/* Tenure display for second facility */}{' '}
              {(() => {
                const tenureDays2 = calculateTenureDays(
                  f.startDay2,
                  f.startMonth2,
                  f.startYear2,
                  f.maturityDay2,
                  f.maturityMonth2,
                  f.maturityYear2
                );
                if (tenureDays2 !== null) {
                  const formattedTenure = formatTenure(tenureDays2);
                  return (
                    <div style={{ gridColumn: 'span 2', marginTop: 8 }}>
                      <label style={S.lbl}>Calculated Tenure 2</label>{' '}
                      <div
                        style={{
                          background: '#0a1520',
                          padding: '8px 12px',
                          borderRadius: 8,
                          fontSize: 14,
                        }}
                      >
                        {formattedTenure}{' '}
                      </div>{' '}
                    </div>
                  );
                }
                return null;
              })()}{' '}
            </>
          )}{' '}
        </>
      );
    } else if (step === 2) {
      return (
        <>
          {' '}
          <div>
            <label style={S.lbl}>Interest Pay Cycle</label>{' '}
            <select
              value={f.intPayCycle}
              onChange={(e) => setF({ ...f, intPayCycle: e.target.value })}
              style={S.inp}
            >
              {' '}
              {[
                'Monthly',
                'Quarterly',
                'Semi-Annual',
                'Annual',
                'At maturity',
                'Bullet',
              ].map((o) => (
                <option key={o} value={o}>
                  {o}{' '}
                </option>
              ))}{' '}
            </select>{' '}
          </div>{' '}
          <div>
            <label style={S.lbl}>Repayment Cycle</label>{' '}
            <select
              value={f.repCycle}
              onChange={(e) => setF({ ...f, repCycle: e.target.value })}
              style={S.inp}
            >
              {' '}
              {[
                'Monthly',
                'Quarterly',
                'Semi-Annual',
                'Annual',
                'Bullet',
                'Revolving',
              ].map((o) => (
                <option key={o} value={o}>
                  {o}{' '}
                </option>
              ))}{' '}
            </select>{' '}
          </div>
          {/* Max Cycle */}{' '}
          <div style={{ gridColumn: 'span 2' }}>
            <label style={S.lbl}>Max Cycle</label>{' '}
            <div style={{ display: 'flex', gap: 8 }}>
              {' '}
              <input
                type="number"
                value={f.maxCycleValue}
                onChange={(e) => setF({ ...f, maxCycleValue: e.target.value })}
                style={{ flex: 2, ...S.inp }}
              />{' '}
              <select
                value={f.maxCycleUnit}
                onChange={(e) => setF({ ...f, maxCycleUnit: e.target.value })}
                style={{ flex: 1, ...S.inp }}
              >
                <option value="Months">Months</option>{' '}
                <option value="Years">Years</option>{' '}
              </select>{' '}
            </div>{' '}
          </div>{' '}
          <div style={{ gridColumn: 'span 2' }}>
            <label style={S.lbl}>Board Approved Interest Rate (%) *</label>{' '}
            <input
              type="number"
              step="0.01"
              value={f.boardRate}
              onChange={(e) => setF({ ...f, boardRate: e.target.value })}
              style={S.inp}
            />{' '}
          </div>
          {/* Additional Rate Toggle */}{' '}
          <div style={{ gridColumn: 'span 2', marginTop: 8 }}>
            {' '}
            <button
              type="button"
              onClick={() => setShowAddRate(!showAddRate)}
              style={mkbtn('#1e3a5f', '#c9a84c', 'sm')}
            >
              {' '}
              {showAddRate
                ? '− Remove Additional Rate'
                : '+ Add Additional Rate'}{' '}
            </button>{' '}
          </div>{' '}
          {showAddRate && (
            <div
              style={{
                gridColumn: 'span 2',
                background: '#0a1520',
                padding: 12,
                borderRadius: 8,
              }}
            >
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <select
                  value={addRateType}
                  onChange={(e) => setAddRateType(e.target.value)}
                  style={{ flex: 1, ...S.inp }}
                >
                  <option value="sofr">SOFR</option>
                  <option value="mpr">MPR</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              {addRateType === 'sofr' && (
                <>
                  <div style={{ textAlign: 'right', marginBottom: 4 }}>
                    <a href="https://www.newyorkfed.org/markets/reference-rates/sofr" target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#3b82f6', textDecoration: 'none' }}>
                      Check current SOFR ↗
                    </a>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="number"
                      placeholder="Term"
                      value={sofrTerm.value}
                      onChange={(e) => setSofrTerm({ ...sofrTerm, value: e.target.value })}
                      style={{ flex: 1, ...S.inp }}
                    />
                    <select
                      value={sofrTerm.unit}
                      onChange={(e) => setSofrTerm({ ...sofrTerm, unit: e.target.value })}
                      style={{ flex: 1, ...S.inp }}
                    >
                      <option value="Days">Days</option>
                      <option value="Months">Months</option>
                      <option value="Years">Years</option>
                    </select>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Rate %"
                      value={sofrRate}
                      onChange={(e) => setSofrRate(e.target.value)}
                      style={{ flex: 1, ...S.inp }}
                    />
                  </div>
                </>
              )}

              {addRateType === 'mpr' && (
                <>
                  <div style={{ textAlign: 'right', marginBottom: 4 }}>
                    <a href="https://www.cbn.gov.ng/rates/mpr.asp" target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#3b82f6', textDecoration: 'none' }}>
                      Check current CBN MPR ↗
                    </a>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="MPR Rate %"
                      value={otherRate}
                      onChange={(e) => {
                        setOtherRate(e.target.value);
                        setOtherRateName('MPR');
                      }}
                      style={{ flex: 1, ...S.inp }}
                    />
                  </div>
                </>
              )}

              {addRateType === 'other' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    placeholder="Rate name (e.g., 'Premium')"
                    value={otherRateName}
                    onChange={(e) => setOtherRateName(e.target.value)}
                    style={{ flex: 1, ...S.inp }}
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Rate %"
                    value={otherRate}
                    onChange={(e) => setOtherRate(e.target.value)}
                    style={{ flex: 1, ...S.inp }}
                  />
                </div>
              )}

              {effectiveRate && (
                <div
                  style={{
                    gridColumn: 'span 2',
                    marginTop: 16,
                    background: '#0a1520',
                    padding: '12px 16px',
                    borderRadius: 8,
                  }}
                >
                  <div style={{ fontSize: 12, color: '#8aa3be', marginBottom: 4 }}>
                    Effective Interest Rate
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 'bold', color: '#c9a84c' }}>
                    {effectiveRate}%
                  </div>
                </div>
              )}
            </div>
          )}
          <div>
            <label style={S.lbl}>Mgmt Fee (%)</label>{' '}
            <input
              type="number"
              step="0.01"
              value={f.mgmtFee}
              onChange={(e) => setF({ ...f, mgmtFee: e.target.value })}
              style={S.inp}
            />{' '}
          </div>{' '}
          <div>
            <label style={S.lbl}>Commitment Fee (%)</label>{' '}
            <input
              type="number"
              step="0.01"
              value={f.commitFee}
              onChange={(e) => setF({ ...f, commitFee: e.target.value })}
              style={S.inp}
            />{' '}
          </div>{' '}
          <div>
            <label style={S.lbl}>Default Interest (%)</label>{' '}
            <input
              type="number"
              step="0.01"
              value={f.defaultInt}
              onChange={(e) => setF({ ...f, defaultInt: e.target.value })}
              style={S.inp}
            />{' '}
          </div>
          {/* Moratorium as number+unit */}{' '}
          <div style={{ gridColumn: 'span 2' }}>
            <label style={S.lbl}>Moratorium</label>{' '}
            <div style={{ display: 'flex', gap: 8 }}>
              {' '}
              <input
                type="number"
                value={f.moratoriumValue}
                onChange={(e) =>
                  setF({ ...f, moratoriumValue: e.target.value })
                }
                style={{ flex: 1, ...S.inp }}
              />{' '}
              <select
                value={f.moratoriumUnit}
                onChange={(e) => setF({ ...f, moratoriumUnit: e.target.value })}
                style={{ flex: 1, ...S.inp }}
              >
                {' '}
                {['None', ...unitOptions].map((u) => (
                  <option key={u} value={u}>
                    {u}{' '}
                  </option>
                ))}{' '}
              </select>{' '}
            </div>{' '}
          </div>{' '}
          <div>
            <label style={S.lbl}>Interest Rate Type</label>{' '}
            <select
              value={f.interestRateType}
              onChange={(e) => setF({ ...f, interestRateType: e.target.value })}
              style={S.inp}
            >
              {' '}
              {['Fixed', 'Floating'].map((o) => (
                <option key={o} value={o}>
                  {o}{' '}
                </option>
              ))}{' '}
            </select>{' '}
          </div>{' '}
          <div>
            <label style={S.lbl}>Pricing Formula</label>{' '}
            <input
              value={f.pricingFormula}
              onChange={(e) => setF({ ...f, pricingFormula: e.target.value })}
              style={S.inp}
            />{' '}
          </div>{' '}
          <div>
            <label style={S.lbl}>Interest Basis</label>{' '}
            <select
              value={f.interestBasis}
              onChange={(e) => setF({ ...f, interestBasis: e.target.value })}
              style={S.inp}
            >
              {' '}
              {[
                'Daily/Simple',
                'Monthly/Simple',
                'Daily/Compound',
                'Monthly/Compound',
              ].map((o) => (
                <option key={o} value={o}>
                  {o}{' '}
                </option>
              ))}{' '}
            </select>{' '}
          </div>
          {/* Second facility terms (only for Overdraft/Short Term) */}{' '}
          {f.facilityClass === 'multi' && (
            <>
              {' '}
              <div style={{ gridColumn: 'span 2', marginTop: 16 }}>
                {' '}
                <h4 style={{ color: '#c9a84c', marginBottom: 8 }}>
                  Secondary Sub‑Facility Terms
                </h4>{' '}
              </div>{' '}
              <div>
                <label style={S.lbl}>Interest Pay Cycle 2</label>{' '}
                <select
                  value={f.intPayCycle2}
                  onChange={(e) => setF({ ...f, intPayCycle2: e.target.value })}
                  style={S.inp}
                >
                  {' '}
                  {[
                    'Monthly',
                    'Quarterly',
                    'Semi-Annual',
                    'Annual',
                    'At maturity',
                    'Bullet',
                  ].map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}{' '}
                </select>{' '}
              </div>{' '}
              <div>
                <label style={S.lbl}>Repayment Cycle 2</label>{' '}
                <select
                  value={f.repCycle2}
                  onChange={(e) => setF({ ...f, repCycle2: e.target.value })}
                  style={S.inp}
                >
                  {' '}
                  {[
                    'Monthly',
                    'Quarterly',
                    'Semi-Annual',
                    'Annual',
                    'Bullet',
                    'Revolving',
                  ].map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}{' '}
                </select>{' '}
              </div>{' '}
              <div style={{ gridColumn: 'span 2' }}>
                <label style={S.lbl}>Board Rate 2 (%) *</label>{' '}
                <input
                  type="number"
                  step="0.01"
                  value={f.boardRate2}
                  onChange={(e) => setF({ ...f, boardRate2: e.target.value })}
                  style={S.inp}
                />{' '}
              </div>{' '}
            </>
          )}{' '}
        </>
      );
    } else if (step === 3) {
      return (
        <>
          {' '}
          <div style={{ gridColumn: 'span 2' }}>
            <label style={S.lbl}>Collateral</label>{' '}
            <textarea
              value={f.collateral}
              onChange={(e) => setF({ ...f, collateral: e.target.value })}
              rows={3}
              style={S.inp}
            />{' '}
          </div>{' '}
          <div style={{ gridColumn: 'span 2' }}>
            <label style={S.lbl}>Remarks</label>{' '}
            <textarea
              value={f.remarks}
              onChange={(e) => setF({ ...f, remarks: e.target.value })}
              rows={3}
              style={S.inp}
            />{' '}
          </div>{' '}
          <div>
            <label style={S.lbl}>Confirmed</label>{' '}
            <select
              value={f.confirmed}
              onChange={(e) => setF({ ...f, confirmed: e.target.value })}
              style={S.inp}
            >
              {' '}
              {['Yes', 'No', 'Pending'].map((o) => (
                <option key={o} value={o}>
                  {o}{' '}
                </option>
              ))}{' '}
            </select>{' '}
          </div>{' '}
          <div>
            <label style={S.lbl}>Status</label>{' '}
            <select
              value={f.status}
              onChange={(e) => setF({ ...f, status: e.target.value })}
              style={S.inp}
            >
              {' '}
              {['Active', 'Expired', 'Pending', 'Suspended'].map((o) => (
                <option key={o} value={o}>
                  {o}{' '}
                </option>
              ))}{' '}
            </select>{' '}
          </div>{' '}
        </>
      );
    } else {
      // Step 4: confirmation with formatted numbers
      return (
        <div style={{ gridColumn: 'span 2' }}>
          {' '}
          <h4 style={{ color: '#c9a84c', marginBottom: 12 }}>
            Review & Confirm{' '}
          </h4>{' '}
          <div
            style={{
              background: '#0a1520',
              padding: 16,
              borderRadius: 8,
              maxHeight: 300,
              overflowY: 'auto',
            }}
          >
            {' '}
            <p>
              <strong>Bank:</strong> {f.bank}
            </p>{' '}
            <p>
              <strong>Facility Name:</strong> {f.facilityName}
            </p>{' '}
            <p>
              <strong>Currency:</strong> {f.ccy}
            </p>{' '}
            <p>
              <strong>Limit:</strong>{' '}
              {fmtFull(parseFloat(f.limitF) || 0, f.ccy === 'NGN' ? '₦' : '$')}
            </p>{' '}
            <p>
              <strong>Facility Amount:</strong>{' '}
              {fmtFull(
                parseFloat(f.facilityAmount) || 0,
                f.ccy === 'NGN' ? '₦' : '$'
              )}
            </p>{' '}
            <p>
              <strong>Start Date:</strong>{' '}
              {buildDate(f.startDay, f.startMonth, f.startYear)}
            </p>{' '}
            <p>
              <strong>Maturity:</strong>{' '}
              {buildDate(f.maturityDay, f.maturityMonth, f.maturityYear)}
            </p>{' '}
            <p>
              <strong>Tenure:</strong> {f.tenureValue} {f.tenureUnit}
              {f.tenure2Value ? ` / ${f.tenure2Value} ${f.tenure2Unit}` : ''}
            </p>{' '}
            <p>
              <strong>Board Rate:</strong> {f.boardRate}%
            </p>{' '}
            <p>
              <strong>Effective Rate:</strong> {effectiveRate || f.boardRate}%
            </p>{' '}
            <p>
              <strong>SOFR:</strong>{' '}
              {sofrRate
                ? `${sofrRate}% for ${sofrTerm.value} ${sofrTerm.unit}`
                : 'None'}
            </p>{' '}
            <p>
              <strong>Mgmt Fee:</strong> {f.mgmtFee}%
            </p>{' '}
            <p>
              <strong>Commitment Fee:</strong> {f.commitFee}%
            </p>{' '}
            <p>
              <strong>Max Cycle:</strong> {f.maxCycleValue} {f.maxCycleUnit}
            </p>{' '}
            <p>
              <strong>Moratorium:</strong> {f.moratoriumValue}{' '}
              {f.moratoriumUnit}
            </p>{' '}
            <p>
              <strong>Collateral:</strong> {f.collateral}
            </p>{' '}
            <p>
              <strong>Remarks:</strong> {f.remarks}
            </p>{' '}
          </div>{' '}
        </div>
      );
    }
  };

  return (
    <Modal title={title} onClose={onClose} width={800}>
      {' '}
      <div
        style={{
          marginBottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ color: '#8aa3be' }}>Step {step} of 4</span>{' '}
        <div
          style={{
            width: 200,
            height: 4,
            background: '#1e3a5f',
            borderRadius: 2,
          }}
        >
          {' '}
          <div
            style={{
              width: `${step * 25}%`,
              height: '100%',
              background: '#c9a84c',
              borderRadius: 2,
            }}
          />{' '}
        </div>{' '}
      </div>{' '}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {renderStep()}{' '}
      </div>{' '}
      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        {' '}
        {step > 1 && (
          <button onClick={prevStep} style={mkbtn('#1e3a5f', '#8aa3be')}>
            Previous{' '}
          </button>
        )}{' '}
        {step < 4 ? (
          <button
            onClick={nextStep}
            style={{ ...mkbtn('#c9a84c', '#0a1520'), flex: 1 }}
          >
            Next{' '}
          </button>
        ) : (
          <button
            onClick={submit}
            style={{
              ...mkbtn('linear-gradient(135deg,#c9a84c,#e8c96a)', '#0a1520'),
              flex: 1,
            }}
          >
            SAVE FACILITY{' '}
          </button>
        )}{' '}
      </div>{' '}
    </Modal>
  );
}

// --- Drawdown Modal with date dropdowns and margin option, custom year ---
export function DrawdownModal({
  facility,
  stats,
  onClose,
  onDrawdown,
  savedSubsidiaries,
  onAddSubsidiary,
}) {
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [day, setDay] = useState(new Date().getDate());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [subsidiary, setSubsidiary] = useState('');
  const [marginApplied, setMarginApplied] = useState(false);
  const [marginRate, setMarginRate] = useState('');
  const [subFacility, setSubFacility] = useState('primary');
  const [showNewSubsidiary, setShowNewSubsidiary] = useState(false);
  const [newSubsidiaryName, setNewSubsidiaryName] = useState('');

  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const currentYear = new Date().getFullYear();
  const years = [
    currentYear,
    ...Array.from({ length: 5 }, (_, i) => currentYear + i + 1),
    'Custom',
  ];

  const submit = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return alert('Enter a valid amount.');
    if (amt > stats.available)
      return alert(
        `Exceeds available balance of ${fmtFull(
          stats.available,
          facility.ccy === 'NGN' ? '₦' : '$'
        )}`
      );
    if (!subsidiary) return alert('Select a subsidiary.');
    let yearVal = year;
    if (year === 'Custom') {
      const custom = prompt('Enter custom year (e.g., 2025):');
      if (!custom) return;
      yearVal = parseInt(custom);
    }
    const dateStr = `${yearVal}-${String(month).padStart(2, '0')}-${String(
      day
    ).padStart(2, '0')}`;
    const margin = marginApplied ? parseFloat(marginRate) || 0 : 0;
    onDrawdown(facility.id, {
      id: 'D' + Date.now(),
      date: dateStr,
      amount: amt,
      purpose,
      repaid: 0,
      subsidiary,                    // <-- use subsidiary field
      interestRateOverride: null,
      marginApplied,
      marginRate: margin,
      subFacility,
    });
    onClose();
  };

  const sym = facility.ccy === 'NGN' ? '₦' : '$';

  return (
    <Modal
      title={`New Drawdown — ${facility.bank}`}
      onClose={onClose}
      width={500}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
          background: '#0a1520',
          borderRadius: 8,
          padding: '12px 16px',
          marginBottom: 10,
        }}
      >
        <div>
          <div style={{ fontSize: 10, color: '#8aa3be' }}>
            LOAN AMOUNT ({facility.ccy})
          </div>
          <strong style={{ color: '#c9a84c' }}>
            {fmtN(facility.facilityAmount, sym)}
          </strong>
        </div>
        <div>
          <div style={{ fontSize: 10, color: '#8aa3be' }}>
            AVAILABLE ({facility.ccy})
          </div>
          <strong style={{ color: '#22c55e' }}>
            {fmtN(stats.available, sym)}
          </strong>
        </div>
      </div>

      <label style={S.lbl}>Amount ({facility.ccy}) *</label>
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        style={S.inp}
      />

      <label style={S.lbl}>Purpose</label>
      <input
        value={purpose}
        onChange={(e) => setPurpose(e.target.value)}
        style={S.inp}
      />

      <label style={S.lbl}>Value Date</label>
      <div style={{ display: 'flex', gap: 4 }}>
        <select
          value={day}
          onChange={(e) => setDay(parseInt(e.target.value))}
          style={{ width: 70, ...S.inp }}
        >
          {days.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select
          value={month}
          onChange={(e) => setMonth(parseInt(e.target.value))}
          style={{ width: 80, ...S.inp }}
        >
          {months.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <select
          value={year}
          onChange={(e) => setYear(e.target.value)}
          style={{ width: 90, ...S.inp }}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginTop: 10 }}>
        <label
          style={{ display: 'flex', alignItems: 'center', gap: 8, ...S.lbl }}
        >
          <input
            type="checkbox"
            checked={marginApplied}
            onChange={(e) => setMarginApplied(e.target.checked)}
          />
          Apply margin
        </label>
        {marginApplied && (
          <input
            type="number"
            step="0.01"
            value={marginRate}
            onChange={(e) => setMarginRate(e.target.value)}
            placeholder="Margin %"
            style={{ marginTop: 4, ...S.inp }}
          />
        )}
      </div>

      {facility.isMulti && (
        <>
          <label style={S.lbl}>Sub‑Facility</label>
          <select
            value={subFacility}
            onChange={(e) => setSubFacility(e.target.value)}
            style={S.inp}
          >
            <option value="primary">Primary</option>
            <option value="secondary">Secondary</option>
          </select>
        </>
      )}

      <label style={S.lbl}>Subsidiary *</label>
      {showNewSubsidiary ? (
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            value={newSubsidiaryName}
            onChange={(e) => setNewSubsidiaryName(e.target.value)}
            style={{ flex: 1, ...S.inp }}
            autoFocus
          />
          <button
            onClick={() => {
              onAddSubsidiary(newSubsidiaryName);
              setSubsidiary(newSubsidiaryName);
              setNewSubsidiaryName('');
              setShowNewSubsidiary(false);
            }}
            style={mkbtn('#22c55e', '#fff', 'sm')}
          >
            ADD
          </button>
          <button
            onClick={() => setShowNewSubsidiary(false)}
            style={mkbtn('#1e3a5f', '#8aa3be', 'sm')}
          >
            ✕
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 6 }}>
          <select
            value={subsidiary}
            onChange={(e) => setSubsidiary(e.target.value)}
            style={{ flex: 1, ...S.inp }}
          >
            <option value="">-- Select Subsidiary --</option>
            {savedSubsidiaries.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowNewSubsidiary(true)}
            style={mkbtn('#c9a84c', '#0a1520', 'sm')}
          >
            + New Subsidiary
          </button>
        </div>
      )}

      <button
        onClick={submit}
        style={{
          ...mkbtn('linear-gradient(135deg,#1d4ed8,#3b82f6)'),
          marginTop: 16,
          width: '100%',
          padding: '11px',
          fontSize: 13,
        }}
      >
        CONFIRM DRAWDOWN
      </button>
    </Modal>
  );
}

// --- Repay Modal (facility-level, FIFO, with principal/interest split) ---
export function RepayModal({ facility, onClose, onRepay }) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState('principal'); // "principal" or "interest"
  const stats = calcStats(facility, []);
  const sym = facility.ccy === 'NGN' ? '₦' : '$';
  const submit = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return alert('Enter a valid amount.');
    if (type === 'principal' && amt > stats.outstanding)
      return alert(
        `Exceeds total outstanding principal of ${fmtFull(
          stats.outstanding,
          sym
        )}`
      );
    if (type === 'interest' && amt > stats.interest)
      return alert(
        `Exceeds accrued interest of ${fmtFull(stats.interest, sym)}`
      );
    onRepay(facility.id, amt, date, type);
    onClose();
  };
  return (
    <Modal
      title={`Record Repayment — ${facility.bank}`}
      onClose={onClose}
      width={500}
    >
      {' '}
      <div
        style={{
          background: '#0a1520',
          borderRadius: 8,
          padding: '12px 16px',
          marginBottom: 10,
        }}
      >
        {' '}
        <div>
          Outstanding Principal:{' '}
          <strong style={{ color: '#f59e0b' }}>
            {fmtFull(stats.outstanding, sym)}
          </strong>
        </div>{' '}
        <div>
          Accrued Interest:{' '}
          <strong style={{ color: '#f59e0b' }}>
            {fmtFull(stats.interest, sym)}
          </strong>
        </div>{' '}
      </div>
      <label style={S.lbl}>Repayment Type</label>{' '}
      <select
        value={type}
        onChange={(e) => setType(e.target.value)}
        style={S.inp}
      >
        <option value="principal">Principal</option>{' '}
        <option value="interest">Interest</option>{' '}
      </select>
      <label style={S.lbl}>Amount ({facility.ccy}) *</label>{' '}
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        style={S.inp}
      />
      <label style={S.lbl}>Date</label>{' '}
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        style={S.inp}
      />{' '}
      <button
        onClick={submit}
        style={{
          ...mkbtn('linear-gradient(135deg,#065f46,#059669)'),
          marginTop: 16,
          width: '100%',
          padding: '11px',
          fontSize: 13,
        }}
      >
        RECORD REPAYMENT{' '}
      </button>{' '}
    </Modal>
  );
}
// --- Scenario Modal (enhanced for new borrowing) ---
export function ScenarioModal({
  facilities,
  currencies,
  displayCcy,
  onClose,
  onAddFacility,
}) {
  const [mode, setMode] = useState('drawdown'); // "drawdown", "repayment", "newFacility"
  const [facilityId, setFacilityId] = useState('');
  const [action, setAction] = useState('drawdown');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [results, setResults] = useState(null); // New facility fields (simplified)
  const [newFacility, setNewFacility] = useState({
    bank: '',
    facilityName: '',
    ccy: 'NGN',
    amount: '',
    rate: '',
  });

  const selectedFac = facilities.find((f) => f.id === facilityId);
  const stats = selectedFac ? calcStats(selectedFac, currencies) : null;

  const runScenario = () => {
    if (mode === 'drawdown' || mode === 'repayment') {
      if (!selectedFac) return alert('Select a facility');
      const amt = parseFloat(amount);
      if (!amt || amt <= 0) return alert('Enter amount');
      if (mode === 'drawdown' && amt > stats.available)
        return alert('Exceeds available');
      if (mode === 'repayment' && amt > stats.outstanding)
        return alert('Exceeds outstanding');

      const newDrawdowns = [...selectedFac.drawdowns];
      if (mode === 'drawdown') {
        newDrawdowns.push({
          id: 'SIM',
          date,
          amount: amt,
          purpose: 'Scenario',
          repaid: 0,
          subsidiary: 'Scenario',
          interestRateOverride: null,
          marginApplied: false,
          marginRate: 0,
        });
      } else {
        // repayment FIFO
        let remaining = amt;
        newDrawdowns.sort((a, b) => new Date(a.date) - new Date(b.date));
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
      const simFac = { ...selectedFac, drawdowns: newDrawdowns };
      const simStats = calcStats(simFac, currencies);
      const diff = {
        outstanding: simStats.outstanding - stats.outstanding,
        interest: simStats.interest - stats.interest,
        available: simStats.available - stats.available,
      };
      setResults({ simStats, origStats: stats, diff });
    } else if (mode === 'newFacility') {
      // Simulate adding a new facility
      const amt = parseFloat(newFacility.amount);
      const rate = parseFloat(newFacility.rate);
      if (!newFacility.bank || !newFacility.facilityName || !amt || !rate)
        return alert('Fill all fields');
      const newFac = {
        id: 'SIMFAC',
        bank: newFacility.bank,
        facilityName: newFacility.facilityName,
        ccy: newFacility.ccy,
        limitF: amt,
        facilityAmount: amt,
        boardRate: rate,
        drawdowns: [], // other fields minimal
      };
      const simStats = calcStats(newFac, currencies);
      setResults({ simStats, origStats: null, diff: null, newFac });
    }
  };

  const sym = displayCcy === 'NGN' ? '₦' : '$';
  const toDisplay = (amt, fromCcy) => {
    if (displayCcy === fromCcy) return amt;
    const fx = currencies.find((c) => c.code === fromCcy)?.rate || 1;
    return displayCcy === 'NGN' ? amt * fx : amt / fx;
  };

  return (
    <Modal title="🔮 What-If Scenario Analysis" onClose={onClose} width={600}>
      {' '}
      <div style={{ marginBottom: 12 }}>
        <label style={S.lbl}>Scenario Type</label>{' '}
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          style={S.inp}
        >
          <option value="drawdown">Drawdown on existing facility</option>{' '}
          <option value="repayment">Repayment on existing facility</option>{' '}
          <option value="newFacility">New borrowing (add facility)</option>{' '}
        </select>{' '}
      </div>{' '}
      {(mode === 'drawdown' || mode === 'repayment') && (
        <>
          {' '}
          <select
            value={facilityId}
            onChange={(e) => setFacilityId(e.target.value)}
            style={{ width: '100%', ...S.inp, marginBottom: 12 }}
          >
            <option value="">Select Facility</option>{' '}
            {facilities.map((f) => (
              <option key={f.id} value={f.id}>
                {f.bank} - {f.facilityName}{' '}
              </option>
            ))}{' '}
          </select>{' '}
          {selectedFac && (
            <div
              style={{
                background: '#0a1520',
                borderRadius: 8,
                padding: '12px 16px',
                marginBottom: 12,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 8,
              }}
            >
              {' '}
              <div>
                <span style={{ color: '#8aa3be' }}>Limit:</span>{' '}
                {fmtN(toDisplay(selectedFac.limitF, selectedFac.ccy), sym)}{' '}
              </div>{' '}
              <div>
                <span style={{ color: '#8aa3be' }}>Outstanding:</span>{' '}
                {fmtN(toDisplay(stats.outstanding, selectedFac.ccy), sym)}{' '}
              </div>{' '}
              <div>
                <span style={{ color: '#8aa3be' }}>Available:</span>{' '}
                {fmtN(toDisplay(stats.available, selectedFac.ccy), sym)}{' '}
              </div>{' '}
            </div>
          )}{' '}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 8,
              marginBottom: 12,
            }}
          >
            {' '}
            <input
              type="number"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={S.inp}
            />{' '}
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={S.inp}
            />{' '}
          </div>{' '}
        </>
      )}{' '}
      {mode === 'newFacility' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
            marginBottom: 12,
          }}
        >
          {' '}
          <input
            placeholder="Bank"
            value={newFacility.bank}
            onChange={(e) =>
              setNewFacility({ ...newFacility, bank: e.target.value })
            }
            style={S.inp}
          />{' '}
          <input
            placeholder="Facility Name"
            value={newFacility.facilityName}
            onChange={(e) =>
              setNewFacility({ ...newFacility, facilityName: e.target.value })
            }
            style={S.inp}
          />{' '}
          <select
            value={newFacility.ccy}
            onChange={(e) =>
              setNewFacility({ ...newFacility, ccy: e.target.value })
            }
            style={S.inp}
          >
            {' '}
            {currencies.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code}{' '}
              </option>
            ))}{' '}
          </select>{' '}
          <input
            type="number"
            placeholder="Amount"
            value={newFacility.amount}
            onChange={(e) =>
              setNewFacility({ ...newFacility, amount: e.target.value })
            }
            style={S.inp}
          />{' '}
          <input
            type="number"
            step="0.01"
            placeholder="Interest Rate %"
            value={newFacility.rate}
            onChange={(e) =>
              setNewFacility({ ...newFacility, rate: e.target.value })
            }
            style={S.inp}
          />{' '}
        </div>
      )}{' '}
      <button
        onClick={runScenario}
        style={{
          ...mkbtn('linear-gradient(135deg,#1d4ed8,#3b82f6)'),
          width: '100%',
          padding: '11px',
        }}
      >
        RUN SIMULATION{' '}
      </button>{' '}
      {results && (
        <div
          style={{
            marginTop: 16,
            background: '#0a1520',
            borderRadius: 8,
            padding: 16,
          }}
        >
          <h4 style={{ color: '#c9a84c', margin: '0 0 10px' }}>Impact</h4>{' '}
          {mode === 'newFacility' ? (
            <p>
              New facility added: {results.newFac.facilityName} -{' '}
              {fmtN(results.newFac.facilityAmount, sym)} at{' '}
              {results.newFac.boardRate}%{' '}
            </p>
          ) : (
            <table style={{ width: '100%', fontSize: 12 }}>
              {' '}
              <thead>
                {' '}
                <tr>
                  <th>Metric</th> <th>Current</th> <th>Scenario</th>{' '}
                  <th>Change</th>{' '}
                </tr>{' '}
              </thead>{' '}
              <tbody>
                {' '}
                <tr>
                  <td>Outstanding</td>{' '}
                  <td>
                    {' '}
                    {fmtN(
                      toDisplay(results.origStats.outstanding, selectedFac.ccy),
                      sym
                    )}{' '}
                  </td>{' '}
                  <td>
                    {' '}
                    {fmtN(
                      toDisplay(results.simStats.outstanding, selectedFac.ccy),
                      sym
                    )}{' '}
                  </td>{' '}
                  <td
                    style={{
                      color:
                        results.diff.outstanding > 0 ? '#ef4444' : '#22c55e',
                    }}
                  >
                    {' '}
                    {fmtN(
                      toDisplay(results.diff.outstanding, selectedFac.ccy),
                      sym
                    )}{' '}
                  </td>{' '}
                </tr>{' '}
                <tr>
                  <td>Interest</td>{' '}
                  <td>
                    {' '}
                    {fmtN(
                      toDisplay(results.origStats.interest, selectedFac.ccy),
                      sym
                    )}{' '}
                  </td>{' '}
                  <td>
                    {' '}
                    {fmtN(
                      toDisplay(results.simStats.interest, selectedFac.ccy),
                      sym
                    )}{' '}
                  </td>{' '}
                  <td>
                    {' '}
                    {fmtN(
                      toDisplay(results.diff.interest, selectedFac.ccy),
                      sym
                    )}{' '}
                  </td>{' '}
                </tr>{' '}
                <tr>
                  <td>Available</td>{' '}
                  <td>
                    {' '}
                    {fmtN(
                      toDisplay(results.origStats.available, selectedFac.ccy),
                      sym
                    )}{' '}
                  </td>{' '}
                  <td>
                    {' '}
                    {fmtN(
                      toDisplay(results.simStats.available, selectedFac.ccy),
                      sym
                    )}{' '}
                  </td>{' '}
                  <td
                    style={{
                      color: results.diff.available < 0 ? '#ef4444' : '#22c55e',
                    }}
                  >
                    {' '}
                    {fmtN(
                      toDisplay(results.diff.available, selectedFac.ccy),
                      sym
                    )}{' '}
                  </td>{' '}
                </tr>{' '}
              </tbody>{' '}
            </table>
          )}{' '}
        </div>
      )}{' '}
    </Modal>
  );
}
