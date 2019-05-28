import { HttpCodes } from '@home/misc';

declare global {
    namespace Express {
        interface Response {
            data: IResponseContext | undefined;
        }
    }
}

export interface IResponseContext {
    code: HttpCodes;
    message: string;
    data?: any
}

export interface IResponse {
    status: string;
    code: number;
    message: string;
    data: any;
}
