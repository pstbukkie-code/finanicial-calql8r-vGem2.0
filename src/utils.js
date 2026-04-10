// src/utils.js

export const fmtN = (n, ccy = "") => {
    // Fix: If n is undefined or null, default to 0 to prevent toLocaleString crash
    const num = n || 0;
    if (Math.abs(num) >= 1e9) return `${ccy}${(num / 1e9).toFixed(2)}B`;
    if (Math.abs(num) >= 1e6) return `${ccy}${(num / 1e6).toFixed(2)}M`;
    if (Math.abs(num) >= 1e3) return `${ccy}${(num / 1e3).toFixed(1)}K`;
    return `${ccy}${num.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
};

export const fmtFull = (n, ccy = "") =>
  `${ccy}${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

export const fmtPct = (n) => {
    // Convert n to a number and default to 0 if it's invalid (NaN, null, undefined)
    const num = parseFloat(n) || 0;
    return `${num.toFixed(2)}%`;
};

export const daysBetween = (d1, d2) =>
  Math.ceil((new Date(d2) - new Date(d1)) / (1000 * 60 * 60 * 24));

  // Add this back to src/utils.js
export const formatTenure = (days) => {
  if (days === null || days === 0) return "";
  const totalMonths = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  const remainingMonths = Math.floor((days % 365) / 30);
  let result = `${days} day${days !== 1 ? "s" : ""}`;
  if (days >= 30) {
    result += ` / ${totalMonths} month${totalMonths !== 1 ? "s" : ""}`;
  }
  if (days >= 365) {
    result += ` / ${years} year${years !== 1 ? "s" : ""}`;
    if (remainingMonths > 0) {
      result += `, ${remainingMonths} month${remainingMonths !== 1 ? "s" : ""}`;
    }
  }
  return result;
};

export function calcStats(f, currencies, today = new Date()) {
    const todayStr = today.toISOString().split("T")[0];
    const isChild = !!f.parentId; // Identify if this is a drawn utilization

    const computeStats = () => {
        const limit = parseFloat(f.facilityAmount) || 0;
        let interestAccrued = 0;
        let drawn = f.drawdowns?.reduce((s, d) => s + d.amount, 0) || 0;
        const principalRepaid = f.repayments?.filter(r => r.type === 'principal').reduce((s, r) => s + r.amount, 0) || 0;
        const currentBalance = (isChild ? limit : drawn) - principalRepaid;

        // --- PERSPECTIVE 1: BANK FACILITY (Parent Relationship) ---
        if (!isChild) {
            // Immediate accrual on total exposure/limit
            const daysSinceStart = Math.max(0, daysBetween(f.startDate, todayStr));
            interestAccrued = (limit * (f.boardRate / 100) * (daysSinceStart / 365));

            const available = f.facilityClass === 'Revolving' || f.facilityClass === 'Overdraft/Short Term'
                ? Math.max(0, limit - (drawn - principalRepaid)) // Repayment adds back to headroom
                : Math.max(0, limit - drawn); // Term loan: limit is consumed forever

            return { drawn, repaid: principalRepaid, outstanding: (drawn - principalRepaid), interest: interestAccrued, available };
        }

        // --- PERSPECTIVE 2: UTILIZED LOAN (Child Operational) ---
        else {
            // Reducing Balance: Interest only on the actual unpaid principal balance
            const daysSinceStart = Math.max(0, daysBetween(f.startDate, todayStr));
            interestAccrued = (currentBalance * (f.boardRate / 100) * (daysSinceStart / 365));
            return { drawn: limit, repaid: principalRepaid, outstanding: currentBalance, interest: interestAccrued, available: 0 };
        }
    };

    const stats = computeStats();
    return {
        ...stats,
        utilPct: (parseFloat(f.facilityAmount) > 0) ? (stats.outstanding / parseFloat(f.facilityAmount)) * 100 : 0
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
// Function needed by pages.jsx to calculate individual subsidiary statistics
export function calcDrawdownSubsidiaryStats(drawdown, masterRate, today = new Date()) {
  const rate = drawdown.interestRateOverride ?? (masterRate + (drawdown.marginApplied ? drawdown.marginRate : 0));
  const outstanding = drawdown.amount - (drawdown.subsidiaryRepaid || 0);
  const days = Math.max(0, daysBetween(drawdown.date, today.toISOString().split("T")[0]));
  const interest = (outstanding * rate / 100) * days / 365;
  return { outstanding, interest };
}

// Restores the missing export for generating the interest schedule
export function generateInterestSchedule(facility, today = new Date()) {
  const schedule = [];
  const start = new Date(facility.startDate);
  const maturity = new Date(facility.maturity);
  if (isNaN(start) || isNaN(maturity)) return [];

  const cycleMap = {
    "Daily": 1, "Monthly": 30, "Quarterly": 91, "Semi-Annual": 182, "Annual": 365, "At maturity": null, "Bullet": null,
  };
  const cycleDays = cycleMap[facility.intPayCycle] || 30; 
  const effectiveRate = (facility.boardRate || 0) + (facility.sofrRate || 0) + (facility.otherRate || 0);
  const ratePerDay = effectiveRate / 100 / 365;

  let moratoriumEnd = null;
  if (facility.moratoriumValue > 0 && facility.moratoriumUnit !== "None") {
    const moratoriumDays = facility.moratoriumValue * (facility.moratoriumUnit === "Days" ? 1 : facility.moratoriumUnit === "Months" ? 30 : 365);
    moratoriumEnd = new Date(start);
    moratoriumEnd.setDate(moratoriumEnd.getDate() + moratoriumDays);
  }

  let outstanding = facility.facilityAmount;
  let currentDate = new Date(start);

  while (currentDate < maturity && outstanding > 0) {
    let periodEnd;
    if (facility.intPayCycle === "At maturity" || facility.intPayCycle === "Bullet") {
      periodEnd = new Date(maturity);
    } else {
      periodEnd = new Date(currentDate);
      periodEnd.setDate(periodEnd.getDate() + cycleDays);
      if (periodEnd > maturity) periodEnd = new Date(maturity);
    }

    const daysInPeriod = Math.ceil((periodEnd - currentDate) / (1000 * 60 * 60 * 24));
    let interest = 0;

    if (moratoriumEnd && currentDate < moratoriumEnd) {
      if (periodEnd <= moratoriumEnd) {
        interest = 0;
      } else {
        const daysAfter = Math.ceil((periodEnd - moratoriumEnd) / (1000 * 60 * 60 * 24));
        interest = outstanding * ratePerDay * daysAfter;
      }
    } else {
      interest = outstanding * ratePerDay * daysInPeriod;
    }

    schedule.push({
      periodStart: currentDate.toISOString().split('T')[0],
      periodEnd: periodEnd.toISOString().split('T')[0],
      days: daysInPeriod, outstanding, interest,
    });
    currentDate = periodEnd;
  }
  return schedule;
}
// src/utils.js

export function exportToCSV(facilities) {
    // Define all keys used in your Facility Wizard
    const headers = [
        "facilityName", "bank", "facilityClass", "ccy", "facilityAmount",
        "facilityAmount2", "boardRate", "boardRate2", "mgmtFee", "commitFee",
        "intPayCycle", "repCycle", "status", "startDate", "maturity"
    ];

    // Create rows by mapping headers to facility object values
    const rows = facilities.map(f => headers.map(h => f[h] || ""));
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Debt_Portfolio_Full_Export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

export function parseCSV(text) {
    const lines = text.split("\n").filter(l => l.trim() !== "");
    if (lines.length < 2) return [];

    const headers = lines[0].split(",");

    return lines.slice(1).map(line => {
        const values = line.split(",");
        const obj = {
            id: 'F' + Date.now() + Math.random().toString(36).substr(2, 5),
            drawdowns: [],
            repayments: []
        };

        headers.forEach((header, i) => {
            let val = values[i]?.trim();
            // Convert numbers, but leave dates as strings
            if (!isNaN(val) && val !== "" && !header.toLowerCase().includes("date") && header !== "maturity") {
                obj[header] = parseFloat(val);
            } else {
                obj[header] = val;
            }
        });
        return obj;
    });
}
