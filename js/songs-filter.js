/* ============================================================
   落音 PianoFall v4.13 — 过滤掉不足 10 秒的整首片段
   说明：这些是主题片段/单句民歌，单遍不到 10 秒，练习价值低；
   完整曲（full）与用户导入的曲目不受影响。
   过滤在加载时执行一次，之后 normalizeSongs() 再补元数据。
   ============================================================ */
(function () {
  'use strict';
  var MIN_SECONDS = 10;
  for (var i = SONGS.length - 1; i >= 0; i--) {
    var song = SONGS[i];
    if (!song || song.imported || !song.notes) continue;
    var beats = 0;
    for (var j = 0; j < song.notes.length; j++) beats += (song.notes[j][2] || 1);
    if (beats * song.tempo / 1000 < MIN_SECONDS) SONGS.splice(i, 1);
  }
})();
