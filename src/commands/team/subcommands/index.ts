import { SubCommand } from "@/interfaces/subCommand";
import create from "./create";
import invite from "./invite";

const subCommands: SubCommand[] = [create, invite];

export default subCommands;
