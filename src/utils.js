// src/utils.js

export const fmtN = (n, ccy = "") => {
  if (Math.abs(n) >= 1e9) return `${ccy}${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `${ccy}${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `${ccy}${(n / 1e3).toFixed(1)}K`;
  return `${ccy}${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
};

export const fmtFull = (n, ccy = "") =>
  `${ccy}${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

export const fmtPct = (n) => `${n.toFixed(2)}%`;

export const daysBetween = (d1, d2) =>
  Math.ceil((new Date(d2) - new Date(d1)) / (1000 * 60 * 60 * 24));

export function calcStats(f, currencies, today = new Date()) {
  const fxRate = currencies.find((c) => c.code === f.ccy)?.rate || 1;
  const todayStr = today.toISOString().split("T")[0]; 

  const computeStats = (drawdowns, repayments, baseRate) => {
     const events = [];
     drawdowns.forEach(d => events.push({ date: d.date, amount: d.amount, type: 'drawdown' }));
     repayments.filter(r => r.type === 'principal').forEach(r => events.push({ date: r.date, amount: r.amount, type: 'repay' }));
     
     events.sort((a, b) => new Date(a.date) - new Date(b.date));
     
     let balance = 0;
     let interestAccrued = 0;
     let lastDate = f.startDate || todayStr;
     
     events.forEach(ev => {
         if (new Date(ev.date) > new Date(todayStr)) return;
         let days = Math.max(0, daysBetween(lastDate, ev.date));
         if (days > 0 && balance > 0) {
             interestAccrued += balance * (baseRate / 100) * (days / 365);
         }
         if (ev.type === 'drawdown') balance += ev.amount;
         if (ev.type === 'repay') balance -= ev.amount;
         lastDate = ev.date;
     });
     
     let daysToToday = Math.max(0, daysBetween(lastDate, todayStr));
     if (daysToToday > 0 && balance > 0) {
         interestAccrued += balance * (baseRate / 100) * (daysToToday / 365);
     }
     
     const drawn = drawdowns.reduce((s,d)=>s+d.amount,0);
     const repaid = repayments.filter(r=>r.type==='principal').reduce((s,r)=>s+r.amount,0);
     const interestPaid = repayments.filter(r=>r.type==='interest').reduce((s,r)=>s+r.amount,0);
     
     return { drawn, repaid, outstanding: balance, interest: Math.max(0, interestAccrued - interestPaid) };
  };

  const reps = f.repayments || [];
  const primaryDrawdowns = (f.drawdowns || []).filter((d) => d.subFacility !== "secondary");
  const secondaryDrawdowns = (f.drawdowns || []).filter((d) => d.subFacility === "secondary");
  
  const primaryStats = computeStats(primaryDrawdowns, reps, f.boardRate);
  const secondaryStats = f.facilityClass === "Overdraft/Short Term"
      ? computeStats(secondaryDrawdowns, [], f.boardRate2 || f.boardRate)
      : { drawn: 0, repaid: 0, outstanding: 0, interest: 0 };

  const totalDrawn = primaryStats.drawn + secondaryStats.drawn;
  const totalRepaid = primaryStats.repaid + secondaryStats.repaid;
  const totalOutstanding = totalDrawn - totalRepaid; 
  const totalLoanAmount = parseFloat(f.facilityAmount) || 0;
  const available = Math.max(0, totalLoanAmount - totalDrawn);
  const utilPct = totalLoanAmount > 0 ? (totalDrawn / totalLoanAmount) * 100 : 0;
  const totalInterest = primaryStats.interest + secondaryStats.interest;
  
  return {
    drawn: totalDrawn, repaid: totalRepaid, outstanding: totalOutstanding, available, utilPct,
    interest: totalInterest, primaryStats, secondaryStats,
  };
}

export function generateRepaymentSchedule(facility) {
  const schedule = [];
  const start = new Date(facility.startDate);
  const maturity = new Date(facility.maturity);
  if (isNaN(start) || isNaN(maturity)) return [];

  const getMonths = (cycle) => {
    switch(cycle) {
      case 'Monthly': return 1;
      case 'Quarterly': return 3;
      case 'Semi-Annual': return 6;
      case 'Annual': return 12;
      default: return 0;
    }
  };

  const intMonths = getMonths(facility.intPayCycle);
  const repMonths = getMonths(facility.repCycle);
  let totalMonths = (maturity.getFullYear() - start.getFullYear()) * 12 + (maturity.getMonth() - start.getMonth());
  if (totalMonths <= 0) totalMonths = 1;

  let currentBalance = parseFloat(facility.facilityAmount) || 0;
  const rate = parseFloat(facility.boardRate) || 0;
  let totalRepPeriods = repMonths > 0 ? Math.floor(totalMonths / repMonths) : 1;
  let principalPerPeriod = currentBalance / totalRepPeriods;
  let accumulatedInterest = 0;

  for (let i = 1; i <= totalMonths; i++) {
    let date = new Date(start);
    date.setMonth(date.getMonth() + i);
    let monthlyInterest = currentBalance * (rate / 100) / 12;
    accumulatedInterest += monthlyInterest;
    let principalDue = 0, interestDue = 0, isLastMonth = (i === totalMonths);

    if ((intMonths > 0 && i % intMonths === 0) || (isLastMonth && facility.intPayCycle === 'Bullet')) {
        interestDue = accumulatedInterest;
        accumulatedInterest = 0;
    }
    if ((repMonths > 0 && i % repMonths === 0) || (isLastMonth && facility.repCycle === 'Bullet')) {
        principalDue = Math.min(principalPerPeriod, currentBalance);
        if (isLastMonth) principalDue = currentBalance;
        currentBalance -= principalDue;
    }
    schedule.push({ date: date.toISOString().split('T')[0], principal: principalDue, interest: interestDue, balance: Math.max(0, currentBalance) });
  }
  return schedule;
}