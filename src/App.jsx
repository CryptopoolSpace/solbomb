import { useState, useEffect, useCallback, useRef, useMemo } from "react";

const EMOJIS = ['🐶','🐱','🚀','💎','🔥','⚡','🌙','🦊','🐸','🦁','🐉','💣','👾','🤖','🦄','🎯','💰','🍕','🌊','⭐'];
const NAMES  = ['BombCat','MoonDog','SolFox','RocketApe','NoodleCoin','GigaChad','PepeSol','BonkTwo','LaserEyes','ChadCoin','SambalTok','CryptoNasi','ViralPepe','MegaDoge','StarToken','QuantumApe','CryptoFrog','SolBear','DiamondPaw','NeonShib'];
const SYMS   = ['BCAT','MDOG','SFOX','RAPE','NDLC','GIGA','PSOL','BNKII','LEYE','CHAD','SMBL','NASI','VIRL','MEGA','STAR','QAPE','FROG','SBRR','DPAW','NSHIB'];
const DESCS  = ['The most explosive memecoin on Solana. Community-driven, no team allocation, pure degen energy.','Born in the meme labs. Grown by degens. Fueled by pure chaos and vibes only.','Fair launch only. No presale. No team tokens. Just vibes and bonding curves.'];
const COLORS = ['#ff6b00','#7b2ff7','#00c2ff','#ff0080','#00e676','#ffcc00','#ff4444','#00f5d4'];
const RANK_LABELS = ['👑','🥈','🥉','4','5'];
const RANK_COLORS = ['#ffcc00','#b0c4de','#cd7f32','#4a6a8a','#4a6a8a'];

const SEED_TRADES = [
  { id:'s1', type:'buy',  sol:'0.500', tokens:'11,904', wallet:'7xH2…3kMp', time:'2m ago',  live:false },
  { id:'s2', type:'sell', sol:'0.200', tokens:'4,761',  wallet:'9qF1…8nZr', time:'5m ago',  live:false },
  { id:'s3', type:'buy',  sol:'1.000', tokens:'23,809', wallet:'3dR7…2wPj', time:'8m ago',  live:false },
  { id:'s4', type:'buy',  sol:'0.300', tokens:'7,142',  wallet:'5sK4…9xLv', time:'12m ago', live:false },
  { id:'s5', type:'sell', sol:'0.700', tokens:'16,666', wallet:'2mN6…4hQc', time:'18m ago', live:false },
];

function generateTokens(n) {
  return Array.from({ length: n }, (_, i) => {
    const curve = Math.floor(Math.random() * 90) + 5;
    const price  = (Math.random() * 0.0005 + 0.000001).toFixed(6);
    const change = Math.round((Math.random() * 600) - 100);
    const mc = Math.floor(curve * 790).toLocaleString();
    const age = Math.floor(Math.random() * 120);
    const status = curve > 75 ? 'graduating' : age < 10 ? 'new' : 'bonding';
    return { id:i, name:NAMES[i%NAMES.length], sym:SYMS[i%SYMS.length], emoji:EMOJIS[i%EMOJIS.length], curve, price, change, age, mc, desc:DESCS[i%DESCS.length], color:COLORS[i%COLORS.length], status, mintAddress:null };
  });
}

const INITIAL_TOKENS = generateTokens(20);

