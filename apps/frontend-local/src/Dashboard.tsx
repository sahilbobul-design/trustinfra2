declare global { interface Window { ethereum?: any; } }

import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { ethers } from 'ethers';
import './index.css';

// ─── Types ────────────────────────────────────────────────────────────────────
type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

interface ContractorNode {
    id: string; name: string; region: string;
    healthScore: number; riskScore: RiskLevel;
    stakedAmount: number; originalStake: number;
    uptime: number; lastUpdate: number;
    slashCount: number; anomalyActive: boolean; recoveryMode: boolean;
}

interface SlashEvent {
    nodeId: string; nodeName: string;
    slashAmount: number; remainingStake: number;
    timestamp: number; txHash: string; reason: string;
}

interface AnomalyEvent {
    nodeId: string; nodeName: string;
    damage: number; timestamp: number;
    type: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const riskColor = (r: RiskLevel) =>
    r === 'HIGH' ? '#ef4444' : r === 'MEDIUM' ? '#f59e0b' : '#10b981';

const fmt = (n: number) => n.toFixed(1);

// ─── SVG Sparkline ────────────────────────────────────────────────────────────
const Sparkline: React.FC<{ data: number[]; color: string; height?: number }> = ({
    data, color, height = 50
}) => {
    if (data.length < 2) return <div style={{ height }} />;
    const w = 300, h = height;
    const min = Math.min(...data), max = Math.max(...data);
    const range = max - min || 1;
    const pts = data.map((v, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = h - ((v - min) / range) * (h - 4) - 2;
        return `${x},${y}`;
    }).join(' ');
    const area = `0,${h} ${pts} ${w},${h}`;
    return (
        <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height }} preserveAspectRatio="none">
            <defs>
                <linearGradient id={`g-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <polygon points={area} fill={`url(#g-${color.replace('#', '')})`} />
            <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
        </svg>
    );
};

// ─── Circular Health Gauge ────────────────────────────────────────────────────
const Gauge: React.FC<{ value: number; size?: number }> = ({ value, size = 72 }) => {
    const r = size / 2 - 7;
    const circ = 2 * Math.PI * r;
    const pct = Math.max(0, Math.min(100, value));
    const dash = (pct / 100) * circ;
    const color = pct > 70 ? '#10b981' : pct > 40 ? '#f59e0b' : '#ef4444';
    return (
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={6} />
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={6}
                strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 1s ease, stroke 0.5s ease', filter: `drop-shadow(0 0 5px ${color})` }} />
            <text x={size / 2} y={size / 2 + 4} textAnchor="middle" fill={color}
                fontSize={size * 0.19} fontWeight="800" fontFamily="Inter,sans-serif"
                style={{ transform: `rotate(90deg)`, transformOrigin: `${size / 2}px ${size / 2}px` }}>
                {pct.toFixed(0)}
            </text>
        </svg>
    );
};

// ─── Mock stocks ──────────────────────────────────────────────────────────────
const STOCKS = [
    { symbol: 'INFRA', base: 108 },
    { symbol: 'AGRI-RISK', base: 42 },
    { symbol: 'INSURE-CO', base: 29 },
    { symbol: 'INFRA-BOND', base: 105 },
    { symbol: 'TECH-IDX', base: 215 },
    { symbol: 'GLOBAL-YLD', base: 92 },
];
const jitter = (b: number) => +(b * (1 + (Math.random() - 0.5) * 0.04)).toFixed(2);

// ─── Mock nodes (simulation fallback) ────────────────────────────────────────
const MOCK_NODES: ContractorNode[] = [
    { id: 'C-001', name: 'Alpha Construction', region: 'US-East', healthScore: 88, riskScore: 'LOW', stakedAmount: 120000, originalStake: 120000, uptime: 99.2, lastUpdate: Date.now(), slashCount: 0, anomalyActive: false, recoveryMode: false },
    { id: 'C-002', name: 'Beta Paving Co.', region: 'EU-West', healthScore: 62, riskScore: 'MEDIUM', stakedAmount: 85000, originalStake: 85000, uptime: 97.1, lastUpdate: Date.now(), slashCount: 0, anomalyActive: false, recoveryMode: false },
    { id: 'C-003', name: 'Gamma Bridges', region: 'APAC', healthScore: 35, riskScore: 'HIGH', stakedAmount: 199500, originalStake: 210000, uptime: 88.5, lastUpdate: Date.now(), slashCount: 2, anomalyActive: true, recoveryMode: false },
    { id: 'C-004', name: 'Delta Roads', region: 'US-West', healthScore: 79, riskScore: 'LOW', stakedAmount: 64000, originalStake: 64000, uptime: 99.5, lastUpdate: Date.now(), slashCount: 0, anomalyActive: false, recoveryMode: false },
    { id: 'C-005', name: 'Epsilon Ports', region: 'LATAM', healthScore: 51, riskScore: 'MEDIUM', stakedAmount: 175000, originalStake: 175000, uptime: 95.3, lastUpdate: Date.now(), slashCount: 1, anomalyActive: false, recoveryMode: false },
];

// ═════════════════════════════════════════════════════════════════════════════
//  DASHBOARD
// ═════════════════════════════════════════════════════════════════════════════
export default function Dashboard() {
    const [tab, setTab] = useState('overview');
    const [sidebar, setSidebar] = useState(true);
    const [connected, setConnected] = useState(false);
    const [nodes, setNodes] = useState<ContractorNode[]>(MOCK_NODES);
    const [healthHist, setHealthHist] = useState<number[]>([]);
    const [riskHist, setRiskHist] = useState<number[]>([]);
    const [slashHistory, setSlashHistory] = useState<SlashEvent[]>([]);
    const [anomalies, setAnomalies] = useState<AnomalyEvent[]>([]);
    const [alerts, setAlerts] = useState<string[]>([]);
    const [stocks, setStocks] = useState(STOCKS.map(s => ({ ...s, price: jitter(s.base), change: 0 })));
    const [wallet, setWallet] = useState('');
    const [gas, setGas] = useState('');
    const [lastTx, setLastTx] = useState<SlashEvent | null>(null);
    const [txStatus, setTxStatus] = useState<'pending' | 'confirmed' | ''>('');
    const [lastUpdate, setLastUpdate] = useState('');
    const nodesRef = useRef(nodes);
    nodesRef.current = nodes;

    // ── WebSocket ───────────────────────────────────────────────────────────
    useEffect(() => {
        const BACKEND = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5001';
        let socket: ReturnType<typeof io> | null = null;
        try {
            socket = io(BACKEND, { timeout: 3000, reconnectionAttempts: 2 });
            socket.on('connect', () => setConnected(true));
            socket.on('disconnect', () => setConnected(false));
            socket.on('health:update', (data: ContractorNode[]) => {
                setNodes(data);
                const avg = data.reduce((s, n) => s + n.healthScore, 0) / data.length;
                setHealthHist(h => [...h.slice(-29), +avg.toFixed(1)]);
                setRiskHist(r => [...r.slice(-29), +(100 - avg).toFixed(1)]);
                setLastUpdate(new Date().toLocaleTimeString());
            });
            socket.on('slash:event', (ev: SlashEvent) => {
                setSlashHistory(p => [ev, ...p.slice(0, 49)]);
                setLastTx(ev); setTxStatus('pending');
                setTimeout(() => setTxStatus('confirmed'), 2500);
                setAlerts(p => [`🔴 SLASH: ${ev.nodeName} -$${ev.slashAmount.toFixed(0)}`, ...p.slice(0, 4)]);
            });
            socket.on('slash:history', (h: SlashEvent[]) => setSlashHistory(h));
            socket.on('anomaly:detected', (ev: AnomalyEvent) => {
                setAnomalies(p => [ev, ...p.slice(0, 19)]);
                setAlerts(p => [`⚡ ${ev.type.replace(/_/g, ' ')}: ${ev.nodeName}`, ...p.slice(0, 4)]);
            });
            socket.on('risk:alert', (n: ContractorNode) => setAlerts(p => [`⚠ HIGH RISK: ${n.name}`, ...p.slice(0, 4)]));
            socket.on('health:recovered', (n: ContractorNode) => setAlerts(p => [`✅ RECOVERED: ${n.name}`, ...p.slice(0, 4)]));
        } catch (_) { }

        // Simulation fallback (runs always, socket overrides if connected)
        const sim = setInterval(() => {
            if (connected) return;
            setNodes(prev => {
                const next = prev.map(n => {
                    const decay = 0.1 + Math.random() * 0.7;
                    let h = Math.max(0, n.healthScore - decay);
                    const anomaly = Math.random() < 0.08;
                    if (anomaly) h = Math.max(0, h - 8 - Math.random() * 15);
                    if (Math.random() < 0.03) h = Math.min(100, h + 12);
                    const r: RiskLevel = h < 40 ? 'HIGH' : h < 70 ? 'MEDIUM' : 'LOW';
                    if (r === 'HIGH' && n.riskScore !== 'HIGH') {
                        const slash: SlashEvent = {
                            nodeId: n.id, nodeName: n.name,
                            slashAmount: +(n.stakedAmount * 0.05).toFixed(2),
                            remainingStake: n.stakedAmount * 0.95,
                            timestamp: Date.now(),
                            txHash: '0x' + Math.random().toString(16).slice(2).padEnd(64, '0'),
                            reason: `Health dropped to ${h.toFixed(0)}%`,
                        };
                        setSlashHistory(p => [slash, ...p.slice(0, 49)]);
                        setLastTx(slash); setTxStatus('pending');
                        setTimeout(() => setTxStatus('confirmed'), 2500);
                        setAlerts(p => [`🔴 SLASH: ${n.name} -$${slash.slashAmount.toFixed(0)}`, ...p.slice(0, 4)]);
                    }
                    return { ...n, healthScore: h, riskScore: r, anomalyActive: anomaly, lastUpdate: Date.now() };
                });
                const avg = next.reduce((s, n) => s + n.healthScore, 0) / next.length;
                setHealthHist(h => [...h.slice(-29), +avg.toFixed(1)]);
                setRiskHist(r => [...r.slice(-29), +(100 - avg).toFixed(1)]);
                setLastUpdate(new Date().toLocaleTimeString());
                return next;
            });
        }, 3500);

        return () => { socket?.disconnect(); clearInterval(sim); };
    }, []);

    // ── Stocks ──────────────────────────────────────────────────────────────
    useEffect(() => {
        const t = setInterval(() => {
            setStocks(STOCKS.map(s => {
                const price = jitter(s.base);
                return { ...s, price, change: +((Math.random() - 0.48) * 4).toFixed(2) };
            }));
        }, 4000);
        return () => clearInterval(t);
    }, []);

    // ── Wallet ──────────────────────────────────────────────────────────────
    const connectWallet = async () => {
        if (!window.ethereum) { alert('MetaMask not found!'); return; }
        try {
            const p = new ethers.BrowserProvider(window.ethereum);
            const s = await p.getSigner();
            setWallet(await s.getAddress());
            const fee = await p.getFeeData();
            if (fee.gasPrice) setGas(parseFloat(ethers.formatUnits(fee.gasPrice, 'gwei')).toFixed(1));
        } catch (e) { console.error(e); }
    };

    // ── Derived ─────────────────────────────────────────────────────────────
    const avgHealth = nodes.length ? nodes.reduce((s, n) => s + n.healthScore, 0) / nodes.length : 0;
    const totalStaked = nodes.reduce((s, n) => s + n.stakedAmount, 0);
    const highRisk = nodes.filter(n => n.riskScore === 'HIGH').length;
    const totalSlash = slashHistory.reduce((s, e) => s + e.slashAmount, 0);

    // ── Nav ─────────────────────────────────────────────────────────────────
    const NAV = [
        { id: 'overview', label: '📊 Overview' },
        { id: 'infrastructure', label: '🏗 Infrastructure' },
        { id: 'health', label: '💓 Health Monitor' },
        { id: 'slashing', label: '🔥 Slash History' },
        { id: 'claims', label: '💰 Claims & Market' },
    ];

    // ══════════════════════════════════════════════════════════════════════════
    //  TAB: OVERVIEW
    // ══════════════════════════════════════════════════════════════════════════
    const Overview = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Stat cards */}
            <div className="grid-4">
                {[
                    { label: 'Active Nodes', value: nodes.length, color: '#6366f1', sub: 'online' },
                    { label: 'Avg Health', value: avgHealth.toFixed(1) + '%', color: avgHealth > 70 ? '#10b981' : avgHealth > 40 ? '#f59e0b' : '#ef4444', sub: avgHealth > 70 ? 'Healthy' : avgHealth > 40 ? 'Degraded' : 'Critical' },
                    { label: 'High Risk', value: highRisk, color: highRisk ? '#ef4444' : '#10b981', sub: highRisk ? 'Needs attention' : 'All clear' },
                    { label: 'Total Staked', value: '$' + (totalStaked / 1e6).toFixed(2) + 'M', color: '#f59e0b', sub: 'across all nodes' },
                ].map((s, i) => (
                    <div key={i} className="stat-card animate-in" style={{ animationDelay: `${i * 0.07}s` }}>
                        <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.5rem' }}>{s.label}</p>
                        <p style={{ fontSize: '2rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</p>
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>{s.sub}</p>
                    </div>
                ))}
            </div>

            {/* Charts */}
            <div className="grid-2">
                <div className="glass" style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>💚 Health Trend</span>
                        <div className="live-dot" style={{ marginLeft: 'auto' }} />
                    </div>
                    <Sparkline data={healthHist} color="#10b981" height={120} />
                    {healthHist.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', paddingTop: '2rem' }}>Waiting for data…</p>}
                </div>
                <div className="glass" style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>🔴 Risk Exposure</span>
                    </div>
                    <Sparkline data={riskHist} color="#ef4444" height={120} />
                    {riskHist.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', paddingTop: '2rem' }}>Waiting for data…</p>}
                </div>
            </div>

            {/* Anomaly feed */}
            {anomalies.length > 0 && (
                <div className="glass" style={{ padding: '1rem 1.25rem', borderColor: 'rgba(245,158,11,0.3)' }}>
                    <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.75rem' }}>⚡ Live Anomaly Feed</p>
                    {anomalies.slice(0, 5).map((a, i) => (
                        <div key={i} style={{ display: 'flex', gap: '0.75rem', fontSize: '0.78rem', padding: '0.3rem 0', borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                            <span style={{ color: '#f59e0b', fontFamily: 'monospace', fontSize: '0.7rem', flexShrink: 0 }}>{new Date(a.timestamp).toLocaleTimeString()}</span>
                            <span style={{ color: 'var(--text-secondary)' }}>{a.type.replace(/_/g, ' ')}</span>
                            <span style={{ fontWeight: 600 }}>{a.nodeName}</span>
                            <span style={{ color: '#ef4444', marginLeft: 'auto' }}>-{a.damage}pts</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Alerts */}
            {alerts.length > 0 && (
                <div className="glass" style={{ padding: '1rem 1.25rem', borderColor: 'rgba(239,68,68,0.2)' }}>
                    <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.6rem' }}>🔔 System Alerts</p>
                    {alerts.map((a, i) => (
                        <p key={i} style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', padding: '0.25rem 0', borderBottom: i < alerts.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>{a}</p>
                    ))}
                </div>
            )}

            {/* Stock ticker */}
            <div className="glass" style={{ padding: '0.875rem 1.25rem', overflow: 'hidden' }}>
                <p style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.6rem' }}>📈 Live Market Feed <span className="live-dot" style={{ display: 'inline-block', verticalAlign: 'middle', marginLeft: 6 }} /></p>
                <div className="ticker-wrap">
                    <div className="ticker-inner">
                        {[...stocks, ...stocks].map((s, i) => (
                            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}>
                                <strong style={{ fontSize: '0.8rem' }}>{s.symbol}</strong>
                                <span style={{ fontSize: '0.8rem' }}>${s.price.toFixed(2)}</span>
                                <span style={{ fontSize: '0.72rem', color: s.change >= 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>{s.change >= 0 ? '▲' : '▼'}{Math.abs(s.change).toFixed(2)}%</span>
                                <span style={{ color: 'rgba(255,255,255,0.1)' }}>|</span>
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    // ══════════════════════════════════════════════════════════════════════════
    //  TAB: INFRASTRUCTURE
    // ══════════════════════════════════════════════════════════════════════════
    const Infrastructure = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Infrastructure Nodes</h2>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Updated: {lastUpdate || '—'}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px,1fr))', gap: '1rem' }}>
                {nodes.map(n => (
                    <div key={n.id} className="stat-card" style={{ borderLeft: `3px solid ${riskColor(n.riskScore)}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.875rem' }}>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{n.name}</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 3 }}>🌐 {n.region} · {n.id}</div>
                            </div>
                            <Gauge value={n.healthScore} size={68} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', fontSize: '0.72rem' }}>
                            <div>
                                <div style={{ color: 'var(--text-muted)' }}>Risk</div>
                                <div style={{ fontWeight: 700, color: riskColor(n.riskScore), marginTop: 3 }}>{n.riskScore}</div>
                            </div>
                            <div>
                                <div style={{ color: 'var(--text-muted)' }}>Staked</div>
                                <div style={{ fontWeight: 700, marginTop: 3 }}>${(n.stakedAmount / 1000).toFixed(0)}k</div>
                            </div>
                            <div>
                                <div style={{ color: 'var(--text-muted)' }}>Slashes</div>
                                <div style={{ fontWeight: 700, color: n.slashCount > 0 ? '#ef4444' : '#10b981', marginTop: 3 }}>{n.slashCount}</div>
                            </div>
                        </div>
                        {n.anomalyActive && <p style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: '#f59e0b' }}>⚡ Anomaly Active</p>}
                        {n.recoveryMode && <p style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: '#10b981' }}>✅ Recovery Mode</p>}
                    </div>
                ))}
            </div>
            {/* Staked bar chart (pure SVG) */}
            <div className="glass" style={{ padding: '1.25rem' }}>
                <p style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '1rem' }}>💰 Staked Value per Node</p>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.75rem', height: 120 }}>
                    {nodes.map(n => {
                        const maxStake = Math.max(...nodes.map(x => x.originalStake));
                        const pct = (n.stakedAmount / maxStake) * 100;
                        const origPct = (n.originalStake / maxStake) * 100;
                        return (
                            <div key={n.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>${(n.stakedAmount / 1000).toFixed(0)}k</span>
                                <div style={{ width: '100%', position: 'relative', height: `${origPct}%`, background: 'rgba(99,102,241,0.15)', borderRadius: '4px 4px 0 0', overflow: 'hidden' }}>
                                    <div style={{ position: 'absolute', bottom: 0, width: '100%', height: `${(pct / origPct) * 100}%`, background: 'linear-gradient(180deg,#6366f1,#8b5cf6)', borderRadius: '4px 4px 0 0', transition: 'height 0.8s ease' }} />
                                </div>
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center' }}>{n.name.split(' ')[0]}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );

    // ══════════════════════════════════════════════════════════════════════════
    //  TAB: HEALTH MONITOR
    // ══════════════════════════════════════════════════════════════════════════
    const HealthMonitor = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Health Monitor</h2>
            <div className="glass" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>💚 Average Network Health</span>
                    <div className="live-dot" style={{ marginLeft: 'auto' }} />
                </div>
                <Sparkline data={healthHist} color="#10b981" height={160} />
            </div>
            <div className="glass" style={{ padding: '1.25rem' }}>
                <p style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.75rem' }}>🔴 Risk Exposure Index</p>
                <Sparkline data={riskHist} color="#ef4444" height={160} />
            </div>
            <div className="glass" style={{ padding: '1.25rem' }}>
                <p style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '1rem' }}>🖥 Per-Node Health</p>
                {nodes.map(n => (
                    <div key={n.id} style={{ marginBottom: '0.875rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{n.name}</span>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{n.uptime?.toFixed(1)}% uptime</span>
                                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: riskColor(n.riskScore) }}>{fmt(n.healthScore)}%</span>
                            </div>
                        </div>
                        <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${n.healthScore}%`, background: `linear-gradient(90deg, ${riskColor(n.riskScore)}, ${riskColor(n.riskScore)}88)` }} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    // ══════════════════════════════════════════════════════════════════════════
    //  TAB: SLASH HISTORY
    // ══════════════════════════════════════════════════════════════════════════
    const SlashHistory = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>🔥 Slash History</h2>
                <span style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: 700 }}>Total: -${totalSlash.toFixed(0)}</span>
            </div>
            {/* TX status */}
            {lastTx && (
                <div className="glass" style={{ padding: '1rem 1.25rem', borderColor: txStatus === 'confirmed' ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '1.2rem' }}>{txStatus === 'pending' ? '⏳' : '✅'}</span>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: txStatus === 'confirmed' ? '#10b981' : '#f59e0b' }}>
                                {txStatus === 'pending' ? 'Transaction Pending…' : 'Transaction Confirmed'}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: 2 }}>
                                {lastTx.txHash.slice(0, 22)}…{lastTx.txHash.slice(-8)}
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#ef4444' }}>-${lastTx.slashAmount.toFixed(2)}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{lastTx.nodeName}</div>
                        </div>
                    </div>
                </div>
            )}
            {/* Table */}
            <div className="glass" style={{ overflow: 'hidden' }}>
                {slashHistory.length === 0 ? (
                    <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        ✅ No slashing events yet — all nodes healthy
                    </div>
                ) : (
                    <table className="data-table">
                        <thead><tr><th>Node</th><th>Slashed</th><th>Remaining</th><th>Tx Hash</th><th>Time</th></tr></thead>
                        <tbody>
                            {slashHistory.map((e, i) => (
                                <tr key={i}>
                                    <td style={{ fontWeight: 600, fontSize: '0.82rem' }}>{e.nodeName}</td>
                                    <td style={{ fontWeight: 700, color: '#ef4444' }}>-${e.slashAmount.toFixed(2)}</td>
                                    <td style={{ fontSize: '0.82rem' }}>${(e.remainingStake / 1000).toFixed(1)}k</td>
                                    <td style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: '#6366f1' }}>{e.txHash.slice(0, 12)}…</td>
                                    <td style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{new Date(e.timestamp).toLocaleTimeString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );

    // ══════════════════════════════════════════════════════════════════════════
    //  TAB: CLAIMS
    // ══════════════════════════════════════════════════════════════════════════
    const Claims = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>💰 Claims & Market</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px,1fr))', gap: '0.875rem' }}>
                {stocks.map((s, i) => (
                    <div key={i} className="stat-card glass-hover">
                        <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{s.symbol}</p>
                        <p style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0.35rem 0' }}>${s.price.toFixed(2)}</p>
                        <p style={{ fontSize: '0.72rem', fontWeight: 600, color: s.change >= 0 ? '#10b981' : '#ef4444' }}>
                            {s.change >= 0 ? '▲' : '▼'} {Math.abs(s.change).toFixed(2)}%
                        </p>
                    </div>
                ))}
            </div>
            <div className="glass" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Recent Claims</span>
                    <span style={{ fontSize: '0.7rem', background: 'rgba(245,158,11,0.12)', color: '#f59e0b', padding: '0.2rem 0.6rem', borderRadius: 999, fontWeight: 700 }}>3 Pending</span>
                </div>
                <table className="data-table">
                    <thead><tr><th>Claim ID</th><th>Description</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
                    <tbody>
                        {[
                            { id: '#CL-8821', desc: 'Drought Impact – Region North', amount: '$42,000', status: 'Pending', date: 'Feb 16' },
                            { id: '#CL-8820', desc: 'Payout: Alpha Construction', amount: '$18,500', status: 'Confirmed', date: 'Feb 15' },
                            { id: '#CL-8819', desc: 'Flood Damage – Bridge Alpha', amount: '$95,000', status: 'Review', date: 'Feb 14' },
                            { id: '#CL-8818', desc: 'Grid Failure – Delta Node', amount: '$7,200', status: 'Confirmed', date: 'Feb 12' },
                        ].map(c => (
                            <tr key={c.id}>
                                <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#6366f1' }}>{c.id}</td>
                                <td style={{ fontSize: '0.82rem' }}>{c.desc}</td>
                                <td style={{ fontWeight: 700, fontSize: '0.82rem' }}>{c.amount}</td>
                                <td>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: 999, background: c.status === 'Confirmed' ? 'rgba(16,185,129,0.12)' : c.status === 'Pending' ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)', color: c.status === 'Confirmed' ? '#10b981' : c.status === 'Pending' ? '#f59e0b' : '#ef4444' }}>{c.status}</span>
                                </td>
                                <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.date}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    // ══════════════════════════════════════════════════════════════════════════
    //  LAYOUT
    // ══════════════════════════════════════════════════════════════════════════
    const content = tab === 'overview' ? <Overview /> : tab === 'infrastructure' ? <Infrastructure /> : tab === 'health' ? <HealthMonitor /> : tab === 'slashing' ? <SlashHistory /> : <Claims />;

    return (
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-primary)', fontFamily: 'Inter, system-ui, sans-serif' }}>

            {/* ── Sidebar ── */}
            <aside className="glass" style={{ width: sidebar ? 220 : 56, margin: '0.75rem 0 0.75rem 0.75rem', display: 'flex', flexDirection: 'column', transition: 'width 0.3s ease', overflow: 'hidden', flexShrink: 0, borderRadius: '1.25rem' }}>
                {/* Logo */}
                <div style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--glass-border)', minHeight: 60 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '0.5rem', flexShrink: 0, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', boxShadow: '0 0 16px rgba(99,102,241,0.4)' }}>🛡</div>
                    {sidebar && <div><div style={{ fontWeight: 800, fontSize: '0.88rem' }}>TrustInfra</div><div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Guard Protocol</div></div>}
                </div>
                {/* Nav */}
                <nav style={{ flex: 1, padding: '0.5rem 0.35rem', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    {NAV.map(item => (
                        <button key={item.id} onClick={() => setTab(item.id)} className={`nav-item ${tab === item.id ? 'active' : ''}`} style={{ justifyContent: sidebar ? 'flex-start' : 'center', fontSize: '0.82rem' }} title={!sidebar ? item.label : undefined}>
                            {sidebar ? item.label : item.label.split(' ')[0]}
                        </button>
                    ))}
                </nav>
                {/* Status */}
                <div style={{ padding: '0.75rem', borderTop: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: connected ? '#10b981' : '#f59e0b', boxShadow: `0 0 8px ${connected ? '#10b981' : '#f59e0b'}`, flexShrink: 0 }} />
                    {sidebar && <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>{connected ? 'Live WebSocket' : 'Simulation Mode'}</span>}
                </div>
            </aside>

            {/* ── Main ── */}
            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '0.75rem' }}>
                {/* Header */}
                <header className="glass" style={{ padding: '0.625rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexShrink: 0, borderRadius: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <button className="btn btn-icon" onClick={() => setSidebar(v => !v)} style={{ fontSize: '1.1rem' }}>☰</button>
                        <div>
                            <h1 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{NAV.find(n => n.id === tab)?.label}</h1>
                            {lastUpdate && <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Updated: {lastUpdate}</p>}
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                        {/* Live/SIM badge */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.625rem', borderRadius: 999, background: connected ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', border: `1px solid ${connected ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}` }}>
                            <div className="live-dot" style={{ background: connected ? '#10b981' : '#f59e0b', boxShadow: `0 0 6px ${connected ? '#10b981' : '#f59e0b'}` }} />
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: connected ? '#10b981' : '#f59e0b' }}>{connected ? 'LIVE' : 'SIM'}</span>
                        </div>
                        {/* Wallet */}
                        {!wallet ? (
                            <button className="btn btn-primary" onClick={connectWallet} style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}>🔗 Connect Wallet</button>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.75rem', borderRadius: 999, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', fontSize: '0.75rem' }}>
                                ⚡ <span style={{ color: '#f59e0b', fontWeight: 600 }}>{gas} Gwei</span>
                                <span style={{ color: 'var(--text-muted)', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '0.4rem' }}>{wallet.slice(0, 6)}…{wallet.slice(-4)}</span>
                            </div>
                        )}
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>S</div>
                    </div>
                </header>

                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.25rem' }}>
                    <div className="animate-in">{content}</div>
                </div>
            </main>
        </div>
    );
}
