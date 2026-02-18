import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { InfrastructureSimulator, SlashEvent, AnomalyEvent, ContractorNode } from '../simulation/InfrastructureSimulator';
import { contractTrigger } from '../simulation/contractTrigger';

export class SocketServer {
    private io: Server;
    private simulator: InfrastructureSimulator;

    constructor(server: HttpServer) {
        this.io = new Server(server, {
            cors: { origin: '*', methods: ['GET', 'POST'] }
        });

        this.simulator = new InfrastructureSimulator();
        this.wireSimulatorEvents();
        this.wireSocketEvents();

        // Start simulation (3–5s random interval for realism)
        const interval = 3000 + Math.floor(Math.random() * 2000);
        this.simulator.start(interval);
    }

    // ── Simulator → Broadcast ─────────────────────────────────────────────
    private wireSimulatorEvents() {

        // Full node update (every tick)
        this.simulator.on('update', (nodes: ContractorNode[]) => {
            this.io.emit('health:update', nodes);
        });

        // Anomaly detected
        this.simulator.on('anomaly', (event: AnomalyEvent) => {
            console.log(`[Socket] ⚡ Anomaly broadcast: ${event.nodeName} [${event.type}]`);
            this.io.emit('anomaly:detected', event);
        });

        // Risk alert + slash
        this.simulator.on('risk_alert', async ({ node, slash }: { node: ContractorNode; slash: SlashEvent }) => {
            console.log(`[Socket] 🔴 Risk alert: ${node.name}`);

            // Trigger contract (async, non-blocking)
            const txHash = await contractTrigger.onRiskAlert(node, slash);
            const enrichedSlash = { ...slash, txHash };

            this.io.emit('risk:alert', node);
            this.io.emit('slash:event', enrichedSlash);
        });

        // Recovery
        this.simulator.on('recovered', async (node: ContractorNode) => {
            console.log(`[Socket] 🟢 Recovery: ${node.name}`);
            const txHash = await contractTrigger.onRecovery(node);
            this.io.emit('health:recovered', { ...node, txHash });
        });

        // Slash (direct)
        this.simulator.on('slash', (event: SlashEvent) => {
            this.io.emit('slash:event', event);
        });
    }

    // ── Client → Server ───────────────────────────────────────────────────
    private wireSocketEvents() {
        this.io.on('connection', (socket: Socket) => {
            console.log(`[Socket] Client connected: ${socket.id}`);

            // Send current state immediately on connect
            socket.emit('connection_ack', {
                message: 'Connected to TrustInfra Real-time Layer',
                nodeCount: this.simulator.getNodes().length,
                contractLive: contractTrigger.isConnected(),
                timestamp: Date.now(),
            });
            socket.emit('health:update', this.simulator.getNodes());
            socket.emit('slash:history', this.simulator.getSlashHistory());

            // Client can request slash history
            socket.on('request:slash_history', () => {
                socket.emit('slash:history', this.simulator.getSlashHistory());
            });

            socket.on('disconnect', () => {
                console.log(`[Socket] Client disconnected: ${socket.id}`);
            });
        });
    }
}
