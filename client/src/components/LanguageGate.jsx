import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { toEnglish } from '../i18n/translate';

// Language switcher: English or Hinglish.
// The pages are written in Hinglish. When English is chosen, the visible text is swapped
// using the dictionary in i18n/translate.js, so no page file needs to be changed.

const STORAGE_KEY = 'appLanguage';
const AUTH_PATHS = ['/login', '/register', '/forgot-password', '/admin/login'];
const ATTRS = ['placeholder', 'title', 'aria-label'];

function readLang() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'en' || v === 'hi' ? v : null;
  } catch {
    return null;
  }
}

function saveLang(value) {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // storage is blocked, the choice just will not be remembered
  }
}

// What each text node / attribute looked like before translation, so Hinglish can be restored
const originalText = new WeakMap();
const originalAttr = new WeakMap();

const isSkipped = (node) => {
  const el = node.nodeType === 1 ? node : node.parentNode;
  if (!el || !el.closest) return false;
  const tag = el.nodeName;
  return tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA' || !!el.closest('[data-no-translate]');
};

function translateNode(node) {
  if (isSkipped(node)) return;
  const current = node.nodeValue;
  const rec = originalText.get(node);
  if (rec && rec.shown === current) return; // already translated by us
  const out = toEnglish(current);
  if (out !== current) {
    originalText.set(node, { original: current, shown: out });
    node.nodeValue = out;
  } else if (rec) {
    originalText.delete(node);
  }
}

function restoreNode(node) {
  const rec = originalText.get(node);
  if (rec && node.nodeValue === rec.shown) node.nodeValue = rec.original;
  originalText.delete(node);
}

function translateAttrs(el) {
  if (isSkipped(el)) return;
  ATTRS.forEach((attr) => {
    if (!el.hasAttribute(attr)) return;
    const current = el.getAttribute(attr);
    const map = originalAttr.get(el) || {};
    const rec = map[attr];
    if (rec && rec.shown === current) return;
    const out = toEnglish(current);
    if (out !== current) {
      map[attr] = { original: current, shown: out };
      originalAttr.set(el, map);
      el.setAttribute(attr, out);
    } else if (rec) {
      delete map[attr];
    }
  });
}

function restoreAttrs(el) {
  const map = originalAttr.get(el);
  if (!map) return;
  ATTRS.forEach((attr) => {
    const rec = map[attr];
    if (rec && el.getAttribute(attr) === rec.shown) el.setAttribute(attr, rec.original);
  });
  originalAttr.delete(el);
}

function forEachText(root, fn) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  let n = walker.nextNode();
  while (n) {
    nodes.push(n);
    n = walker.nextNode();
  }
  nodes.forEach(fn);
}

function forEachAttrElement(root, fn) {
  if (root.nodeType !== 1) return;
  if (ATTRS.some((a) => root.hasAttribute(a))) fn(root);
  root.querySelectorAll('[placeholder],[title],[aria-label]').forEach(fn);
}

function translateTree(root) {
  if (root.nodeType === 3) {
    translateNode(root);
    return;
  }
  if (root.nodeType !== 1) return;
  forEachText(root, translateNode);
  forEachAttrElement(root, translateAttrs);
}

function restoreTree(root) {
  forEachText(root, restoreNode);
  forEachAttrElement(root, restoreAttrs);
}

export default function LanguageGate({ children }) {
  const [lang, setLang] = useState(readLang);
  const { pathname } = useLocation();

  const choose = (value) => {
    saveLang(value);
    setLang(value);
  };

  // English: translate everything on screen, and keep translating whatever React changes later
  useEffect(() => {
    if (lang !== 'en') return undefined;
    translateTree(document.body);
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((m) => {
        if (m.type === 'characterData') translateNode(m.target);
        else if (m.type === 'attributes') translateAttrs(m.target);
        else m.addedNodes.forEach((added) => translateTree(added));
      });
    });
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ATTRS,
    });
    return () => {
      observer.disconnect();
      restoreTree(document.body);
    };
  }, [lang]);

  // Pop-up boxes (confirm / alert) are not part of the page, so translate them separately
  useEffect(() => {
    if (lang !== 'en') return undefined;
    const originalConfirm = window.confirm;
    const originalAlert = window.alert;
    window.confirm = (msg) => originalConfirm.call(window, toEnglish(String(msg)));
    window.alert = (msg) => originalAlert.call(window, toEnglish(String(msg)));
    return () => {
      window.confirm = originalConfirm;
      window.alert = originalAlert;
    };
  }, [lang]);

  useEffect(() => {
    document.documentElement.lang = lang === 'en' ? 'en' : 'hi-Latn';
  }, [lang]);

  // First visit: ask which language to use before anything else
  if (!lang) {
    return (
      <div
        data-no-translate="true"
        className="min-h-screen bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-700 flex flex-col items-center justify-center px-4 py-8 text-white"
      >
        <div className="mx-auto mb-3 h-16 w-16 rounded-2xl bg-white/15 flex items-center justify-center ring-1 ring-white/30">
          <svg
            viewBox="0 0 24 24"
            className="h-9 w-9 text-white"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <path d="M14 14h3v3h-3zM20 14v.01M14 20h3M20 17v4" />
          </svg>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-center">Smart Attendance</h1>
        <p className="mt-6 text-lg font-semibold">Choose your language</p>
        <p className="text-sm text-white/80">Apni bhasha chuno</p>

        <div className="mt-5 w-full max-w-xs space-y-3">
          <button
            onClick={() => choose('en')}
            className="w-full rounded-2xl bg-white text-indigo-700 py-4 shadow-xl hover:bg-indigo-50"
          >
            <span className="block text-xl font-bold">English</span>
            <span className="block text-xs text-slate-500">Everything in English</span>
          </button>
          <button
            onClick={() => choose('hi')}
            className="w-full rounded-2xl bg-white text-indigo-700 py-4 shadow-xl hover:bg-indigo-50"
          >
            <span className="block text-xl font-bold">Hinglish</span>
            <span className="block text-xs text-slate-500">Hindi + English mix</span>
          </button>
        </div>
        <p className="mt-6 text-xs text-white/60">You can change this later from the top corner</p>
      </div>
    );
  }

  const onAuthPage = AUTH_PATHS.indexOf(pathname) !== -1;
  const pill = (value) =>
    'rounded-full px-3 py-1 ' +
    (lang === value ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100');

  return (
    <>
      {children}
      <div
        data-no-translate="true"
        className={'fixed z-50 ' + (onAuthPage ? 'top-3 right-3' : 'bottom-3 left-3')}
      >
        <div className="flex rounded-full bg-white/95 shadow-lg ring-1 ring-slate-200 p-0.5 text-xs font-semibold">
          <button onClick={() => choose('en')} className={pill('en')}>
            English
          </button>
          <button onClick={() => choose('hi')} className={pill('hi')}>
            Hinglish
          </button>
        </div>
      </div>
    </>
  );
}
