/* Automatic, origin-local recovery. The public storage key stays stable across releases. */
const KarimenStorage = (() => {
  const KEY = 'karimen-study-v4', LATEST = KEY + '-backup', PREVIOUS = KEY + '-previous';
  const DATABASE = 'karimen-progress-backups';
  const parse = text => { try { return JSON.parse(text); } catch { return null; } };
  // Detect accidental corruption, not an authentication or encryption mechanism.
  function hash(text) {
    if (text === null) return 'missing';
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
    return text.length + ':' + (h >>> 0).toString(16);
  }
  function connect(factory) {
    if (!factory) return Promise.resolve(null);
    return new Promise((resolve, reject) => {
      let done = false;
      const request = factory.open(DATABASE, 1);
      const timer = setTimeout(() => fail(new Error('保存記録の確認に時間がかかっています。再読み込みしてください。')), 5000);
      function fail(error) { if (!done) { done = true; clearTimeout(timer); reject(error); } }
      request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains('records')) request.result.createObjectStore('records'); };
      request.onerror = () => fail(request.error);
      request.onblocked = () => fail(new Error('別の画面で保存記録を使用しています。その画面を閉じて再読み込みしてください。'));
      request.onsuccess = () => {
        if (done) { request.result.close(); return; }
        done = true; clearTimeout(timer); resolve(request.result);
      };
    });
  }
  function transaction(db, mode, action) {
    return new Promise((resolve, reject) => {
      let result;
      const tx = db.transaction('records', mode), records = tx.objectStore('records');
      tx.oncomplete = () => resolve(result);
      tx.onabort = tx.onerror = () => reject(tx.error || new Error('保存処理を完了できませんでした。'));
      action(records, value => { result = value; });
    });
  }
  async function open({ storage, indexedDB, validate, build, now = Date.now, onChange = () => {} }) {
    const good = raw => { if (typeof raw !== 'string') return false; try { validate(JSON.parse(raw)); return true; } catch { return false; } };
    const snapshotGood = s => s?.v === 1 && Number.isSafeInteger(s.seq) && s.seq >= 0 && s.hash === hash(s.raw) && good(s.raw);
    const unsupported = raw => { const data = parse(raw); return data && Number.isInteger(data.version) && data.version > 4 && !good(raw); };
    let primary;
    try { primary = storage.getItem(KEY); }
    catch { throw new Error('このブラウザで保存記録にアクセスできません。記録は上書きしていません。'); }
    if (unsupported(primary)) throw new Error('この記録には新しい版が必要です。ページを再読み込みしてください。元の記録は保護しています。');
    let db, dbError = null;
    try { db = await connect(indexedDB); } catch (error) { dbError = error; }
    let stored = [], databaseHead = null;
    if (db) {
      try {
        const loaded = await transaction(db, 'readonly', (s, result) => {
          const out = {}; result(out);
          const all = s.getAll(); all.onsuccess = () => { out.copies = all.result; };
          const head = s.get('latest'); head.onsuccess = () => { out.head = head.result; };
        });
        stored = loaded.copies; databaseHead = loaded.head;
      }
      catch (error) { dbError = error; db.close(); db = null; }
    }
    if (!db && dbError && !good(primary)) throw new Error('保存記録を確認できませんでした。元の記録を守るため開始を止めています。再読み込みしてください。');
    const localCopies = [LATEST, PREVIOUS].map(key => { try { return parse(storage.getItem(key)); } catch { return null; } });
    const copies = [...localCopies, ...stored];
    if (copies.some(s => s?.v > 1 || (s?.raw && unsupported(s.raw)))) {
      db?.close(); throw new Error('新しい版の保存記録が見つかりました。ページを再読み込みしてください。記録は上書きしていません。');
    }
    const valid = copies.filter(snapshotGood).sort((a, b) => b.seq - a.seq);
    let sequence = valid[0]?.seq || 0;
    const primarySequence = valid.find(s => s.raw === primary)?.seq ?? -1;
    const recover = good(primary)
      ? valid.find(s => s.seq > primarySequence && s.fallback && s.baseHash === hash(primary) && s.raw !== primary)
      : valid[0];
    if (primary !== null && !good(primary) && !recover) {
      db?.close(); throw new Error('保存記録を読み込めませんでした。復旧用の記録が見つからないため、元のデータを保護して停止しています。');
    }
    // Recheck after the asynchronous read: another tab may have answered in the meantime.
    if (storage.getItem(KEY) !== primary) { db?.close(); throw new Error('別の画面で学習記録が更新されました。再読み込みして続けてください。'); }
    if (recover && primary !== null && !good(primary)) {
      // Keep the unreadable original outside the recovery candidates.
      if (db) await transaction(db, 'readwrite', s => s.put({ corruptRaw: primary, at: now() }, 'unreadable'));
      else storage.setItem(KEY + '-unreadable', primary);
    }
    let cache = recover?.raw ?? primary, observedPrimary = primary, queue = Promise.resolve();
    let latest = valid[0] || null, current = null, primarySaved = good(cache) && !recover, backupSaved = false;
    let failure = '', pending = 0, closed = false, conflict = false;
    const status = () => ({ primarySaved, backupSaved, pending: pending > 0, recovered: Boolean(recover),
      message: failure, persistent: persistence === true });
    let persistence = false;
    const notify = () => { try { onChange(status()); } catch {} };
    if (db) db.onversionchange = () => { db.close(); db = null; backupSaved = false; notify(); };

    function remember(snapshot) {
      // Quota pressure on optional copies must never prevent a primary save.
      try {
        const old = parse(storage.getItem(LATEST));
        if (snapshotGood(old) && old.raw !== snapshot.raw) storage.setItem(PREVIOUS, JSON.stringify(old));
        storage.setItem(LATEST, JSON.stringify(snapshot));
        return true;
      } catch { return false; }
    }
    function enqueue(snapshot) {
      if (!db || closed) return;
      pending++; notify();
      queue = queue.catch(() => {}).then(async () => {
        if (cache !== snapshot.raw || closed || conflict) return;
        const committed = await transaction(db, 'readwrite', (records, result) => {
          const request = records.get('latest');
          request.onsuccess = () => {
            try {
            // Do not publish queued stale work after a newer tab has saved.
            const actual = storage.getItem(KEY);
            if (actual !== observedPrimary || cache !== snapshot.raw) return;
            const old = request.result;
            // A quota failure can leave the primary behind the database. Check
            // the database head even if primary writes have since recovered.
            if (old?.hash !== databaseHead?.hash && old?.hash !== snapshot.baseHash) {
              conflict = true; failure = '別の画面で学習記録が更新されました。再読み込みして続けてください。';
              if (snapshotGood(old)) {
                const protectedCopy = { ...old, seq: Math.max(old.seq, snapshot.seq, sequence) + 1, fallback: true, baseHash: hash(actual) };
                records.put({ uncommittedRaw: snapshot.raw, at: now() }, 'conflicting');
                records.put(protectedCopy, 'latest');
                // Keep the newer committed record authoritative on the next
                // startup, even when the primary cannot be repaired immediately.
                try { if (storage.getItem(KEY) === snapshot.raw) storage.setItem(KEY, old.raw); } catch {}
                remember(protectedCopy);
              }
              return;
            }
            snapshot.seq = Math.max(snapshot.seq, (old?.seq || 0) + 1); sequence = Math.max(sequence, snapshot.seq);
            if (snapshotGood(old) && old.raw !== snapshot.raw) records.put(old, 'previous');
            records.put(snapshot, 'latest');
            result(true);
            } catch { records.transaction.abort(); }
          };
        });
        if (committed) databaseHead = snapshot;
        if (committed && current === snapshot && storage.getItem(KEY) === observedPrimary) {
          remember(snapshot);
          backupSaved = true; failure = '';
        }
      }).catch(() => {
        if (current === snapshot && !primarySaved) failure = '学習記録の保存が完了していません。この画面を開いたままお待ちください。自動で再試行します。';
      }).finally(() => { pending--; notify(); });
    }
    function write(raw) {
      if (!good(raw)) throw new Error('不正な保存データへの上書きを止めました。');
      if (conflict || storage.getItem(KEY) !== observedPrimary) throw new Error('別の画面で記録が更新されました。');
      const snapshot = { v: 1, seq: ++sequence, at: now(), build, raw, hash: hash(raw), baseHash: hash(observedPrimary), fallback: false };
      primarySaved = false; backupSaved = false; failure = '';
      try {
        storage.setItem(KEY, raw);
        if (storage.getItem(KEY) !== raw) throw new Error('保存確認に失敗しました。');
        observedPrimary = raw; primarySaved = true;
      } catch (error) {
        // Free only our redundant local copy, never progress or migration records.
        try {
          storage.removeItem?.(PREVIOUS);
          storage.setItem(KEY, raw);
          if (storage.getItem(KEY) !== raw) throw error;
          observedPrimary = raw; primarySaved = true;
        } catch {
          snapshot.fallback = true;
          if (!db) { failure = '学習記録を保存できません。空き容量とブラウザの設定を確認してください。'; notify(); throw error; }
        }
      }
      cache = raw; current = snapshot;
      if (primarySaved) remember(snapshot);
      latest = snapshot; enqueue(snapshot); notify();
    }
    // Keep the input to an update before the model performs any migration.
    if (db && good(cache) && latest?.build !== build) {
      const checkpoint = { v: 1, seq: sequence, at: now(), build, raw: cache, hash: hash(cache), baseHash: hash(primary), fallback: Boolean(recover) };
      await transaction(db, 'readwrite', s => s.put(checkpoint, 'before-update'));
    }
    if (recover) write(cache);
    return {
      getItem(key) {
        const actual = storage.getItem(key);
        if (key !== KEY) return actual;
        if (actual !== observedPrimary) return actual; // Preserve the model's stale-tab guard.
        return cache;
      },
      setItem(key, value) { if (key === KEY) write(value); else storage.setItem(key, value); },
      get status() { return status(); },
      get conflict() {
        try { return conflict || storage.getItem(KEY) !== observedPrimary; }
        catch { failure = '学習記録にアクセスできません。ブラウザの設定を確認してください。'; return conflict; }
      },
      flush: () => queue,
      retry() { if (!closed && !conflict && !pending && current && !primarySaved && !backupSaved && storage.getItem(KEY) === observedPrimary) write(cache); },
      async protect(manager) {
        try { persistence = Boolean(await manager?.persisted?.()) || Boolean(await manager?.persist?.()); } catch {}
        notify(); return persistence;
      },
      close() { closed = true; db?.close(); }
    };
  }
  return { open, KEY, LATEST, PREVIOUS, DATABASE };
})();
