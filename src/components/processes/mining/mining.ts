import Process = require("../process");
import MinerCreep = require("./miner-creep");
import MinerWithLinkCreep = require("./miner-with-link-creep");
import CourierCreep = require("./courier");
import { addProcess, getProcessById, sleepProcess } from "../../kernel/kernel";
import { getSpawnProcess } from "../../kernel/kernel-utils";
import { OvermindMemory } from "../memory/overmind";
interface MiningMemory extends OvermindMemory {
    minerPid: number | null;
    courierPidList: number[];
    sourceId: string;
    courierCount: number;
    miningSpot: any;
    lastCourierCountChange: number;
    flagName: string;
    lastLowContainerUsage: number;
    lowContainerUsageStreak: number;
}

class MiningProcess extends Process {
    /* Memory has:
     * roomName
     * miner pid
     * courier pid
     * source ID: sourceId
     */
    public memory: MiningMemory;
    public classPath = "components.processes.mining.mining";

    public minerDies(_: number) {
        this.memory.minerPid = null;
    }

    public setup(roomName: string, sourceId: string) {
        this.memory.spawningRoomName = roomName;
        this.memory.sourceId = sourceId;
        this.memory.courierCount = this.memory.courierCount || 1;
        this.memory.courierPidList = this.memory.courierPidList || [];
    }
    public courierDies(courierPid: number) {
        let memory = this.memory;
        memory.courierPidList = _.filter(memory.courierPidList, pid => pid !== courierPid);
    }

    public receiveCreep(id: string, creep: Creep): number {
        let creepName = creep.name;
        if (id === "miner") {

            const [x, y, roomName] = this.memory.miningSpot;
            const pos = new RoomPosition(x, y, roomName);
            const storage = Game.rooms[this.memory.spawningRoomName].storage;
            if (pos.isNearTo(storage)) {
                let p = new MinerWithLinkCreep(0, this.pid);
                p = addProcess(p);
                p.setUp(creepName, this.memory.sourceId, this.memory.miningSpot);
                this.memory.minerPid = p.pid;
            } else {
                let p = new MinerCreep(0, this.pid);
                p = addProcess(p);
                p.setUp(creepName, this.memory.sourceId);
                this.memory.minerPid = p.pid;
                p.memory.miningSpot = this.getMiningSpot();
            }
        }

        if (id === "courier") {
            let p = new CourierCreep(0, this.pid);
            p = addProcess(p);
            // TODO: allows different receiver object here
            p.setUp(creepName, Game.rooms[this.memory.spawningRoomName].storage.id);
            p.parentPID = this.pid;
            this.memory.courierPidList.push(p.pid);
        }

        return 0;
    }

    public getMinerCreep() {
        if (this.memory.minerPid) {
            let p = getProcessById(this.memory.minerPid) as MinerCreep;
            return p.getMinerCreep();
        }
        return null;
    }

    public needMoreCourier(): number {
        let lastCourierIncrease = this.memory.lastCourierCountChange = this.memory.lastCourierCountChange || (Game.time - 1501);

        if (lastCourierIncrease > (Game.time - 1501))
            return -1;
        if (this.memory.courierCount === 3) {
            console.log("Mining at source " + this.memory.sourceId +
                " is requiring too many couriers");
            return -1;
        }
        this.memory.courierCount += 1;
        this.memory.lastCourierCountChange = Game.time;
        return 0;
    }

    public lowContainerUsage(): number {
        let lastTick = this.memory.lastLowContainerUsage = this.memory.lastLowContainerUsage || Game.time;
        this.memory.lowContainerUsageStreak = this.memory.lowContainerUsageStreak || 0;
        if (lastTick === (Game.time - 1)) {
            this.memory.lowContainerUsageStreak += 1;
        } else
            this.memory.lowContainerUsageStreak = 0;

        if ((this.memory.lowContainerUsageStreak > 750) && (this.memory.courierCount > 1)) {

            this.memory.lastCourierCountChange = this.memory.lastCourierCountChange || (Game.time - 1501);
            if (this.memory.lastCourierCountChange > (Game.time - 1501))
                return -1;
            this.memory.lastCourierCountChange = Game.time;
            this.memory.courierCount -= 1;

        }

        this.memory.lastLowContainerUsage = Game.time;

        return 0;
    }

    public run(): number {
        this.memory.courierCount = this.memory.courierCount || 1;
        this.memory.courierPidList = this.memory.courierPidList || [];
        let memory = this.memory;

        if (!memory.flagName) {
            let source = <Source>Game.getObjectById(memory.sourceId);
            if (!source) {
                console.log("PID: " + this.pid +
                    " Error: no vision of source and no flag for source: " + memory.sourceId);
                return 0;
            }
            let result = source.pos.createFlag(source.id, COLOR_YELLOW);
            if (_.isString(result)) {
                memory.flagName = result;
            } else {
                return 0;
            }
        }
        if (!memory.miningSpot)
            memory.miningSpot = this.getMiningSpot();
        const [x, y, roomName] = this.memory.miningSpot;
        const miningPos = new RoomPosition(x, y, roomName);
        let storage = Game.rooms[this.memory.spawningRoomName].storage;

        if (miningPos.isNearTo(storage.pos)) {
            this.memory.courierCount = 0;
        }

        if (!memory.minerPid) {
            this.spawnCreep("miner", { WORK: 6, MOVE: 6, CARRY: 1 }, 90);
        } else if (memory.courierPidList.length < memory.courierCount) {
            this.spawnCreep("courier", { MOVE: 10, CARRY: 10 });
        }

        this.invaderCheck();
        return 0;
    }

    protected spawnCreep(creepID: string, bodyParts: bodyMap, priority?: number) {
        // TODO: Check and throw error when there is no roomName
        let spawnProcess = getSpawnProcess(this.memory.spawningRoomName);

        if (spawnProcess) {
            spawnProcess.spawn(creepID, bodyParts, this.pid, priority);
        }
    }

    private getMiningSpot(): any {
        if (!this.memory.miningSpot) {
            let source = <RoomObject>Game.getObjectById(this.memory.sourceId);
            if (!source) {
                source = Game.flags[this.memory.flagName];
            }
            let storage = Game.rooms[this.memory.spawningRoomName].storage;
            let pathResult = PathFinder.search(storage.pos, { pos: source.pos, range: 1 });
            let path = pathResult.path;
            let pos = path[path.length - 1];
            this.memory.miningSpot = [pos.x, pos.y, pos.roomName];
        }
        return this.memory.miningSpot;
    }

    private invaderCheck() {
        if (!this.memory.miningSpot)
            return;
        let room = Game.rooms[this.memory.miningSpot[2]];
        if (!room)
            return;
        let invaderList = <Creep[]>room.find(FIND_HOSTILE_CREEPS,
            { filter: c => c.owner.username === "Invader" });
        let invader = invaderList.pop();
        if (invader) {
            if (!room.controller.my)
                sleepProcess(this, 1500);
        }
    }
}

export = MiningProcess;
