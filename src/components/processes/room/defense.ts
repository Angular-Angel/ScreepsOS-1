import Process = require("../process");
import { addProcess, getProcessById } from "../../kernel/kernel";
class DefenseProcess extends Process {
    public static start(roomName: string, parentPID: number) {
        let p = new DefenseProcess(0, parentPID);
        p = addProcess(p);
        p.memory.roomName = roomName;
        return p.pid;
    }

    public classPath = "components.processes.room.defense";
    public run(): number {
        let colonyProcess = getProcessById(this.parentPID);
        if (!colonyProcess)
            return this.stop(0);

        let roomName = this.memory.roomName;
        let room = Game.rooms[roomName];
        let hostileCreepList = <Creep[]>room.find(FIND_HOSTILE_CREEPS);
        if (hostileCreepList.length) {
            let towerList = <Tower[]>room.find(FIND_MY_STRUCTURES,
                { filter: { structureType: STRUCTURE_TOWER } });
            for (let tower of towerList) {
                tower.attack(hostileCreepList[0]);
            }

        }
        return 0;
    }

}

export = DefenseProcess;
