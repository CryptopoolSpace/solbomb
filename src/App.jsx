
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
const SOLBOMB_MINT = 'GXEBKBdwVn91UM6Q33JK8k1Y3uK1NmT4wru8p25ZVgE8';
const PROGRAM_ID = new PublicKey('ChsZQgo5Z6JpUnupLwRkNm7R2ahyggCsYNo7BP3TMQeJ');
const FEE_RECEIVER = new PublicKey('8rFN96gNF7aQ34efvWxJuariwgRaCHdXxSzHupZXL97Y');
const CONFIG_PDA_SEED = 'config';
const CURVE_SEED = 'curve';
const SOL_VAULT_SEED = 'sol_vault';
const TOKEN_PROGRAM = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ASSOC_TOKEN_PROGRAM = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
const SYSVAR_RENT = new PublicKey('SysvarRent111111111111111111111111111111111');
function encodeString(str) {
  const bytes = new TextEncoder().encode(str);
  const buf = new Uint8Array(4 + bytes.length);
  new DataView(buf.buffer).setUint32(0, bytes.length, true);
  buf.set(bytes, 4);
  return buf;
}

function encodeu64(val) {
  const buf = new Uint8Array(8);
  const view = new DataView(buf.buffer);
  const bigVal = BigInt(val);
  view.setUint32(0, Number(bigVal & BigInt(0xFFFFFFFF)), true);
  view.setUint32(4, Number(bigVal >> BigInt(32)), true);
  return buf;
}


const DISC = {
  launch: new Uint8Array([153, 241, 93, 225, 22, 69, 74, 61]),
  buy:    new Uint8Array([102, 6, 61, 18, 1, 218, 235, 234]),
  sell:   new Uint8Array([51, 230, 133, 164, 1, 127, 131, 173]),
};





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
    return { id:i, name:NAMES[i%NAMES.length], sym:SYMS[i%SYMS.length], emoji:EMOJIS[i%EMOJIS.length], curve, price, change, age, mc, desc:DESCS[i%DESCS.length], color:COLORS[i%COLORS.length], status, mintAddress:null, onChain:false };
  });
}

const INITIAL_TOKENS = generateTokens(20);

async function fetchOnChainTokens(connection) {
  try {
    const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
      commitment: 'confirmed',
      filters: [
        { memcmp: { offset: 0, bytes: '3eHMCa' } }
      ]
    });
    return accounts.map(({ pubkey, account }) => {
      try {
        const data = account.data;
        const view = new DataView(data.buffer, data.byteOffset);
        const r64 = (off) => {
          const lo = BigInt(view.getUint32(off, true));
          const hi = BigInt(view.getUint32(off + 4, true));
          return lo | (hi << 32n);
        };
        const mintBytes = data.slice(8, 40);
        const mint = new PublicKey(mintBytes).toBase58();
        const vSol = r64(72);
        const vTok = r64(80);
        const realSol = r64(88);
        const graduated = data[112] === 1;
        // Parse name
        const nameLen = view.getUint32(121, true);
        const nameBytes = data.slice(125, 125 + nameLen);
        const name = new TextDecoder().decode(nameBytes) || 'Unknown';
        // Parse symbol
        const symOffset = 125 + nameLen;
        const symLen = view.getUint32(symOffset, true);
        const symBytes = data.slice(symOffset + 4, symOffset + 4 + symLen);
        const sym = new TextDecoder().decode(symBytes) || '???';
        const priceInSol = vTok === 0n ? 0 : (Number(vSol) / 1e9) / (Number(vTok) / 1e6);
        const curvePct = Math.min(Number(realSol * 100n / 85_000_000_000n), 100);
        const mcap = Math.floor(curvePct * 790).toLocaleString();
        const EMOJIS_LIST = ['💣','🚀','🔥','💎','⚡','🌙','🦊','👾'];
        const COLORS_LIST = ['#ff6b00','#7b2ff7','#00c2ff','#ff0080','#00e676'];
        const seed = mint.charCodeAt(0) + mint.charCodeAt(1);
        return {
          id: pubkey.toBase58(),
          name,
          sym,
          emoji: EMOJIS_LIST[seed % EMOJIS_LIST.length],
          curve: curvePct,
          price: priceInSol < 0.000001 ? priceInSol.toExponential(3) : priceInSol.toFixed(8),
          change: 0,
          age: 0,
          mc: mcap,
          desc: `${name} — launched on SolBomb`,
          color: COLORS_LIST[seed % COLORS_LIST.length],
          status: graduated ? 'graduated' : curvePct > 75 ? 'graduating' : 'bonding',
          mintAddress: mint,
          onChain: true,
        };
      } catch { return null; }
    }).filter(Boolean);
  } catch (e) {
    console.error('[fetchOnChainTokens]', e);
    return [];
  }
}

function formatAge(mins) { return mins < 60 ? `${mins}m ago` : `${Math.floor(mins/60)}h ago`; }

function getATA(mint, owner) {
  return PublicKey.findProgramAddressSync(
    [owner.toBytes(), TOKEN_PROGRAM.toBytes(), mint.toBytes()],
    ASSOC_TOKEN_PROGRAM
  )[0];
}


function WalletButton() {
  const { connected, publicKey, disconnect, connecting } = useWallet();
  const { setVisible } = useWalletModal();
  const { connection } = useConnection();
  const [balance, setBalance] = useState(null);
  useEffect(() => {
    if (!connected || !publicKey) { setBalance(null); return; }
    const fetch = async () => { try { const b = await connection.getBalance(publicKey); setBalance(b/LAMPORTS_PER_SOL); } catch {} };
    fetch(); const id = setInterval(fetch, 15000); return () => clearInterval(id);
  }, [connected, publicKey, connection]);
  if (connected && publicKey) {
    const a = publicKey.toBase58();
    return <button className="btn-connect connected" onClick={() => disconnect()}><span className="wallet-dot"/><span>{a.slice(0,4)}…{a.slice(-4)}</span>{balance !== null && <span className="wallet-bal">{balance.toFixed(2)} SOL</span>}</button>;
  }
  return <button className="btn-connect" onClick={() => setVisible(true)} disabled={connecting}><span className="wallet-icon">◎</span>{connecting?'Connecting…':'Connect'}</button>;
}

function TokenCard({ token, onClick }) {
  return (
    <div className="token-card" onClick={onClick}>
      <div className="token-card-top">
        <div className="token-img" style={{background:`${token.color}22`}}>{token.emoji}</div>
        <div className="token-card-info">
          <div className="token-card-name">{token.name} <span className="token-card-sym">${token.sym}</span></div>
          <div className="token-card-age">{formatAge(token.age)} {token.onChain && <span className="on-chain-badge">⛓ On-chain</span>}</div>
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
        {token.status==='graduating'&&<span className="tag-graduating">🚀 GRADUATING</span>}
        {token.status==='new'&&<span className="tag-new">🆕 NEW</span>}
      </div>
    </div>
  );
}

