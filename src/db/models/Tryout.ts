import {
	Column,
	CreateDateColumn,
	Entity,
	OneToMany,
	PrimaryColumn,
	UpdateDateColumn,
} from "typeorm";
import { TryoutStage } from "./TryoutStage";

@Entity({
	name: "tryouts",
})
export class Tryout {
	@PrimaryColumn({
		type: "varchar",
	})
	id: string;

	@Column("varchar")
	name: string;

	@Column("varchar")
	staffChannelId: string;

	@Column("varchar")
	scheduleChannelId: string;

	@Column("varchar")
	staffRoleId: string;

	@Column("varchar")
	playerRoleId: string;

	@Column("varchar")
	serverId: string;

	@Column("varchar")
	isJoinable: boolean;

	@OneToMany(() => TryoutStage, (stage) => stage.id)
	stages: TryoutStage[];

	@CreateDateColumn({
		type: "timestamp",
	})
	createdAt: Date;

	@UpdateDateColumn({
		type: "timestamp",
	})
	updatedAt: Date;
}
