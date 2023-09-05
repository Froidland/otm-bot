import { SubCommand } from "@/interfaces/subCommand";
import { create } from "./create";
import { SubCommandGroup } from "@/interfaces";
import embedGroup from "./embed";
import lobbyGroup from "./lobby";
import stageGroup from "./stage";

export const subCommands: SubCommand[] = [create];
export const subCommandGroups: SubCommandGroup[] = [
	embedGroup,
	lobbyGroup,
	stageGroup,
];