function KingOfHill({ tokens, onOpenToken, onCurveUpdate }) {
  const [lastTrade, setLastTrade] = useState(null);
  const tokensRef = useRef(tokens); const onCurveRef = useRef(onCurveUpdate);
  useEffect(() => { tokensRef.current = tokens; }, [tokens]);
  useEffect(() => { onCurveRef.current = onCurveUpdate; }, [onCurveUpdate]);
  useEffect(() => {
    const id = setInterval(() => {
      const tkns = tokensRef.current.filter(t => t.curve < 99);
      if (!tkns.length) return;
      const target = tkns[Math.floor(Math.random()*tkns.length)];
      onCurveRef.current(target.id, Math.min(99, target.curve+parseFloat((Math.random()*2+0.5).toFixed(1))));
      setLastTrade({ name:target.name, amt:(Math.random()*2+0.1).toFixed(2) });
      setTimeout(() => setLastTrade(null), 2500);
    }, 3500);
    return () => clearInterval(id);
  }, []);
  const top5 = useMemo(() => [...tokens].sort((a,b)=>b.curve-a.curve).slice(0,5), [tokens]);
  const RANK=['👑','🥈','🥉','4','5'], RCOL=['#ffcc00','#b0c4de','#cd7f32','#4a6a8a','#4a6a8a'];
  return (
    <div className="koth-box">
      <div className="koth-head"><span className="koth-title">👑 King of the Hill</span><span className="koth-live"><span className="pulse-dot"/>LIVE</span></div>
      {top5.map((t,i) => (
        <div key={t.id} className="koth-row" onClick={()=>onOpenToken(t)}>
          <span className="koth-rank" style={{color:RCOL[i]}}>{RANK[i]}</span>
          <span className="koth-emoji">{t.emoji}</span>
          <div className="koth-info">
            <div className="koth-name">{t.name}</div>
            <div className="koth-bar-row"><div className="koth-track"><div className="koth-fill" style={{width:`${t.curve}%`,background:t.color}}/></div><span className="koth-pct">{t.curve.toFixed(1)}%</span></div>
          </div>
        </div>
      ))}
      {lastTrade && <div className="koth-ticker"><span className="pulse-dot green"/><span>🟢 <b>{lastTrade.name}</b> got <b>{lastTrade.amt} SOL</b> buy</span></div>}
    </div>
  );
}

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

function BoardPage({ tokens, onOpenToken, onCurveUpdate }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const visible = tokens.filter(t => {
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.sym.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter==='new') return t.status==='new';
    if (filter==='trending') return t.change>100;
    if (filter==='graduating') return t.status==='graduating';
    if (filter==='onchain') return t.onChain;
    return true;
  });
  return (
    <div className="page-content">
      <StatsBar tokens={tokens}/>
      <div className="board-layout">
        <div className="board-main">
          <div className="filter-bar">
            {['all','new','trending','graduating','onchain'].map(f => (
              <button key={f} className={`filter-btn${filter===f?' active':''}`} onClick={()=>setFilter(f)}>
                {f==='all'?'🔥 All':f==='new'?'🆕 New':f==='trending'?'📈 Trending':f==='graduating'?'🚀 Graduating':'⛓ On-chain'}
              </button>
            ))}
            <input className="search-input" placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          <div className="token-grid">
            {visible.map(t=><TokenCard key={t.id} token={t} onClick={()=>onOpenToken(t)}/>)}
            {visible.length===0&&<div className="empty">No tokens found</div>}
          </div>
        </div>
        <div className="board-sidebar"><KingOfHill tokens={tokens} onOpenToken={onOpenToken} onCurveUpdate={onCurveUpdate}/></div>
      </div>
    </div>
  );
}

