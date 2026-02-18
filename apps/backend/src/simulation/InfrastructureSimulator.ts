import { EventEmitter } from 'events';

// ─── Types ────────────────────────────────────────────────────────────────────

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface ContractorNode {
    id: string;
    name: string;
    region: string;
    healthScore: number;          // 0–100
    riskScore: RiskLevel;
    stakedAmount: number;         // USD
    originalStake: number;        // for slash % calculation
    uptime: number;               // 0–100 %
    lastUpdate: number;           // epoch ms
    slashCount: number;           // how many times slashed
    anomalyActive: boolean;       // currently under stress
    recoveryMode: boolean;        // recovering from HIGH risk
}

export interface SlashEvent {
    nodeId: string;
    nodeName: string;
    slashAmount: number;
    remainingStake: number;
    timestamp: number;
    txHash: string;               // simulated tx hash
    reason: string;
}

export interface AnomalyEvent {
    nodeId: string;
    nodeName: string;
    damage: number;
    timestamp: number;
    type: 'STRUCTURAL_STRESS' | 'SENSOR_FAILURE' | 'WEATHER_EVENT' | 'MAINTENANCE_OVERDUE';
}

// ─── Constants ────────────────────────────────────────────────────────────────

const HIGH_RISK_THRESHOLD = 40;
const MEDIUM_RISK_THRESHOLD = 70;
const SLASH_PERCENT = 0.05;   // 5% of stake slashed per HIGH event
const ANOMALY_CHANCE = 0.08;   // 8% per tick
const RECOVERY_CHANCE = 0.03;   // 3% per tick (external maintenance)
const DECAY_MIN = 0.1;
const DECAY_MAX = 0.8;

const ANOMALY_TYPES: AnomalyEvent['type'][] = [
    'STRUCTURAL_STRESS', 'SENSOR_FAILURE', 'WEATHER_EVENT', 'MAINTENANCE_OVERDUE'
];

const INITIAL_NODES = [
    { id: 'C-001', name: 'Alpha Construction', region: 'US-East', stake: 120_000 },
    { id: 'C-002', name: 'Beta Paving Co.', region: 'EU-West', stake: 85_000 },
    { id: 'C-003', name: 'Gamma Bridges', region: 'APAC', stake: 210_000 },
    { id: 'C-004', name: 'Delta Roads', region: 'US-West', stake: 64_000 },
    { id: 'C-005', name: 'Epsilon Ports', region: 'LATAM', stake: 175_000 },
];

// ─── Simulator ────────────────────────────────────────────────────────────────

export class InfrastructureSimulator extends EventEmitter {
    private nodes: Map<string, ContractorNode> = new Map();
    private intervalId: NodeJS.Timeout | null = null;
    private slashHistory: SlashEvent[] = [];

    constructor() {
        super();
        this.initializeNodes();
    }