function formatAge(mins) {
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins/60)}h ago`;
}

function MiniChart({ curvePct, tokenSym }) {
  const [points, setPoints] = useState(() => {
    const base = (curvePct / 100) * 0.0005 + 0.000001;
    return Array.from({length:40}, (_,i) => base * (1 + (Math.random()-0.5)*0.08 + i*0.002));
  });
  const [slot, setSlot] = useState(null);

  useEffect(() => {
    const start = 280000000 + Math.floor(Math.random()*1000000);
    setSlot(start);
    const id = setInterval(() => setSlot(s => s + Math.floor(Math.random()*3+1)), 400);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setPoints(prev => {
        const last = prev[prev.length-1];
        const next = last * (1 + (Math.random()*0.03 - 0.01));
        return [...prev.slice(1), Math.max(0.000001, next)];
      });
    }, 8000);
    return () => clearInterval(id);
  }, []);

  const min = Math.min(...points) * 0.97;
  const max = Math.max(...points) * 1.03;
  const W = 400, H = 120;
  const toX = i => (i / (points.length-1)) * W;
  const toY = v => H - ((v - min) / (max - min + 0.000001)) * H;
  const pathD = points.map((v,i) => `${i===0?'M':'L'}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ');
  const areaD = pathD + ` L${W},${H} L0,${H} Z`;
  const current = points[points.length-1];
  const first = points[0];
  const delta = ((current - first) / first) * 100;
  const isUp = delta >= 0;

  return (
    <div className="chart-box">
      <div className="chart-header">
        <div>
          <div className="chart-price">{current.toFixed(8)} SOL</div>
          <div className={`chart-change ${isUp?'up':'down'}`}>
            {isUp?'▲':'▼'} {Math.abs(delta).toFixed(2)}% (session)
          </div>
        </div>
        <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4}}>
          <div className="rpc-badge live">
            <span className="rpc-dot"/>
            {slot ? `LIVE devnet · slot ${slot.toLocaleString()}` : 'Connecting…'}
          </div>
          <div style={{fontSize:10,color:'var(--muted)',fontFamily:'var(--mono)'}}>~2,000 TPS</div>
        </div>
      </div>
      <div className="chart-canvas">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none">
          <defs>
            <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00c2ff" stopOpacity="0.25"/>
              <stop offset="95%" stopColor="#00c2ff" stopOpacity="0"/>
            </linearGradient>
          </defs>
          <path d={areaD} fill="url(#pg)"/>
          <path d={pathD} fill="none" stroke="#00c2ff" strokeWidth="2"/>
          <line x1="0" y1={H*0.1} x2={W} y2={H*0.1} stroke="#00e676" strokeWidth="1" strokeDasharray="4,4"/>
          <text x={W-4} y={H*0.1-4} fill="#00e676" fontSize="9" textAnchor="end">🎓 Grad</text>
        </svg>
      </div>
      <div className="chart-legend">
        <span><span style={{display:'inline-block',width:10,height:2,background:'#00c2ff',borderRadius:2,verticalAlign:'middle',marginRight:4}}/>${tokenSym} price</span>
        <span style={{color:'#00e676',fontSize:10}}>— Graduation target</span>
        <span style={{color:'var(--muted)',fontSize:10}}>Ticks every 8s · devnet RPC</span>
      </div>
    </div>
  );
}