function LaunchPage({ onSuccess }) {
  const wallet = useWallet();
  const { connected, publicKey } = wallet;
  const { setVisible } = useWalletModal();
  const { connection } = useConnection();
  const [name, setName] = useState('');
  const [sym, setSym] = useState('');
  const [desc, setDesc] = useState('');
  const [img, setImg] = useState(null);
  const [launching, setLaunching] = useState(false);
  const [txStatus, setTxStatus] = useState(null);
  const fileRef = useRef(null);


const handleLaunch = async () => {
  if (!name || !sym) { alert('Enter token name and symbol!'); return; }
  if (!connected || !publicKey) { setVisible(true); return; }
  setLaunching(true);
  try {
    const { Keypair } = await import('@solana/web3.js');
    const { createInitializeMintInstruction } = await import('@solana/spl-token');

    const mintKeypair = Keypair.generate();
    const mint = mintKeypair.publicKey;

    // === TX 1: Create + Init Mint ===
    setTxStatus({ state: 'loading', msg: '⏳ Step 1/2: Creating mint…' });

    const mintRent = await connection.getMinimumBalanceForRentExemption(82);

    const createMintIx = SystemProgram.createAccount({
      fromPubkey: publicKey,
      newAccountPubkey: mint,
      lamports: mintRent,
      space: 82,
      programId: TOKEN_PROGRAM,
    });

    const initMintIx = createInitializeMintInstruction(
      mint, 6, publicKey, null
    );

    const tx1 = new Transaction().add(createMintIx).add(initMintIx);
    const { blockhash: bh1, lastValidBlockHeight: lbh1 } = await connection.getLatestBlockhash('confirmed');
    tx1.recentBlockhash = bh1;
    tx1.feePayer = publicKey;
    tx1.partialSign(mintKeypair);

    const sig1 = await wallet.sendTransaction(tx1, connection, { signers: [mintKeypair] });
    await connection.confirmTransaction({ signature: sig1, blockhash: bh1, lastValidBlockHeight: lbh1 }, 'confirmed');

    // === TX 2: SolBomb Create ===
    setTxStatus({ state: 'loading', msg: '⏳ Step 2/2: Launching token…' });

    const [bondingCurve] = PublicKey.findProgramAddressSync(
      [new TextEncoder().encode(CURVE_SEED), mint.toBytes()], PROGRAM_ID
    );
    const [solVault] = PublicKey.findProgramAddressSync(
      [new TextEncoder().encode(SOL_VAULT_SEED), mint.toBytes()], PROGRAM_ID
    );
    const [config] = PublicKey.findProgramAddressSync(
      [new TextEncoder().encode(CONFIG_PDA_SEED)], PROGRAM_ID
    );
    const tokenVault = getATA(mint, bondingCurve);


    const uri = 'https://gateway.pinata.cloud/ipfs/bafkreieuca7nuxhprr3psacgphtsvkbycjobez3vrikoyh3ounjuwhxili';
    const nameB = encodeString(name.trim());
    const symB = encodeString(sym.trim().toUpperCase());
    const uriB = encodeString(uri);
    const data = new Uint8Array(8 + nameB.length + symB.length + uriB.length);
    data.set(DISC.launch, 0);
    data.set(nameB, 8);
    data.set(symB, 8 + nameB.length);
    data.set(uriB, 8 + nameB.length + symB.length);

    const createIx = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: bondingCurve,               isSigner: false, isWritable: true  },
        { pubkey: tokenVault,                 isSigner: false, isWritable: true  },
        { pubkey: solVault,                   isSigner: false, isWritable: true  },
        { pubkey: mint,                       isSigner: false, isWritable: true  },
        { pubkey: config,                     isSigner: false, isWritable: true  },
        { pubkey: publicKey,                  isSigner: true,  isWritable: true  },
        { pubkey: TOKEN_PROGRAM,              isSigner: false, isWritable: false },
        { pubkey: ASSOC_TOKEN_PROGRAM,        isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId,    isSigner: false, isWritable: false },
        { pubkey: SYSVAR_RENT,                isSigner: false, isWritable: false },
      ],
      data,
    });

    const tx2 = new Transaction().add(createIx);
    const { blockhash: bh2, lastValidBlockHeight: lbh2 } = await connection.getLatestBlockhash('confirmed');
    tx2.recentBlockhash = bh2;
    tx2.feePayer = publicKey;

    const sig2 = await wallet.sendTransaction(tx2, connection);
    await connection.confirmTransaction({ signature: sig2, blockhash: bh2, lastValidBlockHeight: lbh2 }, 'confirmed');

    setTxStatus({ state: 'success', msg: `✅ Token launched! TX: ${sig2.slice(0, 16)}…` });
    setLaunching(false);
    onSuccess(name.trim(), sym.trim().toUpperCase(), img, mint.toBase58());
}
  catch (err) {
    console.error(err);
    const msg = err?.message || err?.logs?.join(' ') || err?.toString() || 'Unknown error';
    setTxStatus({ state: 'error', msg: `❌ ${msg}` });
}
};




  return (
    <div className="page-content">
      <div className="launch-wrap">
        <div className="launch-header"><div className="launch-title">💣 Drop a Bomb</div><div className="launch-sub">Launch your memecoin on Solana devnet</div></div>
        <div className="launch-form">
          <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f)setImg(URL.createObjectURL(f));}}/>
          <div className="form-img" onClick={()=>fileRef.current?.click()}>
            {img?<img src={img} alt="token" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:10}}/>:<><span style={{fontSize:32}}>🖼️</span><span style={{fontSize:12,color:'var(--muted)',marginTop:6}}>Upload image</span></>}
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Token Name</label><input className="form-input" placeholder="e.g. BombCat" value={name} onChange={e=>setName(e.target.value)}/></div>
            <div className="form-group"><label className="form-label">Symbol</label><input className="form-input" placeholder="e.g. BCAT" value={sym} onChange={e=>setSym(e.target.value.toUpperCase())}/></div>
          </div>
          <div className="form-group"><label className="form-label">Description</label><textarea className="form-input" placeholder="What's the vibe?" value={desc} onChange={e=>setDesc(e.target.value)} style={{minHeight:80,resize:'vertical'}}/></div>
          <div className="fee-box">
            <div className="fee-row"><span>Mint account rent</span><span>~0.0014 SOL</span></div>
            <div className="fee-row"><span>Token metadata</span><span>~0.0098 SOL</span></div>
            <div className="fee-row"><span>Bonding curve setup</span><span>~0.0100 SOL</span></div>
            <div className="fee-row total"><span>Total launch cost</span><span>~0.0212 SOL</span></div>
          </div>
          {!connected&&<div className="wallet-notice">⚠️ Connect wallet to launch</div>}
          {txStatus&&<div className={`tx-status ${txStatus.state}`}>{txStatus.msg}</div>}
          <button className="btn-bomb" onClick={handleLaunch} disabled={launching}>{launching?'⏳ Launching…':connected?'💣 Drop Bomb':'◎ Connect to Launch'}</button>
        </div>
      </div>
    </div>
  );
}
function ProfilePage() {
  const { connected, publicKey, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const { connection } = useConnection();
  const [balance, setBalance] = useState(null);
  const [solbombBal, setSolbombBal] = useState(null);
  const [launchedTokens, setLaunchedTokens] = useState([]);
  const [loadingTokens, setLoadingTokens] = useState(false);

  useEffect(() => {
    if (!connected || !publicKey) { setBalance(null); setSolbombBal(null); setLaunchedTokens([]); return; }
    const fetch = async () => {
      try { const b = await connection.getBalance(publicKey); setBalance((b/LAMPORTS_PER_SOL).toFixed(4)); } catch { setBalance('0'); }
      try {
        const mintPubkey = new PublicKey(SOLBOMB_MINT);
        const accs = await connection.getParsedTokenAccountsByOwner(publicKey,{mint:mintPubkey},'confirmed');
        if (accs.value.length>0) { const ui=accs.value[0].account.data.parsed.info.tokenAmount.uiAmount||0; setSolbombBal(ui.toLocaleString()); }
        else setSolbombBal('0');
      } catch { setSolbombBal('—'); }
    };
    fetch();
    const id = setInterval(fetch, 15000);
    return () => clearInterval(id);
  }, [connected, publicKey, connection]);

  useEffect(() => {
    if (!connected || !publicKey) { setLaunchedTokens([]); return; }
    const fetchLaunched = async () => {
      setLoadingTokens(true);
      try {
        const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
          commitment: 'confirmed',
          filters: [
  { memcmp: { offset: 40, bytes: publicKey.toBase58() } },
],

        });
        const tokens = accounts.map(({ pubkey, account }) => {
          try {
            const data = account.data;
            const view = new DataView(data.buffer, data.byteOffset);
            const r64 = (off) => {
              const lo = BigInt(view.getUint32(off, true));
              const hi = BigInt(view.getUint32(off + 4, true));
              return lo | (hi << 32n);
            };
            const vSol = r64(72);
const vTok = r64(80);
const realSol = r64(88);
const complete = data[112] === 1;
const mintBytes = data.slice(8, 40);

            const mint = new PublicKey(mintBytes).toBase58();
            const priceInSol = vTok === 0n ? 0 : (Number(vSol)/1e9) / (Number(vTok)/1e6);
            const curvePct = Math.min(Number(realSol * 100n / 85_000_000_000n), 100);
            return { mint, priceInSol, curvePct, complete, bondingCurve: pubkey.toBase58() };
          } catch { return null; }
        }).filter(Boolean);
        setLaunchedTokens(tokens);
      } catch (e) { console.error('[ProfilePage fetchLaunched]', e); }
      finally { setLoadingTokens(false); }
    };
    fetchLaunched();
  }, [connected, publicKey, connection]);

  if (!connected) return (
    <div className="page-content"><div className="profile-wrap"><div className="profile-empty">
      <div style={{fontSize:64,marginBottom:16}}>👤</div>
      <div className="profile-empty-title">Connect your wallet</div>
      <div className="profile-empty-sub">Connect Phantom to view your profile.</div>
      <button className="btn-cyan" onClick={()=>setVisible(true)}>◎ Connect Wallet</button>
    </div></div></div>
  );

  const addr = publicKey.toBase58();
  return (
    <div className="page-content"><div className="profile-wrap">
      <div className="profile-card">
        <div className="profile-avatar">👤</div>
        <div className="profile-addr">{addr.slice(0,8)}…{addr.slice(-8)}</div>
        <div className="profile-devnet-badge">◉ Devnet</div>
        <button className="btn-outline-sm" onClick={()=>disconnect()}>Disconnect</button>
      </div>
      <div className="profile-section-title">Holdings</div>
      <div className="holdings-grid">
        <div className="holding-card"><div className="holding-label">SOL Balance</div><div className="holding-val cyan">{balance??'…'} SOL</div></div>
        <div className="holding-card"><div className="holding-label">$SOLBOMB</div><div className="holding-val orange">{solbombBal??'…'}</div></div>
      </div>
      <div className="holdings-note">◉ Devnet · Mint: {SOLBOMB_MINT.slice(0,8)}…{SOLBOMB_MINT.slice(-4)}</div>
      <div className="profile-section-title">Tokens Launched</div>
      {loadingTokens ? (
        <div className="empty-state"><div style={{color:'var(--muted)',fontSize:13}}>⏳ Loading on-chain tokens…</div></div>
      ) : launchedTokens.length === 0 ? (
        <div className="empty-state"><div style={{fontSize:32,marginBottom:8}}>💣</div><div style={{color:'var(--muted)',fontSize:13}}>No tokens launched yet</div></div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {launchedTokens.map((t,i) => (
            <div key={i} style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,padding:'10px 14px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                <span style={{fontFamily:'var(--mono)',fontSize:11,color:'var(--accent)'}}>{t.mint.slice(0,8)}…{t.mint.slice(-6)}</span>
                {t.complete && <span style={{fontSize:10,color:'#00e676',border:'1px solid #00e676',borderRadius:99,padding:'1px 6px'}}>🎓 Graduated</span>}
              </div>
              <div style={{display:'flex',gap:16,fontSize:12,color:'var(--muted)'}}>
                <span>Price: <span style={{color:'#fff'}}>{t.priceInSol < 0.000001 ? t.priceInSol.toExponential(3) : t.priceInSol.toFixed(8)} SOL</span></span>
                <span>Curve: <span style={{color:'var(--cyan)'}}>{t.curvePct.toFixed(1)}%</span></span>
              </div>
              <div style={{marginTop:6,height:4,background:'rgba(255,255,255,0.06)',borderRadius:99,overflow:'hidden'}}>
                <div style={{height:'100%',width:`${t.curvePct}%`,background:'linear-gradient(90deg,#ff2d2d,#ff8c00)',borderRadius:99}}/>
              </div>
              <a href={`https://solscan.io/token/${t.mint}?cluster=devnet`} target="_blank" rel="noreferrer"
                style={{fontSize:10,color:'var(--accent)',display:'block',marginTop:6}}>🔍 View on Solscan</a>
            </div>
          ))}
        </div>
      )}
      <div className="profile-section-title">Transaction History</div>
      <div className="empty-state"><div style={{fontSize:32,marginBottom:8}}>📋</div><div style={{color:'var(--muted)',fontSize:13}}>No transactions yet</div></div>
    </div></div>
  );
}

