/* ============================================================
   落音 PianoFall v4.0 — 音名 / 设置 / 难度基础层
   经典 script：暴露 window.Luoyin，供主脚本和测试使用。
   ============================================================ */
(function () {
  'use strict';

  var NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  var SOLFEGE = {
    'C': 'do', 'C#': '♯do', 'D': 're', 'D#': '♯re', 'E': 'mi',
    'F': 'fa', 'F#': '♯fa', 'G': 'sol', 'G#': '♯sol', 'A': 'la',
    'A#': '♯la', 'B': 'si'
  };
  var SOLFEGE_SIMPLE = {
    'C': '1', 'C#': '♯1', 'D': '2', 'D#': '♯2', 'E': '3',
    'F': '4', 'F#': '♯4', 'G': '5', 'G#': '♯5', 'A': '6',
    'A#': '♯6', 'B': '7'
  };
  var STORAGE_KEY = 'luoyin.settings.v1';

  var DEFAULT_SETTINGS = {
    noteSystem: 'chinese',     // chinese | scientific | yamaha | solfege
    keyHints: true,
    a4: 440,
    difficulty: 'novice',      // novice | expert
    volume: 70,
    reverb: 30,
    ghostAssist: true,
    playRate: 65,
    playBackingVol: 25
  };

  var settings = Object.assign({}, DEFAULT_SETTINGS);

  function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

  function loadSettings() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        Object.keys(DEFAULT_SETTINGS).forEach(function (k) {
          if (typeof parsed[k] !== 'undefined') settings[k] = parsed[k];
        });
      }
    } catch (e) {}
    // 兼容旧版滑杆默认值
    if (typeof settings.a4 !== 'number' || settings.a4 < 430 || settings.a4 > 450) settings.a4 = 440;
    if (['novice', 'expert'].indexOf(settings.difficulty) < 0) settings.difficulty = 'novice';
    if (['chinese', 'scientific', 'yamaha', 'solfege'].indexOf(settings.noteSystem) < 0) settings.noteSystem = 'chinese';
    return settings;
  }

  function saveSettings(patch) {
    if (patch) Object.keys(patch).forEach(function (k) { settings[k] = patch[k]; });
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch (e) {}
    return settings;
  }

  function getSettings() { return settings; }
  function getSetting(key) { return settings[key]; }

  /** 科学音高八度（C4 = 中央C）→ 显示八度 */
  function scientificOctave(note, octave) {
    if (note === 'C' || note === 'C#') return octave;
    return octave;
  }

  function noteLabel(note, octave, system) {
    system = system || settings.noteSystem;
    var idx = NOTE_NAMES.indexOf(note);
    if (idx < 0) return note;
    if (system === 'solfege') {
      // 唱名用带点的八度数：中央C 的 do 不加点，低八度加下标点
      var sol = SOLFEGE[note] || note;
      var delta = octave - 4;
      if (delta === 0) return sol;
      if (delta < 0) return sol + '̥'.repeat(Math.min(3, -delta));
      return sol + '̇'.repeat(Math.min(3, delta));
    }
    if (system === 'chinese') {
      // 小字组：c=MIDI48(C3), c1=MIDI60(C4), c2=MIDI72(C5)
      var cn = note.charAt(0);
      var accidental = note.indexOf('#') >= 0 ? '♯' : '';
      var num = octave - 3;
      return accidental + (num === 0 ? cn.toLowerCase() : cn.toLowerCase() + num);
    }
    // scientific / yamaha
    var shifted = system === 'yamaha' ? octave - 1 : octave;
    return note + shifted;
  }

  function formatRange(baseOctave, count, system) {
    var low = noteLabel('C', baseOctave, system);
    var high = noteLabel('B', baseOctave + count - 1, system);
    return low + ' – ' + high;
  }

  function noteToMidi(note, octave) {
    var idx = NOTE_NAMES.indexOf(note);
    if (idx < 0) return null;
    return (octave + 1) * 12 + idx;
  }

  function midiToNote(midi) {
    midi = Math.round(midi);
    var idx = ((midi % 12) + 12) % 12;
    var octave = Math.floor(midi / 12) - 1;
    return { note: NOTE_NAMES[idx], octave: octave, midi: midi };
  }

  function midiLabel(midi, system) {
    var n = midiToNote(midi);
    return noteLabel(n.note, n.octave, system);
  }

  function frequency(note, octave, a4) {
    var midi = noteToMidi(note, octave);
    return frequencyMidi(midi, a4);
  }

  function frequencyMidi(midi, a4) {
    a4 = a4 || settings.a4 || 440;
    return a4 * Math.pow(2, (midi - 69) / 12);
  }

  function noteSystemName(system) {
    return ({
      chinese: '小字组',
      scientific: '科学音高',
      yamaha: 'Yamaha',
      solfege: '唱名'
    })[system] || system;
  }

  function difficultyConfig(level) {
    if (level === 'expert') {
      return {
        id: 'expert',
        name: '高手',
        rate: 100,
        perfect: 0.12,
        good: 0.25,
        ghost: false,
        keyHints: false,
        desc: '原速、严格判定、无幽灵手；适合已经能跟上节拍的人。'
      };
    }
    return {
      id: 'novice',
      name: '新手',
      rate: 60,
      perfect: 0.18,
      good: 0.36,
      ghost: true,
      keyHints: true,
      desc: '慢速、宽判定、幽灵手补音、键盘提示；适合第一次弹。'
    };
  }

  // 单一键位数据源：物理键 → 相对 baseOctave 的半音偏移。
  // 修改键位只改这一张表；琴键提示条、键盘监听、测试都从这里派生。
  var KEY_LAYOUT = {
    KeyZ: 0, Digit1: 1, KeyX: 2, Digit2: 3, KeyC: 4,
    KeyV: 5, Digit3: 6, KeyB: 7, Digit4: 8, KeyN: 9, Digit5: 10, KeyM: 11,
    KeyQ: 12, Digit6: 13, KeyW: 14, Digit7: 15, KeyE: 16,
    KeyR: 17, Digit8: 18, KeyT: 19, Digit9: 20, KeyY: 21, Digit0: 22, KeyU: 23,
    KeyI: 24, Minus: 25, KeyO: 26, Equal: 27, KeyP: 28
  };

  function codeForOffset(offset) {
    var found = null;
    Object.keys(KEY_LAYOUT).forEach(function (code) {
      if (found === null && KEY_LAYOUT[code] === offset) found = code;
    });
    return found;
  }

  function codeLabel(code) {
    if (!code) return '';
    var map = {
      Comma: ',', Period: '.', Slash: '/', Semicolon: ';', Quote: "'",
      Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']',
      Backslash: '\\', Backquote: '`', Space: 'Space',
      NumpadDecimal: '.', NumpadAdd: '+', NumpadSubtract: '-', NumpadMultiply: '*', NumpadDivide: '/'
    };
    if (map[code]) return map[code];
    if (/^Key[A-Z]$/.test(code)) return code.slice(3);
    if (/^Digit[0-9]$/.test(code)) return code.slice(5);
    if (/^Numpad[0-9]$/.test(code)) return 'N' + code.slice(6);
    return code;
  }

  function keyLabelForOffset(offset) { return codeLabel(codeForOffset(offset)); }

  window.Luoyin = {
    NOTE_NAMES: NOTE_NAMES,
    SOLFEGE: SOLFEGE,
    SOLFEGE_SIMPLE: SOLFEGE_SIMPLE,
    DEFAULT_SETTINGS: DEFAULT_SETTINGS,
    loadSettings: loadSettings,
    saveSettings: saveSettings,
    getSettings: getSettings,
    getSetting: getSetting,
    noteLabel: noteLabel,
    formatRange: formatRange,
    noteToMidi: noteToMidi,
    midiToNote: midiToNote,
    midiLabel: midiLabel,
    frequency: frequency,
    frequencyMidi: frequencyMidi,
    noteSystemName: noteSystemName,
    difficultyConfig: difficultyConfig,
    KEY_LAYOUT: KEY_LAYOUT,
    codeForOffset: codeForOffset,
    codeLabel: codeLabel,
    keyLabelForOffset: keyLabelForOffset
  };
})();
