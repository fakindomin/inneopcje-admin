"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IconSearch } from "./icons";

const EXAMPLE_MODELS = ["iPhone 17", "Galaxy S26", "Pixel 10 Pro", "OnePlus 15"];

export default function SearchBox({ defaultValue = "" }) {
  const [value, setValue] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [exampleIndex, setExampleIndex] = useState(0);
  const boxRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      setExampleIndex((i) => (i + 1) % EXAMPLE_MODELS.length);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (value.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/suggest?q=${encodeURIComponent(value)}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        setSuggestions(data);
        setOpen(data.length > 0);
      } catch (err) {
        if (err.name !== "AbortError") setSuggestions([]);
      }
    }, 200);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (boxRef.current && !boxRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={boxRef} className="relative">
      <input
        type="text"
        name="q"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onKeyDown={(event) => event.key === "Escape" && setOpen(false)}
        placeholder={`Wpisz nazwę produktu, np. ${EXAMPLE_MODELS[exampleIndex]}`}
        autoComplete="off"
        autoFocus
        className="w-full bg-white border border-brand-ink rounded-full py-2.5 pl-4 pr-11 text-sm focus:outline-none relative z-10"
      />
      <button
        type="submit"
        aria-label="Szukaj"
        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-ink z-20"
      >
        <IconSearch />
      </button>
      {open && (
        <ul className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-brand-ink rounded-xl overflow-hidden z-20">
          {suggestions.map((s) => (
            <li key={s.slug}>
              <button
                type="button"
                onClick={() => router.push(`/telefon/${s.slug}`)}
                className="w-full text-left px-4 py-2 text-sm text-brand-ink hover:bg-brand-cream"
              >
                {s.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
