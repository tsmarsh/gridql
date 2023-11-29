export interface ConfigItem {
    name: string;
    id: string;
    queryName: string;
    url: string;
}

export class DTOFactory {
    constructor(config?: ConfigItem[]);

    fillOne(data: any, authHeader?: string, timestamp?: Date): any;
    fillMany(data: any[], authHeader?: string, timestamp?: Date): any[];
}