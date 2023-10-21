import BanchoJs from "bancho.js";
import { AutoLobby } from "../store";
import { timerEnd } from "./timerEnd";
import { matchFinished } from "./matchFinished";
import { matchStart } from "./matchStart";
import { playerJoined } from "./playerJoined";
import { playersReady } from "./playersReady";

export type MultiplayerEventHandler = {
	regex: RegExp;
	execute: (
		client: BanchoJs.BanchoClient,
		event: BanchoJs.ChannelMessage,
		lobby: AutoLobby,
	) => Promise<void>;
};

export const multiplayerEventHandlers: MultiplayerEventHandler[] = [
	matchFinished,
	matchStart,
	playerJoined,
	playersReady,
	timerEnd,
];