function MorePage({ onDisclaimer }) {
  const items = [
    {icon:'⚡',label:'Staking',sub:'Coming Soon',soon:true,action:null},
    {icon:'📄',label:'Whitepaper',sub:'Read our whitepaper',soon:false,action:()=>window.open('https://solbombwhitepaper.netlify.app','_blank')},
    {icon:'𝕏',label:'Twitter / X',sub:'@solbombxyz',soon:false,action:()=>window.open('https://x.com/solbombxyz','_blank')},
    {icon:'✈️',label:'Telegram',sub:'t.me/solbomb',soon:false,action:()=>window.open('https://t.me/solbomb','_blank')},
    {icon:'⚠️',label:'Disclaimer',sub:'Read full disclaimer',soon:false,action:onDisclaimer},
    {icon:'📖',label:'Docs',sub:'Coming Soon',soon:true,action:null},
  ];
  return (
    <div className="page-content"><div className="more-wrap">
      <div className="more-title">More</div>
      <div className="more-list">
        {items.map((item,i)=>(
          <button key={i} className={`more-item${item.soon?' disabled':''}`} onClick={item.action||undefined} disabled={item.soon}>
            <span className="more-icon">{item.icon}</span>
            <div className="more-info"><div className="more-label">{item.label}</div><div className="more-sub">{item.sub}</div></div>
            {item.soon?<span className="soon-badge">Soon</span>:<span className="more-arrow">→</span>}
          </button>
        ))}
      </div>
      <div className="more-version">SolBomb v1.0 — Devnet · Program: 3cxE3…LV5</div>
    </div></div>
  );
}

function DisclaimerPage({ onBack }) {
  return (
    <div className="page-content"><div className="disclaimer-wrap">
      <button className="back-btn" onClick={onBack}>← Back</button>
      <div className="disclaimer-title">⚠️ Disclaimer</div>
      <div className="disclaimer-content">
        <p>This application and the $SOLBOMB token are currently running on <strong>Solana Devnet</strong> for testing purposes only. No real monetary value is involved.</p>
        <p>Cryptocurrency investments carry significant risk. Never invest more than you can afford to lose.</p>
        <p>$SOLBOMB is a utility token not designed to be a security under any jurisdiction.</p>
        <p>The SolBomb team makes no guarantees regarding platform uptime or future development.</p>
        <p style={{color:'var(--muted)',fontSize:12}}>Full whitepaper: <a href="https://solbombwhitepaper.netlify.app" target="_blank" style={{color:'var(--accent)'}}>solbombwhitepaper.netlify.app</a></p>
      </div>
    </div></div>
  );
}

