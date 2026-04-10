import { useState, useMemo } from "react";
import { S, mkbtn, Badge, UtilBar, Modal } from "./ui.jsx";
import { fmtN, fmtPct, daysBetween, calcStats, calcDrawdownSubsidiaryStats, generateRepaymentSchedule, formatTenure } from "./utils";

// --- Interest & Fees Page ---
export function InterestFeesPage({ facilities, currencies, displayCcy }) {
    const [filterBank, setFilterBank] = useState('All');
    const [filterFacility, setFilterFacility] = useState('All');

    const uniqueBanks = useMemo(
        () => ['All', ...new Set(facilities.map((f) => f.bank))],
        [facilities]
    );

    const facilitiesForBank = useMemo(() => {
        if (filterBank === 'All') return facilities;
        return facilities.filter((f) => f.bank === filterBank);
    }, [facilities, filterBank]);

    const uniqueFacilities = useMemo(
        () => ['All', ...facilitiesForBank.map((f) => f.id)],
        [facilitiesForBank]
    );

    const selectedFacilities = useMemo(() => {
        if (filterFacility === 'All') return facilitiesForBank;
        return facilitiesForBank.filter((f) => f.id === filterFacility);
    }, [facilitiesForBank, filterFacility]);

    const toDisplay = (amount, fromCcy) => {
        if (displayCcy === fromCcy) return amount;
        const fx = currencies.find((c) => c.code === fromCcy)?.rate || 1;
        return displayCcy === 'NGN' ? amount * fx : amount / fx;
    };

    const rows = [];
    selectedFacilities.forEach((f) => {
        const stats = calcStats(f, currencies);
        rows.push({
            facility: f.facilityName,
            bank: f.bank,
            interest: toDisplay(stats.interest, f.ccy),
            mgmtFee: toDisplay(stats.mgmtFeeAmount, f.ccy),
            commitFee: toDisplay(stats.commitFeeAmount, f.ccy),
            totalFees: toDisplay(stats.totalFees || 0, f.ccy),
        });
    });

    const totalInterest = rows.reduce((s, r) => s + (parseFloat(r.interest) || 0), 0);
    const totalMgmt = rows.reduce((s, r) => s + (parseFloat(r.mgmtFee) || 0), 0);
    const totalCommit = rows.reduce((s, r) => s + (parseFloat(r.commitFee) || 0), 0);
    const grandTotal = totalInterest + totalMgmt + totalCommit;

    return (
        <div style={S.card}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                <select
                    value={filterBank}
                    onChange={(e) => {
                        setFilterBank(e.target.value);
                        setFilterFacility('All');
                    }}
                    style={{ width: 200, ...S.inp }}
                >
                    {uniqueBanks.map((b) => (
                        <option key={b}>{b}</option>
                    ))}
                </select>
                <select
                    value={filterFacility}
                    onChange={(e) => setFilterFacility(e.target.value)}
                    style={{ width: 250, ...S.inp }}
                >
                    {uniqueFacilities.map((id) => {
                        if (id === 'All') return <option key="All" value="All">All Facilities</option>;
                        const fac = facilities.find((f) => f.id === id);
                        return <option key={id} value={id}>{fac?.facilityName}</option>;
                    })}
                </select>
            </div>
            <h4 style={S.sec}>Interest</h4>
            <table style={S.table}>
                <thead>
                    <tr>
                        <th style={S.th}>Facility</th>
                        <th style={S.th}>Bank</th>
                        <th style={S.th}>Interest</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r, idx) => (
                        <tr key={idx}>
                            <td style={S.td}>{r.facility}</td>
                            <td style={S.td}>{r.bank}</td>
                            <td style={S.td}>{fmtN(r.interest, displayCcy === 'NGN' ? '₦' : '$')}</td>
                        </tr>
                    ))}
                    <tr>
                        <td colSpan={2} style={S.td}><strong>Subtotal</strong></td>
                        <td style={S.td}><strong>{fmtN(totalInterest, displayCcy === 'NGN' ? '₦' : '$')}</strong></td>
                    </tr>
                </tbody>
            </table>
            <h4 style={{ ...S.sec, marginTop: 20 }}>Fees</h4>
            <table style={S.table}>
                <thead>
                    <tr>
                        <th style={S.th}>Facility</th>
                        <th style={S.th}>Bank</th>
                        <th style={S.th}>Mgmt Fee</th>
                        <th style={S.th}>Commit Fee</th>
                        <th style={S.th}>Total Fees</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r, idx) => (
                        <tr key={idx}>
                            <td style={S.td}>{r.facility}</td>
                            <td style={S.td}>{r.bank}</td>
                            <td style={S.td}>{fmtN(r.mgmtFee, displayCcy === 'NGN' ? '₦' : '$')}</td>
                            <td style={S.td}>{fmtN(r.commitFee, displayCcy === 'NGN' ? '₦' : '$')}</td>
                            <td style={S.td}>{fmtN(r.mgmtFee + r.commitFee, displayCcy === 'NGN' ? '₦' : '$')}</td>
                        </tr>
                    ))}
                    <tr>
                        <td colSpan={2} style={S.td}><strong>Subtotal</strong></td>
                        <td style={S.td}><strong>{fmtN(totalMgmt, displayCcy === 'NGN' ? '₦' : '$')}</strong></td>
                        <td style={S.td}><strong>{fmtN(totalCommit, displayCcy === 'NGN' ? '₦' : '$')}</strong></td>
                        <td style={S.td}><strong>{fmtN(totalMgmt + totalCommit, displayCcy === 'NGN' ? '₦' : '$')}</strong></td>
                    </tr>
                </tbody>
            </table>
            <div style={{ marginTop: 16, fontSize: 16, fontWeight: 'bold', textAlign: 'right' }}>
                Grand Total: {fmtN(grandTotal, displayCcy === 'NGN' ? '₦' : '$')}
            </div>
        </div>
    );
}

