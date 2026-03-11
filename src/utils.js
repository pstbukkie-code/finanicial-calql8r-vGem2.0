// --- Helper Functions ---
export const fmtN = (n, ccy = "") => {
  if (Math.abs(n) >= 1e9) return `${ccy}${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `${ccy}${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `${ccy}${(n / 1e3).toFixed(1)}K`;
  return `${ccy}${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
};

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

export const fmtFull = (n, ccy = "") =>
  `${ccy}${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

export const fmtPct = (n) => `${n.toFixed(2)}%`;

export const daysBetween = (d1, d2) =>
  Math.ceil((new Date(d2) - new Date(d1)) / (1000 * 60 * 60 * 24));

export function calcStats(f, currencies, today = new Date()) {
  const fxRate = currencies.find((c) => c.code === f.ccy)?.rate || 1;
  const todayStr = today.toISOString().split("T")[0]; 
  const basis = f.interestBasis || "Daily/Simple";

  const computeStats = (drawdowns, baseRate, interestBasis) => {
    const drawn = drawdowns.reduce((s, d) => s + d.amount, 0);
    const repaid = drawdowns.reduce((s, d) => s + d.repaid, 0);
    const outstanding = drawn - repaid;
    const interest = drawdowns.reduce((s, d) => {
      let rate = d.interestRateOverride ?? baseRate;
      if (d.marginApplied) rate += d.marginRate;
      const r = rate / 100; 
      const days = Math.max(0, daysBetween(d.date, todayStr));
      const p = Math.max(0, d.amount - d.repaid); 

      let calculatedInterest = 0;
      if (interestBasis === "Daily/Compound") {
        const amountWithInterest = p * Math.pow(1 + r / 365, days);
        calculatedInterest = amountWithInterest - p;
      } else if (interestBasis === "Monthly/Compound") {
        const periods = 12 * (days / 365);
        const amountWithInterest = p * Math.pow(1 + r / 12, periods);
        calculatedInterest = amountWithInterest - p;
      } else {
        calculatedInterest = p * r * (days / 365);
      }
      return s + calculatedInterest;
    }, 0);
    return { drawn, repaid, outstanding, interest };
  };

  const primaryDrawdowns = f.drawdowns.filter((d) => d.subFacility !== "secondary");
  const secondaryDrawdowns = f.drawdowns.filter((d) => d.subFacility === "secondary");
  const primaryStats = computeStats(primaryDrawdowns, f.boardRate, basis);
  const secondaryStats = f.facilityClass === "Overdraft/Short Term"
      ? computeStats(secondaryDrawdowns, f.boardRate2 || f.boardRate, basis)
      : { drawn: 0, repaid: 0, outstanding: 0, interest: 0 };

  const totalDrawn = primaryStats.drawn + secondaryStats.drawn;
  const totalRepaid = primaryStats.repaid + secondaryStats.repaid;
  const totalOutstanding = totalDrawn - totalRepaid; 
  const totalLoanAmount = (parseFloat(f.facilityAmount) || 0) + (parseFloat(f.facilityAmount2) || 0);
  const available = Math.max(0, totalLoanAmount - totalDrawn);
  const utilPct = totalLoanAmount > 0 ? (totalDrawn / totalLoanAmount) * 100 : 0;
  const totalInterest = primaryStats.interest + secondaryStats.interest;
  const daysToMat = f.maturity ? daysBetween(todayStr, f.maturity) : null;
  const limitNGN = f.ccy === "USD" ? f.limitF * fxRate : f.limitF;
  const outstandingNGN = f.ccy === "USD" ? totalOutstanding * fxRate : totalOutstanding;
  
  const mgmtFeeAmount = f.limitF * (f.mgmtFee / 100);
  const commitFeeAmount = f.limitF * (f.commitFee / 100);
  const mgmtFeeNGN = f.ccy === "USD" ? mgmtFeeAmount * fxRate : mgmtFeeAmount;
  const commitFeeNGN = f.ccy === "USD" ? commitFeeAmount * fxRate : commitFeeAmount;
  const totalFeesNGN = mgmtFeeNGN + commitFeeNGN;

  return {
    drawn: totalDrawn, repaid: totalRepaid, outstanding: totalOutstanding, available, utilPct,
    interest: totalInterest, daysToMat, limitNGN, outstandingNGN, mgmtFeePct: f.mgmtFee,
    commitFeePct: f.commitFee, mgmtFeeAmount, commitFeeAmount, totalFees: mgmtFeeAmount + commitFeeAmount,
    mgmtFeeNGN, commitFeeNGN, totalFeesNGN, primaryStats, secondaryStats,
  };
}

export function calcDrawdownSubsidiaryStats(drawdown, masterRate, today = new Date()) {
  const rate = drawdown.interestRateOverride ?? (masterRate + (drawdown.marginApplied ? drawdown.marginRate : 0));
  const outstanding = drawdown.amount - (drawdown.subsidiaryRepaid || 0);
  const days = Math.max(0, daysBetween(drawdown.date, today.toISOString().split("T")[0]));
  const interest = (outstanding * rate / 100) * days / 365;
  return { outstanding, interest };
}

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
export function exportToCSV(facilities) {
  // 1. Define headers
  const headers = ["Facility Name", "Bank", "Currency", "Limit", "Outstanding", "Status", "Maturity"];
  
  // 2. Map data to rows
  const rows = facilities.map(f => {
    const stats = calcStats(f, [{ code: "NGN", rate: 1 }, { code: "USD", rate: 1580 }]); // Simplified FX for export
    return [
      f.facilityName,
      f.bank,
      f.ccy,
      f.limitF,
      stats.outstanding,
      f.status,
      f.maturity
    ];
  });

  // 3. Combine into a string
  const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");

  // 4. Create a hidden link and "click" it to download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `Debt_Portfolio_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}