function TradingPanel({ token, onStatsUpdate }) {
  const wallet = useWallet();
  const { connected, publicKey } = wallet;
  const { setVisible } = useWalletModal();
  const { connection } = useConnection();

  const [mode,      setMode]      = useState('buy');
  const [amount,    setAmount]    = useState('');
  const [txStatus,  setTxStatus]  = useState(null);
  const [trading,   setTrading]   = useState(false);
  const [curveData, setCurveData] = useState(null);
  const [tokenBal,  setTokenBal]  = useState(0n);
  const [solBal,    setSolBal]    = useState(0);

  const VIRTUAL_SOL_RES   = 30_000_000_000n;
  const VIRTUAL_TOK_RES   = 1_000_000_000_000_000n;
  const TOTAL_SUPPLY_RAW  = 1_000_000_000_000_000n;
  const GRAD_SOL          = 85_000_000_000n;
  const TOK_DECIMALS      = 6;
  const FEE_BPS_N         = 100n;
  const BPS_DENOM         = 10_000n;

  const isOnChain = !!(token?.mintAddress && token?.onChain);

  function decodeCurve(data) {
    const view = new DataView(data.buffer, data.byteOffset);
    const r64 = (off) => {
      const lo = BigInt(view.getUint32(off, true));
      const hi = BigInt(view.getUint32(off + 4, true));
      return lo | (hi << 32n);
    };
    return { vSol: r64(72), vTok: r64(80), realSol: r64(88), realTok: r64(96), complete: data[112] === 1 };

  }

  const refreshData = useCallback(async () => {
    if (!isOnChain) return;
    try {
      const mint = new PublicKey(token.mintAddress);
      const [curvePDA] = PublicKey.findProgramAddressSync(
        [new TextEncoder().encode(CURVE_SEED), mint.toBytes()], PROGRAM_ID
      );
      const info = await connection.getAccountInfo(curvePDA, 'confirmed');
      if (info && info.data && info.data.length >= 41) {
        const cd = decodeCurve(info.data);
        setCurveData(cd);
        if (onStatsUpdate) {
          const priceInSol = cd.vTok === 0n ? 0 : (Number(cd.vSol) / 1e9) / (Number(cd.vTok) / 1e6);
          const mcapUsd = priceInSol * (Number(TOTAL_SUPPLY_RAW) / 1e6) * 150;
          const curvePct = Math.min(Number(cd.realSol * 100n / GRAD_SOL), 100);
          const fmtP = priceInSol < 0.000001 ? priceInSol.toExponential(4) + ' SOL' : priceInSol.toFixed(8).replace(/\.?0+$/, '') + ' SOL';
          const fmtM = mcapUsd >= 1e6 ? '$' + (mcapUsd/1e6).toFixed(2) + 'M' : mcapUsd >= 1e3 ? '$' + (mcapUsd/1e3).toFixed(1) + 'K' : '$' + mcapUsd.toFixed(0);
          onStatsUpdate({ price: fmtP, mcap: fmtM, curve: curvePct, complete: cd.complete });
        }
      }
      if (connected && publicKey) {
        const ata = getATA(mint, publicKey);
        const ataInfo = await connection.getAccountInfo(ata, 'confirmed');
        if (ataInfo && ataInfo.data.length >= 72) {
          const v = new DataView(ataInfo.data.buffer, ataInfo.data.byteOffset);
          setTokenBal((BigInt(v.getUint32(64, true))) | (BigInt(v.getUint32(68, true)) << 32n));
        } else { setTokenBal(0n); }
        setSolBal((await connection.getBalance(publicKey)) / LAMPORTS_PER_SOL);
      }
    } catch (e) { console.error('[TradingPanel refreshData]', e); }
  }, [connection, token, connected, publicKey, isOnChain, onStatsUpdate]);

  useEffect(() => {
    refreshData();
    const id = setInterval(refreshData, 10000);
    return () => clearInterval(id);
  }, [refreshData]);



const vSol = curveData?.vSol ?? VIRTUAL_SOL_RES;
const vTok = curveData?.vTok ?? null;
const amtNum = parseFloat(amount) || 0;


  const solInLam = BigInt(Math.floor(amtNum * 1e9));
  const feeLam   = solInLam * FEE_BPS_N / BPS_DENOM;
  const netSolIn = solInLam - feeLam;
  let tokensOutRaw = 0n;
  if (netSolIn > 0n) { const k = vSol * vTok; tokensOutRaw = vTok - (k / (vSol + netSolIn)); }
  const tokensOutHuman = vTok ? Number(tokensOutRaw) / Math.pow(10, TOK_DECIMALS) : null;

  const tokenInRaw = BigInt(Math.floor(amtNum * Math.pow(10, TOK_DECIMALS)));
  let solOutGross = 0n;
  if (tokenInRaw > 0n) { const k = vSol * vTok; solOutGross = vSol - (k / (vTok + tokenInRaw)); }
  const feeOutRaw   = solOutGross * FEE_BPS_N / BPS_DENOM;
  const netSolOut   = solOutGross - feeOutRaw;
  const solOutHuman = Number(netSolOut) / 1e9;
  const tokenBalHuman = Number(tokenBal) / Math.pow(10, TOK_DECIMALS);

  const validate = () => {
    if (!amtNum || amtNum <= 0) return 'Enter an amount';
    if (mode === 'buy') {
      if (amtNum > solBal) return `Insufficient SOL (have ${solBal.toFixed(4)})`;
      if (amtNum < 0.001) return 'Minimum buy: 0.001 SOL';
    }
    if (mode === 'sell' && amtNum > tokenBalHuman) return `Insufficient ${token.sym} (have ${tokenBalHuman.toLocaleString(undefined,{maximumFractionDigits:2})})`;
    return null;
  };

  const handleTrade = async () => {
    if (!connected || !publicKey) { setVisible(true); return; }
    if (!isOnChain) { setTxStatus({ state:'error', msg:'🎭 Demo token — launch a real token to trade.' }); return; }
    const err = validate();
    if (err) { setTxStatus({ state:'error', msg:`⚠️ ${err}` }); return; }
    setTrading(true);
    setTxStatus({ state:'loading', msg:`⏳ Preparing ${mode} transaction…` });
    try {
      const mint = new PublicKey(token.mintAddress);
      const [bondingCurve] = PublicKey.findProgramAddressSync([new TextEncoder().encode(CURVE_SEED), mint.toBytes()], PROGRAM_ID);
      const [solVault]     = PublicKey.findProgramAddressSync([new TextEncoder().encode(SOL_VAULT_SEED), mint.toBytes()], PROGRAM_ID);
      const [config]       = PublicKey.findProgramAddressSync([new TextEncoder().encode(CONFIG_PDA_SEED)], PROGRAM_ID);
      const tokenVault     = getATA(mint, bondingCurve);
      const userAta        = getATA(mint, publicKey);
      const data = new Uint8Array(24);
      if (mode === 'buy') {
        data.set(DISC.buy, 0); data.set(encodeu64(solInLam), 8); data.set(encodeu64(0n), 16);
      } else {
        data.set(DISC.sell, 0); data.set(encodeu64(tokenInRaw), 8); data.set(encodeu64(0n), 16);
      }
      const keys = [
        {pubkey:bondingCurve,isSigner:false,isWritable:true},
        {pubkey:solVault,isSigner:false,isWritable:true},
        {pubkey:tokenVault,isSigner:false,isWritable:true},
        {pubkey:mint,isSigner:false,isWritable:true},
        {pubkey:userAta,isSigner:false,isWritable:true},
        {pubkey:config,isSigner:false,isWritable:true},
        {pubkey:FEE_RECEIVER,isSigner:false,isWritable:true},
        {pubkey:publicKey,isSigner:true,isWritable:true},
        {pubkey:TOKEN_PROGRAM,isSigner:false,isWritable:false},
        {pubkey:ASSOC_TOKEN_PROGRAM,isSigner:false,isWritable:false},
        {pubkey:SystemProgram.programId,isSigner:false,isWritable:false},
      ];
      const ix = new TransactionInstruction({programId:PROGRAM_ID,keys,data});
      const tx = new Transaction().add(ix);
      const {blockhash,lastValidBlockHeight} = await connection.getLatestBlockhash('confirmed');
      tx.recentBlockhash = blockhash; tx.feePayer = publicKey;
      setTxStatus({state:'loading',msg:'⏳ Waiting for wallet approval…'});
      const sig = await wallet.sendTransaction(tx, connection);
      setTxStatus({state:'loading',msg:'⏳ Confirming…'});
      await connection.confirmTransaction({signature:sig,blockhash,lastValidBlockHeight},'confirmed');
      const short = sig.slice(0,12)+'…';
      setTxStatus({state:'success',msg:mode==='buy'?`✅ Bought ~${tokensOutHuman.toLocaleString(undefined,{maximumFractionDigits:0})} ${token.sym}! TX: ${short}`:`✅ Sold for ~${solOutHuman.toFixed(4)} SOL! TX: ${short}`});
      setAmount('');
      await refreshData();
    } catch(e) {
      console.error(e);
      setTxStatus({state:'error',msg:`❌ ${e?.logs?.find(l=>l.includes('Error'))||e.message||'Transaction failed'}`});
    } finally { setTrading(false); }
  };

  const BUY_PRESETS = ['0.1','0.5','1','2'];
  const SELL_PRESETS = tokenBalHuman > 0
    ? [{label:'25%',val:(tokenBalHuman*0.25).toFixed(2)},{label:'50%',val:(tokenBalHuman*0.50).toFixed(2)},{label:'75%',val:(tokenBalHuman*0.75).toFixed(2)},{label:'MAX',val:tokenBalHuman.toFixed(2)}]
    : [{label:'25%',val:'0'},{label:'50%',val:'0'},{label:'75%',val:'0'},{label:'MAX',val:'0'}];

  return (
    <div className="trading-panel">
      <div className="panel-title">Trade ${token.sym}</div>
      {!isOnChain&&<div className="demo-notice">🎭 Demo token — launch a real token to trade on-chain</div>}
      {connected&&isOnChain&&(
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
          <span style={{color:'var(--muted)',fontSize:12}}>Your balance</span>
          <span style={{fontSize:12,fontFamily:'var(--mono)',color:'var(--cyan)'}}>{tokenBalHuman.toLocaleString(undefined,{maximumFractionDigits:2})} ${token.sym}</span>
        </div>
      )}
      <div className="trade-tabs">
        <button className={`trade-tab buy${mode==='buy'?' active':''}`} onClick={()=>{setMode('buy');setAmount('');setTxStatus(null);}}>Buy</button>
        <button className={`trade-tab sell${mode==='sell'?' active':''}`} onClick={()=>{setMode('sell');setAmount('');setTxStatus(null);}}>Sell</button>
      </div>
      <div className="preset-row">
        {mode==='buy'
          ?BUY_PRESETS.map(v=><button key={v} className="preset-btn" onClick={()=>{setAmount(v);setTxStatus(null);}}>{v} SOL</button>)
          :SELL_PRESETS.map(p=><button key={p.label} className="preset-btn" onClick={()=>{setAmount(p.val);setTxStatus(null);}}>{p.label}</button>)
        }
      </div>
      <div className="trade-input-wrap">
        <input className="trade-input" type="number" placeholder="0.0" value={amount} onChange={e=>{setAmount(e.target.value);setTxStatus(null);}}/>
        <span className="trade-suffix">{mode==='buy'?'SOL':`$${token.sym}`}</span>
      </div>
      <div className="trade-est">
        <span style={{color:'var(--muted)'}}>You receive</span>
       <span>
<span>{mode==='buy'?(amtNum>0?`~${tokensOutHuman !== null ? tokensOutHuman.toLocaleString(undefined,{maximumFractionDigits:0}) : '—'} $${token.sym}`:`— $${token.sym}`):(amtNum>0?`~${solOutHuman.toFixed(6)} SOL`:'— SOL')}</span>


      </div>
      <div className="trade-est">
        <span style={{color:'var(--muted)'}}>Platform fee (1%)</span>
        <span>{amtNum>0?(mode==='buy'?`${(amtNum*0.01).toFixed(4)} SOL`:`${(Number(feeOutRaw)/1e9).toFixed(6)} SOL`):'—'}</span>
      </div>
      {mode==='buy'
        ?<button className="btn-buy" onClick={handleTrade} disabled={trading||!amtNum}>{trading?'⏳ Buying…':connected?'🟢 Buy Now':'◎ Connect to Buy'}</button>
        :<button className="btn-sell" onClick={handleTrade} disabled={trading||!amtNum}>{trading?'⏳ Selling…':connected?'🔴 Sell Now':'◎ Connect to Sell'}</button>
      }
      {txStatus&&<div className={`tx-status ${txStatus.state}`}>{txStatus.msg}</div>}
      {txStatus?.state==='success'&&token.mintAddress&&(
        <a href={`https://solscan.io/token/${token.mintAddress}?cluster=devnet`} target="_blank" rel="noreferrer"
          style={{fontSize:11,color:'var(--accent)',display:'block',marginTop:6,textAlign:'center'}}>
          🔍 View on Solscan
        </a>
      )}
    </div>
  );
}


