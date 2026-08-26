import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';
import { COUNTRIES } from './countries';

export default function CountryCodePicker({ value, iso, onChange, disabled }) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const wrapperRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filtered = useMemo(() => {
        if (!search) return COUNTRIES;
        const q = search.toLowerCase();
        return COUNTRIES.filter(c =>
            c.name.toLowerCase().includes(q) ||
            c.iso.toLowerCase().includes(q) ||
            c.code.includes(q)
        );
    }, [search]);

    const selected = COUNTRIES.find(c => c.iso === iso) || COUNTRIES.find(c => c.code === value) || { flag: '🌐', code: value || '+91' };

    return (
        <div className="relative" ref={wrapperRef}>
            <button
                type="button"
                disabled={disabled}
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between w-full h-[38px] rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 min-w-[90px]"
            >
                <span className="flex items-center gap-1.5 truncate">
                    <span>{selected.flag}</span>
                    <span className="font-medium text-slate-600 truncate">{selected.code}</span>
                </span>
                <ChevronDown size={14} className="text-slate-400 shrink-0 ml-1" />
            </button>

            {isOpen && (
                <div className="absolute z-50 mt-1 w-[240px] max-w-[80vw] bg-white rounded-md shadow-lg border border-slate-200 overflow-hidden flex flex-col max-h-[300px]">
                    <div className="p-2 border-b border-slate-100 flex items-center gap-2 text-slate-700 bg-slate-50 sticky top-0">
                        <Search size={14} className="opacity-50" />
                        <input
                            autoFocus
                            type="text"
                            className="w-full text-xs bg-transparent border-none p-0 focus:ring-0 outline-none placeholder-slate-400"
                            placeholder="Search country or code..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="overflow-y-auto w-full">
                        {filtered.length === 0 ? (
                            <div className="p-3 text-xs text-slate-400 text-center">No results found</div>
                        ) : (
                            filtered.map((c, i) => (
                                <button
                                    key={`${c.iso}-${c.code}-${i}`}
                                    type="button"
                                    onClick={() => {
                                        onChange(c.code, c.name, c.iso);
                                        setIsOpen(false);
                                        setSearch('');
                                    }}
                                    className="flex items-center justify-start w-full px-3 py-2 text-left hover:bg-slate-50 border-b border-slate-50 last:border-0 transition-colors"
                                >
                                    <span className="w-5 shrink-0 text-left leading-none">{c.flag}</span>
                                    <span className="text-xs text-slate-600 w-12 shrink-0 font-medium leading-none">{c.code}</span>
                                    <span className="text-xs text-slate-800 truncate pr-2 leading-none flex-1 overflow-hidden" title={c.name}>{c.name}</span>
                                    {(iso ? iso === c.iso : value === c.code) && <Check size={14} className="text-teal-600 ml-auto shrink-0 leading-none" />}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
