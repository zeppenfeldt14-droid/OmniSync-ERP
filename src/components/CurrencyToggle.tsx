'use client'

import React from 'react'
import { useCurrency } from '@/context/CurrencyContext'
import { DollarSign, Globe } from 'lucide-react'

export default function CurrencyToggle() {
  const { displayCurrency, toggleCurrency, localCurrency, countryInfo } = useCurrency()

  const isUSDActive = displayCurrency === 'USD' || localCurrency === 'USD'

  return (
    <button
      onClick={toggleCurrency}
      title={localCurrency === 'USD' ? "Moneda base: Dólares (USD)" : "Alternar entre Moneda Local y Dólares (USD)"}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all duration-150 cursor-pointer bg-slate-900/80 hover:bg-slate-800 border-slate-700 text-slate-200 shadow-sm"
    >
      {isUSDActive ? (
        <>
          <span className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400">
            <DollarSign size={11} strokeWidth={3} />
          </span>
          <span className="text-emerald-400 font-extrabold tracking-wide">USD</span>
        </>
      ) : (
        <>
          {countryInfo?.flagUrl ? (
            <img 
              src={countryInfo.flagUrl} 
              alt={countryInfo.name || 'Bandera'} 
              className="w-4 h-3 object-cover rounded-xs"
            />
          ) : (
            <Globe size={13} className="text-blue-400" />
          )}
          <span className="text-blue-300 font-extrabold tracking-wide">{localCurrency}</span>
        </>
      )}
      <span className="text-[10px] text-slate-400 uppercase ml-0.5">
        {isUSDActive ? 'USD' : 'Local'}
      </span>
    </button>
  )
}