// --- Drawdowns Page ---
export function DrawdownsPage({ facilities, currencies, displayCcy, onSubsidiaryRepay }) {
    const [filterSubsidiary, setFilterSubsidiary] = useState('All');
    const [selectedDrawdown, setSelectedDrawdown] = useState(null);
    const uniqueSubsidiaries = useMemo(
        () => ['All', ...new Set(facilities.flatMap((f) => f.drawdowns.map((d) => d.subsidiary)))],
        [facilities]
    );
    const rows = facilities.flatMap((f) =>
        f.drawdowns.map((d) => {
            const stats = calcDrawdownSubsidiaryStats(d, f.boardRate);
            return {
                ...d,
                facility: f,
                facilityName: f.facilityName,
                bank: f.bank,
                subsidiary: d.subsidiary,
                outstanding: stats.outstanding,
                interest: stats.interest,
                rate: d.interestRateOverride ?? f.boardRate + (d.marginApplied ? d.marginRate : 0),
            };
        })
    ).filter((r) => filterSubsidiary === 'All' || r.subsidiary === filterSubsidiary);

    const toDisplay = (amount, fromCcy) => {
        if (displayCcy === fromCcy) return amount;
        const fx = currencies.find((c) => c.code === fromCcy)?.rate || 1;
        return displayCcy === 'NGN' ? amount * fx : amount / fx;
    };
    const sym = displayCcy === 'NGN' ? '₦' : '$';

    return (
        <div style={S.card}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                <select value={filterSubsidiary} onChange={(e) => setFilterSubsidiary(e.target.value)} style={{ width: 200, ...S.inp }}>
                    {uniqueSubsidiaries.map((s) => (<option key={s}>{s}</option>))}
                </select>
            </div>
            <table style={S.table}>
                <thead>
                    <tr>
                        <th style={S.th}>Subsidiary</th>
                        <th style={S.th}>Facility</th>
                        <th style={S.th}>Bank</th>
                        <th style={S.th}>Drawdown Date</th>
                        <th style={S.th}>Amount</th>
                        <th style={S.th}>Repaid</th>
                        <th style={S.th}>Outstanding</th>
                        <th style={S.th}>Rate</th>
                        <th style={S.th}>Accrued Interest</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r) => (
                        <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedDrawdown(r)}>
                            <td style={S.td}>{r.subsidiary}</td>
                            <td style={S.td}>{r.facilityName}</td>
                            <td style={S.td}>{r.bank}</td>
                            <td style={S.td}>{r.date}</td>
                            <td style={S.td}>{fmtN(toDisplay(r.amount, r.facility.ccy), sym)}</td>
                            <td style={S.td}>{fmtN(toDisplay(r.subsidiaryRepaid || 0, r.facility.ccy), sym)}</td>
                            <td style={{ ...S.td, color: r.outstanding > 0 ? '#f59e0b' : '#22c55e' }}>
                                {fmtN(toDisplay(r.outstanding, r.facility.ccy), sym)}
                            </td>
                            <td style={S.td}>{r.rate.toFixed(2)}%</td>
                            <td style={S.td}>{fmtN(toDisplay(r.interest, r.facility.ccy), sym)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {selectedDrawdown && (
                <DrawdownDetailModal
                    drawdown={selectedDrawdown}
                    facility={selectedDrawdown.facility}
                    currencies={currencies}
                    onClose={() => setSelectedDrawdown(null)}
                    onRepay={onSubsidiaryRepay}
                />
            )}
        </div>
    );
}

