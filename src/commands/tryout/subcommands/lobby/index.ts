import { SubCommandGroup } from "@/interfaces";
import { SlashCommandSubcommandGroupBuilder } from "discord.js";
import { create } from "./create";
import { claim } from "./claim";
import { join } from "./join";

const lobbyGroup: SubCommandGroup = {
	data: new SlashCommandSubcommandGroupBuilder()
		.setName("lobby")
		.setDescription("Commands for managing tryout lobbies.")
		.addSubcommand(create.data)
		.addSubcommand(claim.data)
		.addSubcommand(join.data),
	subCommands: [create, claim, join],
};

export default lobbyGroup;