    // ── Init ──────────────────────────────────────────────────────────────
    private initializeNodes() {
        INITIAL_NODES.forEach(n => {
            const health = 75 + Math.random() * 25; // start 75–100
            this.nodes.set(n.id, {
                id: n.id,
                name: n.name,
                region: n.region,
                healthScore: health,
                riskScore: 'LOW',
                stakedAmount: n.stake,
                originalStake: n.stake,
                uptime: 95 + Math.random() * 5,
                lastUpdate: Date.now(),
                slashCount: 0,
                anomalyActive: false,
                recoveryMode: false,
            });
        });
        console.log(`[Simulator] Initialized ${this.nodes.size} infrastructure nodes`);
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────
    public start(intervalMs = 3000) {
        if (this.intervalId) return;
        console.log(`[Simulator] ▶ Starting IoT simulation every ${intervalMs}ms`);
        // Emit initial state immediately
        this.emit('update', this.getNodes());
        this.intervalId = setInterval(() => this.tick(), intervalMs);
    }

    public stop() {
        if (this.intervalId) { clearInterval(this.intervalId); this.intervalId = null; }
    }

    public getNodes(): ContractorNode[] {
        return Array.from(this.nodes.values());
    }

    public getSlashHistory(): SlashEvent[] {
        return this.slashHistory.slice(-50); // last 50
    }

    // ── Core tick ─────────────────────────────────────────────────────────
    private tick() {
        this.nodes.forEach(node => {
            const prevRisk = node.riskScore;

            // 1. Gradual decay
            const decay = DECAY_MIN + Math.random() * (DECAY_MAX - DECAY_MIN);
            node.healthScore = Math.max(0, node.healthScore - decay);

            // 2. Anomaly spike (random structural stress event)
            if (Math.random() < ANOMALY_CHANCE) {
                const damage = 8 + Math.random() * 20;
                node.healthScore = Math.max(0, node.healthScore - damage);
                node.anomalyActive = true;
                node.uptime = Math.max(80, node.uptime - Math.random() * 2);

                const anomaly: AnomalyEvent = {
                    nodeId: node.id,
                    nodeName: node.name,
                    damage: parseFloat(damage.toFixed(1)),
                    timestamp: Date.now(),
                    type: ANOMALY_TYPES[Math.floor(Math.random() * ANOMALY_TYPES.length)],
                };
                console.log(`[Simulator] ⚡ ANOMALY [${anomaly.type}] on ${node.name}: -${damage.toFixed(1)} health`);
                this.emit('anomaly', anomaly);
            } else {
                node.anomalyActive = false;
            }

            // 3. Natural recovery (external maintenance / self-healing)
            if (Math.random() < RECOVERY_CHANCE) {
                const boost = 10 + Math.random() * 15;
                node.healthScore = Math.min(100, node.healthScore + boost);
                node.uptime = Math.min(100, node.uptime + 0.5);
                node.recoveryMode = true;
                console.log(`[Simulator] 🔧 RECOVERY on ${node.name}: +${boost.toFixed(1)} health`);
            } else {
                node.recoveryMode = false;
            }

            // 4. Update risk score
            if (node.healthScore < HIGH_RISK_THRESHOLD) node.riskScore = 'HIGH';
            else if (node.healthScore < MEDIUM_RISK_THRESHOLD) node.riskScore = 'MEDIUM';
            else node.riskScore = 'LOW';

            // 5. Risk transition events
            if (prevRisk !== node.riskScore) {
                if ((node.riskScore as any) === 'HIGH') {
                    // Slash stake
                    const slash = this.slashStake(node);
                    this.emit('risk_alert', { node, slash });
                } else if ((prevRisk as any) === 'HIGH' && (node.riskScore as any) !== 'HIGH') {
                    this.emit('recovered', node);
                }
            }

            node.lastUpdate = Date.now();
        });

        // Batch broadcast
        this.emit('update', this.getNodes());
    }

    // ── Slash logic ───────────────────────────────────────────────────────
    private slashStake(node: ContractorNode): SlashEvent {
        const slashAmount = parseFloat((node.stakedAmount * SLASH_PERCENT).toFixed(2));
        node.stakedAmount = Math.max(0, node.stakedAmount - slashAmount);
        node.slashCount++;

        const event: SlashEvent = {
            nodeId: node.id,
            nodeName: node.name,
            slashAmount,
            remainingStake: node.stakedAmount,
            timestamp: Date.now(),
            txHash: this.fakeTxHash(),
            reason: `Health dropped below ${HIGH_RISK_THRESHOLD}% (current: ${node.healthScore.toFixed(1)}%)`,
        };

        this.slashHistory.unshift(event);
        if (this.slashHistory.length > 100) this.slashHistory.pop();

        console.log(`[Simulator] 🔴 SLASH: ${node.name} -$${slashAmount} | Remaining: $${node.stakedAmount.toFixed(0)} | tx: ${event.txHash}`);
        this.emit('slash', event);
        return event;
    }

    // ── Helpers ───────────────────────────────────────────────────────────
    private fakeTxHash(): string {
        return '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    }
}
