/* ============================================================
   落音 PianoFall v4.0 — 导入：本地伴奏 / MIDI / Basic Pitch 扒谱
   依赖 app 回调：ensureAudio / getMasterGain / showToast /
   addImportedSong / startSong
   ============================================================ */
(function () {
  'use strict';

  var app = null;
  var audioEl = null;
  var mediaSource = null;
  var mediaGain = null;
  var currentUrl = null;
  var currentName = '';
  var lastMidiSong = null;
  var lastTranscribedSong = null;
  var bpLoadPromise = null;

  function $(id) { return document.getElementById(id); }
  function setStatus(id, text, cls) {
    var el = $(id);
    if (!el) return;
    el.textContent = text || '';
    el.className = 'import-status' + (cls ? ' ' + cls : '');
  }

  function fmtTime(sec) {
    if (!isFinite(sec) || sec < 0) sec = 0;
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    return m + ':' + String(s).padStart(2, '0');
  }

  function baseName(name) {
    return (name || '本地音频').replace(/\.[^.]+$/, '').slice(0, 40) || '本地音频';
  }

  function readAsArrayBuffer(file) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () { resolve(fr.result); };
      fr.onerror = function () { reject(fr.error || new Error('读取文件失败')); };
      fr.readAsArrayBuffer(file);
    });
  }

  function isAudioFile(file) {
    return file && (file.type.indexOf('audio/') === 0 || /\.(mp3|wav|m4a|ogg|flac|aac|webm)$/i.test(file.name));
  }

  // ---------------- 本地音频伴奏 ----------------
  function initAudioDock() {
    var play = $('audioDockPlay');
    var loop = $('audioDockLoop');
    var vol = $('audioDockVolume');
    var rate = $('audioDockRate');
    var remove = $('audioDockRemove');
    var progress = $('audioDockProgress');

    play.addEventListener('click', function () {
      if (!audioEl.src) return;
      app.ensureAudio();
      if (audioEl.paused) {
        audioEl.play().then(refreshAudioDock).catch(function () {
          app.showToast('浏览器拦截了自动播放，请再点一次播放');
        });
      } else {
        audioEl.pause();
      }
    });

    loop.addEventListener('click', function () {
      audioEl.loop = !audioEl.loop;
      loop.textContent = '循环: ' + (audioEl.loop ? '开' : '关');
      loop.setAttribute('aria-pressed', audioEl.loop ? 'true' : 'false');
    });

    vol.addEventListener('input', function () {
      var v = parseInt(vol.value, 10) / 100;
      if (mediaGain) mediaGain.gain.value = v;
    });

    rate.addEventListener('input', function () {
      var v = parseInt(rate.value, 10) / 100;
      audioEl.playbackRate = v;
      if ('preservesPitch' in audioEl) audioEl.preservesPitch = true;
      $('audioDockRateValue').textContent = Math.round(v * 100) + '%';
    });

    remove.addEventListener('click', clearAudio);

    progress.addEventListener('click', function (e) {
      if (!audioEl.duration) return;
      var rect = progress.getBoundingClientRect();
      var p = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      audioEl.currentTime = audioEl.duration * p;
    });

    audioEl.addEventListener('timeupdate', refreshAudioDock);
    audioEl.addEventListener('loadedmetadata', refreshAudioDock);
    audioEl.addEventListener('play', refreshAudioDock);
    audioEl.addEventListener('pause', refreshAudioDock);
    audioEl.addEventListener('ended', refreshAudioDock);
  }

  function refreshAudioDock() {
    if (!audioEl) return;
    var dock = $('audioDock');
    if (!dock) return;
    var duration = audioEl.duration || 0;
    var now = audioEl.currentTime || 0;
    $('audioDockName').textContent = currentName || '本地伴奏';
    $('audioDockTime').textContent = fmtTime(now) + ' / ' + fmtTime(duration);
    $('audioDockProgressFill').style.width = (duration ? Math.min(100, now / duration * 100) : 0) + '%';
    $('audioDockPlay').textContent = audioEl.paused ? '▶' : '❚❚';
    $('audioDockLoop').textContent = '循环: ' + (audioEl.loop ? '开' : '关');
    $('audioDockLoop').setAttribute('aria-pressed', audioEl.loop ? 'true' : 'false');
  }

  function attachAudio(file) {
    if (!isAudioFile(file)) {
      setStatus('audioImportStatus', '请选择音频文件（mp3 / wav / m4a / ogg / flac）。', 'error');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setStatus('audioImportStatus', '文件超过 25MB，请先压缩或截取一段。', 'error');
      return;
    }
    var ctx = app.ensureAudio();
    if (!ctx) {
      setStatus('audioImportStatus', '当前浏览器不支持 Web Audio，无法播放伴奏。', 'error');
      return;
    }
    try {
      if (currentUrl) URL.revokeObjectURL(currentUrl);
      currentUrl = URL.createObjectURL(file);
      currentName = baseName(file.name);
      audioEl.src = currentUrl;
      audioEl.load();

      if (!mediaSource) {
        mediaSource = ctx.createMediaElementSource(audioEl);
        mediaGain = ctx.createGain();
        mediaGain.gain.value = parseInt($('audioDockVolume').value, 10) / 100;
        mediaSource.connect(mediaGain);
        mediaGain.connect(app.getMasterGain());
      }

      $('audioDock').hidden = false;
      $('audioDockRate').value = 100;
      $('audioDockRateValue').textContent = '100%';
      audioEl.playbackRate = 1;
      refreshAudioDock();
      setStatus('audioImportStatus', '已载入：' + file.name + '。可在页面底部播放/循环/调速。', 'ok');
      audioEl.play().catch(function () {
        setStatus('audioImportStatus', '已载入。浏览器拦截了自动播放，请点底部播放键。', '');
      });
      // 伴奏载入后收起导入层，让底部播放器和琴键直接可用
      var modal = document.getElementById('importModal');
      if (modal) modal.hidden = true;
    } catch (e) {
      setStatus('audioImportStatus', '音频载入失败：' + (e.message || e), 'error');
    }
  }

  function clearAudio() {
    if (!audioEl) return;
    audioEl.pause();
    audioEl.removeAttribute('src');
    audioEl.load();
    if (currentUrl) URL.revokeObjectURL(currentUrl);
    currentUrl = null;
    currentName = '';
    $('audioDock').hidden = true;
    setStatus('audioImportStatus', '已移除伴奏。', '');
  }

  // ---------------- MIDI 解析 ----------------
  function readUint32(dv, p) { return dv.getUint32(p); }
  function readUint16(dv, p) { return dv.getUint16(p); }
  function readVarInt(dv, p, end) {
    var value = 0;
    var count = 0;
    while (p < end) {
      var b = dv.getUint8(p++);
      value = (value << 7) | (b & 0x7f);
      count++;
      if (!(b & 0x80)) break;
      if (count > 4) break;
    }
    return { value: value, pos: p };
  }
  function readString(dv, p, len) {
    var s = '';
    for (var i = 0; i < len; i++) {
      var c = dv.getUint8(p + i);
      if (c === 0) break;
      s += String.fromCharCode(c);
    }
    return s;
  }

  function parseMidiBuffer(arrayBuffer, fileName) {
    var dv = new DataView(arrayBuffer);
    if (arrayBuffer.byteLength < 14) throw new Error('不是有效的 MIDI 文件');
    if (readString(dv, 0, 4) !== 'MThd') throw new Error('文件头不是 MThd');
    var headerLen = readUint32(dv, 4);
    var format = readUint16(dv, 8);
    var trackCount = readUint16(dv, 10);
    var division = readUint16(dv, 12);
    if (division & 0x8000) throw new Error('暂不支持 SMPTE 时间格式的 MIDI');
    var ticksPerQuarter = division || 480;

    var pos = 8 + headerLen;
    var tracks = [];
    var tempos = [{ tick: 0, usPerQuarter: 500000 }];

    for (var t = 0; t < trackCount && pos + 8 <= arrayBuffer.byteLength; t++) {
      if (readString(dv, pos, 4) !== 'MTrk') break;
      var len = readUint32(dv, pos + 4);
      var start = pos + 8;
      var end = Math.min(arrayBuffer.byteLength, start + len);
      var p = start;
      var tick = 0;
      var running = 0;
      var notes = [];
      var active = {};
      var name = '';
      var lastTick = 0;

      while (p < end) {
        var v = readVarInt(dv, p, end);
        tick += v.value;
        p = v.pos;
        if (p >= end) break;
        var status = dv.getUint8(p);
        if (status === 0xFF) {
          p++;
          var type = dv.getUint8(p++);
          var ml = readVarInt(dv, p, end);
          p = ml.pos;
          var dataStart = p;
          if (type === 0x51 && ml.value === 3) {
            var us = (dv.getUint8(dataStart) << 16) | (dv.getUint8(dataStart + 1) << 8) | dv.getUint8(dataStart + 2);
            if (us > 0) tempos.push({ tick: tick, usPerQuarter: us });
          } else if (type === 0x03) {
            name = readString(dv, dataStart, ml.value);
          } else if (type === 0x2F) {
            p = dataStart + ml.value;
            break;
          }
          p = dataStart + ml.value;
          continue;
        }
        if (status === 0xF0 || status === 0xF7) {
          p++;
          var sl = readVarInt(dv, p, end);
          p = sl.pos + sl.value;
          continue;
        }
        if (status & 0x80) {
          running = status;
          p++;
        } else {
          status = running;
          if (!status) break;
        }
        var typeNibble = status & 0xF0;
        var channel = status & 0x0F;
        var d1, d2;
        if (typeNibble === 0xC0 || typeNibble === 0xD0) {
          d1 = dv.getUint8(p); p += 1;
        } else {
          d1 = dv.getUint8(p); d2 = dv.getUint8(p + 1); p += 2;
          if (typeNibble === 0x90 && d2 > 0) {
            var key = channel + ':' + d1;
            if (!active[key]) active[key] = { midi: d1, startTick: tick };
          } else if (typeNibble === 0x80 || (typeNibble === 0x90 && d2 === 0)) {
            var k = channel + ':' + d1;
            if (active[k]) {
              if (tick > active[k].startTick) {
                notes.push({ midi: active[k].midi, startTick: active[k].startTick, endTick: tick });
              }
              delete active[k];
            }
          }
        }
        lastTick = tick;
      }

      // 未闭合的音符补到轨道末尾
      Object.keys(active).forEach(function (k) {
        var n = active[k];
        if (lastTick > n.startTick) notes.push({ midi: n.midi, startTick: n.startTick, endTick: lastTick });
      });
      tracks.push({ name: name, notes: notes });
      pos = start + len;
    }

    var noteTracks = tracks.filter(function (tr) { return tr.notes.length > 0; });
    if (!noteTracks.length) throw new Error('这个 MIDI 里没有音符');

    var temposSorted = tempos.slice().sort(function (a, b) { return a.tick - b.tick; });
    function tickToSeconds(tick) {
      // 支持变速：按 tempo 分段累加
      var sec = 0;
      var lastTick = 0;
      var us = 500000;
      for (var i = 0; i < temposSorted.length; i++) {
        var ev = temposSorted[i];
        if (ev.tick > tick) break;
        sec += (ev.tick - lastTick) / ticksPerQuarter * (us / 1000000);
        lastTick = ev.tick;
        us = ev.usPerQuarter;
      }
      sec += (tick - lastTick) / ticksPerQuarter * (us / 1000000);
      return sec;
    }

    // 选主旋律轨：音符平均音高最高的那条
    var melodyTrack = noteTracks[0];
    var bestAvg = -1;
    noteTracks.forEach(function (tr) {
      var avg = tr.notes.reduce(function (sum, n) { return sum + n.midi; }, 0) / tr.notes.length;
      if (avg > bestAvg) { bestAvg = avg; melodyTrack = tr; }
    });

    // 单声部化：按时间排序，同/近起点取最高音，重叠处截断前一个音
    var raw = melodyTrack.notes.map(function (n) {
      return { midi: n.midi, start: tickToSeconds(n.startTick), end: tickToSeconds(n.endTick) };
    }).sort(function (a, b) { return a.start - b.start || b.midi - a.midi; });

    var mono = [];
    raw.forEach(function (n) {
      if (n.end <= n.start) return;
      var prev = mono[mono.length - 1];
      if (prev) {
        if (n.start < prev.end) {
          if (n.start - prev.start < 0.03) {
            if (n.midi > prev.midi) prev.midi = n.midi, prev.end = Math.max(prev.end, n.end);
            return;
          }
          prev.end = Math.min(prev.end, n.start);
          if (prev.end <= prev.start) return;
        } else if (n.start - prev.end < 0.04) {
          prev.end = n.start;
        }
      }
      mono.push({ midi: n.midi, start: n.start, end: n.end });
    });
    mono = mono.filter(function (n) { return n.end - n.start >= 0.04; });
    if (!mono.length) throw new Error('主旋律轨没有可用音符');

    var startTime = mono[0].start;
    // 默认以 120 BPM 作为谱面时间基准；音符相对时序保持不变
    var beatMs = 500;
    var beat = 0;
    var lastBeat = 0;
    var notes = [];
    mono.forEach(function (n) {
      var bStart = Math.round((n.start - startTime) / (beatMs / 1000) * 4) / 4;
      var bDur = Math.max(0.25, Math.round((n.end - n.start) / (beatMs / 1000) * 4) / 4);
      if (bStart > lastBeat + 0.5) {
        notes.push([null, 4, Math.round((bStart - lastBeat) * 4) / 4]);
        lastBeat = bStart;
      }
      if (bStart < lastBeat) bStart = lastBeat;
      var midi = clampMidi(n.midi);
      var nn = midiToNote(midi);
      notes.push([nn.note, nn.octave, bDur]);
      lastBeat = bStart + bDur;
    });

    var title = (melodyTrack.name || baseName(fileName)).trim().slice(0, 40) || baseName(fileName);
    return {
      name: '导入 · ' + title,
      title: title,
      composer: '本地 MIDI',
      category: '导入',
      difficulty: 2,
      key: '—',
      tempo: beatMs,
      repeat: 1,
      harmonyCycle: 16,
      harmony: [],
      notes: notes,
      imported: true,
      importedFrom: 'midi',
      source: '本地 MIDI 导入 · 主旋律轨：' + (melodyTrack.name || '未命名')
    };
  }

  function clampMidi(midi) {
    midi = Math.round(midi);
    while (midi < 48) midi += 12;
    while (midi > 83) midi -= 12;
    return Math.max(48, Math.min(83, midi));
  }

  function midiToNote(midi) {
    return Luoyin.midiToNote(midi);
  }

  function handleMidiFile(file) {
    if (!file) return;
    if (file.size > 512 * 1024) {
      setStatus('midiImportStatus', 'MIDI 文件超过 512KB，请先用编辑器裁短。', 'error');
      return;
    }
    setStatus('midiImportStatus', '正在解析 MIDI…', '');
    readAsArrayBuffer(file).then(function (buf) {
      var song = parseMidiBuffer(buf, file.name);
      lastMidiSong = song;
      var count = song.notes.filter(function (n) { return n[0]; }).length;
      setStatus('midiImportStatus', '解析成功：' + count + ' 个旋律音，约 ' +
        Math.round(song.notes.reduce(function (s, n) { return s + (n[2] || 1); }, 0) * song.tempo / 1000) + ' 秒。', 'ok');
      showImportActions('midiImportStatus', song, '开始练习 MIDI');
    }).catch(function (e) {
      setStatus('midiImportStatus', 'MIDI 解析失败：' + (e.message || e), 'error');
    });
  }

  // ---------------- Basic Pitch 扒谱 ----------------
  function loadBasicPitch() {
    if (window.LuoyinBasicPitch) return Promise.resolve(window.LuoyinBasicPitch);
    if (bpLoadPromise) return bpLoadPromise;
    bpLoadPromise = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = 'vendor/basic-pitch/basic-pitch.js';
      s.onload = function () {
        if (window.LuoyinBasicPitch) resolve(window.LuoyinBasicPitch);
        else reject(new Error('扒谱组件已加载但没有导出接口'));
      };
      s.onerror = function () {
        reject(new Error('扒谱组件未安装或加载失败；仍可把音频当伴奏使用。'));
      };
      document.head.appendChild(s);
    });
    return bpLoadPromise;
  }

  function decodeMono22050(arrayBuffer, maxSeconds) {
    var ctx = app.ensureAudio();
    return new Promise(function (resolve, reject) {
      ctx.decodeAudioData(arrayBuffer.slice(0), function (buffer) {
        try {
          var seconds = Math.min(buffer.duration, maxSeconds || 60);
          var frames = Math.ceil(seconds * 22050);
          var offline = new OfflineAudioContext(1, frames, 22050);
          var src = offline.createBufferSource();
          src.buffer = buffer;
          src.connect(offline.destination);
          src.start(0, 0, seconds);
          offline.startRendering().then(resolve).catch(reject);
        } catch (e) { reject(e); }
      }, function (err) { reject(err || new Error('音频解码失败')); });
    });
  }

  function noteEventsToSong(events, title, bpm) {
    bpm = bpm || 120;
    var beatMs = 60000 / bpm;
    var sorted = events.filter(function (n) { return n && isFinite(n.startTimeSeconds) && isFinite(n.durationSeconds); })
      .sort(function (a, b) { return a.startTimeSeconds - b.startTimeSeconds; });
    if (!sorted.length) throw new Error('没有识别到音符');
    var startTime = sorted[0].startTimeSeconds;
    var mono = [];
    sorted.forEach(function (n) {
      var start = n.startTimeSeconds;
      var end = start + Math.max(0.06, n.durationSeconds);
      var midi = Math.round(n.pitchMidi);
      var prev = mono[mono.length - 1];
      if (prev) {
        if (start < prev.end) {
          if (start - prev.start < 0.04) {
            if (midi > prev.midi) { prev.midi = midi; prev.end = Math.max(prev.end, end); }
            return;
          }
          prev.end = Math.min(prev.end, start);
          if (prev.end <= prev.start) return;
        } else if (start - prev.end < 0.04) {
          prev.end = start;
        }
      }
      mono.push({ midi: midi, start: start, end: end });
    });
    var notes = [];
    var lastBeat = 0;
    mono.forEach(function (n) {
      var bStart = Math.round((n.start - startTime) / (beatMs / 1000) * 4) / 4;
      var bDur = Math.max(0.25, Math.round((n.end - n.start) / (beatMs / 1000) * 4) / 4);
      if (bStart > lastBeat + 0.5) {
        notes.push([null, 4, Math.round((bStart - lastBeat) * 4) / 4]);
        lastBeat = bStart;
      }
      if (bStart < lastBeat) bStart = lastBeat;
      var midi = clampMidi(n.midi);
      var nn = midiToNote(midi);
      notes.push([nn.note, nn.octave, bDur]);
      lastBeat = bStart + bDur;
    });
    return {
      name: '扒谱 · ' + title,
      title: title,
      composer: '本地音频',
      category: '导入',
      difficulty: 2,
      key: '—',
      tempo: beatMs,
      repeat: 1,
      harmonyCycle: 16,
      harmony: [],
      notes: notes,
      imported: true,
      importedFrom: 'audio',
      source: '本地音频 · Basic Pitch 智能扒谱（单旋律）'
    };
  }

  function transcribeFile(file) {
    if (!isAudioFile(file)) {
      setStatus('transcribeStatus', '请选择音频文件。', 'error');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setStatus('transcribeStatus', '文件超过 25MB，请先截取一段。', 'error');
      return;
    }
    setStatus('transcribeStatus', '正在加载扒谱组件…首次使用约 1MB 模型。', '');
    var progress = $('transcribeProgress');
    var bar = progress.querySelector('div');
    progress.hidden = false;
    bar.style.width = '0%';
    $('transcribeResult').hidden = true;

    loadBasicPitch().then(function (lib) {
      setStatus('transcribeStatus', '正在解码音频…', '');
      return readAsArrayBuffer(file).then(function (buf) {
        return decodeMono22050(buf, 60).then(function (audioBuffer) {
          setStatus('transcribeStatus', 'AI 正在识别音符…（60 秒内音频通常需要几秒到十几秒）', '');
          var basicPitch = new lib.BasicPitch('vendor/basic-pitch/model/model.json');
          var frames = [], onsets = [], contours = [];
          return basicPitch.evaluateModel(audioBuffer, function (f, o, c) {
            frames.push.apply(frames, f);
            onsets.push.apply(onsets, o);
            contours.push.apply(contours, c);
          }, function (p) {
            bar.style.width = Math.round(p * 100) + '%';
          }).then(function () {
            var poly = lib.noteFramesToTime(
              lib.addPitchBendsToNoteEvents(
                contours,
                lib.outputToNotesPoly(frames, onsets, 0.25, 0.25, 5)
              )
            );
            var song = noteEventsToSong(poly, baseName(file.name), 120);
            lastTranscribedSong = song;
            progress.hidden = true;
            var count = song.notes.filter(function (n) { return n[0]; }).length;
            setStatus('transcribeStatus', '识别完成：' + count + ' 个旋律音。复杂混音/和弦可能不准确。', 'ok');
            showImportActions('transcribeStatus', song, '开始练习扒谱');
          });
        });
      });
    }).catch(function (e) {
      progress.hidden = true;
      setStatus('transcribeStatus', '扒谱失败：' + (e.message || e) + '（音频伴奏功能不受影响）', 'error');
    });
  }

  function showImportActions(statusId, song, label) {
    var host = $(statusId);
    if (!host) return;
    var old = host.parentNode.querySelector('.import-actions');
    if (old) old.remove();
    var wrap = document.createElement('div');
    wrap.className = 'import-actions';
    wrap.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;';
    var btnStart = document.createElement('button');
    btnStart.type = 'button';
    btnStart.className = 'btn btn-primary';
    btnStart.textContent = '▶ ' + label;
    btnStart.addEventListener('click', function () {
      var index = app.addImportedSong(song);
      app.startSong(index);
    });
    var btnAdd = document.createElement('button');
    btnAdd.type = 'button';
    btnAdd.className = 'btn';
    btnAdd.textContent = '加入曲库';
    btnAdd.addEventListener('click', function () {
      app.addImportedSong(song);
      app.showToast('已加入曲库，可在自由演奏里点选');
    });
    wrap.appendChild(btnStart);
    wrap.appendChild(btnAdd);
    host.parentNode.insertBefore(wrap, host.nextSibling);
  }

  // ---------------- 文件选择 / 拖拽 ----------------
  function wirePicker(zoneId, inputId, handler, accept) {
    var zone = $(zoneId), input = $(inputId);
    if (!zone || !input) return;
    zone.addEventListener('click', function () { input.click(); });
    zone.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
    });
    input.addEventListener('change', function () {
      var file = input.files && input.files[0];
      if (file) handler(file);
      input.value = '';
    });
    zone.addEventListener('dragover', function (e) {
      e.preventDefault();
      zone.classList.add('dragover');
    });
    zone.addEventListener('dragleave', function () { zone.classList.remove('dragover'); });
    zone.addEventListener('drop', function (e) {
      e.preventDefault();
      zone.classList.remove('dragover');
      var file = e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) handler(file);
    });
  }

  function wireTabs() {
    document.querySelectorAll('#importTabs .tab-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var tab = btn.dataset.importTab;
        document.querySelectorAll('#importTabs .tab-btn').forEach(function (b) {
          b.classList.toggle('active', b === btn);
        });
        document.querySelectorAll('[data-import-panel]').forEach(function (p) {
          p.hidden = p.dataset.importPanel !== tab;
        });
      });
    });
  }

  function init(options) {
    app = options;
    audioEl = $('importedAudio');
    if (!audioEl) return;
    initAudioDock();
    wireTabs();
    wirePicker('audioDropZone', 'audioFileInput', attachAudio);
    wirePicker('midiDropZone', 'midiFileInput', handleMidiFile);
    wirePicker('transcribeDropZone', 'transcribeFileInput', transcribeFile);
  }

  window.LuoyinImport = {
    init: init,
    parseMidiBuffer: function (buf, name) { return parseMidiBuffer(buf, name); },
    _internal: { clampMidi: clampMidi, noteEventsToSong: noteEventsToSong }
  };
})();
