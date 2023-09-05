import { SubCommandGroup } from "@/interfaces";
import { SlashCommandSubcommandGroupBuilder } from "discord.js";
import { create } from "./create";
import { pickSet } from "./pick-set";
import { pickRemove } from "./pick-remove";

const stageGroup: SubCommandGroup = {
	data: new SlashCommandSubcommandGroupBuilder()
		.setName("stage")
		.setDescription("Commands for managing tryout stages.")
		.addSubcommand(create.data)
		.addSubcommand(pickSet.data)
		.addSubcommand(pickRemove.data),
	subCommands: [create, pickSet, pickRemove],
};

export default stageGroup;
