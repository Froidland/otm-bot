import BanchoJs from "bancho.js";
import { history } from "./history";
import { panic } from "./panic";
import { playerList } from "./playerList";
import { replay } from "./replay";

export type BanchoCommand = {
	name: string;
	aliases: string[];
	description: string;
	usage: string;
	executePM?: (
		client: BanchoJs.BanchoClient,
		event: BanchoJs.PrivateMessage,
	) => Promise<void>;
	executeCM?: (
		client: BanchoJs.BanchoClient,
		lobby: BanchoJs.BanchoLobby,
		message: BanchoJs.BanchoMessage,
	) => Promise<void>;
};

export class CommandError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "CommandError";
	}
}

const commands: BanchoCommand[] = [playerList, panic, replay, history];

export default commands;
