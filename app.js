/* NOCTARIA: THE LAST KEEP — build gerado a partir de src/ */
'use strict';
/* Núcleo: utilidades, save local/backup, entrada (joystick/teclado), áudio sintetizado. */
window.TD = window.TD || {};
(function (T) {
  T.TAU = Math.PI * 2;
  T.R = function (a, b) { return a + Math.random() * (b - a); };
  T.RI = function (a, b) { return Math.floor(a + Math.random() * (b - a + 1)); };
  T.pick = function (a) { return a[Math.floor(Math.random() * a.length)]; };
  T.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  T.fmt = function (n) { n = Math.floor(n); return n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'k' : '' + n; };
  T.time = function (s) { s = Math.floor(s); var m = Math.floor(s / 60), x = s % 60; return m + ':' + (x < 10 ? '0' : '') + x; };
  function merge(d, s) {
    for (var k in s) {
      if (s[k] && typeof s[k] === 'object' && !Array.isArray(s[k]) && d[k] && typeof d[k] === 'object') merge(d[k], s[k]);
      else d[k] = s[k];
    }
    return d;
  }

  /* ---------- Save v2 (migra do v1 e mantém cópia de segurança) ---------- */
  T.Save = {
    key: 'noctaria_save_v2', oldKey: 'td_save_v1', d: null, migrated: false,
    def: function () {
      return {
        ver: 2, best: 0, games: 0, kills: 0, maxLevel: 0, maxWave: 0, bosses: 0, wins: 0, time: 0, towersBuilt: 0,
        essence: 60, classes: { knight: 1 }, maps: { forest: 1 }, towers: { arrow: 1, cannon: 1, fire: 1, ice: 1 },
        relics: {}, syn: {}, ach: {}, up: { hp: 0, dmg: 0, xp: 0, coin: 0 }, seen: { s: {}, e: {}, b: {} },
        skin: 'base', skins: { base: 1 }, lastClass: 'knight', lastMap: 'forest',
        set: { music: 0.5, sfx: 1, vol: 0.8, ui: 1, shake: 1, q: 1, autoq: 1, fxi: 1, flash: 0, still: 0, zoomfx: 1 }
      };
    },
    parse: function (txt) { var o = JSON.parse(txt); return (o && typeof o === 'object') ? o : null; },
    load: function () {
      var d = this.def(), got = false, ls = window.localStorage, o = null;
      try { var s = ls.getItem(this.key); if (s) { o = this.parse(s); } } catch (e) { o = null; }
      if (!o) { try { var b = ls.getItem(this.key + '_bak'); if (b) o = this.parse(b); } catch (e2) { o = null; } }
      if (!o) {
        try { var old = ls.getItem(this.oldKey); if (old) { o = this.parse(old); if (o) { ls.setItem(this.oldKey + '_backup', old); this.migrated = true; } } } catch (e3) { o = null; }
      }
      if (o) { merge(d, o); got = true; }
      d.ver = 2; if (!d.seen) d.seen = { s: {}, e: {}, b: {} };
      d.set.q = T.clamp(d.set.q | 0, 0, 2);
      this.d = d; if (got && this.migrated) this.save(); return d;
    },
    save: function () {
      try {
        var ls = window.localStorage, prev = ls.getItem(this.key);
        if (prev) ls.setItem(this.key + '_bak', prev);
        ls.setItem(this.key, JSON.stringify(this.d)); return true;
      } catch (e) { return false; }
    },
    reset: function () { try { localStorage.removeItem(this.key); localStorage.removeItem(this.key + '_bak'); } catch (e) { } this.d = this.def(); this.save(); },
    exportText: function () { return JSON.stringify({ app: 'noctaria', v: 2, data: this.d }); },
    importText: function (txt) {
      var o = JSON.parse(txt);
      if (!o || (o.app !== 'noctaria' && o.app !== 'torre-roguelite') || !o.data) throw new Error('Arquivo inválido.');
      this.d = merge(this.def(), o.data); this.d.ver = 2; this.save(); return true;
    }
  };

  /* ---------- Entrada ---------- */
  T.Input = {
    ax: 0, ay: 0, keys: {}, taps: [], joy: { on: false, id: -1, bx: 0, by: 0, x: 0, y: 0, t0: 0, mv: 0 },
    init: function (el) {
      var I = this, J = I.joy, R = 46;
      function pos(e) { return { x: e.clientX, y: e.clientY }; }
      el.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        try { el.setPointerCapture(e.pointerId); } catch (x) { }
        if (J.on) return;
        J.on = true; J.id = e.pointerId; J.bx = J.x = e.clientX; J.by = J.y = e.clientY; J.t0 = performance.now(); J.mv = 0;
      });
      el.addEventListener('pointermove', function (e) {
        if (!J.on || e.pointerId !== J.id) return;
        J.x = e.clientX; J.y = e.clientY;
        var dx = J.x - J.bx, dy = J.y - J.by, d = Math.sqrt(dx * dx + dy * dy);
        J.mv = Math.max(J.mv, d);
        if (d > R) { J.bx = J.x - dx / d * R; J.by = J.y - dy / d * R; d = R; }
        I.ax = d > 6 ? dx / R : 0; I.ay = d > 6 ? dy / R : 0;
        var m = Math.sqrt(I.ax * I.ax + I.ay * I.ay); if (m > 1) { I.ax /= m; I.ay /= m; }
      });
      function up(e) {
        if (!J.on || e.pointerId !== J.id) return;
        if (J.mv < 9 && performance.now() - J.t0 < 350) I.taps.push(pos(e));
        J.on = false; I.ax = I.ay = 0;
      }
      el.addEventListener('pointerup', up); el.addEventListener('pointercancel', function (e) { if (e.pointerId === J.id) { J.on = false; I.ax = I.ay = 0; } });
      window.addEventListener('keydown', function (e) { I.keys[e.key.toLowerCase()] = 1; if (e.key === ' ') I.keys.space = 1; });
      window.addEventListener('keyup', function (e) { I.keys[e.key.toLowerCase()] = 0; });
      el.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    },
    move: function () {
      var k = this.keys, x = (k.d || k.arrowright ? 1 : 0) - (k.a || k.arrowleft ? 1 : 0), y = (k.s || k.arrowdown ? 1 : 0) - (k.w || k.arrowup ? 1 : 0);
      if (x || y) { var m = Math.sqrt(x * x + y * y); return { x: x / m, y: y / m }; }
      return { x: this.ax, y: this.ay };
    }
  };

  /* ---------- Áudio (tudo gerado por código, sem arquivos) ---------- */
  T.Audio = {
    ctx: null, mg: null, sg: null, last: {}, mTimer: 0, mOn: false, step: 0,
    init: function () {
      if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
      try {
        var C = window.AudioContext || window.webkitAudioContext; if (!C) return;
        var c = this.ctx = new C(); this.mg = c.createGain(); this.sg = c.createGain();
        this.ug = c.createGain(); this.mg.connect(c.destination); this.sg.connect(c.destination); this.ug.connect(c.destination);
        var b = c.createBuffer(1, c.sampleRate * 0.5, c.sampleRate), d = b.getChannelData(0);
        for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        this.nb = b; this.apply();
      } catch (e) { this.ctx = null; }
    },
    apply: function () {
      if (!this.ctx) return; var s = T.Save.d.set;
      this.mg.gain.value = s.music * s.vol * 0.35; this.sg.gain.value = s.sfx ? s.vol : 0; this.ug.gain.value = s.sfx ? s.vol * (s.ui == null ? 1 : s.ui) : 0;
    },
    tone: function (type, f0, f1, dur, vol, dest) {
      var c = this.ctx, o = c.createOscillator(), g = c.createGain(), t = c.currentTime;
      o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
      o.connect(g); g.connect(dest || this.cur || this.sg); o.start(t); o.stop(t + dur + 0.02);
    },
    noise: function (dur, vol, freq) {
      var c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime;
      s.buffer = this.nb; f.type = 'lowpass'; f.frequency.value = freq || 1500;
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
      s.connect(f); f.connect(g); g.connect(this.cur || this.sg); s.start(t); s.stop(t + dur);
    },
    sfx: function (n) {
      if (!this.ctx || !T.Save.d.set.sfx) return;
      var now = performance.now(); if (now - (this.last[n] || 0) < 55) return; this.last[n] = now;
      var self = this;
      switch (n) {
        case 'shoot': this.tone('square', 640, 260, 0.06, 0.05); break;
        case 'slash': this.noise(0.08, 0.12, 2500); break;
        case 'hit': this.noise(0.04, 0.06, 900); break;
        case 'boom': this.noise(0.35, 0.3, 500); this.tone('sine', 110, 35, 0.3, 0.3); break;
        case 'zap': this.tone('sawtooth', 1400, 200, 0.12, 0.06); break;
        case 'magic': this.tone('triangle', 500, 1100, 0.15, 0.08); break;
        case 'xp': this.tone('sine', 900, 1500, 0.07, 0.07); break;
        case 'coin': this.tone('square', 1200, 1800, 0.06, 0.04); break;
        case 'pick': this.tone('sine', 600, 1000, 0.12, 0.1); break;
        case 'build': this.tone('triangle', 200, 120, 0.15, 0.2); this.noise(0.1, 0.1, 700); break;
        case 'hurt': this.tone('sawtooth', 220, 80, 0.15, 0.12); break;
        case 'level': [520, 660, 780, 1040].forEach(function (f, i) { setTimeout(function () { self.tone('triangle', f, f * 1.01, 0.22, 0.14); }, i * 80); }); break;
        case 'boss': this.tone('sawtooth', 90, 45, 1.1, 0.25); this.noise(0.9, 0.12, 300); break;
        case 'win': [523, 659, 784, 1046, 1318].forEach(function (f, i) { setTimeout(function () { self.tone('triangle', f, f, 0.3, 0.14); }, i * 110); }); break;
        case 'lose': [330, 262, 196, 130].forEach(function (f, i) { setTimeout(function () { self.tone('sawtooth', f, f * 0.9, 0.4, 0.12); }, i * 220); }); break;
      }
    },
    music: function (on) {
      var self = this; this.mOn = on; clearTimeout(this.mTimer);
      if (!on || !this.ctx) return;
      var scale = [110, 130.8, 164.8, 196, 220, 261.6, 329.6];
      (function loop() {
        if (!self.mOn || !self.ctx) return;
        var base = scale[(self.step * 3) % scale.length]; self.step++;
        self.tone('sine', base, base * 1.002, 2.6, 0.4, self.mg);
        self.tone('triangle', base * 1.5, base * 1.5, 2.2, 0.18, self.mg);
        if (Math.random() < 0.6) self.tone('sine', scale[Math.floor(Math.random() * 7)] * 2, scale[0] * 4, 1.6, 0.12, self.mg);
        self.mTimer = setTimeout(loop, 2400);
      })();
    }
  };
})(window.TD);

'use strict';
/* NOCTARIA — dados do jogo: raridades, habilidades, sinergias, torres, inimigos, chefes, heróis, mapas, relíquias, conquistas. */
(function (T) {
  T.RAR = [
    { n: 'Comum', c: '#a8a39a', w: 60, min: 1 }, { n: 'Incomum', c: '#62c46f', w: 26, min: 1 },
    { n: 'Rara', c: '#4f9dff', w: 10, min: 2 }, { n: 'Épica', c: '#b06cff', w: 4, min: 4 },
    { n: 'Lendária', c: '#e8a93a', w: 1.3, min: 7 }, { n: 'Mítica', c: '#ff3d5e', w: 0.45, min: 12 }
  ];
  T.CAT = { atk: 'Ataque', def: 'Defesa', mag: 'Magia', eco: 'Economia', sup: 'Suporte', tow: 'Torres' };

  /* Estatísticas do jogador (modificadas pelas habilidades e relíquias). */
  T.newStats = function () {
    return {
      dmg: 1, rate: 1, crit: 0.05, critDmg: 1.5, proj: 0, pierce: 0, explode: 0, area: 1, chain: 0,
      hpAdd: 0, hpMul: 1, regen: 0, shieldN: 0, dr: 0, block: 0, resist: 0, thorns: 0,
      fire: 0, bolt: 0, ice: 0, poison: 0, dark: 0, orbs: 0, summon: 0, magic: 1,
      coin: 1, xp: 1, drop: 1, rarity: 0, tcost: 1, trange: 1, trate: 1, tdmg: 1, cdr: 0,
      magnet: 80, autocol: 0, slots: 3, cards: 3, speed: 0, vamp: 0, nova: 0, fury: 0, rain: 0, twin: 0,
      overcharge: 0, revive: 0, timestop: 0, ascend: 0, lich: 0, light: 1,
      tt: { fire: 0, elecChain: 0, cannonArea: 0, iceFreeze: 0 }
    };
  };

  var SK = T.SK = [], SKI = T.SKI = {};
  function S(id, name, cat, rar, icon, desc, max, fx, req) {
    var o = { id: id, name: name, cat: cat, rar: rar, icon: icon, desc: desc, max: max, fx: fx, req: req || null };
    SK.push(o); SKI[id] = o;
  }
  // ATAQUE
  S('dmg1', 'Lâmina Afiada', 'atk', 0, '⚔️', '+15% de dano.', 8, function (P) { P.dmg += 0.15; });
  S('rate1', 'Mãos Ágeis', 'atk', 0, '💨', '+12% de velocidade de ataque.', 8, function (P) { P.rate += 0.12; });
  S('crit1', 'Olho Atento', 'atk', 0, '🎯', '+6% de chance de crítico.', 6, function (P) { P.crit += 0.06; });
  S('critdmg', 'Golpe Brutal', 'atk', 1, '💥', '+30% de dano crítico.', 6, function (P) { P.critDmg += 0.3; });
  S('proj1', 'Projétil Extra', 'atk', 1, '➕', '+1 projétil por ataque (corpo a corpo: +golpe em arco).', 4, function (P) { P.proj += 1; });
  S('pierce', 'Perfurante', 'atk', 1, '🏹', 'Projéteis atravessam +1 inimigo.', 4, function (P) { P.pierce += 1; });
  S('explode', 'Morte Explosiva', 'atk', 2, '☄️', 'Inimigos derrotados explodem causando dano em área.', 3, function (P) { P.explode += 1; });
  S('area1', 'Onda Expansiva', 'atk', 1, '🌀', '+20% de área em explosões e golpes.', 5, function (P) { P.area += 0.2; });
  S('chain1', 'Corrente', 'atk', 2, '🔗', 'Ataques saltam para +1 inimigo próximo.', 3, function (P) { P.chain += 1; });
  // DEFESA
  S('hp1', 'Vitalidade', 'def', 0, '❤️', '+20 de vida máxima e cura equivalente.', 8, function (P) { P.hpAdd += 20; });
  S('regen', 'Regeneração', 'def', 1, '🌿', 'Recupera +0,6 de vida por segundo.', 5, function (P) { P.regen += 0.6; });
  S('shield', 'Escudo Arcano', 'def', 2, '🛡️', 'Um escudo absorve um golpe e recarrega sozinho.', 3, function (P) { P.shieldN += 1; });
  S('dr', 'Pele de Pedra', 'def', 0, '🪨', '-6% de dano recebido.', 6, function (P) { P.dr += 0.06; });
  S('resist', 'Mente Firme', 'def', 0, '🧠', '-25% de duração de lentidão e atordoamento.', 4, function (P) { P.resist += 0.25; });
  S('block', 'Aparar', 'def', 1, '🤺', '+8% de chance de bloquear um ataque.', 5, function (P) { P.block += 0.08; });
  // MAGIA
  S('fire', 'Chamas', 'mag', 1, '🔥', 'Seus ataques queimam os inimigos.', 5, function (P) { P.fire += 1; });
  S('bolt', 'Raios', 'mag', 1, '⚡', 'Chance de invocar um raio ao atacar.', 5, function (P) { P.bolt += 1; });
  S('ice', 'Gelo', 'mag', 1, '❄️', 'Seus ataques desaceleram; três acertos congelam.', 5, function (P) { P.ice += 1; });
  S('poison', 'Veneno', 'mag', 1, '☠️', 'Seus ataques envenenam (dano contínuo).', 5, function (P) { P.poison += 1; });
  S('dark', 'Energia Sombria', 'mag', 2, '🌑', 'Rouba vida com parte do dano causado.', 4, function (P) { P.dark += 0.05; });
  S('arcane', 'Orbes Arcanos', 'mag', 2, '🔮', 'Orbes giram ao seu redor ferindo inimigos.', 4, function (P) { P.orbs += 1; });
  S('summon', 'Espíritos Aliados', 'mag', 2, '👻', 'Um espírito luta ao seu lado.', 4, function (P) { P.summon += 1; });
  // ECONOMIA
  S('coin', 'Mãos de Ouro', 'eco', 0, '🪙', '+20% de moedas.', 6, function (P) { P.coin += 0.2; });
  S('xp', 'Sabedoria', 'eco', 0, '📖', '+15% de experiência.', 6, function (P) { P.xp += 0.15; });
  S('drop', 'Sortudo', 'eco', 1, '🍀', '+15% de chance de drops.', 5, function (P) { P.drop += 0.15; });
  S('rarity', 'Brilho Raro', 'eco', 2, '💎', 'Cartas e itens vêm com raridade maior.', 3, function (P) { P.rarity += 1; });
  S('tcost', 'Mestre Construtor', 'eco', 1, '🔨', '-8% no custo das torres.', 5, function (P) { P.tcost -= 0.08; });
  // SUPORTE
  S('trange', 'Visão Longa', 'sup', 0, '🔭', '+10% de alcance das torres.', 5, function (P) { P.trange += 0.1; });
  S('trate', 'Engenharia', 'sup', 0, '⚙️', '+10% de velocidade das torres.', 5, function (P) { P.trate += 0.1; });
  S('cdr', 'Foco', 'sup', 1, '⏳', '-8% de recarga da habilidade especial.', 5, function (P) { P.cdr += 0.08; });
  S('autocol', 'Coleta Automática', 'sup', 1, '🧲', 'Cristais e moedas voam até você de longe.', 3, function (P) { P.autocol += 1; });
  S('magnet', 'Atração', 'sup', 0, '🪐', '+40 de raio de coleta.', 5, function (P) { P.magnet += 40; });
  S('slots', 'Mochila de Relíquias', 'sup', 3, '🎒', '+1 espaço para relíquias.', 2, function (P) { P.slots += 1; });
  // TORRES
  S('t_fire', 'Fornalha', 'tow', 1, '🏯', '+30% de dano das torres de fogo.', 4, function (P) { P.tt.fire += 0.3; });
  S('t_elec', 'Condutor', 'tow', 1, '🗼', 'Torres elétricas saltam para +1 alvo.', 3, function (P) { P.tt.elecChain += 1; });
  S('t_cannon', 'Bombardeio', 'tow', 1, '💣', 'Canhões explodem em área 25% maior.', 4, function (P) { P.tt.cannonArea += 0.25; });
  S('t_ice', 'Geada Eterna', 'tow', 2, '🧊', 'Torres de gelo têm chance de congelar inimigos.', 4, function (P) { P.tt.iceFreeze += 1; });
  S('t_all', 'Engrenagens Antigas', 'tow', 2, '🛠️', '+15% de dano de todas as torres.', 5, function (P) { P.tdmg += 0.15; });
  // ÉPICAS / LENDÁRIAS / MÍTICAS: mudam a forma de jogar
  S('vamp', 'Sede de Sangue', 'atk', 3, '🩸', 'Cura 2% do dano causado.', 3, function (P) { P.vamp += 0.02; });
  S('nova', 'Nova Sagrada', 'def', 3, '✨', 'A cada 5s um pulso de luz fere inimigos ao redor.', 3, function (P) { P.nova += 1; });
  S('fury', 'Fúria das Torres', 'tow', 3, '🌩️', 'A cada 15s todas as torres atacam em dobro por 4s.', 1, function (P) { P.fury = 1; });
  S('rain', 'Chuva de Meteoros', 'mag', 4, '🌠', 'Meteoros caem sobre os inimigos a cada 4s.', 3, function (P) { P.rain += 1; });
  S('twin', 'Eco Duplo', 'atk', 4, '🪞', 'Cada ataque se repete uma segunda vez.', 1, function (P) { P.twin = 1; });
  S('ghost', 'Passo Fantasma', 'sup', 4, '🥾', '+30% de velocidade e deixa rastro que fere.', 1, function (P) { P.speed += 0.3; P.ghost = 1; });
  S('overcharge', 'Sobrecarga', 'tow', 4, '🔋', 'Torres de suporte dobram seu efeito.', 1, function (P) { P.overcharge = 1; });
  S('immortal', 'Segundo Fôlego', 'def', 4, '🕊️', 'Ao morrer, revive uma vez com 50% de vida.', 1, function (P) { P.revive += 1; });
  S('timestop', 'Relógio do Fim', 'mag', 5, '🕰️', 'A cada 25s o tempo para por 3s para os inimigos.', 1, function (P) { P.timestop = 1; });
  S('ascend', 'Ascensão', 'atk', 5, '👑', '+100% de dano e +2 projéteis, mas -40% de vida máxima.', 1, function (P) { P.dmg += 1; P.proj += 2; P.hpMul *= 0.6; });
  S('lich', 'Senhor dos Mortos', 'mag', 5, '💀', 'Inimigos mortos têm chance de voltar como seus aliados.', 1, function (P) { P.lich = 1; });

  /* Sinergias secretas: só aparecem quando descobertas. */
  T.SYN = [
    { id: 'inferno', n: 'Chamas Infernais', need: ['fire', 'area1'], d: 'Queimaduras explodem em área ao serem aplicadas.' },
    { id: 'storm', n: 'Tempestade Elétrica', need: ['bolt', 'rate1'], d: 'Raios com o dobro de chance e atingem 3 alvos.' },
    { id: 'abszero', n: 'Congelamento Absoluto', need: ['ice', 'critdmg'], d: 'Críticos em inimigos lentos os congelam por completo.' },
    { id: 'plague', n: 'Praga Abissal', need: ['poison', 'fire'], d: 'Inimigos envenenados espalham o veneno ao morrer.' },
    { id: 'specter', n: 'Exército Espectral', need: ['summon', 'arcane'], d: '+2 espíritos que disparam energia arcana.' },
    { id: 'crimson', n: 'Pacto Carmesim', need: ['vamp', 'dark'], d: 'Roubo de vida dobrado e cura em pulso.' },
    { id: 'volley', n: 'Chuva de Lâminas', need: ['proj1', 'pierce'], d: 'Os projéteis saem em leque amplo e ferem mais.' },
    { id: 'fortress', n: 'Fortaleza Viva', need: ['shield', 'dr'], d: 'O escudo reflete dano e protege o núcleo.' },
    { id: 'gilded', n: 'Dragão Dourado', need: ['coin', 'drop'], d: 'Inimigos soltam moedas extras em rajada.' },
    { id: 'forge', n: 'Forja Infernal', need: ['t_fire', 'fire'], d: 'Torres de fogo incendeiam o chão por onde acertam.' }
  ];

  /* Relíquias: efeitos passivos que mudam as regras da partida. */
  T.REL = [
    { id: 'titan', n: 'Coração do Titã', rar: 3, icon: '🫀', d: '+50% de vida máxima.', fx: function (P) { P.hpMul *= 1.5; } },
    { id: 'hunter', n: 'Olho do Caçador', rar: 2, icon: '👁️', d: '+80% de dano crítico.', fx: function (P) { P.critDmg += 0.8; } },
    { id: 'void', n: 'Cristal do Vazio', rar: 3, icon: '🔷', d: 'Itens e cartas mais raros; +25% de drops.', fx: function (P) { P.rarity += 1; P.drop += 0.25; } },
    { id: 'hourglass', n: 'Ampulheta', rar: 2, icon: '⌛', d: '+25% de velocidade de ataque.', fx: function (P) { P.rate += 0.25; } },
    { id: 'crown', n: 'Coroa da Ruína', rar: 4, icon: '🔱', d: '+50% de dano, mas inimigos 25% mais fortes.', fx: function (P, G) { P.dmg += 0.5; G.diff *= 1.25; } },
    { id: 'core', n: 'Núcleo Arcano', rar: 3, icon: '🟣', d: '+40% de dano mágico, torres e orbes.', fx: function (P) { P.magic += 0.4; } },
    { id: 'boots', n: 'Botas do Vento', rar: 1, icon: '👢', d: '+25% de velocidade de movimento.', fx: function (P) { P.speed += 0.25; } },
    { id: 'lodestone', n: 'Ímã Antigo', rar: 1, icon: '🧲', d: '+120 de raio de coleta.', fx: function (P) { P.magnet += 120; } },
    { id: 'cursed', n: 'Moeda Maldita', rar: 2, icon: '🪙', d: '+50% de moedas, -15% de vida.', fx: function (P) { P.coin += 0.5; P.hpMul *= 0.85; } },
    { id: 'grimoire', n: 'Grimório Proibido', rar: 3, icon: '📕', d: 'Você escolhe entre 4 cartas ao subir de nível.', fx: function (P) { P.cards = 4; } },
    { id: 'thorns', n: 'Coroa de Espinhos', rar: 2, icon: '🌵', d: 'Reflete 30% do dano recebido.', fx: function (P) { P.thorns += 0.3; } },
    { id: 'lantern', n: 'Lamparina Fúnebre', rar: 1, icon: '🏮', d: '+10% de XP e luz mais ampla.', fx: function (P) { P.xp += 0.1; P.light = 1.35; } }
  ];
  T.RELI = {}; T.REL.forEach(function (r) { T.RELI[r.id] = r; });
  T.RCOMBO = [
    { id: 'rc_thorn', n: 'Fortaleza Espinhosa', a: 'titan', b: 'thorns', d: 'Espinhos escalam com a vida máxima.' },
    { id: 'rc_eye', n: 'Olho do Vazio', a: 'hunter', b: 'void', d: 'Críticos derrubam moedas.' },
    { id: 'rc_arc', n: 'Coroa Arcana', a: 'core', b: 'crown', d: '+60% de dano mágico.' }
  ];

  /* Torres. Valores base no nível 1. */
  T.TW = {
    arrow: { n: 'Torre de Arqueiros', cost: 40, rng: 175, cd: 0.7, dmg: 8, hp: 90, col: '#b89a6a', d: 'Flechas rápidas e baratas.', unlock: 0 },
    cannon: { n: 'Canhão', cost: 80, rng: 190, cd: 1.7, dmg: 24, hp: 130, col: '#7d7d86', aoe: 52, d: 'Explosão em área.', unlock: 0 },
    fire: { n: 'Torre de Fogo', cost: 90, rng: 140, cd: 1.0, dmg: 7, hp: 100, col: '#e2542a', aoe: 34, d: 'Queima os inimigos.', unlock: 0 },
    ice: { n: 'Torre de Gelo', cost: 80, rng: 150, cd: 1.1, dmg: 5, hp: 100, col: '#6fc7ff', d: 'Desacelera e pode congelar.', unlock: 0 },
    elec: { n: 'Torre Elétrica', cost: 100, rng: 150, cd: 1.2, dmg: 10, hp: 90, col: '#f3dc4a', d: 'Raio em cadeia.', unlock: 60 },
    arcane: { n: 'Torre Arcana', cost: 120, rng: 205, cd: 1.4, dmg: 18, hp: 90, col: '#b06cff', d: 'Esferas teleguiadas.', unlock: 120 },
    poison: { n: 'Torre Venenosa', cost: 90, rng: 150, cd: 1.3, dmg: 3, hp: 100, col: '#6fd05a', aoe: 40, d: 'Nuvem de veneno.', unlock: 80 },
    sniper: { n: 'Torre de Precisão', cost: 140, rng: 390, cd: 2.8, dmg: 75, hp: 70, col: '#d9d2c2', d: 'Tiro certeiro de longe.', unlock: 150 },
    summon: { n: 'Torre de Invocação', cost: 130, rng: 120, cd: 6.0, dmg: 9, hp: 110, col: '#4fe0a0', d: 'Gera guerreiros espectrais.', unlock: 200 },
    support: { n: 'Torre de Suporte', cost: 110, rng: 150, cd: 1, dmg: 0, hp: 120, col: '#e8a93a', d: 'Fortalece torres e cura aliados.', unlock: 100 }
  };
  T.TWORDER = ['arrow', 'cannon', 'fire', 'ice', 'elec', 'arcane', 'poison', 'sniper', 'summon', 'support'];

  /* Inimigos. kind = família de sprite. */
  T.EN = {
    ghoul: { n: 'Carniçal', kind: 'ghoul', hp: 16, spd: 60, dmg: 4, r: 10, xp: 1, col: '#7a8c5a', w: 10, from: 1, d: { coin: [0.4, 1, 2] } },
    ashhound: { n: 'Cão das Cinzas', kind: 'hound', hp: 26, spd: 112, dmg: 7, r: 11, xp: 2, col: '#6a5a58', w: 6, from: 2, flank: 1, d: { coin: [0.3, 1, 2] } },
    cultist: { n: 'Cultista', kind: 'cultist', hp: 40, spd: 40, dmg: 9, r: 10, xp: 3, col: '#7a2040', w: 5, from: 3, rng: 170, d: { coin: [0.5, 1, 3], frag: 0.03 } },
    wraith: { n: 'Espectro', kind: 'wraith', hp: 32, spd: 72, dmg: 6, r: 10, xp: 3, col: '#7fd0e8', w: 4, from: 4, invis: 1, d: { coin: [0.3, 1, 2], frag: 0.05 } },
    ogre: { n: 'Ogro Blindado', kind: 'ogre', hp: 170, spd: 30, dmg: 22, r: 20, xp: 10, col: '#8a8f99', w: 3, from: 5, d: { coin: [0.8, 3, 6], frag: 0.1, relic: 0.05 } },
    spider: { n: 'Aranha Abissal', kind: 'spider', hp: 14, spd: 98, dmg: 3, r: 8, xp: 1, col: '#4a3a6a', w: 6, from: 3, slow: 1, d: { coin: [0.25, 1, 1] } },
    imp: { n: 'Demônio Menor', kind: 'imp', hp: 85, spd: 56, dmg: 14, r: 13, xp: 6, col: '#c43a2a', w: 4, from: 6, boom: 1, d: { coin: [0.6, 2, 4], frag: 0.12, rare: 0.1 } },
    knight: { n: 'Cavaleiro Corrompido', kind: 'knight', hp: 110, spd: 44, dmg: 16, r: 14, xp: 8, col: '#5a4a78', w: 3, from: 8, shield: 40, d: { coin: [0.7, 2, 5], frag: 0.1, rare: 0.06 } },
    priest: { n: 'Sacerdote Profano', kind: 'cultist', hp: 55, spd: 38, dmg: 5, r: 10, xp: 6, col: '#3aa070', w: 2, from: 7, heal: 1, d: { coin: [0.6, 2, 3], frag: 0.08 } },
    summoner: { n: 'Invocador Sombrio', kind: 'cultist', hp: 60, spd: 36, dmg: 6, r: 10, xp: 7, col: '#5a3a8a', w: 2, from: 9, summon: 1, d: { coin: [0.6, 2, 4], frag: 0.1 } },
    warden: { n: 'Guardião Profano', kind: 'knight', hp: 90, spd: 40, dmg: 12, r: 14, xp: 7, col: '#3a8aa8', w: 2, from: 10, guard: 1, shield: 30, d: { coin: [0.6, 2, 4], frag: 0.1 } },
    breaker: { n: 'Aríete Maldito', kind: 'ogre', hp: 140, spd: 52, dmg: 30, r: 18, xp: 8, col: '#9a5a3a', w: 2, from: 8, tower: 1, d: { coin: [0.7, 3, 5], frag: 0.08 } },
    bat: { n: 'Morcego', kind: 'wraith', hp: 8, spd: 120, dmg: 3, r: 7, xp: 0.5, col: '#4a2a3a', w: 0, from: 99, d: {} },
    drake: { n: 'Draco Cinzento', kind: 'drake', hp: 420, spd: 48, dmg: 26, r: 22, xp: 24, col: '#8a3a2a', w: 1, from: 14, rng: 160, d: { coin: [1, 6, 12], frag: 0.3, rare: 0.25, relic: 0.12 } }
  };

  /* Chefes: aparecem a cada 5 ondas. atk[fase] = ataques disponíveis. */
  T.BOSS = [
    { id: 'skeleking', n: 'Rei Esqueleto', kind: 'skeleking', hp: 1800, spd: 32, dmg: 34, r: 34, xp: 160, col: '#d9d2b8', minion: 'ghoul', atk: [['slam', 'summon'], ['slam', 'summon', 'fan'], ['slam', 'ring', 'summon', 'fan']], cd: 3.2 },
    { id: 'colossus', n: 'Colosso Abissal', kind: 'colossus', hp: 3200, spd: 26, dmg: 46, r: 42, xp: 260, col: '#3a5a7a', minion: 'spider', atk: [['slam', 'charge'], ['slam', 'hazard', 'charge'], ['slam', 'hazard', 'ring', 'summon']], cd: 3.0 },
    { id: 'infernal', n: 'Dragão Infernal', kind: 'dragon', hp: 4600, spd: 44, dmg: 52, r: 40, xp: 380, col: '#c4402a', minion: 'imp', atk: [['fan', 'charge'], ['fan', 'hazard', 'charge'], ['fan', 'ring', 'hazard', 'summon']], cd: 2.6 },
    { id: 'devourer', n: 'Devorador de Almas', kind: 'devourer', hp: 6000, spd: 38, dmg: 58, r: 38, xp: 520, col: '#3ae0a0', minion: 'wraith', atk: [['fan', 'summon'], ['fan', 'summon', 'teleport'], ['ring', 'fan', 'summon', 'teleport']], cd: 2.4 },
    { id: 'voidlord', n: 'Senhor do Vazio', kind: 'voidlord', hp: 8200, spd: 40, dmg: 66, r: 40, xp: 760, col: '#8a3ae0', minion: 'knight', atk: [['ring', 'teleport'], ['ring', 'teleport', 'hazard', 'summon'], ['ring', 'fan', 'teleport', 'hazard', 'summon', 'slam']], cd: 2.2 }
  ];

  /* Heróis. spec = habilidade especial. */
  T.CLS = {
    knight: { n: 'Kael', title: 'O Cavaleiro Exilado', cls: 'Guerreiro', diff: 'Fácil', hp: 140, dmg: 14, rate: 1.5, rng: 70, spd: 127, melee: 1, col: '#9a1f2e', col2: '#2a2a30', unlock: 0, special: 'Muralha de Sangue', sd: 'Cria uma barreira no núcleo e fere os inimigos ao redor.', story: 'Jurou proteger a fortaleza que o baniu. Resistente e brutal.', bonus: { dr: 0.08 }, att: [5, 2, 4] },
    mage: { n: 'Lyra', title: 'A Bruxa do Véu', cls: 'Maga', diff: 'Média', hp: 80, dmg: 12, rate: 1.3, rng: 245, spd: 117, col: '#8a4ae0', col2: '#2a1a40', unlock: 40, special: 'Fenda Arcana', sd: 'Abre uma ruptura que causa dano mágico contínuo numa região.', story: 'Lê o que o véu esconde. Frágil, mas cada magia varre o campo.', bonus: { magic: 0.2, area: 0.15 }, att: [2, 5, 3] },
    archer: { n: 'Edric', title: 'O Último Arqueiro', cls: 'Atirador', diff: 'Média', hp: 90, dmg: 10, rate: 2.0, rng: 285, spd: 132, col: '#3a7a4a', col2: '#3a2a1a', unlock: 40, special: 'Chuva de Flechas', sd: 'Dispara uma sequência de flechas sobre uma área.', story: 'Não erra. O último de uma guarda que já não existe.', bonus: { crit: 0.08, pierce: 1 }, att: [3, 4, 5] },
    necro: { n: 'Morvan', title: 'O Necromante', cls: 'Invocador', diff: 'Difícil', hp: 85, dmg: 8, rate: 1.1, rng: 215, spd: 117, col: '#3ae0a0', col2: '#10201a', unlock: 100, special: 'Exército dos Mortos', sd: 'Invoca criaturas espectrais temporárias.', story: 'Negocia com os mortos. Eles nunca cobram juros.', bonus: { summon: 2 }, att: [2, 3, 4] },
    paladin: { n: 'Seraphine', title: 'A Paladina Caída', cls: 'Guardiã', diff: 'Média', hp: 150, dmg: 11, rate: 1.2, rng: 78, spd: 121, melee: 1, col: '#d6a84a', col2: '#4a3a1a', unlock: 100, special: 'Luz do Último Santuário', sd: 'Cura o núcleo e fortalece as torres próximas.', story: 'Suas asas quebradas ainda guardam a última luz.', bonus: { regen: 1, tdmg: 0.1 }, att: [4, 2, 3] },
    assassin: { n: 'Vex', title: 'O Assassino das Sombras', cls: 'Assassino', diff: 'Difícil', hp: 75, dmg: 13, rate: 2.3, rng: 92, spd: 151, melee: 1, col: '#5a4a8a', col2: '#14141c', unlock: 80, special: 'Execução Sombria', sd: 'Ataca em sequência o inimigo mais perigoso ao alcance.', story: 'Caça o alvo que importa. O resto, deixa para as torres.', bonus: { crit: 0.18, critDmg: 0.5 }, att: [3, 5, 2] }
  };
  T.CLSORDER = ['knight', 'mage', 'archer', 'necro', 'paladin', 'assassin'];

  /* Mapas: paleta, decoração, clima, evento ambiental e inimigos exclusivos. */
  T.MAPS = {
    forest: { n: 'Floresta Corrompida', g: ['#1b2a1c', '#223422'], deco: 'tree', weather: 'motes', dark: 0.35, event: 'wolves', pool: ['ghoul', 'ashhound', 'spider', 'cultist'], unlock: 0, tint: '#6fd05a' },
    cemetery: { n: 'Cemitério Antigo', g: ['#22222a', '#2a2a34'], deco: 'grave', weather: 'rain', dark: 0.5, event: 'risen', pool: ['ghoul', 'wraith', 'cultist', 'knight'], unlock: 30, tint: '#9fb4d0' },
    frozen: { n: 'Reino Congelado', g: ['#2a3644', '#33445a'], deco: 'ice', weather: 'snow', dark: 0.3, event: 'blizzard', pool: ['ashhound', 'ghoul', 'wraith', 'ogre'], unlock: 60, tint: '#9fe0ff' },
    desert: { n: 'Deserto Abandonado', g: ['#3a2f20', '#463a28'], deco: 'cactus', weather: 'dust', dark: 0.2, event: 'sandstorm', pool: ['ghoul', 'spider', 'ogre', 'imp'], unlock: 90, tint: '#e8b86a' },
    volcano: { n: 'Vulcão Infernal', g: ['#2a1814', '#3a201a'], deco: 'lava', weather: 'ash', dark: 0.45, event: 'eruption', pool: ['imp', 'ashhound', 'knight', 'ogre'], unlock: 130, tint: '#ff7a3a' },
    ruins: { n: 'Ruínas Mágicas', g: ['#1e1a2e', '#282240'], deco: 'ruin', weather: 'motes', dark: 0.5, event: 'surge', pool: ['wraith', 'cultist', 'knight', 'summoner', 'priest'], unlock: 170, tint: '#b06cff' },
    void: { n: 'Dimensão do Vazio', g: ['#0e0a18', '#161026'], deco: 'void', weather: 'motes', dark: 0.6, event: 'rift', pool: ['wraith', 'imp', 'summoner', 'knight', 'ogre'], unlock: 250, tint: '#8a3ae0' }
  };
  T.MAPORDER = ['forest', 'cemetery', 'frozen', 'desert', 'volcano', 'ruins', 'void'];

  T.UP = [
    { id: 'hp', n: 'Vigor Eterno', d: '+8% de vida por nível.', max: 10, cost: function (l) { return 20 + l * 15; } },
    { id: 'dmg', n: 'Lâmina Ancestral', d: '+5% de dano por nível.', max: 10, cost: function (l) { return 25 + l * 18; } },
    { id: 'xp', n: 'Mente Desperta', d: '+5% de XP por nível.', max: 10, cost: function (l) { return 20 + l * 14; } },
    { id: 'coin', n: 'Cofre do Reino', d: '+5% de moedas por nível.', max: 10, cost: function (l) { return 15 + l * 12; } }
  ];
  T.SKINS = { base: { n: 'Original', cost: 0, hue: 0 }, ember: { n: 'Brasa', cost: 50, hue: -35 }, frost: { n: 'Geada', cost: 50, hue: 150 }, void: { n: 'Vazio', cost: 120, hue: 250 } };

  T.ACH = [
    { id: 'first', n: 'Primeiro Sangue', d: 'Derrote um inimigo.', rw: 5, ok: function (s) { return s.kills >= 1; } },
    { id: 'k500', n: 'Ceifador', d: 'Derrote 500 inimigos no total.', rw: 15, ok: function (s) { return s.total >= 500; } },
    { id: 'k5000', n: 'Praga da Noite', d: 'Derrote 5000 inimigos no total.', rw: 60, ok: function (s) { return s.total >= 5000; } },
    { id: 'l10', n: 'Despertar', d: 'Chegue ao nível 10 numa partida.', rw: 10, ok: function (s) { return s.lvl >= 10; } },
    { id: 'l25', n: 'Lenda Viva', d: 'Chegue ao nível 25.', rw: 40, ok: function (s) { return s.lvl >= 25; } },
    { id: 'w10', n: 'Madrugada', d: 'Sobreviva até a onda 10.', rw: 20, ok: function (s) { return s.wave >= 10; } },
    { id: 'w20', n: 'Fortaleza Inabalável', d: 'Sobreviva até a onda 20.', rw: 70, ok: function (s) { return s.wave >= 20; } },
    { id: 'boss1', n: 'Quebra-Coroas', d: 'Derrote um chefe.', rw: 25, ok: function (s) { return s.bosses >= 1; } },
    { id: 'syn1', n: 'Alquimista', d: 'Descubra uma sinergia.', rw: 15, ok: function (s) { return s.syn >= 1; } },
    { id: 'tow10', n: 'Engenheiro Sombrio', d: 'Construa 10 torres numa partida.', rw: 15, ok: function (s) { return s.towers >= 10; } },
    { id: 'myth', n: 'Toque Mítico', d: 'Adquira uma habilidade mítica.', rw: 40, ok: function (s) { return s.mythic >= 1; } }
  ];
})(window.TD);

'use strict';
/* NOCTARIA — arte procedural (sprites vetoriais pré-renderizados em canvas, com cache).
   Para trocar por arte definitiva: T.Art.override('chave', imagemOuCanvas). As chaves seguem
   "<tipo>_<cor>_<quadro>_<tamanho>"; veja T.Art.key(). Quadros: 0/1 = andar, 2 = ataque. */
(function (T) {
  var Art = T.Art = { cache: {}, over: {}, white: {} };
  function mk(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function h2r(h) { h = h.replace('#', ''); return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; }
  function r2h(r) { return '#' + r.map(function (v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? '0' : '') + v.toString(16); }).join(''); }
  function shade(h, a) { var r = h2r(h); return r2h(r.map(function (v) { return a < 0 ? v * (1 + a) : v + (255 - v) * a; })); }
  function hueShift(h, deg) {
    if (!deg) return h; var r = h2r(h).map(function (v) { return v / 255; }), mx = Math.max(r[0], r[1], r[2]), mn = Math.min(r[0], r[1], r[2]), l = (mx + mn) / 2, d = mx - mn, hh = 0, s = 0;
    if (d) { s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); hh = mx === r[0] ? (r[1] - r[2]) / d + (r[1] < r[2] ? 6 : 0) : mx === r[1] ? (r[2] - r[0]) / d + 2 : (r[0] - r[1]) / d + 4; hh *= 60; }
    hh = (hh + deg + 360) % 360;
    function f(n) { var k = (n + hh / 30) % 12, a = s * Math.min(l, 1 - l); return l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1))); }
    return r2h([f(0) * 255, f(8) * 255, f(4) * 255]);
  }
  Art.shade = shade; Art.hueShift = hueShift;
  function lg(c, x0, y0, x1, y1, a, b) { var g = c.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, a); g.addColorStop(1, b); return g; }
  function rg(c, x, y, r0, r1, a, b) { var g = c.createRadialGradient(x, y, r0, x, y, r1); g.addColorStop(0, a); g.addColorStop(1, b); return g; }
  function ell(c, x, y, rx, ry, f, st) { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, 6.2832); if (f) { c.fillStyle = f; c.fill(); } if (st) { c.strokeStyle = st; c.lineWidth = 1; c.stroke(); } }
  function poly(c, p, f, st) { c.beginPath(); c.moveTo(p[0][0], p[0][1]); for (var i = 1; i < p.length; i++) c.lineTo(p[i][0], p[i][1]); c.closePath(); if (f) { c.fillStyle = f; c.fill(); } if (st) { c.strokeStyle = st; c.lineWidth = 1; c.stroke(); } }
  function line(c, x0, y0, x1, y1, w, col) { c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.stroke(); }
  function glow(c, x, y, r, col, a) { c.save(); c.globalAlpha = a == null ? 1 : a; c.fillStyle = rg(c, x, y, 0, r, col, 'rgba(0,0,0,0)'); c.fillRect(x - r, y - r, r * 2, r * 2); c.restore(); }
  var OUT = 'rgba(8,6,12,0.7)';
  Art.extra = {}; Art.h = { ell: ell, poly: poly, line: line, glow: glow, rg: rg, lg: lg, shade: shade, OUT: OUT };

  /* ---------- Humanoides ---------- */
  function humanoid(c, o, f) {
    var w = o.w || 1, hs = o.hs || 1, by = o.hunch ? 4 : 0, bob = f === 1 ? 1 : 0, la = f === 0 ? 3 : f === 1 ? -3 : 0, atk = f === 2;
    var cloth = o.cloth, cl2 = shade(cloth, -0.35), skin = o.skin;
    if (o.wings) { poly(c, [[26, 30], [6, 14 + bob], [10, 26], [4, 34], [16, 36], [26, 40]], shade(typeof o.wings === 'string' ? o.wings : '#3a1218', -0.1), OUT); poly(c, [[38, 30], [58, 14 + bob], [54, 26], [60, 34], [48, 36], [38, 40]], shade(typeof o.wings === 'string' ? o.wings : '#3a1218', -0.1), OUT); }
    if (o.angelwings) { [[-1, 0], [1, 0]].forEach(function (s) { var sx = s[0]; poly(c, [[32 + sx * 6, 30], [32 + sx * 28, 10 + bob], [32 + sx * 22, 22], [32 + sx * 30, 28], [32 + sx * 20, 32], [32 + sx * 24, 38], [32 + sx * 8, 38]], '#d8c690', 'rgba(60,40,10,0.7)'); }); }
    if (o.cape) poly(c, [[24, 28 + by], [40, 28 + by], [46, 57], [38, 53], [32, 58], [26, 53], [18, 57]], lg(c, 0, 28, 0, 58, o.cape, shade(o.cape, -0.5)), OUT);
    if (o.robe) {
      poly(c, [[22, 56 + bob], [42, 56 + bob], [38, 32], [26, 32]], lg(c, 0, 32, 0, 58, cloth, cl2), OUT);
      c.beginPath(); c.moveTo(22, 56 + bob); for (var i = 0; i < 5; i++) c.quadraticCurveTo(24 + i * 4.5, 60 + bob, 26 + i * 4.5, 56 + bob); c.fillStyle = cl2; c.fill();
    } else {
      var lc = o.legs || shade(cloth, -0.4);
      c.fillStyle = lc; c.fillRect(26 + la * 0.5, 44, 5.5, 13 - (la > 0 ? 1 : 0)); c.fillRect(32.5 - la * 0.5, 44, 5.5, 13 - (la < 0 ? 1 : 0));
      c.fillStyle = shade(lc, -0.3); c.fillRect(25 + la * 0.5, 55, 7.5, 3); c.fillRect(32 - la * 0.5, 55, 7.5, 3);
      if (o.skeleton) { c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 0.8; for (i = 0; i < 3; i++) { c.beginPath(); c.moveTo(26, 47 + i * 3); c.lineTo(31, 47 + i * 3); c.stroke(); } }
    }
    // braço de trás + arma de trás
    var ay = 33 + by, ax = 32 - 9 * w;
    line(c, ax, ay, ax - 2 + (atk ? 0 : -la * 0.3), ay + 11, 3.6, skin);
    // tronco
    var tw = 8 * w;
    c.save(); c.beginPath(); c.rect(32 - tw, 29 + by, tw * 2, 17 - by); c.fillStyle = lg(c, 32 - tw, 0, 32 + tw, 0, shade(cloth, 0.18), cl2); c.fill(); c.strokeStyle = OUT; c.lineWidth = 1; c.stroke(); c.restore();
    if (o.skeleton) { c.strokeStyle = 'rgba(30,25,20,0.7)'; c.lineWidth = 1; for (i = 0; i < 4; i++) { c.beginPath(); c.moveTo(32 - tw + 2, 32 + by + i * 3.2); c.lineTo(32 + tw - 2, 32 + by + i * 3.2); c.stroke(); } }
    if (o.armor) { c.fillStyle = shade(o.armorCol || '#8a8f9a', 0.05); c.fillRect(32 - tw + 1, 31 + by, tw * 2 - 2, 4); c.strokeStyle = 'rgba(0,0,0,0.45)'; c.strokeRect(32 - tw + 1, 31 + by, tw * 2 - 2, 4); ell(c, 32 - tw - 1, 31 + by, 4, 3.2, shade(o.armorCol || '#8a8f9a', 0.15), OUT); ell(c, 32 + tw + 1, 31 + by, 4, 3.2, shade(o.armorCol || '#8a8f9a', 0.15), OUT); }
    c.fillStyle = o.belt || '#2a2018'; c.fillRect(32 - tw, 43, tw * 2, 2.2); c.fillStyle = o.trim || '#b89a4a'; c.fillRect(31, 42.8, 2, 2.6);
    if (o.emblem) { c.fillStyle = o.emblem; c.beginPath(); c.moveTo(32, 34 + by); c.lineTo(35, 38 + by); c.lineTo(32, 42 + by); c.lineTo(29, 38 + by); c.fill(); }
    // cabeça
    var hy = 22 + by, hr = 7.4 * hs;
    ell(c, 32, hy, hr, hr * 1.05, rg(c, 29, hy - 2, 1, hr * 1.3, shade(skin, 0.2), shade(skin, -0.25)), OUT);
    if (o.skeleton) { c.fillStyle = 'rgba(20,15,12,0.85)'; ell(c, 29, hy - 1, 2, 2.4, 'rgba(20,15,12,0.9)'); ell(c, 35, hy - 1, 2, 2.4, 'rgba(20,15,12,0.9)'); c.fillRect(29.5, hy + 4, 5, 2); }
    else if (!o.mask) { ell(c, 29.4, hy - 0.5, 1.6, 1.3, '#0a0608'); ell(c, 34.6, hy - 0.5, 1.6, 1.3, '#0a0608'); }
    if (o.eyes) { glow(c, 29.4, hy - 0.5, 4, o.eyes, 0.9); glow(c, 34.6, hy - 0.5, 4, o.eyes, 0.9); ell(c, 29.4, hy - 0.5, 1, 0.9, o.eyes); ell(c, 34.6, hy - 0.5, 1, 0.9, o.eyes); }
    if (o.fangs) { c.fillStyle = '#eee'; c.fillRect(30, hy + 3.5, 1.2, 2); c.fillRect(33, hy + 3.5, 1.2, 2); }
    if (o.mask) { poly(c, [[26, hy - 3], [38, hy - 3], [37, hy + 6], [32, hy + 8], [27, hy + 6]], o.mask, OUT); ell(c, 29.4, hy - 0.5, 1.6, 1.1, '#0a0608'); ell(c, 34.6, hy - 0.5, 1.6, 1.1, '#0a0608'); if (o.eyes) { ell(c, 29.4, hy - 0.5, 1, 0.8, o.eyes); ell(c, 34.6, hy - 0.5, 1, 0.8, o.eyes); } }
    if (o.helm) { c.fillStyle = lg(c, 24, 0, 40, 0, shade(o.armorCol || '#8a8f9a', 0.2), shade(o.armorCol || '#8a8f9a', -0.35)); c.beginPath(); c.arc(32, hy - 1, hr + 1, Math.PI, 0); c.lineTo(32 + hr + 1, hy + 2); c.lineTo(32 - hr - 1, hy + 2); c.closePath(); c.fill(); c.strokeStyle = OUT; c.stroke(); c.fillStyle = '#0a0608'; c.fillRect(27, hy, 10, 2); if (o.eyes) { c.fillStyle = o.eyes; c.fillRect(29, hy + 0.4, 2, 1); c.fillRect(33, hy + 0.4, 2, 1); } }
    if (o.hood) { var hc = o.hoodCol || shade(cloth, -0.15); c.beginPath(); c.moveTo(23, hy + 7); c.quadraticCurveTo(22, hy - 12, 32, hy - 10); c.quadraticCurveTo(42, hy - 12, 41, hy + 7); c.quadraticCurveTo(32, hy + 3, 23, hy + 7); c.fillStyle = lg(c, 0, hy - 10, 0, hy + 7, shade(hc, 0.1), shade(hc, -0.45)); c.fill(); c.strokeStyle = OUT; c.stroke(); ell(c, 32, hy + 1, 5, 4.5, '#06040a'); if (o.eyes) { glow(c, 29.5, hy + 1, 4, o.eyes, 0.9); glow(c, 34.5, hy + 1, 4, o.eyes, 0.9); ell(c, 29.5, hy + 1, 1, 0.8, o.eyes); ell(c, 34.5, hy + 1, 1, 0.8, o.eyes); } }
    if (o.horns) { poly(c, [[26, hy - 4], [22, hy - 14], [30, hy - 6]], '#e8dcc0', OUT); poly(c, [[38, hy - 4], [42, hy - 14], [34, hy - 6]], '#e8dcc0', OUT); }
    if (o.crown) { poly(c, [[25, hy - 5], [26, hy - 12], [29, hy - 8], [32, hy - 14], [35, hy - 8], [38, hy - 12], [39, hy - 5]], lg(c, 0, hy - 14, 0, hy - 5, '#e8c860', '#8a6a20'), OUT); }
    if (o.hair) { c.fillStyle = o.hair; c.beginPath(); c.arc(32, hy - 2, hr + 0.8, Math.PI * 1.05, Math.PI * 1.95); c.fill(); }
    // braço da frente + arma
    var fx = 32 + 9 * w, fy = 33 + by, hx, hy2;
    if (atk) { hx = fx + 11; hy2 = fy - 1; } else { hx = fx + 1 + la * 0.3; hy2 = fy + 11; }
    line(c, fx, fy, hx, hy2, 3.8, skin); ell(c, hx, hy2, 2.2, 2.2, shade(skin, -0.1));
    weapon(c, o.weapon, hx, hy2, atk, o);
    if (o.shield) { poly(c, [[22, 36], [30, 36], [30, 46], [26, 51], [22, 46]], lg(c, 22, 0, 30, 0, '#6a6a78', '#2a2a34'), OUT); c.fillStyle = o.shield === true ? '#b02a3a' : o.shield; c.fillRect(25, 38, 2, 8); }
    if (o.claws) { c.strokeStyle = '#ddd'; c.lineWidth = 1; for (i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(hx + i, hy2 + 1); c.lineTo(hx + i + 1, hy2 + 5); c.stroke(); } }
  }
  function weapon(c, kind, x, y, atk, o) {
    switch (kind) {
      case 'sword': case 'greatsword': { var len = kind === 'greatsword' ? 30 : 20, a = atk ? -0.5 : -1.25; var ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len; line(c, x, y, ex, ey, kind === 'greatsword' ? 4.4 : 3.2, o.blade || '#cfd4dc'); line(c, x, y, ex, ey, 1.2, '#fff'); line(c, x - Math.sin(a) * 4, y + Math.cos(a) * 4, x + Math.sin(a) * 4, y - Math.cos(a) * 4, 2, '#7a5a2a'); if (o.bladeGlow) glow(c, ex, ey, 9, o.bladeGlow, 0.7); break; }
      case 'staff': case 'skullstaff': case 'staffRed': { var ex2 = x + 2, ey2 = y - 26; line(c, x, y + 6, ex2, ey2, 2.2, '#4a3220'); if (kind === 'skullstaff') { ell(c, ex2, ey2 - 2, 3.6, 3.2, '#e8e0cc', OUT); ell(c, ex2 - 1.2, ey2 - 2, 0.9, 1, '#0a0a0a'); ell(c, ex2 + 1.2, ey2 - 2, 0.9, 1, '#0a0a0a'); glow(c, ex2, ey2 - 2, 9, o.orb || '#3ae0a0', 0.8); } else { ell(c, ex2, ey2 - 1, 3, 3, o.orb || (kind === 'staffRed' ? '#ff3a5a' : '#c08aff')); glow(c, ex2, ey2 - 1, atk ? 14 : 9, o.orb || (kind === 'staffRed' ? '#ff3a5a' : '#c08aff'), 0.85); } break; }
      case 'bow': { c.strokeStyle = '#7a5a2a'; c.lineWidth = 2; c.beginPath(); c.arc(x + 1, y - 2, 14, -1.3, 1.3); c.stroke(); line(c, x + 1 + Math.cos(-1.3) * 14, y - 2 + Math.sin(-1.3) * 14, x + 1 + Math.cos(1.3) * 14, y - 2 + Math.sin(1.3) * 14, 0.7, '#e8e0cc'); if (atk) line(c, x - 6, y - 2, x + 14, y - 2, 1.2, '#e0cfa0'); break; }
      case 'dagger2': { var a1 = atk ? -0.2 : -1.2; line(c, x, y, x + Math.cos(a1) * 12, y + Math.sin(a1) * 12, 2.6, '#cfd4dc'); line(c, x - 14, y + 3, x - 14 + Math.cos(a1 + 0.4) * 11, y + 3 + Math.sin(a1 + 0.4) * 11, 2.4, '#b8bec8'); break; }
      case 'club': line(c, x, y + 4, x + 6, y - 20, 4, '#5a4026'); ell(c, x + 7, y - 21, 6, 7, '#6a4a2c', OUT); c.fillStyle = '#bbb'; c.fillRect(x + 3, y - 24, 2, 3); c.fillRect(x + 9, y - 20, 2, 3); break;
      case 'fork': line(c, x, y + 6, x + 2, y - 20, 1.6, '#3a1a1a'); poly(c, [[x - 2, y - 20], [x + 2, y - 28], [x + 6, y - 20]], '#d8d0c0', OUT); break;
      case 'holysword': { var a3 = atk ? -0.5 : -1.2, len2 = 26; var gx = x + Math.cos(a3) * len2, gy = y + Math.sin(a3) * len2; glow(c, (x + gx) / 2, (y + gy) / 2, 16, '#ffe9a0', 0.5); line(c, x, y, gx, gy, 3.6, '#fff4c0'); line(c, x, y, gx, gy, 1.2, '#fff'); line(c, x - Math.sin(a3) * 4, y + Math.cos(a3) * 4, x + Math.sin(a3) * 4, y - Math.cos(a3) * 4, 2, '#b8902a'); break; }
    }
  }

  var LOOK = {
    ghoul: { t: 'hum', skin: '#8fa070', cloth: '#4a4a3a', hunch: 1, w: 0.92, eyes: '#ffe070', claws: 1, fangs: 1, hair: '#2a2a22' },
    cultist: { t: 'hum', skin: '#c9a98a', cloth: '#7a2040', robe: 1, hood: 1, eyes: '#ff4060', weapon: 'staffRed' },
    ogre: { t: 'hum', skin: '#8a8f78', cloth: '#5a5a62', armor: 1, armorCol: '#6a6a72', w: 1.5, hs: 1.15, weapon: 'club', eyes: '#ffb040', helm: 1, belt: '#3a2a1a' },
    imp: { t: 'hum', skin: '#c43a2a', cloth: '#3a1a1a', horns: 1, wings: 1, w: 0.8, hs: 1.1, eyes: '#ffee66', weapon: 'fork', fangs: 1 },
    knight: { t: 'hum', skin: '#9a9aa8', cloth: '#4a3a68', armor: 1, armorCol: '#5a5a70', helm: 1, shield: '#6a2a8a', weapon: 'sword', eyes: '#b060ff', cape: '#2a1a40', blade: '#a8a0c0' },
    skel: { t: 'hum', skin: '#d9d2b8', cloth: '#6a6250', skeleton: 1, w: 0.8, eyes: '#7fe0c0', weapon: 'sword' },
    skeleking: { t: 'hum', skin: '#d9d2b8', cloth: '#3a2a4a', skeleton: 1, w: 1.35, hs: 1.2, crown: 1, cape: '#4a1a2a', weapon: 'greatsword', blade: '#b8c0c8', bladeGlow: '#7fe0c0', eyes: '#7fe0c0', armor: 1, armorCol: '#4a4a50', trim: '#e8c860' },
    hero_knight: { t: 'hum', skin: '#c8a890', cloth: '#2a2a32', armor: 1, armorCol: '#4a4a56', helm: 1, cape: '#7a1a22', weapon: 'greatsword', blade: '#b8bcc4', bladeGlow: '#ff3a4a', eyes: '#ff5a5a', emblem: '#9a1f2e', w: 1.15, trim: '#8a6a2a' },
    hero_mage: { t: 'hum', skin: '#d8b8a0', cloth: '#3a2058', robe: 1, hood: 1, hoodCol: '#2a1848', weapon: 'staff', orb: '#c08aff', eyes: '#d8a8ff' },
    hero_archer: { t: 'hum', skin: '#d0a888', cloth: '#3a5a3a', armor: 1, armorCol: '#5a4630', hood: 1, hoodCol: '#2a3a2a', cape: '#3a2a1a', weapon: 'bow', eyes: '#b8f090', w: 0.95 },
    hero_necro: { t: 'hum', skin: '#c8d8c0', cloth: '#14201a', robe: 1, mask: '#d8d4c4', hood: 1, hoodCol: '#0e1612', weapon: 'skullstaff', orb: '#3ae0a0', eyes: '#3ae0a0' },
    hero_paladin: { t: 'hum', skin: '#d8b8a0', cloth: '#6a5428', armor: 1, armorCol: '#c8a458', helm: 1, angelwings: 1, cape: '#e8e0cc', weapon: 'holysword', eyes: '#fff0b0', emblem: '#fff0b0', trim: '#fff0b0', w: 1.1 },
    hero_assassin: { t: 'hum', skin: '#c8b0a0', cloth: '#1c1c28', hood: 1, hoodCol: '#2a2438', mask: '#3a3248', cape: '#241c34', weapon: 'dagger2', eyes: '#c8a0ff', w: 0.85, belt: '#5a4a8a' }
  };
  Art.LOOK = LOOK;

  /* ---------- Criaturas não humanoides ---------- */
  function ghost(c, f, col, skulls) {
    var b = f === 1 ? 1.5 : 0, a = f === 2 ? 3 : 0;
    c.save(); c.globalAlpha = 0.92;
    c.beginPath(); c.moveTo(18, 56 + b); c.quadraticCurveTo(14, 20, 32, 14); c.quadraticCurveTo(50, 20, 46, 56 + b);
    for (var i = 0; i < 4; i++) c.quadraticCurveTo(44 - i * 8, 62 + b * (i % 2 ? -1 : 1), 38 - i * 7, 54 + b);
    c.closePath(); c.fillStyle = lg(c, 0, 14, 0, 60, shade(col, 0.35), shade(col, -0.6)); c.fill(); c.strokeStyle = OUT; c.stroke(); c.restore();
    ell(c, 26, 28 + a, 3.4, 4.6, '#06080c'); ell(c, 38, 28 + a, 3.4, 4.6, '#06080c'); glow(c, 26, 28, 6, '#bfefff', 0.7); glow(c, 38, 28, 6, '#bfefff', 0.7); ell(c, 32, 40 + a, 3, 4 + a * 0.4, '#06080c');
    if (skulls) for (i = 0; i < 3; i++) { ell(c, 18 + i * 14, 48, 3.5, 3.2, '#e8e0cc', OUT); }
    line(c, 20, 34, 12, 42 + a, 3, shade(col, 0.2)); line(c, 44, 34, 52, 42 + a, 3, shade(col, 0.2));
  }
  function quad(c, f, col) {
    var l = f === 0 ? 3 : f === 1 ? -3 : 5, lunge = f === 2 ? 4 : 0;
    var dark = '#3a302e', mid = '#5a4a46';
    line(c, 20, 38, 8, 34 + (f === 1 ? 2 : 0), 3, dark);
    [[20, 4], [26, -2], [38, 3], [44, -3]].forEach(function (p, i) { line(c, p[0], 42, p[0] + p[1] * 0.2 + (i % 2 ? l : -l), 57, 3.4, i < 2 ? shade(dark, -0.2) : dark); });
    c.beginPath(); c.ellipse(32, 38, 15, 9, 0, 0, 6.2832); c.fillStyle = lg(c, 0, 29, 0, 47, mid, dark); c.fill(); c.strokeStyle = OUT; c.stroke();
    glow(c, 28, 36, 8, '#ff6a2a', 0.35); for (var i = 0; i < 3; i++) line(c, 24 + i * 5, 34, 26 + i * 5, 41, 0.9, '#ff7a3a');
    poly(c, [[40 + lunge, 30], [49 + lunge, 31], [58 + lunge, 38], [54 + lunge, 42], [44 + lunge, 43], [38 + lunge, 40]], lg(c, 0, 30, 0, 43, mid, dark), OUT);
    poly(c, [[44 + lunge, 31], [46 + lunge, 22], [49 + lunge, 31]], dark, OUT); poly(c, [[50 + lunge, 32], [53 + lunge, 24], [54 + lunge, 33]], dark, OUT);
    glow(c, 49 + lunge, 35, 5, '#ff8a3a', 0.9); ell(c, 49 + lunge, 35, 1.3, 1.2, '#ffe070');
    if (f === 2) { c.fillStyle = '#eee'; c.fillRect(55 + lunge, 39, 1.5, 3); c.fillRect(52 + lunge, 40, 1.5, 3); }
  }
  function spider(c, f, col) {
    var l = f === 0 ? 3 : f === 1 ? -3 : 0;
    for (var s = 0; s < 4; s++) { var yb = 36 + s * 2.2, sw = (s % 2 ? l : -l); [-1, 1].forEach(function (d) { var kx = 32 + d * (12 + s), ky = 26 + s * 2 + sw * 0.3; c.beginPath(); c.moveTo(32 + d * 4, yb); c.lineTo(kx, ky); c.lineTo(32 + d * (18 + s * 2.5), 52 + sw * 0.4); c.strokeStyle = shade(col, -0.2); c.lineWidth = 1.7; c.lineJoin = 'round'; c.stroke(); }); }
    ell(c, 25, 40, 10, 8.5, rg(c, 22, 36, 1, 12, shade(col, 0.3), shade(col, -0.6)), OUT); poly(c, [[22, 36], [25, 44], [28, 36]], '#c03a5a');
    ell(c, 38, 39, 6, 5.2, rg(c, 36, 37, 1, 7, shade(col, 0.4), shade(col, -0.5)), OUT);
    [[36, 37], [38.5, 36.5], [40.5, 38], [37.5, 39]].forEach(function (p) { ell(c, p[0], p[1], 1, 1, '#ff3a5a'); }); glow(c, 38.5, 38, 7, '#ff3a5a', 0.4);
    line(c, 42, 41, 44 + (f === 2 ? 3 : 0), 46, 1.4, '#e8e0cc'); line(c, 40, 42, 40 + (f === 2 ? 3 : 0), 47, 1.4, '#e8e0cc');
  }
  function drake(c, f, col, big) {
    var fl = f === 0 ? -4 : f === 1 ? 3 : 0, lunge = f === 2 ? 4 : 0, dark = shade(col, -0.45), mid = col;
    poly(c, [[26, 34], [4, 10 + fl], [8, 24], [2, 30], [14, 32], [24, 42]], lg(c, 0, 10, 0, 40, shade(mid, -0.1), dark), OUT);
    poly(c, [[38, 34], [60, 10 + fl], [56, 24], [62, 30], [50, 32], [40, 42]], lg(c, 0, 10, 0, 40, shade(mid, -0.1), dark), OUT);
    line(c, 16, 44, 4, 52, 4, dark); poly(c, [[2, 50], [6, 56], [8, 50]], dark);
    [[24, 0], [40, 2]].forEach(function (p, i) { line(c, p[0], 46, p[0] + p[1], 58, 4, i ? dark : shade(dark, -0.2)); });
    c.beginPath(); c.ellipse(32, 42, 17, 11, 0, 0, 6.2832); c.fillStyle = lg(c, 0, 31, 0, 53, shade(mid, 0.15), dark); c.fill(); c.strokeStyle = OUT; c.stroke();
    c.fillStyle = shade(mid, 0.4); for (var i = 0; i < 4; i++) c.fillRect(20 + i * 6, 46, 4, 1.5);
    line(c, 44, 38, 50 + lunge, 24, 6, mid);
    poly(c, [[46 + lunge, 18], [58 + lunge, 20], [62 + lunge, 26], [54 + lunge, 28], [47 + lunge, 26]], lg(c, 0, 18, 0, 28, shade(mid, 0.2), dark), OUT);
    poly(c, [[48 + lunge, 18], [46 + lunge, 8], [51 + lunge, 17]], '#e8dcc0', OUT); poly(c, [[54 + lunge, 19], [56 + lunge, 10], [58 + lunge, 20]], '#e8dcc0', OUT);
    glow(c, 53 + lunge, 22, 5, '#ffee66', 1); ell(c, 53 + lunge, 22, 1.3, 1.2, '#400');
    if (f === 2) { glow(c, 62, 26, 12, '#ff7a2a', 0.9); }
  }
  function colossus(c, f) {
    var a = f === 2 ? -6 : 0, b = f === 1 ? 1.5 : 0, dark = '#1e2e40', mid = '#3a5a7a';
    ell(c, 16, 44 + b, 8, 11, lg(c, 0, 34, 0, 56, mid, dark), OUT); ell(c, 48, 44 + b + a, 8, 11, lg(c, 0, 34, 0, 56, mid, dark), OUT);
    poly(c, [[20, 28], [44, 28], [48, 52 + b], [16, 52 + b]], lg(c, 0, 28, 0, 52, shade(mid, 0.1), dark), OUT);
    [[24, 34], [32, 42], [40, 34], [28, 48], [37, 48]].forEach(function (p) { glow(c, p[0], p[1], 5, '#5ad0ff', 0.6); ell(c, p[0], p[1], 1.4, 1.4, '#bff4ff'); });
    c.strokeStyle = 'rgba(0,0,0,0.6)'; c.lineWidth = 1; c.beginPath(); c.moveTo(22, 30); c.lineTo(28, 40); c.lineTo(24, 50); c.moveTo(42, 30); c.lineTo(36, 40); c.stroke();
    ell(c, 32, 22, 9, 8, lg(c, 0, 14, 0, 30, shade(mid, 0.15), dark), OUT); glow(c, 32, 22, 9, '#5ad0ff', 0.9); ell(c, 32, 22, 2.4, 2.4, '#e8fbff');
    poly(c, [[24, 16], [22, 8], [28, 14]], '#2a3a4c', OUT); poly(c, [[40, 16], [42, 8], [36, 14]], '#2a3a4c', OUT);
    c.fillStyle = dark; c.fillRect(20, 54 + b, 10, 6); c.fillRect(34, 54 + b, 10, 6);
  }
  function voidlord(c, f) {
    var b = f === 1 ? 1.5 : 0, a = f === 2 ? 4 : 0;
    for (var i = 0; i < 5; i++) { var an = i * 1.25 + 0.4; poly(c, [[32 + Math.cos(an) * 24, 30 + Math.sin(an) * 20], [32 + Math.cos(an + 0.2) * 28, 30 + Math.sin(an + 0.2) * 24], [32 + Math.cos(an - 0.2) * 28, 30 + Math.sin(an - 0.2) * 24]], '#6a2ab0', OUT); }
    poly(c, [[16, 58 + b], [48, 58 + b], [42, 26], [22, 26]], lg(c, 0, 26, 0, 58, '#3a1a64', '#0e0618'), OUT);
    glow(c, 32, 40, 12, '#a050ff', 0.8 + a * 0.05); ell(c, 32, 40 - a, 5, 5, rg(c, 31, 39, 0, 6, '#fff', '#8a3ae0'));
    ell(c, 32, 20, 8, 8.5, '#0a0610', OUT); glow(c, 28.5, 20, 5, '#d8a0ff', 0.9); glow(c, 35.5, 20, 5, '#d8a0ff', 0.9); ell(c, 28.5, 20, 1.2, 1.4, '#fff'); ell(c, 35.5, 20, 1.2, 1.4, '#fff');
    poly(c, [[22, 14], [24, 2], [28, 12], [32, 0], [36, 12], [40, 2], [42, 14]], lg(c, 0, 0, 0, 14, '#8a3ae0', '#2a0a50'), OUT);
  }
  function spirit(c, f) {
    var b = f === 1 ? 1 : 0; c.save(); c.globalAlpha = 0.85;
    c.beginPath(); c.moveTo(22, 54 + b); c.quadraticCurveTo(20, 24, 32, 20); c.quadraticCurveTo(44, 24, 42, 54 + b); c.quadraticCurveTo(38, 48, 32, 56); c.quadraticCurveTo(26, 48, 22, 54 + b);
    c.fillStyle = lg(c, 0, 20, 0, 56, '#bfffe8', 'rgba(60,200,150,0.3)'); c.fill(); c.restore();
    ell(c, 28, 32, 2.2, 3, '#063'); ell(c, 36, 32, 2.2, 3, '#063'); glow(c, 32, 40, 14, '#4fe0a0', 0.4);
  }

  /* ---------- Torres (64x80, base em y=74) ---------- */
  function tower(c, type, lv) {
    var D = T.TW[type], col = D.col;
    ell(c, 32, 73, 24, 7, 'rgba(0,0,0,0.35)');
    // base de pedra comum
    poly(c, [[12, 74], [52, 74], [48, 54], [16, 54]], lg(c, 0, 54, 0, 74, '#6a6a74', '#32323c'), OUT);
    c.strokeStyle = 'rgba(0,0,0,0.4)'; c.lineWidth = 1; for (var r = 0; r < 3; r++) { c.beginPath(); c.moveTo(14 + r, 58 + r * 5); c.lineTo(50 - r, 58 + r * 5); c.stroke(); for (var k = 0; k < 3; k++) { c.beginPath(); c.moveTo(20 + k * 11 + (r % 2) * 5, 58 + r * 5); c.lineTo(20 + k * 11 + (r % 2) * 5, 63 + r * 5); c.stroke(); } }
    var trim = lv >= 2 ? '#e8c860' : shade(col, -0.2);
    switch (type) {
      case 'arrow':
        poly(c, [[18, 56], [46, 56], [43, 30], [21, 30]], lg(c, 18, 0, 46, 0, '#9a7a4a', '#5a4026'), OUT); c.fillStyle = '#2a1a0a'; c.fillRect(30, 40, 4, 10);
        for (r = 0; r < 4; r++) { c.fillStyle = '#7a5a30'; c.fillRect(18 + r * 7, 24, 5, 7); c.strokeStyle = OUT; c.strokeRect(18 + r * 7, 24, 5, 7); }
        poly(c, [[40, 24], [40, 8], [54, 12], [40, 16]], '#8a1f2e', OUT); line(c, 40, 24, 40, 6, 1.5, '#4a3220'); c.fillStyle = trim; c.fillRect(21, 29, 22, 2); break;
      case 'cannon':
        poly(c, [[14, 56], [50, 56], [46, 34], [18, 34]], lg(c, 14, 0, 50, 0, '#6e6e78', '#34343e'), OUT); c.fillStyle = trim; c.fillRect(17, 38, 30, 3);
        ell(c, 32, 30, 16, 8, lg(c, 0, 22, 0, 38, '#4a4a54', '#26262e'), OUT); poly(c, [[28, 20], [56, 18], [58, 26], [28, 30]], lg(c, 0, 18, 0, 30, '#5a5a64', '#18181e'), OUT); ell(c, 57, 22, 3, 5, '#0a0a0e'); c.fillStyle = '#8a6a2a'; c.fillRect(38, 20, 3, 9); break;
      case 'fire':
        poly(c, [[19, 56], [45, 56], [42, 34], [22, 34]], lg(c, 0, 34, 0, 56, '#5a3028', '#2a1410'), OUT); ell(c, 32, 33, 15, 6, '#2a1410', OUT); ell(c, 32, 32, 11, 4, '#ff7a2a'); glow(c, 32, 26, 16, '#ff7a2a', 0.8);
        poly(c, [[24, 32], [28, 16], [31, 26], [34, 10], [38, 26], [41, 18], [42, 32]], lg(c, 0, 10, 0, 32, '#ffe070', '#e2342a'), null); c.fillStyle = trim; c.fillRect(22, 40, 20, 2); break;
      case 'ice':
        poly(c, [[22, 56], [42, 56], [38, 36], [26, 36]], lg(c, 0, 36, 0, 56, '#5a8aaa', '#2a4a68'), OUT);
        poly(c, [[32, 2], [40, 30], [32, 38], [24, 30]], lg(c, 24, 0, 40, 0, '#e8fbff', '#4aa8e0'), OUT); poly(c, [[22, 22], [27, 34], [20, 34]], '#9fe0ff', OUT); poly(c, [[42, 18], [46, 34], [38, 34]], '#9fe0ff', OUT); glow(c, 32, 20, 14, '#bfeaff', 0.5); line(c, 32, 4, 32, 34, 0.8, 'rgba(255,255,255,0.8)'); break;
      case 'elec':
        poly(c, [[22, 56], [42, 56], [39, 32], [25, 32]], lg(c, 22, 0, 42, 0, '#6a6a74', '#32323c'), OUT); line(c, 22, 44, 42, 44, 2, '#8a6a2a'); line(c, 24, 36, 40, 36, 2, '#8a6a2a');
        line(c, 32, 32, 32, 14, 3, '#9a8a5a'); ell(c, 32, 12, 8, 8, rg(c, 30, 10, 1, 9, '#fffbd0', '#e8c820'), OUT); glow(c, 32, 12, 20, '#f3e86a', 0.7);
        c.strokeStyle = '#fff8a0'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(26, 8); c.lineTo(31, 12); c.lineTo(28, 14); c.lineTo(35, 18); c.stroke(); line(c, 18, 30, 18, 22, 2, '#9a8a5a'); line(c, 46, 30, 46, 22, 2, '#9a8a5a'); ell(c, 18, 21, 2.2, 2.2, '#f3e86a'); ell(c, 46, 21, 2.2, 2.2, '#f3e86a'); break;
      case 'arcane':
        poly(c, [[24, 56], [40, 56], [36, 20], [28, 20]], lg(c, 24, 0, 40, 0, '#4a3a68', '#1a1230'), OUT); c.fillStyle = '#c08aff'; for (r = 0; r < 4; r++) c.fillRect(30, 26 + r * 7, 4, 2);
        ell(c, 32, 12, 7, 7, rg(c, 30, 10, 0, 8, '#fff', '#8a3ae0'), OUT); glow(c, 32, 12, 22, '#b06cff', 0.7); c.strokeStyle = 'rgba(192,138,255,0.8)'; c.lineWidth = 1.2; c.beginPath(); c.ellipse(32, 12, 15, 5, 0, 0, 6.28); c.stroke(); break;
      case 'poison':
        poly(c, [[20, 56], [44, 56], [46, 42], [18, 42]], lg(c, 0, 42, 0, 56, '#4a5a3a', '#202a18'), OUT); ell(c, 32, 40, 16, 9, '#202a18', OUT); ell(c, 32, 38, 12, 6, '#7be05a'); glow(c, 32, 30, 18, '#6fd05a', 0.6);
        [[26, 30, 3], [34, 26, 4], [38, 33, 2.4]].forEach(function (b) { ell(c, b[0], b[1], b[2], b[2], 'rgba(200,255,160,0.75)', 'rgba(20,60,10,0.6)'); }); c.fillStyle = trim; c.fillRect(18, 44, 28, 2); break;
      case 'sniper':
        poly(c, [[25, 56], [39, 56], [37, 24], [27, 24]], lg(c, 25, 0, 39, 0, '#8a8a82', '#3a3a38'), OUT); poly(c, [[22, 24], [42, 24], [40, 16], [24, 16]], '#5a5a58', OUT); c.fillStyle = '#0a0a0a'; c.fillRect(30, 36, 4, 8);
        line(c, 20, 12, 60, 10, 3.4, '#2a2a2e'); line(c, 20, 12, 60, 10, 1, '#6a6a70'); ell(c, 34, 8, 4, 4, '#18181c', OUT); glow(c, 34, 8, 8, '#ff3a3a', 0.6); ell(c, 34, 8, 1.4, 1.4, '#ff5a5a'); break;
      case 'summon':
        poly(c, [[18, 56], [46, 56], [44, 40], [20, 40]], lg(c, 0, 40, 0, 56, '#5a5a50', '#26261e'), OUT);
        ell(c, 32, 38, 12, 5, '#d8d0b8', OUT); for (r = 0; r < 3; r++) { ell(c, 22 + r * 10, 44, 3.4, 3.2, '#e8e0cc', OUT); ell(c, 21 + r * 10, 44, 0.8, 1, '#111'); ell(c, 23 + r * 10, 44, 0.8, 1, '#111'); }
        poly(c, [[26, 36], [29, 18], [32, 28], [35, 14], [38, 36]], lg(c, 0, 14, 0, 36, '#bfffe8', '#2ac08a'), null); glow(c, 32, 26, 18, '#4fe0a0', 0.7); break;
      case 'support':
        poly(c, [[22, 56], [42, 56], [39, 24], [25, 24]], lg(c, 22, 0, 42, 0, '#d8b860', '#7a5a20'), OUT); poly(c, [[32, 4], [42, 24], [22, 24]], lg(c, 0, 4, 0, 24, '#ffe9a0', '#b8902a'), OUT);
        c.strokeStyle = 'rgba(255,233,160,0.9)'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(32, 8, 8, 3, 0, 0, 6.28); c.stroke(); glow(c, 32, 14, 22, '#ffe9a0', 0.5); c.fillStyle = '#8a1f2e'; c.fillRect(30, 32, 4, 14); break;
    }
    if (lv >= 2) { c.fillStyle = '#e8c860'; c.fillRect(16, 55, 32, 2); ell(c, 32, 52, 2.4, 2.4, '#e8c860', OUT); }
    if (lv >= 3) { poly(c, [[28, 56], [32, 48], [36, 56]], '#e8c860', OUT); }
  }

  /* ---------- Cristal-Mãe (fortaleza) 128x128 ---------- */
  function keep(c) {
    ell(c, 64, 118, 50, 10, 'rgba(0,0,0,0.4)');
    function turret(x, y, w, h, col) { poly(c, [[x, y], [x + w, y], [x + w - 3, y - h], [x + 3, y - h]], lg(c, x, 0, x + w, 0, shade(col, 0.15), shade(col, -0.45)), OUT); c.fillStyle = shade(col, -0.2); for (var i = 0; i < 3; i++) c.fillRect(x + 3 + i * ((w - 8) / 2.2), y - h - 5, (w - 8) / 4, 5); c.fillStyle = '#e8b04a'; c.fillRect(x + w / 2 - 1.5, y - h * 0.6, 3, 7); }
    turret(16, 112, 26, 56, '#5a5a66'); turret(86, 112, 26, 56, '#5a5a66');
    poly(c, [[30, 116], [98, 116], [92, 56], [36, 56]], lg(c, 30, 0, 98, 0, '#7a7a86', '#32323e'), OUT);
    c.strokeStyle = 'rgba(0,0,0,0.35)'; for (var r = 0; r < 6; r++) { c.beginPath(); c.moveTo(32, 64 + r * 9); c.lineTo(96, 64 + r * 9); c.stroke(); }
    poly(c, [[52, 116], [76, 116], [76, 92], [64, 82], [52, 92]], '#0e0a12', OUT); glow(c, 64, 100, 18, '#ff9a3a', 0.4);
    poly(c, [[40, 58], [88, 58], [78, 22], [50, 22]], lg(c, 40, 0, 88, 0, '#6a6a78', '#2a2a34'), OUT);
    poly(c, [[46, 24], [82, 24], [64, 0]], lg(c, 0, 0, 0, 24, '#4a2a4a', '#1a0e1c'), OUT);
    for (var i = 0; i < 3; i++) { poly(c, [[50 + i * 14, 50], [56 + i * 14, 50], [56 + i * 14, 38], [53 + i * 14, 34], [50 + i * 14, 38]], '#0a0610'); glow(c, 53 + i * 14, 42, 8, '#c060ff', 0.35); }
  }

  /* ---------- Cenário: decoração por mapa ---------- */
  function deco(c, kind, t, v, S) {
    var dk = shade(T.MAPS[kind] ? T.MAPS[kind].g[0] : '#222', -0.3);
  }
  function decoSprite(map, t, v) {
    var M = T.MAPS[map], key = 'deco_' + map + '_' + t + '_' + v, cc = Art.cache;
    if (cc[key]) return cc[key];
    var W = t === 'big' ? 72 : t === 'mid' ? 48 : 28, H = t === 'big' ? 90 : t === 'mid' ? 44 : 24, cv = mk(W, H), c = cv.getContext('2d'), d = M.deco, cx = W / 2, by = H - 4;
    ell(c, cx, by, W * 0.34, 4, 'rgba(0,0,0,0.3)');
    var rnd = (v + 1) * 0.37;
    if (t === 'small') {
      if (d === 'tree' || d === 'cactus') { for (var i = 0; i < 5; i++) line(c, cx - 8 + i * 4, by, cx - 9 + i * 4 + (i % 2 ? 2 : -2), by - 8 - (i % 3) * 3, 1.6, d === 'tree' ? shade('#2a4a2a', i * 0.04) : '#6a7a3a'); if (v === 1) { ell(c, cx + 5, by - 2, 2.4, 2.4, '#c8b8d8'); } }
      else if (d === 'grave') { ell(c, cx, by - 2, 7, 3, '#6a6a74', OUT); c.fillStyle = '#d8d0b8'; c.fillRect(cx - 4, by - 3, 8, 1.4); c.fillRect(cx - 3, by - 2.5, 1, 3); }
      else if (d === 'ice') { poly(c, [[cx - 5, by], [cx - 3, by - 10], [cx, by]], '#bfeaff', OUT); poly(c, [[cx, by], [cx + 3, by - 13], [cx + 6, by]], '#8acbf0', OUT); }
      else if (d === 'lava') { ell(c, cx, by - 2, 8, 4, '#2a1a16', OUT); glow(c, cx, by - 3, 8, '#ff6a2a', 0.8); line(c, cx - 5, by - 3, cx + 4, by - 2, 1.2, '#ffb040'); }
      else if (d === 'ruin') { poly(c, [[cx - 8, by], [cx - 6, by - 8], [cx - 1, by - 6], [cx + 1, by]], '#5a566a', OUT); poly(c, [[cx + 2, by], [cx + 5, by - 5], [cx + 9, by]], '#47445a', OUT); }
      else { glow(c, cx, by - 6, 9, '#a050ff', 0.7); poly(c, [[cx - 3, by], [cx, by - 12], [cx + 3, by]], '#6a2ab0', OUT); }
    } else if (t === 'mid') {
      if (d === 'tree') { ell(c, cx, by - 8, 20, 12, rg(c, cx - 4, by - 12, 2, 24, '#2a4a2a', '#0f1e10'), OUT); for (i = 0; i < 6; i++) ell(c, cx - 14 + i * 5.6, by - 4 + (i % 2) * 2, 4.5, 3, '#1c3a22'); }
      else if (d === 'grave') { for (i = 0; i < 3; i++) { var gx = cx - 14 + i * 14, gh = 14 + ((i + v) % 2) * 6; poly(c, [[gx - 6, by], [gx - 6, by - gh + 5], [gx, by - gh], [gx + 6, by - gh + 5], [gx + 6, by]], lg(c, gx - 6, 0, gx + 6, 0, '#8a8a96', '#4a4a56'), OUT); line(c, gx - 2, by - gh + 7, gx + 2, by - gh + 7, 1, '#2a2a30'); line(c, gx, by - gh + 5, gx, by - gh + 11, 1, '#2a2a30'); } }
      else if (d === 'ice') { for (i = 0; i < 4; i++) { var ix = cx - 14 + i * 9, ih = 16 + (i % 2) * 10; poly(c, [[ix - 4, by], [ix, by - ih], [ix + 4, by]], lg(c, ix - 4, 0, ix + 4, 0, '#e8fbff', '#5aa0d8'), OUT); } glow(c, cx, by - 10, 22, '#9fe0ff', 0.25); }
      else if (d === 'cactus') { line(c, cx, by, cx, by - 22, 5, '#4a6a3a'); line(c, cx, by - 12, cx - 9, by - 14, 3.4, '#4a6a3a'); line(c, cx - 9, by - 14, cx - 9, by - 22, 3.4, '#4a6a3a'); line(c, cx, by - 8, cx + 8, by - 10, 3.4, '#4a6a3a'); line(c, cx + 8, by - 10, cx + 8, by - 17, 3.4, '#4a6a3a'); }
      else if (d === 'lava') { poly(c, [[cx - 18, by], [cx - 12, by - 16], [cx - 2, by - 22], [cx + 10, by - 14], [cx + 18, by]], lg(c, 0, by - 22, 0, by, '#4a3030', '#1a1010'), OUT); glow(c, cx, by - 8, 20, '#ff5a1a', 0.5); line(c, cx - 8, by - 14, cx, by - 6, 1.6, '#ff9a3a'); line(c, cx + 2, by - 16, cx + 8, by - 4, 1.6, '#ff9a3a'); }
      else if (d === 'ruin') { c.fillStyle = lg(c, 0, by - 24, 0, by, '#6a667a', '#34324a'); c.fillRect(cx - 18, by - 22, 10, 22); c.strokeStyle = OUT; c.strokeRect(cx - 18, by - 22, 10, 22); poly(c, [[cx + 4, by], [cx + 4, by - 14], [cx + 10, by - 18], [cx + 18, by - 10], [cx + 18, by]], '#55516a', OUT); c.fillStyle = '#2a8a5a'; c.fillRect(cx - 18, by - 22, 10, 2.5); }
      else { for (i = 0; i < 3; i++) { var vx = cx - 10 + i * 10; poly(c, [[vx - 4, by], [vx, by - 18 - i * 4], [vx + 4, by]], lg(c, vx - 4, 0, vx + 4, 0, '#b070ff', '#3a1a64'), OUT); } glow(c, cx, by - 14, 24, '#8a3ae0', 0.4); }
    } else {
      if (d === 'tree') {
        poly(c, [[cx - 6, by], [cx - 3, by - 40], [cx + 3, by - 40], [cx + 7, by]], lg(c, cx - 6, 0, cx + 7, 0, '#4a3a2c', '#1c1410'), OUT);
        line(c, cx, by - 36, cx - 18, by - 52, 3.6, '#2a1e16'); line(c, cx, by - 30, cx + 20, by - 48, 3.2, '#2a1e16'); line(c, cx - 18, by - 52, cx - 26, by - 50, 2, '#2a1e16');
        [[cx - 18, by - 56, 14], [cx + 4, by - 62, 17], [cx + 20, by - 52, 13], [cx - 4, by - 48, 15]].forEach(function (b, i) { ell(c, b[0], b[1], b[2], b[2] * 0.75, rg(c, b[0] - 3, b[1] - 4, 1, b[2], i % 2 ? '#2f5a34' : '#25482a', '#0c1a0e'), OUT); });
        glow(c, cx + 2, by - 30, 6, '#6fd05a', 0.25);
      } else if (d === 'grave') {
        poly(c, [[cx - 14, by], [cx - 14, by - 40], [cx - 8, by - 50], [cx + 6, by - 50], [cx + 14, by - 40], [cx + 14, by]], lg(c, cx - 14, 0, cx + 14, 0, '#9a9aa6', '#3a3a46'), OUT);
        line(c, cx, by - 44, cx, by - 22, 2.4, '#2a2a32'); line(c, cx - 7, by - 36, cx + 7, by - 36, 2.4, '#2a2a32'); c.strokeStyle = 'rgba(0,0,0,0.5)'; c.beginPath(); c.moveTo(cx - 10, by - 12); c.lineTo(cx - 2, by - 20); c.lineTo(cx - 6, by - 28); c.stroke(); ell(c, cx + 8, by - 3, 5, 2.4, '#2a4a2a');
      } else if (d === 'ice') {
        poly(c, [[cx - 14, by], [cx - 6, by - 56], [cx + 2, by - 80], [cx + 8, by - 50], [cx + 16, by]], lg(c, cx - 14, 0, cx + 16, 0, '#eaffff', '#3a88c8'), OUT); poly(c, [[cx - 18, by], [cx - 14, by - 28], [cx - 8, by]], '#9fe0ff', OUT); glow(c, cx, by - 40, 30, '#9fe0ff', 0.3); line(c, cx - 2, by - 70, cx - 4, by - 10, 1, 'rgba(255,255,255,0.8)');
      } else if (d === 'cactus') {
        line(c, cx, by, cx, by - 58, 9, '#4a6a3a'); line(c, cx, by - 30, cx - 18, by - 34, 6, '#4a6a3a'); line(c, cx - 18, by - 34, cx - 18, by - 52, 6, '#4a6a3a'); line(c, cx, by - 20, cx + 17, by - 24, 6, '#4a6a3a'); line(c, cx + 17, by - 24, cx + 17, by - 40, 6, '#4a6a3a'); line(c, cx - 3, by, cx - 3, by - 56, 2, '#6a8a4a');
      } else if (d === 'lava') {
        poly(c, [[cx - 24, by], [cx - 18, by - 40], [cx - 4, by - 64], [cx + 12, by - 44], [cx + 24, by]], lg(c, 0, by - 64, 0, by, '#4a3434', '#140c0c'), OUT); glow(c, cx, by - 24, 34, '#ff5a1a', 0.55);
        for (i = 0; i < 3; i++) { c.strokeStyle = '#ff9a3a'; c.lineWidth = 1.8; c.beginPath(); c.moveTo(cx - 10 + i * 9, by - 52 + i * 4); c.lineTo(cx - 6 + i * 7, by - 30); c.lineTo(cx - 12 + i * 10, by - 8); c.stroke(); }
      } else if (d === 'ruin') {
        c.fillStyle = lg(c, cx - 22, 0, cx - 6, 0, '#7a768a', '#3a384c'); c.fillRect(cx - 24, by - 62, 16, 62); c.strokeStyle = OUT; c.strokeRect(cx - 24, by - 62, 16, 62); poly(c, [[cx - 26, by - 62], [cx - 6, by - 62], [cx - 8, by - 70], [cx - 24, by - 70]], '#8a869a', OUT);
        c.fillStyle = lg(c, cx + 4, 0, cx + 24, 0, '#6a667a', '#34324a'); c.beginPath(); c.moveTo(cx + 4, by); c.lineTo(cx + 4, by - 38); c.lineTo(cx + 14, by - 46); c.lineTo(cx + 24, by - 30); c.lineTo(cx + 24, by); c.fill(); c.stroke(); glow(c, cx - 16, by - 36, 12, '#b06cff', 0.35); c.fillStyle = '#2a8a5a'; c.fillRect(cx - 24, by - 62, 16, 3);
        for (i = 0; i < 3; i++) line(c, cx - 22 + i * 5, by - 56, cx - 22 + i * 5, by - 4, 0.8, 'rgba(0,0,0,0.4)');
      } else {
        for (i = 0; i < 3; i++) { var vx2 = cx - 16 + i * 16, vh = 60 - i * 12 + (v * 6); poly(c, [[vx2 - 7, by], [vx2, by - vh], [vx2 + 7, by]], lg(c, vx2 - 7, 0, vx2 + 7, 0, '#c090ff', '#2a0e50'), OUT); line(c, vx2, by - vh + 4, vx2, by - 4, 0.8, 'rgba(255,255,255,0.5)'); }
        glow(c, cx, by - 34, 36, '#8a3ae0', 0.5);
      }
    }
    cc[key] = cv; return cv;
  }

  /* ---------- Terreno (textura repetida) ---------- */
  function ground(mapId) {
    var key = 'ground_' + mapId; if (Art.cache[key]) return Art.cache[key];
    var M = T.MAPS[mapId], cv = mk(256, 256), c = cv.getContext('2d'), s = (mapId.length * 131) >>> 0;
    function rnd() { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }
    c.fillStyle = lg(c, 0, 0, 256, 256, M.g[0], M.g[1]); c.fillRect(0, 0, 256, 256);
    function wrap(x, y, r, draw) { for (var dx = -256; dx <= 256; dx += 256) for (var dy = -256; dy <= 256; dy += 256) { if (x + dx + r < 0 || x + dx - r > 256 || y + dy + r < 0 || y + dy - r > 256) continue; draw(x + dx, y + dy); } }
    var d = M.deco, i;
    for (i = 0; i < 60; i++) { var x = rnd() * 256, y = rnd() * 256, r = 16 + rnd() * 34, dark = rnd() < 0.55; wrap(x, y, r, function (xx, yy) { c.fillStyle = rg(c, xx, yy, 0, r, dark ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.05)', 'rgba(0,0,0,0)'); c.fillRect(xx - r, yy - r, r * 2, r * 2); }); }
    for (i = 0; i < 160; i++) { x = rnd() * 256; y = rnd() * 256; var sz = 1 + rnd() * 3; c.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.06)'; wrap(x, y, sz, function (xx, yy) { c.fillRect(xx, yy, sz, sz * 0.7); }); }
    // pedras do piso (lajes) e rachaduras
    if (d === 'grave' || d === 'ruin' || d === 'void') { c.strokeStyle = 'rgba(0,0,0,0.28)'; c.lineWidth = 1; for (i = 0; i <= 4; i++) { c.beginPath(); c.moveTo(0, i * 64 + 0.5); c.lineTo(256, i * 64 + 0.5); c.stroke(); for (var j = 0; j < 4; j++) { c.beginPath(); c.moveTo(j * 64 + (i % 2) * 32 + 0.5, i * 64); c.lineTo(j * 64 + (i % 2) * 32 + 0.5, i * 64 + 64); c.stroke(); } } }
    var spec = d === 'tree' ? ['rgba(60,110,50,0.35)', 'rgba(30,70,30,0.4)'] : d === 'ice' ? ['rgba(255,255,255,0.35)', 'rgba(180,220,255,0.3)'] : d === 'cactus' ? ['rgba(200,160,90,0.3)', 'rgba(120,90,50,0.35)'] : d === 'lava' ? ['rgba(255,110,40,0.5)', 'rgba(60,30,20,0.6)'] : d === 'ruin' ? ['rgba(60,150,100,0.25)', 'rgba(110,80,170,0.25)'] : d === 'void' ? ['rgba(160,80,255,0.35)', 'rgba(80,30,160,0.3)'] : ['rgba(120,130,150,0.2)', 'rgba(40,50,40,0.3)'];
    for (i = 0; i < 90; i++) { x = rnd() * 256; y = rnd() * 256; c.fillStyle = spec[i % 2]; wrap(x, y, 6, function (xx, yy) { c.beginPath(); c.ellipse(xx, yy, 1.5 + rnd() * 4, 1 + rnd() * 2.4, rnd() * 3, 0, 6.28); c.fill(); }); }
    if (d === 'lava') for (i = 0; i < 8; i++) { var lx = rnd() * 256, ly = rnd() * 256; c.strokeStyle = 'rgba(255,120,40,0.55)'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(lx, ly); for (j = 0; j < 4; j++) { lx += rnd() * 30 - 15; ly += rnd() * 30 - 5; c.lineTo(lx, ly); } c.stroke(); }
    Art.cache[key] = cv; return cv;
  }
  function fogTile() {
    if (Art.cache.fog) return Art.cache.fog; var cv = mk(256, 256), c = cv.getContext('2d');
    for (var i = 0; i < 14; i++) { var x = Math.random() * 256, y = Math.random() * 256, r = 40 + Math.random() * 60; for (var dx = -256; dx <= 256; dx += 256) for (var dy = -256; dy <= 256; dy += 256) { c.fillStyle = rg(c, x + dx, y + dy, 0, r, 'rgba(200,210,230,0.16)', 'rgba(200,210,230,0)'); c.fillRect(x + dx - r, y + dy - r, r * 2, r * 2); } }
    Art.cache.fog = cv; return cv;
  }
  function lightSprite() {
    if (Art.cache.light) return Art.cache.light; var cv = mk(128, 128), c = cv.getContext('2d'); var g = c.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.45, 'rgba(0,0,0,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, 128, 128); Art.cache.light = cv; return cv;
  }
  function glowSprite(col) {
    var k = 'glow_' + col; if (Art.cache[k]) return Art.cache[k]; var cv = mk(64, 64), c = cv.getContext('2d'); glow(c, 32, 32, 32, col, 1); Art.cache[k] = cv; return cv;
  }
  Art.fog = fogTile; Art.light = lightSprite; Art.glowSprite = glowSprite; Art.ground = ground; Art.deco = decoSprite;

  /* ---------- API pública ---------- */
  Art.key = function (kind, hue, f, size) { return kind + '_' + (hue || 0) + '_' + f + '_' + size; };
  Art.override = function (key, img) { Art.over[key] = img; };
  Art.sprite = function (kind, f, size, hue) {
    size = size || 64; hue = hue || 0; var key = Art.key(kind, hue, f, size);
    if (Art.over[key]) return Art.over[key]; if (Art.cache[key]) return Art.cache[key];
    var cv = mk(size, size), c = cv.getContext('2d'); c.scale(size / 64, size / 64);
    var L = LOOK[kind];
    if (L) {
      var o = L; if (hue) { o = {}; for (var k in L) o[k] = L[k]; ['cloth', 'cape', 'hoodCol', 'emblem', 'armorCol'].forEach(function (q) { if (o[q]) o[q] = hueShift(o[q], hue); }); }
      humanoid(c, o, f);
    }
    else if (kind === 'wraith') ghost(c, f, '#7fd0e8');
    else if (kind === 'devourer') ghost(c, f, '#3ae0a0', true);
    else if (kind === 'hound') quad(c, f);
    else if (kind === 'spider') spider(c, f, '#4a3a6a');
    else if (kind === 'drake') drake(c, f, '#8a3a2a');
    else if (kind === 'dragon') drake(c, f, '#c4402a', true);
    else if (kind === 'colossus') colossus(c, f);
    else if (kind === 'voidlord') voidlord(c, f);
    else if (kind === 'spirit') spirit(c, f);
    else if (Art.extra[kind]) Art.extra[kind](c, f, Art.h);
    else if (kind.indexOf('tower_') === 0) { var p = kind.split('_'); cv.width = 64; cv.height = 80; c = cv.getContext('2d'); tower(c, p[1], +p[2]); }
    else if (kind === 'keep') { cv.width = 128; cv.height = 128; c = cv.getContext('2d'); keep(c); }
    Art.cache[key] = cv; return cv;
  };
  Art.whiteOf = function (kind, f, size, hue) {
    var key = 'w_' + Art.key(kind, hue, f, size); if (Art.white[key]) return Art.white[key];
    var src = Art.sprite(kind, f, size, hue), cv = mk(src.width, src.height), c = cv.getContext('2d'); c.drawImage(src, 0, 0); c.globalCompositeOperation = 'source-atop'; c.fillStyle = 'rgba(255,255,255,0.8)'; c.fillRect(0, 0, cv.width, cv.height);
    Art.white[key] = cv; return cv;
  };
  Art.prewarm = function (list) { list.forEach(function (k) { for (var f = 0; f < 3; f++) Art.sprite(k, f, 64, 0); }); };
})(window.TD);

'use strict';
/* NOCTARIA V6 — Folclore e mitologia: criaturas, chefes, mapa e bestiário.
   Regras (ver FOLCLORE_E_MITOLOGIA.md): figuras de tradição viva (Curupira, Boitatá, Mapinguari, Iara, Caipora…)
   NÃO são inimigos malignos; aqui aparecem como guardiões/neutros. Inimigos hostis vêm de mitologias antigas
   ou de folclore sem culto vivo, sempre marcados como ADAPTAÇÃO FICTÍCIA no bestiário. */
(function (T) {
  var EN = T.EN, BOSS = T.BOSS, MAPS = T.MAPS;

  /* ---------- Dados ---------- */
  EN.draugr = { n: 'Guardião de Cripta', kind: 'draugr', hp: 150, spd: 34, dmg: 20, r: 15, xp: 9, col: '#5a8a8a', w: 2, from: 9, shield: 60, d: { coin: [0.7, 2, 5], frag: 0.12, rare: 0.08 } };
  EN.driedbody = { n: 'Inquilino Sem Sepultura', kind: 'driedbody', hp: 70, spd: 50, dmg: 12, r: 12, xp: 5, col: '#7a5a3a', w: 4, from: 5, revive: 1, d: { coin: [0.5, 1, 3], frag: 0.06 } };
  EN.kappa = { n: 'Espírito do Poço Raso', kind: 'kappa', hp: 60, spd: 66, dmg: 9, r: 11, xp: 4, col: '#4aa070', w: 3, from: 4, rng: 140, shot: '#6fd0ff', d: { coin: [0.5, 1, 3], frag: 0.05 } };
  EN.banshee = { n: 'Carpideira da Torre', kind: 'banshee', hp: 48, spd: 58, dmg: 8, r: 10, xp: 5, col: '#c8d8ff', w: 2, from: 7, rng: 190, wail: 1, shot: '#c8d8ff', d: { coin: [0.5, 1, 3], frag: 0.08 } };
  EN.rootling = { n: 'Raiz Corrompida', kind: 'rootling', hp: 38, spd: 70, dmg: 8, r: 11, xp: 2, col: '#6a8a3a', w: 8, from: 1, d: { coin: [0.4, 1, 2] } };

  BOSS.push(
    { id: 'yukionna', n: 'Dama do Inverno Sem Passos', kind: 'yukionna', hp: 5200, spd: 36, dmg: 56, r: 34, xp: 560, col: '#bfe6ff', minion: 'wraith', atk: [['fan', 'summon'], ['fan', 'ring', 'summon'], ['ring', 'fan', 'teleport', 'summon']], cd: 2.4 },
    { id: 'hydra', n: 'Hidra do Pântano', kind: 'hydra', hp: 7000, spd: 34, dmg: 62, r: 40, xp: 700, col: '#4aa05a', minion: 'spider', atk: [['fan', 'slam'], ['fan', 'slam', 'hazard'], ['fan', 'ring', 'hazard', 'summon', 'slam']], cd: 2.3 },
    { id: 'rootcolossus', n: 'Colosso das Raízes', kind: 'rootcolossus', hp: 6400, spd: 28, dmg: 60, r: 44, xp: 640, col: '#7a9a3a', minion: 'rootling', atk: [['slam', 'summon'], ['slam', 'hazard', 'summon'], ['slam', 'ring', 'hazard', 'charge']], cd: 2.8 }
  );

  MAPS.mata = { n: 'Mata dos Guardiões', g: ['#14261a', '#1c3322'], deco: 'tree', weather: 'motes', dark: 0.4, event: 'guardians', pool: ['rootling', 'ghoul', 'spider', 'kappa', 'driedbody', 'cultist'], boss: ['rootcolossus', 'hydra', 'devourer'], unlock: 210, tint: '#d8c34a' };
  T.MAPORDER.push('mata');

  /* Bestiário: tipo = 'doc' (inspirado em folclore documentado) | 'fic' (ficção de Noctaria). care = nível de cuidado cultural. */
  T.LORE = {
    draugr: { orig: 'Mitologia nórdica', care: 'PADRÃO', reg: 'Cemitério, Reino Congelado', rar: 'Incomum', doc: 'Mortos-vivos que guardam túmulos e tesouros nas sagas nórdicas.', fic: 'Guardiões de cripta com armadura de ferro, protegem câmaras seladas e exigem que o corpo seja destruído por completo.' },
    driedbody: { orig: 'Folclore brasileiro', care: 'MÉDIO', reg: 'Mata dos Guardiões, Cemitério', rar: 'Incomum', doc: 'Corpo-Seco: figura de morto que não apodrece e a terra recusa. As versões moralizantes (pecado, desobediência) não foram usadas.', fic: 'Um morto que recusa o chão da cripta por um juramento quebrado. Levanta uma vez depois de derrotado.' },
    kappa: { orig: 'Folclore japonês', care: 'PADRÃO', reg: 'Mata dos Guardiões, Reino Congelado', rar: 'Comum', doc: 'Yōkai aquático com um prato de água na cabeça, associado a rios e lagoas.', fic: 'Espírito de poços rasos que arremessa água de longe. O prato na cabeça é o ponto de referência visual.' },
    banshee: { orig: 'Folclore irlandês', care: 'PADRÃO', reg: 'Ruínas Mágicas, Cemitério', rar: 'Incomum', doc: 'Espírito feminino cujo lamento anuncia a morte numa família. Sem descrição física fixa nas fontes.', fic: 'Voz sem corpo. Seu lamento faz um anel de aviso: saia do anel a tempo e nada acontece.' },
    rootling: { orig: 'Original de Noctaria', care: 'Nenhum', reg: 'Mata dos Guardiões', rar: 'Comum', doc: 'Sem base folclórica direta.', fic: 'Raízes corrompidas que andam. Representam a corrupção que os Guardiões da Mata combatem.' },
    yukionna: { orig: 'Folclore japonês', care: 'PADRÃO', reg: 'Reino Congelado (endless)', rar: 'Lendária', doc: 'Yuki-onna: mulher da neve nas lendas japonesas, ligada a nevascas e a promessas de silêncio.', fic: 'Chefe de uma ala gelada. Sem pegadas, sem pressa; seu inverno cresce por fases.' },
    hydra: { orig: 'Mitologia grega', care: 'PADRÃO', reg: 'Mata dos Guardiões (endless)', rar: 'Lendária', doc: 'Hidra de Lerna: serpente de várias cabeças, morta por Héracles.', fic: 'Adaptada a um pântano corrompido. As cabeças disparam em leque.' },
    rootcolossus: { orig: 'Inspirado em Mapinguari (adaptação livre)', care: 'ALTO', reg: 'Mata dos Guardiões', rar: 'Lendária', doc: 'O Mapinguari é uma figura de tradição viva na Amazônia. Esta criatura NÃO é o Mapinguari; usa só a ideia de "gigante da mata com ponto fraco no ventre".', fic: 'Colosso das Raízes: gigante de madeira e musgo com uma boca no ventre. Nascido da corrupção da mata, não de uma lenda.' }
  };
  /* Guardiões neutros (aparecem no evento da Mata; nunca atacam o jogador) */
  T.GUARD = [
    { id: 'curupira', n: 'Guardião do Bosque Inverso', src: 'Curupira (tradição indígena tupi — viva)', col: '#e0a040', eff: 'Os inimigos perdem o rumo: lentidão por 8 s.' },
    { id: 'boitata', n: 'Serpente-Farol dos Campos de Cinza', src: 'Boitatá (folclore brasileiro)', col: '#9fffd0', eff: 'Sua luz cura o herói e o núcleo.' }
  ];

  /* ---------- Sprites procedurais (arte própria) ---------- */
  var X = T.Art.extra;
  X.draugr = function (c, f, h) {
    var l = f === 0 ? 3 : f === 1 ? -3 : 0, a = f === 2;
    h.line(c, 26, 44, 24 - l, 58, 4.4, '#2a3236'); h.line(c, 38, 44, 40 + l, 58, 4.4, '#2a3236');
    h.poly(c, [[20, 20], [44, 20], [47, 44], [17, 44]], h.lg(c, 0, 20, 0, 44, '#4a5a60', '#232c30'), h.OUT);
    h.poly(c, [[16, 20], [26, 14], [38, 14], [48, 20], [44, 26], [20, 26]], '#6a7a7e', h.OUT); h.ell(c, 18, 24, 5, 4, '#8a9a9e', h.OUT); h.ell(c, 46, 24, 5, 4, '#8a9a9e', h.OUT);
    h.line(c, 24, 32, 40, 32, 1, '#161c1e'); h.line(c, 22, 38, 42, 38, 1, '#161c1e');
    h.ell(c, 32, 12, 8, 8, h.lg(c, 0, 4, 0, 20, '#7a9a8a', '#3a5a50'), h.OUT);
    h.poly(c, [[24, 8], [20, 2], [27, 6]], '#d8d0b8', h.OUT); h.poly(c, [[40, 8], [44, 2], [37, 6]], '#d8d0b8', h.OUT);
    h.glow(c, 29, 12, 5, '#6fe8ff', 0.95); h.glow(c, 36, 12, 5, '#6fe8ff', 0.95); h.line(c, 28, 17, 36, 17, 1.4, '#0a1214');
    var ax = a ? 54 : 50, ay = a ? 26 : 30; h.line(c, 46, 34, ax, ay, 3, '#5a4a38'); h.poly(c, [[ax - 2, ay - 7], [ax + 9, ay - 3], [ax + 5, ay + 6], [ax - 2, ay + 2]], '#9aa4a8', h.OUT);
    h.ell(c, 20, 36, 6, 8, h.lg(c, 0, 28, 0, 44, '#c8a860', '#6a5a30'), h.OUT);
  };
  X.driedbody = function (c, f, h) {
    var l = f === 0 ? 3 : f === 1 ? -3 : 0, a = f === 2 ? 6 : 0;
    h.line(c, 27, 40, 25 - l, 58, 3, '#4a3626'); h.line(c, 36, 40, 38 + l, 58, 3, '#4a3626');
    h.poly(c, [[22, 22], [42, 20], [44, 40], [34, 44], [22, 42]], h.lg(c, 0, 20, 0, 44, '#8a6a46', '#3a2a1c'), h.OUT);
    for (var i = 0; i < 5; i++) { h.line(c, 24 + i * 4, 24 + (i % 2) * 8, 26 + i * 4, 18 + (i % 2) * 8, 1.4, '#c8b080'); }
    h.line(c, 22, 28, 12 - a * 0.4, 38 + a * 0.4, 2.6, '#6a4a2c'); h.line(c, 42, 28, 52 + a, 34, 2.6, '#6a4a2c');
    for (var k = 0; k < 4; k++) h.line(c, 52 + a - k, 34, 56 + a + k, 30 + k * 2, 1.2, '#d8c8a0');
    h.ell(c, 32, 16, 8, 9, h.lg(c, 0, 8, 0, 24, '#a08058', '#4a3828'), h.OUT);
    h.ell(c, 29, 15, 2.2, 2.6, '#0a0806'); h.ell(c, 36, 15, 2.2, 2.6, '#0a0806'); h.glow(c, 29, 15, 4, '#ff9a3a', 0.7); h.glow(c, 36, 15, 4, '#ff9a3a', 0.7);
    h.line(c, 28, 21, 36, 21, 1.2, '#0a0806'); h.line(c, 30, 20, 30, 23, 0.8, '#d8c8a0'); h.line(c, 33, 20, 33, 23, 0.8, '#d8c8a0');
    h.line(c, 26, 9, 22, 3, 1.6, '#6a8a3a'); h.line(c, 38, 9, 42, 3, 1.6, '#6a8a3a');
  };
  X.kappa = function (c, f, h) {
    var l = f === 0 ? 2.5 : f === 1 ? -2.5 : 0, a = f === 2 ? 4 : 0;
    h.line(c, 27, 44, 26 - l, 58, 3.4, '#2c6a48'); h.line(c, 37, 44, 38 + l, 58, 3.4, '#2c6a48');
    h.ell(c, 30, 36, 13, 12, h.lg(c, 0, 24, 0, 48, '#8a6a30', '#4a3414'), h.OUT);
    for (var i = 0; i < 3; i++) h.line(c, 22 + i * 7, 28, 22 + i * 7, 44, 0.8, 'rgba(0,0,0,0.4)');
    h.ell(c, 36, 38, 10, 10, h.lg(c, 0, 28, 0, 48, '#5ac090', '#2a7a58'), h.OUT);
    h.ell(c, 38 + a, 20, 10, 9, h.lg(c, 0, 11, 0, 29, '#6ad0a0', '#2c7a58'), h.OUT);
    h.ell(c, 38 + a, 11, 6.5, 2.6, '#7fd8ff', h.OUT); h.glow(c, 38 + a, 11, 8, '#7fd8ff', 0.5);
    h.poly(c, [[44 + a, 21], [54 + a, 22], [45 + a, 26]], '#e8c050', h.OUT);
    h.ell(c, 36 + a, 18, 2.4, 2.4, '#fff'); h.ell(c, 36.5 + a, 18, 1.1, 1.3, '#101010'); h.ell(c, 42 + a, 18, 2.2, 2.2, '#fff'); h.ell(c, 42.5 + a, 18, 1, 1.2, '#101010');
    h.line(c, 44, 36, 52 + a, 32 - a * 0.5, 3, '#4ab080'); h.ell(c, 54 + a, 31 - a * 0.5, 3, 3, '#7fd8ff'); h.glow(c, 54 + a, 31 - a * 0.5, 7, '#7fd8ff', 0.6);
  };
  X.banshee = function (c, f, h) {
    var b = f === 1 ? 1.5 : 0, o = f === 2 ? 3 : 0;
    c.save(); c.globalAlpha = 0.9;
    c.beginPath(); c.moveTo(20, 58 + b); c.quadraticCurveTo(10, 34, 26, 18); c.quadraticCurveTo(32, 12, 40, 18); c.quadraticCurveTo(54, 34, 44, 58 + b);
    for (var i = 0; i < 5; i++) c.quadraticCurveTo(42 - i * 5, 64 + b * (i % 2 ? -1 : 1), 38 - i * 5, 56 + b); c.closePath();
    c.fillStyle = h.lg(c, 0, 14, 0, 62, 'rgba(230,240,255,0.95)', 'rgba(70,90,150,0.15)'); c.fill(); c.strokeStyle = h.OUT; c.stroke(); c.restore();
    h.ell(c, 32, 22, 7, 8.5, '#e8f0ff', h.OUT);
    for (var k = 0; k < 6; k++) h.line(c, 25 + k * 2.4, 14, 20 + k * 4.5 - (f === 0 ? 2 : 0), 46 + k * 2, 1.6, 'rgba(160,185,235,0.7)');
    h.ell(c, 29, 21, 1.8, 3, '#0a0c18'); h.ell(c, 35, 21, 1.8, 3, '#0a0c18');
    h.ell(c, 32, 29 + o * 0.4, 2.6, 3.5 + o * 0.6, '#0a0c18'); h.glow(c, 32, 22, 12 + o * 2, '#bcd4ff', 0.45 + o * 0.1);
    h.line(c, 22, 34, 14, 40 - o, 2.4, '#dfe8ff'); h.line(c, 42, 34, 50, 40 - o, 2.4, '#dfe8ff');
    if (o) { c.strokeStyle = 'rgba(190,215,255,0.7)'; c.lineWidth = 1.2; for (var r = 0; r < 2; r++) { c.beginPath(); c.arc(32, 26, 14 + r * 7, -0.9, 0.9); c.stroke(); c.beginPath(); c.arc(32, 26, 14 + r * 7, 2.24, 4.04); c.stroke(); } }
  };
  X.rootling = function (c, f, h) {
    var l = f === 0 ? 3 : f === 1 ? -3 : 0, k = f === 2 ? 4 : 0;
    for (var i = 0; i < 6; i++) { var bx = 18 + i * 5.5; h.line(c, bx, 42, bx + (i % 2 ? l : -l) - 3, 58, 2.6, i % 2 ? '#3a2a18' : '#4a3620'); }
    h.ell(c, 31, 38, 15, 10, h.lg(c, 0, 28, 0, 48, '#6a4a2a', '#2a1c10'), h.OUT);
    for (var j = 0; j < 5; j++) h.line(c, 20 + j * 5, 33, 22 + j * 5, 44, 1, 'rgba(0,0,0,0.45)');
    for (j = 0; j < 4; j++) { h.line(c, 22 + j * 6, 30, 20 + j * 6 + (j % 2 ? 3 : -3), 20 - (j % 2) * 4, 2.2, '#4a7a2c'); h.ell(c, 20 + j * 6 + (j % 2 ? 3 : -3), 20 - (j % 2) * 4, 2.6, 1.8, '#7ab040'); }
    h.glow(c, 30, 38, 10, '#ffc040', 0.75); h.ell(c, 30, 38, 3, 3, '#ffe890');
    h.poly(c, [[40 + k, 32], [52 + k, 34], [52 + k, 42], [40 + k, 43]], h.lg(c, 0, 32, 0, 43, '#5a3c22', '#2a1c10'), h.OUT);
    h.glow(c, 46 + k, 36, 4, '#ffc040', 0.9); h.glow(c, 49 + k, 38, 3, '#ffc040', 0.9);
    for (j = 0; j < 3; j++) h.line(c, 49 + k + j * 1.5, 41, 50 + k + j * 1.5, 44, 1, '#e8d8a0');
  };
  X.yukionna = function (c, f, h) {
    var s = f === 1 ? 1.2 : 0, a = f === 2 ? 5 : 0;
    c.save(); c.globalAlpha = 0.95;
    c.beginPath(); c.moveTo(24, 20); c.quadraticCurveTo(10, 44, 6, 60 + s); c.lineTo(58, 60 + s); c.quadraticCurveTo(54, 44, 40, 20); c.closePath();
    c.fillStyle = h.lg(c, 0, 18, 0, 60, '#f4faff', '#7aa4d8'); c.fill(); c.strokeStyle = h.OUT; c.stroke(); c.restore();
    for (var i = 0; i < 5; i++) { h.line(c, 22 + i * 5, 30, 14 + i * 9, 58, 0.9, 'rgba(120,160,220,0.5)'); }
    h.poly(c, [[24, 30], [40, 30], [37, 36], [27, 36]], '#a8c8f0', h.OUT);
    h.line(c, 24, 30, 14, 36 - a, 4.4, '#f0f8ff'); h.line(c, 40, 30, 50 + a, 36 - a, 4.4, '#f0f8ff');
    for (i = 0; i < 4; i++) h.poly(c, [[50 + a + i, 34 - a + i * 2], [58 + a, 30 - a + i * 3], [52 + a, 40 - a + i]], 'rgba(190,230,255,0.9)');
    h.ell(c, 32, 17, 7, 8, '#f4f8ff', h.OUT);
    for (i = 0; i < 7; i++) h.line(c, 25 + i * 2, 10, 20 + i * 4, 40 + (i % 2) * 6, 2.2, i % 2 ? '#1a2038' : '#2c3658');
    h.ell(c, 29, 17, 1.5, 2.2, '#4ad0ff'); h.ell(c, 35, 17, 1.5, 2.2, '#4ad0ff'); h.glow(c, 29, 17, 5, '#4ad0ff', 0.9); h.glow(c, 35, 17, 5, '#4ad0ff', 0.9);
    h.line(c, 30, 22, 34, 22, 1, '#8aa0c8'); h.glow(c, 32, 36, 24, '#bfe6ff', 0.2);
  };
  X.hydra = function (c, f, h) {
    var w = f === 0 ? 2 : f === 1 ? -2 : 0, a = f === 2 ? 4 : 0;
    h.ell(c, 32, 52, 24, 8, 'rgba(0,0,0,0.3)');
    h.ell(c, 32, 44, 20, 13, h.lg(c, 0, 32, 0, 58, '#4aa05a', '#1c4a28'), h.OUT);
    for (var i = 0; i < 6; i++) h.ell(c, 18 + i * 5.5, 46, 2.6, 4, 'rgba(180,230,150,0.35)');
    var heads = [[-14, 0], [0, -6], [14, 1]];
    heads.forEach(function (p, k) {
      var hx = 32 + p[0] + (k === 1 ? w : -w * 0.5), hy = 14 + p[1] + (k === 2 ? w * 0.6 : 0) - (f === 2 ? 2 : 0);
      c.beginPath(); c.moveTo(32 + p[0] * 0.4, 42); c.quadraticCurveTo(32 + p[0] * 1.4, 30, hx, hy + 6); c.strokeStyle = '#2c7a3c'; c.lineWidth = 6; c.lineCap = 'round'; c.stroke();
      c.strokeStyle = '#4aa05a'; c.lineWidth = 3.4; c.stroke();
      h.ell(c, hx, hy, 6.4, 5, h.lg(c, 0, hy - 5, 0, hy + 5, '#6ac070', '#2a6a38'), h.OUT);
      h.ell(c, hx - 2, hy - 1.4, 1.5, 1.5, '#ffe040'); h.ell(c, hx + 2, hy - 1.4, 1.5, 1.5, '#ffe040'); h.glow(c, hx, hy - 1, 6, '#ffe040', 0.5);
      h.line(c, hx - 3, hy + 3 + a * 0.3, hx + 3, hy + 3 + a * 0.3, 1.2, '#e8f0d0');
    });
    h.glow(c, 32, 44, 20, '#7aff8a', 0.12);
  };
  X.rootcolossus = function (c, f, h) {
    var st = f === 0 ? 2 : f === 1 ? -2 : 0, a = f === 2 ? 5 : 0;
    h.line(c, 22, 44, 20 - st, 61, 8, '#3a2a18'); h.line(c, 42, 44, 44 + st, 61, 8, '#3a2a18');
    h.poly(c, [[16, 18], [48, 18], [52, 48], [12, 48]], h.lg(c, 0, 18, 0, 48, '#6a4a2c', '#2a1c10'), h.OUT);
    for (var i = 0; i < 8; i++) h.line(c, 16 + i * 4.5, 20, 15 + i * 4.8, 46, 1.1, 'rgba(0,0,0,0.35)');
    for (i = 0; i < 6; i++) { h.ell(c, 16 + i * 6, 20 + (i % 2) * 2, 5, 3, '#4a7a2c'); h.ell(c, 18 + i * 6, 19 + (i % 2) * 2, 2.4, 1.4, '#8ac050'); }
    h.ell(c, 32, 36, 9, 7 + a * 0.3, '#120a06', h.OUT); h.glow(c, 32, 36, 12, '#ff9a30', 0.7 + a * 0.05);
    for (i = 0; i < 5; i++) { h.poly(c, [[25 + i * 3.5, 32], [26.7 + i * 3.5, 35], [24.3 + i * 3.5, 35]], '#e8d8a0'); h.poly(c, [[25 + i * 3.5, 40 + a * 0.3], [26.7 + i * 3.5, 37], [24.3 + i * 3.5, 37]], '#e8d8a0'); }
    h.line(c, 14, 24, 6 - a * 0.5, 40 + a, 7, '#4a3220'); h.line(c, 50, 24, 58 + a, 40 - a, 7, '#4a3220'); h.ell(c, 6 - a * 0.5, 42 + a, 5, 5, '#5a3c22', h.OUT); h.ell(c, 58 + a, 42 - a, 5, 5, '#5a3c22', h.OUT);
    h.ell(c, 32, 11, 9, 8, h.lg(c, 0, 3, 0, 19, '#7a5a34', '#3a2a18'), h.OUT);
    h.glow(c, 28, 11, 5, '#ffc040', 0.95); h.glow(c, 36, 11, 5, '#ffc040', 0.95);
    h.line(c, 24, 5, 18, -1, 2.4, '#4a7a2c'); h.line(c, 40, 5, 46, -1, 2.4, '#4a7a2c');
  };

  /* ---------- Bestiário: aba "Folclore" ---------- */
  T.loreHTML = function () {
    var d = T.Save.d, h = '', ids = Object.keys(T.LORE);
    function card(k) {
      var L = T.LORE[k], def = EN[k] || BOSS.filter(function (b) { return b.id === k; })[0], seen = (d.seen.e[k] || d.seen.b[k]);
      var img = seen ? '<img src="' + T.thumb(def.kind, 72, def.col + '88') + '" width="72" height="72" style="border-radius:8px;flex:none">' : '<div style="width:72px;height:72px;flex:none;border:2px dashed #4a3c28;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:24px">?</div>';
      return '<div class="item" style="align-items:flex-start;gap:10px">' + img + '<div style="min-width:0"><b class="gold">' + (seen ? def.n : '???') + '</b> <span class="tag">' + L.rar + '</span><div class="small mut">' + (seen ? L.orig + ' · cuidado cultural: ' + L.care + ' · ' + L.reg : 'Enfrente para descobrir') + '</div>' +
        (seen ? '<div class="small" style="margin-top:4px"><b style="color:#9fd8ff">Folclore documentado:</b> ' + L.doc + '</div><div class="small" style="margin-top:3px"><b style="color:#ffb86a">Ficção de Noctaria:</b> ' + L.fic + '</div>' : '') + '</div></div>';
    }
    h += ids.map(card).join('');
    h += '<h2 class="ttl" style="font-size:15px;margin-top:12px">Guardiões da Mata (neutros)</h2>' + T.GUARD.map(function (g) { return '<div class="item"><div style="width:44px;height:44px;border-radius:50%;flex:none;background:radial-gradient(circle,' + g.col + ',transparent 70%)"></div><div><b class="gold">' + g.n + '</b><div class="small mut">Inspirado em: ' + g.src + '</div><div class="small">' + g.eff + ' Não é inimigo: tradição viva tratada com respeito.</div></div></div>'; }).join('');
    h += '<div class="small mut" style="margin-top:8px">Pesquisa e fontes completas em FOLCLORE_E_MITOLOGIA.md. Tudo marcado "Ficção" é invenção do jogo, não tradição.</div>';
    return '<div class="col" style="gap:8px">' + h + '</div>';
  };
})(window.TD);

'use strict';
/* NOCTARIA — sistema de animação reutilizável.
   Cada clipe define: quadros-base da arte (0/1 = passo, 2 = ataque), fps, duração, loop, próxima animação,
   eventos (u = 0..1 da duração) e uma função de pose (transformações procedurais: balanço, inclinação, esticar).
   Se existir uma spritesheet definitiva, use T.Anim.sheet(...) e os clipes passam a ler quadros dela. */
(function (T) {
  var A = T.Anim = { sheets: {}, origin: { colossus: 0.9, dragon: 0.9, drake: 0.9, voidlord: 0.9, wraith: 0.86, devourer: 0.86, spirit: 0.86, spider: 0.8, hound: 0.86 } };
  var PRI = { idle: 0, walk: 0, run: 0, hit: 3, attack: 4, cast: 5, special: 6, death: 9 };
  A.clips = {
    idle: { f: [0], fps: 1, loop: 1, pose: function (t, p) { p.sy = 1 + Math.sin(t * 3) * 0.022; p.sx = 1 - Math.sin(t * 3) * 0.012; } },
    walk: { f: [0, 1], fps: 7, loop: 1, pose: function (t, p) { var s = Math.sin(t * 14); p.oy = -Math.abs(s) * 1.8; p.rot = s * 0.045; } },
    run: { f: [0, 1], fps: 11, loop: 1, pose: function (t, p) { var s = Math.sin(t * 22); p.oy = -Math.abs(s) * 2.2; p.rot = 0.14; p.sx = 1.04; p.sy = 0.97; } },
    attack: { f: [2, 2, 0], fps: 14, dur: 0.24, then: 'idle', ev: [[0.35, 'hit']], pose: function (t, p, u) { var k = Math.sin(Math.min(1, u * 1.6) * 3.14); p.ox = k * 5; p.rot = -0.12 * k; p.sx = 1 + k * 0.1; p.sy = 1 - k * 0.06; } },
    cast: { f: [2, 2, 0], fps: 10, dur: 0.4, then: 'idle', ev: [[0.45, 'hit']], pose: function (t, p, u) { var k = Math.sin(u * 3.14); p.oy = -k * 3; p.sy = 1 + k * 0.1; p.sx = 1 - k * 0.04; p.rot = -0.08 * k; } },
    hit: { f: [2], fps: 12, dur: 0.2, then: 'idle', pose: function (t, p, u) { var k = 1 - u; p.ox = -4 * k; p.rot = -0.18 * k; p.sx = 1 - 0.1 * k; p.sy = 1 + 0.08 * k; p.flash = 0.7 * k; } },
    special: { f: [2, 2, 0], fps: 8, dur: 0.6, then: 'idle', ev: [[0.35, 'hit']], pose: function (t, p, u) { var k = Math.sin(u * 3.14); p.oy = -k * 6; p.sy = 1 + k * 0.16; p.sx = 1 + k * 0.06; p.flash = 0.25 * k; } },
    death: { f: [2], fps: 6, dur: 0.7, hold: 1, pose: function (t, p, u) { u = Math.min(1, u); p.rot = 1.45 * u; p.oy = 5 * u; p.sy = 1 - 0.22 * u; p.alpha = 1 - 0.55 * u * u; } }
  };
  A.make = function (onEv) { return { s: 'idle', t: Math.random() * 3, dur: 0, fired: 0, onEv: onEv || null, done: false }; };
  A.play = function (o, name, force) {
    var c = A.clips[name]; if (!c) return;
    if (o.s === name) { if (c.loop) return; if (!force) return; }
    var cur = A.clips[o.s];
    if (!force && cur && !cur.loop && !o.done && (PRI[o.s] || 0) > (PRI[name] || 0)) return;
    if (o.s === 'death') return;
    o.s = name; o.t = 0; o.fired = 0; o.dur = c.dur || 0; o.done = false;
  };
  A.update = function (o, dt) {
    o.t += dt; var c = A.clips[o.s];
    if (!c || c.loop) return;
    var u = o.t / (c.dur || 0.3);
    if (c.ev) for (var i = 0; i < c.ev.length; i++) if (!(o.fired & (1 << i)) && u >= c.ev[i][0]) { o.fired |= (1 << i); if (o.onEv) o.onEv(c.ev[i][1], o.s); }
    if (u >= 1 && !c.hold) { var n = c.then || 'idle'; o.s = n; o.t = 0; o.fired = 0; o.done = false; }
    else if (u >= 1) o.done = true;
  };
  var PO = { f: 0, sx: 1, sy: 1, rot: 0, ox: 0, oy: 0, flash: 0, alpha: 1 };
  A.pose = function (o) {
    var c = A.clips[o.s] || A.clips.idle, p = PO; p.sx = p.sy = p.alpha = 1; p.rot = p.ox = p.oy = p.flash = 0;
    var u = c.loop ? 0 : Math.min(1, o.t / (c.dur || 0.3));
    p.f = c.f[c.loop ? Math.floor(o.t * c.fps) % c.f.length : Math.min(c.f.length - 1, Math.floor(u * c.f.length))];
    if (c.pose) c.pose(o.t, p, u); return p;
  };
  /* Desenha: (x,y) = pés. size = resolução do sprite-base, sc = escala em px por px-base. */
  A.draw = function (c, kind, size, hue, x, y, sc, o, face, flash, tint) {
    var p = A.pose(o), sh = A.sheets[kind], img = sh ? sh.frame(o.s, p.f) : T.Art.sprite(kind, p.f, size, hue), w = size * sc, og = A.origin[kind] || 0.93;
    c.save(); c.translate(x + p.ox * sc * face, y + p.oy * sc); if (p.rot) c.rotate(p.rot * face); c.scale(face * p.sx, p.sy);
    if (p.alpha < 1) c.globalAlpha = p.alpha;
    c.drawImage(img, -w / 2, -w * og, w, w);
    var fl = Math.max(flash || 0, p.flash);
    if (fl > 0.02) { c.globalAlpha = Math.min(1, fl) * p.alpha; c.drawImage(T.Art.whiteOf(kind, p.f, size, hue), -w / 2, -w * og, w, w); }
    c.restore(); return p;
  };
  /* Spritesheet definitiva: A.sheet('hero_knight', imagem, {cols:8, size:64, clips:{idle:[0,1],walk:[2,3,4,5]}}) */
  A.sheet = function (kind, img, cfg) {
    A.sheets[kind] = { frame: function (name, f) { return img; } };
  };
})(window.TD);

'use strict';
/* NOCTARIA — simulação do jogo (sem desenho). Parte 1: mundo, herói, dano, inimigos, drops, XP. */
(function (T) {
  var R = T.R, RI = T.RI, clamp = T.clamp, TAU = T.TAU, EN = T.EN, SKI = T.SKI;
  var G = T.G = { state: 'menu' };
  var W = 2000, CX = 1000, CY = 1000;
  T.W = W;
  T.QUAL = [
    { n: 'Econômico', fps: 30, scale: 0.7, part: 110, en: 100, light: 0, glow: 0, texts: 18, deco: 0.5, weather: 30, shadow: 0, fog: 1, dpr: 1, bake: 0.4 },
    { n: 'Equilibrado', fps: 45, scale: 0.85, part: 260, en: 160, light: 1, glow: 0, texts: 30, deco: 0.8, weather: 60, shadow: 1, fog: 1, dpr: 1.25, bake: 0.5 },
    { n: 'Alto', fps: 60, scale: 1, part: 520, en: 240, light: 2, glow: 1, texts: 45, deco: 1, weather: 110, shadow: 1, fog: 2, dpr: 1.75, bake: 0.6 }
  ];
  T.rq = null;
  T.Q = function () { return T.QUAL[T.rq != null ? T.rq : T.Save.d.set.q]; };

  /* ---------- Pools (reaproveitam objetos, sem lixo para o coletor) ---------- */
  function Pool(max, mk) { this.a = []; this.free = []; this.max = max; this.mk = mk; }
  Pool.prototype.get = function () {
    var o;
    if (this.free.length) o = this.free.pop();
    else if (this.a.length < this.max) { o = this.mk(); o.i = this.a.length; this.a.push(o); }
    else return null;
    o.on = true; return o;
  };
  Pool.prototype.put = function (o) { if (o.on) { o.on = false; this.free.push(o); } };
  Pool.prototype.clear = function () { this.free.length = 0; for (var i = this.a.length - 1; i >= 0; i--) { this.a[i].on = false; this.free.push(this.a[i]); } };
  Pool.prototype.count = function () { return this.a.length - this.free.length; };
  var uid = 1;
  var EP = new Pool(320, function () { return { uid: 0 }; });
  var PP = new Pool(300, function () { return { hit: [0, 0, 0, 0, 0, 0] }; });
  var XP = new Pool(700, function () { return {}; });          // partículas
  var TP = new Pool(70, function () { return {}; });           // textos flutuantes
  var KP = new Pool(240, function () { return {}; });          // pickups
  var EJ = new Pool(120, function () { return {}; });          // projéteis inimigos
  var HZ = new Pool(60, function () { return {}; });           // zonas
  var AL = new Pool(40, function () { return {}; });           // aliados
  var ZP = new Pool(40, function () { return {}; });           // raios
  var DP = new Pool(80, function () { return {}; });           // corpos em morte
  T.pools = { EP: EP, PP: PP, XP: XP, TP: TP, KP: KP, EJ: EJ, HZ: HZ, AL: AL, ZP: ZP, DP: DP };

  /* ---------- Grade espacial para colisões ---------- */
  var GS = 64, GN = Math.ceil(W / GS) + 1, head = new Int32Array(GN * GN), nxt = new Int32Array(400);
  var BUFS = [[], [], [], [], [], []], qd = 0;
  function buildGrid() {
    head.fill(-1); var a = EP.a;
    for (var i = 0; i < a.length; i++) {
      var e = a[i]; if (!e.on) continue;
      var c = clamp(Math.floor(e.y / GS), 0, GN - 1) * GN + clamp(Math.floor(e.x / GS), 0, GN - 1);
      nxt[i] = head[c]; head[c] = i;
    }
  }
  function collect(buf, x, y, r, skipInvis) {
    var n = 0, a = EP.a, x0 = Math.max(0, Math.floor((x - r - 24) / GS)), x1 = Math.min(GN - 1, Math.floor((x + r + 24) / GS)),
      y0 = Math.max(0, Math.floor((y - r - 24) / GS)), y1 = Math.min(GN - 1, Math.floor((y + r + 24) / GS));
    for (var cy = y0; cy <= y1; cy++) for (var cx = x0; cx <= x1; cx++) {
      for (var i = head[cy * GN + cx]; i >= 0; i = nxt[i]) {
        var e = a[i]; if (!e.on) continue;
        if (skipInvis && e.invisT > 0) continue;
        var dx = e.x - x, dy = e.y - y, rr = r + e.r;
        if (dx * dx + dy * dy <= rr * rr) buf[n++] = e;
      }
    }
    buf.length = n; return n;
  }
  function aoe(x, y, r, cb) {
    var buf = BUFS[qd++]; collect(buf, x, y, r, false);
    for (var i = 0; i < buf.length; i++) if (buf[i].on) cb(buf[i]);
    qd--;
  }
  function nearest(x, y, r, skipInvis) {
    var buf = BUFS[qd++], best = null, bd = 1e12; collect(buf, x, y, r, skipInvis);
    for (var i = 0; i < buf.length; i++) {
      var e = buf[i]; if (!e.on) continue; var dx = e.x - x, dy = e.y - y, d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = e; }
    }
    qd--; return best;
  }
  T.sim = { aoe: aoe, nearest: nearest };

  /* ---------- Efeitos ---------- */
  function part(x, y, vx, vy, life, size, col, type, g) {
    var q = T.Q(), fi = T.Save.d.set.fxi; if (XP.count() >= q.part * (fi == null ? 1 : fi)) return null;
    var p = XP.get(); if (!p) return null;
    p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.life = p.max = life; p.size = size; p.col = col; p.type = type || 0; p.g = g || 0; p.a = 0; p.beh = 0; p.rot = 0; p.w = 0; p.cx = 0; p.cy = 0; p.orr = 0; p.hi = 0; p.beh = 0; p.rot = Math.random() * 6.28; p.vr = 0; p.drag = 0; p.grow = 0; p.tx = 0; p.ty = 0; p.k = 0; p.ow = 0; p.orad = 0; p.oa = 0; p.dr = 0; p.at = 0; p.rot = 0; p.sp = 0; p.gr = 0; p.orb = 0; p.fol = 0; p.tx = 0; p.ty = 0; p.spr = null; p.dr = 0; p.orb = 0; p.att = null; p.rot = 0;
    return p;
  }
  function burst(x, y, n, col, spd, life, size, type, g) {
    var q = T.Q(); n = Math.ceil(n * (q.part > 200 ? 1 : 0.5));
    for (var i = 0; i < n; i++) { var a = Math.random() * TAU, s = spd * (0.35 + Math.random() * 0.65); part(x, y, Math.cos(a) * s, Math.sin(a) * s, life * (0.6 + Math.random() * 0.4), size * (0.6 + Math.random() * 0.6), col, type || 0, g); }
  }
  function ring(x, y, rad, col, life) { var p = part(x, y, 0, 0, life || 0.5, rad, col, 4); return p; }
  function text(x, y, str, col, big) {
    if (TP.count() >= T.Q().texts) return;
    var t = TP.get(); if (!t) return;
    t.x = x + R(-6, 6); t.y = y; t.vy = -38 - (big ? 14 : 0); t.life = t.max = big ? 0.85 : 0.6; t.str = str; t.col = col; t.big = big ? 1 : 0;
  }
  function zap(x1, y1, x2, y2, col, life) {
    var z = ZP.get(); if (!z) return; z.x1 = x1; z.y1 = y1; z.x2 = x2; z.y2 = y2; z.col = col || '#f3e86a'; z.life = z.max = life || 0.18; z.seed = Math.random() * 99;
  }
  function shake(a) { var s = T.Save.d.set.shake; G.cam.shake = Math.min(14, Math.max(G.cam.shake, a * s)); }
  function ui(fn, a, b, c, d) { if (T.UI && T.UI[fn]) T.UI[fn](a, b, c, d); }
  function later(t, fn) { G.later.push({ t: t, fn: fn }); }

  /* ---------- Nova partida ---------- */
  var OBST = [];
  function xpNeed(l) { return Math.floor(6 + 4.2 * l + 0.55 * l * l); }
  T.xpNeed = xpNeed;
  function rng32(seed) { var s = seed >>> 0; return function () { s = (s + 0x6D2B79F5) >>> 0; var t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  function newRun(clsId, mapId) {
    var sv = T.Save.d, C = T.CLS[clsId], M = T.MAPS[mapId];
    [EP, PP, XP, TP, KP, EJ, HZ, AL, ZP, DP].forEach(function (p) { p.clear(); });
    G.cls = C; G.clsId = clsId; G.mapId = mapId; G.map = M; G.state = 'play';
    G.t = 0; G.wave = 0; G.waveT = 0; G.waveLen = 30; G.kills = 0; G.coins = 110; G.xp = 0; G.lvl = 1; G.need = xpNeed(1); G.pend = 0;
    G.frag = 0; G.bossKills = 0; G.diff = 1; G.credit = 0; G.rate = 0; G.vac = 0; G.later = []; G.build = null; G.sel = null; G.boss = null;
    G.exc = null; G.runId = (G.runId || 0) + 1; G.dim = 0; G.dimT = 0; if (G.cam) { G.cam.zt = 0; G.cam.zp = 0; } G.skills = {}; G.relics = []; G.syn = {}; G.rcombo = {}; G.built = 0; G.mythic = 0; G.victory = false; G.endless = false;
    G.eventT = 35; G.blizT = 0; G.sandT = 0; G.timeStop = 0; G.tsT = 20; G.furyT = 15; G.furyOn = 0; G.novaT = 5; G.rainT = 4; G.theme = null;
    G.hitstop = 0; G.potions = 1; G.dropBase = 1; G.endT = 0; G.stats = { dmg: 0, towerDmg: 0, spent: 0, specials: 0 }; G.summaryShown = false; G.alive = 0; G.score = 0; G.flash = 0; G.flashCol = '#fff';
    G.cam = { x: CX, y: CY + 40, shake: 0, zoom: 1 };
    var P = G.P = T.newStats();
    var up = sv.up;
    P.hpMul *= 1 + 0.08 * up.hp; P.dmg += 0.05 * up.dmg; P.xp += 0.05 * up.xp; P.coin += 0.05 * up.coin;
    for (var k in C.bonus) { if (typeof P[k] === 'number') P[k] += C.bonus[k]; }
    var B = G.base = { x: CX, y: CY, hp: 700, max: 700, r: 34, shield: 0, shT: 0, pulseT: 6, hit: 0 };
    var H = G.hero = { x: CX, y: CY + 70, r: 11, hp: 1, max: 1, fa: 0, face: 1, atkT: 0.3, spT: 0, spMax: 14, inv: 0, shield: 0, shT: 0, hurt: 0, anim: 0, atkAnim: 9, moving: 0, regenAcc: 0, slowT: 0, twinQ: 0, exec: null, castT: 0, trailT: 0, orbA: 0 };
    recalc(true);
    H.shield = P.shieldN;
    // portais
    G.portals = []; var n = 5;
    for (var i = 0; i < n; i++) { var a = i * TAU / n + 0.35; G.portals.push({ x: CX + Math.cos(a) * 820, y: CY + Math.sin(a) * 820, a: a, anim: Math.random() * 6 }); }
    // cenário (determinístico por mapa)
    var rnd = rng32(mapId.length * 7919 + 13); OBST = []; G.deco = [];
    var q = T.Q();
    for (i = 0; i < 70; i++) {
      var x = 90 + rnd() * (W - 180), y = 90 + rnd() * (W - 180), dx = x - CX, dy = y - CY;
      if (dx * dx + dy * dy < 150 * 150) continue;
      var bad = false; for (var j = 0; j < G.portals.length; j++) { var pp = G.portals[j]; if ((pp.x - x) * (pp.x - x) + (pp.y - y) * (pp.y - y) < 110 * 110) bad = true; }
      if (bad) continue;
      var solid = rnd() < 0.55;
      var d = { x: x, y: y, t: solid ? 'big' : 'mid', s: 0.8 + rnd() * 0.6, ph: rnd() * 6, v: Math.floor(rnd() * 3), r: solid ? 20 : 0 };
      if (solid) OBST.push(d); G.deco.push(d);
    }
    for (i = 0; i < 260; i++) {
      x = 40 + rnd() * (W - 80); y = 40 + rnd() * (W - 80); dx = x - CX; dy = y - CY;
      if (dx * dx + dy * dy < 90 * 90) continue;
      G.deco.push({ x: x, y: y, t: 'small', s: 0.7 + rnd() * 0.7, ph: rnd() * 6, v: Math.floor(rnd() * 3), r: 0 });
    }
    G.deco.sort(function (a, b) { return a.y - b.y; });
    G.towers = []; G.obst = OBST;
    // espíritos do necromante
    ui('runStart');
    if (T.Render) T.Render.mapChanged();
  }

  /* Recalcula atributos do herói (preserva a proporção de vida). */
  function recalc(init) {
    var C = G.cls, P = G.P, H = G.hero, ratio = init ? 1 : H.hp / H.max;
    H.max = Math.round((C.hp + P.hpAdd) * P.hpMul); H.hp = init ? H.max : Math.min(H.max, Math.max(1, H.max * ratio + (G.lastHpAdd || 0)));
    G.lastHpAdd = 0; H.spMax = ((T.SPCD && T.SPCD[G.clsId]) || 14) * (1 - Math.min(0.6, P.cdr));
  }

  /* ---------- Dano ao herói / núcleo / torres ---------- */
  function hurtHero(d, src) {
    var H = G.hero, P = G.P; if (H.inv > 0 || G.state !== 'play') return;
    if (Math.random() < P.block) { text(H.x, H.y - 18, 'Bloqueou', '#cfd8e8'); return; }
    if (H.shield > 0) {
      H.shield--; H.shT = Math.max(4, 14 - 2 * P.shieldN); ring(H.x, H.y, 34, '#7fd0ff', 0.4); text(H.x, H.y - 18, 'Escudo', '#7fd0ff');
      if (G.syn.fortress) { aoe(H.x, H.y, 90, function (e) { hurtEnemy(e, 14 * P.dmg, 'z', false); }); ring(H.x, H.y, 90, '#7fd0ff', 0.5); G.base.shield = Math.max(G.base.shield, 120); G.base.shT = 3; }
      return;
    }
    d *= 1 - Math.min(0.7, P.dr);
    H.hp -= d; H.hurt = 0.25; H.inv = 0.35; text(H.x, H.y - 18, Math.round(d), '#ff6a6a'); T.Audio.sfx('hurt'); shake(3);
    if (P.thorns && src && src.on) hurtEnemy(src, d * P.thorns * (G.rcombo.rc_thorn ? 1 + H.max / 100 : 1), 'z', false);
    if (H.hp <= 0) {
      if (P.revive > 0) { P.revive--; H.hp = H.max * 0.5; H.inv = 2.5; burst(H.x, H.y, 30, '#ffe9a0', 160, 0.8, 3, 1); ring(H.x, H.y, 120, '#ffe9a0', 0.7); aoe(H.x, H.y, 120, function (e) { knock(e, H, 140); stun(e, 1); }); ui('banner', 'Segundo Fôlego', 'Você voltou da morte', '#ffe9a0'); }
      else endRun(false, 'hero');
    }
  }
  function hurtBase(d) {
    var B = G.base; if (G.state !== 'play') return;
    B.hit = 0.2;
    if (B.shield > 0) { B.shield -= d; if (B.shield < 0) { B.hp += B.shield; B.shield = 0; } }
    else B.hp -= d;
    shake(1.5);
    if (B.hp <= 0) { B.hp = 0; endRun(false, 'base'); }
  }
  function hurtTower(t, d) {
    t.hp -= d; t.hit = 0.15;
    if (t.hp <= 0) { burst(t.x, t.y, 18, '#8a8478', 120, 0.8, 3, 3); burst(t.x, t.y, 8, T.TW[t.type].col, 100, 0.7, 2, 0); var i = G.towers.indexOf(t); if (i >= 0) G.towers.splice(i, 1); if (G.sel && G.sel.ref === t) G.sel = null; shake(2); T.Audio.sfx('boom'); }
  }
  function heal(v) { var H = G.hero; if (v <= 0) return; H.hp = Math.min(H.max, H.hp + v); }
  function knock(e, from, f) { var dx = e.x - from.x, dy = e.y - from.y, d = Math.sqrt(dx * dx + dy * dy) || 1; if (e.boss) f *= 0.15; e.x += dx / d * f * 0.25; e.y += dy / d * f * 0.25; }
  function stun(e, t) { e.stunT = Math.max(e.stunT, t * (e.boss ? 0.25 : 1) * (e.elite ? 0.6 : 1)); }
  function freeze(e, t) { e.freezeT = Math.max(e.freezeT, t * (e.boss ? 0.2 : 1) * (e.elite ? 0.6 : 1)); burst(e.x, e.y, 6, '#bfeaff', 70, 0.5, 2, 2); }

  /* ---------- Dano a inimigos ---------- */
  function hurtEnemy(e, d, src, crit) {
    if (!e.on || e.invul > 0) return;
    var P = G.P;
    if (e.shieldHp > 0) { e.shieldHp -= d; e.flash = 0.06; if (e.shieldHp < 0) { d = -e.shieldHp; e.shieldHp = 0; } else { part(e.x, e.y - 4, R(-30, 30), -30, 0.2, 2, '#9fd0ff', 1); return; } }
    e.hp -= d; e.flash = 0.08;
    if (src === 'dot') { if (e.txT <= 0) { text(e.x, e.y - e.r - 4, Math.round(d), '#ffa060'); e.txT = 0.5; } }
    else { text(e.x, e.y - e.r - 4, Math.round(d), crit ? '#ffd24a' : '#f2efe6', crit); if (crit && T.VFX) T.VFX.play('combat', 'crit', e.x, e.y); }
    if (src === 'h' || src === 'p') {
      var ls = P.dark * (G.syn.crimson ? 2 : 1) + P.vamp * (G.syn.crimson ? 2 : 1);
      if (ls > 0) heal(d * ls);
    }
    if (e.hp <= 0) killEnemy(e, src);
  }
  function strike(e, base, src, forceCrit) {
    var P = G.P, crit = false, d = base;
    if (src === 'h' || src === 'p') { if (Math.random() < P.crit) { crit = true; d *= P.critDmg; if (G.rcombo.rc_eye) dropCoin(e.x, e.y, 2 + G.wave * 0.3); } }
    else if (forceCrit) { crit = true; d *= 1.8; }
    hurtEnemy(e, d, src, crit);
    return crit;
  }
  function dropCoin(x, y, v) { spawnPickup('coin', x, y, Math.max(1, Math.round(v * G.P.coin))); }

  /* Efeitos de estado do herói ao acertar (fogo, gelo, veneno, raio). */
  function procs(e, crit) {
    var P = G.P, m = P.magic; if (!e.on) return;
    if (P.fire) {
      e.burn = Math.max(e.burn, (3 + 2.2 * P.fire) * m * P.dmg); e.burnT = 3;
      if (G.syn.inferno && e.infT <= 0) { e.infT = 1.2; var ar = 44 * P.area; ring(e.x, e.y, ar, '#ff7a3a', 0.35); aoe(e.x, e.y, ar, function (o) { if (o !== e) { hurtEnemy(o, 7 * P.fire * m * P.dmg, 'z', false); o.burn = Math.max(o.burn, 3); o.burnT = 2; } }); }
    }
    if (P.poison) { e.poison = (2 + 1.6 * P.poison) * m * P.dmg; e.poisonT = 4; }
    if (P.ice) {
      e.slowT = 2; e.slowF = Math.min(0.7, 0.2 + 0.1 * P.ice); e.iceN++;
      if (e.iceN >= 3) { e.iceN = 0; freeze(e, 0.9 + 0.15 * P.ice); }
      if (G.syn.abszero && crit && e.slowT > 0) freeze(e, 1.7);
    }
    if (P.bolt) { var ch = 0.1 * P.bolt * (G.syn.storm ? 2 : 1); if (Math.random() < ch) lightning(e, 9 * P.bolt * m * P.dmg, G.syn.storm ? 3 : 2, '#f3e86a'); }
  }
  function lightning(from, d, n, col) {
    var last = from, hitL = [from]; if (from.on) hurtEnemy(from, d, 'z', false);
    for (var i = 0; i < n; i++) {
      var best = null, bd = 130 * 130;
      aoe(last.x, last.y, 130, function (o) { if (hitL.indexOf(o) >= 0) return; var dx = o.x - last.x, dy = o.y - last.y, dd = dx * dx + dy * dy; if (dd < bd) { bd = dd; best = o; } });
      if (!best) break; zap(last.x, last.y - 6, best.x, best.y - 6, col); hurtEnemy(best, d * (1 - 0.18 * i), 'z', false); hitL.push(best); last = best;
    }
    zap(from.x, from.y - 40, from.x, from.y - 6, col, 0.15); T.Audio.sfx('zap');
  }

  /* ---------- Inimigos ---------- */
  function spawnEnemy(id, x, y, elite, bossCfg) {
    var df = bossCfg || EN[id]; if (!df) return null; T.Save.d.seen[bossCfg ? 'b' : 'e'][id] = 1;
    var e = EP.get(); if (!e) return null;
    var w = G.wave, hpm = (0.9 + 0.14 * w + 0.004 * w * w) * G.diff, dm = 1 + 0.05 * w;
    e.uid = uid++; e.id = id; if (T.Save.d.seen) { if (bossCfg) T.Save.d.seen.b[id] = 1; else T.Save.d.seen.e[id] = 1; } e.def = df; e.kind = df.kind; e.x = x; e.y = y; e.vx = e.vy = 0; e.r = df.r; e.col = df.col;
    e.max = e.hp = df.hp * hpm; e.spd = df.spd * (0.92 + Math.random() * 0.16); e.dmg = df.dmg * dm;
    e.elite = !!elite; e.boss = !!bossCfg; e.aura = null; e.shieldHp = df.shield ? df.shield * hpm : 0;
    e.heal = df.heal; e.summon = df.summon; e.boom = df.boom; e.invis = df.invis; e.rng = df.rng || 0; e.slowHit = df.slow; e.flank = df.flank; e.wail = df.wail; e.rv = 0;
    e.burn = e.poison = e.burnT = e.poisonT = e.slowT = e.slowF = e.freezeT = e.stunT = e.iceN = 0; e.dotAcc = 0; e.txT = 0; e.infT = 0; e.orbT = 0;
    e.flash = 0; e.anim = Math.random() * 6; e.atkT = 0.6 + Math.random() * 0.5; e.atkAnim = 9; e.tgtT = 0; e.tk = 'base'; e.tt = null; e.face = 1; e.invisT = 0; e.abT = 3 + Math.random() * 3;
    e.invul = 0; e.tpT = 0; e.guardT = 4; e.moving = 0; T.Save.d.seen.e[id] = 1; e.phase = 0; e.cdT = 2; e.charge = 0; e.vis = 1; e.spawnT = 0; e.chx = 0; e.chy = 0; e.deathT = 0;
    if (elite) {
      e.max = e.hp = e.hp * 4.5; e.dmg *= 1.5; e.r *= 1.25;
      var tr = T.pick(['swift', 'armored', 'summon', 'volatile']); e.aura = tr;
      if (tr === 'swift') e.spd *= 1.45; else if (tr === 'armored') e.shieldHp = e.max * 0.5; else if (tr === 'summon') e.summon = 1; else e.boom = 1;
    }
    if (e.boss) { e.hp = e.max = df.hp * (1 + 0.03 * w) * (1 + Math.floor(w / 25) * 0.8) * G.diff; e.dmg = df.dmg * dm; }
    return e;
  }
  T.spawnEnemy = spawnEnemy;

  function pickTarget(e) {
    var H = G.hero, B = G.base;
    if (e.def.tower && G.towers.length) { var bt2 = null, bd2 = 700 * 700; for (var q = 0; q < G.towers.length; q++) { var t2 = G.towers[q], ux = t2.x - e.x, uy = t2.y - e.y, ud = ux * ux + uy * uy; if (ud < bd2) { bd2 = ud; bt2 = t2; } } if (bt2) { e.tk = 'tower'; e.tt = bt2; return; } }
    var ag = e.rng ? 230 : 170, dx = H.x - e.x, dy = H.y - e.y, dh = dx * dx + dy * dy;
    var bt = null, bd = 230 * 230;
    for (var i = 0; i < G.towers.length; i++) { var t = G.towers[i]; var tx = t.x - e.x, ty = t.y - e.y, d = tx * tx + ty * ty; if (d < bd) { bd = d; bt = t; } }
    if (dh < ag * ag && (!bt || dh < bd)) { e.tk = 'hero'; e.tt = null; }
    else if (bt) { e.tk = 'tower'; e.tt = bt; }
    else { e.tk = 'base'; e.tt = null; }
    if (e.boss && dh < 320 * 320) { e.tk = 'hero'; e.tt = null; }
  }

  function updEnemy(e, dt) {
    var H = G.hero, B = G.base, P = G.P;
    e.anim += dt; if (e.flash > 0) e.flash -= dt; if (e.txT > 0) e.txT -= dt; if (e.infT > 0) e.infT -= dt; if (e.atkAnim < 9) e.atkAnim += dt; if (e.orbT > 0) e.orbT -= dt;
    if (e.burnT > 0) { e.burnT -= dt; e.dotAcc += e.burn * dt; }
    if (e.poisonT > 0) { e.poisonT -= dt; e.dotAcc += e.poison * dt; }
    if (e.dotAcc >= 1.2) { var dd = e.dotAcc; e.dotAcc = 0; hurtEnemy(e, dd, 'dot', false); if (!e.on) return; }
    if ((e.burnT > 0 || e.poisonT > 0) && Math.random() < dt * 6) part(e.x + R(-4, 4), e.y - e.r, R(-8, 8), -20, 0.4, 2, e.burnT > 0 ? '#ff8a3a' : '#7be05a', 1);
    if (e.freezeT > 0) { e.freezeT -= dt; return; }
    if (e.stunT > 0) { e.stunT -= dt; return; }
    var sf = 1; if (e.slowT > 0) { e.slowT -= dt; sf = 1 - e.slowF; }
    if (G.sandT > 0) sf *= 1.2;
    if (e.invis) { e.abT -= dt; if (e.abT <= 0) { e.invisT = e.invisT > 0 ? 0 : 2.2; e.abT = e.invisT > 0 ? 2.2 : 3.5; } if (e.invisT > 0) e.invisT -= 0; }
    if (e.heal) { e.abT -= dt; if (e.abT <= 0) { e.abT = 2.6; aoe(e.x, e.y, 120, function (o) { if (o !== e) o.hp = Math.min(o.max, o.hp + o.max * 0.08); }); ring(e.x, e.y, 120, '#5de0a0', 0.5); } }
    if (e.wail && !e.boss) { e.abT -= dt; if (e.abT <= 0) { e.abT = 5; ring(e.x, e.y, 110, '#c8d8ff', 0.8); T.Combat.zone('tele', e.x, e.y, 110, 0.9, { hostile: 1, dmg: e.dmg * 1.3, col: '#c8d8ff' }); T.Audio.tone('sine', 900, 500, 0.7, 0.05); } }
    if (e.summon && !e.boss) { e.abT -= dt; if (e.abT <= 0 && EP.count() < T.Q().en) { e.abT = 7; for (var s = 0; s < 2; s++) spawnEnemy('ghoul', e.x + R(-18, 18), e.y + R(-18, 18), false); ring(e.x, e.y, 40, '#a060ff', 0.5); } }
    e.tgtT -= dt; if (e.tgtT <= 0) { pickTarget(e); e.tgtT = 0.35 + Math.random() * 0.2; }
    if (e.tk === 'tower' && (!e.tt || G.towers.indexOf(e.tt) < 0)) { e.tk = 'base'; e.tt = null; }
    var tx, ty, tr;
    if (e.tk === 'hero') { tx = H.x; ty = H.y; tr = H.r; }
    else if (e.tk === 'tower') { tx = e.tt.x; ty = e.tt.y; tr = 16; }
    else { tx = B.x; ty = B.y; tr = B.r; }
    if (e.tk === 'hero' && (e.flank || (e.i & 1)) && !e.boss) { var fa = e.i * 2.4 + G.t * 0.35; var rr = 50; tx += Math.cos(fa) * rr; ty += Math.sin(fa) * rr; }
    var dx = tx - e.x, dy = ty - e.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
    var stop = e.rng ? e.rng * 0.85 : e.r + tr + 2;
    if (e.boss) { bossLogic(e, dt); if (!e.on) return; }
    var mv = 0;
    if (e.charge > 0) { e.charge -= dt; e.x += e.chx * dt; e.y += e.chy * dt; mv = 1; var cdx = H.x - e.x, cdy = H.y - e.y; if (cdx * cdx + cdy * cdy < (e.r + H.r) * (e.r + H.r) && e.atkT <= 0) { hurtHero(e.dmg * 1.4, e); e.atkT = 0.8; } }
    else if (d > stop) {
      var sp = e.spd * sf; e.vx = dx / d * sp; e.vy = dy / d * sp; e.x += e.vx * dt; e.y += e.vy * dt; if (Math.abs(e.vx) > 4) e.face = e.vx > 0 ? 1 : -1; mv = 1;
    }
    // separação entre inimigos + obstáculos
    var buf = BUFS[qd++]; collect(buf, e.x, e.y, e.r * 0.8, false);
    for (var i = 0; i < buf.length && i < 5; i++) {
      var o = buf[i]; if (o === e) continue; var ox = e.x - o.x, oy = e.y - o.y, od = Math.sqrt(ox * ox + oy * oy) || 0.1, ov = e.r + o.r - od;
      if (ov > 0) { var f = Math.min(ov, 3) * 0.5 * (o.boss ? 2 : 1); e.x += ox / od * f; e.y += oy / od * f; }
    }
    qd--;
    for (var k = 0; k < OBST.length; k++) { var ob = OBST[k], ax = e.x - ob.x, ay = e.y - ob.y; if (ax > 60 || ax < -60 || ay > 60 || ay < -60) continue; var ad = Math.sqrt(ax * ax + ay * ay) || 1, minD = ob.r * ob.s + e.r * 0.6; if (ad < minD) { e.x = ob.x + ax / ad * minD; e.y = ob.y + ay / ad * minD; } }
    e.x = clamp(e.x, 20, W - 20); e.y = clamp(e.y, 20, W - 20);
    // ataque
    e.atkT -= dt;
    if (d <= stop + 4 && e.atkT <= 0 && e.charge <= 0) {
      e.atkAnim = 0;
      if (e.rng) {
        e.atkT = e.boss ? 1.4 : 1.7; var ej = EJ.get();
        if (ej) { var ang = Math.atan2(dy, dx); ej.x = e.x; ej.y = e.y - 6; ej.vx = Math.cos(ang) * 230; ej.vy = Math.sin(ang) * 230; ej.dmg = e.dmg; ej.life = 1.6; ej.r = 5; ej.col = e.def.shot || (e.kind === 'drake' ? '#ff7a3a' : '#c060ff'); }
      } else {
        e.atkT = 0.95;
        if (e.tk === 'hero') { hurtHero(e.dmg, e); if (e.slowHit) H.slowT = 1.5 * (1 - Math.min(0.8, P.resist)); }
        else if (e.tk === 'tower') hurtTower(e.tt, e.dmg);
        else hurtBase(e.dmg);
        if (e.kind === 'vampire') e.hp = Math.min(e.max, e.hp + e.dmg * 0.5);
      }
    }
    e.moving = mv; if (mv && Math.random() < dt * 1.5 && e.kind === 'wraith') part(e.x, e.y, 0, -10, 0.5, 3, 'rgba(127,208,232,0.5)', 3);
  }

  function killEnemy(e, src) {
    if (!e.on) return;
    var P = G.P, df = e.def, x = e.x, y = e.y;
    if (df.revive && !e.rv && !e.boss) { e.rv = 1; e.hp = e.max * 0.4; e.stunT = 0.9; e.iceN = 0; ring(x, y, 46, '#ff9a3a', 0.6); burst(x, y, 10, '#c8a060', 90, 0.6, 3, 0, 60); text(x, y - 18, 'Não descansa…', '#e0b070'); return; }
    G.kills++; e.hp = 0;
    var dp = DP.get(); if (dp) { dp.x = x; dp.y = y; dp.kind = e.kind; dp.id = e.id; dp.col = e.col; dp.face = e.face; dp.t = 0; dp.max = e.boss ? 1.4 : 0.45; dp.s = e.r / 12; dp.elite = e.elite; dp.boss = e.boss; dp.sz = e.r; dp.hue = 0; dp.id = e.id; dp.er = e.r; dp.dr = e.def.r; }
    if (G.mods && G.mods.explode && T.Extra) T.Extra.boom(x, y);
    if (e.elite && !e.boss && T.VFX) T.VFX.play('combat', 'kill', x, y, { col: e.col });
    burst(x, y, e.boss ? 40 : e.elite ? 14 : 6, e.col, e.boss ? 160 : 90, 0.6, 3, 0, 80);
    if (e.kind === 'wraith' || e.kind === 'cultist') burst(x, y, 4, '#7fd0e8', 40, 0.8, 2, 1);
    T.Audio.sfx('hit');
    // explosões
    if (P.explode && src !== 'x') { var ra = 52 * P.area * (1 + 0.25 * (P.explode - 1)), dm = (14 + G.wave) * P.dmg * (1 + 0.5 * P.explode); ring(x, y, ra, '#ff9a3a', 0.35); burst(x, y, 8, '#ffb060', 130, 0.4, 3, 1); aoe(x, y, ra, function (o) { if (o !== e) hurtEnemy(o, dm, 'x', false); }); T.Audio.sfx('boom'); }
    if (e.boom) { var bd = 22 * (1 + G.wave * 0.05); ring(x, y, 54, '#ff5a2a', 0.4); burst(x, y, 14, '#ff7a3a', 150, 0.5, 3, 1); shake(3); T.Audio.sfx('boom'); hitFriendly(x, y, 54, bd); aoe(x, y, 54, function (o) { if (o !== e) hurtEnemy(o, bd * 0.5, 'x', false); }); }
    if (G.syn.plague && e.poisonT > 0) aoe(x, y, 90, function (o) { if (o !== e) { o.poison = Math.max(o.poison, e.poison); o.poisonT = 4; } });
    if (P.lich && Math.random() < 0.12) spawnAlly('spirit', x, y, 10, 7 * P.dmg * P.magic);
    // recompensas
    dropFor(e);
    if (e.boss) bossDied(e);
    EP.put(e);
  }
  function hitFriendly(x, y, r, d) {
    var H = G.hero, B = G.base, dx = H.x - x, dy = H.y - y; if (dx * dx + dy * dy < (r + H.r) * (r + H.r)) hurtHero(d);
    dx = B.x - x; dy = B.y - y; if (dx * dx + dy * dy < (r + B.r) * (r + B.r)) hurtBase(d);
    for (var i = G.towers.length - 1; i >= 0; i--) { var t = G.towers[i]; dx = t.x - x; dy = t.y - y; if (dx * dx + dy * dy < (r + 14) * (r + 14)) hurtTower(t, d); }
  }
  T.hitFriendly = hitFriendly;

  /* ---------- Drops ---------- */
  function spawnPickup(type, x, y, val, rar) {
    var k = KP.get();
    if (!k) { if (type === 'xp') { var a = KP.a; var o = a[RI(0, a.length - 1)]; if (o.on && o.type === 'xp') o.val += val; } return null; }
    k.type = type; k.x = x + R(-8, 8); k.y = y + R(-8, 8); k.val = val; k.rar = rar || 0; k.age = 0; k.life = 28; k.ph = Math.random() * 6; k.vx = R(-40, 40); k.vy = R(-40, 40);
    return k;
  }
  function dropFor(e) {
    var d = e.def.d || {}, P = G.P, dm = P.drop, x = e.x, y = e.y, w = G.wave;
    var xpv = e.def.xp * (1 + w * 0.09) * (e.elite ? 3 : 1) * (e.boss ? 1 : 1);
    addXp(xpv * 0.35);
    var crystals = e.boss ? 14 : e.elite ? 3 : 1, per = xpv * 0.65 / crystals;
    for (var i = 0; i < crystals; i++) spawnPickup('xp', x, y, per);
    if (d.coin && Math.random() < d.coin[0] * Math.min(2, dm)) { var c = RI(d.coin[1], d.coin[2]) * (1 + w * 0.06) * (e.elite ? 3 : 1); spawnPickup('coin', x, y, Math.max(1, Math.round(c * P.coin))); }
    if (G.syn.gilded) for (i = 0; i < 2; i++) if (Math.random() < 0.3) spawnPickup('coin', x, y, Math.max(1, Math.round(2 * P.coin)));
    if (d.frag && Math.random() < d.frag * dm) spawnPickup('frag', x, y, 1, 1);
    if (Math.random() < 0.018 * dm) spawnPickup('potion', x, y, 1);
    if (d.relic && Math.random() < d.relic * dm) spawnPickup('chest', x, y, 1, 3);
    if (d.rare && Math.random() < d.rare * dm) spawnPickup('chest', x, y, 1, 2);
    if (e.elite && Math.random() < 0.4) spawnPickup('chest', x, y, 1, 2 + (Math.random() < 0.3 ? 1 : 0));
    if (e.boss) { spawnPickup('coin', x, y, Math.round((120 + w * 16) * P.coin)); for (i = 0; i < 6; i++) spawnPickup('frag', x, y, 1, 2); }
  }
  function updPickup(k, dt) {
    var H = G.hero, P = G.P;
    k.age += dt; k.life -= dt; if (k.life <= 0) { KP.put(k); return; }
    k.x += k.vx * dt; k.y += k.vy * dt; k.vx *= 0.9; k.vy *= 0.9;
    var dx = H.x - k.x, dy = H.y - k.y, d2 = dx * dx + dy * dy, d = Math.sqrt(d2) || 1;
    var rad = P.magnet; if (P.autocol && (k.type === 'xp' || k.type === 'coin' || k.type === 'frag')) rad += 170 * P.autocol;
    if (G.vac > 0 && k.type !== 'chest') rad = 3000;
    if (d < rad && k.age > 0.35) { var sp = G.vac > 0 ? 520 : 140 + (1 - d / rad) * 320; k.x += dx / d * sp * dt; k.y += dy / d * sp * dt; k.life = Math.max(k.life, 3); }
    if (d < H.r + 10) pickCollect(k);
  }
  function collectEffect(k) {
    var P = G.P;
    switch (k.type) {
      case 'xp': addXp(k.val); T.Audio.sfx('xp'); break;
      case 'coin': G.coins += k.val; text(G.hero.x, G.hero.y - 22, '+' + k.val, '#ffd24a'); T.Audio.sfx('coin'); break;
      case 'potion': G.potions = Math.min(5, (G.potions || 0) + 1); text(G.hero.x, G.hero.y - 22, '+poção', '#ff7a8a'); T.Audio.sfx('pick'); ui('hud'); break;
      case 'frag': G.frag += k.val; T.Audio.sfx('pick'); text(G.hero.x, G.hero.y - 22, '+essência', '#b06cff'); break;
      case 'chest': openReward('Baú Encontrado', k.rar || 2); break;
    }
  }
  function pickCollect(k) { collectEffect(k); KP.put(k); }

  /* ---------- XP, níveis e cartas ---------- */
  function addXp(v) {
    G.xp += v * G.P.xp;
    while (G.xp >= G.need) { G.xp -= G.need; G.lvl++; G.need = xpNeed(G.lvl); G.pend++; }
    if (G.pend > 0 && G.state === 'play') startLevelUp();
  }
  function rollCards(n, minRar) {
    var P = G.P, out = [], tries = 0;
    while (out.length < n && tries++ < 40) {
      var ws = [], tot = 0;
      for (var i = 0; i < 6; i++) { var rr = T.RAR[i], w = (G.lvl >= rr.min ? rr.w : 0) * (1 + P.rarity * i * 0.45); if (i < (minRar || 0)) w = 0; ws.push(w); tot += w; }
      var x = Math.random() * tot, r = 0; for (i = 0; i < 6; i++) { x -= ws[i]; if (x <= 0) { r = i; break; } }
      var cand = null;
      for (var rr2 = r; rr2 >= 0 && !cand; rr2--) {
        var list = T.SK.filter(function (s) { return s.rar === rr2 && (G.skills[s.id] || 0) < s.max && (!s.req || G.skills[s.req]) && out.indexOf(s) < 0; });
        if (list.length) {
          // pequena preferência por habilidades que completam uma sinergia
          var pref = list.filter(function (s) { return T.SYN.some(function (y) { return !G.syn[y.id] && y.need.indexOf(s.id) >= 0 && y.need.some(function (o) { return o !== s.id && G.skills[o]; }); }); });
          cand = (pref.length && Math.random() < 0.35) ? T.pick(pref) : T.pick(list);
        }
      }
      if (cand) out.push(cand);
    }
    return out;
  }
  function startLevelUp() {
    if (G.pend <= 0) return;
    G.pend--; G.state = 'levelup';
    var cards = rollCards(G.P.cards + (Math.random() < 0.1 ? 1 : 0));
    if (!cards.length) { G.state = 'play'; G.coins += 50; return; }
    G.cards = cards; var H = G.hero;
    ring(H.x, H.y, 140, '#ffe9a0', 0.9); ring(H.x, H.y, 80, '#fff', 0.6); burst(H.x, H.y, 36, '#ffe9a0', 200, 0.9, 3, 1); G.flash = 0.5; G.flashCol = '#ffe9a0';
    T.Audio.sfx('level'); var mr = 0; cards.forEach(function (c) { mr = Math.max(mr, c.rar || 0); }); if (T.Audio.rarity) T.Audio.rarity(mr); ui('showLevel', cards, G.lvl);
  }
  function chooseSkill(id) {
    var s = SKI[id]; if (!s || G.state !== 'levelup') return;
    T.Save.d.seen.s[id] = 1; var oldMax = G.hero.max; if (T.Save.d.seen) T.Save.d.seen.s[id] = 1; G.skills[id] = (G.skills[id] || 0) + 1; T.Save.d.seen.s[id] = 1; T.Save.d.seen.s[id] = 1; s.fx(G.P, G);
    var P = G.P; G.P.tcost = Math.max(0.4, P.tcost);
    recalc(); G.hero.hp = Math.min(G.hero.max, G.hero.hp + Math.max(0, G.hero.max - oldMax));
    if (T.VFX) { T.VFX.play('ui', 'rarity', G.hero.x, G.hero.y - 10, { r: s.rar }); if (T.Audio.rarity) T.Audio.rarity(s.rar); }
    if (s.rar >= 5) G.mythic++;
    G.hero.shield = Math.max(G.hero.shield, P.shieldN > 0 ? Math.min(G.hero.shield + 1, P.shieldN) : 0);
    var H = G.hero; burst(H.x, H.y, 18, T.RAR[s.rar].c, 120, 0.7, 3, 1); ring(H.x, H.y, 60, T.RAR[s.rar].c, 0.5); T.Audio.sfx('pick');
    checkSyn(); ui('hideLevel');
    G.state = 'play';
    if (G.pend > 0) startLevelUp();
    ui('hud');
  }
  function checkSyn() {
    T.SYN.forEach(function (y) {
      if (G.syn[y.id]) return;
      if (y.need.every(function (k) { return G.skills[k]; })) {
        G.syn[y.id] = 1; T.Save.d.syn[y.id] = 1; T.Save.save();
        var H = G.hero; ring(H.x, H.y, 160, '#ff9a3a', 1); burst(H.x, H.y, 40, '#ffd24a', 220, 1, 3, 1); G.flash = 0.35; G.flashCol = '#ff9a3a';
        ui('banner', '✦ Sinergia descoberta', y.n + ': ' + y.d, '#ffd24a'); T.Audio.sfx('win');
      }
    });
  }
  function giveRelic(id) {
    var r = T.RELI[id]; if (!r || G.relics.indexOf(id) >= 0) return;
    var oldMax = G.hero.max; G.relics.push(id); r.fx(G.P, G); T.Save.d.relics[id] = 1;
    T.RCOMBO.forEach(function (c) {
      if (!G.rcombo[c.id] && G.relics.indexOf(c.a) >= 0 && G.relics.indexOf(c.b) >= 0) { G.rcombo[c.id] = 1; if (c.id === 'rc_arc') G.P.magic += 0.6; ui('banner', '✦ Combo de relíquias', c.n + ': ' + c.d, '#e8a93a'); }
    });
    recalc(); G.hero.hp = Math.min(G.hero.max, G.hero.hp + Math.max(0, G.hero.max - oldMax));
    var H = G.hero; burst(H.x, H.y, 20, T.RAR[r.rar].c, 130, 0.8, 3, 1); T.Audio.sfx('pick'); T.Save.save(); ui('hud');
  }
  function openReward(title, minRar) {
    if (G.state !== 'play') { later(0.5, function () { openReward(title, minRar); }); return; }
    var P = G.P, pool = T.REL.filter(function (r) { return G.relics.indexOf(r.id) < 0; });
    pool.sort(function () { return Math.random() - 0.5; });
    pool.sort(function (a, b) { return (b.rar >= minRar ? 1 : 0) - (a.rar >= minRar ? 1 : 0); });
    var opts = pool.slice(0, 3), full = G.relics.length >= P.slots;
    if (!opts.length || full) { var ess = 10 + G.wave; G.frag += ess; G.coins += 60; text(G.hero.x, G.hero.y - 26, full ? 'Mochila cheia: +' + ess + ' essência' : '+' + ess + ' essência', '#b06cff', true); return; }
    G.state = 'reward'; G.rewardOpts = opts; ui('showReward', title, opts); T.Audio.sfx('pick');
  }
  function chooseRelic(id) { if (G.state !== 'reward') return; giveRelic(id); ui('hideReward'); G.state = 'play'; if (G.pend > 0) startLevelUp(); }
  function skipReward() { if (G.state !== 'reward') return; G.frag += 5; ui('hideReward'); G.state = 'play'; if (G.pend > 0) startLevelUp(); }

  /* ---------- Aliados ---------- */
  function spawnAlly(kind, x, y, life, dmg) {
    var a = AL.get(); if (!a) return null;
    a.kind = kind; a.x = x; a.y = y; a.life = life; a.dmg = dmg; a.atkT = 0.4; a.anim = Math.random() * 6; a.face = 1; a.perm = life > 900; a.tgt = null; a.shT = 0; a.atkAnim = 9; a.moving = 0;
    return a;
  }
  T.int = { Pool: Pool, part: part, burst: burst, ring: ring, text: text, zap: zap, shake: shake, ui: ui, later: later, hurtHero: hurtHero, hurtBase: hurtBase, hurtTower: hurtTower, heal: heal, knock: knock, stun: stun, freeze: freeze,
    hurtEnemy: hurtEnemy, strike: strike, procs: procs, lightning: lightning, killEnemy: killEnemy, spawnPickup: spawnPickup, addXp: addXp, startLevelUp: startLevelUp, chooseSkill: chooseSkill,
    giveRelic: giveRelic, openReward: openReward, chooseRelic: chooseRelic, skipReward: skipReward, spawnAlly: spawnAlly, recalc: recalc, newRun: newRun, updEnemy: updEnemy, updPickup: updPickup,
    buildGrid: buildGrid, collect: pickCollect, pickTarget: pickTarget, dropCoin: dropCoin };
  T.int.gridQ = { aoe: aoe, nearest: nearest, collect: collect };
  T.int.getObst = function () { return OBST; };
  T.int.bufs = function () { return BUFS; };
  /* ---------- Pontes para os módulos seguintes (chefes, partida, interface) ---------- */
  function bossLogic(e, dt) { if (T.Boss) T.Boss.logic(e, dt); }
  function bossDied(e) { if (T.Boss) T.Boss.died(e); }
  function endRun(win, why) { if (T.Run) T.Run.end(win, why); }
  T.int.later = later; T.int.G = G; T.int.xpNeed = xpNeed; T.int.rng32 = rng32; T.int.EP = EP;
  T.int.spawnEnemy = spawnEnemy; T.int.dropCoin = dropCoin; T.int.hitFriendly = hitFriendly;
})(window.TD);

'use strict';
/* NOCTARIA — Particle Engine independente. Opera sobre o pool T.pools.XP (limite por qualidade).
   Tipos: 0 ponto | 1 faísca/brilho aditivo | 2 estilhaço | 3 fumaça | 4 anel | 5 chama | 6 runa | 7 rastro | 8 alma | 9 cruz de cura | 10 gota de sangue
   Comportamentos (p.beh): 1 orbital | 2 atração | 3 repulsão */
(function (T) {
  var FX = T.FX = { decals: [], dn: 0 }, R = T.R, TAU = T.TAU, I = T.int;
  var P = function (x, y, vx, vy, life, size, col, type, g) { return I.part(x, y, vx, vy, life, size, col, type, g); };
  FX.update = function (dt) {
    var pool = T.pools.XP, a = pool.a;
    for (var i = 0; i < a.length; i++) {
      var p = a[i]; if (!p.on) continue;
      p.life -= dt; if (p.life <= 0) { pool.put(p); continue; }
      if (p.beh === 1) { p.a += p.w * dt; p.x = p.cx + Math.cos(p.a) * p.orr; p.y = p.cy + Math.sin(p.a) * p.orr * 0.7; if (p.hi) p.orr += p.hi * dt; continue; }
      if (p.beh === 2 || p.beh === 3) { var dx = p.cx - p.x, dy = p.cy - p.y, d = Math.sqrt(dx * dx + dy * dy) || 1, f = (p.beh === 2 ? 1 : -1) * 260 * dt; p.vx += dx / d * f; p.vy += dy / d * f; if (p.beh === 2 && d < 8) p.life = 0; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.type === 3) { p.vx *= 0.96; p.vy *= 0.96; p.vy -= 8 * dt; } else if (p.type === 5) { p.vy -= 40 * dt; p.vx *= 0.97; } else if (p.type === 8) { p.vx += Math.sin(p.life * 9 + p.size) * 40 * dt; p.vy -= 12 * dt; } else if (p.g) p.vy += p.g * dt;
      if (p.type === 6 || p.type === 2) p.rot += (p.type === 6 ? 1.4 : 5) * dt;
    }
    for (i = FX.decals.length - 1; i >= 0; i--) { var d2 = FX.decals[i]; d2.life -= dt; if (d2.life <= 0) FX.decals.splice(i, 1); }
  };
  FX.decal = function (x, y, r, col, life) { if (T.Q().light < 1 && T.Q().part < 200) return; if (FX.decals.length > 36) FX.decals.shift(); FX.decals.push({ x: x, y: y, r: r, col: col, life: life || 9, max: life || 9 }); };
  FX.sparks = function (x, y, n, col, spd) { for (var i = 0; i < n; i++) { var a = R(0, TAU), s = spd * R(0.4, 1); P(x, y, Math.cos(a) * s, Math.sin(a) * s, R(0.15, 0.35), R(1.2, 2.2), col || '#ffd9a0', 7, 120); } };
  FX.smoke = function (x, y, n, col, size) { for (var i = 0; i < n; i++) P(x + R(-6, 6), y + R(-4, 4), R(-14, 14), R(-26, -8), R(0.7, 1.3), size || 9, col || 'rgba(60,56,70,0.5)', 3); };
  FX.flame = function (x, y, n, big) { for (var i = 0; i < n; i++) P(x + R(-5, 5), y + R(-3, 3), R(-14, 14), R(-40, -10), R(0.35, 0.7), (big ? 7 : 4.5) * R(0.7, 1.2), i % 3 ? '#ff7a2a' : '#ffc04a', 5); };
  FX.ice = function (x, y, n) { for (var i = 0; i < n; i++) { var a = R(0, TAU), s = R(40, 110); var p = P(x, y, Math.cos(a) * s, Math.sin(a) * s - 30, R(0.4, 0.8), R(2, 3.6), i % 2 ? '#e8fbff' : '#8ad0ff', 2, 160); if (p) p.rot = R(0, 3); } };
  FX.blood = function (x, y, n, col) { for (var i = 0; i < n; i++) { var a = R(0, TAU), s = R(30, 100); P(x, y - 6, Math.cos(a) * s, Math.sin(a) * s - 40, R(0.3, 0.6), R(1.4, 2.6), col || '#8a1020', 10, 260); } };
  FX.soul = function (x, y, n, col) { for (var i = 0; i < n; i++) P(x + R(-8, 8), y + R(-4, 4), R(-10, 10), R(-30, -12), R(0.8, 1.5), R(2.5, 4), col || '#6fffc0', 8); };
  FX.heal = function (x, y, n, col) { for (var i = 0; i < n; i++) P(x + R(-12, 12), y + R(-6, 6), R(-6, 6), R(-40, -18), R(0.6, 1), R(3, 4.5), col || '#8affb0', 9); };
  FX.explosion = function (x, y, r, col) {
    I.ring(x, y, r, col || '#ff9a3a', 0.35); I.ring(x, y, r * 0.55, '#fff4d0', 0.2);
    I.burst(x, y, 8, col || '#ffb060', r * 2.4, 0.4, 3, 1); FX.smoke(x, y, 3, null, r * 0.35); FX.sparks(x, y, 6, '#ffe0a0', r * 3); FX.decal(x, y, r * 0.7, 'rgba(10,6,4,0.35)', 8);
  };
  FX.runeCircle = function (x, y, r, col, n) { for (var i = 0; i < (n || 8); i++) { var p = P(x, y, 0, 0, 1.2, R(4, 6), col, 6); if (p) { p.beh = 1; p.cx = x; p.cy = y; p.a = i * TAU / (n || 8); p.orr = r; p.w = 1.8; p.rot = R(0, 6); } } I.ring(x, y, r, col, 0.8); };
  FX.orbit = function (x, y, r, col, n, life, w) { for (var i = 0; i < n; i++) { var p = P(x, y, 0, 0, life, 2.6, col, 1); if (p) { p.beh = 1; p.cx = x; p.cy = y; p.a = i * TAU / n; p.orr = r; p.w = w || 3; } } };
  FX.pull = function (x, y, r, col, n) { for (var i = 0; i < n; i++) { var a = R(0, TAU), p = P(x + Math.cos(a) * r, y + Math.sin(a) * r, 0, 0, 0.7, R(1.6, 2.6), col, 1); if (p) { p.beh = 2; p.cx = x; p.cy = y; } } };
  FX.push = function (x, y, n, col) { for (var i = 0; i < n; i++) { var a = R(0, TAU), p = P(x + Math.cos(a) * 14, y + Math.sin(a) * 14, Math.cos(a) * 90, Math.sin(a) * 90, 0.5, 2, col, 1); if (p) { p.beh = 3; p.cx = x; p.cy = y; } } };
  FX.trail = function (x, y, col, s) { P(x, y, R(-6, 6), R(-6, 6), 0.3, s || 2.6, col, 1); };
  /* Rastros de lâmina (arcos): desenhados pelo renderizador. */
  FX.slashes = [];
  FX.slash = function (x, y, a, r, span, col, life, w) { if (FX.slashes.length > 9) FX.slashes.shift(); FX.slashes.push({ x: x, y: y, a: a, r: r, span: span, col: col, life: life || 0.18, max: life || 0.18, w: w || 5 }); };
  FX.afterimage = function (x, y, kind, face, col) { if (FX.slashes.length > 12) return; FX.slashes.push({ x: x, y: y, img: kind, face: face, col: col, life: 0.3, max: 0.3 }); };
  var up0 = FX.update; FX.update = function (dt) { up0(dt); for (var i = FX.slashes.length - 1; i >= 0; i--) { var s = FX.slashes[i]; s.life -= dt; if (s.life <= 0) FX.slashes.splice(i, 1); } };
})(window.TD);

'use strict';
/* NOCTARIA — combate do herói: movimento, ataques por classe, especiais, magias passivas,
   projéteis, zonas, aliados e o passo de simulação (T.Sim.step). */
(function (T) {
  var I = T.int, G = I.G, R = T.R, RI = T.RI, TAU = T.TAU, clamp = T.clamp, A = T.Anim, FX = T.FX, pools = T.pools;
  var EP = pools.EP, PP = pools.PP, EJ = pools.EJ, HZ = pools.HZ, AL = pools.AL, KP = pools.KP, TP = pools.TP, ZP = pools.ZP, DP = pools.DP;
  T.SPCD = { knight: 16, mage: 14, archer: 13, necro: 18, paladin: 20, assassin: 11 };
  var PB = [], PB2 = [];
  function dist(a, b) { var dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); }
  function base() { return G.cls.dmg * G.P.dmg; }

  var C = T.Combat = {};
  C.init = function () {
    var H = G.hero; H.an = A.make(function (n) { }); H.swing = 0; H.busy = 0; H.aim = 0; H.afterT = 0; H.invisT = 0;
    G.furyOn = 0; G.timeStop = 0;
  };

  /* ---------- Zonas ---------- */
  function zone(kind, x, y, r, life, o) {
    var z = HZ.get(); if (!z) return null;
    z.kind = kind; z.x = x; z.y = y; z.r = r; z.life = z.max = life; z.tk = 0; z.dmg = 0; z.col = '#fff'; z.hostile = 0; z.n = 0; z.tick = 0.5;
    if (o) for (var k in o) z[k] = o[k]; return z;
  }
  C.zone = zone;

  /* ---------- Projéteis ---------- */
  function proj(kind, x, y, ang, spd, dmg, o) {
    var p = PP.get(); if (!p) return null;
    p.kind = kind; p.x = x; p.y = y; p.vx = Math.cos(ang) * spd; p.vy = Math.sin(ang) * spd; p.a = ang; p.dmg = dmg; p.life = 1.4; p.r = 5; p.pierce = 0; p.src = 'p'; p.col = '#fff';
    p.nocol = 0; p.home = 0; p.expl = 0; p.chain = 0; p.fx = null; p.fxv = 0; p.tw = null; p.hn = 0; p.tgt = null; p.spd = spd; p.splash = 0.7;
    for (var i = 0; i < 6; i++) p.hit[i] = 0;
    if (o) for (var k in o) p[k] = o[k]; return p;
  }
  C.proj = proj;
  function hasHit(p, e) { for (var i = 0; i < 6; i++) if (p.hit[i] === e.uid) return true; return false; }
  function impact(p, e, crit) {
    var col = p.col;
    switch (p.kind) {
      case 'arrow': FX.sparks(e.x, e.y - 4, crit ? 7 : 3, '#e8f0c8', 110); break;
      case 'orb': I.burst(e.x, e.y - 4, 5, col, 90, 0.35, 2.4, 1); break;
      case 'soul': FX.soul(e.x, e.y, 2, '#6fffc0'); break;
      case 'ball': break;
      case 'flame': FX.flame(e.x, e.y - 4, 3); break;
      case 'shard': FX.ice(e.x, e.y - 4, 3); break;
      case 'bolt': FX.sparks(e.x, e.y - 4, 5, '#fff2a0', 100); break;
      case 'glob': I.burst(e.x, e.y, 5, '#7be05a', 70, 0.4, 2.2, 0, 60); break;
      default: I.burst(e.x, e.y - 4, 4, col, 80, 0.3, 2, 1);
    }
  }
  function hitProj(p, e) {
    p.hit[p.hn++ % 6] = e.uid; var crit;
    if (p.src === 'p') { crit = I.strike(e, p.dmg, 'p'); G.stats.dmg += p.dmg; I.procs(e, crit); }
    else { crit = I.strike(e, p.dmg, 't', false); G.stats.towerDmg += p.dmg; }
    if (e.on && p.fx) {
      if (p.fx === 'fire') { e.burn = Math.max(e.burn, p.fxv); e.burnT = 3; if (G.syn.forge && Math.random() < 0.15) zone('fire', e.x, e.y, 26, 2.5, { dmg: p.fxv * 0.6, col: '#ff7a2a', tick: 0.4 }); }
      else if (p.fx === 'ice') { e.slowT = 2; e.slowF = 0.4; e.iceN++; if (P_().tt.iceFreeze && Math.random() < 0.08 * P_().tt.iceFreeze + (e.iceN >= 3 ? 1 : 0)) { e.iceN = 0; I.freeze(e, 1.1); } }
      else if (p.fx === 'poison') { e.poison = Math.max(e.poison, p.fxv); e.poisonT = 4; }
    }
    impact(p, e, crit);
    if (p.kind === 'ball' || p.expl > 0) {
      var rr = p.expl || 40; FX.explosion(p.x, p.y, rr, p.col); I.shake(p.src === 'p' ? 1.5 : 2); T.Audio.sfx('boom');
      var dmg = p.dmg * p.splash;
      I.gridQ.aoe(p.x, p.y, rr, function (o) { if (o !== e && o.on) I.hurtEnemy(o, dmg, 'x', false); });
      p.pierce = 0; p.chain = 0;
    }
    if (p.chain > 0) {
      var best = null, bd = 160 * 160; I.gridQ.collect(PB2, e.x, e.y, 150, true);
      for (var i = 0; i < PB2.length; i++) { var o = PB2[i]; if (!o.on || o === e || hasHit(p, o)) continue; var dx = o.x - e.x, dy = o.y - e.y, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = o; } }
      if (best) { p.chain--; var a = Math.atan2(best.y - p.y, best.x - p.x); p.vx = Math.cos(a) * p.spd; p.vy = Math.sin(a) * p.spd; p.a = a; p.life = Math.max(p.life, 0.7); FX.sparks(p.x, p.y, 3, p.col, 80); return; }
    }
    T.Audio.sfx('hit');
    if (p.pierce > 0) p.pierce--; else PP.put(p);
  }
  function P_() { return G.P; }
  function updProj(dt) {
    var a = PP.a;
    for (var i = 0; i < a.length; i++) {
      var p = a[i]; if (!p.on) continue;
      p.life -= dt; if (p.life <= 0) { if (p.kind === 'glob') { zone('poison', p.x, p.y, p.expl || 40, 4.5, { dmg: p.dmg * 0.5, col: '#7be05a', tick: 0.5 }); I.burst(p.x, p.y, 8, '#7be05a', 70, 0.5, 2.5, 0, 60); } if (p.kind === 'ball' && p.src === 't') { FX.explosion(p.x, p.y, p.expl || 40, p.col); I.gridQ.aoe(p.x, p.y, p.expl || 40, function (o) { I.hurtEnemy(o, p.dmg * 0.7, 'x', false); }); } PP.put(p); continue; }
      if (p.home) {
        var t = p.tgt; if (!t || !t.on) { t = p.tgt = I.gridQ.nearest(p.x, p.y, 240, true); }
        if (t) { var ta = Math.atan2(t.y - 6 - p.y, t.x - p.x), da = ta - p.a; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU; p.a += clamp(da, -6 * dt, 6 * dt); p.vx = Math.cos(p.a) * p.spd; p.vy = Math.sin(p.a) * p.spd; }
      }
      p.x += p.vx * dt; p.y += p.vy * dt;
      switch (p.kind) {
        case 'arrow': if (Math.random() < 0.5) FX.trail(p.x, p.y, 'rgba(230,240,200,0.8)', 1.6); break;
        case 'orb': if (Math.random() < 0.7) FX.trail(p.x, p.y, p.col, 2.6); break;
        case 'soul': if (Math.random() < 0.5) I.part(p.x, p.y, R(-8, 8), R(-14, -4), 0.5, 3, '#6fffc0', 8); break;
        case 'flame': if (Math.random() < 0.8) I.part(p.x, p.y, R(-10, 10), R(-30, -8), 0.3, 4, '#ff8a2a', 5); break;
        case 'shard': if (Math.random() < 0.5) I.part(p.x, p.y, R(-8, 8), R(-8, 8), 0.3, 1.8, '#d8f4ff', 1); break;
        case 'ball': if (Math.random() < 0.6) I.part(p.x, p.y, R(-8, 8), R(-10, -2), 0.5, 5, 'rgba(70,66,78,0.5)', 3); break;
        case 'glob': if (Math.random() < 0.4) I.part(p.x, p.y, 0, 0, 0.4, 2, '#7be05a', 0, 40); break;
      }
      if (p.nocol) continue;
      I.gridQ.collect(PB, p.x, p.y, p.r, false);
      for (var j = 0; j < PB.length; j++) { var e = PB[j]; if (!p.on) break; if (!e.on || hasHit(p, e)) continue; hitProj(p, e); }
      if (p.x < -40 || p.y < -40 || p.x > T.W + 40 || p.y > T.W + 40) PP.put(p);
    }
    // projéteis inimigos
    a = EJ.a;
    for (i = 0; i < a.length; i++) {
      var j2 = a[i]; if (!j2.on) continue;
      j2.life -= dt; if (j2.life <= 0) { EJ.put(j2); continue; }
      j2.x += j2.vx * dt; j2.y += j2.vy * dt; if (Math.random() < 0.6) I.part(j2.x, j2.y, R(-6, 6), R(-6, 6), 0.3, 2.4, j2.col, 1);
      var H = G.hero, dx = H.x - j2.x, dy = H.y - j2.y;
      if (dx * dx + dy * dy < (H.r + j2.r) * (H.r + j2.r)) { I.hurtHero(j2.dmg); FX.sparks(j2.x, j2.y, 4, j2.col, 80); EJ.put(j2); continue; }
      var B = G.base; dx = B.x - j2.x; dy = B.y - j2.y; if (dx * dx + dy * dy < (B.r + j2.r) * (B.r + j2.r)) { I.hurtBase(j2.dmg * 0.6); FX.sparks(j2.x, j2.y, 4, j2.col, 80); EJ.put(j2); continue; }
      for (var k = 0; k < G.towers.length; k++) { var t = G.towers[k]; dx = t.x - j2.x; dy = t.y - j2.y; if (dx * dx + dy * dy < 18 * 18) { I.hurtTower(t, j2.dmg * 0.7); EJ.put(j2); break; } }
    }
  }

  /* ---------- Ataques do herói ---------- */
  function melee(t, dmg, arc, reach, col, opts) {
    var H = G.hero, P = G.P, ang = Math.atan2(t.y - H.y, t.x - H.x), hit = 0, rr = reach * (1 + (P.area - 1) * 0.6);
    H.aim = ang; opts = opts || {};
    FX.slash(H.x, H.y - 8, ang, rr * 0.9, arc, col, opts.life || 0.2, opts.w || 6);
    I.gridQ.collect(PB, H.x, H.y, rr, false);
    var list = PB.slice();
    for (var i = 0; i < list.length; i++) {
      var e = list[i]; if (!e.on) continue;
      var a2 = Math.atan2(e.y - H.y, e.x - H.x), da = Math.abs(a2 - ang); if (da > Math.PI) da = TAU - da;
      if (da > arc && dist(e, H) > e.r + 14) continue;
      var crit = I.strike(e, dmg, 'h'); I.procs(e, crit); hit++; G.stats.dmg += dmg;
      if (opts.knock) I.knock(e, H, opts.knock);
      if (opts.sparks) FX.sparks(e.x, e.y - 4, crit ? 8 : 4, opts.sparks, 130); if (opts.blood) FX.blood(e.x, e.y, 2, opts.blood);
    }
    if (hit) { T.Audio.sfx('slash'); if (opts.stop) G.hitstop = Math.max(G.hitstop, opts.stop); if (opts.shake) I.shake(opts.shake); }
    return hit;
  }
  function spreadAngles(n, ang) { var w = G.syn.volley ? 0.5 : 0.2, out = []; for (var i = 0; i < n; i++) out.push(ang + (i - (n - 1) / 2) * w); return out; }
  function attack(t) {
    var H = G.hero, P = G.P, id = G.clsId, b = base(), ang = Math.atan2(t.y - 6 - H.y, t.x - H.x), n = 1 + P.proj;
    H.face = t.x >= H.x ? 1 : -1; H.atkAnim = 0; H.aim = ang; H.swing++;
    A.play(H.an, id === 'mage' || id === 'necro' ? 'cast' : 'attack', true);
    var again = G.P.twin ? 2 : 1;
    for (var rep = 0; rep < again; rep++) {
      (function (rep) { var fn = function () { doAttack(id, t, b * (rep ? 0.7 : 1), ang, n); }; if (rep) I.later(0.12, function () { if (G.state === 'play' && t.on) fn(); }); else fn(); })(rep);
    }
  }
  function doAttack(id, t, b, ang, n) {
    var H = G.hero, P = G.P, hx = H.x + Math.cos(ang) * 10, hy = H.y - 10 + Math.sin(ang) * 6;
    switch (id) {
      case 'knight': {
        var heavy = H.swing % 3 === 0, arc = 0.95 + 0.4 * (n - 1);
        melee(t, b * (heavy ? 1.7 : 1), Math.min(3.1, arc), C_rng(), heavy ? '#ff3a4a' : '#e8e0e0', { sparks: '#ffd9a0', knock: heavy ? 40 : 14, stop: heavy ? 0.045 : 0, shake: heavy ? 2.2 : 0, life: heavy ? 0.28 : 0.2, w: heavy ? 9 : 6 });
        if (heavy) { I.ring(H.x + Math.cos(ang) * 40, H.y + Math.sin(ang) * 40, 30, '#ff3a4a', 0.3); FX.sparks(H.x + Math.cos(ang) * 30, H.y, 8, '#ffb070', 160); }
        break; }
      case 'paladin': {
        var holy = H.swing % 4 === 0;
        melee(t, b * (holy ? 1.4 : 1), 0.9 + 0.4 * (n - 1), C_rng(), '#fff0b0', { sparks: '#ffe9a0', life: 0.22, w: 7 });
        if (holy) { I.ring(H.x, H.y, 70, '#fff0b0', 0.45); FX.heal(H.x, H.y, 4, '#fff0b0'); I.heal(H.max * 0.02); var B = G.base; B.hp = Math.min(B.max, B.hp + 6); I.gridQ.aoe(H.x, H.y, 70, function (e) { I.hurtEnemy(e, b * 0.8, 'z', false); }); }
        break; }
      case 'assassin': {
        var d = dist(t, H);
        if (d > 46) { for (var k = 0; k < 3; k++) FX.afterimage(H.x + (t.x - H.x) * k / 3, H.y + (t.y - H.y) * k / 3, 'hero_assassin', H.face, '#6a4aa8'); var q = (d - 30) / d; H.x += (t.x - H.x) * q; H.y += (t.y - H.y) * q; FX.smoke(H.x, H.y, 2, 'rgba(40,24,70,0.6)', 7); }
        melee(t, b, 1.1, C_rng() + 6, '#c8a0ff', { sparks: '#c8a0ff', life: 0.14, w: 4, blood: '#8a1030' });
        I.later(0.07, function () { if (G.state === 'play' && t.on) melee(t, b * 0.8, 1.1, C_rng() + 6, '#7a5ad0', { life: 0.14, w: 4 }); });
        break; }
      case 'mage': {
        var an = spreadAngles(n, ang);
        for (var i = 0; i < an.length; i++) proj('orb', hx, hy, an[i], 330, b, { col: '#b06cff', r: 7, expl: 34 * P.area, home: 0, splash: 0.55, life: 1.3, chain: P.chain });
        FX.runeCircle(H.x, H.y + 2, 20, '#c08aff', 3); T.Audio.sfx('magic'); break; }
      case 'archer': {
        an = spreadAngles(n, ang);
        for (i = 0; i < an.length; i++) proj('arrow', hx, hy, an[i], 620, b, { col: '#e8f0c8', r: 4, pierce: P.pierce, life: 0.9, chain: P.chain });
        T.Audio.sfx('shoot'); break; }
      case 'necro': {
        an = spreadAngles(n, ang);
        for (i = 0; i < an.length; i++) proj('soul', hx, hy, an[i], 250, b, { col: '#3ae0a0', r: 7, home: 1, life: 2, chain: P.chain, pierce: P.pierce });
        FX.soul(H.x, H.y - 10, 2, '#3ae0a0'); T.Audio.sfx('magic'); break; }
    }
  }
  function C_rng() { return G.cls.rng; }

  /* ---------- Habilidades especiais ---------- */
  function bestCluster(maxD) {
    var H = G.hero, best = null, bs = -1;
    I.gridQ.collect(PB, H.x, H.y, maxD, false); var list = PB.slice();
    for (var i = 0; i < list.length && i < 40; i++) { var e = list[i], s = 0; for (var j = 0; j < list.length && j < 40; j++) { var dx = list[j].x - e.x, dy = list[j].y - e.y; if (dx * dx + dy * dy < 90 * 90) s++; } if (s > bs) { bs = s; best = e; } }
    return best ? { x: best.x, y: best.y } : { x: H.x + H.face * 120, y: H.y };
  }
  var SPEC = {
    knight: function () {
      var B = G.base, P = G.P, r = 125 * P.area, b = base();
      zone('wall', B.x, B.y, r, 6.5, { dmg: b * 1.5, col: '#ff2a3a', tick: 0.5 });
      B.shield = Math.max(B.shield, 170 + G.wave * 8); B.shT = 6.5;
      I.ring(B.x, B.y, r, '#ff2a3a', 0.7); I.ring(B.x, B.y, r * 0.6, '#ffb0b0', 0.5); FX.sparks(B.x, B.y, 14, '#ff6a6a', 220); I.shake(5);
      I.gridQ.aoe(B.x, B.y, r, function (e) { I.knock(e, B, 200); I.hurtEnemy(e, b * 2, 'z', false); });
    },
    mage: function () {
      var P = G.P, c = bestCluster(340), b = base();
      zone('rift', c.x, c.y, 95 * P.area, 6, { dmg: b * 0.9 * P.magic, col: '#b06cff', tick: 0.4 });
      FX.runeCircle(c.x, c.y, 80 * P.area, '#c08aff', 10); I.shake(3); T.Audio.sfx('magic');
    },
    archer: function () {
      var P = G.P, c = bestCluster(330), b = base();
      zone('rain', c.x, c.y, 110 * P.area, 2.6, { dmg: b * 1.7, col: '#e8f0c8', tick: 0.1 });
      I.ring(c.x, c.y, 110 * P.area, '#e8f0c8', 0.6); T.Audio.sfx('shoot');
    },
    necro: function () {
      var H = G.hero, P = G.P, b = base();
      for (var i = 0; i < 6; i++) { var a = i * TAU / 6; I.spawnAlly('spirit', H.x + Math.cos(a) * 36, H.y + Math.sin(a) * 36, 13, b * 1.5 * P.magic); }
      FX.soul(H.x, H.y, 14, '#3ae0a0'); I.ring(H.x, H.y, 120, '#3ae0a0', 0.7); FX.smoke(H.x, H.y, 8, 'rgba(30,120,90,0.45)', 12); I.shake(2); T.Audio.sfx('magic');
    },
    paladin: function () {
      var H = G.hero, B = G.base, b = base();
      B.hp = Math.min(B.max, B.hp + B.max * 0.25); I.heal(H.max * 0.35);
      for (var i = 0; i < G.towers.length; i++) { var t = G.towers[i]; if (dist(t, H) < 270 || dist(t, B) < 270) { t.buffT = 8; t.hp = Math.min(t.max, t.hp + t.max * 0.4); FX.heal(t.x, t.y - 10, 4, '#fff0b0'); } }
      I.ring(H.x, H.y, 200, '#fff0b0', 0.8); I.ring(H.x, H.y, 120, '#fff', 0.5); FX.heal(H.x, H.y, 12, '#fff0b0'); FX.heal(B.x, B.y, 8, '#fff0b0');
      I.gridQ.aoe(H.x, H.y, 130, function (e) { I.knock(e, H, 120); I.stun(e, 1.2); I.hurtEnemy(e, b * 1.6, 'z', false); }); G.flash = 0.3; G.flashCol = '#fff0b0'; I.shake(3);
    },
    assassin: function () {
      var H = G.hero, b = base(), tg = null, bs = -1;
      I.gridQ.collect(PB, H.x, H.y, 300, false);
      for (var i = 0; i < PB.length; i++) { var e = PB[i]; if (!e.on) continue; var s = (e.boss ? 1e6 : 0) + (e.elite ? 1e4 : 0) + e.max; if (s > bs) { bs = s; tg = e; } }
      if (!tg) return false;
      H.busy = 0.95; H.inv = 1; G.hitstop = 0.05;
      for (var n = 0; n < 7; n++) (function (n) {
        I.later(0.05 + n * 0.11, function () {
          if (G.state !== 'play') return; var t = tg.on ? tg : I.gridQ.nearest(H.x, H.y, 300, false); if (!t) return;
          var a = R(0, TAU); FX.afterimage(H.x, H.y, 'hero_assassin', H.face, '#6a4aa8'); H.x = t.x + Math.cos(a) * 22; H.y = t.y + Math.sin(a) * 14; H.face = t.x >= H.x ? 1 : -1;
          A.play(H.an, 'attack', true); FX.smoke(H.x, H.y, 1, 'rgba(40,24,70,0.6)', 7);
          var last = n === 6, crit = I.strike(t, b * (last ? 3.4 : 2.0), 'h', last); I.procs(t, crit); G.stats.dmg += b * 2;
          FX.slash(H.x, H.y - 8, Math.atan2(t.y - H.y, t.x - H.x), 40, 1.4, last ? '#ff3a6a' : '#c8a0ff', 0.16, last ? 8 : 5); FX.sparks(t.x, t.y - 6, last ? 14 : 5, '#c8a0ff', 150); FX.blood(t.x, t.y, 3, '#8a1030'); T.Audio.sfx('slash');
          if (last) { I.shake(5); G.hitstop = 0.08; I.ring(t.x, t.y, 50, '#ff3a6a', 0.4); }
        });
      })(n);
    }
  };
  C.special = function () {
    var H = G.hero; if (G.state !== 'play' || H.spT > 0 || H.busy > 0) return false;
    var r = SPEC[G.clsId](); if (r === false) { I.text(H.x, H.y - 24, 'Sem alvo', '#cfd8e8'); return false; }
    H.spT = H.spMax; A.play(H.an, 'special', true); T.Audio.sfx('boss'); G.stats.specials = (G.stats.specials || 0) + 1; I.ui('hud'); return true;
  };

  /* ---------- Zonas: atualização ---------- */
  function updZones(dt) {
    var a = HZ.a, H = G.hero;
    for (var i = 0; i < a.length; i++) {
      var z = a[i]; if (!z.on) continue;
      z.life -= dt; z.tk -= dt;
      if (z.hostile) {
        if (z.kind === 'tele') { if (z.life <= 0) { FX.explosion(z.x, z.y, z.r * 0.8, z.col); I.shake(3); I.hitFriendly(z.x, z.y, z.r, z.dmg); HZ.put(z); } continue; }
        if (z.kind === 'hazard') { if (z.tk <= 0) { z.tk = 0.5; if (dist(z, H) < z.r + H.r) I.hurtHero(z.dmg); } if (Math.random() < 0.5) FX.flame(z.x + R(-z.r, z.r) * 0.8, z.y + R(-z.r, z.r) * 0.5, 1); if (z.life <= 0) HZ.put(z); continue; }
      }
      if (z.life <= 0) { if (z.kind === 'wall') I.ring(z.x, z.y, z.r, '#ff2a3a', 0.4); HZ.put(z); continue; }
      switch (z.kind) {
        case 'wall':
          if (z.tk <= 0) { z.tk = z.tick; (function (zz) { I.gridQ.aoe(zz.x, zz.y, zz.r, function (e) { I.hurtEnemy(e, zz.dmg, 'z', false); I.knock(e, zz, 70); }); })(z); FX.sparks(z.x + R(-z.r, z.r) * 0.7, z.y + R(-z.r, z.r) * 0.7, 2, '#ff5a6a', 90); }
          break;
        case 'rift':
          (function (zz) { I.gridQ.aoe(zz.x, zz.y, zz.r * 1.5, function (e) { var dx = zz.x - e.x, dy = zz.y - e.y, d = Math.sqrt(dx * dx + dy * dy) || 1, f = e.boss ? 8 : 38; e.x += dx / d * f * dt; e.y += dy / d * f * dt; }); })(z);
          if (z.tk <= 0) { z.tk = z.tick; (function (zz) { I.gridQ.aoe(zz.x, zz.y, zz.r, function (e) { I.hurtEnemy(e, zz.dmg, 'z', false); }); })(z); FX.pull(z.x, z.y, z.r * 1.1, '#c08aff', 3); }
          break;
        case 'rain':
          if (z.tk <= 0) {
            z.tk = z.tick; var ang = R(0, TAU), rr = Math.sqrt(Math.random()) * z.r, px = z.x + Math.cos(ang) * rr, py = z.y + Math.sin(ang) * rr * 0.8;
            I.part(px - 6, py - 60, 20, 360, 0.16, 1.8, '#e8f0c8', 7); FX.sparks(px, py, 2, '#e8f0c8', 60);
            (function (px2, py2, dm) { I.later(0.14, function () { I.gridQ.aoe(px2, py2, 24, function (e) { var c = I.strike(e, dm, 'p'); G.stats.dmg += dm; }); FX.sparks(px2, py2, 2, '#fff', 70); }); })(px, py, z.dmg);
          } break;
        case 'fire': case 'poison':
          if (z.tk <= 0) { z.tk = z.tick; (function (zz) { I.gridQ.aoe(zz.x, zz.y, zz.r, function (e) { I.hurtEnemy(e, zz.dmg, 'dot', false); if (zz.kind === 'poison') { e.poison = Math.max(e.poison, zz.dmg); e.poisonT = 2; } else { e.burn = Math.max(e.burn, zz.dmg); e.burnT = 1.5; } }); })(z); }
          if (z.kind === 'fire') FX.flame(z.x + R(-z.r, z.r) * 0.6, z.y + R(-z.r, z.r) * 0.4, 1); else if (Math.random() < 0.4) I.part(z.x + R(-z.r, z.r) * 0.7, z.y + R(-z.r, z.r) * 0.5, 0, -12, 0.9, 6, 'rgba(110,210,80,0.35)', 3);
          break;
      }
    }
  }

  /* ---------- Aliados ---------- */
  function updAllies(dt) {
    var a = AL.a, H = G.hero;
    for (var i = 0; i < a.length; i++) {
      var al = a[i]; if (!al.on) continue;
      al.anim += dt; if (!al.perm) { al.life -= dt; if (al.life <= 0) { FX.soul(al.x, al.y, 3, '#3ae0a0'); AL.put(al); continue; } }
      al.atkT -= dt; if (al.hitA > 0) al.hitA -= dt;
      var t = I.gridQ.nearest(al.x, al.y, 260, true), tx, ty, tr = 14;
      if (t) { tx = t.x; ty = t.y; tr = t.r + 8; } else { var k = al.i * 2.4 + G.t * 0.6; tx = H.x + Math.cos(k) * 44; ty = H.y + Math.sin(k) * 34; tr = 4; }
      var dx = tx - al.x, dy = ty - al.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
      if (G.syn.specter && al.kind === 'spirit' && t && d < 170 && d > 60) { if (al.atkT <= 0) { al.atkT = 1.1; var an = Math.atan2(dy, dx); proj('orb', al.x, al.y - 8, an, 300, al.dmg * 0.7, { col: '#7fffd0', r: 5, home: 1, life: 1.1, src: 'p' }); } }
      else if (d > tr) { var sp = 105; al.x += dx / d * sp * dt; al.y += dy / d * sp * dt; if (Math.abs(dx) > 3) al.face = dx > 0 ? 1 : -1; }
      else if (t && al.atkT <= 0) { al.atkT = 0.8; al.hitA = 0.2; var cr = I.strike(t, al.dmg, 'z', false); if (al.kind === 'spirit') FX.soul(t.x, t.y, 1, '#3ae0a0'); else FX.sparks(t.x, t.y - 4, 3, '#cfe', 80); G.stats.dmg += al.dmg; }
      if (Math.random() < dt * 2) I.part(al.x, al.y, R(-6, 6), R(-14, -4), 0.5, 2.5, al.kind === 'spirit' ? '#3ae0a0' : '#7ff', 8);
    }
    // espíritos permanentes
    var want = Math.floor(G.P.summon) + (G.syn.specter ? 2 : 0), have = 0;
    for (i = 0; i < a.length; i++) if (a[i].on && a[i].perm) have++;
    if (have < want) { var s = I.spawnAlly('spirit', H.x + R(-30, 30), H.y + R(-30, 30), 99999, 7 * G.P.dmg * G.P.magic * (G.cls.dmg / 10)); if (s) { s.perm = true; FX.soul(s.x, s.y, 4, '#3ae0a0'); } }
  }

  /* ---------- Herói ---------- */
  function updHero(dt) {
    var H = G.hero, P = G.P, K = G.cls, B = G.base;
    if (H.inv > 0) H.inv -= dt; if (H.hurt > 0) H.hurt -= dt; if (H.atkAnim < 9) H.atkAnim += dt; if (H.spT > 0) H.spT -= dt; if (H.slowT > 0) H.slowT -= dt; if (H.busy > 0) H.busy -= dt;
    if (H.shield < P.shieldN) { H.shT -= dt; if (H.shT <= 0) { H.shield++; H.shT = Math.max(4, 14 - 2 * P.shieldN); I.ring(H.x, H.y, 26, '#7fd0ff', 0.4); } }
    if (P.regen > 0) { H.regenAcc += P.regen * dt; if (H.regenAcc >= 1) { H.regenAcc -= 1; I.heal(1); } }
    var m = T.Input.move(), sp = K.spd * (1 + P.speed) * (H.slowT > 0 ? 0.6 : 1) * (G.blizT > 0 ? 0.85 : 1), vx = m.x * sp, vy = m.y * sp;
    if (H.busy > 0) vx = vy = 0;
    H.x += vx * dt; H.y += vy * dt; H.moving = (vx * vx + vy * vy) > 16 ? 1 : 0;
    if (vx > 4) H.face = 1; else if (vx < -4) H.face = -1;
    var ob = I.getObst(), k;
    for (k = 0; k < ob.length; k++) { var o = ob[k], ax = H.x - o.x, ay = H.y - o.y; if (ax > 60 || ax < -60 || ay > 60 || ay < -60) continue; var ad = Math.sqrt(ax * ax + ay * ay) || 1, md = o.r * o.s + H.r * 0.6; if (ad < md) { H.x = o.x + ax / ad * md; H.y = o.y + ay / ad * md; } }
    var bx = H.x - B.x, by = H.y - B.y, bd = Math.sqrt(bx * bx + by * by) || 1, bm = B.r + H.r - 4; if (bd < bm) { H.x = B.x + bx / bd * bm; H.y = B.y + by / bd * bm; }
    H.x = clamp(H.x, 24, T.W - 24); H.y = clamp(H.y, 24, T.W - 24);
    // animação
    if (H.moving) A.play(H.an, (P.speed > 0.2 || G.clsId === 'assassin') ? 'run' : 'walk'); else A.play(H.an, 'idle'); A.update(H.an, dt);
    if (H.hurt > 0.2) A.play(H.an, 'hit', true);
    if (H.moving) { H.trailT -= dt; if (H.trailT <= 0) { H.trailT = G.clsId === 'assassin' ? 0.06 : 0.16; heroTrail(); } }
    // ataque
    H.atkT -= dt;
    if (H.atkT <= 0 && H.busy <= 0) { var t = I.gridQ.nearest(H.x, H.y, K.rng, true); if (t) { attack(t); H.atkT = 1 / (K.rate * P.rate); } else H.atkT = 0.05; }
    // magias passivas
    if (P.orbs > 0) {
      H.orbA += dt * (2.4 + 0.3 * P.orbs); var rad = 54 * Math.min(1.6, P.area);
      for (k = 0; k < P.orbs; k++) { var oa = H.orbA + k * TAU / P.orbs, ox = H.x + Math.cos(oa) * rad, oy = H.y - 8 + Math.sin(oa) * rad * 0.7; if (Math.random() < 0.5) FX.trail(ox, oy, '#c08aff', 2.4); I.gridQ.collect(PB, ox, oy, 8, false); for (var j = 0; j < PB.length; j++) { var e = PB[j]; if (e.on && e.orbT <= 0) { e.orbT = 0.4; I.hurtEnemy(e, 7 * P.dmg * P.magic * (1 + 0.25 * (P.orbs - 1)), 'z', false); FX.sparks(e.x, e.y - 4, 2, '#c08aff', 80); } } }
    }
    if (P.nova > 0) { G.novaT -= dt; if (G.novaT <= 0) { G.novaT = 5; var nr = 115 * P.area, nd = 16 * P.nova * P.dmg * P.magic; I.ring(H.x, H.y, nr, '#ffe9a0', 0.6); I.ring(H.x, H.y, nr * 0.6, '#fff', 0.4); FX.sparks(H.x, H.y, 12, '#ffe9a0', 200); I.gridQ.aoe(H.x, H.y, nr, function (e) { I.hurtEnemy(e, nd, 'z', false); }); if (G.syn.crimson) I.heal(H.max * 0.04); } }
    if (P.rain > 0) { G.rainT -= dt; if (G.rainT <= 0) { G.rainT = Math.max(1.6, 4.2 - 0.4 * P.rain); var tg = I.gridQ.nearest(H.x + R(-60, 60), H.y + R(-60, 60), 340, false); if (tg) meteor(tg.x, tg.y, 42 * P.dmg * P.rain * P.magic); } }
    if (P.fury) { G.furyT -= dt; if (G.furyT <= 0) { G.furyT = 15; G.furyOn = 4; I.ui('banner', 'Fúria das Torres', 'Torres atacam em dobro!', '#ff9a3a'); } if (G.furyOn > 0) G.furyOn -= dt; }
    if (P.timestop) { G.tsT -= dt; if (G.tsT <= 0) { G.tsT = 25; G.timeStop = 3; G.flash = 0.35; G.flashCol = '#9fd0ff'; I.ui('banner', 'Relógio do Fim', 'O tempo parou!', '#9fd0ff'); T.Audio.sfx('boss'); } if (G.timeStop > 0) G.timeStop -= dt; }
    if (P.ghost && H.moving) { H.ghT = (H.ghT || 0) - dt; if (H.ghT <= 0) { H.ghT = 0.2; I.gridQ.aoe(H.x, H.y, 20, function (e) { I.hurtEnemy(e, 5 * P.dmg * P.magic, 'z', false); }); FX.afterimage(H.x, H.y, 'hero_' + G.clsId, H.face, '#9fd0ff'); } }
    if (G.blizT > 0) G.blizT -= dt; if (G.sandT > 0) G.sandT -= dt;
  }
  function heroTrail() {
    var H = G.hero, id = G.clsId;
    if (id === 'assassin') { FX.afterimage(H.x, H.y, 'hero_assassin', H.face, '#6a4aa8'); I.part(H.x, H.y - 4, R(-8, 8), R(-8, 8), 0.5, 4, 'rgba(40,24,70,0.5)', 3); }
    else if (id === 'necro') FX.soul(H.x, H.y, 1, '#3ae0a0');
    else if (id === 'mage') I.part(H.x + R(-8, 8), H.y - 10, R(-6, 6), R(-14, -4), 0.7, 3, '#c08aff', 6).rot = R(0, 6);
    else if (id === 'paladin') FX.heal(H.x, H.y, 1, '#fff0b0');
    else if (id === 'knight') I.part(H.x, H.y + 2, R(-6, 6), R(-4, 4), 0.5, 3, 'rgba(120,110,100,0.4)', 3);
    else I.part(H.x, H.y + 2, R(-6, 6), R(-4, 4), 0.4, 2.2, 'rgba(160,190,130,0.5)', 0);
  }
  function meteor(x, y, dmg) {
    I.ring(x, y, 46, '#ff7a3a', 0.55); I.part(x - 40, y - 240, 80, 480, 0.5, 6, '#ffb060', 5);
    I.later(0.5, function () { FX.explosion(x, y, 52, '#ff8a3a'); FX.flame(x, y, 8, true); I.shake(2.5); T.Audio.sfx('boom'); I.gridQ.aoe(x, y, 52, function (e) { I.hurtEnemy(e, dmg, 'z', false); e.burn = Math.max(e.burn, 4); e.burnT = 3; }); });
  }
  C.meteor = meteor;

  /* ---------- Passo da simulação ---------- */
  var T_ = T.Sim = {};
  T_.step = function (dt) {
    if (G.state === 'over') {
      FX.update(dt); G.endT -= dt; updTexts(dt); updDead(dt); if (G.hero.an) A.update(G.hero.an, dt);
      if (G.endT <= 0 && !G.summaryShown) { G.summaryShown = true; I.ui('showEnd'); }
      return;
    }
    if (G.state !== 'play') return;
    if (G.hitstop > 0) { G.hitstop -= dt; FX.update(dt * 0.3); return; }
    G.t += dt;
    if (T.Wave) T.Wave.update(dt);
    I.buildGrid();
    updHero(dt);
    var a = EP.a, frozen = G.timeStop > 0, i;
    G.alive = 0;
    for (i = 0; i < a.length; i++) { var e = a[i]; if (!e.on) continue; G.alive++; if (frozen && !e.boss) { e.anim += 0; continue; } I.updEnemy(e, dt); if (G.state !== 'play') return; }
    if (T.Towers) T.Towers.update(dt);
    updAllies(dt); updProj(dt); updZones(dt);
    a = KP.a; for (i = 0; i < a.length; i++) if (a[i].on) I.updPickup(a[i], dt);
    if (G.vac > 0) G.vac -= dt;
    var B = G.base; if (B.hit > 0) B.hit -= dt; if (B.shT > 0) { B.shT -= dt; if (B.shT <= 0) B.shield = 0; }
    if (B.hp < B.max && G.cls && G.clsId === 'paladin') B.hp = Math.min(B.max, B.hp + 0.4 * dt);
    var L = G.later; for (i = L.length - 1; i >= 0; i--) { L[i].t -= dt; if (L[i].t <= 0) { var f = L[i].fn; L.splice(i, 1); f(); } }
    FX.update(dt); updTexts(dt); updDead(dt);
    a = ZP.a; for (i = 0; i < a.length; i++) if (a[i].on) { a[i].life -= dt; if (a[i].life <= 0) ZP.put(a[i]); }
    if (G.flash > 0) G.flash -= dt;
    // câmera
    var cam = G.cam, H = G.hero, vw = T.view.w, vh = T.view.h, hw = vw / 2, hh = vh / 2;
    cam.x += (H.x - cam.x) * Math.min(1, dt * 6); cam.y += (H.y - 12 - cam.y) * Math.min(1, dt * 6);
    cam.x = clamp(cam.x, Math.min(hw, T.W / 2), Math.max(T.W - hw, T.W / 2)); cam.y = clamp(cam.y, Math.min(hh, T.W / 2), Math.max(T.W - hh, T.W / 2));
    if (cam.shake > 0) cam.shake = Math.max(0, cam.shake - dt * 22);
  };
  T.view = { w: 640, h: 360 };
  function updTexts(dt) { var a = TP.a; for (var i = 0; i < a.length; i++) { var t = a[i]; if (!t.on) continue; t.life -= dt; t.y += t.vy * dt; t.vy *= 0.94; if (t.life <= 0) TP.put(t); } }
  function updDead(dt) { var a = DP.a; for (var i = 0; i < a.length; i++) { var d = a[i]; if (!d.on) continue; d.t += dt; if (d.t >= d.max) DP.put(d); } }
})(window.TD);

'use strict';
/* NOCTARIA — EXCALIBUR: espada mítica com ataque mágico de larga escala (recarga de 2 minutos).
   Fases: invocação (feixe de luz + runas + espada descendo) → liberação (flash, ondas de choque, pilares de luz) → brasas. */
(function (T) {
  var I = T.int, G = I.G, R = T.R, TAU = T.TAU, FX = T.FX, A = T.Anim, EP = T.pools.EP;
  var X = T.Exc = {};
  T.EXC = { cd: 120, start: 40, radius: 780, charge: 1.5, total: 3.8 };
  T.ARTS = {
    knight: { n: 'Excalibur', sub: 'A espada lendária desperta', g: 'sword', c: [255, 214, 110], c2: [255, 250, 225], fx: 'smite' },
    mage: { n: 'Cajado do Inverno Eterno', sub: 'O mundo congela', g: 'staff', c: [120, 200, 255], c2: [232, 248, 255], fx: 'freeze' },
    archer: { n: 'Arco das Estrelas Cadentes', sub: 'Chuva de estrelas', g: 'bow', c: [150, 170, 255], c2: [240, 240, 255], fx: 'stars' },
    necro: { n: 'Foice da Ceifa Final', sub: 'As almas respondem', g: 'scythe', c: [110, 255, 170], c2: [225, 255, 235], fx: 'reap' },
    paladin: { n: 'Lança da Aurora', sub: 'A luz atravessa o véu', g: 'spear', c: [255, 236, 160], c2: [255, 255, 240], fx: 'dawn' },
    assassin: { n: 'Relógio das Sombras', sub: 'O tempo se curva', g: 'dagger', c: [190, 120, 255], c2: [240, 225, 255], fx: 'time' }
  };
  var ICON = { sword: 'M12 22l-2.2-9V4l2.2-2 2.2 2v9z M7 13h10 M12 13v-9', staff: 'M12 22V8 M12 8m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0 M12 4v-2 M8 6L6 4 M16 6l2-2', bow: 'M7 3c9 3 9 15 0 18 M7 3v18 M7 12h13 M17 9l3 3-3 3', scythe: 'M6 22L15 4 M15 4c5 0 7 4 5 8 M15 4c-1 3-1 5 0 8', spear: 'M12 22V6 M12 2l-3 5h6z M8 12h8', dagger: 'M12 22v-5 M9 17h6 M12 17V3l-2 4v8 M12 3l2 4v8' };
  function art() { if (T.Ult && T.ARTS_ALT && T.Ult.chosen(G.clsId) && T.ARTS_ALT[G.clsId]) return T.ARTS_ALT[G.clsId]; return T.ARTS[G.clsId] || T.ARTS.knight; }
  X.art = art;
  X.svg = function () { return '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="' + ICON[art().g] + '"/></svg>'; };
  function rg(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function st() { if (!G.exc) G.exc = { cd: T.EXC.start, cast: null, wave: null, pill: [], id: 0, dark: 0, em: 0 }; return G.exc; }
  X.state = st;
  X.cast = function () {
    var E = st(), H = G.hero;
    if (G.state !== 'play' || (E.cast && !E.cast.rel) || E.cd > 0 || H.busy > 0) { if (E.cd > 0 && G.state === 'play') I.text(H.x, H.y - 24, art().n.split(' ')[0] + ' em recarga', '#cfd8e8'); return false; }
    E.cast = { t: 0, x: H.x, y: H.y, rel: false, n: 0 }; E.id++; H.busy = T.EXC.charge + 0.35; H.inv = T.EXC.charge + 1.2;
    A.play(H.an, 'special', true); G.stats.specials = (G.stats.specials || 0) + 1;
    var AR = art(); E.cast.a = AR; I.ui('banner', AR.n.toUpperCase(), AR.sub, 'rgb(' + AR.c.join(',') + ')');
    try { T.Audio.sfx('magic'); T.Audio.tone('triangle', 180, 1100, 1.4, 0.09); } catch (e) { }
    FX.runeCircle(H.x, H.y, 60, hex(AR.c), 10); FX.orbit(H.x, H.y, 70, hex(AR.c2), 12, 1.6, 5);
    return true;
  };
  function hex(c) { return '#' + c.map(function (v) { return ('0' + v.toString(16)).slice(-2); }).join(''); }
  function release(E, c) {
    var AR = c.a || art(), H0 = hex(AR.c), H1 = hex(AR.c2), H = G.hero, B = G.base, q = T.Q(), x = c.x, y = c.y; c.rel = true; E.cd = T.EXC.cd; E.wave = { x: x, y: y, r: 0, id: E.id, a: AR }; E.em = 3.2;
    G.flash = 1.3; G.flashCol = '#fff6d0'; G.hitstop = 0.12; I.shake(14);
    try { T.Audio.sfx('boom'); setTimeout(function () { T.Audio.sfx('boss'); }, 160); } catch (e) { }
    FX.explosion(x, y, 220, H0); FX.sparks(x, y, q.part > 200 ? 90 : 40, H1, 460); FX.runeCircle(x, y, 150, H1, 14);
    for (var k = 0; k < 4; k++) (function (k) { I.later(k * 0.13, function () { I.ring(x, y, 260 + k * 140, k % 2 ? H1 : H0, 0.9); }); })(k);
    FX.decal(x, y, 170, rg(AR.c, 0.45), 8);
    var n = (q.light > 0 ? 15 : 7) * (AR.fx === 'stars' ? 2 : 1); E.pill.length = 0;
    for (k = 0; k < n; k++) { var a = R(0, TAU), d = Math.sqrt(Math.random()) * T.EXC.radius * 0.85; E.pill.push({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.8, t: 0, dly: R(0.05, 1.1), w: R(16, 38), hit: 0 }); }
    I.heal(H.max * (AR.fx === 'dawn' ? 1 : 0.4)); B.hp = Math.min(B.max, B.hp + B.max * (AR.fx === 'dawn' ? 0.45 : 0.2));
    for (k = 0; k < G.towers.length; k++) G.towers[k].buffT = Math.max(G.towers[k].buffT, 12);
    if (AR.alt && T.Ult) { E.wave = null; E.pill.length = 0; T.Ult.start(AR, x, y); }
  }
  function dmgBase() { return G.cls.dmg * G.P.dmg; }
  X.update = function (dt) {
    if (!G.hero || G.state !== 'play') return; var E = st(), c = E.cast, q = T.Q(), i, e;
    if (!c && E.cd > 0) E.cd -= dt; if (E.cd < 0) E.cd = 0;
    var dk = c ? (c.rel ? Math.max(0, 0.5 * (1 - (c.t - T.EXC.charge) / 2.0)) : 0.5 * Math.min(1, c.t / 1.2)) : 0; E.dark += (dk - E.dark) * Math.min(1, dt * 6);
    if (c) {
      c.t += dt; var u = Math.min(1, c.t / T.EXC.charge);
      if (!c.rel) {
        c.n -= dt; if (c.n <= 0) { c.n = 0.07; FX.pull(c.x, c.y - 44, 130 + u * 50, hex((c.a || art()).c2), 3); FX.heal(c.x + R(-14, 14), c.y, 1, hex((c.a || art()).c2)); }
        if (Math.random() < dt * 12) I.shake(1.5 + u * 4);
        if (c.t > 0.5 && !c.r2) { c.r2 = 1; FX.runeCircle(c.x, c.y, 100, hex((c.a || art()).c), 12); } if (c.t > 1.0 && !c.r3) { c.r3 = 1; FX.runeCircle(c.x, c.y, 150, hex((c.a || art()).c2), 14); FX.orbit(c.x, c.y, 110, hex((c.a || art()).c), 10, 0.9, -6); }
        if (c.t >= T.EXC.charge) release(E, c);
      } else if (c.t >= T.EXC.total) E.cast = null;
    }
    var w = E.wave;
    if (w) {
      w.r += 1150 * dt; var a = EP.a, lim = q.part > 200 ? 36 : 14, made = 0, b = dmgBase();
      for (i = 0; i < a.length; i++) {
        e = a[i]; if (!e.on || e.exId === w.id) continue; var dx = e.x - w.x, dy = e.y - w.y; if (dx * dx + dy * dy > w.r * w.r) continue;
        e.exId = w.id; var AR = E.cast && E.cast.a || w.a || art(), d, fx = AR.fx;
        if (fx === 'smite') d = e.boss ? b * 30 + e.max * 0.1 : Math.max(b * 45, e.max * 0.65);
        else if (fx === 'freeze') d = b * 12 + e.max * (e.boss ? 0.05 : 0.3); else if (fx === 'stars') d = b * 14 + e.max * (e.boss ? 0.03 : 0.12);
        else if (fx === 'reap') { d = b * 20 + e.max * (e.boss ? 0.06 : 0.85); G.hero.hp = Math.min(G.hero.max, G.hero.hp + G.hero.max * 0.015); }
        else if (fx === 'dawn') d = b * 20 + e.max * (e.boss ? 0.05 : 0.4); else d = b * 10 + e.max * (e.boss ? 0.04 : 0.3);
        if (fx === 'freeze') I.freeze(e, 6); I.stun(e, fx === 'smite' ? 4 : fx === 'time' ? 7 : fx === 'dawn' ? 3 : fx === 'freeze' ? 5 : 1.5); if (fx !== 'time' && fx !== 'freeze') I.knock(e, w, 260); e.txT = 1; I.hurtEnemy(e, d, 'dot', true);
        if (made++ < lim) { FX.explosion(e.x, e.y, 34, hex((E.wave && E.wave.a || art()).c)); FX.sparks(e.x, e.y, 5, hex((E.wave && E.wave.a || art()).c2), 190); } else FX.sparks(e.x, e.y, 2, '#fff3c0', 120);
      }
      if (w.r >= T.EXC.radius + 60) E.wave = null;
    }
    if (E.em > 0) { E.em -= dt; var c0 = c || { x: G.hero.x, y: G.hero.y }; if (Math.random() < dt * 28) FX.heal(c0.x + R(-640, 640), c0.y + R(-380, 380), 1, Math.random() < 0.5 ? hex(art().c2) : '#fff'); }
    for (i = E.pill.length - 1; i >= 0; i--) {
      var p = E.pill[i], t0 = p.t; p.t += dt; if (p.t >= p.dly + 1.4) { E.pill.splice(i, 1); continue; }
      if (!p.hit && p.t >= p.dly) {
        p.hit = 1; FX.explosion(p.x, p.y, 46, hex(art().c2)); FX.sparks(p.x, p.y, 8, hex(art().c), 220); I.shake(2.5);
        I.gridQ.aoe(p.x, p.y, 54, function (en) { I.stun(en, 1.5); en.txT = 1; I.hurtEnemy(en, dmgBase() * 7, 'dot', false); });
      }
    }
  };
  /* ---------- desenho ---------- */
  function sword(c, x, y, sc, glow, hi, A) {
    var C1 = A.c, C2 = A.c2; c.save(); c.translate(x, y); c.scale(sc, sc);
    c.globalCompositeOperation = 'lighter'; var g = c.createRadialGradient(0, 0, 2, 0, 0, 72 * glow); g.addColorStop(0, rg(C2, 0.9)); g.addColorStop(0.4, rg(C1, 0.35)); g.addColorStop(1, rg(C1, 0)); c.fillStyle = g; c.beginPath(); c.arc(0, 0, 72 * glow, 0, TAU); c.fill();
    c.globalCompositeOperation = 'source-over'; var gd = c.createLinearGradient(0, -30, 0, 30); gd.addColorStop(0, rg(C2, 1)); gd.addColorStop(1, rg(C1, 1)); c.fillStyle = gd; c.strokeStyle = rg(C2, 1); c.lineWidth = 2.2; c.lineJoin = 'round';
    var k = A.g;
    if (k === 'sword') { c.beginPath(); c.moveTo(0, 44); c.lineTo(6, -2); c.lineTo(6, -22); c.lineTo(-6, -22); c.lineTo(-6, -2); c.closePath(); c.fill(); c.fillStyle = rg(C1, 1); c.fillRect(-20, -27, 40, 6); c.fillStyle = '#6a1a2a'; c.fillRect(-2.5, -50, 5, 20); c.fillStyle = rg(C1, 1); c.beginPath(); c.arc(0, -54, 4.5, 0, TAU); c.fill(); }
    else if (k === 'staff') { c.fillStyle = '#5a4a6a'; c.fillRect(-2.5, -20, 5, 64); c.fillStyle = rg(C2, 1); c.beginPath(); c.moveTo(0, -48); c.lineTo(10, -30); c.lineTo(0, -12); c.lineTo(-10, -30); c.closePath(); c.fill(); c.strokeStyle = rg(C1, 1); c.beginPath(); c.arc(0, -30, 16, 0, TAU); c.stroke(); }
    else if (k === 'bow') { c.lineWidth = 3.5; c.strokeStyle = rg(C1, 1); c.beginPath(); c.arc(-26, 0, 46, -1, 1); c.stroke(); c.lineWidth = 1.3; c.strokeStyle = rg(C2, 1); c.beginPath(); c.moveTo(-26 + Math.cos(-1) * 46, Math.sin(-1) * 46); c.lineTo(-26 + Math.cos(1) * 46, Math.sin(1) * 46); c.stroke(); c.fillStyle = rg(C2, 1); c.beginPath(); c.moveTo(24, 0); c.lineTo(10, -4); c.lineTo(10, 4); c.fill(); c.fillRect(-20, -1, 30, 2); }
    else if (k === 'scythe') { c.fillStyle = '#4a3a58'; c.fillRect(-2, -40, 4, 84); c.strokeStyle = rg(C2, 1); c.lineWidth = 4; c.beginPath(); c.moveTo(0, -40); c.quadraticCurveTo(34, -52, 40, -14); c.quadraticCurveTo(24, -36, 0, -32); c.fill(); c.stroke(); }
    else if (k === 'spear') { c.fillStyle = '#8a7a58'; c.fillRect(-2, -30, 4, 76); c.fillStyle = gd; c.beginPath(); c.moveTo(0, -56); c.lineTo(8, -30); c.lineTo(0, -34); c.lineTo(-8, -30); c.closePath(); c.fill(); c.fillStyle = rg(C1, 1); c.fillRect(-9, -30, 18, 4); }
    else { c.beginPath(); c.moveTo(0, 40); c.lineTo(5, -2); c.lineTo(3, -24); c.lineTo(-3, -24); c.lineTo(-5, -2); c.closePath(); c.fill(); c.fillStyle = rg(C1, 1); c.fillRect(-12, -28, 24, 5); c.fillStyle = '#2a1a38'; c.fillRect(-2, -44, 4, 16); c.strokeStyle = rg(C2, 0.9); c.lineWidth = 1.6; c.beginPath(); c.arc(0, -60, 9, 0, TAU); c.moveTo(0, -60); c.lineTo(0, -66); c.moveTo(0, -60); c.lineTo(5, -58); c.stroke(); }
    if (hi) { c.globalCompositeOperation = 'lighter'; c.fillStyle = rg(C2, 0.35 * glow); c.beginPath(); c.arc(0, -8, 16, 0, TAU); c.fill(); }
    c.restore();
  }
  X.draw = function (c, S, cx0, cy0, cw, ch, q) {
    var E = G.exc; if (!E || (!E.cast && !E.wave && !E.pill.length && E.dark < 0.01)) return; var hi = q.light > 0, t = G.t, k = E.cast, i, AR = (k && k.a) || (E.wave && E.wave.a) || art(), C1 = AR.c, C2 = AR.c2;
    c.setTransform(1, 0, 0, 1, 0, 0);
    if (E.dark > 0.01) { c.globalAlpha = E.dark; c.fillStyle = '#05030f'; c.fillRect(0, 0, cw, ch); c.globalAlpha = 1; }
    c.setTransform(S, 0, 0, S, -cx0 * S, -cy0 * S); c.globalCompositeOperation = 'lighter';
    if (k) {
      var x = k.x, y = k.y, u = Math.min(1, k.t / T.EXC.charge), af = k.rel ? Math.max(0, 1 - (k.t - T.EXC.charge) / 1.6) : 1;
      var bw = (6 + 22 * u) * (k.rel ? 1 + (k.t - T.EXC.charge) * 2.2 : 1) * af;
      if (bw > 0.5) {
        var top = cy0 - 60, g = c.createLinearGradient(0, top, 0, y); g.addColorStop(0, rg(C2,0)); g.addColorStop(0.5, rg(C1,0.5)); g.addColorStop(1, rg(C2,0.95));
        c.fillStyle = g; c.fillRect(x - bw / 2, top, bw, y - top); c.fillStyle = rg(C2, 0.75 * af); c.fillRect(x - bw * 0.16, top, bw * 0.32, y - top);
      }
      var rr = 50 + u * 110 + (k.rel ? (k.t - T.EXC.charge) * 90 : 0); c.strokeStyle = rg(C1, 0.8 * af); c.lineWidth = 2.2; c.setLineDash([10, 7]); c.lineDashOffset = -t * 40;
      c.beginPath(); c.ellipse(x, y + 6, rr, rr * 0.5, 0, 0, TAU); c.stroke(); c.lineDashOffset = t * 55; c.beginPath(); c.ellipse(x, y + 6, rr * 0.62, rr * 0.31, 0, 0, TAU); c.stroke(); c.setLineDash([]);
      var nr = hi ? 18 : 8, len = (40 + u * 170) * (k.rel ? 1 + (k.t - T.EXC.charge) * 3 : 1);
      for (i = 0; i < nr; i++) { var a = t * 0.5 + i * TAU / nr, w2 = 0.05 + (i % 3) * 0.02; c.fillStyle = rg(C1, (0.10 + 0.07 * u) * af); c.beginPath(); c.moveTo(x, y - 40); c.lineTo(x + Math.cos(a - w2) * len, y - 40 + Math.sin(a - w2) * len * 0.8); c.lineTo(x + Math.cos(a + w2) * len, y - 40 + Math.sin(a + w2) * len * 0.8); c.closePath(); c.fill(); }
      c.globalCompositeOperation = 'source-over';
      var sy = y - 70 - u * 8 + Math.sin(t * 3) * 3 - (k.rel ? 6 : 0), sc = 0.9 + u * 0.9 + (k.rel ? 0.3 : 0);
      if (af > 0.02) { c.globalAlpha = Math.min(1, u * 1.6) * (k.rel ? Math.min(1, af * 2) : 1); sword(c, x, sy, sc, 0.6 + u * 0.9 + (k.rel ? 1 : 0), hi, AR); c.globalAlpha = 1; }
      c.globalCompositeOperation = 'lighter';
    }
    var w = E.wave;
    if (w) {
      var R0 = T.EXC.radius, f = Math.min(1, w.r / R0), al = Math.max(0, 1 - f * 0.85);
      c.save(); c.translate(w.x, w.y); c.scale(1, 0.78);
      var inner = c.createRadialGradient(0, 0, 0, 0, 0, w.r + 8); inner.addColorStop(0, rg(C2, 0.30 * al)); inner.addColorStop(0.75, rg(C1, 0.12 * al)); inner.addColorStop(1, rg(C1,0));
      c.fillStyle = inner; c.beginPath(); c.arc(0, 0, w.r + 8, 0, TAU); c.fill();
      var rgr = c.createRadialGradient(0, 0, Math.max(0, w.r - 120), 0, 0, w.r + 8); rgr.addColorStop(0, rg(C1,0)); rgr.addColorStop(0.7, rg(C1, 0.35 * al)); rgr.addColorStop(0.94, rg(C2, 0.95 * al)); rgr.addColorStop(1, rg(C1,0));
      c.fillStyle = rgr; c.beginPath(); c.arc(0, 0, w.r + 8, 0, TAU); c.fill();
      if (hi && w.r > 140) { var r2 = w.r * 0.66, g2 = c.createRadialGradient(0, 0, r2 - 50, 0, 0, r2 + 4); g2.addColorStop(0, 'rgba(180,220,255,0)'); g2.addColorStop(0.9, 'rgba(190,225,255,' + 0.5 * al + ')'); g2.addColorStop(1, 'rgba(190,225,255,0)'); c.fillStyle = g2; c.beginPath(); c.arc(0, 0, r2 + 4, 0, TAU); c.fill(); }
      c.restore();
    }
    for (i = 0; i < E.pill.length; i++) {
      var p = E.pill[i]; if (p.t < p.dly) continue; var v = p.t - p.dly, gr = Math.min(1, v / 0.16), fd = v < 0.16 ? 1 : Math.max(0, 1 - (v - 0.16) / 1.2), ww = p.w * (1 + 0.5 * (1 - fd)) * (hi ? 1 : 0.8), hh = 460 * gr;
      var pg = c.createLinearGradient(0, p.y - hh, 0, p.y); pg.addColorStop(0, rg(C2,0)); pg.addColorStop(0.7, rg(C1, 0.55 * fd)); pg.addColorStop(1, rg(C2, 0.95 * fd));
      c.fillStyle = pg; c.fillRect(p.x - ww / 2, p.y - hh, ww, hh); c.fillStyle = rg(C2, 0.7 * fd); c.fillRect(p.x - ww * 0.14, p.y - hh * 0.9, ww * 0.28, hh * 0.9);
      var gg = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, ww * 2.2); gg.addColorStop(0, rg(C2, 0.8 * fd)); gg.addColorStop(1, rg(C1,0)); c.fillStyle = gg; c.fillRect(p.x - ww * 2.2, p.y - ww * 1.4, ww * 4.4, ww * 2.8);
    }
    c.globalCompositeOperation = 'source-over'; c.setTransform(1, 0, 0, 1, 0, 0);
  };
})(window.TD);
(function (T) { var s = T.Sim.step; T.Sim.step = function (dt) { s(dt); if (T.Exc) T.Exc.update(dt); }; })(window.TD);

'use strict';
/* NOCTARIA — T.VFX: registro modular de efeitos por categoria (combat, magic, enemy, env, boss, ui, camera)
   com configuração própria e respeito às opções de acessibilidade (intensidade, flashes, zoom). */
(function (T) {
  var I = T.int, G = I.G, R = T.R, TAU = T.TAU, FX = T.FX, A = T.Anim;
  var V = T.VFX = {};
  function st() { return T.Save.d.set; }
  V.k = function () { var s = st().fxi; return s == null ? 1 : s; };               // intensidade geral
  V.flash = function (a, col) { if (st().flash) a *= 0.25; if (a > G.flash) { G.flash = a; G.flashCol = col; } };
  /* configurações por efeito: n = partículas, spd = velocidade, life = duração, col = cor, int = intensidade (prioridade para corte) */
  V.cfg = {
    combat: { crit: { n: 10, spd: 220, col: '#ffd24a', ring: 34 }, kill: { n: 16, spd: 160, col: '#c8b0ff', ring: 50 } },
    env: { lightning: { gap: [11, 24], flash: 0.35 }, embers: { gap: [0.15, 0.4], n: 3 }, rift: { gap: [9, 18], n: 14 }, gust: { gap: [14, 26], n: 18 } },
    boss: { enter: { dim: 0.5, hold: 1.5, zoom: 0.16, shake: 7 }, death: { dim: 0.35, zoom: 0.1, shake: 11, n: 50 } },
    ui: { rarity: [{ n: 4, col: '#cfcfcf' }, { n: 6, col: '#6fd05a' }, { n: 10, col: '#4aa8ff' }, { n: 16, col: '#b06aff' }, { n: 24, col: '#ffb43a' }, { n: 36, col: '#ff4a8a' }] }
  };
  V.camera = {
    punch: function (z, hold) { if (!st().zoomfx && st().zoomfx != null) return; var c = G.cam; c.zt = Math.max(c.zt || 0, z); c.zhold = hold || 0.3; },
    dim: function (a, t) { G.dim = Math.max(G.dim || 0, a); G.dimT = t || 1; }
  };
  var C = V.cfg;
  V.play = function (cat, name, x, y, o) {
    var k = V.k(), q = T.Q(), c, n;
    if (cat === 'combat' && name === 'crit') {
      c = C.combat.crit; n = Math.ceil(c.n * k * (q.part > 200 ? 1 : 0.5)); FX.sparks(x, y - 6, n, c.col, c.spd); I.ring(x, y, c.ring, '#fff3c0', 0.22);
      FX.slash(x, y - 8, R(0, TAU), 26, 1.2, '#fff0b0', 0.12, 4);
    } else if (cat === 'combat' && name === 'kill') {
      c = C.combat.kill; n = Math.ceil(c.n * k * (q.part > 200 ? 1 : 0.5)); FX.soul(x, y, Math.ceil(n / 2), c.col); FX.sparks(x, y, n, o && o.col || c.col, c.spd); I.ring(x, y, c.ring, c.col, 0.4);
      FX.decal(x, y, 22, 'rgba(60,20,70,0.35)', 5);
    } else if (cat === 'boss' && name === 'enter') {
      c = C.boss.enter; V.camera.dim(c.dim, c.hold); V.camera.punch(c.zoom, 1.3); I.shake(c.shake); V.flash(0.45, o.col);
      FX.runeCircle(x, y, 90, o.col, 14); FX.runeCircle(x, y, 150, '#fff', 10);
      for (var i = 0; i < 3; i++) (function (i) { I.later(i * 0.25, function () { I.ring(x, y, 140 + i * 90, o.col, 0.9); }); })(i);
      try { T.Audio.sfx('boss'); T.Audio.tone('sawtooth', 70, 32, 1.4, 0.22); setTimeout(function () { T.Audio.noise(0.8, 0.14, 220); }, 200); } catch (e) { }
    } else if (cat === 'boss' && name === 'death') {
      c = C.boss.death; V.camera.dim(c.dim, 1.2); V.camera.punch(c.zoom, 0.9); I.shake(c.shake); V.flash(0.8, '#ffffff');
      for (i = 0; i < 4; i++) (function (i) { I.later(i * 0.18, function () { FX.explosion(x + R(-40, 40), y + R(-30, 30), 80 + i * 30, o.col); FX.sparks(x, y, Math.ceil(14 * k), '#fff3c0', 300); I.ring(x, y, 100 + i * 80, i % 2 ? '#fff' : o.col, 0.8); I.shake(5); }); })(i);
      FX.soul(x, y, Math.ceil(c.n * k * 0.4), '#e8d8ff');
    } else if (cat === 'env' && name === 'lightning') {
      c = C.env.lightning; V.flash(c.flash, '#cfe0ff'); I.shake(2.5); V.camera.dim(0.0, 0);
      var bx = G.cam.x + R(-300, 300), by = G.cam.y + R(-200, 200); I.later(0.9, function () { try { T.Audio.noise(1.2, 0.2, 260); T.Audio.tone('sine', 70, 28, 1.0, 0.2); } catch (e) { } });
      FX.sparks(bx, by, Math.ceil(8 * k), '#cfe0ff', 160);
      FX.afterimage && 0;
    } else if (cat === 'env' && name === 'rift') {
      c = C.env.rift; var rx = G.cam.x + R(-260, 260), ry = G.cam.y + R(-170, 170); FX.runeCircle(rx, ry, 50, '#b06aff', 8); FX.pull(rx, ry, 60, '#c8a0ff', Math.ceil(c.n * k)); I.ring(rx, ry, 70, '#8a3ae0', 0.8);
    } else if (cat === 'env' && name === 'gust') {
      var gx = G.cam.x - 360, gy = G.cam.y + R(-200, 200); for (i = 0; i < Math.ceil(C.env.gust.n * k); i++) I.part(gx + R(0, 80), gy + R(-40, 40), R(300, 520), R(-30, 30), 1.4, R(1.5, 3), G.mapId === 'frozen' ? '#e8f4ff' : '#e8c88a', 0);
    } else if (cat === 'ui' && name === 'rarity') {
      c = C.ui.rarity[Math.max(0, Math.min(5, o.r | 0))]; n = Math.ceil(c.n * k); FX.sparks(x, y, n, c.col, 150 + (o.r | 0) * 30); I.ring(x, y, 60 + (o.r | 0) * 18, c.col, 0.6);
      if ((o.r | 0) >= 3) FX.runeCircle(x, y, 70, c.col, 6 + (o.r | 0) * 2); if ((o.r | 0) >= 5) { V.flash(0.3, c.col); FX.orbit(x, y, 50, c.col, 10, 1.2, 6); }
    }
  };
  /* eventos ambientais por mapa (sem efeito sobre colisão ou lógica de combate) */
  var envT = {};
  function gap(g) { return R(g[0], g[1]); }
  V.envUpdate = function (dt) {
    if (!G.cam) return; if (G.dimT > 0) { G.dimT -= dt; } else if (G.dim > 0) G.dim = Math.max(0, G.dim - dt * 0.9);
    var cm = G.cam; if (cm.zhold > 0) cm.zhold -= dt; else if (cm.zt > 0) cm.zt = Math.max(0, cm.zt - dt * 0.12);
    if (G.state !== 'play' || !G.map) return; var id = G.mapId, E = C.env, k = V.k();
    if (envT.run !== G.runId) { envT = { run: G.runId, l: gap(E.lightning.gap), e: 0, r: gap(E.rift.gap), g: gap(E.gust.gap) }; }
    if (id === 'cemetery') { envT.l -= dt; if (envT.l <= 0) { envT.l = gap(E.lightning.gap); V.play('env', 'lightning'); } }
    if (id === 'volcano' || id === 'desert') { envT.e -= dt; if (envT.e <= 0 && T.Q().part > 150) { envT.e = gap(E.embers.gap) / Math.max(0.3, k); for (var i = 0; i < E.embers.n; i++) I.part(cm.x + R(-340, 340), cm.y + R(60, 240), R(-14, 14), R(-70, -30), R(1.2, 2.2), R(1.4, 2.6), id === 'volcano' ? '#ff8a3a' : '#f0d090', 0); } }
    if (id === 'void' || id === 'ruins') { envT.r -= dt; if (envT.r <= 0) { envT.r = gap(E.rift.gap); V.play('env', 'rift'); } }
    if (id === 'frozen' || id === 'desert') { envT.g -= dt; if (envT.g <= 0) { envT.g = gap(E.gust.gap); V.play('env', 'gust'); } }
  };
  /* áudio: volume de interface separado + sons por raridade em camadas */
  var UIS = { click: 1, pick: 1, xp: 1, coin: 1, level: 1, build: 1 };
  var Au = T.Audio, sfx0 = Au.sfx; Au.sfx0 = sfx0;
  Au.sfx = function (n) { this.cur = UIS[n] ? this.ug : null; try { sfx0.call(this, n); } finally { this.cur = null; } };
  Au.rarity = function (r) {
    if (!this.ctx || !T.Save.d.set.sfx) return; var self = this, f = [523, 587, 659, 784, 880, 1046][Math.max(0, Math.min(5, r | 0))]; this.cur = this.ug;
    this.tone('triangle', f, f * 1.5, 0.25, 0.1); if (r >= 2) setTimeout(function () { self.cur = self.ug; self.tone('sine', f * 1.5, f * 2, 0.35, 0.1); self.cur = null; }, 90);
    if (r >= 3) setTimeout(function () { self.cur = self.ug; self.tone('sine', f * 2, f * 3, 0.5, 0.08); self.noise(0.25, 0.05, 6000); self.cur = null; }, 180);
    if (r >= 4) setTimeout(function () { self.cur = self.ug; self.tone('sawtooth', f / 2, f, 0.8, 0.07); self.cur = null; }, 260);
    if (r >= 5) setTimeout(function () { self.cur = self.ug; [1, 1.25, 1.5, 2, 2.5].forEach(function (m, i) { setTimeout(function () { self.cur = self.ug; self.tone('triangle', f * m, f * m * 1.01, 0.9, 0.07); self.cur = null; }, i * 70); }); self.cur = null; }, 340);
    this.cur = null;
  };
  var s0 = T.Sim.step; T.Sim.step = function (dt) { s0(dt); V.envUpdate(dt); };
})(window.TD);

'use strict';
/* NOCTARIA — torres: construção, melhorias, venda, reparo, ataques específicos e aura de suporte. */
(function (T) {
  var I = T.int, G = I.G, R = T.R, TAU = T.TAU, FX = T.FX, TW = T.TW, AL = T.pools.AL;
  var MAXLV = 3, PB = [];
  var Tw = T.Towers = { MAXLV: MAXLV };
  var tuid = 1;
  Tw.cost = function (type) { return Math.round(TW[type].cost * G.P.tcost * (1 + 0.04 * G.built)); };
  Tw.upCost = function (t) { return Math.round(TW[t.type].cost * 0.9 * t.lv * G.P.tcost); };
  Tw.sellValue = function (t) { return Math.round(t.invest * 0.6); };
  Tw.repairCost = function (t) { return Math.ceil((1 - t.hp / t.max) * TW[t.type].cost * 0.5); };
  Tw.stats = function (t) {
    var D = TW[t.type], P = G.P, lv = t.lv, lvm = 1 + 0.65 * (lv - 1);
    var dmg = D.dmg * lvm * P.tdmg * (t.type === 'fire' ? 1 + P.tt.fire : 1) * (1 + 0.5 * (P.magic - 1) * (t.type === 'arcane' || t.type === 'elec' ? 1 : 0));
    var rng = D.rng * P.trange * (1 + 0.08 * (lv - 1));
    var mult = P.trate * (1 + 0.12 * (lv - 1)) * (t.buffT > 0 ? 1.5 : 1) * (G.furyOn > 0 ? 2 : 1) * (t.aura || 1);
    return { dmg: dmg, rng: rng, cd: D.cd / mult, rate: 1 / (D.cd / mult) };
  };
  Tw.canPlace = function (type, x, y) {
    var B = G.base, dx = x - B.x, dy = y - B.y, i;
    if (type && !(T.Save.d.towers[type] || TW[type].unlock === 0)) return 'Bloqueada';
    if (dx * dx + dy * dy > 460 * 460) return 'Longe do núcleo';
    if (dx * dx + dy * dy < 62 * 62) return 'Perto do núcleo';
    for (i = 0; i < G.towers.length; i++) { var t = G.towers[i]; if ((t.x - x) * (t.x - x) + (t.y - y) * (t.y - y) < 38 * 38) return 'Ocupado'; }
    var ob = I.getObst(); for (i = 0; i < ob.length; i++) { var o = ob[i]; if ((o.x - x) * (o.x - x) + (o.y - y) * (o.y - y) < (o.r * o.s + 16) * (o.r * o.s + 16)) return 'Obstáculo'; }
    for (i = 0; i < G.portals.length; i++) { var p = G.portals[i]; if ((p.x - x) * (p.x - x) + (p.y - y) * (p.y - y) < 90 * 90) return 'Portal'; }
    if (x < 40 || y < 40 || x > T.W - 40 || y > T.W - 40) return 'Borda';
    return null;
  };
  Tw.place = function (type, x, y) {
    if (G.state !== 'play') return null; var c = Tw.cost(type), why = Tw.canPlace(type, x, y);
    if (why) { I.text(x, y - 10, why, '#ff8a8a'); return null; }
    if (G.coins < c) { I.text(x, y - 10, 'Ouro insuficiente', '#ff8a8a'); return null; }
    G.coins -= c; G.built++; G.stats.spent += c;
    var D = TW[type], t = { uid: tuid++, type: type, x: x, y: y, lv: 1, hp: D.hp, max: D.hp, cd: R(0.2, 0.7), hit: 0, fire: 0, ang: 0, buffT: 0, aura: 1, invest: c, anim: 0, born: 0 };
    G.towers.push(t); G.sel = { ref: t };
    FX.smoke(x, y, 5, 'rgba(120,110,100,0.5)', 9); FX.sparks(x, y - 10, 8, D.col, 120); I.ring(x, y, 34, D.col, 0.4); T.Audio.sfx('build'); I.ui('hud'); I.ui('sel');
    return t;
  };
  Tw.upgrade = function (t) {
    if (!t || t.lv >= MAXLV || G.state !== 'play') return false; var c = Tw.upCost(t);
    if (G.coins < c) { I.text(t.x, t.y - 30, 'Ouro insuficiente', '#ff8a8a'); return false; }
    G.coins -= c; t.invest += c; t.lv++; var D = TW[t.type]; t.max = Math.round(D.hp * (1 + 0.4 * (t.lv - 1))); t.hp = t.max; G.stats.spent += c;
    I.ring(t.x, t.y, 44, '#e8c860', 0.5); FX.sparks(t.x, t.y - 20, 12, '#e8c860', 150); FX.smoke(t.x, t.y, 3, 'rgba(120,110,100,0.5)', 8); T.Audio.sfx('pick'); I.ui('hud'); I.ui('sel'); return true;
  };
  Tw.sell = function (t) {
    if (!t || G.state !== 'play') return; var v = Tw.sellValue(t); G.coins += v; var i = G.towers.indexOf(t); if (i >= 0) G.towers.splice(i, 1); G.sel = null;
    FX.smoke(t.x, t.y, 4, 'rgba(120,110,100,0.5)', 8); I.text(t.x, t.y - 20, '+' + v, '#ffd24a'); T.Audio.sfx('coin'); I.ui('hud'); I.ui('sel');
  };
  Tw.repair = function (t) {
    if (!t || G.state !== 'play') return; var c = Tw.repairCost(t); if (!c || G.coins < c) return;
    G.coins -= c; t.hp = t.max; FX.heal(t.x, t.y - 10, 5, '#8affb0'); T.Audio.sfx('pick'); I.ui('hud'); I.ui('sel');
  };

  function pickTarget(t, rng) {
    if (t.type === 'sniper') {
      var best = null, bs = -1; I.gridQ.collect(PB, t.x, t.y, rng, true);
      for (var i = 0; i < PB.length; i++) { var e = PB[i]; if (!e.on) continue; var s = (e.boss ? 1e6 : 0) + (e.elite ? 1e4 : 0) + e.hp; if (s > bs) { bs = s; best = e; } } return best;
    }
    return I.gridQ.nearest(t.x, t.y, rng, true);
  }
  function fire(t, e, S) {
    var C = T.Combat, D = TW[t.type], P = G.P, ang = Math.atan2(e.y - 6 - (t.y - 34), e.x - t.x), ox = t.x, oy = t.y - 34, d = Math.sqrt((e.x - ox) * (e.x - ox) + (e.y - oy) * (e.y - oy));
    t.ang = ang; t.fire = 0.22; t.face = e.x >= t.x ? 1 : -1;
    switch (t.type) {
      case 'arrow': for (var k = 0; k < (t.lv >= 3 ? 2 : 1); k++) C.proj('arrow', ox, oy, ang + (k ? 0.08 : 0), 540, S.dmg, { src: 't', col: '#e8d8a0', r: 4, pierce: t.lv >= 2 ? 1 : 0, life: S.rng / 500 + 0.2 }); T.Audio.sfx('shoot'); break;
      case 'cannon': C.proj('ball', ox, oy, ang, 270, S.dmg, { src: 't', col: '#ffa24a', r: 8, expl: D.aoe * (1 + P.tt.cannonArea) * (1 + 0.12 * (t.lv - 1)), life: Math.max(0.15, d / 270), splash: 0.9 }); FX.smoke(ox + Math.cos(ang) * 14, oy + Math.sin(ang) * 14, 2, null, 8); FX.sparks(ox + Math.cos(ang) * 14, oy + Math.sin(ang) * 14, 3, '#ffb060', 120); I.shake(0.8); T.Audio.sfx('boom'); break;
      case 'fire': C.proj('flame', ox, oy, ang, 300, S.dmg, { src: 't', col: '#ff8a2a', r: 9, pierce: 2, life: S.rng / 280, fx: 'fire', fxv: S.dmg * 0.9 }); FX.flame(ox + Math.cos(ang) * 12, oy + Math.sin(ang) * 12, 2); break;
      case 'ice': C.proj('shard', ox, oy, ang, 380, S.dmg, { src: 't', col: '#9fe0ff', r: 6, pierce: t.lv >= 3 ? 1 : 0, life: S.rng / 360 + 0.1, fx: 'ice' }); FX.ice(ox, oy, 1); break;
      case 'elec': I.zap(ox, oy, e.x, e.y - 6, '#f3dc4a', 0.2); I.lightning(e, S.dmg, 2 + t.lv + P.tt.elecChain, '#f3dc4a'); FX.sparks(ox, oy, 4, '#fff2a0', 100); G.stats.towerDmg += S.dmg * 2; break;
      case 'arcane': for (k = 0; k < (t.lv >= 2 ? 2 : 1); k++) C.proj('orb', ox, oy, ang + (k ? 0.5 : 0) - (t.lv >= 2 ? 0.25 : 0), 250, S.dmg, { src: 't', col: '#b06cff', r: 7, home: 1, life: 2, expl: 22 + 4 * t.lv, splash: 0.5 }); T.Audio.sfx('magic'); break;
      case 'poison': C.proj('glob', ox, oy, ang, 220, S.dmg, { src: 't', col: '#7be05a', r: 4, nocol: 1, life: Math.max(0.2, d / 220), expl: D.aoe * (1 + 0.15 * (t.lv - 1)), pierce: 99 }); break;
      case 'sniper': {
        I.zap(ox, oy, e.x, e.y - 6, '#ffffff', 0.12); var dm = S.dmg * (e.boss ? 1.4 : 1), cr = I.strike(e, dm, 't', true); G.stats.towerDmg += dm; FX.sparks(e.x, e.y - 6, 8, '#fff', 160); FX.sparks(ox, oy, 3, '#fff', 90); I.shake(0.8); T.Audio.sfx('slash'); break; }
      case 'summon': {
        var n = 0, a = AL.a; for (k = 0; k < a.length; k++) if (a[k].on && a[k].owner === t) n++;
        if (n < 2 + t.lv) { var w = I.spawnAlly('warrior', t.x + R(-14, 14), t.y + 6, 14, S.dmg * 1.4); if (w) { w.owner = t; FX.soul(w.x, w.y, 4, '#4fe0a0'); I.ring(t.x, t.y, 30, '#4fe0a0', 0.4); } } break; }
    }
  }
  Tw.update = function (dt) {
    var ts = G.towers, i, j, t, H = G.hero;
    for (i = 0; i < ts.length; i++) { t = ts[i]; t.aura = 1; t.anim += dt; if (t.hit > 0) t.hit -= dt; if (t.fire > 0) t.fire -= dt; if (t.buffT > 0) t.buffT -= dt; if (t.born < 1) t.born += dt * 3; }
    for (i = 0; i < ts.length; i++) {
      t = ts[i]; if (t.type !== 'support') continue;
      var S = Tw.stats(t), am = 1 + 0.2 * t.lv * (G.P.overcharge ? 2 : 1), r2 = S.rng * S.rng;
      for (j = 0; j < ts.length; j++) { var o = ts[j]; if (o === t || o.type === 'support') continue; var dx = o.x - t.x, dy = o.y - t.y; if (dx * dx + dy * dy < r2) { if (am > o.aura) o.aura = am; o.hp = Math.min(o.max, o.hp + o.max * 0.01 * t.lv * dt); } }
      var hx = H.x - t.x, hy = H.y - t.y; if (hx * hx + hy * hy < r2) I.heal((1 + t.lv) * (G.P.overcharge ? 2 : 1) * dt);
      t.cd -= dt; if (t.cd <= 0) { t.cd = 2.4; I.ring(t.x, t.y - 20, S.rng * 0.6, '#e8a93a', 0.9); FX.heal(t.x, t.y - 20, 2, '#ffe9a0'); }
    }
    for (i = 0; i < ts.length; i++) {
      t = ts[i]; if (t.type === 'support') continue; var St = Tw.stats(t); t.cd -= dt;
      if (t.cd <= 0) { var e = pickTarget(t, St.rng); if (e) { fire(t, e, St); t.shots = (t.shots || 0) + 1; t.cd = St.cd; } else t.cd = 0.08; }
    }
  };
})(window.TD);

'use strict';
/* NOCTARIA — diretor de ondas, eventos de mapa, chefes (fases/ataques) e ciclo da partida (T.Run). */
(function (T) {
  var I = T.int, G = I.G, R = T.R, RI = T.RI, TAU = T.TAU, FX = T.FX, EN = T.EN, EP = T.pools.EP, EJ = T.pools.EJ, clamp = T.clamp;
  function ui(a, b, c, d, e) { I.ui(a, b, c, d, e); }

  /* ---------- Ondas ---------- */
  var Wave = T.Wave = {};
  function portalPos(p) { return { x: clamp(p.x + R(-40, 40), 30, T.W - 30), y: clamp(p.y + R(-40, 40), 30, T.W - 30) }; }
  function pickId() {
    var M = G.map, w = G.wave, pool = M.pool.filter(function (id) { return EN[id].from <= w; });
    if (G.theme === 'swift') pool = pool.filter(function (id) { return id === 'ashhound' || id === 'spider' || id === 'ghoul'; }).concat(['ashhound', 'spider']);
    if (G.theme === 'horde') pool = ['ghoul', 'ghoul', 'spider', 'ashhound'];
    if (!pool.length) pool = ['ghoul'];
    var r = Math.random();
    if (w >= 7 && r < 0.05) return 'priest'; if (w >= 9 && r < 0.09) return 'summoner'; if (w >= 14 && r < 0.12) return 'drake';
    var tot = 0, i; for (i = 0; i < pool.length; i++) tot += EN[pool[i]].w + 1;
    var x = Math.random() * tot; for (i = 0; i < pool.length; i++) { x -= EN[pool[i]].w + 1; if (x <= 0) return pool[i]; }
    return pool[0];
  }
  function cost(id) { return 1 + EN[id].hp / 40; }
  function spawnAt(id, x, y, elite) { var e = I.spawnEnemy(id, x, y, elite); if (e) { I.ring(x, y, 22, '#a060ff', 0.35); I.part(x, y, 0, -20, 0.5, 5, 'rgba(120,60,200,0.5)', 3); } return e; }
  function nextWave() {
    G.wave++; G.waveT = 0; G.waveLen = 30 + Math.min(12, G.wave);
    G.theme = null; var w = G.wave, boss = w % 5 === 0;
    if (!boss && w >= 3 && Math.random() < 0.35) G.theme = T.pick(['horde', 'elite', 'swift', 'invasion']);
    G.waveBoss = boss; if (G.theme === 'invasion') G.invP = T.pick(G.portals);
    var name = boss ? 'CHEFE' : G.theme === 'horde' ? 'Horda' : G.theme === 'elite' ? 'Elites' : G.theme === 'swift' ? 'Matilha veloz' : G.theme === 'invasion' ? 'Invasão' : 'Onda';
    ui('banner', 'Onda ' + w, boss ? '⚠ Um chefe se aproxima' : name !== 'Onda' ? name : '', boss ? '#ff3d5e' : '#e8a93a');
    if (w > T.Save.d.maxWave) T.Save.d.maxWave = w;
    G.base.hp = Math.min(G.base.max, G.base.hp + 20); G.coins += 15 + w * 2; G.credit += 2;
    if (G.theme === 'elite') for (var i = 0; i < 1 + Math.floor(w / 6); i++) { var p = portalPos(T.pick(G.portals)); spawnAt(pickId(), p.x, p.y, true); }
    if (boss) Boss.spawn();
    ui('hud');
  }
  Wave.update = function (dt) {
    var q = T.Q();
    if (!(G.waveBoss && G.boss && G.boss.on)) G.waveT += dt;
    if (G.wave === 0 || G.waveT >= G.waveLen) nextWave();
    var w = G.wave, rate = (0.4 + 0.25 * w) * (G.mods && G.mods.rate || 1) * Math.min(1, 0.3 + G.t / 100 * 0.7) * (G.theme === 'horde' ? 1.7 : G.theme === 'elite' ? 0.6 : 1) * (G.waveBoss ? 0.55 : 1);
    G.credit += rate * dt; G.rate = rate;
    var guard = 0;
    while (G.credit >= 1 && guard++ < 6) {
      if (EP.count() >= q.en) { G.credit = Math.min(G.credit, 4); break; }
      var id = pickId(), c = cost(id); if (G.credit < c) break; G.credit -= c;
      var pp = G.theme === 'invasion' ? portalPos(G.invP) : portalPos(T.pick(G.portals));
      var elite = G.theme !== 'horde' && w >= 4 && Math.random() < Math.min(0.14, 0.02 + 0.008 * w);
      spawnAt(id, pp.x, pp.y, elite);
    }
    G.eventT -= dt; if (G.eventT <= 0) { G.eventT = 40 + R(0, 15); mapEvent(); }
  };
  function mapEvent() {
    var ev = G.map.event, H = G.hero, i, p, a;
    switch (ev) {
      case 'wolves': p = T.pick(G.portals); ui('banner', 'Alcateia', 'Lobos sombrios rondam a floresta', '#6fd05a'); for (i = 0; i < 6; i++) spawnAt('ashhound', p.x + R(-40, 40), p.y + R(-40, 40), false); break;
      case 'risen': ui('banner', 'Mortos despertam', 'Algo se move sob as lápides', '#9fb4d0'); for (i = 0; i < 8; i++) { a = i * TAU / 8; var gx = clamp(H.x + Math.cos(a) * 220, 40, T.W - 40), gy = clamp(H.y + Math.sin(a) * 220, 40, T.W - 40); spawnAt('ghoul', gx, gy, false); FX.smoke(gx, gy, 3, 'rgba(80,90,80,0.5)', 8); } break;
      case 'guardians': var gd = T.pick(T.GUARD); ui('banner', gd.n, 'Guardião da mata desperta — ' + gd.eff, gd.col); I.ring(H.x, H.y, 160, gd.col, 1); FX.sparks(H.x, H.y, 18, gd.col, 200); if (gd.id === 'curupira') { var ea = EP.a; for (i = 0; i < ea.length; i++) if (ea[i].on && !ea[i].boss) { ea[i].slowT = 8; ea[i].slowF = 0.4; } } else { I.heal(H.max * 0.25); G.base.hp = Math.min(G.base.max, G.base.hp + G.base.max * 0.1); } break;
      case 'blizzard': ui('banner', 'Nevasca', 'Você se move mais devagar', '#9fe0ff'); G.blizT = 10; break;
      case 'sandstorm': ui('banner', 'Tempestade de areia', 'Inimigos mais rápidos', '#e8b86a'); G.sandT = 10; break;
      case 'eruption': ui('banner', 'Erupção', 'Fogo cai do céu!', '#ff7a3a'); for (i = 0; i < 6; i++) T.Combat.zone('tele', clamp(H.x + R(-160, 160), 40, T.W - 40), clamp(H.y + R(-160, 160), 40, T.W - 40), 46, 1.3 + i * 0.25, { hostile: 1, dmg: 26 + G.wave * 2, col: '#ff7a3a' }); break;
      case 'surge': ui('banner', 'Surto arcano', 'Espectros emergem do véu', '#b06cff'); for (i = 0; i < 4; i++) spawnAt('wraith', clamp(H.x + R(-200, 200), 40, T.W - 40), clamp(H.y + R(-200, 200), 40, T.W - 40), false); break;
      case 'rift': ui('banner', 'Fenda do Vazio', 'Guardiões atravessam', '#8a3ae0'); for (i = 0; i < 3; i++) spawnAt('knight', clamp(H.x + R(-220, 220), 40, T.W - 40), clamp(H.y + R(-220, 220), 40, T.W - 40), false); break;
    }
    G.flash = 0.15; G.flashCol = G.map.tint;
  }

  /* ---------- Chefes ---------- */
  var Boss = T.Boss = {};
  Boss.spawn = function () {
    var idx = (Math.floor(G.wave / 5) - 1) % T.BOSS.length, def = T.BOSS[idx], p = T.pick(G.portals);
    if (G.map.boss) { var bl = G.map.boss, bid = bl[(Math.floor(G.wave / 5) - 1) % bl.length]; for (var bi = 0; bi < T.BOSS.length; bi++) if (T.BOSS[bi].id === bid) { idx = bi; def = T.BOSS[bi]; } }
    var e = I.spawnEnemy(def.id, p.x, p.y, false, def); if (!e) return;
    e.bossIdx = idx; e.bossN = Math.floor(G.wave / 5); G.boss = e; e.phase = 0; e.cdT = 3; T.Save.d.seen.b[def.id] = 1;
    I.ring(p.x, p.y, 120, def.col, 1); I.ring(p.x, p.y, 70, '#fff', 0.6); FX.smoke(p.x, p.y, 10, 'rgba(40,30,60,0.6)', 16); FX.sparks(p.x, p.y, 16, def.col, 260);
    G.flash = 0.5; G.flashCol = def.col; I.shake(7); T.Audio.sfx('boss'); G.hitstop = 0.1;
    ui('banner', def.n, 'Chefe — prepare-se', '#ff3d5e', 'boss'); T.VFX.play('boss', 'enter', p.x, p.y, { col: def.col });
  };
  function enemyShot(e, a, spd, dmgMul, col, r) {
    var ej = EJ.get(); if (!ej) return; ej.x = e.x; ej.y = e.y - e.r * 0.5; ej.vx = Math.cos(a) * spd; ej.vy = Math.sin(a) * spd; ej.dmg = e.dmg * dmgMul; ej.life = 3; ej.r = r || 6; ej.col = col;
  }
  function minions(e, n) {
    var id = e.def.minion; for (var i = 0; i < n; i++) { if (EP.count() >= T.Q().en + 20) break; var a = R(0, TAU); spawnAt(id, e.x + Math.cos(a) * (e.r + 20), e.y + Math.sin(a) * (e.r + 20), false); }
    I.ring(e.x, e.y, e.r + 40, '#a060ff', 0.5);
  }
  Boss.logic = function (e, dt) {
    var H = G.hero, ratio = e.hp / e.max, ph = ratio > 0.66 ? 0 : ratio > 0.33 ? 1 : 2, def = e.def;
    if (ph > e.phase) {
      e.phase = ph; e.cdT = 1.4; e.shieldHp = e.max * 0.04; I.ring(e.x, e.y, 150, def.col, 0.9); I.ring(e.x, e.y, 90, '#fff', 0.5); FX.sparks(e.x, e.y, 20, def.col, 260); I.shake(6); G.flash = 0.3; G.flashCol = def.col; T.Audio.sfx('boss');
      ui('banner', def.n, 'Fase ' + (ph + 1) + ' — a fúria cresce', '#ff3d5e', 'boss'); minions(e, 4);
    }
    e.cdT -= dt;
    if (e.cdT > 0 || e.charge > 0 || e.stunT > 0) return;
    var list = def.atk[e.phase], atk = T.pick(list); e.cdT = def.cd * (1 - 0.12 * e.phase) * R(0.85, 1.15); e.atkAnim = 0;
    var dx = H.x - e.x, dy = H.y - e.y, ang = Math.atan2(dy, dx), i;
    switch (atk) {
      case 'slam': T.Combat.zone('tele', H.x, H.y, 70 + e.phase * 10, 0.9, { hostile: 1, dmg: e.dmg * 1.1, col: def.col }); T.Combat.zone('tele', e.x + Math.cos(ang) * 60, e.y + Math.sin(ang) * 60, 62, 0.7, { hostile: 1, dmg: e.dmg, col: def.col }); break;
      case 'summon': minions(e, 3 + e.phase); break;
      case 'fan': for (i = 0; i < 5 + 2 * e.phase; i++) enemyShot(e, ang + (i - (4 + 2 * e.phase) / 2) * 0.17, 230, 0.55, def.col, 7); T.Audio.sfx('magic'); break;
      case 'ring': for (i = 0; i < 12 + 4 * e.phase; i++) enemyShot(e, i * TAU / (12 + 4 * e.phase), 165, 0.5, def.col, 6); I.ring(e.x, e.y, e.r + 30, def.col, 0.4); break;
      case 'charge': var d = Math.sqrt(dx * dx + dy * dy) || 1; e.charge = 0.65; e.chx = dx / d * 430; e.chy = dy / d * 430; e.atkT = 0; FX.sparks(e.x, e.y, 10, def.col, 160); I.shake(2); break;
      case 'hazard': for (i = 0; i < 3; i++) T.Combat.zone('hazard', H.x + R(-70, 70), H.y + R(-70, 70), 42, 5, { hostile: 1, dmg: e.dmg * 0.22, col: '#ff6a2a' }); break;
      case 'teleport': FX.smoke(e.x, e.y, 6, 'rgba(60,30,120,0.6)', 14); var a2 = R(0, TAU); e.x = clamp(H.x + Math.cos(a2) * 130, 40, T.W - 40); e.y = clamp(H.y + Math.sin(a2) * 130, 40, T.W - 40); FX.smoke(e.x, e.y, 6, 'rgba(60,30,120,0.6)', 14); I.ring(e.x, e.y, 70, def.col, 0.5); for (i = 0; i < 7; i++) enemyShot(e, Math.atan2(H.y - e.y, H.x - e.x) + (i - 3) * 0.2, 240, 0.5, def.col, 6); break;
    }
  };
  Boss.died = function (e) {
    var def = e.def; G.bossKills++; G.boss = null; G.waveBoss = false; G.vac = 3.5;
    I.ring(e.x, e.y, 200, def.col, 1.1); I.ring(e.x, e.y, 120, '#fff', 0.7); I.ring(e.x, e.y, 60, def.col, 0.5); FX.sparks(e.x, e.y, 30, def.col, 320); FX.smoke(e.x, e.y, 10, 'rgba(60,50,70,0.6)', 18); I.burst(e.x, e.y, 30, def.col, 260, 1, 4, 1);
    G.flash = 0.6; G.flashCol = '#ffffff'; I.shake(10); G.hitstop = 0.18; T.Audio.sfx('boom'); T.Audio.sfx('win');
    var a = EP.a; for (var i = 0; i < a.length; i++) { var o = a[i]; if (o.on && o !== e && !o.boss) I.hurtEnemy(o, 1e9, 'x', false); }
    T.VFX.play('boss', 'death', e.x, e.y, { col: def.col }); if (T.Extra) T.Extra.trophy(def); EJ.clear(); ui('banner', 'Chefe derrotado', def.n + ' caiu', '#ffd24a');
    I.later(1.3, function () { if (G.state === 'play') I.openReward('Tesouro do Chefe', 3); else I.later(1, function () { I.openReward('Tesouro do Chefe', 3); }); });
    if (e.bossN * 5 >= G.winWave) I.later(2.8, function () { if (G.state === 'play' || G.state === 'reward' || G.state === 'levelup') T.Run.end(true, 'win'); else I.later(1, function () { T.Run.end(true, 'win'); }); });
    ui('hud');
  };

  /* ---------- Ciclo da partida ---------- */
  var Run = T.Run = {};
  Run.start = function (clsId, mapId) {
    var sv = T.Save.d; sv.lastClass = clsId; sv.lastMap = mapId; I.newRun(clsId, mapId); T.Combat.init(); G.winWave = 20; G.summaryShown = false; G.hero.spT = 4; G.eventT = 28;
    T.Save.save(); T.Audio.music(true); ui('hud');
  };
  Run.end = function (win, why) {
    if (G.state === 'over') return; G.state = 'over'; G.win = win; G.why = why; G.endT = win ? 1.4 : 1.8; G.summaryShown = false; var sv = T.Save.d, H = G.hero;
    if (!win && H.an) { T.Anim.play(H.an, 'death', true); }
    if (!win) { FX.sparks(H.x, H.y, 20, '#ff6a6a', 200); I.shake(8); G.flash = 0.5; G.flashCol = '#ff3a3a'; T.Audio.sfx('lose'); } else { G.flash = 0.5; G.flashCol = '#ffe9a0'; T.Audio.sfx('win'); if (H.an) T.Anim.play(H.an, 'special', true); FX.runeCircle(H.x, H.y, 80, '#ffe9a0', 12); FX.heal(H.x, H.y, 24, '#ffe9a0'); for (var vi = 0; vi < 5; vi++) (function (vi) { I.later(vi * 0.25, function () { FX.sparks(H.x + R(-40, 40), H.y - 30 + R(-20, 20), 16, '#ffd24a', 260); I.ring(H.x, H.y, 60 + vi * 30, '#ffe9a0', 0.6); }); })(vi); }
    var syn = 0; for (var k in G.syn) syn++;
    var score = G.kills * 10 + G.wave * 100 + G.bossKills * 500 + G.lvl * 50 + (win ? 3000 : 0);
    var ess = Math.floor(G.kills / 12 + G.wave * 4 + G.bossKills * 25 + G.frag + (win ? 80 : 0));
    sv.games++; sv.kills += G.kills; sv.maxLevel = Math.max(sv.maxLevel, G.lvl); sv.maxWave = Math.max(sv.maxWave, G.wave); sv.bosses += G.bossKills; sv.wins += win ? 1 : 0; sv.time += G.t; sv.towersBuilt += G.built;
    var newBest = score > sv.best; if (newBest) sv.best = score; sv.essence += ess;
    var s = { kills: G.kills, total: sv.kills, lvl: G.lvl, wave: G.wave, bosses: G.bossKills, syn: syn, towers: G.built, mythic: G.mythic }, got = [];
    T.ACH.forEach(function (a) { if (!sv.ach[a.id] && a.ok(s)) { sv.ach[a.id] = 1; sv.essence += a.rw; ess += a.rw; got.push(a); } });
    G.sum = { win: win, why: why, score: score, ess: ess, best: newBest, ach: got, time: G.t, kills: G.kills, wave: G.wave, lvl: G.lvl, boss: G.bossKills, towers: G.built, syn: syn, relics: G.relics.length, dmg: Math.round(G.stats.dmg), tdmg: Math.round(G.stats.towerDmg), spent: G.stats.spent, frag: G.frag };
    T.Save.save(); T.Audio.music(false); ui('hud');
  };
  Run.usePotion = function () { if (G.state !== 'play' || G.potions <= 0 || G.hero.hp >= G.hero.max) return; G.potions--; I.heal(G.hero.max * 0.4); FX.heal(G.hero.x, G.hero.y, 8, '#ff8a9a'); T.Audio.sfx('pick'); ui('hud'); };
  Run.pause = function (on) { if (on && G.state === 'play') { G.state = 'pause'; ui('pause', true); } else if (!on && G.state === 'pause') { G.state = 'play'; ui('pause', false); } };
  Run.special = function () { return T.Combat.special(); };
  Run.excalibur = function () { return T.Exc.cast(); };
  Run.selectBuild = function (type) { G.build = (G.build === type) ? null : type; G.sel = null; ui('sel'); ui('hud'); };
  Run.tap = function (wx, wy) {
    if (G.state !== 'play') return;
    if (G.build) { var t = T.Towers.place(G.build, wx, wy); if (t) G.build = null; ui('hud'); return; }
    var best = null, bd = 30 * 30; for (var i = 0; i < G.towers.length; i++) { var o = G.towers[i], dx = o.x - wx, dy = (o.y - 20) - wy, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = o; } }
    G.sel = best ? { ref: best } : null; ui('sel');
  };
})(window.TD);

'use strict';
/* NOCTARIA V6 — Ultimates cinematográficas (artefatos alternativos por herói).
   Cada uma tem linguagem própria: preparação (runas + escurecimento, do Exc), liberação em fases, dano, luz, partículas e som.
   Nomes de tradição viva (ex.: Mapinguari) NÃO são usados como ataque: ver FOLCLORE_E_MITOLOGIA.md. */
(function (T) {
  var I = T.int, G = I.G, R = T.R, TAU = T.TAU, FX = T.FX, EP = T.pools.EP, X = T.Exc;
  var U = T.Ult = { list: [] };
  var COST = 120;
  T.ARTS_ALT = {
    knight: { n: 'Fúria do Colosso das Raízes', sub: 'O chão se parte três vezes', g: 'sword', c: [230, 160, 60], c2: [255, 236, 170], fx: 'roots', alt: 1 },
    mage: { n: 'Tempestade de Gelo', sub: 'Cristais gigantes despencam', g: 'staff', c: [110, 200, 255], c2: [230, 246, 255], fx: 'blizzard', alt: 1 },
    archer: { n: 'Serpente Ancestral', sub: 'Uma serpente de fogo cruza o mapa', g: 'bow', c: [255, 130, 40], c2: [255, 232, 150], fx: 'serpent', alt: 1 },
    necro: { n: 'Execução do Abismo', sub: 'A fenda cobra o que é devido', g: 'scythe', c: [150, 90, 255], c2: [222, 200, 255], fx: 'abyss', alt: 1 },
    paladin: { n: 'Julgamento Celestial', sub: 'O símbolo desce, as colunas respondem', g: 'spear', c: [255, 214, 100], c2: [255, 250, 220], fx: 'judgment', alt: 1 },
    assassin: { n: 'Nuke Arcano', sub: 'O núcleo implode e detona', g: 'dagger', c: [200, 110, 255], c2: [255, 240, 255], fx: 'nuke', alt: 1 }
  };
  U.cost = COST;
  function ex() { var d = T.Save.d; if (!d.ex) d.ex = {}; if (!d.ex.artU) d.ex.artU = {}; if (!d.ex.art) d.ex.art = {}; return d.ex; }
  U.owned = function (h) { return !!ex().artU[h]; };
  U.chosen = function (h) { return ex().art[h] === 'alt' && U.owned(h); };
  U.buy = function (h) { var d = T.Save.d; if (U.owned(h) || d.essence < COST) return false; d.essence -= COST; ex().artU[h] = 1; ex().art[h] = 'alt'; T.Save.save(); return true; };
  U.toggle = function (h) { if (!U.owned(h)) return; ex().art[h] = ex().art[h] === 'alt' ? 'base' : 'alt'; T.Save.save(); };
  function hex(c) { return '#' + c.map(function (v) { return ('0' + v.toString(16)).slice(-2); }).join(''); }
  function rg(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function B() { return G.cls.dmg * G.P.dmg; }
  function hit(e, d, stun) { if (!e.on) return; if (stun) I.stun(e, stun); e.txT = 1; I.hurtEnemy(e, d, 'dot', true); }
  function inR(x, y, r, fn) { var a = EP.a; for (var i = 0; i < a.length; i++) { var e = a[i]; if (!e.on) continue; var dx = e.x - x, dy = e.y - y; if (dx * dx + dy * dy <= r * r) fn(e, Math.sqrt(dx * dx + dy * dy)); } }
  function snd(a, b, d, v, t) { try { T.Audio.tone(t || 'sawtooth', a, b, d, v || 0.1); } catch (e) { } }

  U.start = function (AR, x, y) {
    var q = T.Q(), u = { fx: AR.fx, A: AR, x: x, y: y, t: 0, q: q, k: 0, hits: 0, seed: Math.random() * 100 };
    if (u.fx === 'roots') { u.stomps = [0, 0.55, 1.1]; u.done = 3.0; u.R = [300, 500, 760]; }
    else if (u.fx === 'blizzard') { u.done = 4.4; u.cr = []; var n = q.light > 0 ? 28 : 16; for (var i = 0; i < n; i++) { var a = R(0, TAU), d = Math.sqrt(Math.random()) * 560; u.cr.push({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.8, at: 0.3 + i * (3.1 / n) + R(0, 0.12), s: R(0.8, 1.35), hit: 0 }); } }
    else if (u.fx === 'serpent') {
      u.done = 4.0; var t0 = null, bd = 1e9; inR(x, y, 900, function (e, d) { if (d < bd) { bd = d; t0 = e; } });
      u.ang = t0 ? Math.atan2(t0.y - y, t0.x - x) : (G.hero.face > 0 ? 0 : Math.PI); u.px = x; u.py = y; u.body = []; u.trail = [];
    }
    else if (u.fx === 'abyss') { u.done = 3.2; u.exec = 0; u.sw = 0; }
    else if (u.fx === 'judgment') {
      u.done = 3.2; u.col = []; var list = []; inR(x, y, 760, function (e) { list.push(e); }); list.sort(function (a, b) { return (b.boss ? 1e9 : b.max) - (a.boss ? 1e9 : a.max); });
      var m = q.light > 0 ? 9 : 5; for (i = 0; i < m && i < list.length; i++) u.col.push({ x: list[i].x, y: list[i].y, e: list[i], at: 1.25 + i * 0.1, hit: 0 });
      for (i = u.col.length; i < Math.min(m, 4); i++) { var a2 = R(0, TAU), d2 = R(80, 360); u.col.push({ x: x + Math.cos(a2) * d2, y: y + Math.sin(a2) * d2, e: null, at: 1.25 + i * 0.1, hit: 0 }); }
    }
    else if (u.fx === 'nuke') { u.done = 4.0; u.det = 0; }
    U.list.push(u); snd(90, 40, 1.2, 0.18, 'sine');
  };

  function upd(u, dt) {
    var q = u.q, t0 = u.t, t = u.t += dt, b = B(), i, fx = u.fx, H = G.hero;
    if (fx === 'roots') {
      for (i = 0; i < 3; i++) if (!u['s' + i] && t >= u.stomps[i]) {
        u['s' + i] = 1; I.shake(10); G.flash = 0.35; G.flashCol = '#ffd890'; G.hitstop = 0.05; snd(80 - i * 10, 28, 0.5, 0.25, 'sine'); try { T.Audio.sfx('boom'); } catch (e) { }
        FX.explosion(u.x, u.y, 90 + i * 40, '#e0a040'); FX.sparks(u.x, u.y, q.part > 200 ? 50 : 22, '#ffe8a0', 380); FX.decal(u.x, u.y, 120 + i * 60, 'rgba(60,34,14,0.5)', 9);
        (function (i) { I.later(0.12, function () { inR(u.x, u.y, u.R[i], function (e, d) { hit(e, b * 14 + e.max * (e.boss ? 0.03 : 0.16), 1.6); I.knock(e, { x: u.x, y: u.y }, 240); if (u.hits++ < 30) FX.sparks(e.x, e.y, 3, '#ffd890', 160); }); }); })(i);
      }
    } else if (fx === 'blizzard') {
      for (i = 0; i < u.cr.length; i++) { var c = u.cr[i]; if (!c.hit && t >= c.at + 0.38) {
        c.hit = 1; I.shake(3); FX.explosion(c.x, c.y, 64, '#9fe0ff'); FX.sparks(c.x, c.y, 8, '#e8f8ff', 260); snd(1400, 300, 0.2, 0.06, 'triangle');
        I.gridQ.aoe(c.x, c.y, 105, function (e) { I.freeze(e, 3.5); hit(e, b * 12 + e.max * (e.boss ? 0.015 : 0.16), 0); }); } }
      if (Math.random() < dt * 20) FX.heal(u.x + R(-600, 600), u.y + R(-360, 360), 1, '#e8f8ff');
    } else if (fx === 'serpent') {
      if (t < 2.8) {
        var th = u.ang + 3.5 * t, rr = 50 + 250 * t; u.px = T.clamp(u.x + Math.cos(th) * rr, 30, T.W - 30); u.py = T.clamp(u.y + Math.sin(th) * rr * 0.8, 30, T.W - 30); u.ang2 = th + 1.57;
        u.body.unshift({ x: u.px, y: u.py }); if (u.body.length > 26) u.body.length = 26;
        u.k -= dt; if (u.k <= 0) { u.k = 0.11; u.trail.push({ x: u.px, y: u.py, t: 0, ex: 0 }); FX.flame(u.px + R(-8, 8), u.py + R(-8, 8), 2); }
        inR(u.px, u.py, 95, function (e) { if (e.serp !== u.seed) { e.serp = u.seed; hit(e, b * 14 + e.max * (e.boss ? 0.025 : 0.3), 0.8); I.burn && I.burn(e, 6, 4); FX.sparks(e.x, e.y, 4, '#ffb050', 200); } });
      } else if (u.body.length) u.body.pop();
      for (i = u.trail.length - 1; i >= 0; i--) { var tr = u.trail[i]; tr.t += dt; if (!tr.ex && tr.t > 0.65) { tr.ex = 1; I.shake(1.5); FX.explosion(tr.x, tr.y, 70, '#ff8a2a'); snd(180, 50, 0.2, 0.08, 'sawtooth'); I.gridQ.aoe(tr.x, tr.y, 95, function (e) { hit(e, b * 9 + e.max * (e.boss ? 0.012 : 0.1), 0.5); }); } if (tr.t > 1.4) u.trail.splice(i, 1); }
    } else if (fx === 'abyss') {
      if (t < 1.2) inR(u.x, u.y, 560, function (e, d) { if (e.boss) return; var s = (1 - d / 560) * 190 * dt * (0.4 + t); e.x += (u.x - e.x) / (d || 1) * s; e.y += (u.y - e.y) / (d || 1) * s; });
      if (!u.exec && t >= 1.3) { u.exec = 1; I.shake(12); G.flash = 0.5; G.flashCol = '#c8a0ff'; G.hitstop = 0.1; snd(70, 25, 0.9, 0.25, 'sine'); try { T.Audio.sfx('boss'); } catch (e) { }
        FX.explosion(u.x, u.y, 160, '#9a5aff'); FX.sparks(u.x, u.y, q.part > 200 ? 60 : 26, '#e0c8ff', 380);
        inR(u.x, u.y, 520, function (e) { if (!e.boss && e.hp < e.max * 0.4) { hit(e, e.hp + 1, 0); FX.soul && FX.soul(e.x, e.y, 2, '#c8a0ff'); } else hit(e, b * 12 + e.max * (e.boss ? 0.04 : 0.28), 2); });
        G.hero.hp = Math.min(G.hero.max, G.hero.hp + G.hero.max * 0.2); }
      if (!u.sw && t >= 1.9) { u.sw = 1; I.ring(u.x, u.y, 600, '#c8a0ff', 0.8); I.shake(6); inR(u.x, u.y, 600, function (e) { hit(e, b * 5, 1); I.knock(e, { x: u.x, y: u.y }, 200); }); }
    } else if (fx === 'judgment') {
      if (!u.s0 && t >= 1.1) { u.s0 = 1; G.flash = 0.4; G.flashCol = '#fff6d0'; snd(300, 900, 0.6, 0.1, 'triangle'); }
      for (i = 0; i < u.col.length; i++) { var cl = u.col[i]; if (!cl.hit && t >= cl.at) { cl.hit = 1; if (cl.e && cl.e.on) { cl.x = cl.e.x; cl.y = cl.e.y; } I.shake(4); FX.explosion(cl.x, cl.y, 64, '#ffe080'); FX.sparks(cl.x, cl.y, 10, '#fff8d0', 260); snd(220, 60, 0.3, 0.1, 'sine');
        I.gridQ.aoe(cl.x, cl.y, 70, function (e) { hit(e, b * 25 + e.max * (e.boss ? 0.05 : 0.45), 2.5); }); } }
      if (!u.fin && t >= 2.3) { u.fin = 1; I.shake(10); G.flash = 0.7; G.flashCol = '#ffffff'; try { T.Audio.sfx('boom'); } catch (e) { } FX.explosion(u.x, u.y, 240, '#ffe080'); I.ring(u.x, u.y, 700, '#fff6d0', 0.9); inR(u.x, u.y, 700, function (e) { hit(e, b * 8 + e.max * (e.boss ? 0.01 : 0.1), 1); }); I.heal(H.max * 0.3); }
    } else if (fx === 'nuke') {
      if (t < 1.7) inR(u.x, u.y, 480, function (e, d) { if (e.boss) return; var s = (1 - d / 480) * 130 * dt * (0.3 + t); e.x += (u.x - e.x) / (d || 1) * s; e.y += (u.y - e.y) / (d || 1) * s; });
      if (!u.det && t >= 1.9) { u.det = 1; I.shake(16); G.flash = 1.1; G.flashCol = '#fff0ff'; G.hitstop = 0.15; try { T.Audio.sfx('boom'); setTimeout(function () { T.Audio.sfx('boss'); }, 140); } catch (e) { }
        FX.explosion(u.x, u.y, 260, '#c86eff'); FX.sparks(u.x, u.y, q.part > 200 ? 100 : 40, '#ffe8ff', 520); FX.decal(u.x, u.y, 200, 'rgba(120,40,200,0.4)', 10); u.dw = 0; }
      if (u.det) { u.dw += 1300 * dt; inR(u.x, u.y, u.dw, function (e) { if (e.nk === u.seed) return; e.nk = u.seed; hit(e, b * 40 + e.max * (e.boss ? 0.07 : 0.6), 3.5); I.knock(e, { x: u.x, y: u.y }, 280); if (u.hits++ < 30) FX.explosion(e.x, e.y, 30, '#d8a0ff'); }); }
    }
    if (t >= u.done) u.off = 1;
  }

  U.update = function (dt) { for (var i = U.list.length - 1; i >= 0; i--) { upd(U.list[i], dt); if (U.list[i].off) U.list.splice(i, 1); } };

  /* ---------- desenho (modo 'lighter'; transformação do mundo) ---------- */
  function drawU(c, u, t) {
    var A = u.A, C1 = A.c, C2 = A.c2, tt = u.t, fx = u.fx, i, hi = u.q.light > 0;
    if (fx === 'roots') {
      var n = hi ? 16 : 9;
      for (var s = 0; s < 3; s++) if (tt >= u.stomps[s]) {
        var v = Math.min(1, (tt - u.stomps[s]) / 0.5), fd = Math.max(0, 1 - (tt - u.stomps[s]) / 1.6), rr = u.R[s] * v;
        c.strokeStyle = rg(C2, 0.8 * fd); c.lineWidth = 5 * (1 - v) + 1.5; c.beginPath(); c.ellipse(u.x, u.y, rr, rr * 0.75, 0, 0, TAU); c.stroke();
        for (i = 0; i < n; i++) { var a = i * TAU / n + s * 0.3 + Math.sin(i * 7 + u.seed) * 0.12, len = rr * (0.55 + 0.45 * ((i * 37 % 10) / 10)); c.strokeStyle = rg(C1, 0.9 * fd); c.lineWidth = 3.2; c.beginPath(); c.moveTo(u.x, u.y); var px = u.x, py = u.y; for (var k = 1; k <= 6; k++) { var f = k / 6; px = u.x + Math.cos(a + Math.sin(k * 2 + i) * 0.12) * len * f; py = u.y + Math.sin(a + Math.sin(k * 2 + i) * 0.12) * len * f * 0.75; c.lineTo(px, py); } c.stroke(); c.strokeStyle = rg(C2, 0.6 * fd); c.lineWidth = 1; c.stroke(); }
      }
    } else if (fx === 'blizzard') {
      for (i = 0; i < u.cr.length; i++) { var cr = u.cr[i], f2 = (tt - cr.at) / 0.38; if (f2 < 0 || tt > cr.at + 1.6) continue; var y2 = f2 < 1 ? cr.y - (1 - f2) * 520 : cr.y, al = f2 < 1 ? 1 : Math.max(0, 1 - (f2 - 1) * 1.2), sz = 26 * cr.s;
        if (f2 < 1) { var gg = c.createLinearGradient(0, y2 - 120, 0, y2); gg.addColorStop(0, rg(C1, 0)); gg.addColorStop(1, rg(C2, 0.6)); c.fillStyle = gg; c.fillRect(cr.x - 6, y2 - 120, 12, 120); }
        c.fillStyle = rg(C2, 0.9 * al); c.beginPath(); c.moveTo(cr.x, y2 - sz * 1.6); c.lineTo(cr.x + sz * 0.5, y2 - sz * 0.2); c.lineTo(cr.x, y2 + sz * 0.3); c.lineTo(cr.x - sz * 0.5, y2 - sz * 0.2); c.closePath(); c.fill(); c.strokeStyle = rg(C1, al); c.lineWidth = 2; c.stroke();
        if (f2 >= 1) { var r3 = 20 + (f2 - 1) * 70; c.strokeStyle = rg(C2, 0.7 * al); c.lineWidth = 3; c.beginPath(); c.ellipse(cr.x, cr.y, r3, r3 * 0.6, 0, 0, TAU); c.stroke(); } }
    } else if (fx === 'serpent') {
      for (i = 0; i < u.trail.length; i++) { var tr = u.trail[i], fa = Math.max(0, 1 - tr.t / 1.4), gl = c.createRadialGradient(tr.x, tr.y, 0, tr.x, tr.y, 38); gl.addColorStop(0, rg(C2, 0.7 * fa)); gl.addColorStop(0.5, rg(C1, 0.35 * fa)); gl.addColorStop(1, rg(C1, 0)); c.fillStyle = gl; c.fillRect(tr.x - 38, tr.y - 38, 76, 76); }
      for (i = u.body.length - 1; i >= 0; i--) { var bp = u.body[i], k2 = 1 - i / 26, r4 = 8 + 22 * k2 * (i === 0 ? 1.1 : 1), wob = Math.sin(tt * 14 - i * 0.7) * 5 * k2; var gb = c.createRadialGradient(bp.x, bp.y + wob, 0, bp.x, bp.y + wob, r4 * 1.6); gb.addColorStop(0, rg(C2, 0.95)); gb.addColorStop(0.45, rg(C1, 0.75)); gb.addColorStop(1, 'rgba(255,60,0,0)'); c.fillStyle = gb; c.beginPath(); c.arc(bp.x, bp.y + wob, r4 * 1.6, 0, TAU); c.fill(); }
      if (u.body.length) { var hd = u.body[0]; c.fillStyle = '#fff'; c.beginPath(); c.arc(hd.x + Math.cos(u.ang2 + 0.6) * 10, hd.y + Math.sin(u.ang2 + 0.6) * 10, 3.2, 0, TAU); c.arc(hd.x + Math.cos(u.ang2 - 0.6) * 10, hd.y + Math.sin(u.ang2 - 0.6) * 10, 3.2, 0, TAU); c.fill(); }
    } else if (fx === 'abyss') {
      var v2 = Math.min(1, tt / 0.9), fd2 = tt < 2.2 ? 1 : Math.max(0, 1 - (tt - 2.2)), R2 = (60 + 200 * v2) * (u.exec ? 1 + (tt - 1.3) * 0.25 : 1);
      c.globalCompositeOperation = 'source-over'; c.save(); c.translate(u.x, u.y); c.scale(1, 0.62);
      var gv = c.createRadialGradient(0, 0, 0, 0, 0, R2); gv.addColorStop(0, 'rgba(0,0,0,' + 0.95 * fd2 + ')'); gv.addColorStop(0.7, 'rgba(20,6,40,' + 0.85 * fd2 + ')'); gv.addColorStop(1, 'rgba(60,20,120,0)'); c.fillStyle = gv; c.beginPath(); c.arc(0, 0, R2, 0, TAU); c.fill(); c.restore();
      c.globalCompositeOperation = 'lighter'; c.strokeStyle = rg(C1, 0.8 * fd2); c.lineWidth = 3; for (i = 0; i < 3; i++) { c.beginPath(); c.ellipse(u.x, u.y, R2 * (0.5 + i * 0.25), R2 * (0.5 + i * 0.25) * 0.62, tt * (1 + i * 0.4), 0, TAU * 0.72); c.stroke(); }
      var nt = hi ? 7 : 4; for (i = 0; i < nt; i++) { var a3 = i * TAU / nt + tt * 0.6, h = Math.max(0, Math.min(1, (tt - 0.7) / 0.5)) * (tt > 2.4 ? Math.max(0, 1 - (tt - 2.4) * 1.3) : 1), L = 260 * h; if (h <= 0) continue; c.strokeStyle = rg(C2, 0.85 * h); c.lineWidth = 7 * h + 1; c.beginPath(); c.moveTo(u.x, u.y); for (var k3 = 1; k3 <= 10; k3++) { var f3 = k3 / 10; c.lineTo(u.x + Math.cos(a3 + Math.sin(tt * 5 + k3 * 0.7 + i) * 0.4) * L * f3, u.y + Math.sin(a3 + Math.sin(tt * 5 + k3 * 0.7 + i) * 0.4) * L * f3 * 0.62 - Math.sin(f3 * 3.14) * 40 * h); } c.stroke(); }
    } else if (fx === 'judgment') {
      var vs = Math.min(1, tt / 0.9), fs = tt < 2.4 ? 1 : Math.max(0, 1 - (tt - 2.4) * 1.2), rs = 380 * vs;
      c.save(); c.translate(u.x, u.y); c.scale(1, 0.6); c.strokeStyle = rg(C1, 0.85 * fs); c.lineWidth = 4; c.beginPath(); c.arc(0, 0, rs, 0, TAU); c.stroke(); c.beginPath(); c.arc(0, 0, rs * 0.82, 0, TAU); c.stroke();
      c.rotate(tt * 0.5); c.strokeStyle = rg(C2, 0.9 * fs); c.lineWidth = 3; for (var pj = 0; pj < 2; pj++) { c.beginPath(); for (i = 0; i < 3; i++) { var an = i * TAU / 3 + pj * Math.PI / 3 - Math.PI / 2; c.lineTo(Math.cos(an) * rs * 0.82, Math.sin(an) * rs * 0.82); } c.closePath(); c.stroke(); }
      c.fillStyle = rg(C1, 0.12 * fs); c.beginPath(); c.arc(0, 0, rs, 0, TAU); c.fill(); c.restore();
      for (i = 0; i < u.col.length; i++) { var cl = u.col[i]; if (tt < cl.at - 0.5) continue; var wv = cl.hit ? Math.max(0, 1 - (tt - cl.at) / 1.0) : Math.min(1, (tt - (cl.at - 0.5)) / 0.5) * 0.3; if (wv <= 0) continue; var cw = cl.hit ? 54 * wv + 8 : 20; var gc = c.createLinearGradient(0, cl.y - 520, 0, cl.y); gc.addColorStop(0, rg(C2, 0)); gc.addColorStop(0.7, rg(C1, 0.6 * wv)); gc.addColorStop(1, rg(C2, 0.95 * wv)); c.fillStyle = gc; c.fillRect(cl.x - cw / 2, cl.y - 520, cw, 520); c.fillStyle = rg(C2, 0.8 * wv); c.fillRect(cl.x - cw * 0.14, cl.y - 520, cw * 0.28, 520); }
      if (u.fin) { var vf = (tt - 2.3) / 0.7, rf = 700 * Math.min(1, vf), af = Math.max(0, 1 - vf); c.strokeStyle = rg(C2, 0.9 * af); c.lineWidth = 8 * af + 1; c.beginPath(); c.ellipse(u.x, u.y, rf, rf * 0.7, 0, 0, TAU); c.stroke(); }
    } else if (fx === 'nuke') {
      if (!u.det) { var ur = Math.min(1, tt / 1.7), cr2 = 90 * (1 - ur * 0.82) + Math.sin(tt * 20) * 2 * ur; for (i = 0; i < (hi ? 14 : 7); i++) { var an2 = i * TAU / (hi ? 14 : 7) + tt * 3, dd = 260 * (1 - ur) + 20; c.fillStyle = rg(C2, 0.5 * ur); c.beginPath(); c.arc(u.x + Math.cos(an2) * dd, u.y - 40 + Math.sin(an2) * dd * 0.6, 4, 0, TAU); c.fill(); }
        var gn = c.createRadialGradient(u.x, u.y - 40, 0, u.x, u.y - 40, cr2 * 2); gn.addColorStop(0, rg([255, 255, 255], 1)); gn.addColorStop(0.3, rg(C2, 0.9)); gn.addColorStop(0.7, rg(C1, 0.4)); gn.addColorStop(1, rg(C1, 0)); c.fillStyle = gn; c.beginPath(); c.arc(u.x, u.y - 40, cr2 * 2, 0, TAU); c.fill(); }
      else { var dv = u.dw / 1300, al2 = Math.max(0, 1 - tt / 3.4 + (1.9 / 3.4) * 0 - (tt - 1.9) * 0.3); c.save(); c.translate(u.x, u.y); c.scale(1, 0.74); var gx = c.createRadialGradient(0, 0, Math.max(0, u.dw - 200), 0, 0, u.dw + 10); gx.addColorStop(0, rg(C1, 0)); gx.addColorStop(0.7, rg(C1, 0.4 * al2)); gx.addColorStop(0.95, rg(C2, 0.95 * al2)); gx.addColorStop(1, rg(C1, 0)); c.fillStyle = gx; c.beginPath(); c.arc(0, 0, u.dw + 10, 0, TAU); c.fill(); c.restore();
        var gm = c.createRadialGradient(u.x, u.y - 30, 0, u.x, u.y - 30, 200 * Math.max(0, 1 - dv * 1.4) + 1); gm.addColorStop(0, rg([255, 255, 255], 0.95 * al2)); gm.addColorStop(1, rg(C1, 0)); c.fillStyle = gm; c.beginPath(); c.arc(u.x, u.y - 30, 200, 0, TAU); c.fill(); }
    }
  }
  var od = X.draw;
  X.draw = function (c, S, cx0, cy0, cw, ch, q) {
    od(c, S, cx0, cy0, cw, ch, q);
    if (!U.list.length) return;
    c.setTransform(S, 0, 0, S, -cx0 * S, -cy0 * S); c.globalCompositeOperation = 'lighter';
    for (var i = 0; i < U.list.length; i++) drawU(c, U.list[i], G.t);
    c.globalCompositeOperation = 'source-over'; c.setTransform(1, 0, 0, 1, 0, 0);
  };
  (function () { var s = T.Sim.step; T.Sim.step = function (dt) { s(dt); U.update(dt); }; })();
  /* limpar ao iniciar nova partida */
  (function () { var st = T.Run.start; T.Run.start = function () { U.list.length = 0; return st.apply(this, arguments); }; })();
})(window.TD);

'use strict';
/* NOCTARIA — renderizador em camadas (Canvas 2D):
   1 fundo distante (parallax) · 2 borda/ambiente · 3 terreno (cache) · 4 decoração · 5 torres · 6 personagens ·
   7 inimigos · 8 projéteis · 9 efeitos · 10 iluminação (máscara + brilho) · 11 névoa/clima/vinheta. A HUD é HTML/CSS. */
(function (T) {
  var Art = T.Art, A = T.Anim, FX = T.FX, G = T.G, TAU = T.TAU, clamp = T.clamp, pools = T.pools;
  var Rd = T.Render = { cssW: 640, cssH: 360, cw: 640, ch: 360, S: 1, zoom: 1 };
  var cv, ctx, lc, lctx, ld = 2, far = null, terr = null, TS = 0.46, TM = 150, vigC = null, shadowC = null, curMap = null, pick = {}, wx = [], tmpAn = { s: 'idle', t: 0 };
  var items = [], ni = 0, weather = [], fogT = 0, T0 = 0;
  function mk(w, h) { var c = document.createElement('canvas'); c.width = Math.max(2, w | 0); c.height = Math.max(2, h | 0); return c; }
  function rg(c, x, y, r0, r1, a, b) { var g = c.createRadialGradient(x, y, r0, x, y, r1); g.addColorStop(0, a); g.addColorStop(1, b); return g; }
  function rnd32(seed) { return I().rng32(seed); }
  function I() { return T.int; }

  Rd.init = function (canvas) { cv = canvas; ctx = cv.getContext('2d', { alpha: false }); Rd.cv = cv; };
  Rd.resize = function () {
    var q = T.Q(), W = window.innerWidth, H = window.innerHeight, dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    Rd.cssW = W; Rd.cssH = H; Rd.zoom = clamp(Math.min(W, H) / 470, 0.78, 1.5);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    cv.width = Math.max(2, Math.round(W * dpr * q.scale)); cv.height = Math.max(2, Math.round(H * dpr * q.scale));
    Rd.cw = cv.width; Rd.ch = cv.height; T.view.w = W / Rd.zoom; T.view.h = H / Rd.zoom; Rd.S = Rd.cw / T.view.w;
    ld = q.light >= 2 ? 2 : 3; lc = q.light > 0 ? mk(Rd.cw / ld, Rd.ch / ld) : null; lctx = lc ? lc.getContext('2d') : null; Rd.hasLight = !!lc; Rd.lightRes = lc ? lc.width : 0;
    vigC = mk(128, 72); var v = vigC.getContext('2d'); v.fillStyle = rg(v, 64, 36, 30, 84, 'rgba(0,0,0,0)', 'rgba(0,0,0,0.7)'); v.fillRect(0, 0, 128, 72);
    if (!shadowC) { shadowC = mk(64, 32); var s = shadowC.getContext('2d'); s.save(); s.scale(1, 0.5); s.fillStyle = rg(s, 32, 32, 0, 30, 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0)'); s.fillRect(0, 0, 64, 64); s.restore(); }
    var wn = q.weather; weather.length = 0; for (var i = 0; i < wn; i++) weather.push({ x: Math.random(), y: Math.random(), s: Math.random(), p: Math.random() * 6 });
    if (curMap) { terr = null; }
    ctx.imageSmoothingEnabled = true;
  };
  Rd.screenToWorld = function (px, py) { var c = G.cam; wx[0] = c.x - T.view.w / 2 + px / Rd.cssW * T.view.w; wx[1] = c.y - T.view.h / 2 + py / Rd.cssH * T.view.h; return wx; };

  /* ---------- Pré-renderizações ---------- */
  function pickSprites() {
    if (pick.xp) return;
    function mkp(w, h, f) { var c = mk(w, h), x = c.getContext('2d'); f(x); return c; }
    pick.xp = mkp(20, 20, function (x) { x.fillStyle = rg(x, 10, 10, 0, 10, 'rgba(120,255,230,0.55)', 'rgba(0,0,0,0)'); x.fillRect(0, 0, 20, 20); x.beginPath(); x.moveTo(10, 3); x.lineTo(15, 10); x.lineTo(10, 17); x.lineTo(5, 10); x.closePath(); x.fillStyle = '#5fe8d0'; x.fill(); x.strokeStyle = '#0a3a34'; x.stroke(); x.beginPath(); x.moveTo(10, 3); x.lineTo(15, 10); x.lineTo(10, 10); x.closePath(); x.fillStyle = '#c8fff4'; x.fill(); });
    pick.coin = mkp(16, 16, function (x) { x.beginPath(); x.arc(8, 8, 5.5, 0, TAU); x.fillStyle = '#e8b830'; x.fill(); x.strokeStyle = '#6a4a08'; x.lineWidth = 1.2; x.stroke(); x.beginPath(); x.arc(8, 8, 3, 0, TAU); x.strokeStyle = '#a07818'; x.stroke(); x.fillStyle = 'rgba(255,255,255,0.7)'; x.fillRect(5, 4, 2, 2); });
    pick.potion = mkp(18, 22, function (x) { x.fillStyle = rg(x, 9, 13, 0, 11, 'rgba(255,80,110,0.4)', 'rgba(0,0,0,0)'); x.fillRect(0, 0, 18, 22); x.beginPath(); x.moveTo(7, 3); x.lineTo(11, 3); x.lineTo(11, 8); x.lineTo(15, 16); x.quadraticCurveTo(9, 21, 3, 16); x.lineTo(7, 8); x.closePath(); x.fillStyle = '#c42848'; x.fill(); x.strokeStyle = '#2a0810'; x.stroke(); x.fillStyle = '#6a4a2a'; x.fillRect(6.5, 1, 5, 3); x.fillStyle = 'rgba(255,255,255,0.5)'; x.fillRect(6, 12, 2, 4); });
    pick.frag = mkp(18, 20, function (x) { x.fillStyle = rg(x, 9, 10, 0, 10, 'rgba(176,108,255,0.55)', 'rgba(0,0,0,0)'); x.fillRect(0, 0, 18, 20); x.beginPath(); x.moveTo(9, 2); x.lineTo(13, 9); x.lineTo(10, 18); x.lineTo(6, 10); x.closePath(); x.fillStyle = '#9a58e8'; x.fill(); x.strokeStyle = '#2a1050'; x.stroke(); x.fillStyle = 'rgba(255,255,255,0.45)'; x.fillRect(8, 4, 1.6, 6); });
    [0, 1, 2, 3, 4, 5].forEach(function (r) { pick['chest' + r] = mkp(30, 28, function (x) { var col = T.RAR[r].c; x.fillStyle = rg(x, 15, 16, 0, 15, col + '99', 'rgba(0,0,0,0)'); x.fillRect(0, 0, 30, 28); x.fillStyle = '#5a3a1e'; x.fillRect(6, 11, 18, 11); x.fillStyle = '#7a5230'; x.beginPath(); x.moveTo(6, 11); x.quadraticCurveTo(15, 3, 24, 11); x.closePath(); x.fill(); x.strokeStyle = '#1a0c04'; x.strokeRect(6, 11, 18, 11); x.fillStyle = col; x.fillRect(5, 14, 20, 2); x.fillRect(13, 12, 4, 6); }); });
  }
  function far_(map) {
    var M = T.MAPS[map], c = mk(512, 288), x = c.getContext('2d'), s = (map.length * 977) >>> 0;
    function r() { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }
    var g = x.createLinearGradient(0, 0, 0, 288); g.addColorStop(0, Art.shade(M.g[0], -0.7)); g.addColorStop(0.6, Art.shade(M.g[1], -0.35)); g.addColorStop(1, Art.shade(M.tint, -0.7)); x.fillStyle = g; x.fillRect(0, 0, 512, 288);
    if (M.deco === 'void' || M.deco === 'ruin' || M.deco === 'grave' || M.deco === 'ice') for (var i = 0; i < 70; i++) { x.fillStyle = 'rgba(255,255,255,' + (0.1 + r() * 0.5) + ')'; x.fillRect(r() * 512, r() * 150, 1.2, 1.2); }
    var mx = 380, my = 70; x.fillStyle = rg(x, mx, my, 0, 90, M.deco === 'lava' ? 'rgba(255,90,40,0.45)' : 'rgba(200,210,255,0.28)', 'rgba(0,0,0,0)'); x.fillRect(mx - 90, my - 90, 180, 180);
    x.beginPath(); x.arc(mx, my, 17, 0, TAU); x.fillStyle = M.deco === 'lava' ? '#e8603a' : '#dfe6f4'; x.fill(); x.fillStyle = 'rgba(0,0,0,0.18)'; x.beginPath(); x.arc(mx - 5, my - 3, 5, 0, TAU); x.fill();
    var cols = [Art.shade(M.g[0], -0.55), Art.shade(M.g[0], -0.7), Art.shade(M.g[0], -0.85)];
    for (var L = 0; L < 3; L++) {
      var base = 150 + L * 40, amp = 40 - L * 8; x.beginPath(); x.moveTo(0, 288);
      for (i = 0; i <= 64; i++) { var X = i * 8, Y = base - Math.abs(Math.sin(i * 0.37 + L * 2)) * amp - Math.sin(i * 0.9 + L) * amp * 0.35; x.lineTo(X, Y); } x.lineTo(512, 288); x.closePath(); x.fillStyle = cols[L]; x.fill();
      if (L === 0) {
        x.fillStyle = Art.shade(M.g[0], -0.8); var cx0 = 90 + r() * 80;
        x.fillRect(cx0, base - 60, 14, 62); x.fillRect(cx0 + 22, base - 80, 12, 82); x.fillRect(cx0 + 44, base - 52, 16, 54); x.fillRect(cx0 + 10, base - 36, 40, 40);
        [[cx0, base - 60, 14], [cx0 + 22, base - 80, 12], [cx0 + 44, base - 52, 16]].forEach(function (t) { x.beginPath(); x.moveTo(t[0] - 2, t[1]); x.lineTo(t[0] + t[2] / 2, t[1] - 22); x.lineTo(t[0] + t[2] + 2, t[1]); x.closePath(); x.fill(); });
        x.fillStyle = 'rgba(255,190,90,0.7)'; x.fillRect(cx0 + 5, base - 40, 2, 4); x.fillRect(cx0 + 26, base - 60, 2, 4); x.fillRect(cx0 + 48, base - 34, 2, 4);
      }
    }
    return c;
  }
  function bake(mapId) {
    var M = T.MAPS[mapId], q = T.qIdx(); TS = [0.34, 0.46, 0.58][q]; var Wd = T.W + 2 * TM, c = mk(Wd * TS, Wd * TS), x = c.getContext('2d'), s = (mapId.length * 313) >>> 0;
    function r() { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }
    x.scale(TS, TS); x.translate(TM, TM);
    x.fillStyle = x.createPattern(Art.ground(mapId), 'repeat'); x.fillRect(-TM, -TM, Wd, Wd);
    x.globalCompositeOperation = 'screen'; x.fillStyle = 'rgb(40,40,46)'; x.fillRect(-TM, -TM, Wd, Wd); x.fillStyle = M.tint + '1c'; x.fillRect(-TM, -TM, Wd, Wd); x.globalCompositeOperation = 'source-over';
    // manchas de cor do ambiente
    for (var i = 0; i < 40; i++) { var X = r() * T.W, Y = r() * T.W, R = 60 + r() * 120; x.fillStyle = rg(x, X, Y, 0, R, r() < 0.5 ? 'rgba(0,0,0,0.22)' : M.tint + '14', 'rgba(0,0,0,0)'); x.fillRect(X - R, Y - R, R * 2, R * 2); }
    // estradas
    var cx = T.W / 2, cy = T.W / 2, road = Art.shade(M.g[1], 0.14);
    G.portals.forEach(function (p) {
      var mx = (p.x + cx) / 2 + (p.y - cy) * 0.12, my = (p.y + cy) / 2 - (p.x - cx) * 0.12;
      [[56, 'rgba(0,0,0,0.3)'], [44, road], [38, Art.shade(road, -0.1)]].forEach(function (w) { x.beginPath(); x.moveTo(p.x, p.y); x.quadraticCurveTo(mx, my, cx, cy); x.strokeStyle = w[1]; x.lineWidth = w[0]; x.lineCap = 'round'; x.stroke(); });
      x.strokeStyle = 'rgba(0,0,0,0.25)'; x.lineWidth = 2; x.setLineDash([6, 14]); x.beginPath(); x.moveTo(p.x, p.y); x.quadraticCurveTo(mx, my, cx, cy); x.stroke(); x.setLineDash([]);
      x.fillStyle = rg(x, p.x, p.y, 0, 110, M.tint + '40', 'rgba(0,0,0,0)'); x.fillRect(p.x - 110, p.y - 110, 220, 220);
    });
    // praça da fortaleza
    x.fillStyle = rg(x, cx, cy, 20, 170, Art.shade(M.g[1], 0.22), Art.shade(M.g[1], 0.05)); x.beginPath(); x.arc(cx, cy, 170, 0, TAU); x.fill(); x.strokeStyle = 'rgba(0,0,0,0.4)'; x.lineWidth = 3; x.stroke();
    x.strokeStyle = 'rgba(0,0,0,0.22)'; x.lineWidth = 1.2; for (i = 1; i <= 4; i++) { x.beginPath(); x.arc(cx, cy, i * 38, 0, TAU); x.stroke(); } for (i = 0; i < 20; i++) { var a = i * TAU / 20; x.beginPath(); x.moveTo(cx + Math.cos(a) * 38, cy + Math.sin(a) * 38); x.lineTo(cx + Math.cos(a) * 170, cy + Math.sin(a) * 170); x.stroke(); }
    x.strokeStyle = M.tint + '88'; x.lineWidth = 2; x.beginPath(); x.arc(cx, cy, 128, 0, TAU); x.stroke(); x.lineWidth = 1; x.beginPath(); x.arc(cx, cy, 120, 0, TAU); x.stroke();
    for (i = 0; i < 12; i++) { var b = i * TAU / 12, px = cx + Math.cos(b) * 124, py = cy + Math.sin(b) * 124; x.fillStyle = M.tint + 'aa'; x.save(); x.translate(px, py); x.rotate(b); x.fillRect(-4, -1, 8, 2); x.fillRect(-1, -4, 2, 8); x.restore(); }
    // decoração baked (pequena e média)
    G.deco.forEach(function (d) { if (d.t === 'big') return; var sp = Art.deco(mapId, d.t, d.v), w = sp.width * d.s, h = sp.height * d.s; x.drawImage(sp, d.x - w / 2, d.y - h + 4 * d.s, w, h); });
    // moldura de árvores/ruínas ao redor
    for (i = 0; i < 150; i++) { var side = i % 4, t0 = r() * (T.W + 200) - 100, dd = -r() * 90 - 5, bx2 = side === 0 ? t0 : side === 1 ? t0 : side === 2 ? dd : T.W - dd, by2 = side === 0 ? dd : side === 1 ? T.W - dd : t0; var sp2 = Art.deco(mapId, 'big', Math.floor(r() * 3)), sc = 1 + r() * 0.5; x.drawImage(sp2, bx2 - sp2.width * sc / 2, by2 - sp2.height * sc + 6, sp2.width * sc, sp2.height * sc); }
    var E = 190; [[0, 0, T.W, E, 0, 0, 0, E], [0, T.W - E, T.W, E, 0, T.W, 0, T.W - E], [0, 0, E, T.W, 0, 0, E, 0], [T.W - E, 0, E, T.W, T.W, 0, T.W - E, 0]].forEach(function (e) { var g = x.createLinearGradient(e[4], e[5], e[6], e[7]); g.addColorStop(0, 'rgba(2,2,6,0.82)'); g.addColorStop(1, 'rgba(2,2,6,0)'); x.fillStyle = g; x.fillRect(e[0], e[1], e[2], e[3]); });
    terr = c; far = far_(mapId);
  }
  Rd.mapChanged = function () { curMap = G.mapId; pickSprites(); terr = null; fogT = 0; Rd.resize(); bake(curMap); };

  /* ---------- Desenho ---------- */
  var cx0, cy0, vw, vh, SC;
  function inV(x, y, m) { return x > cx0 - m && x < cx0 + vw + m && y > cy0 - m && y < cy0 + vh + m; }
  function add(y, t, o) { var it = items[ni]; if (!it) it = items[ni] = { y: 0, t: 0, o: null }; it.y = y; it.t = t; it.o = o; ni++; }
  function glow(c, col, x, y, r, a) { c.globalAlpha = a; c.drawImage(Art.glowSprite(col), x - r, y - r, r * 2, r * 2); }
  function shadow(x, y, w) { ctx.drawImage(shadowC, x - w / 2, y - w * 0.22, w, w * 0.5); }
  function heroHue() { var sk = T.SKINS[T.Save.d.skin]; return sk ? sk.hue : 0; }

  function drawEnemy(e) {
    var q = T.Q(), df = e.def, ds = clamp(e.r * 5, 40, 240), size = ds > 90 ? 128 : 64, sc = ds / size, face = e.face || 1, hue = 0;
    shadow(e.x, e.y + 2, ds * 0.7);
    var inv = e.invisT > 0; if (inv) ctx.globalAlpha = 0.28;
    if (e.freezeT > 0) tmpAn.s = 'idle'; else if (e.atkAnim < 0.24) { tmpAn.s = 'attack'; tmpAn.t = e.atkAnim; } else if (e.vx * e.vx + e.vy * e.vy > 25 && e.stunT <= 0) { tmpAn.s = 'walk'; tmpAn.t = e.anim * (e.spd / 60); } else { tmpAn.s = 'idle'; tmpAn.t = e.anim; }
    if (e.elite) { var ec = e.aura === 'swift' ? '#6fd0ff' : e.aura === 'armored' ? '#c0c0d0' : e.aura === 'summon' ? '#b06cff' : '#ff6a3a'; ctx.globalAlpha = 0.5 + Math.sin(G.t * 5) * 0.15; ctx.drawImage(Art.glowSprite(ec), e.x - ds * 0.55, e.y - ds * 0.5, ds * 1.1, ds * 0.9); ctx.globalAlpha = inv ? 0.28 : 1; }
    if (e.boss) { ctx.globalAlpha = 0.45 + Math.sin(G.t * 3) * 0.1; ctx.drawImage(Art.glowSprite(df.col), e.x - ds * 0.6, e.y - ds * 0.75, ds * 1.2, ds * 1.1); ctx.globalAlpha = 1; }
    var lx = 0; if (e.charge > 0) lx = 0;
    var p = A.draw(ctx, e.kind, size, hue, e.x, e.y + 4, sc, tmpAn, face, e.flash > 0 ? 0.9 : 0, null);
    ctx.globalAlpha = 1;
    if (e.freezeT > 0) { ctx.globalAlpha = 0.45; ctx.fillStyle = '#bfeaff'; ctx.beginPath(); ctx.ellipse(e.x, e.y - ds * 0.3, ds * 0.28, ds * 0.4, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
    if (e.shieldHp > 0) { ctx.strokeStyle = 'rgba(140,210,255,0.7)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(e.x, e.y - ds * 0.3, ds * 0.34, ds * 0.46, 0, 0, TAU); ctx.stroke(); }
    if (e.stunT > 0) { ctx.fillStyle = '#ffe070'; for (var i = 0; i < 3; i++) { var a = G.t * 6 + i * 2.1; ctx.fillRect(e.x + Math.cos(a) * 9 - 1, e.y - ds * 0.8 + Math.sin(a) * 3, 2.4, 2.4); } }
    if (e.hp < e.max && !e.boss) { var bw = Math.max(18, ds * 0.5), by = e.y - ds * 0.88; ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(e.x - bw / 2 - 1, by - 1, bw + 2, 4); ctx.fillStyle = e.elite ? '#ff9a3a' : '#d24a4a'; ctx.fillRect(e.x - bw / 2, by, bw * Math.max(0, e.hp / e.max), 2); }
  }
  function drawHero() {
    var H = G.hero, id = G.clsId, kind = 'hero_' + id, size = T.Q().light > 0 ? 96 : 64, sc = 58 / size, hue = heroHue();
    shadow(H.x, H.y + 3, 40);
    var C = G.cls;
    if (G.state === 'over' && !G.win) { A.draw(ctx, kind, size, hue, H.x, H.y + 6, sc, H.an, H.face, 0, null); return; }
    ctx.globalAlpha = 0.5; ctx.drawImage(Art.glowSprite(C.col), H.x - 30, H.y - 44, 60, 52); ctx.globalAlpha = 1;
    if (H.busy > 0) ctx.globalAlpha = 0.5;
    A.draw(ctx, kind, size, hue, H.x, H.y + 6, sc, H.an, H.face, (H.hurt > 0 ? 0.8 : 0) + (H.inv > 1 ? 0.2 : 0), null); ctx.globalAlpha = 1;
    if (H.shield > 0) { ctx.strokeStyle = 'rgba(127,208,255,' + (0.45 + 0.2 * Math.sin(G.t * 6)) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(H.x, H.y - 18, 20, 26, 0, 0, TAU); ctx.stroke(); }
    var P = G.P; if (P.orbs > 0) for (var k = 0; k < P.orbs; k++) { var oa = H.orbA + k * TAU / P.orbs, rad = 54 * Math.min(1.6, P.area), ox = H.x + Math.cos(oa) * rad, oy = H.y - 8 + Math.sin(oa) * rad * 0.7; ctx.globalCompositeOperation = 'lighter'; glow(ctx, '#c08aff', ox, oy, 12, 0.9); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.fillStyle = '#efe0ff'; ctx.beginPath(); ctx.arc(ox, oy, 3.4, 0, TAU); ctx.fill(); }
  }
  function drawAlly(a) {
    var sp = a.kind === 'spirit', kind = sp ? 'spirit' : 'skel', sz = 64, ds = sp ? 38 : 40;
    shadow(a.x, a.y + 2, 24); tmpAn.s = a.hitA > 0 ? 'attack' : 'walk'; tmpAn.t = a.hitA > 0 ? 0.2 - a.hitA : a.anim; ctx.globalAlpha = sp ? 0.85 : 0.9;
    A.draw(ctx, kind, sz, 0, a.x, a.y + 3, ds / sz, tmpAn, a.face || 1, 0, null); ctx.globalAlpha = 0.45; ctx.drawImage(Art.glowSprite(sp ? '#3ae0a0' : '#4fe0a0'), a.x - 18, a.y - 30, 36, 34); ctx.globalAlpha = 1;
  }
  function drawTower(t) {
    var D = T.TW[t.type], sp = Art.sprite('tower_' + t.type + '_' + t.lv, 0, 64), k = Math.min(1, t.born), rec = t.fire > 0 ? t.fire / 0.22 : 0, w = 64 * 1.15, h = 80 * 1.15;
    shadow(t.x, t.y + 4, 48);
    ctx.save(); ctx.translate(t.x, t.y + 6); ctx.scale(k * (1 + rec * 0.04), k * (1 - rec * 0.06)); ctx.drawImage(sp, -w / 2, -h * 0.93, w, h);
    if (t.hit > 0) { ctx.globalAlpha = 0.7; ctx.drawImage(Art.whiteOf('tower_' + t.type + '_' + t.lv, 0, 64), -w / 2, -h * 0.93, w, h); ctx.globalAlpha = 1; }
    ctx.restore();
    if (rec > 0) { ctx.globalAlpha = rec * 0.8; ctx.drawImage(Art.glowSprite(D.col), t.x - 26, t.y - 58, 52, 52); ctx.globalAlpha = 1; }
    if (t.buffT > 0) { ctx.strokeStyle = 'rgba(255,233,160,0.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(t.x, t.y + 2, 24, 10, 0, 0, TAU); ctx.stroke(); }
    if (t.aura > 1.01) { ctx.fillStyle = '#e8a93a'; ctx.fillRect(t.x + 18, t.y - 62, 3, 3); }
    if (t.hp < t.max) { ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(t.x - 14, t.y - 66, 28, 4); ctx.fillStyle = '#6fd05a'; ctx.fillRect(t.x - 13, t.y - 65, 26 * t.hp / t.max, 2); }
    if (t.lv > 1) { ctx.fillStyle = '#e8c860'; for (var i = 0; i < t.lv - 1; i++) ctx.fillRect(t.x - 5 + i * 6, t.y + 9, 4, 3); }
  }
  function drawKeep() {
    var B = G.base, sp = Art.sprite('keep', 0, 128), sh = B.hit > 0 ? (Math.random() - 0.5) * 3 : 0;
    if (T.Q().part > 150 && Math.random() < 0.35) FX.flame(B.x + (Math.random() < 0.5 ? -52 : 52), B.y - 6, 1, false);
    shadow(B.x, B.y + 40, 150);
    ctx.drawImage(sp, B.x - 80 + sh, B.y - 80, 160, 160);
    if (B.hit > 0) { ctx.globalAlpha = 0.5; ctx.drawImage(Art.whiteOf('keep', 0, 128), B.x - 80 + sh, B.y - 80, 160, 160); ctx.globalAlpha = 1; }
    if (B.shield > 0) { ctx.strokeStyle = 'rgba(127,208,255,' + (0.35 + 0.15 * Math.sin(G.t * 5)) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(B.x, B.y - 14, 68, 72, 0, 0, TAU); ctx.stroke(); ctx.fillStyle = 'rgba(127,208,255,0.08)'; ctx.fill(); }
  }
  function drawPortal(p) {
    var t = G.t + p.anim; ctx.globalAlpha = 0.9; ctx.drawImage(Art.glowSprite('#8a3ae0'), p.x - 56, p.y - 60, 112, 90); ctx.globalAlpha = 1;
    ctx.strokeStyle = '#2a1050'; ctx.lineWidth = 7; ctx.beginPath(); ctx.ellipse(p.x, p.y - 12, 24, 34, 0, 0, TAU); ctx.stroke(); ctx.strokeStyle = '#a060ff'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.ellipse(p.x, p.y - 12, 24, 34, 0, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#12061e'; ctx.beginPath(); ctx.ellipse(p.x, p.y - 12, 20, 30, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(200,140,255,0.7)'; ctx.lineWidth = 1.4; for (var i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(p.x, p.y - 12, 6 + ((t * 8 + i * 6) % 18), 10 + ((t * 11 + i * 9) % 26), 0, 0, TAU); ctx.globalAlpha = 1 - (((t * 8 + i * 6) % 18) / 18); ctx.stroke(); } ctx.globalAlpha = 1;
    for (i = 0; i < 4; i++) { var a = t * 1.5 + i * 1.57; ctx.fillStyle = '#d0a0ff'; ctx.fillRect(p.x + Math.cos(a) * 28 - 1.5, p.y - 12 + Math.sin(a) * 38 - 1.5, 3, 3); }
  }
  function drawPickup(k) {
    var bob = Math.sin(G.t * 4 + k.ph) * 2.5, img = k.type === 'chest' ? pick['chest' + (k.rar || 2)] : pick[k.type]; if (!img) return;
    var al = k.life < 4 ? (Math.sin(G.t * 20) > 0 ? 1 : 0.35) : 1; ctx.globalAlpha = al;
    ctx.drawImage(img, k.x - img.width / 2, k.y - img.height / 2 + bob - 4); ctx.globalAlpha = 1;
  }
  function drawDead(d) {
    var u = d.t / d.max, ds = clamp(d.s * 12 * 5, 40, 240), size = ds > 90 ? 128 : 64; tmpAn.s = 'death'; tmpAn.t = u * 0.7;
    ctx.globalAlpha = 1 - u * 0.9; A.draw(ctx, d.kind, size, 0, d.x, d.y + 4, ds / size, tmpAn, d.face || 1, Math.max(0, 0.7 - u * 2), null); ctx.globalAlpha = 1;
  }
  function drawBigDeco(d) {
    var sp = Art.deco(curMap, 'big', d.v), w = sp.width * d.s, h = sp.height * d.s; ctx.drawImage(sp, d.x - w / 2, d.y - h + 4 * d.s, w, h);
  }
  function drawZoneGround(z) {
    var k = z.kind, a = z.hostile ? 1 : clamp(z.life / 0.6, 0, 1); ctx.save(); ctx.translate(z.x, z.y); ctx.scale(1, 0.8);
    if (k === 'tele') { var pr = 1 - z.life / Math.max(0.01, z.max); ctx.fillStyle = z.col; ctx.globalAlpha = 0.12 + pr * 0.25; ctx.beginPath(); ctx.arc(0, 0, z.r, 0, TAU); ctx.fill(); ctx.globalAlpha = 0.8; ctx.strokeStyle = z.col; ctx.lineWidth = 2; ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, z.r * pr, 0, TAU); ctx.stroke(); }
    else if (k === 'hazard') { ctx.globalAlpha = 0.4 + Math.sin(G.t * 8) * 0.1; ctx.fillStyle = rg(ctx, 0, 0, 0, z.r, 'rgba(255,120,40,0.8)', 'rgba(255,60,20,0)'); ctx.beginPath(); ctx.arc(0, 0, z.r, 0, TAU); ctx.fill(); }
    else if (k === 'wall') { ctx.globalAlpha = 0.18 * a; ctx.fillStyle = '#ff2a3a'; ctx.beginPath(); ctx.arc(0, 0, z.r, 0, TAU); ctx.fill(); ctx.globalAlpha = 0.9 * a; ctx.strokeStyle = '#ff4a5a'; ctx.lineWidth = 3; ctx.setLineDash([14, 8]); ctx.lineDashOffset = -G.t * 40; ctx.beginPath(); ctx.arc(0, 0, z.r, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.lineWidth = 1; ctx.strokeStyle = '#ffd0d0'; ctx.beginPath(); ctx.arc(0, 0, z.r * 0.93, 0, TAU); ctx.stroke(); }
    else if (k === 'rift') { ctx.globalAlpha = 0.9 * a; ctx.fillStyle = rg(ctx, 0, 0, 0, z.r, 'rgba(12,2,28,0.95)', 'rgba(120,50,220,0.25)'); ctx.beginPath(); ctx.arc(0, 0, z.r, 0, TAU); ctx.fill(); ctx.strokeStyle = '#c08aff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, z.r, 0, TAU); ctx.stroke(); ctx.rotate(G.t * 1.5); ctx.strokeStyle = 'rgba(220,180,255,0.8)'; ctx.lineWidth = 1.5; for (var i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(0, 0, z.r * (0.25 + i * 0.22), i, i + 3.2); ctx.stroke(); } }
    else if (k === 'rain') { ctx.globalAlpha = 0.14 * a; ctx.fillStyle = '#e8f0c8'; ctx.beginPath(); ctx.arc(0, 0, z.r, 0, TAU); ctx.fill(); ctx.globalAlpha = 0.6 * a; ctx.strokeStyle = '#e8f0c8'; ctx.lineWidth = 1.5; ctx.setLineDash([6, 6]); ctx.stroke(); ctx.setLineDash([]); }
    else if (k === 'poison') { ctx.globalAlpha = 0.3 * a; ctx.fillStyle = '#6fd05a'; ctx.beginPath(); ctx.arc(0, 0, z.r, 0, TAU); ctx.fill(); }
    else if (k === 'fire') { ctx.globalAlpha = 0.3 * a; ctx.fillStyle = '#ff7a2a'; ctx.beginPath(); ctx.arc(0, 0, z.r, 0, TAU); ctx.fill(); }
    ctx.restore(); ctx.globalAlpha = 1;
  }
  function drawParticles() {
    var a = pools.XP.a, q = T.Q(), add_ = q.glow >= 0, i, p;
    for (i = 0; i < a.length; i++) {
      p = a[i]; if (!p.on || !inV(p.x, p.y, 40)) continue; var u = p.life / p.max;
      switch (p.type) {
        case 0: ctx.globalAlpha = u; ctx.fillStyle = p.col; ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); break;
        case 1: ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = u; ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.5 + u * 0.5), 0, TAU); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; break;
        case 2: ctx.globalAlpha = u; ctx.fillStyle = p.col; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillRect(-p.size, -p.size * 0.35, p.size * 2, p.size * 0.7); ctx.restore(); break;
        case 3: ctx.globalAlpha = u * 0.55; ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1.6 - u * 0.8), 0, TAU); ctx.fill(); break;
        case 4: { var rr = p.size * (1 - u * u); ctx.globalAlpha = u * 0.9; ctx.strokeStyle = p.col; ctx.lineWidth = 1 + 3 * u; ctx.beginPath(); ctx.ellipse(p.x, p.y, rr, rr * 0.72, 0, 0, TAU); ctx.stroke(); break; }
        case 5: ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = u * 0.9; ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * u + 0.6, 0, TAU); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; break;
        case 6: ctx.globalAlpha = Math.min(1, u * 2) * 0.9; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.strokeStyle = p.col; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(0, -p.size); ctx.lineTo(0, p.size); ctx.moveTo(-p.size * 0.7, -p.size * 0.3); ctx.lineTo(p.size * 0.7, p.size * 0.3); ctx.moveTo(-p.size * 0.7, p.size * 0.5); ctx.lineTo(0, 0); ctx.stroke(); ctx.restore(); break;
        case 7: ctx.globalAlpha = u; ctx.strokeStyle = p.col; ctx.lineWidth = p.size; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04); ctx.stroke(); break;
        case 8: ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = u * 0.8; ctx.drawImage(Art.glowSprite(p.col), p.x - p.size * 2, p.y - p.size * 2, p.size * 4, p.size * 4); ctx.globalCompositeOperation = 'source-over'; break;
        case 9: ctx.globalAlpha = u; ctx.fillStyle = p.col; ctx.fillRect(p.x - p.size / 2, p.y - p.size / 6, p.size, p.size / 3); ctx.fillRect(p.x - p.size / 6, p.y - p.size / 2, p.size / 3, p.size); break;
        case 10: ctx.globalAlpha = Math.min(1, u * 2); ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill(); break;
      }
    }
    ctx.globalAlpha = 1;
  }
  function drawProjectiles() {
    var a = pools.PP.a, i, p;
    for (i = 0; i < a.length; i++) {
      p = a[i]; if (!p.on || !inV(p.x, p.y, 30)) continue; var ang = Math.atan2(p.vy, p.vx);
      switch (p.kind) {
        case 'arrow': ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(ang); ctx.strokeStyle = '#d8c89a'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(5, 0); ctx.stroke(); ctx.fillStyle = '#e8f0f8'; ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(3, -2.4); ctx.lineTo(3, 2.4); ctx.fill(); ctx.strokeStyle = '#8a1f2e'; ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-13, -2.5); ctx.moveTo(-10, 0); ctx.lineTo(-13, 2.5); ctx.stroke(); ctx.restore(); break;
        case 'ball': ctx.fillStyle = '#2a2a30'; ctx.beginPath(); ctx.arc(p.x, p.y, 5.5, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(p.x - 2.5, p.y - 3, 2, 2); break;
        case 'flame': ctx.globalCompositeOperation = 'lighter'; glow(ctx, '#ff7a2a', p.x, p.y, 14, 0.9); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; break;
        case 'shard': ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(ang); ctx.fillStyle = '#e8fbff'; ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-5, -3.5); ctx.lineTo(-3, 0); ctx.lineTo(-5, 3.5); ctx.closePath(); ctx.fill(); ctx.restore(); break;
        case 'glob': ctx.fillStyle = '#7be05a'; ctx.beginPath(); ctx.arc(p.x, p.y - Math.sin((1 - Math.min(1, p.life / 0.6)) * 3) * 6, 4.5, 0, TAU); ctx.fill(); break;
        default: ctx.globalCompositeOperation = 'lighter'; glow(ctx, p.col, p.x, p.y, 13, 1); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p.x, p.y, 2.6, 0, TAU); ctx.fill();
      }
    }
    a = pools.EJ.a; for (i = 0; i < a.length; i++) { p = a[i]; if (!p.on || !inV(p.x, p.y, 30)) continue; ctx.globalCompositeOperation = 'lighter'; glow(ctx, p.col, p.x, p.y, 12, 0.95); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p.x, p.y, 2.2, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
  function drawZaps() {
    var a = pools.ZP.a; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (var i = 0; i < a.length; i++) {
      var z = a[i]; if (!z.on) continue; var u = z.life / z.max, dx = z.x2 - z.x1, dy = z.y2 - z.y1, d = Math.sqrt(dx * dx + dy * dy) || 1, n = Math.max(2, Math.floor(d / 14)), nx = -dy / d, ny = dx / d;
      ctx.globalCompositeOperation = 'lighter';
      for (var pass = 0; pass < 2; pass++) { ctx.beginPath(); ctx.moveTo(z.x1, z.y1); for (var k = 1; k < n; k++) { var f = k / n, off = (Math.sin(z.seed * 13 + k * 7.3 + z.life * 40) * 6) * (pass ? 0.3 : 1); ctx.lineTo(z.x1 + dx * f + nx * off, z.y1 + dy * f + ny * off); } ctx.lineTo(z.x2, z.y2); ctx.strokeStyle = pass ? '#ffffff' : z.col; ctx.lineWidth = pass ? 1.4 : 4; ctx.globalAlpha = u * (pass ? 1 : 0.7); ctx.stroke(); }
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalAlpha = 1;
  }
  function drawSlashes() {
    var a = FX.slashes;
    for (var i = 0; i < a.length; i++) {
      var s = a[i], u = s.life / s.max;
      if (s.img) { var sp = Art.sprite(s.img, 0, 64, 0); ctx.globalAlpha = u * 0.45; ctx.save(); ctx.translate(s.x, s.y + 6); ctx.scale(s.face, 1); ctx.drawImage(sp, -29, -54, 58, 58); ctx.restore(); ctx.globalAlpha = 1; continue; }
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.a); ctx.globalCompositeOperation = 'lighter';
      for (var k = 0; k < 2; k++) { ctx.beginPath(); ctx.arc(0, 0, s.r * (1 - k * 0.08), -s.span + (1 - u) * s.span * 0.9, s.span - (1 - u) * s.span * 0.2); ctx.strokeStyle = k ? '#ffffff' : s.col; ctx.lineWidth = (k ? 0.4 : 1) * s.w * u; ctx.globalAlpha = u * (k ? 1 : 0.8); ctx.stroke(); }
      ctx.restore();
    }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  }
  function drawTexts() {
    var a = pools.TP.a, fs = 13 / Rd.zoom; ctx.textAlign = 'center'; ctx.lineJoin = 'round';
    for (var i = 0; i < a.length; i++) {
      var t = a[i]; if (!t.on || !inV(t.x, t.y, 20)) continue; var u = t.life / t.max, s = fs * (t.big ? 1.35 : 1) * (1 + (1 - u) * 0.0);
      ctx.font = 'bold ' + s + 'px Georgia,serif'; ctx.globalAlpha = Math.min(1, u * 2.2); ctx.lineWidth = s * 0.28; ctx.strokeStyle = 'rgba(8,4,12,0.9)'; ctx.strokeText(t.str, t.x, t.y); ctx.fillStyle = t.col; ctx.fillText(t.str, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- Iluminação ---------- */
  var lights = [], nl = 0;
  function L(x, y, r, col, a) { if (nl >= 46 || !inV(x, y, r)) return; var l = lights[nl]; if (!l) l = lights[nl] = {}; l.x = x; l.y = y; l.r = r; l.c = col; l.a = a == null ? 1 : a; nl++; }
  function gatherLights() {
    nl = 0; var H = G.hero, B = G.base, P = G.P, fl = 0.92 + Math.sin(G.t * 9) * 0.05 + Math.sin(G.t * 23) * 0.03;
    L(H.x, H.y - 10, 135 * P.light, G.cls.col, 1); L(B.x, B.y - 20, 210 * fl, '#ffb060', 1); L(B.x - 52, B.y + 6, 60 * fl, '#ff9a3a', 0.8); L(B.x + 52, B.y + 6, 60 * fl, '#ff9a3a', 0.8);
    G.portals.forEach(function (p) { L(p.x, p.y - 12, 95, '#a060ff', 0.8); });
    G.towers.forEach(function (t) { var D = T.TW[t.type]; L(t.x, t.y - 30, (t.type === 'fire' || t.type === 'arcane' || t.type === 'elec' ? 82 : 58) + (t.fire > 0 ? 24 : 0), D.col, t.type === 'support' ? 0.6 : 0.8); });
    var a = pools.PP.a, i; for (i = 0; i < a.length && nl < 40; i++) if (a[i].on && a[i].kind !== 'arrow' && a[i].kind !== 'ball') L(a[i].x, a[i].y, 44, a[i].col, 0.9);
    a = pools.HZ.a; for (i = 0; i < a.length; i++) if (a[i].on && a[i].kind !== 'tele') L(a[i].x, a[i].y, a[i].r * 1.4, a[i].col, 0.8);
    a = pools.EP.a; for (i = 0; i < a.length && nl < 44; i++) { var e = a[i]; if (e.on && (e.boss || e.elite)) L(e.x, e.y - 10, e.boss ? 150 : 60, e.def.col, 0.8); else if (e.on && e.burnT > 0 && Math.random() < 0.3) L(e.x, e.y - 10, 36, '#ff8a3a', 0.6); }
    a = pools.KP.a; for (i = 0; i < a.length && nl < 46; i++) if (a[i].on && (a[i].type === 'chest' || a[i].type === 'frag')) L(a[i].x, a[i].y, 36, a[i].type === 'chest' ? T.RAR[a[i].rar || 2].c : '#b06cff', 0.7);
  }
  function drawLighting() {
    var q = T.Q(), M = G.map, amb = clamp(M.dark * 0.8 + (T.Extra ? T.Extra.night * 0.16 : 0), 0.1, 0.7); gatherLights();
    if (G.timeStop > 0) amb = Math.min(0.75, amb + 0.1);
    if (lctx) {
      lctx.globalCompositeOperation = 'source-over'; lctx.globalAlpha = 1; lctx.clearRect(0, 0, lc.width, lc.height); lctx.fillStyle = 'rgba(4,3,12,' + amb + ')'; lctx.fillRect(0, 0, lc.width, lc.height);
      lctx.globalCompositeOperation = 'destination-out'; var k = SC / ld, lt = Art.light();
      for (var i = 0; i < nl; i++) { var l = lights[i]; lctx.globalAlpha = l.a; var r = l.r * k, sx = (l.x - cx0) * k, sy = (l.y - cy0) * k; lctx.drawImage(lt, sx - r, sy - r, r * 2, r * 2); }
      lctx.globalAlpha = 1; lctx.globalCompositeOperation = 'source-over';
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(lc, 0, 0, Rd.cw, Rd.ch);
      if (q.glow) { ctx.globalCompositeOperation = 'lighter'; for (i = 0; i < nl; i++) { l = lights[i]; if (l.r < 40) continue; ctx.globalAlpha = 0.22 * l.a; var rr = l.r * 0.8 * SC; ctx.drawImage(Art.glowSprite(l.c), (l.x - cx0) * SC - rr, (l.y - cy0) * SC - rr, rr * 2, rr * 2); } ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
    } else { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = 'rgba(4,3,12,' + amb * 0.45 + ')'; ctx.fillRect(0, 0, Rd.cw, Rd.ch); }
  }
  function drawWeather(dt) {
    var M = G.map, w = M.weather, n = weather.length, q = T.Q(), cw = Rd.cw, ch = Rd.ch, bl = G.blizT > 0 ? 2 : 1, ss = G.sandT > 0 ? 2 : 1; ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (q.weather === 0) return;
    if (w === 'rain') { ctx.strokeStyle = 'rgba(170,190,230,0.35)'; ctx.lineWidth = Math.max(1, cw / 700); ctx.beginPath(); for (var i = 0; i < n; i++) { var p = weather[i]; p.y += dt * (1.6 + p.s); p.x -= dt * 0.25; if (p.y > 1) { p.y = -0.05; p.x = Math.random() * 1.2; } if (p.x < 0) p.x += 1; var x = p.x * cw, y = p.y * ch; ctx.moveTo(x, y); ctx.lineTo(x - cw * 0.012, y + ch * 0.03); } ctx.stroke(); }
    else if (w === 'snow') { ctx.fillStyle = 'rgba(240,248,255,0.8)'; var sz = Math.max(1.5, cw / 380); for (i = 0; i < n * bl && i < n; i++) { p = weather[i]; p.y += dt * (0.1 + p.s * 0.12) * bl; p.x += Math.sin(G.t + p.p) * dt * 0.03 + dt * 0.02 * bl; if (p.y > 1) { p.y = -0.02; p.x = Math.random(); } if (p.x > 1) p.x = 0; ctx.fillRect(p.x * cw, p.y * ch, sz * (0.6 + p.s), sz * (0.6 + p.s)); } }
    else if (w === 'ash') { for (i = 0; i < n; i++) { p = weather[i]; p.y += dt * (0.05 + p.s * 0.07); p.x += Math.sin(G.t * 0.7 + p.p) * dt * 0.03; if (p.y > 1) { p.y = -0.02; p.x = Math.random(); } ctx.fillStyle = p.s > 0.7 ? 'rgba(255,140,60,0.8)' : 'rgba(150,140,140,0.5)'; ctx.fillRect(p.x * cw, p.y * ch, cw / 330, cw / 330); } }
    else if (w === 'dust') { ctx.fillStyle = 'rgba(230,190,120,0.3)'; for (i = 0; i < n; i++) { p = weather[i]; p.x += dt * (0.08 + p.s * 0.1) * ss; p.y += Math.sin(G.t + p.p) * dt * 0.01; if (p.x > 1.05) { p.x = -0.05; p.y = Math.random(); } ctx.fillRect(p.x * cw, p.y * ch, cw * 0.02 * (0.5 + p.s) * ss, Math.max(1, ch / 400)); } }
    else { for (i = 0; i < n; i++) { p = weather[i]; p.y -= dt * (0.02 + p.s * 0.04); p.x += Math.sin(G.t * 0.8 + p.p) * dt * 0.02; if (p.y < -0.02) { p.y = 1.02; p.x = Math.random(); } ctx.fillStyle = 'rgba(' + (M.tint === '#8a3ae0' || M.tint === '#b06cff' ? '190,130,255' : '150,255,120') + ',' + (0.35 + 0.35 * Math.sin(G.t * 2 + p.p)) + ')'; ctx.fillRect(p.x * cw, p.y * ch, cw / 300 * (1 + p.s), cw / 300 * (1 + p.s)); } }
    if (G.blizT > 0) { ctx.fillStyle = 'rgba(210,235,255,0.14)'; ctx.fillRect(0, 0, cw, ch); }
    if (G.sandT > 0) { ctx.fillStyle = 'rgba(220,170,90,0.13)'; ctx.fillRect(0, 0, cw, ch); }
  }
  function drawFog(dt) {
    var q = T.Q(); if (!q.light && q.weather < 40) return; fogT += dt; var f = Art.fog(), cw = Rd.cw, ch = Rd.ch, sz = 256 * Rd.S * 1.8;
    ctx.setTransform(1, 0, 0, 1, 0, 0); var layers = q.light >= 2 ? 2 : 1;
    for (var L2 = 0; L2 < layers; L2++) {
      ctx.globalAlpha = L2 ? 0.45 : 0.7; var ox = -((G.cam.x * Rd.S * (0.35 + L2 * 0.2) + fogT * (6 + L2 * 4) * Rd.S) % sz), oy = -((G.cam.y * Rd.S * 0.35 + fogT * (2 - L2 * 3) * Rd.S) % sz);
      for (var x = ox - sz; x < cw; x += sz) for (var y = oy - sz; y < ch; y += sz) ctx.drawImage(f, x, y, sz, sz);
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- Quadro ---------- */
  Rd.frame = function (dt) {
    if (!curMap || !terr) return;
    var cam = G.cam, q = T.Q(), stt = T.Save.d.set; var zt = (stt.zoomfx == null || stt.zoomfx) ? (cam.zt || 0) : 0; cam.zp = (cam.zp || 0) + (zt - (cam.zp || 0)) * Math.min(1, dt * 4);
    if (Math.abs((Rd._zp || 0) - cam.zp) > 0.002) { Rd._zp = cam.zp; T.view.w = Rd.cssW / (Rd.zoom * (1 + cam.zp)); T.view.h = Rd.cssH / (Rd.zoom * (1 + cam.zp)); Rd.S = Rd.cw / T.view.w; }
    var S = Rd.S; SC = S; var still = stt.still ? 1 : 0; vw = T.view.w; vh = T.view.h;
    var sx = cam.shake > 0 ? (Math.random() - 0.5) * cam.shake * 1.6 : 0, sy = cam.shake > 0 ? (Math.random() - 0.5) * cam.shake * 1.6 : 0;
    cx0 = cam.x - vw / 2 + sx; cy0 = cam.y - vh / 2 + sy;
    // 1 fundo distante com parallax
    ctx.setTransform(1, 0, 0, 1, 0, 0); var fw = Rd.cw * 1.16, fh = Rd.ch * 1.16;
    ctx.drawImage(far, -(fw - Rd.cw) / 2 - (still ? 0 : (cam.x - T.W / 2) * 0.03 * S), -(fh - Rd.ch) / 2 - (still ? 0 : (cam.y - T.W / 2) * 0.02 * S), fw, fh);
    // mundo
    ctx.setTransform(S, 0, 0, S, -cx0 * S, -cy0 * S);
    // 2/3 terreno + moldura baked
    var tx0 = clamp(cx0 + TM, 0, T.W + 2 * TM), ty0 = clamp(cy0 + TM, 0, T.W + 2 * TM), tw = Math.min(vw + 2, T.W + 2 * TM - tx0), th = Math.min(vh + 2, T.W + 2 * TM - ty0);
    var ex0 = Math.max(cx0, -TM), ey0 = Math.max(cy0, -TM); tw = Math.min(cx0 + vw, T.W + TM) - ex0; th = Math.min(cy0 + vh, T.W + TM) - ey0; tx0 = ex0 + TM; ty0 = ey0 + TM;
    if (tw > 0 && th > 0) ctx.drawImage(terr, tx0 * TS, ty0 * TS, tw * TS, th * TS, ex0, ey0, tw, th);
    // chão: marcas, zonas, alcance
    var i, a;
    if (q.light > 0 || q.part > 200) { a = FX.decals; for (i = 0; i < a.length; i++) { var d = a[i]; if (!inV(d.x, d.y, d.r)) continue; ctx.globalAlpha = Math.min(1, d.life / 2) * 0.8; ctx.fillStyle = d.col; ctx.beginPath(); ctx.ellipse(d.x, d.y, d.r, d.r * 0.6, 0, 0, TAU); ctx.fill(); } ctx.globalAlpha = 1; }
    a = pools.HZ.a; for (i = 0; i < a.length; i++) if (a[i].on) drawZoneGround(a[i]);
    var sel = G.sel && G.sel.ref;
    if (sel && G.towers.indexOf(sel) >= 0) { var st = T.Towers.stats(sel); ctx.strokeStyle = 'rgba(232,200,96,0.8)'; ctx.lineWidth = 1.5; ctx.fillStyle = 'rgba(232,200,96,0.07)'; ctx.beginPath(); ctx.ellipse(sel.x, sel.y, st.rng, st.rng * 0.78, 0, 0, TAU); ctx.fill(); ctx.stroke(); }
    if (G.build && T.ptr && T.ptr.on) { var w = Rd.screenToWorld(T.ptr.x, T.ptr.y), why = T.Towers.canPlace(G.build, w[0], w[1]), D = T.TW[G.build], rr = D.rng * G.P.trange; ctx.strokeStyle = why ? 'rgba(255,90,90,0.8)' : 'rgba(120,255,160,0.8)'; ctx.fillStyle = why ? 'rgba(255,60,60,0.08)' : 'rgba(80,255,140,0.07)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(w[0], w[1], rr, rr * 0.78, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.globalAlpha = 0.65; var gs = Art.sprite('tower_' + G.build + '_1', 0, 64); ctx.drawImage(gs, w[0] - 37, w[1] - 74, 74, 92); ctx.globalAlpha = 1; }
    // pickups
    a = pools.KP.a; for (i = 0; i < a.length; i++) if (a[i].on && inV(a[i].x, a[i].y, 20)) drawPickup(a[i]);
    // 4-7 entidades ordenadas por profundidade
    ni = 0; var H = G.hero;
    a = G.deco; for (i = 0; i < a.length; i++) { var dc = a[i]; if (dc.t === 'big' && inV(dc.x, dc.y, 60)) add(dc.y, 1, dc); }
    for (i = 0; i < G.towers.length; i++) { var t2 = G.towers[i]; if (inV(t2.x, t2.y, 50)) add(t2.y, 2, t2); }
    add(G.base.y + 40, 3, null);
    for (i = 0; i < G.portals.length; i++) if (inV(G.portals[i].x, G.portals[i].y, 70)) add(G.portals[i].y, 4, G.portals[i]);
    add(H.y, 5, null);
    a = pools.EP.a; for (i = 0; i < a.length; i++) { var e = a[i]; if (e.on && inV(e.x, e.y, 90)) add(e.y, 6, e); }
    a = pools.AL.a; for (i = 0; i < a.length; i++) if (a[i].on && inV(a[i].x, a[i].y, 40)) add(a[i].y, 7, a[i]);
    a = pools.DP.a; for (i = 0; i < a.length; i++) if (a[i].on && inV(a[i].x, a[i].y, 90)) add(a[i].y, 8, a[i]);
    items.length = Math.max(items.length, ni); var list = items.slice(0, ni); list.sort(function (p, r) { return p.y - r.y; });
    for (i = 0; i < ni; i++) { var it = list[i]; switch (it.t) { case 1: drawBigDeco(it.o); break; case 2: drawTower(it.o); break; case 3: drawKeep(); break; case 4: drawPortal(it.o); break; case 5: drawHero(); break; case 6: drawEnemy(it.o); break; case 7: drawAlly(it.o); break; case 8: drawDead(it.o); break; } }
    // 8-9 projéteis e efeitos
    drawProjectiles(); drawSlashes(); drawZaps(); drawParticles(); drawTexts();
    // 10 iluminação
    drawLighting();
    // 11 névoa, clima, vinheta e telas de feedback
    drawFog(still ? dt * 0.2 : dt); drawWeather(still ? dt * 0.3 : dt);
    if (T.Exc) T.Exc.draw(ctx, S, cx0, cy0, Rd.cw, Rd.ch, q);
    if (T.Extra) T.Extra.draw(ctx, S, cx0, cy0, Rd.cw, Rd.ch, q);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = q.light > 0 ? 0.9 : 0.7; ctx.drawImage(vigC, 0, 0, Rd.cw, Rd.ch); ctx.globalAlpha = 1;
    var hpR = H.hp / H.max; if (hpR < 0.3 && G.state === 'play') { ctx.globalAlpha = (0.3 - hpR) * 1.6 * (0.7 + 0.3 * Math.sin(G.t * 6)); ctx.fillStyle = rg(ctx, Rd.cw / 2, Rd.ch / 2, Rd.ch * 0.3, Rd.ch * 0.9, 'rgba(160,0,20,0)', 'rgba(200,0,30,0.9)'); ctx.fillRect(0, 0, Rd.cw, Rd.ch); ctx.globalAlpha = 1; }
    if (G.timeStop > 0) { ctx.fillStyle = 'rgba(120,160,255,0.16)'; ctx.fillRect(0, 0, Rd.cw, Rd.ch); }
    if (G.dim > 0.01) { ctx.globalAlpha = G.dim; ctx.fillStyle = '#05030f'; ctx.fillRect(0, 0, Rd.cw, Rd.ch); ctx.globalAlpha = 1; }
    if (G.flash > 0) { ctx.globalAlpha = Math.min(0.55, G.flash) * (stt.flash ? 0.3 : 1); ctx.fillStyle = G.flashCol; ctx.fillRect(0, 0, Rd.cw, Rd.ch); ctx.globalAlpha = 1; }
  };
})(window.TD);

'use strict';
/* NOCTARIA — biblioteca de ícones SVG vetoriais (estilo único: traço 1.7, pontas redondas) + medalhões por raridade. */
(function (T) {
  var G = {
    sword: '<path d="M5 19L19 5M15 5h4v4M7 13l4 4M4 20l3-3"/>', wind: '<path d="M3 9h11a3 3 0 1 0-3-3M3 14h15a3 3 0 1 1-3 3M3 19h7"/>',
    target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>', burst: '<path d="M12 2l2.5 6L21 9l-5 4 1.5 7L12 16.5 6.5 20 8 13 3 9l6.5-1z"/>',
    plus: '<circle cx="12" cy="12" r="9"/><path d="M12 7v10M7 12h10"/>', arrow: '<path d="M3 21L20 4M20 4h-6M20 4v6M7 14l-4 1 1 4M10 17l-1 4 4-1"/>',
    explode: '<circle cx="12" cy="13" r="5"/><path d="M12 8V4M16 9l3-3M8 9L5 6M20 13h3M1 13h3M12 18v4"/>', wave: '<path d="M2 8c3-5 5-5 8 0s5 5 8 0M2 15c3-5 5-5 8 0s5 5 8 0"/>',
    chain: '<path d="M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1"/>', heart: '<path d="M12 21C5 15 3 11 3 8a4.5 4.5 0 0 1 9-1 4.5 4.5 0 0 1 9 1c0 3-2 7-9 13z"/>',
    leaf: '<path d="M5 19C5 9 11 4 20 4c0 9-5 15-13 15zM5 19l8-8"/>', shield: '<path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z"/>',
    stone: '<path d="M4 17l3-9 6-3 6 4 1 8-6 3z"/><path d="M7 8l5 4 7 0M12 12v8"/>', brain: '<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 1V4a3 3 0 0 0-3 0zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 1"/>',
    parry: '<path d="M5 4l14 14M19 4L5 18M4 20l3-3M20 20l-3-3"/>', flame: '<path d="M12 3c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-4 3-7 1 1 2 2 3 1-1-2-1-4 0-6z"/>',
    bolt: '<path d="M13 2L5 14h6l-1 8 9-13h-6z"/>', snow: '<path d="M12 2v20M3.5 7l17 10M20.5 7l-17 10M9 4l3 2 3-2M9 20l3-2 3 2"/>',
    skull: '<path d="M12 3a8 8 0 0 0-8 8c0 3 1 4 3 5v4h10v-4c2-1 3-2 3-5a8 8 0 0 0-8-8z"/><circle cx="9" cy="11" r="1.6"/><circle cx="15" cy="11" r="1.6"/><path d="M10 20v-3M14 20v-3"/>',
    moon: '<path d="M20 14A8 8 0 1 1 10 4a6.5 6.5 0 0 0 10 10z"/>', orb: '<circle cx="12" cy="12" r="7"/><path d="M8 9c1-2 3-3 5-3M3 12H1M23 12h-2M12 3V1M12 23v-2"/>',
    ghost: '<path d="M5 21V11a7 7 0 0 1 14 0v10l-3-2-2 2-2-2-2 2-2-2z"/><circle cx="9.5" cy="11" r="1.2"/><circle cx="14.5" cy="11" r="1.2"/>', coin: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5.5"/><path d="M12 9v6"/>',
    book: '<path d="M4 4h7a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4zM20 4h-7v16a2 2 0 0 1 2-2h5z"/>', clover: '<circle cx="9" cy="9" r="3.5"/><circle cx="15" cy="9" r="3.5"/><circle cx="9" cy="15" r="3.5"/><circle cx="15" cy="15" r="3.5"/>',
    gem: '<path d="M6 3h12l4 6-10 12L2 9z"/><path d="M2 9h20M9 3l3 6 3-6M12 9v12"/>', hammer: '<path d="M14 4l6 6-3 3-6-6zM11 10L3 18l3 3 8-8"/>', scope: '<circle cx="12" cy="12" r="8"/><path d="M12 1v6M12 17v6M1 12h6M17 12h6"/>',
    gear: '<circle cx="12" cy="12" r="3.5"/><circle cx="12" cy="12" r="7"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>', hourglass: '<path d="M6 3h12M6 21h12M7 3c0 6 5 6 5 9s-5 3-5 9M17 3c0 6-5 6-5 9s5 3 5 9"/>',
    magnet: '<path d="M5 3v9a7 7 0 0 0 14 0V3h-4v9a3 3 0 0 1-6 0V3zM5 7h4M15 7h4"/>', bag: '<path d="M7 8h10l2 12H5zM9 8a3 3 0 0 1 6 0M9 13h6"/>',
    tower: '<path d="M6 21V9l-2-1V3h4v2h2V3h4v2h2V3h4v5l-2 1v12zM10 21v-5h4v5"/>', blood: '<path d="M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z"/><path d="M9 14a3 3 0 0 0 3 3"/>',
    nova: '<circle cx="12" cy="12" r="4"/><path d="M12 1v5M12 18v5M1 12h5M18 12h5M4.5 4.5l3 3M16.5 16.5l3 3M19.5 4.5l-3 3M7.5 16.5l-3 3"/>', storm: '<path d="M6 15a5 5 0 1 1 1-9.8A6 6 0 0 1 19 8a4 4 0 0 1 0 8h-2"/><path d="M12 12l-3 5h4l-2 5"/>',
    meteor: '<path d="M20 4L8 12M20 4l-6 12M20 4l-12 6"/><circle cx="7" cy="17" r="4"/>', mirror: '<ellipse cx="12" cy="11" rx="6" ry="8"/><path d="M12 19v3M8 22h8M9 7c0-1 1-2 2-2"/>',
    boot: '<path d="M7 3h6v9l6 3v5H5v-5l2-1zM5 17h14"/>', battery: '<rect x="4" y="8" width="14" height="9" rx="1.5"/><path d="M20 11v3M10 10l-2 3h3l-2 3"/>', wings: '<path d="M12 20c-3-2-9-4-10-14 4 1 7 3 10 8 3-5 6-7 10-8-1 10-7 12-10 14z"/>',
    crown: '<path d="M3 18l1-10 5 5 3-8 3 8 5-5 1 10zM3 21h18"/>', eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3.5"/>', thorn: '<path d="M12 22V6M12 10l-5-3M12 14l5-3M12 18l-5-3M12 6l-2-4M12 6l3-4"/>',
    lamp: '<path d="M9 3h6M8 6h8l2 4v8a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3v-8zM8 10h8M12 12v4"/>', potion: '<path d="M9 3h6M10 3v6l-5 9a3 3 0 0 0 3 4h8a3 3 0 0 0 3-4l-5-9V3M7 15h10"/>',
    shard: '<path d="M12 2l6 8-3 12-6-4-3-8z"/><path d="M12 2v18M6 8l12 2"/>', helm: '<path d="M4 20V10a8 8 0 0 1 16 0v10h-4v-6H8v6zM8 14h8M12 4v6"/>', play: '<path d="M7 4l13 8-13 8z"/>', pause: '<path d="M8 4v16M16 4v16"/>',
    close: '<path d="M5 5l14 14M19 5L5 19"/>', up: '<path d="M12 20V4M5 11l7-7 7 7"/>', lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>', bow: '<path d="M5 3c10 2 14 6 14 9s-4 7-14 9M5 3v18M5 12h16M17 9l4 3-4 3"/>',
    cannon: '<path d="M3 13l12-5 4 8-12 5zM15 8l4 8M21 5l1-2"/><circle cx="6" cy="19" r="2.4"/>', dropskull: '<path d="M12 2c4 5 7 8 7 12a7 7 0 0 1-14 0c0-4 3-7 7-12z"/><circle cx="9.5" cy="14" r="1.2"/><circle cx="14.5" cy="14" r="1.2"/><path d="M10 18h4"/>',
    sun: '<circle cx="12" cy="12" r="4.5"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4M4 4l3 3M17 17l3 3M20 4l-3 3M7 17l-3 3"/>', rune: '<path d="M12 2l7 5v10l-7 5-7-5V7zM12 6v12M8 9l8 6M16 9l-8 6"/>',
    daggers: '<path d="M4 20L14 10l2 2L6 22zM20 20L10 10l-2 2 10 10zM14 10l3-7M10 10L7 3"/>', cross: '<path d="M12 3v18M6 9h12"/>', scroll: '<path d="M6 4h12v14a3 3 0 0 0 3 3H9a3 3 0 0 1-3-3zM6 4a2 2 0 0 0-2 2v2h2M10 9h6M10 13h6"/>', trophy: '<path d="M7 4h10v6a5 5 0 0 1-10 0zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3M12 15v4M8 21h8"/>',
    gearbig: '<circle cx="12" cy="12" r="3"/><path d="M12 2l1.5 3 3-1 1 3 3 1.5-1.5 3 1.5 3-3 1.5-1 3-3-1L12 22l-1.5-3-3 1-1-3-3-1.5L5 12 3.5 9l3-1.5 1-3 3 1z"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v1"/>'
  };
  var SKILL = { dmg1: 'sword', rate1: 'wind', crit1: 'target', critdmg: 'burst', proj1: 'plus', pierce: 'arrow', explode: 'explode', area1: 'wave', chain1: 'chain', hp1: 'heart', regen: 'leaf', shield: 'shield', dr: 'stone', resist: 'brain', block: 'parry', fire: 'flame', bolt: 'bolt', ice: 'snow', poison: 'dropskull', dark: 'moon', arcane: 'orb', summon: 'ghost', coin: 'coin', xp: 'book', drop: 'clover', rarity: 'gem', tcost: 'hammer', trange: 'scope', trate: 'gear', cdr: 'hourglass', autocol: 'magnet', magnet: 'magnet', slots: 'bag', t_fire: 'flame', t_elec: 'bolt', t_cannon: 'cannon', t_ice: 'snow', t_all: 'gear', vamp: 'blood', nova: 'nova', fury: 'storm', rain: 'meteor', twin: 'mirror', ghost: 'boot', overcharge: 'battery', immortal: 'wings', timestop: 'hourglass', ascend: 'crown', lich: 'skull' };
  var REL = { titan: 'heart', hunter: 'eye', void: 'gem', hourglass: 'hourglass', crown: 'crown', core: 'orb', boots: 'boot', lodestone: 'magnet', cursed: 'coin', grimoire: 'book', thorns: 'thorn', lantern: 'lamp' };
  var TOW = { arrow: 'bow', cannon: 'cannon', fire: 'flame', ice: 'snow', elec: 'bolt', arcane: 'orb', poison: 'dropskull', sniper: 'scope', summon: 'ghost', support: 'sun' };
  var HERO = { knight: 'shield', mage: 'rune', archer: 'bow', necro: 'skull', paladin: 'sun', assassin: 'daggers' };
  T.Icon = function (name, col, size) { var g = G[name] || G.info; return '<svg class="ic" viewBox="0 0 24 24" width="' + (size || 24) + '" height="' + (size || 24) + '" fill="none" stroke="' + (col || 'currentColor') + '" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + g + '</svg>'; };
  T.iconFor = function (kind, id) { return kind === 'skill' ? SKILL[id] || 'burst' : kind === 'relic' ? REL[id] || 'gem' : kind === 'tower' ? TOW[id] || 'tower' : kind === 'hero' ? HERO[id] || 'helm' : id; };
  /* Medalhão hexagonal com a cor da raridade (usa o ícone por dentro). */
  T.Medal = function (kind, id, rar, size) {
    var col = T.RAR[rar == null ? 0 : rar].c, s = size || 56, ic = G[T.iconFor(kind, id)] || G.info, uid = 'm' + Math.floor(Math.random() * 1e6);
    return '<svg class="medal" viewBox="0 0 48 48" width="' + s + '" height="' + s + '" aria-hidden="true"><defs><radialGradient id="' + uid + '" cx="50%" cy="35%" r="75%"><stop offset="0" stop-color="' + col + '" stop-opacity=".55"/><stop offset="1" stop-color="#0c0a10"/></radialGradient></defs>' +
      '<path d="M24 2l19 11v22L24 46 5 35V13z" fill="url(#' + uid + ')" stroke="' + col + '" stroke-width="2"/><path d="M24 6l15 9v18L24 42 9 33V15z" fill="none" stroke="' + col + '" stroke-opacity=".35"/>' +
      '<g transform="translate(12 12)" fill="none" stroke="#fff" stroke-opacity=".92" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + ic + '</g></svg>';
  };
  T.CORNER = "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M2 22V6a4 4 0 0 1 4-4h16" fill="none" stroke="#c9a14a" stroke-width="2"/><path d="M6 22V9a3 3 0 0 1 3-3h13" fill="none" stroke="#c9a14a" stroke-opacity=".4"/><circle cx="4" cy="4" r="2" fill="#c9a14a"/></svg>');
  /* Retratos ilustrados (gerados do sprite do herói) em PNG de dados, com cache. */
  var PC = {};
  T.portrait = function (id, size) {
    var k = id + size; if (PC[k]) return PC[k]; var c = document.createElement('canvas'); c.width = c.height = size; var x = c.getContext('2d'), C = T.CLS[id];
    var g = x.createRadialGradient(size / 2, size * 0.4, 2, size / 2, size / 2, size * 0.75); g.addColorStop(0, C.col); g.addColorStop(1, '#07050a'); x.fillStyle = g; x.fillRect(0, 0, size, size);
    x.globalAlpha = 0.25; x.fillStyle = '#000'; x.fillRect(0, size * 0.78, size, size * 0.22); x.globalAlpha = 1;
    var sp = T.Art.sprite('hero_' + id, 0, 128, 0), s = size * 1.7; x.drawImage(sp, -(s - size) / 2, -size * 0.1, s, s);
    return PC[k] = c.toDataURL('image/png');
  };
  var TC = {};
  T.thumb = function (kind, size, tint) { var k = kind + size + (tint || ''); if (TC[k]) return TC[k]; var c = document.createElement('canvas'); c.width = c.height = size; var x = c.getContext('2d'); var g = x.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size * 0.7); g.addColorStop(0, tint || '#3a2a4a'); g.addColorStop(1, '#07050a'); x.fillStyle = g; x.fillRect(0, 0, size, size); x.drawImage(T.Art.sprite(kind, 0, 64, 0), 0, size * 0.04, size, size); return TC[k] = c.toDataURL('image/png'); };
})(window.TD);

'use strict';
/* NOCTARIA — cenas animadas dos menus: fundo da fortaleza (T.MenuBG) e vitrine do herói (T.Preview). */
(function (T) {
  var Art = T.Art, TAU = T.TAU, A = T.Anim;
  function mk(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function rg(c, x, y, r0, r1, a, b) { var g = c.createRadialGradient(x, y, r0, x, y, r1); g.addColorStop(0, a); g.addColorStop(1, b); return g; }

  /* ---------- Fundo do menu principal ---------- */
  var B = T.MenuBG = { on: false, t: 0, cv: null, c: null, sil: {}, parts: [], mob: [], static: null, raf: 0, last: 0, px: 0 };
  function silhouette(kind, size) { var k = kind + size; if (B.sil[k]) return B.sil[k]; var s = Art.sprite(kind, 0, size, 0), c = mk(size, size), x = c.getContext('2d'); x.drawImage(s, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(6,4,10,0.96)'; x.fillRect(0, 0, size, size); return B.sil[k] = c; }
  function bakeStatic(w, h) {
    var c = mk(w, h), x = c.getContext('2d'), s = 4242; function r() { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }
    var g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#07040d'); g.addColorStop(0.55, '#1c0c22'); g.addColorStop(0.85, '#3a1226'); g.addColorStop(1, '#14080e'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    for (var i = 0; i < 120; i++) { x.fillStyle = 'rgba(255,255,255,' + (0.1 + r() * 0.6) + ')'; x.fillRect(r() * w, r() * h * 0.55, 1.3, 1.3); }
    var mx = w * 0.72, my = h * 0.2, mr = Math.min(w, h) * 0.07; x.fillStyle = rg(x, mx, my, 0, mr * 5, 'rgba(190,170,255,0.3)', 'rgba(0,0,0,0)'); x.fillRect(mx - mr * 5, my - mr * 5, mr * 10, mr * 10);
    x.beginPath(); x.arc(mx, my, mr, 0, TAU); x.fillStyle = '#e6e2f4'; x.fill(); x.fillStyle = 'rgba(80,70,120,0.25)'; x.beginPath(); x.arc(mx - mr * 0.3, my - mr * 0.2, mr * 0.3, 0, TAU); x.fill(); x.beginPath(); x.arc(mx + mr * 0.35, my + mr * 0.3, mr * 0.2, 0, TAU); x.fill();
    function ridge(base, amp, col, seed) { x.beginPath(); x.moveTo(0, h); for (var i = 0; i <= 80; i++) { var X = i / 80 * w; x.lineTo(X, base - Math.abs(Math.sin(i * 0.31 + seed)) * amp - Math.sin(i * 0.8 + seed) * amp * 0.3); } x.lineTo(w, h); x.fillStyle = col; x.fill(); }
    ridge(h * 0.62, h * 0.12, '#1a0f26', 1); ridge(h * 0.7, h * 0.1, '#120a1c', 3);
    // fortaleza
    var fx = w * 0.42, fb = h * 0.74, fw = Math.min(w * 0.42, h * 0.8), u = fw / 100; x.fillStyle = '#0a060e';
    x.fillRect(fx - 50 * u, fb - 34 * u, 100 * u, 34 * u); x.fillRect(fx - 56 * u, fb - 62 * u, 18 * u, 62 * u); x.fillRect(fx + 38 * u, fb - 70 * u, 18 * u, 70 * u); x.fillRect(fx - 20 * u, fb - 96 * u, 40 * u, 96 * u);
    [[fx - 56 * u, fb - 62 * u, 18 * u], [fx + 38 * u, fb - 70 * u, 18 * u], [fx - 20 * u, fb - 96 * u, 40 * u]].forEach(function (t) { x.beginPath(); x.moveTo(t[0] - 3 * u, t[1]); x.lineTo(t[0] + t[2] / 2, t[1] - 26 * u); x.lineTo(t[0] + t[2] + 3 * u, t[1]); x.fill(); for (var k = 0; k < 4; k++) x.fillRect(t[0] + k * t[2] / 4, t[1] - 5 * u, t[2] / 8, 6 * u); });
    x.beginPath(); x.moveTo(fx - 8 * u, fb); x.lineTo(fx - 8 * u, fb - 18 * u); x.arc(fx, fb - 18 * u, 8 * u, Math.PI, 0); x.lineTo(fx + 8 * u, fb); x.fillStyle = '#1b0c10'; x.fill();
    B.win = [[fx - 49 * u, fb - 44 * u], [fx - 49 * u, fb - 30 * u], [fx + 45 * u, fb - 52 * u], [fx + 45 * u, fb - 36 * u], [fx - 4 * u, fb - 76 * u], [fx + 4 * u, fb - 60 * u], [fx - 10 * u, fb - 50 * u], [fx + 12 * u, fb - 46 * u]]; B.winS = 3 * u;
    B.torch = [[fx - 14 * u, fb - 14 * u], [fx + 14 * u, fb - 14 * u], [fx - 60 * u, fb + 2 * u], [fx + 60 * u, fb + 2 * u]]; B.fx = fx; B.fb = fb; B.u = u;
    ridge(h * 0.8, h * 0.06, '#0a0610', 7); x.fillStyle = '#05030a'; x.fillRect(0, h * 0.9, w, h * 0.1);
    // árvores mortas em primeiro plano
    for (i = 0; i < 9; i++) { var tx = (i + r() * 0.6) / 9 * w, th = h * (0.12 + r() * 0.12), ty = h * 0.92; x.strokeStyle = '#05030a'; x.lineWidth = 3 + r() * 3; x.beginPath(); x.moveTo(tx, ty); x.lineTo(tx + r() * 8 - 4, ty - th); x.stroke(); for (var b = 0; b < 4; b++) { x.lineWidth = 1.5 + r() * 1.5; x.beginPath(); var by = ty - th * (0.4 + b * 0.15); x.moveTo(tx, by); x.lineTo(tx + (r() - 0.5) * th * 0.7, by - th * 0.2); x.stroke(); } }
    return c;
  }
  B.start = function (cv) {
    B.cv = cv; B.c = cv.getContext('2d'); B.on = true; B.size();
    B.mob.length = 0; for (var i = 0; i < 5; i++) B.mob.push({ kind: ['ghoul', 'ogre', 'cultist', 'knight', 'ashhound'][i], x: Math.random(), s: 0.04 + Math.random() * 0.04, sz: 64, ph: Math.random() * 6 });
    B.parts.length = 0; for (i = 0; i < 40; i++) B.parts.push({ x: Math.random(), y: Math.random(), s: 0.02 + Math.random() * 0.05, p: Math.random() * 6 });
    B.last = performance.now(); cancelAnimationFrame(B.raf); B.raf = requestAnimationFrame(B.loop);
  };
  B.stop = function () { B.on = false; cancelAnimationFrame(B.raf); };
  B.size = function () { var q = T.qIdx(), sc = [0.5, 0.7, 0.9][q]; B.cv.width = Math.max(2, Math.round(window.innerWidth * sc)); B.cv.height = Math.max(2, Math.round(window.innerHeight * sc)); B.static = bakeStatic(B.cv.width, B.cv.height); };
  B.loop = function (now) {
    if (!B.on) return; B.raf = requestAnimationFrame(B.loop);
    var q = T.Save.d.set.q; if (now - B.last < 1000 / (q === 0 ? 24 : 30)) return; var dt = Math.min(0.1, (now - B.last) / 1000); B.last = now; B.t += dt;
    var c = B.c, w = B.cv.width, h = B.cv.height, t = B.t; c.drawImage(B.static, 0, 0);
    // janelas e tochas
    var fl = 0.8 + Math.sin(t * 9) * 0.1 + Math.sin(t * 21) * 0.08; c.globalCompositeOperation = 'lighter';
    B.win.forEach(function (p, i) { c.globalAlpha = (0.5 + 0.5 * Math.sin(t * 1.3 + i * 2.1) > 0.25 ? 0.9 : 0.3); c.fillStyle = '#ffb04a'; c.fillRect(p[0], p[1], B.winS, B.winS * 1.6); });
    B.torch.forEach(function (p, i) { c.globalAlpha = 0.55 * fl; c.drawImage(Art.glowSprite('#ff9a3a'), p[0] - B.u * 22, p[1] - B.u * 26, B.u * 44, B.u * 44); c.globalAlpha = 0.9; c.fillStyle = '#ffd080'; c.beginPath(); c.arc(p[0], p[1] - B.u * 3, B.u * 1.6 * fl, 0, TAU); c.fill(); });
    c.globalAlpha = 0.18 * fl; c.drawImage(Art.glowSprite('#ff7a2a'), B.fx - B.u * 90, B.fb - B.u * 70, B.u * 180, B.u * 80); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    // silhuetas de criaturas marchando
    B.mob.forEach(function (m) { m.x += m.s * dt * 0.5; if (m.x > 1.1) m.x = -0.1; var sz = h * 0.13, X = m.x * w, Y = h * 0.935 + Math.sin(t * 6 + m.ph) * 1.5, s = silhouette(m.kind, 64); c.globalAlpha = 0.95; c.drawImage(s, X - sz / 2, Y - sz * 0.93, sz, sz); });
    // névoa
    var f = Art.fog(), sz2 = Math.max(w, h) * 0.9; c.globalAlpha = 0.55; for (var L = 0; L < (q ? 2 : 1); L++) { var ox = -((t * (10 + L * 8)) % sz2); for (var X2 = ox - sz2; X2 < w; X2 += sz2) c.drawImage(f, X2, h * (0.58 + L * 0.12), sz2, sz2 * 0.5); } c.globalAlpha = 1;
    // brasas/cinzas
    if (q > 0) { c.fillStyle = 'rgba(255,150,70,0.8)'; for (var i = 0; i < B.parts.length; i++) { var p = B.parts[i]; p.y -= p.s * dt; p.x += Math.sin(t + p.p) * 0.01 * dt * 20; if (p.y < -0.02) { p.y = 1.02; p.x = Math.random(); } c.globalAlpha = 0.4 + 0.4 * Math.sin(t * 2 + p.p); c.fillRect(p.x * w, p.y * h, 2, 2); } c.globalAlpha = 1; }
    c.fillStyle = rg(c, w / 2, h / 2, h * 0.3, h * 0.95, 'rgba(0,0,0,0)', 'rgba(0,0,0,0.75)'); c.fillRect(0, 0, w, h);
  };

  /* ---------- Vitrine do herói (seleção) ---------- */
  var P = T.Preview = { on: false, id: 'knight', t: 0, atkT: 1, parts: [], an: null, raf: 0, last: 0, cv: null, flash: 0, proj: null };
  P.start = function (cv) { P.cv = cv; P.on = true; P.an = A.make(); P.last = performance.now(); P.atkT = 0.8; cancelAnimationFrame(P.raf); P.raf = requestAnimationFrame(P.loop); };
  P.stop = function () { P.on = false; cancelAnimationFrame(P.raf); };
  P.set = function (id) { P.id = id; P.parts.length = 0; P.atkT = 0.5; P.proj = null; P.an = A.make(); };
  function pp(x, y, vx, vy, l, s, c, t) { if (P.parts.length < 90) P.parts.push({ x: x, y: y, vx: vx, vy: vy, l: l, m: l, s: s, c: c, t: t || 0 }); }
  function demo() {
    var id = P.id, w = P.cv.width, h = P.cv.height, cx = w * 0.42, cy = h * 0.8, u = h / 300, C = T.CLS[id]; P.flash = 0.25; var i;
    A.play(P.an, id === 'mage' || id === 'necro' ? 'cast' : 'attack', true);
    if (id === 'knight') { P.slash = { x: cx + 50 * u, y: cy - 60 * u, r: 70 * u, life: 0.25, col: '#ff3a4a' }; for (i = 0; i < 16; i++) pp(cx + 100 * u, cy - 50 * u, (Math.random() * 160 + 40) * u, (Math.random() - 0.5) * 220 * u, 0.4, 2.2 * u, '#ffd9a0', 1); }
    else if (id === 'paladin') { P.slash = { x: cx + 50 * u, y: cy - 60 * u, r: 70 * u, life: 0.25, col: '#fff0b0' }; for (i = 0; i < 18; i++) pp(cx + (Math.random() - 0.5) * 120 * u, cy - 20 * u, (Math.random() - 0.5) * 20, -60 * u - Math.random() * 60 * u, 0.9, 3 * u, '#fff0b0', 1); P.ring = { x: cx, y: cy, r: 0, life: 0.7, col: '#fff0b0' }; }
    else if (id === 'assassin') { for (i = 0; i < 4; i++) pp(cx + i * 40 * u, cy, 0, 0, 0.35, 0, '#6a4aa8', 5); P.slash = { x: cx + 90 * u, y: cy - 60 * u, r: 50 * u, life: 0.2, col: '#c8a0ff' }; }
    else if (id === 'mage') { P.proj = { x: cx + 40 * u, y: cy - 90 * u, vx: 380 * u, vy: -10 * u, col: '#b06cff' }; P.ring = { x: cx, y: cy, r: 0, life: 0.8, col: '#c08aff' }; for (i = 0; i < 6; i++) pp(cx + Math.cos(i) * 40 * u, cy - 70 * u + Math.sin(i) * 20 * u, 0, -20, 1, 5 * u, '#c08aff', 6); }
    else if (id === 'archer') { P.proj = { x: cx + 40 * u, y: cy - 80 * u, vx: 760 * u, vy: 0, col: '#e8f0c8', arrow: 1 }; }
    else if (id === 'necro') { P.proj = { x: cx + 40 * u, y: cy - 90 * u, vx: 220 * u, vy: -20 * u, col: '#3ae0a0' }; for (i = 0; i < 10; i++) pp(cx + (Math.random() - 0.5) * 150 * u, cy - 20 * u, 0, -40 * u - Math.random() * 40 * u, 1.2, 3.4 * u, '#3ae0a0', 3); }
  }
  P.loop = function (now) {
    if (!P.on) return; P.raf = requestAnimationFrame(P.loop); var q = T.Save.d.set.q; if (now - P.last < 1000 / (q === 0 ? 24 : 40)) return; var dt = Math.min(0.1, (now - P.last) / 1000); P.last = now; P.t += dt;
    var cv = P.cv, c = cv.getContext('2d'), w = cv.width, h = cv.height, C = T.CLS[P.id], u = h / 300, cx = w * 0.42, cy = h * 0.8, hue = (T.SKINS[T.Save.d.skin] || { hue: 0 }).hue;
    var g = c.createRadialGradient(w * 0.45, h * 0.5, 10, w * 0.45, h * 0.55, h * 0.8); g.addColorStop(0, C.col); g.addColorStop(0.5, C.col2); g.addColorStop(1, '#06040a'); c.globalAlpha = 1; c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.globalAlpha = 0.35; c.fillStyle = '#000'; c.fillRect(0, cy, w, h - cy); c.globalAlpha = 1;
    c.save(); c.translate(cx, cy + 6 * u); c.scale(1, 0.32); c.strokeStyle = C.col; c.lineWidth = 3 * u; c.globalAlpha = 0.7; c.beginPath(); c.arc(0, 0, 120 * u, 0, TAU); c.stroke(); c.rotate(P.t * 0.4); c.globalAlpha = 0.5; c.lineWidth = 2 * u; c.setLineDash([10 * u, 12 * u]); c.beginPath(); c.arc(0, 0, 150 * u, 0, TAU); c.stroke(); c.restore(); c.globalAlpha = 1;
    c.fillStyle = 'rgba(0,0,0,0.45)'; c.beginPath(); c.ellipse(cx, cy + 4 * u, 56 * u, 14 * u, 0, 0, TAU); c.fill();
    P.atkT -= dt; if (P.atkT <= 0) { P.atkT = 2.6; demo(); }
    A.update(P.an, dt); var size = 128, sc = (h * 0.74) / size;
    c.globalAlpha = 0.6; c.drawImage(Art.glowSprite(C.col), cx - 120 * u, cy - 240 * u, 240 * u, 240 * u); c.globalAlpha = 1;
    if (P.id === 'assassin' && P.parts.some(function (p) { return p.t === 5; })) { c.globalAlpha = 0.25; c.drawImage(Art.sprite('hero_assassin', 0, size, hue), cx - 80 * u - size * sc / 2, cy - size * sc * 0.93, size * sc, size * sc); c.globalAlpha = 1; }
    A.draw(c, 'hero_' + P.id, size, hue, cx, cy + 6 * u, sc, P.an, 1, 0, null);
    c.globalCompositeOperation = 'lighter';
    if (P.slash) { var s = P.slash; s.life -= dt; if (s.life <= 0) P.slash = null; else { var k = s.life / 0.25; c.strokeStyle = s.col; c.lineWidth = 12 * u * k; c.globalAlpha = k; c.beginPath(); c.arc(s.x - s.r * 0.6, s.y, s.r, -1.0, 1.0 * (1.2 - k * 0.2)); c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = 3 * u * k; c.stroke(); } }
    if (P.ring) { var r = P.ring; r.life -= dt; r.r += 260 * u * dt; if (r.life <= 0) P.ring = null; else { c.globalAlpha = r.life; c.strokeStyle = r.col; c.lineWidth = 3 * u; c.beginPath(); c.ellipse(r.x, r.y, r.r, r.r * 0.3, 0, 0, TAU); c.stroke(); } }
    if (P.proj) { var pr = P.proj; pr.x += pr.vx * dt; pr.y += pr.vy * dt; if (pr.x > w + 20) P.proj = null; else { c.globalAlpha = 1; if (pr.arrow) { c.strokeStyle = '#e8f0c8'; c.lineWidth = 3 * u; c.beginPath(); c.moveTo(pr.x - 40 * u, pr.y); c.lineTo(pr.x, pr.y); c.stroke(); } else { c.drawImage(Art.glowSprite(pr.col), pr.x - 24 * u, pr.y - 24 * u, 48 * u, 48 * u); } pp(pr.x, pr.y, (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30, 0.4, 3 * u, pr.col, 1); } }
    for (var i = P.parts.length - 1; i >= 0; i--) { var p = P.parts[i]; p.l -= dt; if (p.l <= 0) { P.parts.splice(i, 1); continue; } p.x += p.vx * dt; p.y += p.vy * dt; var a = p.l / p.m; c.globalAlpha = a; if (p.t === 5) continue; c.fillStyle = p.c; if (p.t === 3) { c.drawImage(Art.glowSprite(p.c), p.x - p.s * 2, p.y - p.s * 2, p.s * 4, p.s * 4); } else { c.beginPath(); c.arc(p.x, p.y, p.s, 0, TAU); c.fill(); } }
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
    c.fillStyle = rg(c, w / 2, h / 2, h * 0.35, h * 0.9, 'rgba(0,0,0,0)', 'rgba(0,0,0,0.6)'); c.fillRect(0, 0, w, h);
  };
})(window.TD);

'use strict';
/* NOCTARIA — interface: telas, HUD, painéis, cartas de nível, resumo. Tudo em DOM/CSS com ícones SVG. */
(function (T) {
  var G = T.G, I = T.int, Ic = T.Icon, $ = function (id) { return document.getElementById(id); };
  var U = T.UI = { screen: null };
  var WEAPON = { knight: 'Montante Carmesim', mage: 'Cajado do Véu', archer: 'Arco do Último Guarda', necro: 'Cajado de Crânio', paladin: 'Espada do Santuário', assassin: 'Adagas Gêmeas' };
  var QDESC = ['30 FPS · resolução reduzida · poucas partículas · sem iluminação dinâmica', '45 FPS · iluminação simplificada · partículas moderadas', '60 FPS · iluminação e brilho completos · mais partículas e detalhes'];
  function sv() { return T.Save.d; }
  function click() { T.Audio.init(); T.Audio.sfx('pick'); }
  function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }
  function toast(m) { var t = $('toast'); t.textContent = m; t.classList.remove('hidden'); clearTimeout(toast.t); toast.t = setTimeout(function () { t.classList.add('hidden'); }, 2200); }
  U.toast = toast;
  function setHTML(el, h) { el.innerHTML = h; }
  function bar(p, cls) { return '<div class="bar ' + (cls || '') + '"><i style="transform:scaleX(' + Math.max(0, Math.min(1, p)) + ')"></i></div>'; }

  /* ---------- Navegação ---------- */
  U.go = function (name, arg) {
    U.closePanel(); $('ov').classList.add('hidden'); T.Preview.stop(); U.screen = name;
    var s = $('scr'); s.classList.remove('hidden'); s.scrollTop = 0; $('hud').classList.add('hidden'); $('game').classList.add('hidden'); $('menubg').classList.remove('hidden');
    if (!T.MenuBG.on) T.MenuBG.start($('menubg'));
    G.state = 'menu'; T.Audio.music(false);
    (U.screens[name] || U.screens.menu)(s, arg); T.Save.save();
  };
  function back(to) { return '<button class="btn ghost sm" data-a="go" data-v="' + (to || 'menu') + '">‹ Voltar</button>'; }
  function head(title, to) { return '<div class="row" style="max-width:980px;margin:0 auto 8px">' + back(to) + '<h1 class="ttl grow" style="margin:0">' + title + '</h1><span class="chip ess">' + Ic('shard', '#c79bff', 16) + sv().essence + '</span></div>'; }
  function diffTag(d) { return '<span class="tag">' + d + '</span>'; }
  U.screens = {
    menu: function (s) {
      setHTML(s, '<div class="menu"><div class="logo"><h1>NOCTARIA</h1><h2>THE LAST KEEP</h2></div><nav class="mbtns">' +
        '<button class="mb pri" data-a="go" data-v="setup">' + Ic('play', '#fff', 20) + 'Jogar</button>' +
        [['heroes', 'Personagens', 'helm'], ['collection', 'Coleção', 'book'], ['progress', 'Progressão', 'up'], ['achv', 'Conquistas', 'trophy'], ['settings', 'Configurações', 'gearbig'], ['credits', 'Créditos', 'scroll']].map(function (b) { return '<button class="mb" data-a="go" data-v="' + b[0] + '">' + Ic(b[2], '#c9a14a', 18) + b[1] + '</button>'; }).join('') +
        '</nav><div class="mfoot">Melhor pontuação ' + T.fmt(sv().best) + ' · Essência ' + sv().essence + ' · Onda máx. ' + sv().maxWave + '</div></div>');
    },
    setup: function (s) {
      var d = sv(), C = T.CLS[d.lastClass];
      setHTML(s, head('Expedição') + '<div style="max-width:980px;margin:0 auto" class="col"><div class="pn row"><img src="' + T.portrait(d.lastClass, 96) + '" width="72" height="72" style="border:2px solid #c9a14a;border-radius:10px"><div class="grow"><b class="gold" style="letter-spacing:.12em">' + C.n + '</b> <span class="mut small">— ' + C.title + '</span><div class="small mut" style="margin-top:3px">' + C.special + ': ' + C.sd + '</div></div><button class="btn sm" data-a="go" data-v="heroes">Trocar</button></div>' +
        '<h2 class="ttl" style="font-size:16px;margin:4px 0">Escolha o mapa</h2><div class="grid">' + T.MAPORDER.map(function (id) {
          var M = T.MAPS[id], own = d.maps[id], sel = d.lastMap === id;
          return '<div class="card buy ' + (sel ? 'sel' : '') + (own ? '' : ' lk') + '" data-a="map" data-v="' + id + '"><div style="width:100%;height:64px;border-radius:6px;background:radial-gradient(circle at 50% 70%,' + M.tint + '66,transparent 60%),linear-gradient(' + M.g[0] + ',' + M.g[1] + ');border:1px solid #4a3c28"></div><b>' + M.n + '</b><span class="mut">' + (own ? 'Evento: ' + { wolves: 'alcateia', risen: 'mortos', blizzard: 'nevasca', sandstorm: 'areia', eruption: 'erupção', surge: 'surto', rift: 'fenda', guardians: 'guardiões' }[M.event] : Ic('lock', '#c9a14a', 12) + ' ' + M.unlock + ' essência') + '</span></div>';
        }).join('') + '</div><button class="btn pri" data-a="start" style="margin-top:6px">Iniciar expedição</button><div class="small mut" style="text-align:center">Sobreviva a 20 ondas e derrote o chefe final para vencer.</div></div>');
    },
    heroes: function (s, idx) {
      var d = sv(), i = idx == null ? Math.max(0, T.CLSORDER.indexOf(d.lastClass)) : idx; U.hi = i; var id = T.CLSORDER[i], C = T.CLS[id], own = d.classes[id];
      function st(n, v, mx) { return '<div class="stat"><span class="mut">' + n + '</span>' + bar(v / mx) + '<b>' + (Math.round(v * 10) / 10) + '</b></div>'; }
      setHTML(s, head('Personagens') + '<div class="hs"><div><div class="stage"><canvas id="pv" width="480" height="360"></canvas><button class="nav l" data-a="hnav" data-v="-1">‹</button><button class="nav r" data-a="hnav" data-v="1">›</button></div><div class="dots" style="margin-top:8px">' +
        T.CLSORDER.map(function (k, j) { return '<button class="dot ' + (j === i ? 'on' : '') + (d.classes[k] ? '' : ' lk') + '" data-a="hset" data-v="' + j + '"><img src="' + T.portrait(k, 64) + '" alt="">' + (d.classes[k] ? '' : '<span style="position:absolute;left:0;right:0;top:12px;display:flex;justify-content:center">' + Ic('lock', '#c9a14a', 20) + '</span>') + '</button>'; }).join('') + '</div></div>' +
        '<div class="pn col"><div><h2 class="ttl" style="text-align:left;margin:0;font-size:clamp(20px,5vw,30px)">' + C.n + '</h2><div class="gold small" style="letter-spacing:.14em;text-transform:uppercase">' + C.title + '</div><div style="margin-top:6px"><span class="tag">' + C.cls + '</span>' + diffTag('Dificuldade: ' + C.diff) + (own ? '<span class="tag" style="color:#6fe8d0;border-color:#2a8a70">Desbloqueado</span>' : '<span class="tag" style="color:#ff8a8a">Bloqueado</span>') + '</div></div>' +
        '<div class="small" style="line-height:1.45;color:#d8d0c0">' + C.story + '</div>' +
        '<div class="col" style="gap:4px">' + st('Vida', C.hp, 150) + st('Dano', C.dmg, 15) + st('Cadência', C.rate, 2.3) + st('Alcance', C.rng, 270) + st('Velocidade', C.spd, 140) + '</div>' +
        '<div class="item">' + T.Medal('hero', id, 4, 44) + '<div><b class="gold">' + C.special + '</b><div class="desc">' + C.sd + ' Recarga ' + T.SPCD[id] + 's.</div></div></div>' +
        (own ? '<div class="item"><div><b class="gold">Artefato: ' + (T.Ult.chosen(id) ? T.ARTS_ALT[id].n : T.ARTS[id].n) + '</b><div class="desc">' + (T.Ult.chosen(id) ? T.ARTS_ALT[id].sub : T.ARTS[id].sub) + '. Alternativa: ' + (T.Ult.chosen(id) ? T.ARTS[id].n : T.ARTS_ALT[id].n) + '.</div></div>' + (T.Ult.owned(id) ? '<button class="btn sm" data-a="hart" data-v="' + id + '">Trocar</button>' : '<button class="btn sm ' + (d.essence >= T.Ult.cost ? '' : 'dis') + '" data-a="hart" data-v="' + id + '">' + T.Ult.cost + ' essência</button>') + '</div>' : '') +
        '<div class="small mut">Arma: ' + WEAPON[id] + ' · Ataque ' + (C.melee ? 'corpo a corpo' : 'à distância') + '</div>' +
        (own ? '<button class="btn pri" data-a="hpick" data-v="' + id + '">' + (d.lastClass === id ? '✓ Selecionado' : 'Selecionar') + '</button>' : '<button class="btn ' + (d.essence >= C.unlock ? '' : 'dis') + '" data-a="hbuy" data-v="' + id + '">Desbloquear · ' + C.unlock + ' essência</button>') + '</div></div>');
      var cv = $('pv'); T.Preview.set(id); T.Preview.start(cv);
    },
    collection: function (s, tab) {
      tab = tab || U.ctab || 'sk'; U.ctab = tab; var d = sv(), h = '';
      var tabs = [['sk', 'Poderes'], ['rl', 'Relíquias'], ['sy', 'Sinergias'], ['en', 'Inimigos'], ['bs', 'Chefes'], ['lo', 'Folclore'], ['tr', 'Troféus']];
      function cell(seen, medal, name, desc, extra) { return '<div class="card ' + (seen ? '' : 'lk') + '">' + (seen ? medal : '<div style="width:56px;height:56px;display:flex;align-items:center;justify-content:center;border:2px dashed #4a3c28;border-radius:10px;font-size:22px">?</div>') + '<b>' + (seen ? name : '???') + '</b><span class="mut">' + (seen ? desc : 'Não descoberto') + '</span>' + (extra || '') + '</div>'; }
      if (tab === 'sk') h = T.SK.map(function (x) { return cell(d.seen.s[x.id], T.Medal('skill', x.id, x.rar, 56), x.name, x.desc, '<span style="color:' + T.RAR[x.rar].c + ';font-size:10px;letter-spacing:.2em">' + T.RAR[x.rar].n.toUpperCase() + '</span>'); }).join('');
      else if (tab === 'rl') h = T.REL.map(function (x) { return cell(d.relics[x.id], T.Medal('relic', x.id, x.rar, 56), x.n, x.d, '<span style="color:' + T.RAR[x.rar].c + ';font-size:10px;letter-spacing:.2em">' + T.RAR[x.rar].n.toUpperCase() + '</span>'); }).join('');
      else if (tab === 'tr') h = T.Extra.trophyHTML();
      else if (tab === 'lo') h = '</div><div style="max-width:760px;margin:0 auto">' + T.loreHTML() + '<div>';
      else if (tab === 'sy') h = T.SYN.map(function (x) { return cell(d.syn[x.id], T.Medal('skill', x.need[0], 4, 56), x.n, x.d); }).join('') + T.RCOMBO.map(function (x) { return cell(false, '', x.n, x.d, '<span class="mut">' + T.RELI[x.a].n + ' + ' + T.RELI[x.b].n + '</span>').replace('???', x.n).replace('Não descoberto', x.d); }).join('');
      else if (tab === 'en') h = Object.keys(T.EN).filter(function (k) { return T.EN[k].w > 0 || k === 'drake'; }).map(function (k) { var e = T.EN[k], sn = d.seen.e[k]; return cell(sn, '<img src="' + T.thumb(e.kind, 64, e.col + '88') + '" width="64" height="64" style="border-radius:8px">', e.n, 'Vida ' + e.hp + ' · Dano ' + e.dmg); }).join('');
      else h = T.BOSS.map(function (b) { var sn = d.seen.b[b.id]; return cell(sn, '<img src="' + T.thumb(b.kind, 80, b.col + '88') + '" width="80" height="80" style="border-radius:8px">', b.n, 'Vida ' + b.hp + ' · Dano ' + b.dmg); }).join('');
      setHTML(s, head('Coleção') + '<div style="max-width:980px;margin:0 auto"><div class="tabs">' + tabs.map(function (t) { return '<button class="tab ' + (t[0] === tab ? 'on' : '') + '" data-a="ctab" data-v="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div><div class="grid s">' + h + '</div></div>');
    },
    progress: function (s) {
      var d = sv(), h = '';
      h += '<h2 class="ttl" style="font-size:16px">Melhorias permanentes</h2><div class="grid">' + T.UP.map(function (u) { var l = d.up[u.id], c = u.cost(l), mx = l >= u.max; return '<div class="card buy" data-a="up" data-v="' + u.id + '"><b>' + u.n + '</b><span class="mut">' + u.d + '</span>' + bar(l / u.max, 'xp') + '<span>Nível ' + l + '/' + u.max + '</span><span class="btn sm ' + (mx || d.essence < c ? 'dis' : '') + '">' + (mx ? 'Máximo' : c + ' essência') + '</span></div>'; }).join('') + '</div>';
      h += '<h2 class="ttl" style="font-size:16px;margin-top:12px">Torres</h2><div class="grid s">' + T.TWORDER.map(function (k) { var D = T.TW[k], own = d.towers[k] || D.unlock === 0; return '<div class="card ' + (own ? '' : 'buy') + '" data-a="tbuy" data-v="' + k + '">' + T.Medal('tower', k, 1, 48) + '<b>' + D.n + '</b><span class="mut">' + (own ? 'Disponível' : D.unlock + ' essência') + '</span></div>'; }).join('') + '</div>';
      h += '<h2 class="ttl" style="font-size:16px;margin-top:12px">Aparências do herói</h2><div class="grid s">' + Object.keys(T.SKINS).map(function (k) { var S = T.SKINS[k], own = d.skins[k]; return '<div class="card buy ' + (d.skin === k ? 'sel' : '') + '" data-a="skin" data-v="' + k + '"><div style="width:48px;height:48px;border-radius:50%;background:conic-gradient(hsl(' + (S.hue + 350) + ',70%,45%),hsl(' + (S.hue + 30) + ',70%,25%),hsl(' + (S.hue + 350) + ',70%,45%))"></div><b>' + S.n + '</b><span class="mut">' + (own ? (d.skin === k ? 'Equipada' : 'Equipar') : S.cost + ' essência') + '</span></div>'; }).join('') + '</div>';
      h += '<h2 class="ttl" style="font-size:16px;margin-top:12px">Estatísticas gerais</h2><div class="sums">' + [['Expedições', d.games], ['Vitórias', d.wins], ['Abates', d.kills], ['Chefes', d.bosses], ['Onda máxima', d.maxWave], ['Nível máximo', d.maxLevel], ['Torres', d.towersBuilt], ['Tempo', Math.floor(d.time / 60) + ' min'], ['Recorde', T.fmt(d.best)]].map(function (x) { return '<div>' + x[0] + '<b>' + x[1] + '</b></div>'; }).join('') + '</div>';
      setHTML(s, head('Progressão') + '<div style="max-width:980px;margin:0 auto">' + h + '</div>');
    },
    achv: function (s) {
      var d = sv(), n = 0; T.ACH.forEach(function (a) { if (d.ach[a.id]) n++; });
      setHTML(s, head('Conquistas') + '<div style="max-width:720px;margin:0 auto" class="col"><div class="small mut" style="text-align:center">' + n + ' de ' + T.ACH.length + ' conquistadas</div>' + T.ACH.map(function (a) { var ok = d.ach[a.id]; return '<div class="item" style="' + (ok ? 'border-color:#c9a14a' : 'opacity:.6') + '">' + (ok ? Ic('trophy', '#f0d78a', 30) : Ic('lock', '#7a6a50', 30)) + '<div class="grow"><b class="' + (ok ? 'gold' : '') + '">' + a.n + '</b><div class="desc">' + a.d + '</div></div><span class="chip ess">' + Ic('shard', '#c79bff', 14) + '+' + a.rw + '</span></div>'; }).join('') + '</div>');
    },
    settings: function (s) {
      var d = sv(), st = d.set;
      setHTML(s, head('Configurações') + '<div style="max-width:720px;margin:0 auto" class="col"><div class="pn col"><b class="gold" style="letter-spacing:.14em">Qualidade gráfica</b>' + ['Econômico', 'Equilibrado', 'Alto'].map(function (n, i) { return '<button class="q-opt ' + (st.q === i ? 'on' : '') + '" data-a="q" data-v="' + i + '"><b>' + n + '</b><span class="small mut">' + QDESC[i] + '</span></button>'; }).join('') +
        '<label class="row small"><input type="checkbox" id="autoq" ' + (st.autoq ? 'checked' : '') + ' style="width:22px;height:22px"> Ajuste automático quando o FPS cair (nunca sobe sozinho)</label><label class="row small"><input type="checkbox" id="showfps" ' + (st.fps ? 'checked' : '') + ' style="width:22px;height:22px"> Mostrar FPS</label></div>' +
        '<div class="pn col"><b class="gold" style="letter-spacing:.14em">Áudio e câmera</b><label class="small">Volume geral<input type="range" id="vol" min="0" max="1" step=".05" value="' + st.vol + '"></label><label class="small">Música<input type="range" id="mus" min="0" max="1" step=".05" value="' + st.music + '"></label><label class="small">Efeitos sonoros<input type="range" id="sfxv" min="0" max="1" step="1" value="' + st.sfx + '"></label><label class="small">Interface e cartas<input type="range" id="uiv" min="0" max="1" step=".05" value="' + (st.ui == null ? 1 : st.ui) + '"></label><label class="small">Tremor de tela<input type="range" id="shk" min="0" max="1" step=".25" value="' + st.shake + '"></label></div>' +
        '<div class="pn col"><b class="gold" style="letter-spacing:.14em">Acessibilidade e efeitos</b><label class="small">Intensidade dos efeitos<input type="range" id="fxi" min=".25" max="1" step=".25" value="' + (st.fxi == null ? 1 : st.fxi) + '"></label><label class="row small"><input type="checkbox" id="flashr" ' + (st.flash ? 'checked' : '') + ' style="width:22px;height:22px"> Reduzir flashes de luz</label><label class="row small"><input type="checkbox" id="still" ' + (st.still ? 'checked' : '') + ' style="width:22px;height:22px"> Reduzir movimento de fundo (névoa, clima, parallax)</label><label class="row small"><input type="checkbox" id="zfx" ' + (st.zoomfx == null || st.zoomfx ? 'checked' : '') + ' style="width:22px;height:22px"> Efeitos de zoom da câmera</label></div>' +
        '<div class="pn col"><b class="gold" style="letter-spacing:.14em">Dados salvos</b><div class="row"><button class="btn sm grow" data-a="exp">Exportar backup</button><button class="btn sm grow" data-a="imp">Importar backup</button></div><textarea id="bk" placeholder="O backup aparece aqui. Para importar, cole o texto e toque em Importar."></textarea><button class="btn sm" data-a="reset" style="border-color:#9a1f2e;color:#ff8a8a">Apagar todo o progresso</button></div></div>');
      function bindR(id, f) { var e = $(id); e.oninput = function () { f(+e.value); T.Audio.apply(); T.Save.save(); }; }
      bindR('vol', function (v) { st.vol = v; }); bindR('mus', function (v) { st.music = v; }); bindR('sfxv', function (v) { st.sfx = v; }); bindR('shk', function (v) { st.shake = v; }); bindR('uiv', function (v) { st.ui = v; }); bindR('fxi', function (v) { st.fxi = v; });
      $('flashr').onchange = function () { st.flash = this.checked ? 1 : 0; T.Save.save(); }; $('still').onchange = function () { st.still = this.checked ? 1 : 0; T.Save.save(); }; $('zfx').onchange = function () { st.zoomfx = this.checked ? 1 : 0; T.Save.save(); };
      $('autoq').onchange = function () { st.autoq = this.checked ? 1 : 0; T.Save.save(); }; $('showfps').onchange = function () { st.fps = this.checked ? 1 : 0; T.Save.save(); };
    },
    credits: function (s) {
      setHTML(s, head('Créditos') + '<div class="pn col" style="max-width:640px;margin:0 auto;text-align:center;line-height:1.6"><div class="logo"><h1 style="font-size:clamp(30px,9vw,60px)">NOCTARIA</h1><h2>THE LAST KEEP</h2></div><div>Design, código, arte procedural e música gerada por código.</div><div class="mut small">Nenhum recurso externo: todas as imagens são desenhadas em Canvas/SVG e todos os sons são sintetizados (WebAudio). Nenhum personagem ou arte de jogos comerciais foi copiado.</div><div class="mut small">Tudo funciona offline. Os dados ficam só neste aparelho.</div></div>');
    }
  };

  /* ---------- Ações (delegação de cliques) ---------- */
  U.act = {
    go: function (v) { U.go(v); }, map: function (v) { var d = sv(); if (!d.maps[v]) { var c = T.MAPS[v].unlock; if (d.essence >= c) { d.essence -= c; d.maps[v] = 1; toast('Mapa desbloqueado!'); } else { toast('Essência insuficiente'); return; } } d.lastMap = v; U.go('setup'); },
    start: function () { U.startRun(); },
    hnav: function (v) { U.go('heroes', (U.hi + (+v) + 6) % 6); }, hset: function (v) { U.go('heroes', +v); },
    hart: function (v) { if (T.Ult.owned(v)) T.Ult.toggle(v); else if (!T.Ult.buy(v)) { toast('Essência insuficiente'); return; } U.go('heroes', U.hi); },
    hpick: function (v) { sv().lastClass = v; toast(T.CLS[v].n + ' selecionado'); U.go('heroes', U.hi); },
    hbuy: function (v) { var d = sv(), c = T.CLS[v].unlock; if (d.essence >= c) { d.essence -= c; d.classes[v] = 1; d.lastClass = v; toast(T.CLS[v].n + ' desbloqueado!'); T.Audio.sfx('win'); U.go('heroes', U.hi); } else toast('Essência insuficiente'); },
    ctab: function (v) { U.go('collection', v); },
    up: function (v) { var d = sv(), u = T.UP.filter(function (x) { return x.id === v; })[0], l = d.up[v], c = u.cost(l); if (l >= u.max) return; if (d.essence < c) { toast('Essência insuficiente'); return; } d.essence -= c; d.up[v]++; T.Audio.sfx('pick'); U.go('progress'); },
    tbuy: function (v) { var d = sv(), D = T.TW[v]; if (d.towers[v] || D.unlock === 0) return; if (d.essence < D.unlock) { toast('Essência insuficiente'); return; } d.essence -= D.unlock; d.towers[v] = 1; T.Audio.sfx('pick'); U.go('progress'); },
    skin: function (v) { var d = sv(), S = T.SKINS[v]; if (!d.skins[v]) { if (d.essence < S.cost) { toast('Essência insuficiente'); return; } d.essence -= S.cost; d.skins[v] = 1; } d.skin = v; U.go('progress'); },
    q: function (v) { sv().set.q = +v; T.qEff = null; T.Main.applyQuality(); U.go('settings'); },
    exp: function () { var t = T.Save.exportText(); $('bk').value = t; try { var b = new Blob([t], { type: 'application/json' }), a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'noctaria-backup.json'; document.body.appendChild(a); a.click(); a.remove(); } catch (e) { } toast('Backup gerado'); },
    imp: function () { try { T.Save.importText($('bk').value.trim()); toast('Backup importado!'); T.Main.applyQuality(); U.go('settings'); } catch (e) { toast('Backup inválido'); } },
    reset: function () { if (confirm('Apagar TODO o progresso? Isso não pode ser desfeito.')) { T.Save.reset(); toast('Progresso apagado'); U.go('menu'); } },
    resume: function () { T.Run.pause(false); }, quit: function () { if (confirm('Abandonar a expedição?')) { U.closePanel(); G.state = 'play'; T.Run.end(false, 'quit'); } },
    menu: function () { U.go('menu'); }, again: function () { U.startRun(); },
    heroesEnd: function () { U.go('heroes'); },
    build: function (v) { U.closePanel(); T.Run.selectBuild(v); }, tup: function (v) { var t = G.towers[+v]; if (t) { T.Towers.upgrade(t); U.panel('upg'); } }, tsell: function (v) { var t = G.towers[+v]; if (t) { T.Towers.sell(t); U.panel('upg'); } }, trep: function (v) { var t = G.towers[+v]; if (t) { T.Towers.repair(t); U.panel('upg'); } },
    pick: function (v) { I.chooseSkill(v); }, relic: function (v) { I.chooseRelic(v); }, skip: function () { I.skipReward(); },
    ptab: function (v) { U.panel('inv', v); }, pot: function () { T.Run.usePotion(); U.panel('inv', 'cons'); },
    cancelBuild: function () { G.build = null; U.hud(); }, closep: function () { U.closePanel(); },
    sup: function () { I.upgradeSel && I.upgradeSel(); }, cardup: function () { if (G.sel) T.Towers.upgrade(G.sel.ref); }, cardsell: function () { if (G.sel) T.Towers.sell(G.sel.ref); }, cardrep: function () { if (G.sel) T.Towers.repair(G.sel.ref); }, cardclose: function () { G.sel = null; U.sel(); }
  };
  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-a]') : null; if (!el || el.classList.contains('dis')) return;
    var f = U.act[el.getAttribute('data-a')]; if (f) { click(); f(el.getAttribute('data-v')); }
  });

  /* ---------- Partida ---------- */
  U.startRun = function () {
    var d = sv(); if (!d.classes[d.lastClass]) d.lastClass = 'knight'; if (!d.maps[d.lastMap]) d.lastMap = 'forest';
    T.Audio.init(); T.Preview.stop(); T.MenuBG.stop(); $('scr').classList.add('hidden'); $('menubg').classList.add('hidden'); $('game').classList.remove('hidden'); $('hud').classList.remove('hidden'); $('ov').classList.add('hidden'); U.closePanel();
    T.qEff = null; T.Run.start(d.lastClass, d.lastMap); T.Main.applyQuality(true);
  };
  U.runStart = function () {
    var C = G.cls; $('hPortrait').src = T.portrait(G.clsId, 96); $('hName').textContent = C.n; $('btnSpec').style.setProperty('--hc', C.col);
    $('btnSpec').innerHTML = '<span class="cd" id="specCd"></span>' + Ic(T.iconFor('hero', G.clsId), '#f0d78a', 34) + '<span id="specT"></span>'; $('btnEx').innerHTML = '<span class="cd" id="exCd"></span>' + T.Exc.svg() + '<span id="exT"></span>'; $('btnEx').style.setProperty('--ac', 'rgb(' + T.Exc.art().c.join(',') + ')'); $('btnEx').title = T.Exc.art().n; $('btnPot').innerHTML = Ic('potion', '#ff8a9a', 26) + '<b id="potN">0</b>'; $('btnPause').innerHTML = Ic('pause', '#f0d78a', 22);
    $('enBox').innerHTML = Ic('skull', '#d9d2b8', 16) + '<span id="enN">0</span>'; $('goldN').innerHTML = Ic('coin', '#f0d78a', 16) + '<span id="gN">0</span>'; $('fragN').innerHTML = Ic('shard', '#c79bff', 16) + '<span id="fN">0</span>';
    $('menubar').innerHTML = [['build', 'Construir', 'tower'], ['upg', 'Melhorias', 'up'], ['inv', 'Inventário', 'bag'], ['rel', 'Relíquias', 'gem'], ['hero', 'Herói', 'helm']].map(function (b) { return '<button class="mbt" data-p="' + b[0] + '">' + Ic(b[2], '#e9e2d2', 22) + '<span>' + b[1] + '</span></button>'; }).join('');
    U.last = {}; U.hud(true); U.sel();
  };
  function setT(id, v) { var e = $(id); if (e && U.last[id] !== v) { U.last[id] = v; e.textContent = v; } }
  function setS(id, p) { var e = $(id); if (!e) return; var v = Math.round(Math.max(0, Math.min(1, p)) * 200) / 200; if (U.last[id] !== v) { U.last[id] = v; e.style.transform = 'scaleX(' + v + ')'; } }
  U.hud = function (force) {
    if (!G.hero || !G.cls || $('hud').classList.contains('hidden')) return; var H = G.hero, B = G.base;
    setT('wN', 'ONDA ' + Math.max(1, G.wave) + (G.waveBoss ? ' · CHEFE' : '')); setT('wT', T.time(G.t)); setS('wBar', G.waveBoss && G.boss && G.boss.on ? 1 : G.waveT / G.waveLen);
    setT('enN', G.alive + ''); setT('gN', T.fmt(G.coins)); setT('fN', G.frag + '');
    setT('hHpT', Math.ceil(H.hp) + '/' + H.max); setS('hHp', H.hp / H.max); setS('hXp', G.xp / G.need); setT('lvl', 'Nv ' + G.lvl); setS('cHp', B.hp / B.max); setS('cSh', B.shield > 0 ? Math.min(1, B.shield / 300) : 0); setT('cT', 'Núcleo ' + Math.ceil(B.hp) + (B.shield > 0 ? ' +' + Math.ceil(B.shield) : ''));
    var sp = $('btnSpec'), cd = $('specCd'), ready = H.spT <= 0; if (U.last.ready !== ready) { U.last.ready = ready; sp.classList.toggle('ready', ready); }
    if (cd) { var ch = ready ? 0 : Math.round(H.spT / H.spMax * 100); if (U.last.cd !== ch) { U.last.cd = ch; cd.style.height = ch + '%'; setT('specT', ready ? '' : Math.ceil(H.spT) + ''); } }
    if (G.exc) { var ex = $('btnEx'), er = G.exc.cd <= 0 && !(G.exc.cast && !G.exc.cast.rel); if (U.last.er !== er) { U.last.er = er; ex.classList.toggle('ready', er); } var ec = $('exCd'); if (ec) { var cp = G.exc.cd <= 0 ? 0 : Math.round(G.exc.cd / T.EXC.cd * 100); if (U.last.ecd !== cp) { U.last.ecd = cp; ec.style.height = cp + '%'; } var es = Math.ceil(G.exc.cd); setT('exT', es > 0 ? Math.floor(es / 60) + ':' + ('0' + (es % 60)).slice(-2) : ''); } }
    setT('potN', G.potions + ''); var bb = $('bossBar'); if (G.boss && G.boss.on) { bb.classList.remove('hidden'); setT('bossName', G.boss.def.n + ' — Fase ' + (G.boss.phase + 1)); setS('bossHp', G.boss.hp / G.boss.max); } else bb.classList.add('hidden');
    var h = $('hint'); if (G.build) { var key = 'h' + G.build; if (U.last.hint !== key) { U.last.hint = key; h.innerHTML = 'Toque no mapa para construir: <b class="gold">' + T.TW[G.build].n + '</b> <button class="btn sm" data-a="cancelBuild">Cancelar</button>'; } h.classList.remove('hidden'); } else { U.last.hint = null; h.classList.add('hidden'); }
    if (G.sel && (force || U.last.coins !== G.coins)) { U.last.coins = G.coins; U.sel(true); }
    var f = $('fps'); if (sv().set.fps) { f.classList.remove('hidden'); f.textContent = Math.round(T.Main.fps) + ' fps · q' + T.qIdx() + ' · ' + G.alive + ' inim'; } else f.classList.add('hidden');
  };
  U.sel = function (keep) {
    var c = $('towerCard'); if (!G.sel || !G.sel.ref || G.towers.indexOf(G.sel.ref) < 0) { G.sel = null; c.classList.add('hidden'); return; }
    var t = G.sel.ref, D = T.TW[t.type], S = T.Towers.stats(t), up = t.lv < T.Towers.MAXLV, uc = T.Towers.upCost(t), rc = T.Towers.repairCost(t);
    c.classList.remove('hidden');
    c.innerHTML = '<div class="row">' + T.Medal('tower', t.type, Math.min(5, t.lv), 44) + '<div class="grow"><b class="gold">' + D.n + '</b> <span class="mut small">Nv ' + t.lv + '/' + T.Towers.MAXLV + '</span><div class="small mut">' + D.d + '</div></div><button class="ib" data-a="cardclose" style="width:34px;height:34px">' + Ic('close', '#f0d78a', 16) + '</button></div>' +
      bar(t.hp / t.max) + '<div class="sums" style="grid-template-columns:repeat(3,1fr);margin:6px 0"><div>Dano<b>' + (D.dmg ? Math.round(S.dmg * 10) / 10 : '—') + '</b></div><div>Alcance<b>' + Math.round(S.rng) + '</b></div><div>Cadência<b>' + (Math.round(S.rate * 100) / 100) + '/s</b></div></div>' +
      '<div class="row"><button class="btn sm grow ' + (up && G.coins >= uc ? '' : 'dis') + '" data-a="cardup">' + (up ? 'Melhorar ' + uc : 'Nível máx.') + '</button>' + (rc ? '<button class="btn sm ' + (G.coins >= rc ? '' : 'dis') + '" data-a="cardrep">Reparar ' + rc + '</button>' : '') + (T.Extra ? T.Extra.fuseBtn(t) : '') + '<button class="btn sm" data-a="cardsell">Vender ' + T.Towers.sellValue(t) + '</button></div>';
  };
  U.banner = function (t, s, col, cls) { var b = $('banner'); b.className = cls || ''; b.classList.add('hidden'); void b.offsetWidth; b.style.color = col || '#e8a93a'; b.firstChild.textContent = t; b.lastChild.textContent = s || ''; b.classList.remove('hidden'); clearTimeout(U.bt); U.bt = setTimeout(function () { b.classList.add('hidden'); }, 2700); };
  U.pause = function (on) {
    if (on) { $('ov').classList.remove('hidden'); setHTML($('ov'), '<div class="pn col" style="width:min(92vw,340px)"><h2 class="ttl">Pausado</h2><button class="btn pri" data-a="resume">Continuar</button><div class="row"><button class="btn sm grow ghost" id="pq">Qualidade: ' + ['Econômico', 'Equilibrado', 'Alto'][sv().set.q] + '</button><button class="btn sm ghost" id="pm">' + (sv().set.music > 0 ? 'Música ✓' : 'Música ✗') + '</button></div><button class="btn ghost" data-a="quit">Abandonar expedição</button></div>'); $('pq').onclick = function () { click(); sv().set.q = (sv().set.q + 1) % 3; T.qEff = null; T.Main.applyQuality(); this.textContent = 'Qualidade: ' + ['Econômico', 'Equilibrado', 'Alto'][sv().set.q]; }; $('pm').onclick = function () { click(); sv().set.music = sv().set.music > 0 ? 0 : 0.5; T.Audio.apply(); this.textContent = sv().set.music > 0 ? 'Música ✓' : 'Música ✗'; }; }
    else $('ov').classList.add('hidden');
  };
  /* ---------- Cartas e recompensas ---------- */
  function synHint(s) { var out = ''; T.SYN.forEach(function (y) { if (G.syn[y.id] || y.need.indexOf(s.id) < 0) return; var others = y.need.filter(function (k) { return k !== s.id; }); var have = others.every(function (k) { return G.skills[k]; }); out = have ? '✦ Completa: ' + y.n : (out || '✦ Sinergia secreta'); }); return out; }
  U.showLevel = function (cards, lvl) {
    var ov = $('ov'); ov.classList.remove('hidden'); U.cardsMode = 'lv';
    setHTML(ov, '<div class="lv"><h1 class="ttl">Nível ' + lvl + '</h1><div class="sub">Escolha um poder' + (G.pend > 0 ? ' · +' + G.pend + ' pendente(s)' : '') + '</div><div class="cards">' + cards.map(function (s, i) {
      var R = T.RAR[s.rar], cur = G.skills[s.id] || 0, sh = synHint(s);
      return '<div class="sc r' + s.rar + '" style="--rc:' + R.c + '" data-a="pick" data-v="' + s.id + '"><span class="key">' + (i + 1) + '</span>' + (cur ? '' : '<span class="nw">NOVO</span>') + T.Medal('skill', s.id, s.rar, 58) + '<div class="info"><div class="rar">' + R.n + ' · ' + T.CAT[s.cat] + '</div><b>' + s.name + '</b><div class="lvl">Nível ' + (cur + 1) + '/' + s.max + '</div></div><div class="d">' + s.desc + '</div>' + (sh ? '<div class="syn">' + sh + '</div>' : '') + '</div>';
    }).join('') + '</div></div>');
  };
  U.hideLevel = function () { $('ov').classList.add('hidden'); U.cardsMode = null; };
  U.showReward = function (title, opts) {
    var ov = $('ov'); ov.classList.remove('hidden'); U.cardsMode = 'rw';
    setHTML(ov, '<div class="lv"><h1 class="ttl">' + title + '</h1><div class="sub">Escolha uma relíquia (' + G.relics.length + '/' + G.P.slots + ' espaços)</div><div class="cards">' + opts.map(function (r, i) {
      var R = T.RAR[r.rar]; return '<div class="sc r' + r.rar + '" style="--rc:' + R.c + '" data-a="relic" data-v="' + r.id + '"><span class="key">' + (i + 1) + '</span>' + T.Medal('relic', r.id, r.rar, 58) + '<div class="info"><div class="rar">' + R.n + ' · Relíquia</div><b>' + r.n + '</b></div><div class="d">' + r.d + '</div></div>';
    }).join('') + '</div><button class="btn ghost sm" style="margin-top:12px" data-a="skip">Recusar (+5 essência)</button></div>');
  };
  U.hideReward = function () { $('ov').classList.add('hidden'); U.cardsMode = null; };
  U.key = function (n) { if (U.cardsMode === 'lv' && G.cards && G.cards[n]) I.chooseSkill(G.cards[n].id); else if (U.cardsMode === 'rw' && G.rewardOpts && G.rewardOpts[n]) I.chooseRelic(G.rewardOpts[n].id); };
  U.showEnd = function () {
    var S = G.sum, ov = $('ov'); ov.classList.remove('hidden'); U.cardsMode = null;
    setHTML(ov, '<div class="pn end ' + (S.win ? 'win' : 'lose') + ' col"><h1>' + (S.win ? 'Vitória' : 'Derrota') + '</h1><div class="small mut" style="text-align:center">' + (S.win ? 'A fortaleza resistiu à noite.' : S.why === 'base' ? 'O núcleo foi destruído.' : S.why === 'quit' ? 'Expedição abandonada.' : 'O herói caiu.') + '</div>' +
      '<div class="sums">' + [['Pontuação', T.fmt(S.score) + (S.best ? ' ★' : '')], ['Tempo', T.time(S.time)], ['Onda', S.wave], ['Nível', S.lvl], ['Abates', S.kills], ['Chefes', S.boss], ['Torres', S.towers], ['Sinergias', S.syn], ['Dano herói', T.fmt(S.dmg)], ['Dano torres', T.fmt(S.tdmg)], ['Ouro gasto', T.fmt(S.spent)], ['Essência', '+' + S.ess]].map(function (x) { return '<div>' + x[0] + '<b>' + x[1] + '</b></div>'; }).join('') + '</div>' +
      (S.ach.length ? '<div class="col">' + S.ach.map(function (a) { return '<div class="item" style="border-color:#c9a14a">' + Ic('trophy', '#f0d78a', 26) + '<div class="grow"><b class="gold">Conquista: ' + a.n + '</b><div class="desc">' + a.d + '</div></div><span class="chip ess">+' + a.rw + '</span></div>'; }).join('') + '</div>' : '') +
      '<button class="btn pri" data-a="again">Jogar novamente</button><div class="row"><button class="btn ghost grow" data-a="heroesEnd">Personagens</button><button class="btn ghost grow" data-a="menu">Menu</button></div></div>');
  };
  /* ---------- Painéis inferiores ---------- */
  U.closePanel = function () { var p = $('panel'); p.classList.add('hidden'); p.innerHTML = ''; U.ptype = null; document.querySelectorAll('.mbt.on').forEach(function (b) { b.classList.remove('on'); }); if (G.state === 'panel') G.state = 'play'; };
  U.panel = function (type, arg) {
    if (G.state !== 'play' && G.state !== 'panel') return; var p = $('panel'), h = '', d = sv();
    if (U.ptype === type && arg == null && !p.classList.contains('hidden') && U.pjust !== type) { U.closePanel(); return; }
    U.ptype = type; G.state = 'panel'; var top = '<div class="row" style="margin-bottom:8px"><h2 class="ttl grow" style="margin:0;text-align:left">';
    if (type === 'build') {
      h = top + 'Construir</h2><span class="chip gold">' + Ic('coin', '#f0d78a', 16) + T.fmt(G.coins) + '</span><button class="ib" data-a="closep" style="width:38px;height:38px">' + Ic('close', '#f0d78a', 16) + '</button></div><div class="grid">' + T.TWORDER.map(function (k) { var D = T.TW[k], own = d.towers[k] || D.unlock === 0, c = T.Towers.cost(k); return '<div class="card buy ' + (own ? '' : 'lk') + '" ' + (own ? 'data-a="build" data-v="' + k + '"' : '') + '>' + T.Medal('tower', k, 1, 46) + '<b>' + D.n + '</b><span class="mut">' + D.d + '</span><span class="small">Dano ' + D.dmg + ' · Alc. ' + D.rng + ' · ' + (Math.round(1 / D.cd * 100) / 100) + '/s</span>' + (own ? '<span class="chip ' + (G.coins >= c ? 'gold' : '') + '" style="' + (G.coins >= c ? '' : 'color:#ff8a8a') + '">' + Ic('coin', '#f0d78a', 14) + c + '</span>' : '<span class="mut">' + Ic('lock', '#c9a14a', 12) + ' Bloqueada</span>') + '</div>'; }).join('') + '</div>';
    } else if (type === 'upg') {
      h = top + 'Melhorias</h2><span class="chip gold">' + Ic('coin', '#f0d78a', 16) + T.fmt(G.coins) + '</span><button class="ib" data-a="closep" style="width:38px;height:38px">' + Ic('close', '#f0d78a', 16) + '</button></div><div class="col">' + (G.towers.length ? G.towers.map(function (t, i) { var D = T.TW[t.type], up = t.lv < T.Towers.MAXLV, uc = T.Towers.upCost(t), rc = T.Towers.repairCost(t); return '<div class="item">' + T.Medal('tower', t.type, Math.min(5, t.lv), 40) + '<div class="grow"><b>' + D.n + ' <span class="mut small">Nv ' + t.lv + '</span></b>' + bar(t.hp / t.max) + '</div><button class="btn sm ' + (up && G.coins >= uc ? '' : 'dis') + '" data-a="tup" data-v="' + i + '">' + (up ? '↑ ' + uc : 'Máx') + '</button>' + (rc ? '<button class="btn sm ' + (G.coins >= rc ? '' : 'dis') + '" data-a="trep" data-v="' + i + '">+' + rc + '</button>' : '') + '<button class="btn sm ghost" data-a="tsell" data-v="' + i + '">' + T.Towers.sellValue(t) + '</button></div>'; }).join('') : '<div class="mut" style="text-align:center;padding:16px">Nenhuma torre construída. Use “Construir”.</div>') + '</div>';
    } else if (type === 'inv' || type === 'rel') {
      var tab = arg || (type === 'rel' ? 'rel' : 'weap'), tabs = [['weap', 'Armas'], ['rel', 'Relíquias'], ['art', 'Artefatos'], ['mat', 'Materiais'], ['cons', 'Consumíveis']], C = G.cls, P = G.P;
      h = top + (type === 'rel' ? 'Relíquias' : 'Inventário') + '</h2><button class="ib" data-a="closep" style="width:38px;height:38px">' + Ic('close', '#f0d78a', 16) + '</button></div><div class="tabs">' + tabs.map(function (t) { return '<button class="tab ' + (t[0] === tab ? 'on' : '') + '" data-a="ptab" data-v="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div><div class="col">';
      if (tab === 'weap') h += '<div class="item">' + T.Medal('hero', G.clsId, 3, 48) + '<div><b class="gold">' + WEAPON[G.clsId] + '</b><div class="desc">Dano ' + Math.round(C.dmg * P.dmg * 10) / 10 + ' · Cadência ' + Math.round(C.rate * P.rate * 100) / 100 + '/s · Alcance ' + C.rng + ' · Crítico ' + Math.round(P.crit * 100) + '% (x' + Math.round(P.critDmg * 100) / 100 + ') · Projéteis ' + (1 + P.proj) + '</div></div></div>' + '<div class="small mut">Poderes adquiridos</div>' + (Object.keys(G.skills).length ? Object.keys(G.skills).map(function (k) { var s = T.SKI[k]; return '<div class="item">' + T.Medal('skill', k, s.rar, 36) + '<div class="grow"><b>' + s.name + ' <span class="mut small">Nv ' + G.skills[k] + '/' + s.max + '</span></b><div class="desc">' + s.desc + '</div></div></div>'; }).join('') : '<div class="mut small">Nenhum ainda.</div>');
      else if (tab === 'rel') h += '<div class="small mut">Espaços: ' + G.relics.length + '/' + P.slots + '</div>' + (G.relics.length ? G.relics.map(function (k) { var r = T.RELI[k]; return '<div class="item">' + T.Medal('relic', k, r.rar, 44) + '<div><b style="color:' + T.RAR[r.rar].c + '">' + r.n + '</b><div class="desc">' + r.d + '</div></div></div>'; }).join('') : '<div class="mut" style="text-align:center;padding:14px">Nenhuma relíquia. Derrote elites e chefes para encontrar baús.</div>');
      else if (tab === 'art') { var ks = Object.keys(G.syn), rc = Object.keys(G.rcombo); h += (ks.length || rc.length) ? ks.map(function (k) { var y = T.SYN.filter(function (z) { return z.id === k; })[0]; return '<div class="item">' + T.Medal('skill', y.need[0], 4, 40) + '<div><b class="gold">' + y.n + '</b><div class="desc">' + y.d + '</div></div></div>'; }).join('') + rc.map(function (k) { var y = T.RCOMBO.filter(function (z) { return z.id === k; })[0]; return '<div class="item">' + T.Medal('relic', y.a, 4, 40) + '<div><b class="gold">' + y.n + '</b><div class="desc">' + y.d + '</div></div></div>'; }).join('') : '<div class="mut" style="text-align:center;padding:14px">Combine poderes e relíquias para descobrir artefatos de sinergia.</div>'; }
      else if (tab === 'mat') h += '<div class="item">' + Ic('coin', '#f0d78a', 30) + '<div class="grow"><b>Ouro</b><div class="desc">Constrói e melhora torres.</div></div><b class="gold">' + Math.floor(G.coins) + '</b></div><div class="item">' + Ic('shard', '#c79bff', 30) + '<div class="grow"><b>Essência</b><div class="desc">Coletada nesta expedição; vira progresso permanente.</div></div><b style="color:#c79bff">' + G.frag + '</b></div>';
      else h += '<div class="item">' + Ic('potion', '#ff8a9a', 34) + '<div class="grow"><b>Poção de Vida</b><div class="desc">Recupera 40% da vida. Máximo 5.</div></div><b>x' + G.potions + '</b><button class="btn sm ' + (G.potions > 0 && G.hero.hp < G.hero.max ? '' : 'dis') + '" data-a="pot">Usar</button></div>';
      h += '</div>';
    } else if (type === 'hero') {
      var P2 = G.P, C2 = G.cls;
      h = top + C2.n + ' <span class="mut small">' + C2.title + '</span></h2><button class="ib" data-a="closep" style="width:38px;height:38px">' + Ic('close', '#f0d78a', 16) + '</button></div><div class="row"><img src="' + T.portrait(G.clsId, 96) + '" width="76" height="76" style="border:2px solid #c9a14a;border-radius:10px"><div class="small"><b class="gold">' + C2.special + '</b><div class="mut">' + C2.sd + '</div></div></div><div class="sums" style="margin-top:8px">' + [['Vida', Math.ceil(G.hero.hp) + '/' + G.hero.max], ['Dano', Math.round(C2.dmg * P2.dmg * 10) / 10], ['Cadência', Math.round(C2.rate * P2.rate * 100) / 100 + '/s'], ['Crítico', Math.round(P2.crit * 100) + '%'], ['Velocidade', Math.round(C2.spd * (1 + P2.speed))], ['Coleta', Math.round(P2.magnet)], ['Redução dano', Math.round(Math.min(0.7, P2.dr) * 100) + '%'], ['Regeneração', P2.regen.toFixed(1) + '/s'], ['Escudos', P2.shieldN], ['Nível', G.lvl + ' · ' + Math.floor(G.xp) + '/' + G.need + ' XP']].map(function (x) { return '<div>' + x[0] + '<b>' + x[1] + '</b></div>'; }).join('') + '</div>';
    }
    p.innerHTML = '<div class="sheet">' + h + '</div>'; p.classList.remove('hidden');
    document.querySelectorAll('.mbt').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-p') === type || (type === 'inv' && b.getAttribute('data-p') === 'inv')); });
  };
  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('.mbt') : null; if (b) { click(); var t = b.getAttribute('data-p'); if (G.state === 'play' || G.state === 'panel') { G.build = null; U.panel(t); } return; }
    var pn = $('panel'); if (!pn.classList.contains('hidden') && e.target === pn) U.closePanel();
  });
  $('btnSpec').addEventListener('click', function () { T.Audio.init(); T.Run.special(); });
  $('btnPot').addEventListener('click', function () { T.Audio.init(); T.Run.usePotion(); });
  $('btnEx').addEventListener('click', function () { T.Audio.init(); T.Run.excalibur(); });
  /* Multitoque: com o dedo no analógico, o "click" do navegador pode ser descartado; dispara direto no pointerdown. */
  var fired = null;
  document.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse' || !T.Input.joy.on) return;
    var b = e.target.closest ? e.target.closest('#btnSpec,#btnPot,#btnEx,#btnPause,.mbt') : null; if (!b) return;
    fired = { b: b, t: performance.now() }; e.preventDefault(); b.click();
  }, true);
  document.addEventListener('click', function (e) {
    if (fired && performance.now() - fired.t < 700 && e.isTrusted && e.target.closest && e.target.closest('#btnSpec,#btnPot,#btnEx,#btnPause,.mbt') === fired.b) { fired = null; e.stopPropagation(); e.preventDefault(); }
  }, true);
  $('btnPause').addEventListener('click', function () { click(); if (G.state === 'play') { U.closePanel(); T.Run.pause(true); } });
})(window.TD);

'use strict';
/* NOCTARIA — extras: modo infinito + ranking, desafio diário, pontos de interesse, fusão de torres, troféus de chefe,
   dia/noite, apresentação do herói, tutorial, FPS, música dinâmica, carregador de arte (assets/), idioma. */
(function (T) {
  var I = T.int, G = I.G, R = T.R, TAU = T.TAU, FX = T.FX, U = T.UI, Au = T.Audio, X = T.Extra = { night: 0, pois: [] };
  function SV() { return T.Save.d; }
  function ex() { var d = SV(); if (!d.ex) d.ex = {}; var e = d.ex; if (e.tut == null) e.tut = 0; if (!e.daily) e.daily = {}; if (!e.rank) e.rank = []; if (!e.tro) e.tro = {}; if (!e.lang) e.lang = 'pt'; if (e.fps == null) e.fps = 0; return e; }
  function L(pt, en) { return ex().lang === 'en' ? en : pt; }
  function $(id) { return document.getElementById(id); }
  function hex(c) { return '#' + c.map(function (v) { return ('0' + v.toString(16)).slice(-2); }).join(''); }

  /* ---------- Desafio diário ---------- */
  var MUT = [
    { id: 'swarm', n: 'Enxame', d: 'Inimigos 60% mais numerosos e com 35% menos vida', rate: 1.6, hp: 0.65 },
    { id: 'fast', n: 'Pressa Sombria', d: 'Inimigos 25% mais rápidos; ouro em dobro', spd: 1.25, coin: 2 },
    { id: 'glass', n: 'Vidro e Fúria', d: 'Você tem metade da vida e o dobro de dano', glass: 1 },
    { id: 'explode', n: 'Mortos Explosivos', d: 'Inimigos explodem ao morrer — afaste-se!', explode: 1 },
    { id: 'ice', n: 'Reino de Gelo', d: 'Só é possível construir torres de gelo e de apoio', only: ['ice', 'support'] }
  ];
  function dayKey() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function seed(k) { var h = 2166136261; for (var i = 0; i < k.length; i++) { h ^= k.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  X.daily = function () { var k = dayKey(), h = seed(k); return { key: k, cls: T.CLSORDER[h % T.CLSORDER.length], map: T.MAPORDER[(h >> 3) % T.MAPORDER.length], mut: MUT[(h >> 6) % MUT.length] }; };

  /* ---------- Início da expedição ---------- */
  var rs = T.Run.start;
  T.Run.start = function (c, m) {
    var o = X.pending || {}, d = SV(), keepC = d.lastClass, keepM = d.lastMap; X.pending = null;
    if (o.daily) { c = o.daily.cls; m = o.daily.map; }
    rs.call(T.Run, c, m); d.lastClass = keepC; d.lastMap = keepM;
    G.endless = !!o.endless; G.daily = o.daily || null; G.mods = o.daily ? o.daily.mut : null; if (G.endless) G.winWave = 1e9;
    var P = G.P, H = G.hero, tc = 0; Object.keys(ex().tro).forEach(function (k) { tc++; });
    P.dmg *= 1 + 0.02 * tc; P.xp *= 1 + 0.02 * tc; P.coin *= 1 + 0.02 * tc; H.max *= 1 + 0.03 * tc; H.hp = H.max;
    if (G.mods && G.mods.glass) { H.max *= 0.5; H.hp = H.max; P.dmg *= 2; }
    X.pois = []; X.lastW = 0; X.nt = 0; X.ni = 0; X.tipN = 0; X.moved0 = { x: H.x, y: H.y };
    for (var i = 0; i < 3; i++) poiSpawn();
    if (G.daily) I.ui('banner', L('Desafio diário', 'Daily challenge'), G.mods.n + ' — ' + G.mods.d, '#6fe8d0'); else if (G.endless) I.ui('banner', L('Modo infinito', 'Endless mode'), L('Sobreviva o máximo que puder', 'Survive as long as you can'), '#b06aff');
    X.intro(); X.tutStart();
  };
  var re = T.Run.end;
  T.Run.end = function (win) {
    var was = G.state; var r = re.apply(T.Run, arguments); if (was === 'over' || !G.hero) return r; var e = ex(), d = SV();
    if (G.endless) { e.rank.push({ w: G.wave, cls: G.clsId, k: G.kills, d: dayKey() }); e.rank.sort(function (a, b) { return b.w - a.w || b.k - a.k; }); e.rank.length = Math.min(5, e.rank.length); }
    if (G.daily && G.wave >= 10 && !e.daily[G.daily.key]) { e.daily[G.daily.key] = 1; d.essence += 60; U.toast(L('Desafio diário concluído! +60 essência', 'Daily done! +60 essence')); }
    T.Save.save(); return r;
  };
  /* ---------- Gancho de mutações ---------- */
  var tp = T.Towers.place;
  T.Towers.place = function (type, x, y) { if (G.mods && G.mods.only && G.mods.only.indexOf(type) < 0) { I.text(x, y - 10, L('Bloqueado no desafio', 'Blocked in challenge'), '#ff8a8a'); return null; } return tp.call(T.Towers, type, x, y); };
  var se = I.spawnEnemy;
  I.spawnEnemy = function (id, x, y, elite) { var e = se.apply(I, arguments); if (e && G.mods) { if (G.mods.spd) e.spd *= G.mods.spd; if (G.mods.hp) { e.max *= G.mods.hp; e.hp = e.max; } } return e; };
  X.boom = function (x, y) { FX.explosion(x, y, 46, '#ff8a3a'); I.ring(x, y, 70, '#ff8a3a', 0.4); var H = G.hero; if (Math.hypot(H.x - x, H.y - y) < 70 && H.inv <= 0) if (I.hurtHero) I.hurtHero(H.max * 0.06); };

  /* ---------- Fusão de torres ---------- */
  X.fuseTargets = function (t) { return G.towers.filter(function (o) { return o !== t && o.type !== t.type && o.lv >= 2 && Math.hypot(o.x - t.x, o.y - t.y) < 130; }); };
  X.fuseBtn = function (t) { if (t.lv < 2 || t.fuse) return t.fuse ? '<span class="small mut">' + L('Fusão: ', 'Fusion: ') + T.TW[t.fuse].n + '</span>' : ''; var n = X.fuseTargets(t).length; return '<button class="btn sm ' + (n ? '' : 'dis') + '" data-a="cardfuse">' + L('Fundir', 'Fuse') + (n ? ' (' + n + ')' : '') + '</button>'; };
  U.act.cardfuse = function () {
    var t = G.sel && G.sel.ref; if (!t) return; var c = X.fuseTargets(t); if (t.lv < 2 || !c.length) { U.toast(L('Precisa de outra torre de nível 2+ por perto', 'Needs another lvl 2+ tower nearby')); return; }
    var o = c[0]; t.fuse = o.type; t.fuseT = 0; G.coins += Math.floor(T.Towers.sellValue(o) * 0.5); T.Towers.sell(o); G.coins -= T.Towers.sellValue(o) ? 0 : 0;
    FX.runeCircle(t.x, t.y, 70, '#b06aff', 12); I.ring(t.x, t.y, 90, '#fff', 0.5); I.shake(3); I.text(t.x, t.y - 30, L('FUSÃO!', 'FUSION!'), '#d8b0ff', true);
  };
  function fusePulse(t, S) {
    var a = EP(), best = [], rr = (S.rng || 160) * 0.9, i, e;
    for (i = 0; i < a.length; i++) { e = a[i]; if (e.on && (e.x - t.x) * (e.x - t.x) + (e.y - t.y) * (e.y - t.y) < rr * rr) { best.push(e); if (best.length >= 3) break; } }
    var f = t.fuse, d = (S.dmg || 10) * 0.7;
    best.forEach(function (e) {
      if (f === 'fire') { [0.3, 0.8, 1.3].forEach(function (dl) { I.later(dl, function () { if (e.on) { e.txT = 1; I.hurtEnemy(e, d * 0.45, 'dot', false); FX.flame(e.x, e.y, 1, false); } }); }); }
      else if (f === 'ice') { I.freeze(e, 0.8); }
      else if (f === 'elec') { I.lightning(e, d, 3, '#f3e86a'); }
      else if (f === 'poison') { [0.4, 0.9, 1.4, 1.9].forEach(function (dl) { I.later(dl, function () { if (e.on) { e.txT = 1; I.hurtEnemy(e, d * 0.3, 'dot', false); } }); }); }
      else if (f === 'cannon') { FX.explosion(e.x, e.y, 30, '#ffb060'); I.hurtEnemy(e, d, 't', false); }
      else if (f === 'sniper') { I.zap(t.x, t.y - 10, e.x, e.y - 6, '#ff8a8a', 0.15); I.hurtEnemy(e, d * 2, 't', true); }
      else { FX.sparks(e.x, e.y, 5, '#c8a0ff', 120); I.hurtEnemy(e, d, 't', false); }
    });
  }
  function EP() { return T.pools.EP.a; }

  /* ---------- Pontos de interesse ---------- */
  var POI = { altar: { c: '#ff5a5a', n: 'Altar sombrio' }, chest: { c: '#ffd24a', n: 'Baú' }, fountain: { c: '#6ac8ff', n: 'Fonte' }, shrine: { c: '#b06aff', n: 'Santuário' } };
  function poiSpawn() {
    var B = G.base, k = T.pick(['altar', 'chest', 'fountain', 'shrine']), x, y, tries = 0;
    do { var a = R(0, TAU), d = R(420, 900); x = B.x + Math.cos(a) * d; y = B.y + Math.sin(a) * d; tries++; } while ((x < 160 || y < 160 || x > T.W - 160 || y > T.W - 160) && tries < 30);
    X.pois.push({ k: k, x: x, y: y, used: 0, t: 0 });
  }
  function poiUse(p) {
    p.used = 1; var H = G.hero, w = G.wave, id = G.runId; FX.runeCircle(p.x, p.y, 60, POI[p.k].c, 10); I.ring(p.x, p.y, 90, POI[p.k].c, 0.6); I.shake(2);
    if (p.k === 'altar') {
      I.text(p.x, p.y - 30, L('Altar: +25% dano, mas algo desperta!', 'Altar: +25% damage, but something stirs!'), '#ff8a8a', true); G.P.dmg *= 1.25; I.later(40, function () { if (G.runId === id) G.P.dmg /= 1.25; });
      var ids = Object.keys(T.EN).filter(function (k) { return T.EN[k].w > 0; }); for (var i = 0; i < 5 + Math.min(6, w); i++) { var a = i * TAU / 6; I.spawnEnemy(ids[i % ids.length], p.x + Math.cos(a) * 140, p.y + Math.sin(a) * 140, i === 0); }
    } else if (p.k === 'chest') {
      if (Math.random() < 0.3) { I.text(p.x, p.y - 30, L('Era uma armadilha!', 'It was a trap!'), '#ff8a8a', true); for (i = 0; i < 4; i++) I.spawnEnemy('wraith', p.x + R(-90, 90), p.y + R(-90, 90), i === 0); }
      G.coins += 60 + w * 15; I.text(p.x, p.y - 20, '+' + (60 + w * 15), '#ffd24a', true); if (Math.random() < 0.25) { G.potions++; I.text(p.x, p.y - 44, L('+1 poção', '+1 potion'), '#ff8aa8'); }
    } else if (p.k === 'fountain') { I.heal(H.max); G.base.hp = Math.min(G.base.max, G.base.hp + G.base.max * 0.25); I.text(p.x, p.y - 30, L('Fonte: vida restaurada', 'Fountain: health restored'), '#6ac8ff', true); FX.heal(p.x, p.y, 20, '#8ad8ff'); }
    else { I.addXp(G.need * 0.8); I.text(p.x, p.y - 30, L('Santuário: experiência!', 'Shrine: experience!'), '#c8a0ff', true); }
    try { T.Audio.rarity(p.k === 'altar' ? 3 : 2); } catch (e) { }
  }
  function drawPOI(c, S, cx0, cy0, cw, ch) {
    var t = G.t, i, p;
    c.setTransform(S, 0, 0, S, -cx0 * S, -cy0 * S); c.globalCompositeOperation = 'lighter';
    for (i = 0; i < X.pois.length; i++) {
      p = X.pois[i]; var col = POI[p.k].c, pu = 0.6 + 0.4 * Math.sin(t * 3 + i), fd = p.used ? Math.max(0, 1 - p.t / 1.2) : 1; if (fd <= 0) continue;
      var g = c.createRadialGradient(p.x, p.y, 2, p.x, p.y, 46); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); c.globalAlpha = 0.45 * pu * fd; c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, 46, 0, TAU); c.fill();
      c.globalAlpha = fd; c.strokeStyle = col; c.lineWidth = 2; c.beginPath(); c.ellipse(p.x, p.y + 6, 26 + pu * 3, 12 + pu * 2, 0, 0, TAU); c.stroke();
      c.fillStyle = col; c.beginPath();
      if (p.k === 'altar') { c.moveTo(p.x, p.y - 22); c.lineTo(p.x + 12, p.y + 4); c.lineTo(p.x - 12, p.y + 4); c.closePath(); }
      else if (p.k === 'chest') { c.rect(p.x - 12, p.y - 10, 24, 16); }
      else if (p.k === 'fountain') { c.arc(p.x, p.y - 6, 9, 0, TAU); }
      else { c.moveTo(p.x, p.y - 24); c.lineTo(p.x + 8, p.y - 8); c.lineTo(p.x, p.y + 6); c.lineTo(p.x - 8, p.y - 8); c.closePath(); }
      c.fill(); c.globalAlpha = 1;
    }
    c.globalCompositeOperation = 'source-over';
    /* setas de borda para o ponto mais próximo */
    c.setTransform(1, 0, 0, 1, 0, 0); var H = G.hero, best = null, bd = 1e9;
    for (i = 0; i < X.pois.length; i++) { p = X.pois[i]; if (p.used) continue; var d = Math.hypot(p.x - H.x, p.y - H.y); if (d < bd) { bd = d; best = p; } }
    if (best) { var sx = (best.x - cx0) * S, sy = (best.y - cy0) * S; if (sx < 30 || sy < 30 || sx > cw - 30 || sy > ch - 30) { var a = Math.atan2(best.y - H.y, best.x - H.x), ex = cw / 2 + Math.cos(a) * (cw / 2 - 34), ey = ch / 2 + Math.sin(a) * (ch / 2 - 90); ex = Math.max(26, Math.min(cw - 26, ex)); ey = Math.max(70, Math.min(ch - 110, ey)); c.save(); c.translate(ex, ey); c.rotate(a); c.globalAlpha = 0.85; c.fillStyle = POI[best.k].c; c.beginPath(); c.moveTo(12, 0); c.lineTo(-8, -8); c.lineTo(-4, 0); c.lineTo(-8, 8); c.closePath(); c.fill(); c.restore(); c.globalAlpha = 1; } }
  }
  X.draw = function (c, S, cx0, cy0, cw, ch, q) {
    if (!G.hero || G.state === 'menu') return;
    if (X.night > 0.02) { c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 0.2 * X.night; c.fillStyle = '#0a1646'; c.fillRect(0, 0, cw, ch); c.globalAlpha = 1; }
    drawPOI(c, S, cx0, cy0, cw, ch);
  };

  /* ---------- Troféus de chefe ---------- */
  var TRO = ['Coroa de Ossos', 'Olho do Abismo', 'Coração de Brasa', 'Lágrima do Gelo Eterno', 'Fragmento do Vazio'];
  X.trophy = function (def) {
    var i = T.BOSS.indexOf(def), e = ex(), key = def.id; if (e.tro[key]) { G.coins += 120; return; } e.tro[key] = 1; T.Save.save();
    I.ui('banner', L('Troféu obtido!', 'Trophy obtained!'), TRO[i % TRO.length] + ' — ' + L('+2% dano, XP, ouro e +3% vida (permanente)', '+2% dmg/XP/gold, +3% HP (permanent)'), '#ffb43a');
    if (T.VFX) T.VFX.play('ui', 'rarity', G.hero.x, G.hero.y - 10, { r: 4 }); try { T.Audio.rarity(4); } catch (e2) { }
  };
  X.trophyHTML = function () {
    var e = ex(); return '<div class="small mut" style="margin-bottom:6px">' + L('Cada chefe derrotado pela primeira vez deixa um troféu com bônus permanente (+2% dano, XP e ouro; +3% vida).', 'Each boss defeated for the first time leaves a trophy with a permanent bonus.') + '</div><div class="grid">' + T.BOSS.map(function (b, i) {
      var own = e.tro[b.id]; return '<div class="card ' + (own ? '' : 'lk') + '" style="' + (own ? 'border-color:#ffb43a;box-shadow:0 0 14px #ffb43a55 inset' : '') + '"><div style="font-size:30px;text-align:center;color:' + (own ? b.col : '#4a3c28') + '">' + (own ? '♛' : '?') + '</div><b class="gold" style="font-size:13px">' + (own ? TRO[i % TRO.length] : '???') + '</b><div class="small mut">' + (own ? L('Dropado por ', 'Dropped by ') + b.n : L('Derrote o chefe da onda ', 'Defeat the boss of wave ') + ((i + 1) * 5)) + '</div></div>';
    }).join('') + '</div>';
  };

  /* ---------- Apresentação do herói ---------- */
  var QUOTE = { knight: ['Enquanto houver um muro, haverá um motivo para lutar.', 'While a wall stands, there is a reason to fight.'], mage: ['O Vazio sussurra. Eu aprendi a responder.', 'The Void whispers. I learned to answer.'], archer: ['Uma flecha, um fôlego, um destino.', 'One arrow, one breath, one fate.'], necro: ['Os mortos não esquecem — e eu os convoco.', 'The dead do not forget — and I call them.'], paladin: ['A luz não pede licença para entrar.', 'Light does not ask leave to enter.'], assassin: ['Nas sombras, até o medo tem nome.', 'In the shadows, even fear has a name.'] };
  X.intro = function () {
    var C = T.CLS[G.clsId], q = QUOTE[G.clsId], el = $('intro'); if (!el) { el = document.createElement('div'); el.id = 'intro'; document.body.appendChild(el); }
    el.innerHTML = '<img src="' + T.portrait(G.clsId, 160) + '"><div><b>' + C.n + '</b><span>' + C.cls + '</span><i>“' + (ex().lang === 'en' ? q[1] : q[0]) + '”</i></div>'; el.className = 'show'; clearTimeout(X.it); X.it = setTimeout(function () { el.className = ''; }, 3400); el.onclick = function () { el.className = ''; };
  };

  /* ---------- Tutorial ---------- */
  var TIPS = [
    ['Arraste o dedo na tela (ou use WASD) para mover o herói', 'Drag on the screen (or use WASD) to move your hero', function () { return Math.hypot(G.hero.x - X.moved0.x, G.hero.y - X.moved0.y) > 120; }],
    ['Abra CONSTRUIR no menu de baixo e toque no mapa para colocar uma torre', 'Open BUILD in the bottom menu and tap the map to place a tower', function () { return G.towers.length > 0; }],
    ['Use a habilidade especial: botão grande (ou Espaço)', 'Use your special: big button (or Space)', function () { return (G.stats.specials || 0) >= 1; }],
    ['Mate monstros, colete o XP e escolha uma carta de poder ao subir de nível', 'Kill monsters, collect XP and pick a power card when you level up', function () { return G.lvl >= 2; }],
    ['O botão do artefato (ou tecla E) libera um ataque devastador. Recarrega em 2 minutos!', 'The artifact button (or key E) unleashes a devastating attack. 2-minute cooldown!', function () { return G.exc && (G.exc.cd > 100 || G.exc.cast); }]
  ];
  X.tutStart = function () { var e = ex(); X.tip = e.tut ? -1 : 0; X.tipUpd(); };
  X.tipUpd = function () {
    var el = $('tips'); if (!el) { el = document.createElement('div'); el.id = 'tips'; el.onclick = function (ev) { if (ev.target.tagName === 'BUTTON') { ex().tut = 1; T.Save.save(); X.tip = -1; X.tipUpd(); } }; document.body.appendChild(el); }
    if (X.tip < 0 || !G.hero || G.state === 'menu' || G.state === 'over') { el.className = ''; return; }
    el.className = 'show'; el.innerHTML = '<span>' + (X.tip + 1) + '/' + TIPS.length + '</span> ' + L(TIPS[X.tip][0], TIPS[X.tip][1]) + ' <button>' + L('Pular', 'Skip') + '</button>';
  };
  /* ---------- FPS ---------- */
  var fh = [], fcv = null;
  function fpsDraw() {
    var e = ex(), el = $('fpsbox'); if (!e.fps) { if (el) el.style.display = 'none'; return; }
    if (!el) { el = document.createElement('div'); el.id = 'fpsbox'; el.innerHTML = '<canvas width="120" height="36"></canvas><span></span>'; document.body.appendChild(el); fcv = el.firstChild; }
    el.style.display = 'block'; var c = fcv.getContext('2d'); c.clearRect(0, 0, 120, 36); var tg = T.Q().fps;
    for (var i = 0; i < fh.length; i++) { var f = Math.min(1.2, (1 / fh[i]) / tg), h = f * 28; c.fillStyle = f > 0.9 ? '#6fd05a' : f > 0.6 ? '#ffd24a' : '#ff5a5a'; c.fillRect(i * 2, 36 - h, 1.6, h); }
    el.lastChild.textContent = Math.round(T.Main.fps) + ' fps · ' + ['ECO', 'BAL', 'ALTO'][T.qIdx()] + (T.qEff != null ? '*' : '');
  }
  /* ---------- Loop auxiliar (dentro da simulação) ---------- */
  var s0 = T.Sim.step, fT = 0;
  T.Sim.step = function (dt) {
    s0(dt); fh.push(dt); if (fh.length > 60) fh.shift(); fT -= dt; if (fT <= 0) { fT = 0.3; fpsDraw(); }
    if (!G.hero || G.state !== 'play') return;
    var i, p;
    G.t += 0; var ph = (G.t % 300) / 300, nt = 0.5 - 0.5 * Math.cos(TAU * ph); X.night += (nt - X.night) * Math.min(1, dt * 1.5);
    var isN = nt > 0.62; if (isN !== X.isN) { X.isN = isN; if (G.t > 2) I.ui('banner', isN ? L('Anoitece', 'Nightfall') : L('Amanhece', 'Dawn'), isN ? L('Espectros rondam o reino', 'Wraiths roam the realm') : L('A luz afasta as sombras', 'Light drives back the shadows'), isN ? '#7a9aff' : '#ffd86a'); }
    if (isN && !G.boss) { X.nt -= dt; if (X.nt <= 0) { X.nt = 14; var pt = T.pick(G.portals); for (i = 0; i < 2; i++) { var e = I.spawnEnemy('wraith', pt.x + R(-30, 30), pt.y + R(-30, 30), false); if (e) { I.ring(e.x, e.y, 24, '#7a9aff', 0.4); } } } }
    for (i = X.pois.length - 1; i >= 0; i--) { p = X.pois[i]; if (p.used) { p.t += dt; if (p.t > 1.3) X.pois.splice(i, 1); } else if (Math.hypot(G.hero.x - p.x, G.hero.y - p.y) < 46) poiUse(p); }
    if (G.wave > X.lastW) { X.lastW = G.wave; if (G.wave % 3 === 0 && X.pois.length < 5) poiSpawn(); }
    for (i = 0; i < G.towers.length; i++) { var t = G.towers[i]; if (t.fuse) { t.fuseT = (t.fuseT || 0) - dt; if (t.fuseT <= 0) { t.fuseT = 1.0; fusePulse(t, T.Towers.stats(t)); } } }
    if (X.tip >= 0 && X.tip < TIPS.length && TIPS[X.tip][2]()) { X.tip++; if (X.tip >= TIPS.length) { ex().tut = 1; T.Save.save(); X.tip = -1; } X.tipUpd(); }
    /* música dinâmica */
    X.mt -= dt; if (X.mt <= 0 && Au.ctx && Au.mOn) { X.mt = 0.5; X.ms = (X.ms || 0) + 1; var mood = G.boss ? 2 : T.pools.EP.count() > 25 ? 1 : 0;
      if (mood === 1) { Au.tone('sine', 62, 40, 0.4, 0.55, Au.mg); if (X.ms % 4 === 0) Au.tone('triangle', 110, 98, 0.9, 0.2, Au.mg); }
      if (mood === 2) { X.mt = 0.3; Au.tone('sawtooth', 73, 55, 0.28, 0.3, Au.mg); var n = [220, 261, 311, 370][X.ms % 4]; Au.tone('triangle', n, n, 0.2, 0.2, Au.mg); } }
  };
  X.mt = 0;
  /* ---------- Painéis extras: Configurações e Expedição ---------- */
  var go0 = U.go;
  U.go = function (name, arg) {
    go0.apply(U, arguments); var s = $('scr'), e = ex(), h, hs;
    if (name === 'setup') {
      var dl = X.daily(), done = e.daily[dl.key], best = e.rank[0];
      h = '<div class="pn col" style="margin-bottom:8px"><b class="gold" style="letter-spacing:.12em">' + L('Modos especiais', 'Special modes') + '</b>' +
        '<label class="row small"><input type="checkbox" id="xend" style="width:22px;height:22px"' + (X.endlessSel ? ' checked' : '') + '> ' + L('Modo infinito (sem fim; chefes mais fortes a cada 5 ondas)', 'Endless mode (no end; stronger bosses every 5 waves)') + '</label>' +
        (e.rank.length ? '<div class="small mut">' + L('Melhores: ', 'Best: ') + e.rank.map(function (r) { return L('onda ', 'wave ') + r.w; }).join(' · ') + '</div>' : '') +
        '<div class="item"><div><b class="gold">' + L('Desafio diário', 'Daily challenge') + ': ' + dl.mut.n + '</b><div class="desc">' + T.CLS[dl.cls].n + ' · ' + T.MAPS[dl.map].n + ' — ' + dl.mut.d + '</div></div><button class="btn sm ' + (done ? 'dis' : '') + '" data-a="dailygo">' + (done ? L('Concluído', 'Done') : L('Jogar +60✦', 'Play +60✦')) + '</button></div></div>';
      hs = s.querySelector('h2.ttl'); if (hs) hs.insertAdjacentHTML('beforebegin', h);
      var cb = $('xend'); if (cb) cb.onchange = function () { X.endlessSel = this.checked; };
    }
    if (name === 'settings') {
      h = '<div class="pn col" style="margin-top:8px"><b class="gold" style="letter-spacing:.14em">Extras</b><label class="row small"><input type="checkbox" id="xfps" style="width:22px;height:22px"' + (e.fps ? ' checked' : '') + '> ' + L('Mostrar FPS e gráfico de desempenho', 'Show FPS and performance graph') + '</label>' +
        '<div class="row"><button class="btn sm" data-a="xtut">' + L('Rever tutorial', 'Replay tutorial') + '</button><button class="btn sm" data-a="xlang">' + (e.lang === 'en' ? 'Português' : 'English') + '</button></div></div>';
      (s.querySelector('div[style*="max-width"]') || s.firstElementChild).insertAdjacentHTML('beforeend', h); var cf = $('xfps'); if (cf) cf.onchange = function () { ex().fps = this.checked ? 1 : 0; T.Save.save(); fpsDraw(); };
    }
    if (name === 'collection' && U.ctab === 'tr') { /* já renderizado pela aba */ }
  };
  U.act.dailygo = function () { var dl = X.daily(); if (ex().daily[dl.key]) return; X.pending = { daily: dl }; U.startRun(); };
  U.act.xtut = function () { ex().tut = 0; T.Save.save(); U.toast(L('O tutorial aparece na próxima expedição', 'Tutorial shows next run')); };
  U.act.xlang = function () { var e = ex(); e.lang = e.lang === 'en' ? 'pt' : 'en'; T.Save.save(); location.reload(); };
  var sr = U.startRun; U.startRun = function () { if (!X.pending && X.endlessSel) X.pending = { endless: true }; X.endlessSel = false; return sr.apply(U, arguments); };

  /* ---------- Skins extras ---------- */
  T.SKINS.aurum = { n: 'Áureo', cost: 120, hue: 40 }; T.SKINS.abyss = { n: 'Abissal', cost: 120, hue: 215 }; T.SKINS.blood = { n: 'Sangue', cost: 90, hue: -12 }; T.SKINS.spectral = { n: 'Espectral', cost: 150, hue: 95 };

  /* ---------- Arte substituível: assets/manifest.json {"chave":"arquivo.png"} ---------- */
  /* Carregador de assets (V6). Dois formatos, ambos opcionais e com fallback para a arte procedural:
     assets/manifest.json  -> {"chave":"arquivo.png"}                (um PNG por quadro; formato original da v5)
     assets/sheets.json    -> {"chave":{"file":"x.png","frames":3}}  (spritesheet horizontal; é fatiada em quadros)
     chave = <tipo>_<hue>_<quadro>_<tamanho> (ver ARTE.md). Falhas de rede/arquivo ausente são ignoradas: o jogo usa o desenho procedural. */
  X.assetStats = { ok: 0, fail: 0, frames: 0 };
  function getJSON(u) { return fetch(u, { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }); }
  function loadImg(src, cb) { var im = new Image(); im.onload = function () { X.assetStats.ok++; try { cb(im); } catch (e) { } }; im.onerror = function () { X.assetStats.fail++; }; im.src = src; }
  X.loadAssets = function () {
    if (!window.fetch) return;
    getJSON('assets/manifest.json').then(function (m) { if (!m) return; Object.keys(m).forEach(function (k) { if (typeof m[k] !== 'string') return; loadImg('assets/' + m[k], function (im) { T.Art.override(k, im); X.assetStats.frames++; }); }); });
    getJSON('assets/sheets.json').then(function (m) {
      if (!m) return; Object.keys(m).forEach(function (k) {
        var d = m[k]; if (!d || typeof d.file !== 'string') return; var p = k.split('_'), kind = p.slice(0, p.length - 2).join('_'), hue = +p[p.length - 2], size = +p[p.length - 1], n = d.frames || 3;
        loadImg('assets/' + d.file, function (im) { var fw = Math.floor(im.width / n); for (var f = 0; f < n; f++) { var cv = document.createElement('canvas'); cv.width = fw; cv.height = im.height; cv.getContext('2d').drawImage(im, f * fw, 0, fw, im.height, 0, 0, fw, im.height); T.Art.override(T.Art.key(kind, hue, f, size), cv); X.assetStats.frames++; } });
      });
    });
  };
  X.loadAssets();
  X.ex = ex; X.L = L;
})(window.TD);

'use strict';
/* NOCTARIA — inglês (interface). Traduz rótulos de menus, HUD, painéis e configurações; textos de lore, poderes e relíquias permanecem em português. */
(function (T) {
  var EN = {
    'Jogar': 'Play', 'Personagens': 'Characters', 'Coleção': 'Collection', 'Progressão': 'Progression', 'Conquistas': 'Achievements', 'Configurações': 'Settings', 'Créditos': 'Credits', '‹ Voltar': '‹ Back', 'Menu': 'Menu', 'Expedição': 'Expedition', 'Escolha o mapa': 'Choose the map', 'Iniciar expedição': 'Start expedition',
    'Sobreviva a 20 ondas e derrote o chefe final para vencer.': 'Survive 20 waves and defeat the final boss to win.', 'Modos especiais': 'Special modes', 'Modo infinito (sem fim; chefes mais fortes a cada 5 ondas)': 'Endless mode (no end; stronger bosses every 5 waves)', 'Trocar': 'Change', 'Selecionar': 'Select', '✓ Selecionado': '✓ Selected', 'Bloqueada': 'Locked', 'Desbloqueado': 'Unlocked', 'Disponível': 'Available', 'Equipada': 'Equipped', 'Original': 'Original', 'Pronto': 'Ready',
    'Construir': 'Build', 'Melhorias': 'Upgrades', 'Inventário': 'Inventory', 'Relíquias': 'Relics', 'Herói': 'Hero', 'Núcleo': 'Core', 'Onda': 'Wave', 'Pular': 'Skip', 'Armas': 'Weapons', 'Artefatos': 'Artifacts', 'Materiais': 'Materials', 'Consumíveis': 'Consumables',
    'Poderes': 'Powers', 'Sinergias': 'Synergies', 'Inimigos': 'Enemies', 'Chefes': 'Bosses', 'Troféus': 'Trophies', 'Coleção ': 'Collection', 'Poderes adquiridos': 'Powers acquired', 'Escolha um poder': 'Choose a power', 'NOVO': 'NEW', 'COMUM': 'COMMON', 'INCOMUM': 'UNCOMMON', 'RARA': 'RARE', 'ÉPICA': 'EPIC', 'LENDÁRIA': 'LEGENDARY', 'MÍTICA': 'MYTHIC', 'Comum': 'Common', 'Incomum': 'Uncommon', 'Rara': 'Rare', 'Épica': 'Epic', 'Lendária': 'Legendary', 'Mítica': 'Mythic', '✦ Sinergia secreta': '✦ Secret synergy',
    'Configurações ': 'Settings', 'Áudio e câmera': 'Audio and camera', 'Música': 'Music', 'Efeitos sonoros': 'Sound effects', 'Volume geral': 'Master volume', 'Interface e cartas': 'Interface and cards', 'Tremor de tela': 'Screen shake', 'Acessibilidade e efeitos': 'Accessibility and effects', 'Intensidade dos efeitos': 'Effects intensity', 'Reduzir flashes de luz': 'Reduce light flashes', 'Reduzir movimento de fundo (névoa, clima, parallax)': 'Reduce background motion (fog, weather, parallax)', 'Efeitos de zoom da câmera': 'Camera zoom effects', 'Qualidade gráfica': 'Graphics quality', 'Econômico': 'Economy', 'Equilibrado': 'Balanced', 'Alto': 'High',
    '30 FPS · resolução reduzida · poucas partículas · sem iluminação dinâmica': '30 FPS · reduced resolution · few particles · no dynamic lighting', '45 FPS · iluminação simplificada · partículas moderadas': '45 FPS · simplified lighting · moderate particles', '60 FPS · iluminação e brilho completos · mais partículas e detalhes': '60 FPS · full lighting and bloom · more particles and detail', 'Ajuste automático quando o FPS cair (nunca sobe sozinho)': 'Auto-adjust when FPS drops (never goes up by itself)', 'Dados salvos': 'Saved data', 'Exportar backup': 'Export backup', 'Importar backup': 'Import backup', 'Apagar todo o progresso': 'Erase all progress', 'Extras': 'Extras', 'Mostrar FPS e gráfico de desempenho': 'Show FPS and performance graph', 'Mostrar FPS': 'Show FPS', 'Rever tutorial': 'Replay tutorial', 'English': 'English',
    'Estatísticas gerais': 'General stats', 'Melhorias permanentes': 'Permanent upgrades', 'Essência': 'Essence', 'Expedições': 'Expeditions', 'Vitórias': 'Wins', 'Abates': 'Kills', 'Onda máxima': 'Best wave', 'Pontuação': 'Score', 'Recorde': 'Record', 'Tempo': 'Time', 'Coleta': 'Pickup', 'Vida': 'Health', 'Dano': 'Damage', 'Velocidade': 'Speed', 'Alcance': 'Range', 'Cadência': 'Fire rate', 'Crítico': 'Crit', 'Regeneração': 'Regen', 'Escudos': 'Shields', 'Redução dano': 'Damage reduction', 'Dano herói': 'Hero damage', 'Dano torres': 'Tower damage', 'Ouro gasto': 'Gold spent', 'Nível': 'Level', 'Nível máximo': 'Max level', 'Nível máx.': 'Max level', 'Melhorar': 'Upgrade', 'Reparar': 'Repair', 'Vender': 'Sell', 'Fundir': 'Fuse', 'Aparências do herói': 'Hero looks', 'Nenhum ainda.': 'None yet.', 'Nenhuma torre construída. Use “Construir”.': 'No towers built. Use “Build”.', 'Nenhuma relíquia. Derrote elites e chefes para encontrar baús.': 'No relics. Defeat elites and bosses to find chests.', 'Não descoberto': 'Not discovered', 'Tudo funciona offline. Os dados ficam só neste aparelho.': 'Everything works offline. Data stays on this device only.', 'Design, código, arte procedural e música gerada por código.': 'Design, code, procedural art and code-generated music.',
    'Derrota': 'Defeat', 'Vitória': 'Victory', 'O herói caiu.': 'The hero has fallen.', 'Jogar novamente': 'Play again', 'Continuar': 'Resume', 'Pausado': 'Paused', 'Pausa': 'Pause', 'Chefe — prepare-se': 'Boss — brace yourself', 'Chefe derrotado': 'Boss defeated', 'Evento: alcateia': 'Event: wolf pack', 'Evento: areia': 'Event: sandstorm', 'Evento: erupção': 'Event: eruption', 'Evento: fenda': 'Event: rift', 'Evento: mortos': 'Event: risen dead', 'Evento: nevasca': 'Event: blizzard', 'Evento: surto': 'Event: arcane surge',
    'Floresta Corrompida': 'Corrupted Forest', 'Cemitério Antigo': 'Ancient Graveyard', 'Reino Congelado': 'Frozen Realm', 'Deserto Abandonado': 'Abandoned Desert', 'Vulcão Infernal': 'Infernal Volcano', 'Ruínas Mágicas': 'Magic Ruins', 'Dimensão do Vazio': 'Void Dimension',
    'Torre de Arqueiros': 'Archer Tower', 'Canhão': 'Cannon', 'Torre de Fogo': 'Fire Tower', 'Torre de Gelo': 'Ice Tower', 'Torre Elétrica': 'Lightning Tower', 'Torre Arcana': 'Arcane Tower', 'Torre Venenosa': 'Poison Tower', 'Torre de Precisão': 'Sniper Tower', 'Torre de Invocação': 'Summoner Tower', 'Torre de Suporte': 'Support Tower', 'Torres': 'Towers',
    'Guerreiro': 'Warrior', 'Muralha de Sangue': 'Blood Wall', 'O Cavaleiro Exilado': 'The Exiled Knight', 'Arraste o dedo na tela (ou use WASD) para mover o herói': 'Drag on the screen (or use WASD) to move your hero', 'Desafio diário': 'Daily challenge', 'Concluído': 'Done', 'Jogar +60✦': 'Play +60✦', 'Anoitece': 'Nightfall', 'Amanhece': 'Dawn',
    'Esferas teleguiadas.': 'Homing orbs.', 'Explosão em área.': 'Area explosion.', 'Flechas rápidas e baratas.': 'Fast, cheap arrows.', 'Queima os inimigos.': 'Burns enemies.', 'Raio em cadeia.': 'Chain lightning.', 'Nuvem de veneno.': 'Poison cloud.', 'Tiro certeiro de longe.': 'Long-range precise shot.', 'Gera guerreiros espectrais.': 'Spawns spectral warriors.', 'Fortalece torres e cura aliados.': 'Empowers towers and heals allies.', 'Desacelera e pode congelar.': 'Slows and may freeze.'
  };
  var RX = [[/^Dano (\S+) · Alc\. (\S+) · (\S+)$/, 'Dmg $1 · Rng $2 · $3'], [/^Nível (\d+)\/(\d+)$/, 'Level $1/$2'], [/^Nível (\d+)$/, 'Level $1'], [/^Nv (\d+)$/, 'Lv $1'], [/^ONDA (\d+)(.*)$/, 'WAVE $1$2'], [/^Onda (\d+)$/, 'Wave $1'], [/^(\d+) essência$/, '$1 essence'], [/^Núcleo (\d+)$/, 'Core $1'], [/^Espaços: (\d+)\/(\d+)$/, 'Slots: $1/$2'], [/^Derrote o chefe da onda (\d+)$/, 'Defeat the wave $1 boss'], [/^(\d+) de (\d+) conquistadas$/, '$1 of $2 unlocked'], [/^Dificuldade: (.*)$/, 'Difficulty: $1'], [/^Melhor pontuação (\d+) · Essência (\d+) · Onda máx\. (\d+)$/, 'Best score $1 · Essence $2 · Best wave $3'], [/^Melhores: (.*)$/, 'Best: $1'], [/^Dropado por (.*)$/, 'Dropped by $1'], [/^Sobreviva até a onda (\d+)\.$/, 'Survive until wave $1.'], [/^(\d+) min$/, '$1 min']];
  function tr(s) { var k = s.trim(); if (!k) return s; var v = EN[k]; if (!v) for (var i = 0; i < RX.length; i++) if (RX[i][0].test(k)) { v = k.replace(RX[i][0], RX[i][1]); break; } return v ? s.replace(k, v) : s; }
  function walk(n) { if (n.nodeType === 3) { var t = tr(n.nodeValue); if (t !== n.nodeValue) n.nodeValue = t; return; } if (n.nodeType !== 1 || n.tagName === 'SCRIPT' || n.tagName === 'STYLE') return; if (n.title) { var tt = tr(n.title); if (tt !== n.title) n.title = tt; } for (var c = n.firstChild; c; c = c.nextSibling) walk(c); }
  T.I18N = { EN: EN, tr: tr };
  function start() { var d = T.Save.d; if (!d.ex || d.ex.lang !== 'en') return; document.documentElement.lang = 'en'; walk(document.body); new MutationObserver(function (ms) { ms.forEach(function (m) { if (m.type === 'characterData') { var t = tr(m.target.nodeValue); if (t !== m.target.nodeValue) m.target.nodeValue = t; } else m.addedNodes.forEach(walk); }); }).observe(document.body, { childList: true, subtree: true, characterData: true }); }
  T.I18N.start = start;
})(window.TD);

'use strict';
/* NOCTARIA — inicialização, laço principal (dt + limite de FPS), entrada, qualidade adaptativa, PWA. */
(function (T) {
  var G = T.G, I = T.int, $ = function (id) { return document.getElementById(id); };
  var M = T.Main = { fps: 60, last: 0, acc: 0, hudT: 0, lowT: 0, cool: 0, frames: 0, fa: 0 };
  T.qEff = null;
  T.qIdx = function () { return T.qEff != null ? T.qEff : T.Save.d.set.q; };
  T.Q = function () { return T.QUAL[T.qIdx()]; };
  T.ptr = { x: 0, y: 0, on: false };

  M.applyQuality = function (rebuild) {
    if (!T.Render.cv) return; T.Render.resize(); if (G.mapId && G.state !== 'menu') { T.Render.mapChanged(); }
    if (T.MenuBG.on && T.MenuBG.cv) T.MenuBG.size();
  };
  function boot() {
    var steps = ['Despertando as sombras…', 'Forjando criaturas…', 'Acendendo as tochas…', 'Pronto'], k = 0;
    T.Save.load(); document.documentElement.style.setProperty('--corner', 'url("' + T.CORNER + '")');
    T.Render.init($('game')); T.Render.resize(); T.Input.init($('game'));
    var warm = ['ghoul', 'cultist', 'ogre', 'imp', 'knight', 'wraith', 'hound', 'spider', 'drake', 'spirit', 'skel', 'hero_knight', 'hero_mage', 'hero_archer', 'hero_necro', 'hero_paladin', 'hero_assassin'];
    var i = 0;
    (function step() {
      var n = 0; while (i < warm.length && n < 3) { T.Art.sprite(warm[i], 0, 64, 0); T.Art.sprite(warm[i], 1, 64, 0); T.Art.sprite(warm[i], 2, 64, 0); i++; n++; }
      $('ldBar').style.transform = 'scaleX(' + (i / warm.length) + ')'; $('ldTxt').textContent = steps[Math.min(3, Math.floor(i / warm.length * 3))];
      if (i < warm.length) { setTimeout(step, 0); return; }
      T.Audio.apply(); T.UI.go('menu'); if (T.I18N && T.I18N.start) T.I18N.start(); var l = $('loading'); l.style.opacity = 0; l.style.pointerEvents = 'none'; setTimeout(function () { l.remove(); }, 600);
      if (T.Save.migrated) T.UI.toast('Progresso da versão anterior migrado (backup mantido).');
      requestAnimationFrame(loop);
    })();
    window.addEventListener('resize', function () { clearTimeout(M.rt); M.rt = setTimeout(function () { M.applyQuality(); }, 150); });
    window.addEventListener('orientationchange', function () { setTimeout(M.applyQuality, 300); });
    document.addEventListener('visibilitychange', function () { if (document.hidden && G.state === 'play') { T.Run.pause(true); } M.last = performance.now(); });
    window.addEventListener('keydown', function (e) {
      var k = e.key.toLowerCase(); T.Audio.init();
      if (k === ' ' || k === 'spacebar') { e.preventDefault(); if (G.state === 'play') T.Run.special(); }
      else if (k === 'escape' || k === 'p') { if (G.state === 'play') { T.UI.closePanel(); T.Run.pause(true); } else if (G.state === 'pause') T.Run.pause(false); else if (G.state === 'panel') T.UI.closePanel(); }
      else if (k >= '1' && k <= '4') T.UI.key(+k - 1);
      else if (k === 'b' && (G.state === 'play' || G.state === 'panel')) T.UI.panel('build');
      else if (k === 'q' && G.state === 'play') T.Run.usePotion();
      else if (k === 'e' && G.state === 'play') T.Run.excalibur();
    });
    $('game').addEventListener('pointermove', function (e) { T.ptr.x = e.clientX; T.ptr.y = e.clientY; T.ptr.on = true; });
    $('game').addEventListener('pointerleave', function () { T.ptr.on = false; });
    $('game').addEventListener('pointerdown', function (e) { T.ptr.x = e.clientX; T.ptr.y = e.clientY; T.ptr.on = true; T.Audio.init(); });
    if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) navigator.serviceWorker.register('sw.js').then(function (reg) {
      function ask(w) { if (!w) return; var iv = setInterval(function () { var g = document.getElementById('game'); if (g && g.classList.contains('hidden')) { clearInterval(iv); try { T.UI.toast('Atualizando o jogo…'); } catch (e) { } w.postMessage('SKIP_WAITING'); } }, 2000); }
      if (reg.waiting && navigator.serviceWorker.controller) ask(reg.waiting);
      reg.addEventListener('updatefound', function () { var w = reg.installing; if (w) w.addEventListener('statechange', function () { if (w.state === 'installed' && navigator.serviceWorker.controller) ask(w); }); });
      var rl = !navigator.serviceWorker.controller; navigator.serviceWorker.addEventListener('controllerchange', function () { if (rl) return; rl = true; location.reload(); });
    }).catch(function () { });
  }
  /* Qualidade adaptativa: só reduz, com período mínimo de observação e intervalo entre quedas (sem oscilar). */
  function adapt(dt) {
    var st = T.Save.d.set; if (!st.autoq || G.state !== 'play') { M.lowT = 0; return; }
    var q = T.QUAL[T.qIdx()], target = q.fps; M.cool -= dt;
    if (M.fps < target * 0.8) M.lowT += dt; else M.lowT = Math.max(0, M.lowT - dt * 2);
    if (M.lowT > 5 && M.cool <= 0 && T.qIdx() > 0) { T.qEff = T.qIdx() - 1; M.lowT = 0; M.cool = 20; M.applyQuality(); T.UI.toast('Desempenho baixo: qualidade reduzida para ' + T.QUAL[T.qEff].n); }
  }
  function loop(now) {
    requestAnimationFrame(loop);
    var cap = T.Q().fps, el = now - M.last; if (el < 1000 / cap - 3) return;
    M.last = now; var dt = Math.min(el / 1000, 0.05);
    M.fa += el; M.frames++; if (M.fa >= 500) { M.fps = M.frames * 1000 / M.fa; M.fa = 0; M.frames = 0; }
    if (G.state === 'menu') return;
    // toques no mapa
    var tp = T.Input.taps; if (tp.length) { for (var i = 0; i < tp.length; i++) { if (G.state === 'play') { var w = T.Render.screenToWorld(tp[i].x, tp[i].y); T.Run.tap(w[0], w[1]); } } tp.length = 0; }
    T.Sim.step(dt); T.Render.frame(dt); adapt(Math.min(el / 1000, 1));
    M.hudT -= dt; if (M.hudT <= 0 && G.state !== 'over') { M.hudT = 0.12; T.UI.hud(); }
  }
  M.boot = boot;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})(window.TD);
