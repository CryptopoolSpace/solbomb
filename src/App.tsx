import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';

// ── Constants ──────────────────────────────────────────────────────────────────
const SOLBOMB_MINT = 'GXEBKBdwVn91UM6Q33JK8k1Y3uK1NmT4wru8p25ZVgE8';
const EMOJIS = ['🐶','🐱','🚀','💎','🔥','⚡','🌙','🦊','🐸','🦁','🐉','💣','👾','🤖','🦄','🎯','💰','🍕','🌊','⭐'];
const NAMES  = ['BombCat','MoonDog','SolFox','RocketApe','NoodleCoin','GigaChad','PepeSol','BonkTwo','LaserEyes','ChadCoin','SambalTok','CryptoNasi','ViralPepe','MegaDoge','StarToken','QuantumApe','CryptoFrog','SolBear','DiamondPaw','NeonShib'];
const SYMS   = ['BCAT','MDOG','SFOX','RAPE','NDLC','GIGA','PSOL','BNKII','LEYE','CHAD','SMBL','NASI','VIRL','MEGA','STAR','QAPE','FROG','SBRR','DPAW','NSHIB'];
const DESCS  = ['The most explosive memecoin on Solana. Community-driven, no team allocation, pure degen energy.','Born in the meme labs. Grown by degens. Fueled by pure chaos and vibes only.','Fair launch only. No presale. No team tokens. Just vibes and bonding curves.'];
const COLORS = ['#ff6b00','#7b2ff7','#00c2ff','#ff0080','#00e676','#ffcc00','#ff4444','#00f5d4'];

function generateTokens(n) {
  return Array.from({ length: n }, (_, i) => {
    const curve = Math.floor(Math.random() * 90) + 5;
    const price  = (Math.random() * 0.0005 + 0.000001).toFixed(6);
    const change = Math.round((Math.random() * 600) - 100);
    const mc = Math.floor(curve * 790).toLocaleString();
    const age = Math.floor(Math.random() * 120);
    const status = curve > 75 ? 'graduating' : age < 10 ? 'new' : 'bonding';
    return { id:i, name:NAMES[i%NAMES.length], sym:SYMS[i%SYMS.length], emoji:EMOJIS[i%EMOJIS.length], curve, price, change, age, mc, desc:DESCS[i%DESCS.length], color:COLORS[i%COLORS.length], status };
  });
}

const INITIAL_TOKENS = generateTokens(20);

