import Process = require("../../kernel/kernel/process");
import MiningProcess = require("./mining");
import { getProcessById } from "../../kernel/kernel/kernel";
class CourierProcess extends Process {
    public classPath() {
        return "components.processes.mining.courier";
    }

    public run(): number {
        let memory = this.memory;
        let name = memory.name;
        if (name && Game.creeps[name]) {
            this.runCreep(name);
        } else {
            let p: any = getProcessById(this.parentPID);
            if (p)
                p.courierDies(this.pid);
            return super.stop(0);
        }
        return 0;
    }

    public setUp(creepName: string, receiverId: string) {
        this.memory.name = creepName;
        this.memory.receiverId = receiverId;
    }
    public runCreep(creepName: string): number {
        let memory = this.memory;
        let creep = Game.creeps[creepName];
        let minerCreep: Creep | null = Game.creeps[memory.minerName];

        if (!minerCreep) {
            memory.minerName = null;
            minerCreep = this.getNewMinerCreep();
            if (minerCreep)
                memory.minerName = minerCreep.name;
        }

        if (creep.carry.energy === creep.carryCapacity) {
            let receiver = <Storage>Game.getObjectById(memory.receiverId);
            creep.moveTo(receiver);
            creep.transfer(receiver, RESOURCE_ENERGY);
        } else {
            if (minerCreep) {
                creep.moveTo(minerCreep);
                if (_.sum(minerCreep.carry) >= 0.9 * minerCreep.carryCapacity)
                    minerCreep.transfer(creep, RESOURCE_ENERGY);
                const containerList = <Container[]>_.filter(minerCreep.pos.lookFor(LOOK_STRUCTURES),
                    (s: Structure) => s.structureType === STRUCTURE_CONTAINER);

                if (containerList.length) {
                    let container = containerList[0];

                    if (_.sum(container.store) > 200) {
                        creep.withdraw(container, RESOURCE_ENERGY);
                    }
                }

            }
        }
        return 0;
    }

    private getNewMinerCreep(): Creep | null {
        let p: MiningProcess = <MiningProcess>getProcessById(this.parentPID);
        return p.getMinerCreep();
    }
}

export = CourierProcess;
