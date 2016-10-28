import MiningProcess = require("../processes/mining/mining");
import { addProcess, storeProcessTable } from "../kernel/kernel/kernel";
import Process = require("../kernel/kernel/process");
import { getColonyProcess } from "../utils/colony";
let addProcessAndSave = function (p: Process) {
    addProcess(p);
    storeProcessTable();
}

/*let startRoomMining = function (roomName: string) {
    let room = Game.rooms[roomName];
    let sources = room.find(FIND_SOURCES) as Source[];

    for (let source of sources) {
        let mining = new MiningProcess(0, 0);
        addProcessAndSave(mining);
        mining.setup(roomName, source.id);
    }

}
;*/

export = function (argv: string[]) {
    let sourceId = argv[0];
    let roomName = argv[1];
    let flag = Game.flags[sourceId];
    let source = <Source>Game.getObjectById(sourceId);
    if (!source) {
        console.log("Can't find source");
    }
    if (!flag) {
        source.pos.createFlag(sourceId, COLOR_YELLOW);
    }

    let colony = getColonyProcess(roomName);
    if (!colony) {
        console.log("There is no colony process for room:" + roomName);
        return;
    }

    let p = new MiningProcess(0, colony.pid);
    addProcessAndSave(p);

    p.memory.sourceId = sourceId;
    p.memory.spawningRoomName = roomName;
    p.memory.flagName = sourceId;
}
