// Shared artwork copied from visuals.js; checked by test-honmen.mjs.
// Previously verified diagram and source assets. No generated traffic diagrams.
const ICONS={road:'M5 3L3 21M19 3l2 18M12 3v4m0 4v3m0 4v3',play:'M8 5l11 7-11 7Z',book:'M12 5c-3-2-7-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-2-1-6-1-9 1Zm0 0v15',check:'M5 12l4 4L19 6',arrow:'M4 12h15m-6-6 6 6-6 6',back:'M20 12H5m6-6-6 6 6 6',clock:'M12 7v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',repeat:'M4 9a8 8 0 0 1 14-3l2 3M20 3v6h-6M20 15A8 8 0 0 1 6 18l-2-3m0 6v-6h6',search:'M21 21l-6-6M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0',settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M9 3l-1 3-3 1-2 3 2 2v3l3 3 1 3h6l1-3 3-1 2-3-2-2V9l-3-3-1-3Z',flag:'M5 21V4c6-4 8 4 14 0v10c-6 4-8-4-14 0',info:'M12 11v6m0-11v1M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',park:'M6 21V3h7a6 6 0 0 1 0 12H6',turn:'M5 21V11a4 4 0 0 1 4-4h11m-5-5 5 5-5 5',sign:'M12 2l10 10-10 10L2 12ZM12 7v6m0 3v1',signal:'M7 2h10v20H7Zm5 3v2m0 4v2m0 4v2',person:'M12 9v7m-6-4 6-3 6 3m-6 4-5 6m5-6 5 6M15 4a3 3 0 1 1-6 0 3 3 0 0 1 6 0',speed:'M3 19a10 10 0 1 1 18 0M12 13l5-5M5 16h2m10 0h2M12 4v2'};
Object.assign(ICONS,{chevron:'M9 6l6 6-6 6',passing:'M7 21V3m-4 4 4-4 4 4M17 3v18m-4-4 4 4 4-4',gear:'M7 3v18M7 7h10V3m0 4v10M7 13h10',license:'M3 4h18v16H3ZM8 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4M5 17c0-4 6-4 6 0m3-8h4m-4 4h4',crossing:'M5 3l14 12M19 3 5 15M12 11v11M4 18h16'});
// UI symbols share a 24px grid and rounded 1.7px strokes. These are navigation
// artwork; the verified traffic signs and question diagrams below are separate.
Object.assign(ICONS,{
 signal:'M5.5 5h13a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3h-13a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3ZM6.5 10h.01M12 10h.01M17.5 10h.01M12 15v6M7 21h10',
 junction:'M8 3v5H3m18 0h-5V3M3 16h5v5m8 0v-5h5M12 3v2m0 14v2M3 12h2m14 0h2',
 carStart:'M3 16v-5l3-1 2-4h6l4 4h2a1 1 0 0 1 1 1v5h-1M8 16h7M6 10h12M8 16.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0M20 16.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0M9 2.5h11m-2-1.5 2 1.5-2 1.5',
 person:'M15 3.5a2 2 0 1 1-4 0 2 2 0 0 1 4 0M13 7l-1 6-2 2-3 6M12 13l4 4v4M6 12l3-5h4l3 5h4',
 exam:'M8 4H5a1 1 0 0 0-1 1v15a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1h-3M9.5 2h5A1.5 1.5 0 0 1 16 3.5v1A1.5 1.5 0 0 1 14.5 6h-5A1.5 1.5 0 0 1 8 4.5v-1A1.5 1.5 0 0 1 9.5 2ZM8 11l2.5 2.5L16 8M8 17h8',
 review:'M10 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v4M7 7h6M7 11h4M21 12v4a3 3 0 0 1-3 3h-5m3-3-3 3 3 3'
});
function icon(k){const key=Object.hasOwn(ICONS,k)?k:'book';return `<svg class="icon" data-icon="${key}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${ICONS[key]}"/></svg>`}
function flowerStamp(label = '合格'){
 const points=Array.from({length:145},(_,i)=>{const t=i/144*Math.PI*2,r=44+4*Math.cos(12*t);return (60+Math.cos(t)*r).toFixed(2)+','+(60+Math.sin(t)*r).toFixed(2)}).join(' ');
 return `<svg class="flower-stamp" viewBox="0 0 120 120" aria-hidden="true"><polygon points="${points}"/><circle cx="60" cy="60" r="33"/><text x="60" y="67" text-anchor="middle">${label === '満点' ? '満点' : '合格'}</text><path d="M44 82q16 8 32-1"/></svg>`;
}
