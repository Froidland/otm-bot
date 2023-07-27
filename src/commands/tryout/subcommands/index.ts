import { SubCommand } from "@/interfaces/subCommand";
import { create } from "./create";
import { SubCommandGroup } from "@/interfaces";
import embedGroup from "./embed";

export const subCommands: SubCommand[] = [create];
export const subCommandGroups: SubCommandGroup[] = [embedGroup];
