import { SubCommandGroup } from "@/interfaces";
import { SlashCommandSubcommandGroupBuilder } from "discord.js";
import { create } from "./create";

const stageGroup: SubCommandGroup = {
	data: new SlashCommandSubcommandGroupBuilder()
		.setName("stage")
		.setDescription("Commands for managing tryout stages."),
	subCommands: [create],
};

export default stageGroup;