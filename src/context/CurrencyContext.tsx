'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { getCountryByCode, CountryInfo, DEFAULT_USD_RATES } from '@/lib/countryConfig'
import { useTenant } from '@/lib/tenantContext'

export type DisplayCurrency = 'LOCAL' | 'USD'

interface CurrencyContextType {
  displayCurrency: DisplayCurrency
  setDisplayCurrency: (c: DisplayCurrency) => void
  toggleCurrency: () => void
  localCurrency: string
  countryCode: string
  countryInfo: CountryInfo
  usdExchangeRate: number
  formatPrice: (amount: number | string, options?: { forceUSD?: boolean }) => string
  getDualPrice: (amount: number | string) => {
    primary: string
    secondary: string | null
    isUSD: boolean
  }
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined)

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const { activeTenant } = useTenant()
  const [displayCurrency, setDisplayCurrencyState] = useState<DisplayCurrency>('LOCAL')
  const [countryCode, setCountryCode] = useState<string>('AR')
  const [countryInfo, setCountryInfo] = useState<CountryInfo>(getCountryByCode('AR'))
  const [usdExchangeRate, setUsdExchangeRate] = useState<number>(DEFAULT_USD_RATES.AR || 1200)

  // Local currency based on tenant or detected country
  const localCurrency = useMemo(() => {
    if (activeTenant?.moneda) return activeTenant.moneda
    return countryInfo.currency || 'ARS'
  }, [activeTenant?.moneda, countryInfo.currency])

  // GeoIP detection on client mount
  useEffect(() => {
    let saved: string | null = null
    try {
      saved = localStorage.getItem('omnisync_display_currency')
    } catch (e) {}

    fetch('/api/geo')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.country) {
          const visitorCountry = String(data.country).toUpperCase()
          const info = data.countryInfo || getCountryByCode(visitorCountry)
          const rate = Number(data.rateToUSD || DEFAULT_USD_RATES[visitorCountry] || 1.0)

          setCountryCode(visitorCountry)
          setCountryInfo(info)
          setUsdExchangeRate(rate)

          // Auto USD for Venezuela or if explicitly saved
          if (visitorCountry === 'VE') {
            setDisplayCurrencyState('USD')
          } else if (saved === 'USD' || saved === 'LOCAL') {
            setDisplayCurrencyState(saved as DisplayCurrency)
          } else {
            setDisplayCurrencyState('LOCAL')
          }
        }
      })
      .catch(() => {
        if (saved === 'USD' || saved === 'LOCAL') {
          setDisplayCurrencyState(saved as DisplayCurrency)
        }
      })
  }, [])

  const setDisplayCurrency = useCallback((c: DisplayCurrency) => {
    setDisplayCurrencyState(c)
    try {
      localStorage.setItem('omnisync_display_currency', c)
    } catch (e) {}
  }, [])

  const toggleCurrency = useCallback(() => {
    setDisplayCurrencyState(prev => {
      const next = prev === 'LOCAL' ? 'USD' : 'LOCAL'
      try {
        localStorage.setItem('omnisync_display_currency', next)
      } catch (e) {}
      return next
    })
  }, [])

  const formatPrice = useCallback((amount: number | string, options?: { forceUSD?: boolean }): string => {
    const num = typeof amount === 'string' ? parseFloat(amount) || 0 : amount || 0
    const isUSD = options?.forceUSD || displayCurrency === 'USD'

    if (isUSD) {
      // Si el monto original está en moneda local y se muestra en USD:
      const inUSD = localCurrency === 'USD' ? num : (usdExchangeRate > 0 ? num / usdExchangeRate : num)
      return `$${inUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`
    } else {
      // Moneda local
      const symbol = countryInfo.symbol || '$'
      return `${symbol}${num.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${localCurrency}`
    }
  }, [displayCurrency, localCurrency, usdExchangeRate, countryInfo.symbol])

  const getDualPrice = useCallback((amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) || 0 : amount || 0
    const isUSD = displayCurrency === 'USD'

    if (isUSD) {
      const inUSD = localCurrency === 'USD' ? num : (usdExchangeRate > 0 ? num / usdExchangeRate : num)
      return {
        primary: `$${inUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`,
        secondary: localCurrency !== 'USD' ? `${countryInfo.symbol}${num.toLocaleString('es-AR')} ${localCurrency}` : null,
        isUSD: true
      }
    } else {
      const inUSD = localCurrency === 'USD' ? num : (usdExchangeRate > 0 ? num / usdExchangeRate : num)
      return {
        primary: `${countryInfo.symbol}${num.toLocaleString('es-AR')} ${localCurrency}`,
        secondary: `$${inUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`,
        isUSD: false
      }
    }
  }, [displayCurrency, localCurrency, usdExchangeRate, countryInfo.symbol])

  return (
    <CurrencyContext.Provider
      value={{
        displayCurrency,
        setDisplayCurrency,
        toggleCurrency,
        localCurrency,
        countryCode,
        countryInfo,
        usdExchangeRate,
        formatPrice,
        getDualPrice
      }}
    >
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  const context = useContext(CurrencyContext)
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider')
  }
  return context
}
