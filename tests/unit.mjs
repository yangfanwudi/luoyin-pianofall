import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

function loadConfig() {
  const store = new Map();
  const context = {
    window: {},
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v))
    },
    console
  };
  vm.createContext(context);
  vm.runInContext(read('js/config.js'), context, { filename: 'config.js' });
  return context.window.Luoyin;
}

function loadSongs(Luoyin) {
  const context = { Luoyin, console };
  vm.createContext(context);
  vm.runInContext(
    read('js/songs.js') + '\n' + read('js/songs-extra.js') + '\n' + read('js/songs-more.js') +
    '\n' + read('js/songs-library.js') + '\n' + read('js/songs-full.js') + '\n' + read('js/songs-filter.js') +
    '\nglobalThis.__SONGS = SONGS;',
    context, { filename: 'songs.js' }
  );
  return context.__SONGS;
}

function loadImport(Luoyin) {
  const context = {
    window: {},
    Luoyin,
    console,
    setTimeout,
    clearTimeout,
    document: { getElementById: () => null },
    OfflineAudioContext: class {},
    FileReader: class {}
  };
  vm.createContext(context);
  vm.runInContext(read('js/import.js'), context, { filename: 'import.js' });
  return context.window.LuoyinImport;
}

export function run() {
  const L = loadConfig();
  const results = [];
  const check = (name, fn) => {
    try { fn(); results.push({ name, ok: true }); }
    catch (e) { results.push({ name, ok: false, error: e.message }); }
  };

  check('A4 = 440Hz', () => assert.ok(Math.abs(L.frequency('A', 4) - 440) < 1e-9));
  check('C4 = 261.63Hz', () => assert.ok(Math.abs(L.frequency('C', 4) - 261.6255653) < 1e-6));
  check('C3 = 130.81Hz', () => assert.ok(Math.abs(L.frequency('C', 3) - 130.8127827) < 1e-6));
  check('小字组音名', () => {
    assert.equal(L.noteLabel('C', 3), 'c');
    assert.equal(L.noteLabel('C', 4), 'c1');
    assert.equal(L.noteLabel('C#', 4), '♯c1');
    assert.equal(L.noteLabel('B', 5), 'b2');
  });
  check('科学音高 / Yamaha', () => {
    assert.equal(L.noteLabel('C', 4, 'scientific'), 'C4');
    assert.equal(L.noteLabel('C', 4, 'yamaha'), 'C3');
  });
  check('音域显示', () => assert.equal(L.formatRange(3, 3, 'chinese'), 'c – b2'));
  check('键位表单一来源', () => {
    const seen = new Set();
    for (let i = 0; i <= 28; i++) {
      const code = L.codeForOffset(i);
      assert.ok(code, 'offset ' + i + ' has code');
      assert.ok(!seen.has(code), 'duplicate code ' + code);
      seen.add(code);
      assert.equal(L.keyLabelForOffset(i), L.codeLabel(code));
    }
  });
  check('难度参数', () => {
    assert.equal(L.difficultyConfig('novice').rate, 60);
    assert.equal(L.difficultyConfig('expert').rate, 100);
    assert.ok(L.difficultyConfig('novice').perfect > L.difficultyConfig('expert').perfect);
  });

  const songs = loadSongs(L);
  check('曲库数量 95', () => assert.equal(songs.length, 95));
  check('曲库分类齐全', () => {
    const cats = new Set(songs.map((s) => s.category).filter(Boolean));
    ['儿歌', '民歌', '古典', '完整曲', '圣诞', '世界'].forEach((c) => assert.ok(cats.has(c), '缺分类 ' + c));
  });
  check('没有短于 10 秒的曲目', () => {
    for (const s of songs) {
      const sec = s.notes.reduce((sum, n) => sum + (n[2] || 1), 0) * s.tempo / 1000;
      assert.ok(sec >= 10, s.title + ' 只有 ' + sec.toFixed(1) + ' 秒');
    }
  });
  check('完整曲至少 5 首且不短于 40 秒', () => {
    const full = songs.filter((s) => s.full);
    assert.ok(full.length >= 5, '完整曲数量 ' + full.length);
    for (const s of full) {
      const sec = s.notes.reduce((sum, n) => sum + (n[2] || 1), 0) * s.tempo / 1000;
      assert.ok(sec >= 40, s.title + ' 只有 ' + sec.toFixed(1) + ' 秒');
    }
  });
  check('曲名不重复', () => {
    const seen = new Set();
    for (const s of songs) {
      assert.ok(!seen.has(s.title || s.name), '重复曲名 ' + (s.title || s.name));
      seen.add(s.title || s.name);
    }
  });
  check('曲目数据完整', () => {
    const names = new Set(L.NOTE_NAMES);
    for (const s of songs) {
      assert.ok(s.title || s.name, 'title');
      assert.ok(s.notes && s.notes.length, 'notes ' + s.name);
      const diff = s.difficulty || 1;
      assert.ok(diff >= 1 && diff <= 3, 'difficulty ' + s.name);
      assert.ok(s.tempo > 0, 'tempo ' + s.name);
      for (const n of s.notes) {
        if (n[0] === null) continue;
        assert.ok(names.has(n[0]), 'bad note ' + n[0] + ' in ' + s.name);
        assert.ok(n[1] >= 3 && n[1] <= 5, 'octave ' + n[1] + ' in ' + s.name);
        const dur = n[2] || 1;
        assert.ok(dur > 0, 'duration in ' + s.name);
      }
    }
  });

  const imp = loadImport(L);
  check('MIDI 导入解析', () => {
    const buf = readFileSync(join(root, 'tests/fixtures/c-major.mid'));
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    const song = imp.parseMidiBuffer(ab, 'c-major.mid');
    assert.equal(song.imported, true);
    assert.ok(song.notes.filter((n) => n[0]).length === 8, 'note count');
    const firstTwo = song.notes.filter((n) => n[0]).slice(0, 2).map((n) => [n[0], n[1]]);
    assert.equal(JSON.stringify(firstTwo), JSON.stringify([['C', 4], ['D', 4]]));
  });
  check('MIDI 非法文件报错', () => {
    const ab = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]).buffer;
    assert.throws(() => imp.parseMidiBuffer(ab, 'bad.mid'));
  });

  return results;
}

if (process.argv[1] && process.argv[1].endsWith('unit.mjs')) {
  const results = run();
  let failed = 0;
  for (const r of results) {
    if (!r.ok) failed++;
    console.log((r.ok ? 'PASS' : 'FAIL') + '  ' + r.name + (r.ok ? '' : ' — ' + r.error));
  }
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
}