// --- Drawdown Detail Modal ---
export function DrawdownDetailModal({ drawdown, facility, currencies, onClose, onRepay }) {
    const [repayAmount, setRepayAmount] = useState('');
    const [repayType, setRepayType] = useState('principal');
    const stats = calcDrawdownSubsidiaryStats(drawdown, facility.boardRate);
    const sym = facility.ccy === 'NGN' ? '₦' : '$';

    const handleRepay = () => {
        const amt = parseFloat(repayAmount);
        if (!amt || amt <= 0) return alert('Enter a valid amount.');
        if (repayType === 'principal' && amt > stats.outstanding) return alert('Exceeds outstanding principal.');
        if (repayType === 'interest' && amt > stats.interest) return alert('Exceeds accrued interest.');
        onRepay(drawdown.id, amt, repayType);
        onClose();
    };

    return (
        <Modal title={`Drawdown: ${drawdown.id}`} onClose={onClose} width={500}>
            <div style={{ background: '#0a1520', padding: 16, borderRadius: 8, marginBottom: 16 }}>
                <div><span style={{ color: '#8aa3be' }}>Subsidiary:</span> {drawdown.subsidiary}</div>
                <div><span style={{ color: '#8aa3be' }}>Facility:</span> {facility.facilityName}</div>
                <div><span style={{ color: '#8aa3be' }}>Drawdown Date:</span> {drawdown.date}</div>
                <div><span style={{ color: '#8aa3be' }}>Amount:</span> {fmtN(drawdown.amount, sym)}</div>
                <div><span style={{ color: '#8aa3be' }}>Repaid (subsidiary):</span> {fmtN(drawdown.subsidiaryRepaid || 0, sym)}</div>
                <div><span style={{ color: '#8aa3be' }}>Outstanding:</span> <strong style={{ color: '#f59e0b' }}>{fmtN(stats.outstanding, sym)}</strong></div>
                <div><span style={{ color: '#8aa3be' }}>Accrued Interest:</span> <strong style={{ color: '#a78bfa' }}>{fmtN(stats.interest, sym)}</strong></div>
                <div><span style={{ color: '#8aa3be' }}>Rate:</span> {drawdown.interestRateOverride ?? facility.boardRate + (drawdown.marginApplied ? drawdown.marginRate : 0)}%</div>
            </div>
            <label style={S.lbl}>Repayment Type</label>
            <select value={repayType} onChange={(e) => setRepayType(e.target.value)} style={S.inp}>
                <option value="principal">Principal</option>
                <option value="interest">Interest</option>
            </select>
            <label style={S.lbl}>Amount</label>
            <input type="number" value={repayAmount} onChange={(e) => setRepayAmount(e.target.value)} style={S.inp} />
            <button onClick={handleRepay} style={{ ...mkbtn('#059669'), marginTop: 16, width: '100%' }}>RECORD REPAYMENT</button>
        </Modal>
    );
}

