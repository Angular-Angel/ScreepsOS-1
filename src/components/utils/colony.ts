import { processTable } from "../kernel/kernel/kernel";

import ColonyProcess = require("../processes/room/colony");
export let getColonyProcess = function (roomName: string): ColonyProcess | null {
    for (let pid in processTable) {
        let process = processTable[pid];
        if (process instanceof ColonyProcess) {
            let colonyProcess = <ColonyProcess>process;
            if (colonyProcess.getRoomName() === roomName) {
                return colonyProcess;
            }
        }
    }
    return null;
};


import SpawnProcess = require("../processes/room/spawn");
export let getSpawnProcess = function (roomName: string): SpawnProcess | null {
    for (let pid in processTable) {
        let process = processTable[pid];
        if (process instanceof SpawnProcess) {
            let spawnProcess = <SpawnProcess>process;
            if (spawnProcess.getRoomName() === roomName) {
                return spawnProcess;
            }
        }
    }
    return null;
};
