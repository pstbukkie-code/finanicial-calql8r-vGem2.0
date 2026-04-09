import { useState, useEffect, useCallback } from 'react'

/**
 * Replaces the four localStorage useState+useEffect pairs in App.jsx.
 * All reads/writes go through window.api (Electron IPC → SQLite).
 */
export function usePortfolio() {
  const [facilities, setFacilities] = useState<unknown[]>([])
  const [savedBanks, setSavedBanks] = useState<string[]>([])
  const [savedSubsidiaries, setSavedSubsidiaries] = useState<string[]>([])
  const [currencies, setCurrencies] = useState<{ code: string; rate: number }[]>([])
  const [isReady, setIsReady] = useState(false)

  // Load all data from SQLite on mount
  useEffect(() => {
    Promise.all([
      window.api.facilities.getAll(),
      window.api.config.getBanks(),
      window.api.config.getSubsidiaries(),
      window.api.config.getCurrencies(),
    ])
      .then(([facs, banks, subs, ccys]) => {
        setFacilities(facs)
        setSavedBanks(banks)
        setSavedSubsidiaries(subs)
        setCurrencies(ccys)
      })
      .catch((err) => console.error('[usePortfolio] load error:', err))
      .finally(() => setIsReady(true))
  }, [])

  // ── Facility mutations ───────────────────────────────────────────────────

  const addFac = useCallback(async (fac: Record<string, unknown>) => {
    const nextNumber = facilities.length + 1
    const newFac = {
      ...fac,
      id: 'F' + Date.now(),
      loanNumber: `LN-${String(nextNumber).padStart(3, '0')}`,
      drawdowns: [],
      repayments: [],
    }
    const saved = await window.api.facilities.create(newFac)
    setFacilities((prev) => [...prev, saved])
  }, [facilities.length])

  const editFac = useCallback(async (update: Record<string, unknown>) => {
    const saved = await window.api.facilities.update(update)
    setFacilities((prev) =>
      prev.map((f) => ((f as Record<string, unknown>).id === update.id ? saved : f))
    )
  }, [])

  const delFac = useCallback(async (id: string) => {
    await window.api.facilities.delete(id)
    setFacilities((prev) => prev.filter((f) => (f as Record<string, unknown>).id !== id))
  }, [])

  const addDD = useCallback(async (facilityId: string, drawdown: unknown) => {
    const updated = await window.api.facilities.addDrawdown(facilityId, drawdown)
    setFacilities((prev) =>
      prev.map((f) => ((f as Record<string, unknown>).id === facilityId ? updated : f))
    )
  }, [])

  const addRepay = useCallback(
    async (
      fid: string,
      amt: number,
      date: string,
      type: string,
      drawdownUpdates: { id: string; repaid: number }[]
    ) => {
      const newRepayment = { id: 'R' + Date.now(), date, amount: amt, type }
      const updated = await window.api.facilities.addRepayment(fid, newRepayment, drawdownUpdates)
      setFacilities((prev) =>
        prev.map((f) => ((f as Record<string, unknown>).id === fid ? updated : f))
      )
    },
    []
  )

  const renewFac = useCallback(async (oldId: string, renewalData: unknown) => {
    await window.api.facilities.renewFacility(oldId, renewalData)
    // Refresh full list so both old (Renewed) and new facilities are correct
    const updated = await window.api.facilities.getAll()
    setFacilities(updated)
  }, [])

  const handleSubsidiaryRepay = useCallback(
    async (facilityId: string, drawdownId: string, amount: number) => {
      const updated = await window.api.facilities.subsidiaryRepay(facilityId, drawdownId, amount)
      setFacilities((prev) =>
        prev.map((f) => ((f as Record<string, unknown>).id === facilityId ? updated : f))
      )
    },
    []
  )

  const handleImport = useCallback(async (rows: Record<string, unknown>[]) => {
    const newFacs = rows.map((row) => ({
      id: 'F' + Date.now() + Math.random(),
      bank: row.Bank,
      facilityName: row.FacilityName,
      ccy: row.Currency || 'NGN',
      limitF: parseFloat(String(row.Limit)) || 0,
      facilityAmount: parseFloat(String(row.Amount)) || 0,
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
      boardRate: parseFloat(String(row.Rate)) || 0,
      mgmtFee: 0,
      commitFee: 0,
      defaultInt: 0,
      moratoriumValue: 0,
      moratoriumUnit: 'None',
      collateral: '',
      remarks: '',
      facilityClass: 'Term Loan',
      confirmed: 'Pending',
      confirmDate: '',
      status: 'Active',
      interestRateType: 'Fixed',
      pricingFormula: '',
      interestBasis: 'Daily/Simple',
      drawdowns: [],
      repayments: [],
    }))
    const saved = await Promise.all(newFacs.map((f) => window.api.facilities.create(f)))
    setFacilities((prev) => [...prev, ...saved])
  }, [])

  // ── Config mutations ─────────────────────────────────────────────────────

  const addBank = useCallback(async (name: string) => {
    const updated = await window.api.config.addBank(name)
    setSavedBanks(updated)
  }, [])

  const addSubsidiary = useCallback(async (name: string) => {
    const updated = await window.api.config.addSubsidiary(name)
    setSavedSubsidiaries(updated)
  }, [])

  // Full-replace setters for modal managers that replace the whole list
  const setBanksFromModal = useCallback(async (banks: string[]) => {
    // Sync: get current, add new entries
    const current = await window.api.config.getBanks()
    const toAdd = banks.filter((b) => !current.includes(b))
    const toRemove = current.filter((b) => !banks.includes(b))
    for (const b of toAdd) await window.api.config.addBank(b)
    for (const b of toRemove) await window.api.config.removeBank(b)
    setSavedBanks(banks)
  }, [])

  const setSubsidiariesFromModal = useCallback(async (subs: string[]) => {
    const current = await window.api.config.getSubsidiaries()
    const toAdd = subs.filter((s) => !current.includes(s))
    const toRemove = current.filter((s) => !subs.includes(s))
    for (const s of toAdd) await window.api.config.addSubsidiary(s)
    for (const s of toRemove) await window.api.config.removeSubsidiary(s)
    setSavedSubsidiaries(subs)
  }, [])

  const updateCurrencies = useCallback(async (ccys: { code: string; rate: number }[]) => {
    await window.api.config.setCurrencies(ccys)
    setCurrencies(ccys)
  }, [])

  return {
    // State
    facilities,
    setFacilities,
    savedBanks,
    savedSubsidiaries,
    currencies,
    setCurrencies: updateCurrencies,
    isReady,
    // Facility mutations
    addFac,
    editFac,
    delFac,
    addDD,
    addRepay,
    renewFac,
    handleSubsidiaryRepay,
    handleImport,
    // Config mutations
    addBank,
    addSubsidiary,
    setSavedBanks: setBanksFromModal,
    setSavedSubsidiaries: setSubsidiariesFromModal,
  }
}
