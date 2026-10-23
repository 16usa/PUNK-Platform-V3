// Demo enhancements are layered below the supplied implementation to preserve its visual source.
document.addEventListener('DOMContentLoaded', function punkEnhance() {
  let selectedImageUrl = '';
  let selectedImageDataUrl = '';
  let imageReady = Promise.resolve();
  let followed = false;
  const maxLocalImageBytes = 900 * 1024;
  const baseRender = render;
  const baseBind = bind;
  const baseModal = modal;
  const baseClose = close;
  const baseHome = home;
  const baseToken = token;
  const announcer = document.getElementById('announcer');
  const announce = (text) => { if (announcer) announcer.textContent = text; };
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function applyTokenImages(root) {
    if (!root) return;
    for (const t of tokens) {
      const data = t.imgData;
      if (typeof data !== 'string' || data.length > maxLocalImageBytes ||
          !/^data:image\/(?:png|webp|jpeg);base64,[A-Za-z0-9+/=]+$/.test(data)) continue;
      root.querySelectorAll('img[alt]').forEach(img => {
        if (img.alt === t.name) img.src = data;
      });
    }
  }
  home = function honestDemoHome() {
    return baseHome().replace('Create, trade and discover meme tokens directly with X Money.','Explore token discovery and trading in a visual concept. Every displayed balance and action is simulated.').replace('100%</strong><span>X Money Powered · concept','100%</strong><span>X Money concept · not connected');
  };
  token = function explicitDemoToken() {
    return baseToken().replace('<div class="price">','<div class="price"><span class="demo-price-label">DEMO PRICE</span><br>')
      .replace('Market Cap</small>','Market Cap (demo)</small>')
      .replace('>Holders</span>','>Holders (demo)</span>')
      .replace('>Volume (24h)</span>','>Volume (24h, demo)</span>')
      .replace('>Transactions</span>','>Transactions (demo)</span>')
      .replace('>Bonding Curve</span>','>Bonding Curve (demo)</span>');
  };

  row = function accessibleRow(t) {
    return `<div class="token-row"><button class="coin coin-trigger" data-token="${Number(t.id)}" aria-label="View ${esc(t.name)} token">${coin(t)}<div><strong>${esc(t.name)}</strong><small>${esc(t.ticker)} · ${esc(t.created)}</small></div></button><div><span class="label">Market Cap · demo</span><b>${money(t.mc)}</b></div><div><span class="label">24h Change · demo</span><b class="${t.change>=0?'green':'red'}">${t.change>0?'+':''}${t.change}%</b></div><div><span class="label">Bonding · demo</span>${t.bond}%</div><div><span class="label">Holders · demo</span>${fmt(t.holders)}</div>${spark(t)}<button class="btn primary small" data-token="${Number(t.id)}" aria-label="Open ${esc(t.name)} to buy">Buy</button></div>`;
  };

  function leaderboard() {
    const ranked = [...tokens].sort((a,b) => b.holders - a.holders);
    return `<section class="leaderboard-page"><div class="section-head"><div><h1>Leaderboard</h1><p>Demo token rankings by holder count. Values are sample data and are not live market metrics.</p></div><span class="demo-pill">SIMULATED DATA</span></div><div class="tabs" role="group" aria-label="Leaderboard metric"><button class="tab active" aria-pressed="true" disabled>Top holders</button></div><div class="panel table-scroll"><table class="history leaderboard-table"><caption class="sr-only">Tokens ranked by sample holder count</caption><thead><tr><th scope="col">Rank</th><th scope="col">Token</th><th scope="col">Holders</th><th scope="col">Market cap (demo)</th><th scope="col">24h change (demo)</th><th scope="col">Open</th></tr></thead><tbody>${ranked.map((t,i)=>`<tr><td>#${i+1}</td><td><button class="coin coin-trigger" data-token="${Number(t.id)}">${coin(t)}<span><b>${esc(t.name)}</b><small>${esc(t.ticker)}</small></span></button></td><td>${fmt(t.holders)}</td><td>${money(t.mc)}</td><td class="${t.change>=0?'green':'red'}">${t.change>0?'+':''}${t.change}%</td><td><button class="btn small" data-token="${Number(t.id)}">View token</button></td></tr>`).join('')}</tbody></table></div><p class="demo-note">This leaderboard is generated from the bundled/local demo token list. It does not reflect real users, trades, or blockchain activity.</p></section>`;
  }

  render = function renderWithLeaderboard() {
    if (state.page !== 'leaderboard') {
      baseRender();
      applyTokenImages($('#page'));
      return;
    }
    document.querySelectorAll('nav button').forEach(b => b.classList.toggle('active', b.dataset.go === 'leaderboard'));
    $('#page').innerHTML = leaderboard();
    applyTokenImages($('#page'));
    bind();
  };

  modal = function accessibleModal(html) {
    baseModal(html);
    const overlay = $('#modal');
    overlay.setAttribute('aria-hidden','false');
    const title = $('#modalbody h2');
    if (title) title.id = 'dialog-title';
    $('#close').focus();
  };
  close = function accessibleClose() {
    baseClose();
    $('#modal').setAttribute('aria-hidden','true');
    announce('Dialog closed');
  };

  bind = function bindEnhanced() {
    baseBind();
    const form = $('#createform');
    if (form) {
      const nameInput = form.elements.name;
      const tickerInput = form.elements.ticker;
      tickerInput.pattern = '[A-Za-z0-9]{2,12}';
      tickerInput.title = 'Use 2–12 letters or numbers.';
      const imagefile = $('#imagefile');
      const upload = document.querySelector('.upload');
      if (upload && !$('#upload-note')) {
        const note = document.createElement('small');
        note.id = 'upload-note';
        note.textContent = 'High-quality image is stored locally in this browser.';
        upload.insertAdjacentElement('afterend', note);
      }
      const showImageError = (text) => {
        let error = $('#image-error');
        if (!error) {
          error = document.createElement('small');
          error.id = 'image-error';
          error.className = 'form-error';
          error.setAttribute('role','alert');
          upload.insertAdjacentElement('afterend', error);
        }
        error.textContent = text;
      };
      if (imagefile) imagefile.onchange = () => {
        const file = imagefile.files && imagefile.files[0];
        const err = $('#image-error');
        if (err) err.remove();
        if (!file) {
          selectedImageDataUrl = '';
          return;
        }
        if (!/^image\/(png|jpeg|gif|webp)$/.test(file.type)) {
          imagefile.value = '';
          selectedImageUrl = '';
          selectedImageDataUrl = '';
          showImageError('Choose a PNG, JPG, GIF, or WebP image.');
          announce('Unsupported image file');
          return;
        }
        if (file.size > 5 * 1024 * 1024) {
          imagefile.value = '';
          selectedImageUrl = '';
          selectedImageDataUrl = '';
          showImageError('Image must be 5 MB or smaller.');
          announce('Image exceeds the 5 megabyte limit');
          return;
        }
        if (selectedImageUrl) URL.revokeObjectURL(selectedImageUrl);
        selectedImageUrl = URL.createObjectURL(file);
        $('#preview').src = selectedImageUrl;
        announce(`${file.name} selected`);
        imageReady = new Promise((resolve) => {
          const image = new Image();
          image.onload = () => {
            try {
              const maxDimension = 1024;
              const scale = Math.min(
                1,
                maxDimension / Math.max(image.naturalWidth, image.naturalHeight)
              );

              const canvas = document.createElement('canvas');
              canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
              canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));

              const context = canvas.getContext('2d');
              if (!context) throw new Error('Canvas unavailable');

              context.imageSmoothingEnabled = true;
              context.imageSmoothingQuality = 'high';
              context.drawImage(image, 0, 0, canvas.width, canvas.height);

              let dataUrl = canvas.toDataURL('image/webp', 0.95);

              if (!dataUrl.startsWith('data:image/webp')) {
                dataUrl = canvas.toDataURL('image/jpeg', 0.95);
              }

              if (dataUrl.length > 900 * 1024) {
                dataUrl = canvas.toDataURL('image/webp', 0.85);
              }

              if (dataUrl.length > 900 * 1024) {
                selectedImageDataUrl = '';
                showImageError('Image is too large for local storage.');
              } else {
                selectedImageDataUrl = dataUrl;
                announce('High-quality image ready.');
              }

            } catch (_) {
              selectedImageDataUrl = '';
              showImageError('This image could not be prepared for local demo storage.');
            }
            resolve();
          };
          image.onerror = () => {
            selectedImageDataUrl = '';
            showImageError('This image could not be opened.');
            resolve();
          };
          image.src = selectedImageUrl;
        });
      };
      form.onsubmit = async (event) => {
        event.preventDefault();
        await imageReady;
        if (imagefile && imagefile.files.length && !selectedImageDataUrl) {
          showImageError('Select a smaller valid image, or remove the image selection.');
          return;
        }
        const name = nameInput.value.trim();
        const ticker = tickerInput.value.trim().toUpperCase();
        if (name.length < 2 || name.length > 40 || !/^[\p{L}\p{N}][\p{L}\p{N} '&()._-]{1,39}$/u.test(name)) {
          nameInput.setCustomValidity('Use 2–40 letters, numbers, spaces, or simple punctuation for the token name.');
          nameInput.reportValidity();
          nameInput.setCustomValidity('');
          return;
        }
        if (!/^[A-Z0-9]{2,12}$/.test(ticker)) {
          tickerInput.setCustomValidity('Ticker must be 2–12 letters or numbers.');
          tickerInput.reportValidity();
          tickerInput.setCustomValidity('');
          return;
        }
        if (tokens.some(t => t.ticker.toUpperCase() === ticker)) {
          tickerInput.setCustomValidity('That ticker is already in this local demo.');
          tickerInput.reportValidity();
          tickerInput.setCustomValidity('');
          return;
        }
        const data = new FormData(form);
        const t = {id:Date.now(),name,ticker,img:'punkdog',description:String(data.get('description')||'').trim(),tags:String(data.get('tags')||'').trim(),mc:3100,change:0,bond:0,holders:1,volume:0,price:.0000031,created:'Just now'};
        if (selectedImageDataUrl) t.imgData = selectedImageDataUrl;
        tokens.unshift(t);
        save();
        if (selectedImageUrl) URL.revokeObjectURL(selectedImageUrl);
        selectedImageUrl = '';
        selectedImageDataUrl = '';
        imageReady = Promise.resolve();
        announce(`${ticker} added to local demo tokens`);
        go('success');
      };
    }

    const amountInput = $('#tradeamount');
    if (amountInput) {
      amountInput.setAttribute('aria-label','Trade amount in demo US dollars');
      amountInput.oninput = () => {
        const t = tokens.find(x => x.id === state.selected) || tokens[0];
        const n = Number(amountInput.value);
        const estimate = $('.token-detail aside .panel h3');
        const button = $('#execute');
        if (estimate) estimate.textContent = `${Number.isFinite(n) && n > 0 ? fmt(Math.floor(n/t.price)) : '—'} ${t.ticker}`;
        if (button) button.textContent = `Buy ${Number.isFinite(n) && n > 0 ? money(n) : '$0.00'}`;
      };
      const execute = $('#execute');
      if (execute) execute.onclick = () => {
        const t = tokens.find(x => x.id === state.selected) || tokens[0];
        const amount = Number(amountInput.value);
        if (!Number.isFinite(amount) || amount <= 0) {
          amountInput.setCustomValidity('Enter a positive demo amount.');
          amountInput.reportValidity();
          amountInput.setCustomValidity('');
          return;
        }
        if (amount > state.wallet.balance) {
          modal('<h2>Demo balance too low</h2><p>Enter an amount within the illustrative local demo balance. No payment is attempted.</p>');
          return;
        }
        const quantity = Math.floor(amount / t.price);
        state.wallet.balance -= amount;
        state.wallet.holdings[t.id] = (state.wallet.holdings[t.id] || 0) + quantity;
        state.history.unshift({type:'Buy',token:t.name,amount:fmt(quantity),price:'$'+t.price.toFixed(8),total:money(amount),time:'Just now'});
        save();
        modal(`<h2>Demo buy recorded</h2><p>${money(amount)} was deducted from the local illustrative balance and ${fmt(quantity)} ${esc(t.ticker)} added to demo holdings. No wallet, payment, or blockchain transaction was used.</p><button class="btn primary" id="viewportfolio">View portfolio</button>`);
        $('#viewportfolio').onclick = () => { close(); go('portfolio'); };
      };
    }
    const sellButton = $('#execute');
    if (sellButton && state.trade === 'Sell') sellButton.onclick = () => {
      const t = tokens.find(x => x.id === state.selected) || tokens[0];
      const quantity = Math.floor((state.wallet.holdings[t.id] || 0) * state.percent / 100);
      if (!quantity) {
        modal('<h2>No demo tokens to sell</h2><p>This sample portfolio does not hold this token. A local demo buy can add a position.</p>');
        return;
      }
      const total = quantity * t.price;
      state.wallet.holdings[t.id] -= quantity;
      state.wallet.balance += total;
      state.history.unshift({type:'Sell',token:t.name,amount:fmt(quantity),price:'$'+t.price.toFixed(8),total:money(total),time:'Just now'});
      save();
      modal(`<h2>Demo sell recorded</h2><p>${fmt(quantity)} ${esc(t.ticker)} were removed from local demo holdings and ${money(total)} added to the illustrative balance. Nothing was sent to a wallet or network.</p><button class="btn primary" id="viewportfolio">View portfolio</button>`);
      $('#viewportfolio').onclick = () => { close(); go('portfolio'); };
    };

    const copy = $('#copylink');
    if (copy) copy.onclick = async () => {
      const token = tokens[0];
      const link = `punk.demo/token/${token.ticker.toLowerCase()}`;
      try {
        await navigator.clipboard.writeText(link);
        modal(`<h2>Demo link copied</h2><p>${esc(link)}<br><small>This is a local example link, not a published token URL.</small></p>`);
      } catch (_) {
        modal(`<h2>Demo link</h2><p>Select and copy this local example link:</p><input class="field" readonly value="${esc(link)}"><small>No public page was created.</small>`);
      }
    };

    const follow = $('#follow');
    if (follow) follow.onclick = () => {
      followed = !followed;
      follow.textContent = followed ? 'Following (Demo)' : 'Follow on X (Demo)';
      announce(followed ? 'Demo follow enabled locally' : 'Demo follow removed locally');
    };
    for (const id of ['deposit','withdraw','editprofile','logout']) {
      const button = $('#'+id);
      if (button) button.onclick = () => modal(`<h2>${id==='deposit'?'Deposit':id==='withdraw'?'Withdraw':id==='logout'?'Log out':'Edit profile'} — demo only</h2><p>This preview does not connect to a bank, X, wallet, or external account. No account or balance action was performed.</p>`);
    }
    const connect = $('#connect');
    if (connect) connect.onclick = () => modal('<h2>Connect with X — concept</h2><div class="xlogo">𝕏</div><p>X sign-in and X Money are not integrated. This control is a visual demo only; no authorization or account connection will occur.</p><p><small>No real connection can be started from this preview.</small></p>');
    const notifications = $('#notify');
    if (notifications) notifications.onclick = () => modal('<h2>Notifications</h2><p>No new local demo notifications.</p>');
    const dialogClose = $('#close');
    if (dialogClose) dialogClose.onclick = () => close();
    const overlay = $('#modal');
    if (overlay) overlay.onclick = e => { if (e.target === overlay) close(); };
    const rows = $('#rows');
    const search = $('#search');
    if (rows && search) search.oninput = () => {
      const q = search.value.trim().toLowerCase();
      rows.innerHTML = tokens.filter(t => `${t.name} ${t.ticker}`.toLowerCase().includes(q)).map(row).join('') || '<p class="empty-state">No demo tokens match that search.</p>';
      applyTokenImages(rows);
      document.querySelectorAll('#rows [data-token]').forEach(el => el.onclick = () => { state.selected=Number(el.dataset.token);state.trade='Buy';go('token'); });
    };
  };

  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#modal').classList.contains('hidden')) close(); });
  render();
});
const A='/assets/';const seed=[['PUNKDOG','PUNKDOG','punkdog',42812,48.2,68,1204,3842],['CATPUNK','CAT','catpunk',16800,12.6,34,840,1340],['TRUMPCOIN','TRUMP','trumpcoin',120200,-8.4,92,3400,5240],['PEPE-X','PEPE','pepe',9100,112,19,612,1452],['AI GIRL','AIGIRL','aigirl',56300,28.1,47,1800,2440],['SPACEX','SPACEX','spacex',220100,5.2,100,5400,8890],['MARS','MARS','trumpcoin',18600,-12.6,23,785,1380],['TESLA','TESLA','catpunk',56600,28.1,91,1850,3012]];let tokens=JSON.parse(localStorage.getItem('punk_tokens')||'null')||seed.map((a,i)=>({id:i+1,name:a[0],ticker:a[1],img:a[2],mc:a[3],change:a[4],bond:a[5],holders:a[6],volume:a[7],price:i===0?.00001842:Number((.000012+i*.000003).toFixed(8)),created:i<6?'4m ago':'1h ago'}));let state={page:'home',selected:1,filter:'Trending',trade:'Buy',amount:25,percent:25,chart:'5m',wallet:JSON.parse(localStorage.getItem('punk_wallet')||'null')||{balance:1482.71,holdings:{1:3842120,2:912441,3:420000,6:125000}},history:JSON.parse(localStorage.getItem('punk_history')||'null')||[{type:'Buy',token:'PUNKDOG',amount:'1,356,421',price:'$0.000018',total:'$25.00',time:'4m ago'},{type:'Sell',token:'CATPUNK',amount:'200,000',price:'$0.000019',total:'$3.80',time:'1h ago'},{type:'Buy',token:'AI GIRL',amount:'500,000',price:'$0.000008',total:'$4.00',time:'3h ago'}]};const $=s=>document.querySelector(s),fmt=n=>Number(n).toLocaleString('en-US'),money=n=>'$'+Number(n).toLocaleString('en-US',{maximumFractionDigits:2,minimumFractionDigits:2}),save=()=>{localStorage.setItem('punk_tokens',JSON.stringify(tokens));localStorage.setItem('punk_wallet',JSON.stringify(state.wallet));localStorage.setItem('punk_history',JSON.stringify(state.history))};const coin=t=>`<img src="${A+t.img}.png" alt="${t.name}" onerror="this.src='${A}punkdog.png'">`;function spark(t){let p=25;let points=Array.from({length:22},(_,i)=>{p+=Math.sin(i*1.8+t.id)*3+(t.change>0?.45:-.4);return `${i*5},${Math.max(4,Math.min(33,35-p))}`}).join(' ');return `<svg class="spark" viewBox="0 0 110 38"><polyline points="${points}" fill="none" stroke="${t.change>=0?'#39e5b2':'#ff4d65'}" stroke-width="2"/></svg>`}function chart(t){let v=60;let bars='';for(let i=0;i<56;i++){const o=v;v=Math.max(12,Math.min(93,v+(Math.sin(i*2.71+t.id)*9)+(i>40?2.1:.35)));const x=i*12+6,top=120-Math.max(o,v),bottom=120-Math.min(o,v),up=v>=o;bars+=`<line x1="${x}" y1="${top-8}" x2="${x}" y2="${bottom+8}" stroke="${up?'#28d89a':'#fa516b'}" stroke-width="1.4"/><rect x="${x-4}" y="${top}" width="8" height="${Math.max(3,bottom-top)}" fill="${up?'#28d89a':'#fa516b'}"/><rect x="${x-4}" y="${190-(i*7%35)}" width="8" height="${i*7%35}" fill="${up?'#1d775d':'#813449'}" opacity=".65"/>`}return `<svg viewBox="0 0 700 220" preserveAspectRatio="none">${[25,65,105,145,185].map(y=>`<line x1="0" y1="${y}" x2="700" y2="${y}" stroke="#203444"/>`).join('')}${Array.from({length:8},(_,i)=>`<line x1="${i*100}" y1="0" x2="${i*100}" y2="220" stroke="#203444"/>`).join('')}${bars}</svg>`}function row(t){return `<div class="token-row"><div class="coin" role="button" data-token="${t.id}">${coin(t)}<div><strong>${t.name}</strong><small>${t.ticker} · ${t.created}</small></div></div><div><span class="label">Market Cap</span><b>${money(t.mc)}</b></div><div><span class="label">24h Change</span><b class="${t.change>=0?'green':'red'}">${t.change>0?'+':''}${t.change}%</b></div><div><span class="label">Bonding</span>${t.bond}%</div><div><span class="label">Holders</span>${fmt(t.holders)}</div>${spark(t)}<button class="btn primary small" data-token="${t.id}">Buy</button></div>`}function render(){const p=state.page;document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.go===p||(p==='explore'&&b.dataset.go==='trending')));$('#page').innerHTML=({home,explore,token,create,success,profile,portfolio,history,settings,reference}[p]||explore)();bind()}function home(){return `<section class="hero"><div><h1>Your X. <span class="blue">Your Money.</span><br>Your Market.</h1><p>Create, trade and discover meme tokens directly with X Money.</p><div class="hero-actions"><button class="btn primary" data-go="trending">Start Trading</button><button class="btn" data-go="create">Create Token</button></div></div><div class="hero-art"><div class="phone"><b>𝕏</b><img src="${A}punkdog.png"><strong>PUNKDOG</strong></div></div></section><div class="stats"><div class="stat"><strong>$12.4M</strong><span>24h Volume · demo</span></div><div class="stat"><strong>8,932</strong><span>Tokens Created · demo</span></div><div class="stat"><strong>312,410</strong><span>Active Traders · demo</span></div><div class="stat"><strong>100%</strong><span>X Money Powered · concept</span></div></div>${listing()}`}function listing(){let shown=tokens.filter(t=>state.filter==='New'?true:state.filter==='Graduating'?t.bond>=65&&t.bond<100:state.filter==='Graduated'?t.bond>=100:true);if(state.filter==='Trending')shown.sort((a,b)=>b.volume-a.volume);if(state.filter==='New')shown=[...shown].reverse();return `<div class="section-head"><h2>Explore Tokens</h2><button class="btn primary small" data-go="create">+ Create Token</button></div><input class="search" id="search" placeholder="⌕ Search coins, creators or @username..."><div class="tabs">${['Trending','New','Graduating','Graduated'].map(x=>`<button class="tab ${state.filter===x?'active':''}" data-filter="${x}">${x}</button>`).join('')}</div><div class="token-table" id="rows">${shown.map(row).join('')}</div>`}function explore(){return listing()}function token(){const t=tokens.find(x=>x.id===state.selected)||tokens[0];return `<div class="token-detail"><section><div class="coin-head">${coin(t).replace('alt=','class="coin-big" alt=')}<div><h2>${t.name} <small>${t.ticker}</small></h2><small>Created by <span class="blue" data-go="profile">@elonmusk ✓</span> · ${t.created}</small><div class="price">$${t.price.toFixed(8)} <small class="green">${t.change>0?'+':''}${t.change}%</small></div><small>${money(t.mc)} Market Cap</small></div></div><div class="tabs">${['1m','5m','1h','4h','1d'].map(x=>`<button class="tab ${state.chart===x?'active':''}" data-chart="${x}">${x}</button>`).join('')}</div><div class="chartbox">${chart(t)}</div><div class="stats"><div class="stat"><strong>${fmt(t.holders)}</strong><span>Holders</span></div><div class="stat"><strong>${money(t.volume)}</strong><span>Volume (24h)</span></div><div class="stat"><strong>${fmt(t.volume/8|0)}</strong><span>Transactions</span></div><div class="stat"><strong>${t.bond}%</strong><span>Bonding Curve</span></div></div></section><aside class="panel"><div class="tabs">${['Buy','Sell'].map(x=>`<button class="tab ${state.trade===x?'active':''}" data-trade="${x}">${x}</button>`).join('')}</div>${state.trade==='Buy'?`<label>Amount (USD)</label><div class="trade-options">${[10,25,50,100].map(x=>`<button data-amount="${x}" class="${state.amount===x?'active':''}">$${x}</button>`).join('')}</div><label>Custom Amount</label><input id="tradeamount" class="field" type="number" min="1" value="${state.amount}"><div class="panel"><small>You will receive (estimated)</small><h3>${fmt(state.amount/t.price|0)} ${t.ticker}</h3><small>Demo execution, no network transaction</small></div><button style="width:100%;margin-top:15px" class="btn primary" id="execute">Buy ${money(state.amount)}</button>`:`<p>You hold <b>${fmt(state.wallet.holdings[t.id]||0)}</b> ${t.ticker}</p><div class="trade-options">${[25,50,75,100].map(x=>`<button data-percent="${x}" class="${state.percent===x?'active':''}">${x}%</button>`).join('')}</div><div class="panel"><small>You will receive (estimated)</small><h3>${money((state.wallet.holdings[t.id]||0)*state.percent/100*t.price)}</h3><small>${state.percent}% of your position</small></div><button style="width:100%;margin-top:15px" class="btn danger" id="execute">Sell ${state.percent}%</button>`}</aside></div>`}function create(){return `<h1>Create Token</h1><p>Launch your own meme token in seconds — interactive demo only.</p><div class="create-grid"><div><label>Token Image</label><label class="upload" for="imagefile"><img id="preview" src="${A}punkdog.png"><span>⊕ Upload Image</span><small>PNG, JPG or GIF (max 5MB)</small></label><input id="imagefile" type="file" accept="image/*" hidden><div class="check">✓ Fair Launch</div><div class="check">✓ No hidden allocation</div><div class="check">✓ No minting later (concept)</div><div class="check">✓ No freeze authority (concept)</div></div><form id="createform" class="panel"><div class="split"><div><label>Token Name</label><input class="field" name="name" value="PUNKDOG" required maxlength="40"></div><div><label>Ticker</label><input class="field" name="ticker" value="PUNKDOG" required maxlength="12"></div></div><label>Description (optional)</label><textarea class="field" rows="5" name="description">The official PUNK dog token. To the moon! 🚀</textarea><label>Add tags (optional)</label><input class="field" name="tags" value="meme, dog, elon"><button class="btn primary" style="width:100%">Create Token (Demo)</button><p><small>Creates a local demo entry only. No Solana mint or smart contract is deployed.</small></p></form></div>`}function success(){const t=tokens[0];return `<div class="panel success"><div style="font-size:50px">🎉</div>${coin(t)}<h1>Token Created!</h1><p>Your token ${t.name} has been created in this browser's demo data.</p><div class="field">punk.demo/token/${t.ticker.toLowerCase()}</div><button class="btn" id="copylink">Copy demo link</button> <button class="btn primary" data-token="${t.id}">View Token</button></div>`}function profile(){return `<div class="profile-header"> <img class="avatar" src="${A}elon.png"><div><h2>Elon Musk <small class="blue">✓</small></h2><div class="muted">@elonmusk</div><p>CEO of Tesla, SpaceX | Making life multiplanetary</p><small>195.4M Followers · 1.2K Following</small></div><button class="btn" id="follow">Follow on X (Demo)</button></div><div class="tabs"><button class="tab active">Created Tokens</button><button class="tab" data-go="portfolio">Holdings</button><button class="tab" data-go="history">Activity</button></div><div class="token-table">${tokens.slice(0,5).map(row).join('')}</div>`}function portfolio(){const holdings=Object.entries(state.wallet.holdings).map(([id,n])=>({t:tokens.find(t=>t.id===Number(id)),n})).filter(x=>x.t);const val=holdings.reduce((a,x)=>a+x.n*x.t.price,0);return `<h2>Your Portfolio</h2><p>Manage your tokens and track your performance.</p><div class="panel"><small>Total Token Value (Demo)</small><h1>${money(val)}</h1><span class="green">+12.4% ($71.42) · illustrative</span><div style="float:right"><button class="btn primary small" id="deposit">Deposit</button> <button class="btn small" id="withdraw">Withdraw</button> <button class="btn small" data-go="settings">Settings</button></div></div><div class="tabs"><button class="tab active">Holdings</button><button class="tab" data-go="history">Transaction History</button></div><div class="panel table-scroll"><table class="history"><thead><tr><th>Token</th><th>Amount</th><th>Value</th><th>24h</th></tr></thead><tbody>${holdings.map(({t,n})=>`<tr data-token="${t.id}"><td>${t.name}</td><td>${fmt(n)}</td><td>${money(n*t.price)}</td><td class="${t.change>=0?'green':'red'}">${t.change}%</td></tr>`).join('')}</tbody></table></div><p>Demo cash balance: ${money(state.wallet.balance)}</p>`}function history(){return `<h2>Transaction History</h2><p>All your trading activity on PUNK (local demo records).</p><div class="panel table-scroll"><table class="history"><thead><tr><th>Type</th><th>Token</th><th>Amount</th><th>Price</th><th>Total</th><th>Time</th></tr></thead><tbody>${state.history.map(x=>`<tr><td class="${x.type==='Buy'?'green':'red'}">${x.type}</td><td>${x.token}</td><td>${x.amount}</td><td>${x.price}</td><td>${x.total}</td><td>${x.time}</td></tr>`).join('')}</tbody></table></div>`}function settings(){return `<div class="setting-layout"><div class="panel setting-menu">${['Account','X Money','Trading Limits','Security','Notifications','Connected Apps'].map((x,i)=>`<button class="${i===0?'active':''}" data-setting="${x}">${x}</button>`).join('')}<button id="logout">Log Out (Demo)</button></div><div class="panel"><h2>Account Settings</h2><p>Manage your account and preferences.</p><div class="settingrow"><div class="coin"><img src="${A}elon.png"><div><b>@elonmusk ✓</b><small>Elon Musk</small></div></div><button class="btn small" id="editprofile">Edit Profile</button></div>${[['Trading Limit','$1,000 / day'],['X Money Connection','Concept / Not connected'],['Two-Factor Authentication','Demo enabled'],['Trading Notifications','Demo enabled']].map(([k,v])=>`<div class="settingrow"><span>${k}</span><span>${v} <button class="btn small" data-setting="${k}">Edit</button></span></div>`).join('')}</div></div>`}function reference(){return `<h1>Original PUNK Design — October 7</h1><p class="muted">The twelve panels below are direct crops of the original image, not recreated screenshots. Use them as a visual reference while navigating the interactive demo.</p><div class="reference-grid">${['Discover','Connect with X','Connect X Money','Token feed','Token page','Sell token','Create token','Token created','Creator profile','Portfolio','Transactions','Settings'].map((label,i)=>`<figure><img src="/reference/panel-${String(i+1).padStart(2,'0')}.png" alt="${label}" loading="lazy"><figcaption>${i+1}. ${label}</figcaption></figure>`).join('')}</div>`}function modal(html){$('#modalbody').innerHTML=html;$('#modal').classList.remove('hidden')}function close(){ $('#modal').classList.add('hidden') }function go(p){if(p==='trending'){state.filter='Trending';p='explore'}else if(p==='new'){state.filter='New';p='explore'}state.page=p==='trending'||p==='new'?'explore':p;if(p==='trending')state.filter='Trending';if(p==='new')state.filter='New';render();window.scrollTo(0,0)}function bind(){document.querySelectorAll('[data-go]').forEach(el=>el.onclick=()=>go(el.dataset.go));document.querySelectorAll('[data-token]').forEach(el=>el.onclick=()=>{state.selected=Number(el.dataset.token);state.trade='Buy';go('token')});document.querySelectorAll('[data-filter]').forEach(el=>el.onclick=()=>{state.filter=el.dataset.filter;render()});document.querySelectorAll('[data-trade]').forEach(el=>el.onclick=()=>{state.trade=el.dataset.trade;render()});document.querySelectorAll('[data-amount]').forEach(el=>el.onclick=()=>{state.amount=Number(el.dataset.amount);render()});document.querySelectorAll('[data-percent]').forEach(el=>el.onclick=()=>{state.percent=Number(el.dataset.percent);render()});document.querySelectorAll('[data-chart]').forEach(el=>el.onclick=()=>{state.chart=el.dataset.chart;render()});const search=$('#search');if(search)search.oninput=()=>{$('#rows').innerHTML=tokens.filter(t=>(t.name+' '+t.ticker).toLowerCase().includes(search.value.toLowerCase())).map(row).join('')||'<p style="padding:20px">No tokens found</p>';bind()};const exec=$('#execute');if(exec)exec.onclick=()=>{const t=tokens.find(x=>x.id===state.selected);if(state.trade==='Buy'){const amt=Number($('#tradeamount').value);if(!Number.isFinite(amt)||amt<=0||amt>state.wallet.balance)return modal('<h2>Invalid amount</h2><p>Enter a positive amount within your demo cash balance.</p>');state.wallet.balance-=amt;const qty=Math.floor(amt/t.price);state.wallet.holdings[t.id]=(state.wallet.holdings[t.id]||0)+qty;state.history.unshift({type:'Buy',token:t.name,amount:fmt(qty),price:'$'+t.price.toFixed(8),total:money(amt),time:'Just now'})}else{const qty=Math.floor((state.wallet.holdings[t.id]||0)*state.percent/100);if(!qty)return modal('<h2>No tokens to sell</h2><p>Buy some demo tokens first.</p>');state.wallet.holdings[t.id]-=qty;const amt=qty*t.price;state.wallet.balance+=amt;state.history.unshift({type:'Sell',token:t.name,amount:fmt(qty),price:'$'+t.price.toFixed(8),total:money(amt),time:'Just now'})}save();modal(`<h2>✓ Demo ${state.trade} Complete</h2><p>Simulated ${state.trade.toLowerCase()} recorded locally. No blockchain transaction was submitted.</p><button class="btn primary" id="viewportfolio">View Portfolio</button>`);$('#viewportfolio').onclick=()=>{close();go('portfolio')}};const form=$('#createform');if(form)form.onsubmit=e=>{e.preventDefault();const f=new FormData(form),name=String(f.get('name')).trim(),ticker=String(f.get('ticker')).trim().toUpperCase();if(!name||!ticker)return;const t={id:Date.now(),name,ticker,img:'punkdog',mc:3100,change:0,bond:0,holders:1,volume:0,price:.0000031,created:'Just now'};tokens.unshift(t);save();go('success')};const imagefile=$('#imagefile');if(imagefile)imagefile.onchange=()=>{const f=imagefile.files[0];if(f&&f.size<=5e6)$('#preview').src=URL.createObjectURL(f)};document.querySelectorAll('[data-setting]').forEach(x=>x.onclick=()=>modal(`<h2>${x.dataset.setting}</h2><p>This feature is a design preview. No live account or X Money service is connected.</p>`));['deposit','withdraw','editprofile','logout','follow','copylink'].forEach(id=>{const el=$('#'+id);if(el)el.onclick=()=>modal(`<h2>${id==='copylink'?'Demo link':id.charAt(0).toUpperCase()+id.slice(1)}</h2><p>This is a demo-only action. No external service or real money is involved.</p>`)});$('#connect').onclick=()=>modal('<h2>Connect with X</h2><div class="xlogo">𝕏</div><p>Sign in with your X account to start trading with X Money.</p><button class="btn primary" id="continueX">Continue with X (Demo)</button><p><small>X OAuth and X Money are NOT integrated. This is a visual concept.</small></p>');$('#notify').onclick=()=>modal('<h2>Notifications</h2><p>No new demo notifications.</p>');$('#close').onclick=close;$('#modal').onclick=e=>{if(e.target.id==='modal')close()};document.addEventListener('click',e=>{if(e.target.id==='continueX'){modal('<h2>Connect X Money</h2><p>Illustrative balance: $1,482.71</p><p>Trading Limit: $100 · $500 · $1,000 · Custom</p><button class="btn primary" id="authX">Authorize (Demo)</button>');}if(e.target.id==='authX'){close();go('trending')}});}render();