// --- Repayment Schedule Page ---
export function RepaymentSchedulePage({ facilities, currencies, displayCcy }) {
    const [filterBank, setFilterBank] = useState('All');
    const [filterFacility, setFilterFacility] = useState('All');

    const uniqueBanks = useMemo(() => ['All', ...new Set(facilities.map((f) => f.bank))], [facilities]);
    const facilitiesForBank = useMemo(() => filterBank === 'All' ? facilities : facilities.filter((f) => f.bank === filterBank), [facilities, filterBank]);
    const uniqueFacilities = useMemo(() => ['All', ...facilitiesForBank.map((f) => f.id)], [facilitiesForBank]);
    const selectedFacility = useMemo(() => filterFacility === 'All' ? null : facilities.find((f) => f.id === filterFacility), [facilities, filterFacility]);

    const toDisplay = (amount, fromCcy) => {
        if (displayCcy === fromCcy) return amount;
        const fx = currencies.find((c) => c.code === fromCcy)?.rate || 1;
        return displayCcy === 'NGN' ? amount * fx : amount / fx;
    };

    const schedule = [];
    if (selectedFacility) {
        const f = selectedFacility;
        const start = new Date(f.startDate);
        const maturity = new Date(f.maturity);
        const monthsDiff = (maturity.getFullYear() - start.getFullYear()) * 12 + (maturity.getMonth() - start.getMonth());
        let currentDate = new Date(start);
        for (let i = 1; i <= (monthsDiff || 1); i++) {
            currentDate.setMonth(currentDate.getMonth() + 1);
            const interest = (f.facilityAmount * f.boardRate) / 100 / 12;
            schedule.push({
                date: currentDate.toISOString().split('T')[0],
                principal: i === monthsDiff ? f.facilityAmount : 0,
                interest: interest,
            });
        }
    }

    return (
        <div style={S.card}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                <select value={filterBank} onChange={(e) => { setFilterBank(e.target.value); setFilterFacility('All'); }} style={{ width: 200, ...S.inp }}>
                    {uniqueBanks.map((b) => <option key={b}>{b}</option>)}
                </select>
                <select value={filterFacility} onChange={(e) => setFilterFacility(e.target.value)} style={{ width: 250, ...S.inp }}>
                    {uniqueFacilities.map((id) => {
                        if (id === 'All') return <option key="All" value="All">All Facilities</option>;
                        const fac = facilities.find((f) => f.id === id);
                        return <option key={id} value={id}>{fac?.facilityName}</option>;
                    })}
                </select>
            </div>
            {selectedFacility && (
                <table style={S.table}>
                    <thead>
                        <tr><th style={S.th}>Payment Date</th><th style={S.th}>Principal Due</th><th style={S.th}>Interest Due</th><th style={S.th}>Total</th></tr>
                    </thead>
                    <tbody>
                        {schedule.map((s, idx) => (
                            <tr key={idx}>
                                <td style={S.td}>{s.date}</td>
                                <td style={S.td}>{fmtN(toDisplay(s.principal, selectedFacility.ccy), displayCcy === 'NGN' ? '₦' : '$')}</td>
                                <td style={S.td}>{fmtN(toDisplay(s.interest, selectedFacility.ccy), displayCcy === 'NGN' ? '₦' : '$')}</td>
                                <td style={S.td}>{fmtN(toDisplay(s.principal + s.interest, selectedFacility.ccy), displayCcy === 'NGN' ? '₦' : '$')}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}

// --- Facility Card Component ---
export function FacilityCard({
    f,
    setModal,
    setConfirm,
    delFac,
    onEdit,
    onDetail,
    currencies,
}) {
    const stats = calcStats(f, currencies);
    const sym = f.ccy === 'NGN' ? '₦' : '$';
    const daysLeft = daysBetween(new Date().toISOString().split('T')[0], f.maturity);

    return (
        <div
            style={{ ...S.card, padding: '24px', cursor: 'pointer' }}
            onClick={() => onDetail(f)} // Clicking the card opens Detail Info
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20 }}>
                <div style={{ flex: '1' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                        <span style={{ color: '#5d7a96', fontSize: 12, fontWeight: 'bold' }}>{f.loanNumber || 'NEW'}</span>
                        <strong
                            style={{ fontSize: 18, cursor: 'pointer', color: '#c9a84c' }}
                            onClick={(e) => {
                                e.stopPropagation(); // Stops the Info popup
                                onDetail(f);         // Opens Detail Modal
                            }}
                        >
                            {f.facilityName}
                        </strong>
                        <Badge status={f.status} />
                        <span style={{ background: f.ccy === 'NGN' ? '#1a2d45' : '#2d1b00', color: f.ccy === 'NGN' ? '#60a5fa' : '#f59e0b', borderRadius: 4, padding: '2px 7px', fontSize: 12, fontWeight: 700 }}>
                            {f.ccy}
                        </span>
                    </div>

                    <div style={{ fontSize: 14, color: '#8aa3be', marginBottom: 10 }}>
                        {f.bank} · {f.facilityClass} · {f.boardRate}% Rate
                    </div>

                    {/* THE RESTORED DATA GRID */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
                        <div>
                            <span style={{ fontSize: 12, color: '#8aa3be' }}>Limit</span>
                            <div style={{ fontSize: 16, fontFamily: 'monospace' }}>{fmtN(parseFloat(f.facilityAmount) || 0, sym)}</div>
                        </div>
                        <div>
                            <span style={{ fontSize: 12, color: '#8aa3be' }}>Current Owed</span>
                            <div style={{ fontSize: 16, fontFamily: 'monospace', color: '#f59e0b' }}>{fmtN(stats.outstanding, sym)}</div>
                        </div>
                        <div>
                            <span style={{ fontSize: 12, color: '#8aa3be' }}>Available</span>
                            <div style={{ fontSize: 16, fontFamily: 'monospace', color: '#22c55e' }}>{fmtN(stats.available, sym)}</div>
                        </div>
                        <div>
                            <span style={{ fontSize: 12, color: '#8aa3be' }}>Accrued Int.</span>
                            <div style={{ fontSize: 16, fontFamily: 'monospace', color: '#a78bfa' }}>{fmtN(stats.interest, sym)}</div>
                        </div>
                    </div>

                    <div style={{ marginTop: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 12, color: '#8aa3be' }}>Utilization</span>
                            <span style={{ fontSize: 14, fontWeight: 600, color: stats.utilPct > 90 ? '#ef4444' : '#22c55e' }}>{fmtPct(stats.utilPct)}</span>
                        </div>
                        <UtilBar pct={stats.utilPct} />
                    </div>

                    <div style={{ marginTop: 12, display: 'flex', gap: 15 }}>
                        <div style={{ fontSize: 11, color: '#8aa3be' }}>Mgt Fee: <span style={{ color: '#e8f0fe' }}>{fmtN(stats.mgtFeeAmount, sym)}</span></div>
                        <div style={{ fontSize: 11, color: '#8aa3be' }}>Days to Maturity: <span style={{ color: daysLeft < 30 ? '#ef4444' : '#22c55e' }}>{daysLeft < 0 ? 'Expired' : daysLeft}</span></div>
                    </div>
                </div>

                {/* ACTION BUTTONS COLUMN */}
                <div
                    style={{ flex: '0 0 120px', display: 'flex', flexDirection: 'column', gap: 8 }}
                    onClick={(e) => e.stopPropagation()} // Clicking buttons won't trigger the card background
                >
                    {f.status === 'Active' && (
                        <>
                            <button onClick={() => setModal({ type: 'drawdown', facilityId: f.id })} style={mkbtn('#1d4ed8')}>↓ Drawdown</button>
                            <button onClick={() => setModal({ type: 'repay', facilityId: f.id })} style={mkbtn('#059669')}>↩ Repay</button>
                            <button onClick={() => setModal({ type: 'renew', facilityId: f.id })} style={mkbtn('#1e3a5f', '#c9a84c')}>♻️ Renew</button>
                        </>
                    )}
                    <button onClick={() => onEdit(f)} style={mkbtn('#374151', '#fbbf24')}>✏️ Edit</button>
                    <button
                        onClick={() => setConfirm({
                            message: `Delete "${f.facilityName}"?`,
                            onConfirm: () => delFac(f.id)
                        })}
                        style={mkbtn('#7f1d1d', '#fca5a5')}
                    >
                        🗑 Delete
                    </button>
                </div>
            </div>
        </div>
    );
}

// --- Performance Page ---
export function PerformancePage({ facilities, currencies, displayCcy }) {
    return (
        <div style={S.card}>
            <div style={S.sec}>Loan Performance Tracking</div>
            <table style={S.table}>
                <thead>
                    <tr><th style={S.th}>Facility</th><th style={S.th}>Bank</th><th style={S.th}>Principal Due</th><th style={S.th}>Principal Paid</th><th style={S.th}>Principal Status</th><th style={S.th}>Interest Due</th><th style={S.th}>Interest Paid</th><th style={S.th}>Interest Status</th></tr>
                </thead>
                <tbody>
                    {facilities.map((f) => {
                        const stats = calcStats(f, currencies);
                        const principalPaid = stats.repaid;
                        const principalStatus = principalPaid >= f.facilityAmount ? 'Paid' : principalPaid > 0 ? 'Partial' : 'Outstanding';
                        const interestPaid = (f.repayments || []).filter(r => r.type === 'interest').reduce((sum, r) => sum + r.amount, 0);
                        const interestStatus = interestPaid >= stats.interest ? 'Paid' : interestPaid > 0 ? 'Partial' : 'Outstanding';
                        return (
                            <tr key={f.id}>
                                <td style={S.td}>{f.facilityName}</td>
                                <td style={S.td}>{f.bank}</td>
                                <td style={S.td}>{fmtN(f.facilityAmount, displayCcy === 'NGN' ? '₦' : '$')}</td>
                                <td style={S.td}>{fmtN(principalPaid, displayCcy === 'NGN' ? '₦' : '$')}</td>
                                <td style={S.td}><Badge status={principalStatus} /></td>
                                <td style={S.td}>{fmtN(stats.interest, displayCcy === 'NGN' ? '₦' : '$')}</td>
                                <td style={S.td}>{fmtN(interestPaid, displayCcy === 'NGN' ? '₦' : '$')}</td>
                                <td style={S.td}><Badge status={interestStatus} /></td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}