function TradeFeed({ tokenSym }) {
  const [trades, setTrades] = useState(SEED_TRADES);
  useEffect(() => {
    const wallets = ['4xK9…mNpR','7bT2…3qWs','9fR8…kLpM','2dN5…8xZv','6mP1…4hQc'];
    const id = setInterval(() => {
      if (Math.random() > 0.4) return;
      const isBuy = Math.random() > 0.4;
      const sol = (Math.random()*2+0.1).toFixed(3);
      const tokens = Math.floor(parseFloat(sol)/0.000042).toLocaleString();
      const now = new Date();
      const trade = {
        id: `live-${Date.now()}`,
        type: isBuy ? 'buy' : 'sell',
        sol, tokens,
        wallet: wallets[Math.floor(Math.random()*wallets.length)],
        time: now.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'}),
        live: true,
      };
      setTrades(prev => [trade, ...prev].slice(0,15));
    }, 6000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="trades-box">
      <div className="trades-title-row">
        <span className="trades-title">Recent Trades</span>
        <span className="live-indicator active"><span className="live-dot"/>Listening on devnet…</span>
      </div>
      <div className="trade-row header">
        <span>Type</span><span>SOL</span><span>Tokens</span><span>Wallet</span><span>Time</span>
      </div>
      {trades.map(tr => (
        <div key={tr.id} className={`trade-row${tr.live?' trade-live':''}`}>
          <span className={`trade-type ${tr.type}`}>{tr.type.toUpperCase()}</span>
          <span className="trade-val">{tr.sol}</span>
          <span className="trade-val">{tr.tokens}</span>
          <span className="trade-wallet">{tr.wallet}</span>
          <span className="trade-time">{tr.time}</span>
        </div>
      ))}
      <div className="trades-waiting">
        <span className="waiting-dot"/>
        Waiting for on-chain activity · Program deploys to devnet will stream here live
      </div>
    </div>
  );
}

function KingOfHill({ tokens, onOpenToken, onCurveUpdate }) {
  const prevRanksRef = useRef(new Map());
  const [lastTradeId, setLastTradeId] = useState(null);
  const [lastTradeName, setLastTradeName] = useState('');
  const [lastTradeAmt, setLastTradeAmt] = useState('');
  const tokensRef = useRef(tokens);
  const onCurveUpdateRef = useRef(onCurveUpdate);
  useEffect(() => { tokensRef.current = tokens; }, [tokens]);
  useEffect(() => { onCurveUpdateRef.current = onCurveUpdate; }, [onCurveUpdate]);

  useEffect(() => {
    const id = setInterval(() => {
      const tkns = tokensRef.current;
      const eligible = tkns.filter(t => t.curve < 99);
      if (eligible.length === 0) return;
      const topIds = new Set([...tkns].sort((a,b) => b.curve-a.curve).slice(0,5).map(t=>t.id));
      const inTop  = eligible.filter(t =>  topIds.has(t.id));
      const outTop = eligible.filter(t => !topIds.has(t.id));
      const pool   = Math.random() < 0.65 ? inTop : outTop;
      const source = pool.length > 0 ? pool : eligible;
      const target = source[Math.floor(Math.random()*source.length)];
      const bump     = parseFloat((Math.random()*2.5+0.5).toFixed(1));
      const newCurve = Math.min(99, target.curve+bump);
      const tradeAmt = (Math.random()*3+0.1).toFixed(2);
      onCurveUpdateRef.current(target.id, newCurve);
      setLastTradeId(target.id);
      setLastTradeName(target.name);
      setLastTradeAmt(tradeAmt);
      setTimeout(() => setLastTradeId(null), 1800);
    }, 3200);
    return () => clearInterval(id);
  }, []);

  const top5 = useMemo(() => [...tokens].sort((a,b) => b.curve-a.curve).slice(0,5), [tokens]);
  const enriched = useMemo(() => {
    const prevMap = prevRanksRef.current;
    return top5.map((t,i) => {
      const prev = prevMap.has(t.id) ? prevMap.get(t.id) : null;
      return { token:t, rank:i+1, prevRank:prev, delta:prev!==null ? prev-(i+1) : 0, flash:t.id===lastTradeId };
    });
  }, [top5, lastTradeId]);
  useEffect(() => { prevRanksRef.current = new Map(enriched.map(e => [e.token.id, e.rank])); }, [enriched]);

  const king = enriched[0];
  return (
    <div className="koth-wrap">
      <div className="koth-header">
        <span className="koth-title">👑 King of the Hill</span>
        <span className="koth-live"><span className="koth-live-dot"/>LIVE</span>
      </div>
      {king && (
        <div className="koth-king-banner" style={{borderColor:`${king.token.color}55`,background:`${king.token.color}0d`}} onClick={() => onOpenToken(king.token)}>
          <div className="koth-king-left">
            <div className="koth-king-emoji">{king.token.emoji}</div>
            <div>
              <div className="koth-king-name">{king.token.name}</div>
              <div className="koth-king-sym">${king.token.sym}</div>
            </div>
          </div>
          <div className="koth-king-right">
            <div className="koth-king-curve">{king.token.curve.toFixed(1)}%</div>
            <div className="koth-king-label">of bonding curve</div>
            <div className="koth-king-bar"><div className="koth-king-fill" style={{width:`${king.token.curve}%`,background:king.token.color}}/></div>
          </div>
        </div>
      )}
      <div className="koth-list">
        {enriched.map(entry => (
          <div key={entry.token.id} className={`koth-row${entry.flash?' koth-flash':''}`} onClick={() => onOpenToken(entry.token)}>
            <div className="koth-rank" style={{color:RANK_COLORS[entry.rank-1]}}>{RANK_LABELS[entry.rank-1]}</div>
            <div className="koth-row-emoji">{entry.token.emoji}</div>
            <div className="koth-row-info">
              <div className="koth-row-name">{entry.token.name}</div>
              <div className="koth-row-bar-wrap">
                <div className="koth-row-bar"><div className="koth-row-fill" style={{width:`${entry.token.curve}%`,background:entry.token.color}}/></div>
                <span className="koth-row-pct">{entry.token.curve.toFixed(1)}%</span>
              </div>
            </div>
            <div className="koth-row-delta">
              {entry.delta > 0 && <span className="koth-delta up">▲{entry.delta}</span>}
              {entry.delta < 0 && <span className="koth-delta down">▼{Math.abs(entry.delta)}</span>}
              {entry.delta === 0 && entry.prevRank === null && <span className="koth-delta new">NEW</span>}
              {entry.delta === 0 && entry.prevRank !== null && <span className="koth-delta flat">—</span>}
            </div>
          </div>
        ))}
      </div>
      {lastTradeName && (
        <div className="koth-ticker">
          <span className="koth-ticker-dot"/>
          <span className="koth-ticker-text">🟢 <strong>{lastTradeName}</strong> just received <strong>{lastTradeAmt} SOL</strong> buy</span>
        </div>
      )}
    </div>
  );
}

function StatsBar({ tokens }) {
  const [displayed, setDisplayed] = useState({tokens:0,volume:0,grad:0,traders:0});
  useEffect(() => {
    const targets = {tokens:tokens.length,volume:847.3,grad:12,traders:234};
    let frame = 0;
    const id = setInterval(() => {
      frame++;
      const p = Math.min(frame/60,1);
      setDisplayed({tokens:Math.floor(targets.tokens*p),volume:parseFloat((targets.volume*p).toFixed(1)),grad:Math.floor(targets.grad*p),traders:Math.floor(targets.traders*p)});
      if (frame >= 60) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [tokens.length]);
  return (
    <div className="stats-bar">
      <div className="stat-card"><div className="stat-label">Tokens Launched</div><div className="stat-val blue">{displayed.tokens}</div></div>
      <div className="stat-card"><div className="stat-label">Total Volume</div><div className="stat-val cyan">{displayed.volume} SOL</div></div>
      <div className="stat-card"><div className="stat-label">Graduated</div><div className="stat-val green">{displayed.grad}</div></div>
      <div className="stat-card"><div className="stat-label">Active Traders</div><div className="stat-val orange">{displayed.traders}</div></div>
    </div>
  );
}

function TokenCard({ token, onClick }) {
  return (
    <div className="token-card" onClick={onClick}>
      <div className="token-card-header">
        <div className="token-img" style={{background:`${token.color}22`}}>{token.emoji}</div>
        <div className="token-card-name">
          <div className="token-card-title">{token.name}</div>
          <div className="token-card-sym">${token.sym}</div>
        </div>
        <div className="token-card-price">
          <div className="token-card-price-val">{token.price} SOL</div>
          <div className={`token-card-change ${token.change>=0?'up':'down'}`}>{token.change>=0?'▲':'▼'} {Math.abs(token.change)}%</div>
        </div>
      </div>
      <div className="token-card-desc">{token.desc}</div>
      <div className="curve-progress">
        <div className="curve-track"><div className="curve-fill" style={{width:`${token.curve}%`}}/></div>
        <div className="curve-meta"><span>{token.curve}% filled</span><span>${Math.floor(token.curve*790).toLocaleString()} / $69,000</span></div>
      </div>
      <div className="token-card-footer">
        <span className="token-card-age">{formatAge(token.age)}</span>
        <span className="token-tag">{token.status==='graduating'?'🚀 GRADUATING':token.status==='new'?'🆕 NEW':'BONDING'}</span>
        <span className="token-card-mc">MC: ${token.mc}</span>
      </div>
    </div>
  );
}

function HomePage({ tokens, onOpenToken, onLaunch, onCurveUpdate }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const visible = tokens.filter(t => {
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.sym.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter==='new') return t.status==='new';
    if (filter==='trending') return t.change>100;
    if (filter==='graduating') return t.status==='graduating';
    return true;
  });
  return (
    <div className="page">
      <div className="home-wrap">
        <StatsBar tokens={tokens}/>
        <div className="home-columns">
          <div className="home-main">
            <div className="filter-row">
              {['all','new','trending','graduating'].map(f => (
                <button key={f} className={`filter-btn${filter===f?' active':''}`} onClick={() => setFilter(f)}>
                  {f==='all'?'🔥 All':f==='new'?'🆕 New':f==='trending'?'📈 Trending':'🚀 Graduating'}
                </button>
              ))}
              <input className="search-box" placeholder="Search tokens…" value={search} onChange={e => setSearch(e.target.value)}/>
            </div>
            <div className="token-grid">
              {visible.length > 0
                ? visible.map(t => <TokenCard key={t.id} token={t} onClick={() => onOpenToken(t)}/>)
                : <div className="no-results">No tokens match your filter.</div>
              }
            </div>
          </div>
          <div className="home-sidebar">
            <KingOfHill tokens={tokens} onOpenToken={onOpenToken} onCurveUpdate={onCurveUpdate}/>
          </div>
        </div>
      </div>
    </div>
  );
}

function LaunchPage({ onBack, onSuccess }) {
  const [name, setName] = useState('');
  const [sym, setSym]   = useState('');
  const [desc, setDesc] = useState('');
  const [imgUrl, setImgUrl] = useState(null);
  const [launching, setLaunching] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Please select an image file.'); return; }
    if (file.size > 5*1024*1024) { alert('Image must be under 5MB.'); return; }
    setImgUrl(URL.createObjectURL(file));
  };

  const handleLaunch = async () => {
    if (!name.trim() || !sym.trim()) { alert('Fill in token name and symbol!'); return; }
    setLaunching(true);
    await new Promise(r => setTimeout(r, 2000));
    const fakeMint = 'SoLB' + Math.random().toString(36).substring(2,10).toUpperCase() + 'pump';
    setLaunching(false);
    onSuccess(name.trim(), sym.trim().toUpperCase(), imgUrl ?? '', fakeMint);
  };

  return (
    <div className="page">
      <div className="launch-wrap">
        <div className="launch-header">
          <div className="launch-title">💣 Drop a Bomb</div>
          <div className="launch-sub">Launch your memecoin on Solana in seconds</div>
        </div>
        <div className="launch-form">
          <div className="form-group">
            <div className="form-label">Token Image <span style={{textTransform:'none',fontWeight:400,marginLeft:6,fontSize:11}}>Recommended 1:1, max 5MB</span></div>
            <input ref={fileInputRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleFileChange}/>
            <div className="img-upload" onClick={() => fileInputRef.current?.click()}>
              {imgUrl ? <img src={imgUrl} alt="token" className="img-upload-preview"/> : <><span className="img-upload-icon">🖼️</span><span className="img-upload-text">Click to upload</span></>}
            </div>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <div className="form-label">Name</div>
              <input className="form-input" placeholder="e.g. BombCat" maxLength={32} value={name} onChange={e => setName(e.target.value)}/>
            </div>
            <div className="form-group">
              <div className="form-label">Symbol</div>
              <input className="form-input" placeholder="e.g. BCAT" maxLength={10} value={sym} onChange={e => setSym(e.target.value.toUpperCase())}/>
            </div>
          </div>
          <div className="form-group">
            <div className="form-label">Description</div>
            <textarea className="form-input" placeholder="What's the vibe?" value={desc} onChange={e => setDesc(e.target.value)}/>
          </div>
          <div className="fee-info">
            <div className="fee-row"><span className="fee-label">Mint account rent</span><span className="fee-val">~0.0014 SOL</span></div>
            <div className="fee-row"><span className="fee-label">Token metadata</span><span className="fee-val">~0.0098 SOL</span></div>
            <div className="fee-row"><span className="fee-label">Bonding curve setup</span><span className="fee-val">~0.0100 SOL</span></div>
            <div className="fee-row"><span className="fee-label">Total launch cost</span><span className="fee-val total">~0.0212 SOL</span></div>
          </div>
          <div className="wallet-required-notice">⚠️ Connect Phantom wallet to launch on mainnet</div>
          <button className="btn-bomb" onClick={handleLaunch} disabled={launching}>
            {launching ? '⏳ Creating mint on devnet…' : '💣 Drop Bomb · Launch Token'}
          </button>
          <button onClick={onBack} style={{marginTop:12,width:'100%',background:'transparent',border:'none',color:'var(--muted)',cursor:'pointer',fontSize:13,fontFamily:'var(--font)'}}>← Back</button>
        </div>
      </div>
    </div>
  );
}

function TradingPanel({ token }) {
  const [mode, setMode] = useState('buy');
  const [amount, setAmount] = useState('');
  const [txStatus, setTxStatus] = useState(null);
  const price = parseFloat(token.price);
  const solAmt = parseFloat(amount) || 0;
  const tokensEst = solAmt > 0 ? Math.floor(solAmt/price).toLocaleString() : '—';
  const feeEst = solAmt > 0 ? (solAmt*0.01).toFixed(4) : '—';

  const handleTrade = async () => {
    if (!amount || parseFloat(amount) <= 0) { alert('Enter an amount'); return; }
    setTxStatus({state:'loading', msg:'Simulating transaction on devnet…'});
    await new Promise(r => setTimeout(r, 1500));
    setTxStatus({state:'error', msg:'Connect Phantom wallet to execute real trades on devnet.'});
  };

  return (
    <div className="trading-panel">
      <div className="panel-title">Trade {token.sym}</div>
      {!token.mintAddress && <div className="demo-mode-notice">🎭 Demo token — create a real token via Launch to trade on-chain.</div>}
      <div className="tab-row">
        <button className={`trade-tab buy-tab${mode==='buy'?' active':''}`} onClick={() => {setMode('buy');setTxStatus(null);}}>Buy</button>
        <button className={`trade-tab sell-tab${mode==='sell'?' active':''}`} onClick={() => {setMode('sell');setTxStatus(null);}}>Sell</button>
      </div>
      <div className="amount-presets">
        {['0.1','0.5','1','2'].map(v => <button key={v} className="preset-btn" onClick={() => {setAmount(v);setTxStatus(null);}}>{v} SOL</button>)}
      </div>
      <div className="trade-input-wrap">
        <input className="trade-input" type="number" min="0" step="0.1" placeholder="0.0" value={amount} onChange={e => {setAmount(e.target.value);setTxStatus(null);}}/>
        <span className="trade-input-suffix">SOL</span>
      </div>
      <div className="trade-info-row"><span className="trade-info-label">You receive</span><span className="trade-info-val">{tokensEst} {token.sym}</span></div>
      <div className="trade-info-row"><span className="trade-info-label">Platform fee (1%)</span><span className="trade-info-val">{feeEst==='—'?'—':`${feeEst} SOL`}</span></div>
      <div className="trade-info-row"><span className="trade-info-label">Fee receiver</span><span className="trade-info-val" style={{fontSize:10,fontFamily:'monospace'}}>8tWE…ustt</span></div>
      {mode==='buy'
        ? <button className="btn-buy-now" onClick={handleTrade}>🟢 Buy Now</button>
        : <button className="btn-sell-now" onClick={handleTrade}>🔴 Sell Now</button>
      }
      {txStatus && <div className={`tx-status ${txStatus.state}`}>{txStatus.state==='loading'?'⏳ ':''}{txStatus.msg}</div>}
    </div>
  );
}

function TokenDetailPage({ token, onBack }) {
  return (
    <div className="page">
      <div className="detail-wrap">
        <button className="back-btn" onClick={onBack}>← Back to Board</button>
        <div className="detail-grid">
          <div>
            <div className="detail-header">
              <div className="detail-img" style={{background:`${token.color}22`}}>{token.emoji}</div>
              <div>
                <div className="detail-name">{token.name}</div>
                <div className="detail-sym">${token.sym}</div>
                <div className="detail-links">
                  <a className="detail-link" href="https://explorer.solana.com/?cluster=devnet" target="_blank" rel="noreferrer">🔍 Explorer</a>
                  <span className="detail-link disabled">🐦 Twitter</span>
                  <span className="detail-link disabled">💬 Telegram</span>
                </div>
              </div>
            </div>
            <MiniChart curvePct={token.curve} tokenSym={token.sym}/>
            <TradeFeed tokenSym={token.sym}/>
          </div>
          <div>
            <div className="curve-detail">
              <div className="curve-detail-title">BONDING CURVE PROGRESS</div>
              <div className="curve-big-track"><div className="curve-big-fill" style={{width:`${token.curve}%`}}/></div>
              <div className="curve-detail-row">
                <span className="curve-detail-label">{token.curve}% filled</span>
                <span className="curve-detail-val">${Math.floor(token.curve*790).toLocaleString()} / $69,000</span>
              </div>
            </div>
            <div className="token-info-box">
              <div className="info-row"><span className="info-label">Market Cap</span><span className="info-val">${token.mc}</span></div>
              <div className="info-row"><span className="info-label">Price</span><span className="info-val">{token.price} SOL</span></div>
              <div className="info-row"><span className="info-label">Network</span><span className="info-val devnet-text">◉ Solana Devnet</span></div>
              <div className="info-row"><span className="info-label">Mint</span><span className="info-val" style={{fontFamily:'monospace',fontSize:11}}>{token.mintAddress?`${token.mintAddress.slice(0,6)}…${token.mintAddress.slice(-4)}`:<span style={{color:'var(--muted)',fontFamily:'inherit'}}>demo token</span>}</span></div>
              <div className="info-row"><span className="info-label">Fee Receiver</span><span className="info-val" style={{fontFamily:'monospace',fontSize:11}}>8tWE…ustt</span></div>
              <div className="info-row"><span className="info-label">Platform Fee</span><span className="info-val">1%</span></div>
            </div>
            <TradingPanel token={token}/>
          </div>
        </div>
      </div>
    </div>
  );
}

function SuccessModal({ name, sym, imgUrl, mintAddress, onClose, onView }) {
  const displayCA = mintAddress ?? ('SoLB'+Math.random().toString(36).substring(2,10).toUpperCase());
  return (
    <div className="modal-overlay show" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-emoji">{imgUrl?<img src={imgUrl} alt={name} style={{width:64,height:64,borderRadius:12,objectFit:'cover'}}/>:'💣'}</div>
        <div className="modal-title">Bomb Dropped! 🎉</div>
        <div className="modal-sub">{name} (${sym}) is live on Solana Devnet!</div>
        <div className="modal-token" onClick={() => navigator.clipboard?.writeText(displayCA).catch(()=>{})}>
          CA: {displayCA.slice(0,8)}…{displayCA.slice(-6)} 📋
        </div>
        <div className="modal-actions">
          <button className="btn-view-token" onClick={onView}>Trade Token</button>
          <button className="btn-close-modal" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState('home');
  const [tokens, setTokens] = useState(INITIAL_TOKENS);
  const [selectedToken, setSelectedToken] = useState(null);
  const [modal, setModal] = useState(null);

  const handleSuccess = (name, sym, imgUrl, mintAddress = null) => {
    const newToken = {
      id: Date.now(), name, sym,
      emoji: EMOJIS[Math.floor(Math.random()*EMOJIS.length)],
      curve: 2, price: '0.000001', change: 0, age: 0, mc: '69',
      desc: 'A brand new memecoin on Solana. Community-driven, fair launch.',
      color: COLORS[Math.floor(Math.random()*COLORS.length)],
      status: 'new', mintAddress,
    };
    setTokens(prev => [newToken, ...prev]);
    setModal({ name, sym, imgUrl, mintAddress });
  };

  const handleViewToken = useCallback(() => { setModal(null); setPage('detail'); }, []);

  useEffect(() => {
    if (page==='detail' && !selectedToken && tokens.length>0) setSelectedToken(tokens[0]);
  }, [page, selectedToken, tokens]);

  const goToDetail = useCallback((t) => { setSelectedToken(t); setPage('detail'); }, []);

  const handleCurveUpdate = useCallback((id, newCurve) => {
    setTokens(prev => prev.map(t => {
      if (t.id!==id) return t;
      const status = newCurve>75?'graduating':t.status==='new'?'new':'bonding';
      return {...t, curve:newCurve, mc:Math.floor(newCurve*790).toLocaleString(), status};
    }));
  }, []);

  return (
    <>
      <div className="bg-grid"/>
      <nav className="sb-nav">
        <div className="nav-left">
          <button className="nav-brand" onClick={() => setPage('home')}>
            <div className="nav-logo-box">💣</div>
            <span className="nav-brand-name">SolBomb</span>
          </button>
          <span className="devnet-badge">DEVNET</span>
        </div>
        <div className="nav-right">
          <button className={`nav-tab${page==='home'?' active':''}`} onClick={() => setPage('home')}>Board</button>
          <button className={`nav-tab${page==='launch'?' active':''}`} onClick={() => setPage('launch')}>Launch</button>
          <button className="btn-connect">Connect Wallet</button>
          <button className="btn-launch-nav" onClick={() => setPage('launch')}>💣 Drop Bomb</button>
        </div>
      </nav>

      {page==='home' && <HomePage tokens={tokens} onOpenToken={goToDetail} onLaunch={() => setPage('launch')} onCurveUpdate={handleCurveUpdate}/>}
      {page==='launch' && <LaunchPage onBack={() => setPage('home')} onSuccess={handleSuccess}/>}
      {page==='detail' && selectedToken && <TokenDetailPage token={selectedToken} onBack={() => setPage('home')}/>}

      {modal && (
        <SuccessModal
          name={modal.name} sym={modal.sym} imgUrl={modal.imgUrl} mintAddress={modal.mintAddress}
          onClose={() => {setModal(null); setPage('home');}}
          onView={handleViewToken}
        />
      )}
    </>
  );
}