function TokenDetailPage({ token, onBack }) {
  const [liveStats, setLiveStats] = useState({
    price:    token.price ? `${token.price} SOL` : '0.000001 SOL',
    mcap:     `$${token.mc || '69'}`,
    curve:    token.curve || 2,
    complete: false,
  });

  const handleStatsUpdate = (stats) => {
    setLiveStats(prev => ({ ...prev, ...stats }));
  };

  const curvePct = liveStats.curve;

  return (
    <div className="page-content">
      <div className="detail-wrap">
        <button className="back-btn" onClick={onBack}>← Board</button>
        <div className="detail-header">
          <div className="detail-img" style={{background:`${token.color}22`}}>{token.emoji}</div>
          <div>
            <div className="detail-name">{token.name} <span className="detail-sym">${token.sym}</span></div>
            <div className="detail-links">
              {token.mintAddress&&<a className="detail-link" href={`https://solscan.io/token/${token.mintAddress}?cluster=devnet`} target="_blank" rel="noreferrer">🔍 Solscan</a>}
              <span className="detail-link muted">🐦 Twitter</span>
              <span className="detail-link muted">💬 Telegram</span>
            </div>
          </div>
        </div>
        <div className="detail-grid">
          <div className="detail-left">
            <div className="detail-stat-row">
              <div className="detail-stat"><div className="detail-stat-label">Price</div><div className="detail-stat-val">{liveStats.price}</div></div>
              <div className="detail-stat"><div className="detail-stat-label">Market Cap</div><div className="detail-stat-val">{liveStats.mcap}</div></div>
              <div className="detail-stat"><div className="detail-stat-label">Curve</div><div className="detail-stat-val">{typeof curvePct==='number'?curvePct.toFixed(1):curvePct}%</div></div>
              <div className="detail-stat"><div className="detail-stat-label">Network</div><div className="detail-stat-val devnet">◉ Devnet</div></div>
            </div>
            <div className="curve-detail-box">
              <div className="curve-detail-label">BONDING CURVE PROGRESS</div>
              <div className="curve-big-track"><div className="curve-big-fill" style={{width:`${Math.min(curvePct,100)}%`}}/></div>
              <div className="curve-detail-meta">
                <span>{typeof curvePct==='number'?curvePct.toFixed(1):curvePct}% filled</span>
                <span>${Math.floor(curvePct*850).toLocaleString()} / $69,000</span>
              </div>
              {liveStats.complete&&(
                <div style={{marginTop:8,padding:'6px 12px',background:'rgba(0,230,118,0.1)',border:'1px solid rgba(0,230,118,0.3)',borderRadius:8,color:'#00e676',fontSize:12,textAlign:'center'}}>
                  🎓 Graduated — liquidity migrated to DEX
                </div>
              )}
            </div>
            {token.mintAddress&&<div className="mint-info-box"><div className="mint-info-label">MINT ADDRESS</div><div className="mint-info-val">{token.mintAddress}</div></div>}
          </div>
          <div className="detail-right">
            <TradingPanel token={token} onStatsUpdate={handleStatsUpdate}/>
          </div>
        </div>
      </div>
    </div>
  );
}


