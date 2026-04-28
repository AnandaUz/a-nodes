export interface IGoal {
    title: string;
    endDate?: Date;
    startDate?: Date;
    startWeight?: number;
    targetWeight?: number;
}

export interface IUser {
    id: string;
    googleId: string;
    telegramId?: number;
    isRegistered?: boolean;
    token?: string;
    createdAt: Date;
    email?: string;
    picture?: string;
    name: string;

    settings: {
        account: {
            weightStart?: number;
        };
        privacy: {
            showMyPage: boolean;
        };
        goals: IGoal[];
    };
}


