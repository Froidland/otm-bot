import { SubCommandGroup } from "@/interfaces";
import { SlashCommandSubcommandGroupBuilder } from "discord.js";
import { create } from "./create";
import { claim } from "./claim";
import { join } from "./join";
import { list } from "./list";
import { leave } from "./leave";
import { unclaim } from "./unclaim";

const lobbyGroup: SubCommandGroup = {
	data: new SlashCommandSubcommandGroupBuilder()
		.setName("lobby")
		.setDescription("Commands for managing tryout lobbies.")
		.addSubcommand(create.data)
		.addSubcommand(claim.data)
		.addSubcommand(unclaim.data)
		.addSubcommand(join.data)
		.addSubcommand(leave.data)
		.addSubcommand(list.data),
	subCommands: [create, claim, unclaim, join, leave, list],
};

export default lobbyGroup;