function KotHPage({ tokens, onOpenToken }) {
  const [lastUpdated, setLastUpdated] = useState(Date.now());
  const [trades, setTrades] = useState([
    {id:1,type:'buy',wallet:'7xH2…3kMp',token:'BombCat',sol:'2.500',time:Date.now()-120000},
    {id:2,type:'sell',wallet:'9qF1…8nZr',token:'MoonDog',sol:'0.800',time:Date.now()-240000},
    {id:3,type:'buy',wallet:'3dR7…2wPj',token:'SolFox',sol:'5.000',time:Date.now()-360000},
    {id:4,type:'buy',wallet:'5sK4…9xLv',token:'GigaChad',sol:'1.200',time:Date.now()-480000},
    {id:5,type:'sell',wallet:'2mN6…4hQc',token:'PepeSol',sol:'0.300',time:Date.now()-600000},
  ]);
  const [whaleAlert, setWhaleAlert] = useState({wallet:'DiAm…9xKp',token:'BombCat',sol:'10.5',time:Date.now()-30000});
  useEffect(() => { const id=setInterval(()=>setLastUpdated(Date.now()),1000); return ()=>clearInterval(id); }, []);
  useEffect(() => {
    const wallets=['4xK9…mNpR','7bT2…3qWs','9fR8…kLpM','2dN5…8xZv','6mP1…4hQc'];
    const id=setInterval(()=>{
      if(Math.random()>0.5) return;
      const isBuy=Math.random()>0.35;
      const top5=[...tokens].sort((a,b)=>b.curve-a.curve).slice(0,5);
      const tok=top5[Math.floor(Math.random()*top5.length)];
      if(!tok) return;
      const sol=(Math.random()*4+0.1).toFixed(3);
      const newTrade={id:Date.now(),type:isBuy?'buy':'sell',wallet:wallets[Math.floor(Math.random()*wallets.length)],token:tok.name,sol,time:Date.now()};
      setTrades(prev=>[newTrade,...prev].slice(0,10));
      if(isBuy&&parseFloat(sol)>=3) setWhaleAlert({wallet:newTrade.wallet,token:tok.name,sol,time:Date.now()});
      setLastUpdated(Date.now());
    },4000);
    return ()=>clearInterval(id);
  },[tokens]);
  const top5=useMemo(()=>[...tokens].sort((a,b)=>b.curve-a.curve).slice(0,5),[tokens]);
  const RANK_ICONS=['👑','🥈','🥉','4️','5️⃣'],RANK_COLORS=['#ffcc00','#b0c4de','#cd7f32','#4a6a8a','#4a6a8a'];
  const secAgo=Math.floor((Date.now()-lastUpdated)/1000);
  const closest=top5[0];
  const solNeeded=closest?Math.max(0,((100-closest.curve)/100*85)).toFixed(1):'—';
  const totalVol=trades.filter(t=>t.type==='buy').reduce((a,t)=>a+parseFloat(t.sol),0).toFixed(2);
  return (
    <div className="page-content">
      <div className="koth-page-header">
        <div><div className="koth-page-title">👑 King of the Hill</div><div className="koth-page-sub">Live trader intelligence — top 5 by bonding curve</div></div>
        <div className="koth-updated">Updated {secAgo}s ago</div>
      </div>
      <div className="koth-stats-row">
        <div className="koth-stat-card"><div className="koth-stat-label">🔥 Top Volume</div><div className="koth-stat-val cyan">{totalVol} SOL</div></div>
        <div className="koth-stat-card"><div className="koth-stat-label">🎓 Next Grad</div><div className="koth-stat-val orange">{solNeeded} SOL away</div></div>
        <div className="koth-stat-card"><div className="koth-stat-label">📊 Active</div><div className="koth-stat-val green">{tokens.length}</div></div>
      </div>
      {whaleAlert&&(
        <div className="whale-alert">
          <span className="whale-icon">🐋</span>
          <div className="whale-info"><span className="whale-label">WHALE ALERT</span><span className="whale-text"><b>{whaleAlert.wallet}</b> bought <b>{whaleAlert.sol} SOL</b> of <b>{whaleAlert.token}</b></span></div>
          <span className="whale-time">{Math.floor((Date.now()-whaleAlert.time)/1000)}s ago</span>
        </div>
      )}
      <div className="koth-page-grid">
        <div>
          <div className="koth-section-title">🏆 Live Rankings</div>
          <div className="koth-rankings">
            {top5.map((token,i)=>{
              const solToGrad=Math.max(0,((100-token.curve)/100*85)).toFixed(1);
              const momentum=Math.min(100,Math.floor(token.curve*1.2+token.change*0.05));
              return (
                <div key={token.id} className={`koth-rank-card${i===0?' koth-rank-king':''}`} onClick={()=>onOpenToken(token)}>
                  <div className="koth-rank-top">
                    <div className="koth-rank-left">
                      <span className="koth-rank-num" style={{color:RANK_COLORS[i]}}>{RANK_ICONS[i]}</span>
                      <span className="koth-rank-emoji">{token.emoji}</span>
                      <div><div className="koth-rank-name">{token.name} <span className="koth-rank-sym">${token.sym}</span></div><div className="koth-rank-meta">MC: ${token.mc} · {token.price} SOL</div></div>
                    </div>
                    <div className="koth-rank-right">
                      <div className="koth-rank-curve" style={{color:token.color}}>{token.curve.toFixed(1)}%</div>
                      <div className={`koth-rank-change ${token.change>=0?'up':'down'}`}>{token.change>=0?'▲':'▼'}{Math.abs(token.change)}%</div>
                    </div>
                  </div>
                  <div className="koth-rank-bar-wrap"><div className="koth-rank-track"><div className="koth-rank-fill" style={{width:`${token.curve}%`,background:token.color}}/></div></div>
                  <div className="koth-rank-footer">
                    <div className="koth-momentum"><span className="koth-momentum-label">Momentum</span><div className="koth-momentum-bar"><div className="koth-momentum-fill" style={{width:`${momentum}%`}}/></div><span className="koth-momentum-val">{momentum}</span></div>
                    <span style={{color:'var(--muted)',fontSize:11}}>🎓 {solToGrad} SOL to grad</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div>
          <div className="koth-section-title">🟢 Live Trade Feed</div>
          <div className="koth-feed">
            <div className="koth-feed-header"><span>Type</span><span>Token</span><span>SOL</span><span>Wallet</span></div>
            {trades.map(tr=>(
              <div key={tr.id} className="koth-feed-row">
                <span className={`koth-feed-type ${tr.type}`}>{tr.type.toUpperCase()}</span>
                <span className="koth-feed-token">{tr.token}</span>
                <span className="koth-feed-sol">{tr.sol}</span>
                <span className="koth-feed-wallet">{tr.wallet}</span>
              </div>
            ))}
          </div>
          <div className="koth-section-title" style={{marginTop:20}}>🆕 New Entrants</div>
          <div className="koth-new-list">
            {tokens.filter(t=>t.status==='new').slice(0,3).map(t=>(
              <div key={t.id} className="koth-new-item" onClick={()=>onOpenToken(t)}>
                <span className="koth-new-emoji">{t.emoji}</span>
                <div className="koth-new-info"><div className="koth-new-name">{t.name}</div><div className="koth-new-age">{t.age}m ago</div></div>
                <span className="koth-new-curve">{t.curve}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SuccessModal({ name, sym, mintAddress, onClose, onView }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e=>e.stopPropagation()}>
        <div style={{fontSize:52,marginBottom:12}}>💣</div>
        <div className="modal-title">Bomb Dropped!</div>
        <div className="modal-sub">{name} (${sym}) is live on Devnet!</div>
        {mintAddress&&<div style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--accent)',background:'rgba(0,194,255,0.08)',border:'1px solid rgba(0,194,255,0.2)',borderRadius:8,padding:'8px 12px',margin:'12px 0',wordBreak:'break-all'}}>{mintAddress}</div>}
        <div className="modal-actions">
          <button className="btn-cyan" onClick={onView}>Trade Token</button>
          <button className="btn-outline" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function BottomNav({ active, onChange }) {
  const tabs=[{id:'board',icon:'🏠',label:'Board'},{id:'koth',icon:'👑',label:'KotH'},{id:'launch',icon:'💣',label:'Launch'},{id:'profile',icon:'👤',label:'Profile'},{id:'more',icon:'⋯',label:'More'}];
  return (
    <nav className="bottom-nav">
      {tabs.map(t=>(
        <button key={t.id} className={`bottom-tab${active===t.id?' active':''}`} onClick={()=>onChange(t.id)}>
          <span className="bottom-tab-icon">{t.icon}</span>
          <span className="bottom-tab-label">{t.label}</span>
        </button>
      ))}
    </nav>
  );
}

export default function App() {
  const [tab, setTab] = useState('board');
  const [tokens, setTokens] = useState(INITIAL_TOKENS);
  const [selectedToken, setSelectedToken] = useState(null);
  const [modal, setModal] = useState(null);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
const { connection } = useConnection();

useEffect(() => {
  fetchOnChainTokens(connection).then(onChainTokens => {
    if (onChainTokens.length > 0) {
      setTokens(prev => {
        const existingIds = new Set(prev.map(t => t.id));
        const newTokens = onChainTokens.filter(t => !existingIds.has(t.id));
        return [...newTokens, ...prev];
      });
    }
  });
}, [connection]);


  const handleSuccess = (name, sym, img, mintAddress=null) => {
    const newToken = {
      id:Date.now(), name, sym,
      emoji:EMOJIS[Math.floor(Math.random()*EMOJIS.length)],
      curve:2, price:'0.000001', change:0, age:0,
      mc:'69', desc:'A brand new memecoin on Solana.',
      color:COLORS[Math.floor(Math.random()*COLORS.length)],
      status:'new', mintAddress, onChain:!!mintAddress,
    };
    setTokens(prev=>[newToken,...prev]);
    setModal({name,sym,mintAddress});
  };

  const handleCurveUpdate = useCallback((id, newCurve) => {
    setTokens(prev=>prev.map(t=>{
      if(t.id!==id) return t;
      const status=newCurve>75?'graduating':t.status==='new'?'new':'bonding';
      return {...t,curve:newCurve,mc:Math.floor(newCurve*790).toLocaleString(),status};
    }));
  },[]);

  const goToDetail = useCallback((t)=>setSelectedToken(t),[]);

  if (selectedToken) return (
    <>
      <div className="bg-grid"/>
      <header className="top-nav">
        <button className="nav-brand" onClick={()=>setSelectedToken(null)}><span className="nav-logo">💣</span><span className="nav-brand-name">SolBomb</span></button>
        <span className="devnet-badge">DEVNET</span>
        <div style={{marginLeft:'auto'}}><WalletButton/></div>
      </header>
      <main className="main-content"><TokenDetailPage token={selectedToken} onBack={()=>setSelectedToken(null)}/></main>
      <BottomNav active={tab} onChange={t=>{setSelectedToken(null);setTab(t);}}/>
    </>
  );

  if (showDisclaimer) return (
    <>
      <div className="bg-grid"/>
      <header className="top-nav">
        <button className="nav-brand" onClick={()=>setShowDisclaimer(false)}><span className="nav-logo">💣</span><span className="nav-brand-name">SolBomb</span></button>
        <span className="devnet-badge">DEVNET</span>
        <div style={{marginLeft:'auto'}}><WalletButton/></div>
      </header>
      <main className="main-content"><DisclaimerPage onBack={()=>setShowDisclaimer(false)}/></main>
      <BottomNav active="more" onChange={t=>{setShowDisclaimer(false);setTab(t);}}/>
    </>
  );

  return (
    <>
      <div className="bg-grid"/>
      <header className="top-nav">
        <button className="nav-brand" onClick={()=>setTab('board')}><span className="nav-logo">💣</span><span className="nav-brand-name">SolBomb</span></button>
        <span className="devnet-badge">DEVNET</span>
        <div style={{marginLeft:'auto'}}><WalletButton/></div>
      </header>
      <main className="main-content">
        {tab==='board'&&<BoardPage tokens={tokens} onOpenToken={goToDetail} onCurveUpdate={handleCurveUpdate}/>}
        {tab==='koth'&&<KotHPage tokens={tokens} onOpenToken={goToDetail}/>}
        {tab==='launch'&&<LaunchPage onSuccess={handleSuccess}/>}
        {tab==='profile'&&<ProfilePage/>}
        {tab==='more'&&<MorePage onDisclaimer={()=>setShowDisclaimer(true)}/>}
      </main>
      <BottomNav active={tab} onChange={setTab}/>
      {modal&&<SuccessModal name={modal.name} sym={modal.sym} mintAddress={modal.mintAddress} onClose={()=>{setModal(null);setTab('board');}} onView={()=>{setModal(null);setTab('board');}}/>}
    </>
  );
}
