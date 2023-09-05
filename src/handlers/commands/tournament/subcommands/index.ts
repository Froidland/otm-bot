import { SubCommand } from "@/interfaces/subCommand";
import { create } from "./create";
import { SubCommandGroup } from "@/interfaces";
import matchGroup from "./match";

export const subCommands: SubCommand[] = [create];
export const subCommandGroups: SubCommandGroup[] = [matchGroup];
