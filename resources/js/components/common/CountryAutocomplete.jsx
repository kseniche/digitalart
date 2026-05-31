import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiFetchLocal as apiFetch } from '../../api';

function CountryAutocomplete({
  value,
  countryId,
  onChange,
  disabled = false,
  inputClassName = 'form-input',
}) {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  const fetchCountries = useCallback(async (q) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) {
        params.set('q', q);
      }
      const response = await apiFetch(`/api/countries?${params}`);
      if (response.ok) {
        const data = await response.json();
        setSuggestions(Array.isArray(data) ? data : data.data || []);
      } else {
        setSuggestions([]);
      }
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      fetchCountries(query.trim());
    }, 250);

    return () => clearTimeout(debounceRef.current);
  }, [query, open, fetchCountries]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectCountry = (country) => {
    setQuery(country.name_ru);
    onChange({ countryId: country.id, countryName: country.name_ru });
    setOpen(false);
  };

  const handleInputChange = (e) => {
    const next = e.target.value;
    setQuery(next);
    onChange({ countryId: null, countryName: next });
    setOpen(true);
  };

  const handleFocus = () => {
    setOpen(true);
    if (suggestions.length === 0) {
      fetchCountries(query.trim());
    }
  };

  return (
    <div className="country-autocomplete" ref={wrapRef}>
      <input
        type="text"
        className={inputClassName}
        value={query}
        onChange={handleInputChange}
        onFocus={handleFocus}
        disabled={disabled}
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={open}
        placeholder="Начните вводить название страны"
      />
      {countryId && (
        <input type="hidden" name="country_id" value={countryId} />
      )}
      {open && (suggestions.length > 0 || loading) && (
        <ul className="country-autocomplete__list" role="listbox">
          {loading && suggestions.length === 0 && (
            <li className="country-autocomplete__item country-autocomplete__item--muted">Загрузка…</li>
          )}
          {suggestions.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className="country-autocomplete__item"
                role="option"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectCountry(c)}
              >
                {c.name_ru}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default CountryAutocomplete;