function formatAge(mins) {
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins/60)}h ago`;
}

// ── Wallet Button ──────────────────────────────────────────────────────────────
function WalletButton() {
  const { connected, publicKey, disconnect, connecting } = useWallet();
  const { setVisible } = useWalletModal();
  const { connection } = useConnection();
  const [balance, setBalance] = useState(null);

  useEffect(() => {
    if (!connected || !publicKey) { setBalance(null); return; }
    const fetch = async () => {
      try { const bal = await connection.getBalance(publicKey); setBalance(bal / LAMPORTS_PER_SOL); } catch {}
    };
    fetch();
    const id = setInterval(fetch, 15000);
    return () => clearInterval(id);
  }, [connected, publicKey, connection]);

  if (connected && publicKey) {
    const a = publicKey.toBase58();
    return (
      <button className="btn-connect connected" onClick={() => disconnect()}>
        <span className="wallet-dot"/>
        <span>{a.slice(0,4)}…{a.slice(-4)}</span>
        {balance !== null && <span className="wallet-bal">{balance.toFixed(2)} SOL</span>}
      </button>
    );
  }
  return (
    <button className="btn-connect" onClick={() => setVisible(true)} disabled={connecting}>
      <span className="wallet-icon">◎</span>
      {connecting ? 'Connecting…' : 'Connect'}
    </button>
  );
}

// ── Token Card ─────────────────────────────────────────────────────────────────
function TokenCard({ token, onClick }) {
  return (
    <div className="token-card" onClick={onClick}>
      <div className="token-card-top">
        <div className="token-img" style={{background:`${token.color}22`}}>{token.emoji}</div>
        <div className="token-card-info">
          <div className="token-card-name">{token.name} <span className="token-card-sym">${token.sym}</span></div>
          <div className="token-card-age">{formatAge(token.age)}</div>
        </div>
        <div className="token-card-right">
          <div className="token-card-price">{token.price} SOL</div>
          <div className={`token-card-change ${token.change>=0?'up':'down'}`}>{token.change>=0?'▲':'▼'} {Math.abs(token.change)}%</div>
        </div>
      </div>
      <div className="token-card-desc">{token.desc}</div>
      <div className="curve-row">
        <div className="curve-track"><div className="curve-fill" style={{width:`${token.curve}%`}}/></div>
        <span className="curve-pct">{token.curve}%</span>
        {token.status==='graduating' && <span className="tag-graduating">🚀 GRADUATING</span>}
        {token.status==='new' && <span className="tag-new">🆕 NEW</span>}
      </div>
    </div>
  );
}

// ── King of the Hill ───────────────────────────────────────────────────────────
function KingOfHill({ tokens, onOpenToken, onCurveUpdate }) {
  const [lastTrade, setLastTrade] = useState(null);
  const tokensRef = useRef(tokens);
  const onCurveRef = useRef(onCurveUpdate);
  useEffect(() => { tokensRef.current = tokens; }, [tokens]);
  useEffect(() => { onCurveRef.current = onCurveUpdate; }, [onCurveUpdate]);

  useEffect(() => {
    const id = setInterval(() => {
      const tkns = tokensRef.current.filter(t => t.curve < 99);
      if (!tkns.length) return;
      const target = tkns[Math.floor(Math.random()*tkns.length)];
      const bump = parseFloat((Math.random()*2+0.5).toFixed(1));
      onCurveRef.current(target.id, Math.min(99, target.curve+bump));
      setLastTrade({ name: target.name, amt: (Math.random()*2+0.1).toFixed(2) });
      setTimeout(() => setLastTrade(null), 2500);
    }, 3500);
    return () => clearInterval(id);
  }, []);

  const top5 = useMemo(() => [...tokens].sort((a,b) => b.curve-a.curve).slice(0,5), [tokens]);
  const RANK = ['👑','🥈','🥉','4','5'];
  const RCOL = ['#ffcc00','#b0c4de','#cd7f32','#4a6a8a','#4a6a8a'];

  return (
    <div className="koth-box">
      <div className="koth-head">
        <span className="koth-title">👑 King of the Hill</span>
        <span className="koth-live"><span className="pulse-dot"/>LIVE</span>
      </div>
      {top5.map((t,i) => (
        <div key={t.id} className="koth-row" onClick={() => onOpenToken(t)}>
          <span className="koth-rank" style={{color:RCOL[i]}}>{RANK[i]}</span>
          <span className="koth-emoji">{t.emoji}</span>
          <div className="koth-info">
            <div className="koth-name">{t.name}</div>
            <div className="koth-bar-row">
              <div className="koth-track"><div className="koth-fill" style={{width:`${t.curve}%`,background:t.color}}/></div>
              <span className="koth-pct">{t.curve.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      ))}
      {lastTrade && (
        <div className="koth-ticker">
          <span className="pulse-dot green"/>
          <span>🟢 <b>{lastTrade.name}</b> got <b>{lastTrade.amt} SOL</b> buy</span>
        </div>
      )}
    </div>
  );
}

// ── Stats Bar ──────────────────────────────────────────────────────────────────
function StatsBar({ tokens }) {
  return (
    <div className="stats-bar">
      <div className="stat"><div className="stat-val cyan">{tokens.length}</div><div className="stat-label">Launched</div></div>
      <div className="stat"><div className="stat-val orange">847 SOL</div><div className="stat-label">Volume</div></div>
      <div className="stat"><div className="stat-val green">12</div><div className="stat-label">Graduated</div></div>
      <div className="stat"><div className="stat-val blue">234</div><div className="stat-label">Traders</div></div>
    </div>
  );
}

// ── Board Page ─────────────────────────────────────────────────────────────────
function BoardPage({ tokens, onOpenToken, onCurveUpdate }) {
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
    <div className="page-content">
      <StatsBar tokens={tokens}/>
      <div className="board-layout">
        <div className="board-main">
          <div className="filter-bar">
            {['all','new','trending','graduating'].map(f => (
              <button key={f} className={`filter-btn${filter===f?' active':''}`} onClick={() => setFilter(f)}>
                {f==='all'?'🔥 All':f==='new'?'🆕 New':f==='trending'?'📈 Trending':'🚀 Graduating'}
              </button>
            ))}
            <input className="search-input" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
          <div className="token-grid">
            {visible.map(t => <TokenCard key={t.id} token={t} onClick={() => onOpenToken(t)}/>)}
            {visible.length === 0 && <div className="empty">No tokens found</div>}
          </div>
        </div>
        <div className="board-sidebar">
          <KingOfHill tokens={tokens} onOpenToken={onOpenToken} onCurveUpdate={onCurveUpdate}/>
        </div>
      </div>
    </div>
  );
}

// ── Launch Page ────────────────────────────────────────────────────────────────
function LaunchPage({ onSuccess }) {
  const { connected } = useWallet();
  const { setVisible } = useWalletModal();
  const [name, setName] = useState('');
  const [sym, setSym] = useState('');
  const [desc, setDesc] = useState('');
  const [img, setImg] = useState(null);
  const [launching, setLaunching] = useState(false);
  const fileRef = useRef(null);

  const handleLaunch = async () => {
    if (!name || !sym) { alert('Enter token name and symbol!'); return; }
    if (!connected) { setVisible(true); return; }
    setLaunching(true);
    await new Promise(r => setTimeout(r, 2000));
    setLaunching(false);
    onSuccess(name, sym.toUpperCase(), img);
  };

  return (
    <div className="page-content">
      <div className="launch-wrap">
        <div className="launch-header">
          <div className="launch-title">💣 Drop a Bomb</div>
          <div className="launch-sub">Launch your memecoin on Solana in seconds</div>
        </div>
        <div className="launch-form">
          <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={e => { const f=e.target.files?.[0]; if(f) setImg(URL.createObjectURL(f)); }}/>
          <div className="form-img" onClick={() => fileRef.current?.click()}>
            {img ? <img src={img} alt="token" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:10}}/> : <><span style={{fontSize:32}}>🖼️</span><span style={{fontSize:12,color:'var(--muted)',marginTop:6}}>Upload image</span></>}
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Token Name</label>
              <input className="form-input" placeholder="e.g. BombCat" value={name} onChange={e => setName(e.target.value)}/>
            </div>
            <div className="form-group">
              <label className="form-label">Symbol</label>
              <input className="form-input" placeholder="e.g. BCAT" value={sym} onChange={e => setSym(e.target.value.toUpperCase())}/>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-input" placeholder="What's the vibe?" value={desc} onChange={e => setDesc(e.target.value)} style={{minHeight:80,resize:'vertical'}}/>
          </div>
          <div className="fee-box">
            <div className="fee-row"><span>Mint account rent</span><span>~0.0014 SOL</span></div>
            <div className="fee-row"><span>Token metadata</span><span>~0.0098 SOL</span></div>
            <div className="fee-row"><span>Bonding curve setup</span><span>~0.0100 SOL</span></div>
            <div className="fee-row total"><span>Total launch cost</span><span>~0.0212 SOL</span></div>
          </div>
          {!connected && <div className="wallet-notice">⚠️ Connect wallet to launch</div>}
          <button className="btn-bomb" onClick={handleLaunch} disabled={launching}>
            {launching ? '⏳ Creating on devnet…' : connected ? '💣 Drop Bomb' : '◎ Connect to Launch'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Profile Page ───────────────────────────────────────────────────────────────
function ProfilePage() {
  const { connected, publicKey, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const { connection } = useConnection();
  const [balance, setBalance] = useState(null);
  const [solbombBal, setSolbombBal] = useState(null);

  useEffect(() => {
    if (!connected || !publicKey) { setBalance(null); setSolbombBal(null); return; }
    const fetchBalances = async () => {
      try {
        // Fetch SOL balance
        const bal = await connection.getBalance(publicKey);
        setBalance(bal / LAMPORTS_PER_SOL);
      } catch {}

      try {
        // Fetch SOLBOMBDEV SPL token balance
        const mintPubkey = new PublicKey(SOLBOMB_MINT);
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, { mint: mintPubkey });
        if (tokenAccounts.value.length > 0) {
          const tokenAmount = tokenAccounts.value[0].account.data.parsed.info.tokenAmount;
          setSolbombBal(parseFloat(tokenAmount.uiAmount).toLocaleString());
        } else {
          setSolbombBal('0');
        }
      } catch {
        setSolbombBal('0');
      }
    };
    fetchBalances();
    const id = setInterval(fetchBalances, 20000);
    return () => clearInterval(id);
  }, [connected, publicKey, connection]);

  if (!connected) {
    return (
      <div className="page-content">
        <div className="profile-wrap">
          <div className="profile-empty">
            <div style={{fontSize:64,marginBottom:16}}>👤</div>
            <div className="profile-empty-title">Connect your wallet</div>
            <div className="profile-empty-sub">Connect Phantom to view your profile, holdings and history.</div>
            <button className="btn-cyan" onClick={() => setVisible(true)}>◎ Connect Wallet</button>
          </div>
        </div>
      </div>
    );
  }

  const addr = publicKey.toBase58();

  return (
    <div className="page-content">
      <div className="profile-wrap">
        <div className="profile-card">
          <div className="profile-avatar">👤</div>
          <div className="profile-addr">{addr.slice(0,8)}…{addr.slice(-8)}</div>
          <div className="profile-devnet-badge">◉ Devnet</div>
          <button className="btn-outline-sm" onClick={() => disconnect()}>Disconnect</button>
        </div>

        <div className="profile-section-title">Holdings</div>
        <div className="holdings-grid">
          <div className="holding-card">
            <div className="holding-label">SOL Balance</div>
            <div className="holding-val cyan">{balance !== null ? `${balance.toFixed(4)} SOL` : '…'}</div>
          </div>
          <div className="holding-card">
            <div className="holding-label">$SOLBOMB</div>
            <div className="holding-val orange">{solbombBal !== null ? solbombBal.toLocaleString() : '—'}</div>
          </div>
        </div>

        <div className="profile-section-title">Tokens Launched</div>
        <div className="empty-state">
          <div style={{fontSize:32,marginBottom:8}}>💣</div>
          <div style={{color:'var(--muted)',fontSize:13}}>No tokens launched yet</div>
          <div style={{color:'var(--muted)',fontSize:12,marginTop:4}}>Drop your first bomb!</div>
        </div>

        <div className="profile-section-title">Transaction History</div>
        <div className="empty-state">
          <div style={{fontSize:32,marginBottom:8}}>📋</div>
          <div style={{color:'var(--muted)',fontSize:13}}>No transactions yet</div>
        </div>
      </div>
    </div>
  );
}

// ── More Page ──────────────────────────────────────────────────────────────────
function MorePage({ onDisclaimer }) {
  const items = [
    { icon:'⚡', label:'Staking', sub:'Coming Soon', soon:true, action:null },
    { icon:'📄', label:'Whitepaper', sub:'Read our whitepaper', soon:false, action:() => window.open('https://solbombwhitepaper.netlify.app','_blank') },
    { icon:'𝕏', label:'Twitter / X', sub:'@solbombxyz', soon:false, action:() => window.open('https://x.com/solbombxyz','_blank') },
    { icon:'✈️', label:'Telegram', sub:'t.me/solbomb', soon:false, action:() => window.open('https://t.me/solbomb','_blank') },
    { icon:'⚠️', label:'Disclaimer', sub:'Read full disclaimer', soon:false, action:onDisclaimer },
    { icon:'📖', label:'Docs', sub:'Coming Soon', soon:true, action:null },
  ];

  return (
    <div className="page-content">
      <div className="more-wrap">
        <div className="more-title">More</div>
        <div className="more-list">
          {items.map((item,i) => (
            <button key={i} className={`more-item${item.soon?' disabled':''}`} onClick={item.action || undefined} disabled={item.soon}>
              <span className="more-icon">{item.icon}</span>
              <div className="more-info">
                <div className="more-label">{item.label}</div>
                <div className="more-sub">{item.sub}</div>
              </div>
              {item.soon ? <span className="soon-badge">Soon</span> : <span className="more-arrow">→</span>}
            </button>
          ))}
        </div>
        <div className="more-version">SolBomb v1.0 — Devnet</div>
      </div>
    </div>
  );
}

// ── Disclaimer Page ────────────────────────────────────────────────────────────
function DisclaimerPage({ onBack }) {
  return (
    <div className="page-content">
      <div className="disclaimer-wrap">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <div className="disclaimer-title">⚠️ Disclaimer</div>
        <div className="disclaimer-content">
          <p>This application and the $SOLBOMB token are currently running on <strong>Solana Devnet</strong> for testing purposes only. No real monetary value is involved at this stage.</p>
          <p>SolBomb is an experimental memecoin launchpad platform. Cryptocurrency investments carry significant risk. The value of any token can go to zero. Never invest more than you can afford to lose.</p>
          <p>$SOLBOMB is a utility token intended for use within the SolBomb ecosystem. It is not designed or intended to be a security under the laws of any jurisdiction.</p>
          <p>The SolBomb team makes no guarantees regarding platform uptime, token value, or future development. All roadmap items are subject to change based on technical constraints, regulatory requirements, or community decisions.</p>
          <p>By using this platform, you acknowledge that you have read, understood, and agree to the terms described in this disclaimer.</p>
          <p style={{color:'var(--muted)',fontSize:12}}>For the full whitepaper and detailed disclaimer, visit <a href="https://solbombwhitepaper.netlify.app" target="_blank" style={{color:'var(--accent)'}}>solbombwhitepaper.netlify.app</a></p>
        </div>
      </div>
    </div>
  );
}

// ── Token Detail ───────────────────────────────────────────────────────────────
function TokenDetailPage({ token, onBack }) {
  const { connected } = useWallet();
  const { setVisible } = useWalletModal();
  const [mode, setMode] = useState('buy');
  const [amount, setAmount] = useState('');
  const [txStatus, setTxStatus] = useState(null);

  const price = parseFloat(token.price);
  const solAmt = parseFloat(amount) || 0;
  const tokensEst = solAmt > 0 ? Math.floor(solAmt/price).toLocaleString() : '—';

  const handleTrade = async () => {
    if (!amount || parseFloat(amount) <= 0) { alert('Enter an amount'); return; }
    if (!connected) { setVisible(true); return; }
    setTxStatus({state:'loading', msg:'Simulating on devnet…'});
    await new Promise(r => setTimeout(r, 1500));
    setTxStatus({state:'error', msg:'Smart contract deploying soon. Stay tuned!'});
  };

  return (
    <div className="page-content">
      <div className="detail-wrap">
        <button className="back-btn" onClick={onBack}>← Board</button>
        <div className="detail-header">
          <div className="detail-img" style={{background:`${token.color}22`}}>{token.emoji}</div>
          <div>
            <div className="detail-name">{token.name} <span className="detail-sym">${token.sym}</span></div>
            <div className="detail-links">
              <a className="detail-link" href="https://explorer.solana.com/?cluster=devnet" target="_blank" rel="noreferrer">🔍 Explorer</a>
              <span className="detail-link muted">🐦 Twitter</span>
              <span className="detail-link muted">💬 Telegram</span>
            </div>
          </div>
        </div>

        <div className="detail-grid">
          <div className="detail-left">
            <div className="detail-stat-row">
              <div className="detail-stat"><div className="detail-stat-label">Price</div><div className="detail-stat-val">{token.price} SOL</div></div>
              <div className="detail-stat"><div className="detail-stat-label">Market Cap</div><div className="detail-stat-val">${token.mc}</div></div>
              <div className="detail-stat"><div className="detail-stat-label">Curve</div><div className="detail-stat-val">{token.curve}%</div></div>
              <div className="detail-stat"><div className="detail-stat-label">Network</div><div className="detail-stat-val devnet">◉ Devnet</div></div>
            </div>
            <div className="curve-detail-box">
              <div className="curve-detail-label">BONDING CURVE PROGRESS</div>
              <div className="curve-big-track"><div className="curve-big-fill" style={{width:`${token.curve}%`}}/></div>
              <div className="curve-detail-meta">
                <span>{token.curve}% filled</span>
                <span>${Math.floor(token.curve*790).toLocaleString()} / $69,000</span>
              </div>
            </div>
          </div>

          <div className="detail-right">
            <div className="trading-panel">
              <div className="panel-title">Trade ${token.sym}</div>
              <div className="trade-tabs">
                <button className={`trade-tab buy${mode==='buy'?' active':''}`} onClick={() => {setMode('buy');setTxStatus(null);}}>Buy</button>
                <button className={`trade-tab sell${mode==='sell'?' active':''}`} onClick={() => {setMode('sell');setTxStatus(null);}}>Sell</button>
              </div>
              <div className="preset-row">
                {['0.1','0.5','1','2'].map(v => <button key={v} className="preset-btn" onClick={() => {setAmount(v);setTxStatus(null);}}>{v} SOL</button>)}
              </div>
              <div className="trade-input-wrap">
                <input className="trade-input" type="number" placeholder="0.0" value={amount} onChange={e => {setAmount(e.target.value);setTxStatus(null);}}/>
                <span className="trade-suffix">SOL</span>
              </div>
              <div className="trade-est">
                <span style={{color:'var(--muted)'}}>You receive</span>
                <span>{tokensEst} ${token.sym}</span>
              </div>
              <div className="trade-est">
                <span style={{color:'var(--muted)'}}>Platform fee (1%)</span>
                <span>{solAmt>0?(solAmt*0.01).toFixed(4)+' SOL':'—'}</span>
              </div>
              {mode==='buy'
                ? <button className="btn-buy" onClick={handleTrade}>{connected?'🟢 Buy Now':'◎ Connect to Buy'}</button>
                : <button className="btn-sell" onClick={handleTrade}>{connected?'🔴 Sell Now':'◎ Connect to Sell'}</button>
              }
              {txStatus && <div className={`tx-status ${txStatus.state}`}>{txStatus.msg}</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Success Modal ──────────────────────────────────────────────────────────────
function SuccessModal({ name, sym, onClose, onView }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div style={{fontSize:52,marginBottom:12}}>💣</div>
        <div className="modal-title">Bomb Dropped!</div>
        <div className="modal-sub">{name} (${sym}) is live on Devnet!</div>
        <div className="modal-actions">
          <button className="btn-cyan" onClick={onView}>Trade Token</button>
          <button className="btn-outline" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ── Bottom Nav ─────────────────────────────────────────────────────────────────
function BottomNav({ active, onChange }) {
  const tabs = [
    { id:'board', icon:'🏠', label:'Board' },
    { id:'koth', icon:'👑', label:'KotH' },
    { id:'launch', icon:'💣', label:'Launch' },
    { id:'profile', icon:'👤', label:'Profile' },
    { id:'more', icon:'⋯', label:'More' },
  ];
  return (
    <nav className="bottom-nav">
      {tabs.map(t => (
        <button key={t.id} className={`bottom-tab${active===t.id?' active':''}`} onClick={() => onChange(t.id)}>
          <span className="bottom-tab-icon">{t.icon}</span>
          <span className="bottom-tab-label">{t.label}</span>
        </button>
      ))}
    </nav>
  );
}


// ── KotH Page ──────────────────────────────────────────────────────────────────
function KotHPage({ tokens, onOpenToken }) {
  const [lastUpdated, setLastUpdated] = useState(0);
  const [trades, setTrades] = useState([
    { id:1, type:'buy', wallet:'7xH2…3kMp', token:'BombCat', sol:'2.500', time: Date.now()-120000 },
    { id:2, type:'sell', wallet:'9qF1…8nZr', token:'MoonDog', sol:'0.800', time: Date.now()-240000 },
    { id:3, type:'buy', wallet:'3dR7…2wPj', token:'SolFox', sol:'5.000', time: Date.now()-360000 },
    { id:4, type:'buy', wallet:'5sK4…9xLv', token:'GigaChad', sol:'1.200', time: Date.now()-480000 },
    { id:5, type:'sell', wallet:'2mN6…4hQc', token:'PepeSol', sol:'0.300', time: Date.now()-600000 },
  ]);
  const [whaleAlert, setWhaleAlert] = useState({ wallet:'DiAm…9xKp', token:'BombCat', sol:'10.5', time: Date.now()-30000 });

  useEffect(() => {
    const id = setInterval(() => setLastUpdated(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const wallets = ['4xK9…mNpR','7bT2…3qWs','9fR8…kLpM','2dN5…8xZv','6mP1…4hQc','DiAm…9xKp'];
    const id = setInterval(() => {
      if (Math.random() > 0.5) return;
      const isBuy = Math.random() > 0.35;
      const top5 = [...tokens].sort((a,b) => b.curve-a.curve).slice(0,5);
      const token = top5[Math.floor(Math.random()*top5.length)];
      if (!token) return;
      const sol = (Math.random()*4+0.1).toFixed(3);
      const newTrade = {
        id: Date.now(),
        type: isBuy ? 'buy' : 'sell',
        wallet: wallets[Math.floor(Math.random()*wallets.length)],
        token: token.name,
        sol,
        time: Date.now()
      };
      setTrades(prev => [newTrade, ...prev].slice(0,10));
      if (isBuy && parseFloat(sol) >= 3) {
        setWhaleAlert({ wallet: newTrade.wallet, token: token.name, sol, time: Date.now() });
      }
      setLastUpdated(Date.now());
    }, 4000);
    return () => clearInterval(id);
  }, [tokens]);

  const top5 = useMemo(() => [...tokens].sort((a,b) => b.curve-a.curve).slice(0,5), [tokens]);
  const RANK_ICONS = ['👑','🥈','🥉','4️⃣','5️⃣'];
  const RANK_COLORS = ['#ffcc00','#b0c4de','#cd7f32','#4a6a8a','#4a6a8a'];

  const secAgo = Math.floor((Date.now() - lastUpdated) / 1000);

  // Graduation countdown — closest to 85 SOL
  const closest = top5[0];
  const solNeeded = closest ? Math.max(0, ((100 - closest.curve) / 100 * 85)).toFixed(1) : '—';

  // Volume estimate
  const totalVol = trades.filter(t => t.type==='buy').reduce((a,t) => a+parseFloat(t.sol), 0).toFixed(2);

  return (
    <div className="page-content">
      {/* Header */}
      <div className="koth-page-header">
        <div>
          <div className="koth-page-title">👑 King of the Hill</div>
          <div className="koth-page-sub">Live trader intelligence — top 5 tokens by bonding curve</div>
        </div>
        <div className="koth-updated">Updated {secAgo}s ago</div>
      </div>

      {/* Quick Stats */}
      <div className="koth-stats-row">
        <div className="koth-stat-card">
          <div className="koth-stat-label">🔥 Top Volume (session)</div>
          <div className="koth-stat-val cyan">{totalVol} SOL</div>
        </div>
        <div className="koth-stat-card">
          <div className="koth-stat-label">🎓 Next Graduation</div>
          <div className="koth-stat-val orange">{solNeeded} SOL away</div>
        </div>
        <div className="koth-stat-card">
          <div className="koth-stat-label">📊 Active Tokens</div>
          <div className="koth-stat-val green">{tokens.filter(t=>t.curve>0).length}</div>
        </div>
      </div>

      {/* Whale Alert */}
      {whaleAlert && (
        <div className="whale-alert">
          <span className="whale-icon">🐋</span>
          <div className="whale-info">
            <span className="whale-label">WHALE ALERT</span>
            <span className="whale-text"><b>{whaleAlert.wallet}</b> bought <b>{whaleAlert.sol} SOL</b> of <b>{whaleAlert.token}</b></span>
          </div>
          <span className="whale-time">{Math.floor((Date.now()-whaleAlert.time)/1000)}s ago</span>
        </div>
      )}

      <div className="koth-page-grid">
        {/* Rankings */}
        <div>
          <div className="koth-section-title">🏆 Live Rankings</div>
          <div className="koth-rankings">
            {top5.map((token, i) => {
              const solToGrad = Math.max(0, ((100-token.curve)/100*85)).toFixed(1);
              const momentum = Math.min(100, Math.floor(token.curve * 1.2 + token.change * 0.05));
              return (
                <div key={token.id} className={`koth-rank-card${i===0?' koth-rank-king':''}`} onClick={() => onOpenToken(token)}>
                  <div className="koth-rank-top">
                    <div className="koth-rank-left">
                      <span className="koth-rank-num" style={{color:RANK_COLORS[i]}}>{RANK_ICONS[i]}</span>
                      <span className="koth-rank-emoji">{token.emoji}</span>
                      <div>
                        <div className="koth-rank-name">{token.name} <span className="koth-rank-sym">${token.sym}</span></div>
                        <div className="koth-rank-meta">MC: ${token.mc} · {token.price} SOL</div>
                      </div>
                    </div>
                    <div className="koth-rank-right">
                      <div className="koth-rank-curve" style={{color:token.color}}>{token.curve.toFixed(1)}%</div>
                      <div className={`koth-rank-change ${token.change>=0?'up':'down'}`}>{token.change>=0?'▲':'▼'}{Math.abs(token.change)}%</div>
                    </div>
                  </div>
                  {/* Curve bar */}
                  <div className="koth-rank-bar-wrap">
                    <div className="koth-rank-track">
                      <div className="koth-rank-fill" style={{width:`${token.curve}%`,background:token.color}}/>
                    </div>
                  </div>
                  {/* Momentum + graduation */}
                  <div className="koth-rank-footer">
                    <div className="koth-momentum">
                      <span className="koth-momentum-label">Momentum</span>
                      <div className="koth-momentum-bar">
                        <div className="koth-momentum-fill" style={{width:`${momentum}%`}}/>
                      </div>
                      <span className="koth-momentum-val">{momentum}</span>
                    </div>
                    <div className="koth-grad-info">
                      <span style={{color:'var(--muted)',fontSize:11}}>🎓 {solToGrad} SOL to grad</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right column */}
        <div>
          {/* Whale & Volume */}
          <div className="koth-section-title">🟢 Live Trade Feed</div>
          <div className="koth-feed">
            <div className="koth-feed-header">
              <span>Type</span><span>Token</span><span>SOL</span><span>Wallet</span>
            </div>
            {trades.map(tr => (
              <div key={tr.id} className="koth-feed-row">
                <span className={`koth-feed-type ${tr.type}`}>{tr.type.toUpperCase()}</span>
                <span className="koth-feed-token">{tr.token}</span>
                <span className="koth-feed-sol">{tr.sol}</span>
                <span className="koth-feed-wallet">{tr.wallet}</span>
              </div>
            ))}
          </div>

          {/* New entrants */}
          <div className="koth-section-title" style={{marginTop:20}}>🆕 New Entrants</div>
          <div className="koth-new-list">
            {tokens.filter(t => t.status==='new').slice(0,3).map(t => (
              <div key={t.id} className="koth-new-item" onClick={() => onOpenToken(t)}>
                <span className="koth-new-emoji">{t.emoji}</span>
                <div className="koth-new-info">
                  <div className="koth-new-name">{t.name}</div>
                  <div className="koth-new-age">{t.age}m ago</div>
                </div>
                <span className="koth-new-curve">{t.curve}%</span>
              </div>
            ))}
            {tokens.filter(t => t.status==='new').length === 0 && (
              <div style={{color:'var(--muted)',fontSize:12,padding:'12px 0'}}>No new tokens right now</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── App Root ───────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState('board');
  const [tokens, setTokens] = useState(INITIAL_TOKENS);
  const [selectedToken, setSelectedToken] = useState(null);
  const [modal, setModal] = useState(null);
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  const handleSuccess = (name, sym, img) => {
    const newToken = {
      id: Date.now(), name, sym,
      emoji: EMOJIS[Math.floor(Math.random()*EMOJIS.length)],
      curve: 2, price: '0.000001', change: 0, age: 0,
      mc: '69', desc: 'A brand new memecoin on Solana.',
      color: COLORS[Math.floor(Math.random()*COLORS.length)], status: 'new',
    };
    setTokens(prev => [newToken, ...prev]);
    setModal({ name, sym });
  };

  const handleCurveUpdate = useCallback((id, newCurve) => {
    setTokens(prev => prev.map(t => {
      if (t.id !== id) return t;
      const status = newCurve > 75 ? 'graduating' : t.status === 'new' ? 'new' : 'bonding';
      return { ...t, curve: newCurve, mc: Math.floor(newCurve*790).toLocaleString(), status };
    }));
  }, []);

  const goToDetail = useCallback((t) => { setSelectedToken(t); }, []);

  // If showing token detail
  if (selectedToken) {
    return (
      <>
        <div className="bg-grid"/>
        <header className="top-nav">
          <button className="nav-brand" onClick={() => setSelectedToken(null)}>
            <span className="nav-logo">💣</span>
            <span className="nav-brand-name">SolBomb</span>
          </button>
          <span className="devnet-badge">DEVNET</span>
          <div style={{marginLeft:'auto'}}><WalletButton/></div>
        </header>
        <main className="main-content">
          <TokenDetailPage token={selectedToken} onBack={() => setSelectedToken(null)}/>
        </main>
        <BottomNav active={tab} onChange={(t) => { setSelectedToken(null); setTab(t); }}/>
      </>
    );
  }

  // If showing disclaimer
  if (showDisclaimer) {
    return (
      <>
        <div className="bg-grid"/>
        <header className="top-nav">
          <button className="nav-brand" onClick={() => setShowDisclaimer(false)}>
            <span className="nav-logo">💣</span>
            <span className="nav-brand-name">SolBomb</span>
          </button>
          <span className="devnet-badge">DEVNET</span>
          <div style={{marginLeft:'auto'}}><WalletButton/></div>
        </header>
        <main className="main-content">
          <DisclaimerPage onBack={() => setShowDisclaimer(false)}/>
        </main>
        <BottomNav active="more" onChange={(t) => { setShowDisclaimer(false); setTab(t); }}/>
      </>
    );
  }

  return (
    <>
      <div className="bg-grid"/>
      <header className="top-nav">
        <button className="nav-brand" onClick={() => setTab('board')}>
          <span className="nav-logo">💣</span>
          <span className="nav-brand-name">SolBomb</span>
        </button>
        <span className="devnet-badge">DEVNET</span>
        <div style={{marginLeft:'auto', display:'flex', alignItems:'center', gap:8}}>
          <WalletButton/>

        </div>
      </header>

      <main className="main-content">
        {tab==='board' && <BoardPage tokens={tokens} onOpenToken={goToDetail} onCurveUpdate={handleCurveUpdate}/>}
        {tab==='koth' && <KotHPage tokens={tokens} onOpenToken={goToDetail}/>}
        {tab==='launch' && <LaunchPage onSuccess={handleSuccess}/>}
        {tab==='profile' && <ProfilePage/>}
        {tab==='more' && <MorePage onDisclaimer={() => setShowDisclaimer(true)}/>}
      </main>

      <BottomNav active={tab} onChange={setTab}/>

      {modal && (
        <SuccessModal
          name={modal.name} sym={modal.sym}
          onClose={() => { setModal(null); setTab('board'); }}
          onView={() => { setModal(null); setTab('board'); }}
        />
      )}
    </>
  );
}
